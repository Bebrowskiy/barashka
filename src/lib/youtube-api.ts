import type { Track, Artist, SearchResult } from '../types';

const PIPED_INSTANCES = [
    'https://api.piped.private.coffee',
];

const REQUEST_TIMEOUT_MS = 15000;

function withTimeout(signal?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);

    if (signal) {
        if (signal.aborted) controller.abort(signal.reason);
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }

    return { signal: controller.signal, cleanup: () => clearTimeout(timeout) };
}

class Logger {
    private buffer: string[] = [];
    private maxBufferSize = 100;

    log(level: 'info' | 'warn' | 'error', component: string, message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
        if (data) {
            const serialized = typeof data === 'string' ? data : JSON.stringify(data).slice(0, 500);
            this.buffer.push(`${entry} | ${serialized}`);
        } else {
            this.buffer.push(entry);
        }
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer.shift();
        }
        if (level === 'error') {
            console.error(entry, data || '');
        } else if (level === 'warn') {
            console.warn(entry, data || '');
        }
    }

    getLogs(): string[] {
        return [...this.buffer];
    }

    clear(): void {
        this.buffer = [];
    }
}

export const logger = new Logger();

function tryParseJSON(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

class PipedError extends Error {
    instance: string;
    status: number;
    botDetected: boolean;

    constructor(message: string, instance: string, status: number) {
        super(message);
        this.name = 'PipedError';
        this.instance = instance;
        this.status = status;
        this.botDetected = /bot|captcha|LOGIN_REQUIRED|SignInConfirm/i.test(message);
    }

    isBotDetected(): boolean {
        return this.botDetected;
    }

    isRateLimited(): boolean {
        return this.status === 429;
    }
}

class YouTubeAPI {
    private instances = [...PIPED_INSTANCES];
    private currentInstance = this.instances[0];
    private streamCache = new Map<string, string>();
    private trackCache = new Map<string, Track>();

    async fetchJSON(endpoint: string, params: Record<string, string> = {}, options: { signal?: AbortSignal } = {}): Promise<any> {
        let lastError: Error | null = null;

        for (let i = 0; i < this.instances.length; i++) {
            const instance = this.instances[(this.instances.indexOf(this.currentInstance) + i) % this.instances.length];
            const isRelative = instance.startsWith('/');
            const url = isRelative
                ? new URL(`${instance}${endpoint}`, window.location.origin)
                : new URL(`${instance}${endpoint}`);

            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, String(value));
                }
            });

            const timeout = withTimeout(options.signal);
            try {
                const response = await fetch(url.toString(), {
                    headers: { Accept: 'application/json' },
                    signal: timeout.signal,
                });

                timeout.cleanup();

                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    const errData = tryParseJSON(text);
                    const errMsg = errData?.error || errData?.message || `HTTP ${response.status}`;
                    throw new PipedError(errMsg, instance, response.status);
                }

                const data = await response.json();

                if (data.error) {
                    throw new PipedError(data.error, instance, response.status || 500);
                }

                this.currentInstance = instance;
                logger.log('info', 'youtube', `OK: ${endpoint} via ${instance}`);
                return data;
            } catch (error: any) {
                timeout.cleanup();
                if (error.name === 'AbortError') throw error;

                if (error instanceof PipedError) {
                    if (error.isBotDetected()) {
                        logger.log('warn', 'youtube', `Bot detected on ${instance}, rotating`);
                    } else {
                        logger.log('warn', 'youtube', `API error on ${instance}: ${error.message}`);
                    }
                } else {
                    logger.log('warn', 'youtube', `Network error on ${instance}: ${error.message}`);
                }
                lastError = error;
            }
        }

        throw lastError || new Error('All Piped instances failed');
    }

    stripPrefix(id: string): string {
        if (typeof id === 'string' && id.startsWith('y:')) {
            return id.slice(2);
        }
        return id;
    }

    extractIdFromUrl(url: string): string {
        if (!url) return 'unknown';
        const match = url.match(/\/watch\?v=([^&]+)/)
            || url.match(/\/channel\/([^/?]+)/)
            || url.match(/\/@([^/?]+)/)
            || url.match(/\/c\/([^/?]+)/)
            || url.match(/\/user\/([^/?]+)/);
        return match ? match[1] : url.split('/').pop() || 'unknown';
    }

    transformTrack(video: any): Track | null {
        if (!video) return null;

        const id = video.id || this.extractIdFromUrl(video.url);
        const duration = video.duration || 0;
        const artistName = video.uploaderName || video.uploader || 'Unknown Artist';
        const title = video.title || 'Unknown Title';
        const artistId = this.extractIdFromUrl(video.uploaderUrl);
        const thumbnail = video.thumbnailUrl || video.thumbnail;

        return {
            id: `y:${id}`,
            title,
            duration,
            artist: artistName,
            artists: [{ id: `y:${artistId}`, name: artistName }],
            album: {
                id: `y:${id}`,
                title: video.uploaderName || 'YouTube',
                cover: thumbnail,
                releaseDate: video.uploadedDate || null,
            },
            cover: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
    }

    transformArtist(channel: any): Artist | null {
        if (!channel) return null;

        const id = channel.id || this.extractIdFromUrl(channel.url);
        const picture = channel.avatarUrl || channel.thumbnailUrl || channel.thumbnail || null;

        return {
            id: `y:${id}`,
            name: channel.name || channel.title || 'Unknown Artist',
            avatar: picture || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            bio: channel.description || undefined,
        };
    }

    // === Search methods ===

    async searchTracks(query: string, options: { limit?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (!query.trim()) return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        const cleanQuery = query.replace(/\s*-\s*Topic$/i, '').trim();
        try {
            const limit = options.limit || 10;
            const data = await this.fetchJSON('/search', { q: cleanQuery, filter: 'music_songs' }, { signal: options.signal });

            const items = (data.items || []).slice(0, limit).map((item: any, _index: number) => {
                const track = this.transformTrack(item);
                return track;
            }).filter(Boolean) as Track[];

            logger.log('info', 'youtube', `Search "${cleanQuery}" returned ${items.length} tracks`);
            return { items, limit, offset: 0, totalNumberOfItems: items.length };
        } catch (error: any) {
            if (error.name === 'AbortError') throw error;
            logger.log('error', 'youtube', `Track search failed: ${error.message}`);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchAll(query: string, options: { limit?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (!query.trim()) return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        try {
            const limit = options.limit || 20;
            const data = await this.fetchJSON('/search', { q: query }, { signal: options.signal });

            const items = (data.items || [])
                .filter((item: any) => item.type === 'stream' || item.type === 'TRACK' || item.url)
                .slice(0, limit)
                .map((item: any) => this.transformTrack(item))
                .filter(Boolean) as Track[];

            return { items, limit, offset: 0, totalNumberOfItems: items.length };
        } catch (error: any) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube broad search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchArtists(query: string, options: { limit?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (!query.trim()) return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        try {
            const limit = options.limit || 10;
            const data = await this.fetchJSON('/search', { q: query, filter: 'channels' }, { signal: options.signal });

            const items = (data.items || []).slice(0, limit)
                .map((item: any) => this.transformArtist(item))
                .filter(Boolean) as Artist[];

            return {
                items: items.map(a => ({ id: a.id, title: a.name, cover: a.avatar, artist: a.name } as Track)),
                limit, offset: 0, totalNumberOfItems: items.length,
            };
        } catch (error: any) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube artist search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchAlbums(query: string, options: { limit?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (!query.trim()) return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        try {
            const limit = options.limit || 10;
            const data = await this.fetchJSON('/search', { q: query, filter: 'playlists' }, { signal: options.signal });

            const items = (data.items || [])
                .filter((item: any) => item.type === 'playlist' || item.url)
                .slice(0, limit)
                .map((item: any) => {
                    const plId = item.id || this.extractIdFromUrl(item.url);
                    const uploaderName = item.uploaderName || item.uploader || item.ownerChannelName || '';
                    return {
                        id: `y:${plId}`,
                        title: item.name || item.title || 'YouTube Playlist',
                        cover: item.thumbnailUrl || item.thumbnail || null,
                        artist: uploaderName,
                    } as Track;
                });

            return { items, limit, offset: 0, totalNumberOfItems: items.length };
        } catch (error: any) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube album search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchPlaylists(query: string, options: { limit?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        return this.searchAlbums(query, options);
    }

    // === Get methods ===

    async getTrack(id: string, options: { signal?: AbortSignal } = {}): Promise<Track> {
        const cleanId = this.stripPrefix(id);
        const cacheKey = `track_${cleanId}`;

        if (this.trackCache.has(cacheKey)) {
            return this.trackCache.get(cacheKey)!;
        }

        const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
        const track = this.transformTrack(data);

        if (!track) throw new Error('YouTube video not found');

        this.trackCache.set(cacheKey, track);
        return track;
    }

    async getArtist(id: string, options: { signal?: AbortSignal } = {}): Promise<{ artist: Artist; tracks: Track[]; albums: any[] }> {
        const cleanId = this.stripPrefix(id);

        let data: any = null;
        let channelFound = false;

        try {
            data = await this.fetchJSON(`/channel/${cleanId}`, {}, { signal: options.signal });
            channelFound = true;
        } catch {
            // Channel endpoint failed — will use search fallback
        }

        // If channel endpoint failed, try to find artist by searching
        if (!channelFound || !data?.name) {
            try {
                const searchData = await this.fetchJSON('/search', { q: cleanId, filter: 'channels' }, { signal: options.signal });
                const channel = (searchData.items || []).find((item: any) => {
                    const chId = item.id || this.extractIdFromUrl(item.url);
                    return chId === cleanId;
                }) || (searchData.items || [])[0];

                if (channel) {
                    data = { ...channel, relatedStreams: channel.relatedStreams || [] };
                    channelFound = true;
                }
            } catch { /* ignore */ }
        }

        const artist = data ? this.transformArtist(data) : null;
        if (!artist) {
            // Last resort: create artist from the ID and search for tracks
            const fallbackArtist: Artist = {
                id: `y:${cleanId}`,
                name: cleanId,
                avatar: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
            };
            const tracks = await this.searchTracksByName(fallbackArtist.name, options);
            return { artist: fallbackArtist, tracks, albums: [] };
        }

        let videos: Track[] = [];

        // Tier 1: relatedStreams from channel data
        if (data.relatedStreams && data.relatedStreams.length > 0) {
            videos = data.relatedStreams
                .filter((item: any) => item && (item.url || item.id))
                .map((item: any) => this.transformTrack(item))
                .filter(Boolean) as Track[];
        }

        // Tier 2: tabs content
        if (videos.length === 0 && data.tabs) {
            for (const tab of data.tabs) {
                if (tab.content && Array.isArray(tab.content)) {
                    videos = tab.content
                        .filter((item: any) => item && (item.url || item.id))
                        .map((item: any) => this.transformTrack(item))
                        .filter(Boolean) as Track[];
                    if (videos.length > 0) break;
                }
            }
        }

        const searchName = artist.name.replace(/\s*-\s*Topic$/i, '').trim() || artist.name;

        // Tier 3: search filtered by channel
        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', { q: searchName, filter: 'music_songs' }, { signal: options.signal });
                videos = (searchData.items || [])
                    .filter((item: any) => {
                        const chId = this.extractIdFromUrl(item.uploaderUrl);
                        return chId === cleanId;
                    })
                    .map((item: any) => this.transformTrack(item))
                    .filter(Boolean) as Track[];
            } catch { /* ignore */ }
        }

        // Tier 4: broader search filtered by channel
        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', { q: searchName }, { signal: options.signal });
                videos = (searchData.items || [])
                    .filter((item: any) => {
                        const chId = this.extractIdFromUrl(item.uploaderUrl);
                        return chId === cleanId;
                    })
                    .map((item: any) => this.transformTrack(item))
                    .filter(Boolean) as Track[];
            } catch { /* ignore */ }
        }

        // Tier 5: search by artist name, try to match channel
        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', { q: searchName, filter: 'music_songs' }, { signal: options.signal });
                // First try to match by channel
                let matched = (searchData.items || [])
                    .filter((item: any) => {
                        const chId = this.extractIdFromUrl(item.uploaderUrl);
                        return chId === cleanId;
                    })
                    .map((item: any) => this.transformTrack(item))
                    .filter(Boolean) as Track[];

                // If no match by channel, try matching by uploader name
                if (matched.length === 0) {
                    matched = (searchData.items || [])
                        .filter((item: any) => {
                            const uploader = (item.uploaderName || item.uploader || '').toLowerCase();
                            return uploader.includes(searchName.toLowerCase()) || searchName.toLowerCase().includes(uploader);
                        })
                        .map((item: any) => this.transformTrack(item))
                        .filter(Boolean) as Track[];
                }

                videos = matched;
            } catch { /* ignore */ }
        }

        // Tier 6: broadest search, still try to match by uploader name
        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', { q: searchName }, { signal: options.signal });
                videos = (searchData.items || [])
                    .filter((item: any) => {
                        if (item.type !== 'stream' && !item.url) return false;
                        // Match by channel ID
                        const chId = this.extractIdFromUrl(item.uploaderUrl);
                        if (chId === cleanId) return true;
                        // Match by uploader name
                        const uploader = (item.uploaderName || item.uploader || '').toLowerCase();
                        return uploader.includes(searchName.toLowerCase()) || searchName.toLowerCase().includes(uploader);
                    })
                    .slice(0, 20)
                    .map((item: any) => this.transformTrack(item))
                    .filter(Boolean) as Track[];
            } catch { /* ignore */ }
        }

        return { artist, tracks: videos.slice(0, 50), albums: [] };
    }

    private async searchTracksByName(name: string, options: { signal?: AbortSignal } = {}): Promise<Track[]> {
        try {
            const data = await this.fetchJSON('/search', { q: name, filter: 'music_songs' }, { signal: options.signal });
            return (data.items || [])
                .filter((item: any) => item.type === 'stream' || item.url)
                .slice(0, 20)
                .map((item: any) => this.transformTrack(item))
                .filter(Boolean) as Track[];
        } catch {
            return [];
        }
    }

    async getPlaylist(id: string, options: { signal?: AbortSignal } = {}): Promise<{ playlist: any; tracks: Track[] }> {
        const cleanId = this.stripPrefix(id);
        const data = await this.fetchJSON(`/playlists/${cleanId}`, {}, { signal: options.signal });

        const tracks = (data.items || [])
            .map((item: any) => this.transformTrack(item))
            .filter(Boolean) as Track[];

        return {
            playlist: {
                id: `y:${cleanId}`,
                title: data.name || data.title || 'YouTube Playlist',
                description: data.description || '',
                numberOfTracks: tracks.length,
                cover: data.thumbnailUrl || null,
            },
            tracks,
        };
    }

    async getMix(id: string, options: { signal?: AbortSignal } = {}): Promise<{ mix: any; tracks: Track[] }> {
        const cleanId = this.stripPrefix(id);
        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const related = (data.relatedStreams || [])
                .map((item: any) => this.transformTrack(item))
                .filter(Boolean) as Track[];

            return {
                mix: {
                    id: `y:${cleanId}`,
                    title: data.title || 'YouTube Mix',
                    subTitle: data.uploaderName || '',
                    description: data.description || '',
                    cover: data.thumbnailUrl || null,
                },
                tracks: related,
            };
        } catch {
            return { mix: null, tracks: [] };
        }
    }

    async getTrackRecommendations(id: string, options: { signal?: AbortSignal } = {}): Promise<Track[]> {
        const cleanId = this.stripPrefix(id);
        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            return (data.relatedStreams || []).slice(0, 20)
                .map((item: any) => this.transformTrack(item))
                .filter(Boolean) as Track[];
        } catch {
            return [];
        }
    }

    async getSimilarArtists(artistId: string, options: { signal?: AbortSignal } = {}): Promise<Artist[]> {
        const cleanId = this.stripPrefix(artistId);
        try {
            const data = await this.fetchJSON(`/channel/${cleanId}`, {}, { signal: options.signal });
            const artistName = (data.name || '').replace(/\s*-\s*Topic$/i, '').trim();

            const related = (data.relatedStreams || [])
                .reduce((acc: any[], item: any) => {
                    const url = item.uploaderUrl || item.url || '';
                    const chId = this.extractIdFromUrl(url);
                    if (chId && chId !== 'unknown' && chId !== cleanId && !acc.some((a: any) => a.id === chId)) {
                        acc.push({
                            id: `y:${chId}`,
                            name: item.uploaderName || 'Unknown',
                            avatar: item.uploaderAvatar || null,
                        });
                    }
                    return acc;
                }, [])
                .slice(0, 12);

            if (related.length > 0) return related;

            if (artistName) {
                try {
                    const searchData = await this.fetchJSON('/search', { q: artistName, filter: 'channels' }, { signal: options.signal });
                    return (searchData.items || [])
                        .filter((item: any) => {
                            const chId = item.id || this.extractIdFromUrl(item.url);
                            return chId && chId !== cleanId;
                        })
                        .slice(0, 12)
                        .map((item: any) => this.transformArtist(item))
                        .filter(Boolean) as Artist[];
                } catch { /* ignore */ }
            }

            return [];
        } catch {
            return [];
        }
    }

    async getTrackVersions(trackId: string, options: { signal?: AbortSignal } = {}): Promise<Track[]> {
        const cleanId = this.stripPrefix(trackId);
        try {
            const trackData = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const title = trackData.title || '';
            const uploader = trackData.uploaderName || '';
            const searchQuery = `${uploader} ${title}`.trim();

            const searchData = await this.fetchJSON('/search', { q: searchQuery }, { signal: options.signal });

            return (searchData.items || [])
                .filter((item: any) => {
                    const itemId = item.id || this.extractIdFromUrl(item.url);
                    return itemId !== cleanId;
                })
                .slice(0, 10)
                .map((item: any) => this.transformTrack(item))
                .filter(Boolean) as Track[];
        } catch {
            return [];
        }
    }

    async getSimilarAlbums(albumId: string, options: { signal?: AbortSignal } = {}): Promise<any[]> {
        const cleanId = this.stripPrefix(albumId);
        try {
            const trackData = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const uploader = (trackData.uploaderName || '').replace(/\s*-\s*Topic$/i, '').trim();
            if (!uploader) return [];

            const data = await this.fetchJSON('/search', { q: uploader, filter: 'playlists' }, { signal: options.signal });
            return (data.items || [])
                .filter((item: any) => item.type === 'playlist' || item.url)
                .slice(0, 8)
                .map((item: any) => {
                    const plId = item.id || this.extractIdFromUrl(item.url);
                    return {
                        id: `y:${plId}`,
                        title: item.name || item.title || 'YouTube Playlist',
                        description: item.description || '',
                        numberOfTracks: item.videos || item.videoCount || 0,
                        cover: item.thumbnailUrl || item.thumbnail || null,
                    };
                });
        } catch {
            return [];
        }
    }

    async getRecommendedTracksForPlaylist(tracks: Track[], limit = 20): Promise<Track[]> {
        if (!tracks || tracks.length === 0) return [];

        const artistNames = new Set<string>();
        for (const track of tracks) {
            if (track.artist) artistNames.add(track.artist);
            if (track.artists) {
                for (const a of track.artists) {
                    if (a.name) artistNames.add(a.name);
                }
            }
        }

        if (artistNames.size === 0) {
            for (const track of tracks.slice(0, 3)) {
                if (track.title) artistNames.add(track.title);
            }
        }

        const seenIds = new Set(tracks.map(t => {
            const id = t.id;
            return typeof id === 'string' && id.startsWith('y:') ? id.slice(2) : id;
        }));
        const recommended: Track[] = [];

        const artists = [...artistNames].sort(() => Math.random() - 0.5).slice(0, 5);

        for (const name of artists) {
            try {
                const data = await this.fetchJSON('/search', { q: name, filter: 'music_songs' });

                const items = (data.items || [])
                    .filter((item: any) => {
                        const itemId = item.id || this.extractIdFromUrl(item.url);
                        return !seenIds.has(itemId);
                    })
                    .slice(0, 4);

                for (const item of items) {
                    const track = this.transformTrack(item);
                    if (track) {
                        const rawId = item.id || this.extractIdFromUrl(item.url);
                        seenIds.add(rawId);
                        recommended.push(track);
                    }
                }

                if (recommended.length >= limit) break;
            } catch (e: any) {
                console.warn(`YouTube recommendation search failed for "${name}":`, e.message);
            }
        }

        return recommended.slice(0, limit);
    }

    // === Stream methods ===

    async getStreamUrl(id: string, options: { signal?: AbortSignal } = {}): Promise<string> {
        const cleanId = this.stripPrefix(id);
        const cacheKey = `stream_${cleanId}`;

        if (this.streamCache.has(cacheKey)) {
            return this.streamCache.get(cacheKey)!;
        }

        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });

            const audioStreams = (data.audioStreams || []).filter((s: any) => s.mimeType?.startsWith('audio/'));
            const adaptiveAudio = (data.adaptiveFormats || []).filter((s: any) => s.mimeType?.startsWith('audio/'));
            const allAudio = audioStreams.length > 0 ? audioStreams : adaptiveAudio;

            if (allAudio.length === 0 && data.hls) {
                this.streamCache.set(cacheKey, data.hls);
                return data.hls;
            }

            if (allAudio.length === 0) {
                const combined = (data.videoStreams || []).find((s: any) => !s.videoOnly && s.url);
                if (combined) {
                    this.streamCache.set(cacheKey, combined.url);
                    return combined.url;
                }
                throw new Error('No audio streams available');
            }

            const sorted = allAudio.sort((a: any, b: any) => {
                const aP = a.mimeType?.includes('opus') ? 3 : a.mimeType?.includes('aac') ? 2 : 1;
                const bP = b.mimeType?.includes('opus') ? 3 : b.mimeType?.includes('aac') ? 2 : 1;
                if (aP !== bP) return bP - aP;
                return (b.bitrate || 0) - (a.bitrate || 0);
            });

            if (sorted.length === 0) throw new Error('No suitable audio stream found');

            const streamUrl = sorted[0].url;
            this.streamCache.set(cacheKey, streamUrl);
            logger.log('info', 'youtube', `Stream URL obtained for ${cleanId}`);
            return streamUrl;
        } catch (error: any) {
            if (error instanceof PipedError && error.isBotDetected()) {
                logger.log('error', 'youtube', `Bot detection for ${cleanId}: ${error.message}`);
                throw new Error('YouTube blocked anonymous access. Try again later or use a different provider.', { cause: error });
            }
            throw error;
        }
    }

    // === Cover methods ===

    getCoverUrl(id: string, _size = '320'): string {
        const cleanId = this.stripPrefix(id);
        return `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
    }

    getArtistPictureUrl(id: string, _size = '320'): string {
        const cleanId = this.stripPrefix(id);
        if (cleanId.startsWith('http')) return cleanId;
        return `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
    }

    getVideoCoverUrl(_videoCoverId: string, fallbackCoverId: string, _size = '1280'): string {
        return this.getCoverUrl(fallbackCoverId);
    }

    extractStreamUrlFromManifest(): string | null {
        return null;
    }

    // === Download ===

    async downloadTrack(id: string, _quality?: string, _filename?: string, options: { signal?: AbortSignal } = {}): Promise<{ blob: Blob; url: string }> {
        const streamUrl = await this.getStreamUrl(id, options);
        const response = await fetch(streamUrl, { cache: 'no-store', signal: options.signal });
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        const blob = await response.blob();
        return { blob, url: URL.createObjectURL(blob) };
    }

    // === Video stream ===

    async getVideoStreamUrl(id: string, options: { signal?: AbortSignal } = {}): Promise<string | null> {
        const cleanId = this.stripPrefix(id);
        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const videoStream = (data.videoStreams || []).find((s: any) => s.url && s.mimeType?.startsWith('video/') && !s.videoOnly);
            if (videoStream) return videoStream.url;
            const anyVideo = (data.videoStreams || []).find((s: any) => s.url);
            if (anyVideo) return anyVideo.url;
        } catch { /* ignore */ }
        return null;
    }

    // === Cache ===

    async clearCache(): Promise<void> {
        this.streamCache.clear();
        this.trackCache.clear();
    }

    getCacheStats() {
        return { streamCache: this.streamCache.size, trackCache: this.trackCache.size };
    }
}

export const youtubeAPI = new YouTubeAPI();
