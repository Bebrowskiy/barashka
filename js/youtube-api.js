// js/youtube-api.js
// YouTube streaming via Piped API (privacy-friendly YouTube frontend)

const PIPED_INSTANCES = [
    '/piped',
    'https://api.piped.private.coffee',
];

const REQUEST_TIMEOUT_MS = 15000;

function withTimeout(signal, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);

    if (signal) {
        if (signal.aborted) controller.abort(signal.reason);
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }

    return { signal: controller.signal, cleanup: () => clearTimeout(timeout) };
}

export class YouTubeAPI {
    constructor() {
        this.instances = [...PIPED_INSTANCES];
        this.currentInstance = this.instances[0];
        this.streamCache = new Map();
        this.trackCache = new Map();
    }

    async fetchJSON(endpoint, params = {}, options = {}) {
        let lastError = null;

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
                    throw new Error(`Piped request failed with status ${response.status}`);
                }

                this.currentInstance = instance;
                return await response.json();
            } catch (error) {
                timeout.cleanup();
                if (error.name === 'AbortError') throw error;
                lastError = error;
                console.warn(`Piped instance ${instance} failed:`, error.message);
            }
        }

        throw lastError || new Error('All Piped instances failed');
    }

    stripPrefix(id) {
        if (typeof id === 'string' && id.startsWith('y:')) {
            return id.slice(2);
        }
        return id;
    }

    extractIdFromUrl(url) {
        if (!url) return 'unknown';
        const match = url.match(/\/watch\?v=([^&]+)/)
            || url.match(/\/channel\/([^/?]+)/)
            || url.match(/\/@([^/?]+)/)
            || url.match(/\/c\/([^/?]+)/)
            || url.match(/\/user\/([^/?]+)/);
        return match ? match[1] : url.split('/').pop();
    }

    transformTrack(video) {
        if (!video) return null;

        const id = video.id || this.extractIdFromUrl(video.url);
        const duration = video.duration || 0;
        const artistName = video.uploaderName || video.uploader || 'Unknown Artist';
        const title = video.title || 'Unknown Title';
        const artistId = this.extractIdFromUrl(video.uploaderUrl);

        const type = video.type || '';
        const isLive = type === 'STREAM' || video.isLive || false;

        let version = null;
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('cover') || lowerTitle.includes('кавер')) version = 'Cover';
        else if (lowerTitle.includes('remix') || lowerTitle.includes('ремикс')) version = 'Remix';
        else if (lowerTitle.includes('live') || lowerTitle.includes('live)') || lowerTitle.includes('лаф') || isLive) version = 'Live';
        else if (lowerTitle.includes('acoustic') || lowerTitle.includes('акустик')) version = 'Acoustic';
        else if (lowerTitle.includes('karaoke') || lowerTitle.includes('караоке')) version = 'Karaoke';
        else if (lowerTitle.includes('instrumental') || lowerTitle.includes('инструментал')) version = 'Instrumental';
        else if (lowerTitle.includes('slowed') || lowerTitle.includes('reverb')) version = 'Slowed';

        return {
            id: `y:${id}`,
            title,
            duration,
            trackNumber: 0,
            volumeNumber: 1,
            version,
            isrc: null,
            isAvailable: true,
            isExplicit: false,
            artists: [{ id: `y:${artistId}`, name: artistName }],
            artist: { id: `y:${artistId}`, name: artistName },
            album: {
                id: `y:${id}`,
                title: video.uploaderName || 'YouTube',
                cover: video.thumbnailUrl || video.thumbnail,
                videoCover: null,
                releaseDate: video.uploadedDate || null,
                duration,
                numberOfTracks: 1,
                type: 'SINGLE',
                artist: { id: `y:${artistId}`, name: artistName },
            },
            providers: { youtube: id },
            _raw: video,
        };
    }

    transformArtist(channel) {
        if (!channel) return null;

        const id = channel.id || this.extractIdFromUrl(channel.url);
        const picture = channel.avatarUrl || channel.thumbnailUrl || channel.thumbnail || null;

        return {
            id: `y:${id}`,
            name: channel.name || channel.title || 'Unknown Artist',
            picture,
            pictureLarge: channel.bannerUrl || picture,
            bio: channel.description || null,
            tracks: [],
            albums: [],
            eps: [],
            providers: { youtube: id },
            _raw: channel,
        };
    }

    // Search methods
    async searchTracks(query, options = {}) {
        try {
            const limit = options.limit || 10;
            const data = await this.fetchJSON('/search', { q: query, filter: 'music_songs' }, { signal: options.signal });

            const items = (data.items || []).slice(0, limit).map((item, index) => {
                const track = this.transformTrack(item);
                if (track) track.trackNumber = index + 1;
                return track;
            }).filter(Boolean);

            return {
                items,
                limit,
                offset: 0,
                totalNumberOfItems: items.length,
            };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube track search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchAll(query, options = {}) {
        try {
            const limit = options.limit || 20;
            const data = await this.fetchJSON('/search', { q: query }, { signal: options.signal });

            const items = (data.items || [])
                .filter((item) => item.type === 'stream' || item.type === 'TRACK' || item.url)
                .slice(0, limit)
                .map((item, index) => {
                    const track = this.transformTrack(item);
                    if (track) track.trackNumber = index + 1;
                    return track;
                }).filter(Boolean);

            return {
                items,
                limit,
                offset: 0,
                totalNumberOfItems: items.length,
            };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube broad search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchArtists(query, options = {}) {
        try {
            const limit = options.limit || 10;
            const data = await this.fetchJSON('/search', { q: query, filter: 'channels' }, { signal: options.signal });

            const items = (data.items || []).slice(0, limit)
                .map((item) => this.transformArtist(item))
                .filter(Boolean);

            return {
                items,
                limit,
                offset: 0,
                totalNumberOfItems: items.length,
            };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube artist search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchAlbums(query, options = {}) {
        try {
            const limit = options.limit || 10;
            const data = await this.fetchJSON('/search', { q: query, filter: 'playlists' }, { signal: options.signal });

            const items = (data.items || [])
                .filter((item) => item.type === 'playlist' || item.url)
                .slice(0, limit)
                .map((item) => {
                    const plId = item.id || this.extractIdFromUrl(item.url);
                    const uploaderName = item.uploaderName || item.uploader || item.ownerChannelName || '';
                    return {
                        id: `y:${plId}`,
                        title: item.name || item.title || 'YouTube Playlist',
                        description: item.description || '',
                        numberOfTracks: item.videos || item.videoCount || 0,
                        cover: item.thumbnailUrl || item.thumbnail || null,
                        artist: uploaderName ? { id: '', name: uploaderName } : null,
                        type: 'PLAYLIST',
                        providers: { youtube: plId },
                    };
                });

            return {
                items,
                limit,
                offset: 0,
                totalNumberOfItems: items.length,
            };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error('YouTube album search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    async searchPlaylists(query, options = {}) {
        return this.searchAlbums(query, options);
    }

    // Get methods
    async getTrack(id, _quality, options = {}) {
        const cleanId = this.stripPrefix(id);
        const cacheKey = `track_${cleanId}`;

        if (this.trackCache.has(cacheKey)) {
            return { info: this.trackCache.get(cacheKey), manifest: null };
        }

        const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
        const track = this.transformTrack(data);

        if (!track) throw new Error('YouTube video not found');

        this.trackCache.set(cacheKey, track);
        return { info: track, manifest: null };
    }

    async getTrackMetadata(id, options = {}) {
        const result = await this.getTrack(id, null, options);
        return result.info;
    }

    async getAlbum(id, options = {}) {
        return this.getTrack(id, null, options);
    }

    async getArtist(id, options = {}) {
        const cleanId = this.stripPrefix(id);

        let data;
        try {
            data = await this.fetchJSON(`/channel/${cleanId}`, {}, { signal: options.signal });
        } catch {
            data = {};
        }

        const artist = this.transformArtist(data);
        if (!artist) throw new Error('YouTube channel not found');

        let videos = [];

        if (data.relatedStreams && data.relatedStreams.length > 0) {
            videos = data.relatedStreams
                .filter((item) => item && (item.url || item.id))
                .map((item) => this.transformTrack(item))
                .filter(Boolean);
        }

        if (videos.length === 0 && data.tabs) {
            for (const tab of data.tabs) {
                if (tab.content && Array.isArray(tab.content)) {
                    videos = tab.content
                        .filter((item) => item && (item.url || item.id))
                        .map((item) => this.transformTrack(item))
                        .filter(Boolean);
                    if (videos.length > 0) break;
                }
            }
        }

        const searchName = artist.name.replace(/\s*-\s*Topic$/i, '').trim() || artist.name;

        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', {
                    q: searchName,
                    filter: 'music_songs',
                }, { signal: options.signal });
                videos = (searchData.items || [])
                    .filter((item) => {
                        const chId = this.extractIdFromUrl(item.uploaderUrl);
                        return chId === cleanId;
                    })
                    .map((item) => this.transformTrack(item))
                    .filter(Boolean);
            } catch {
                // ignore
            }
        }

        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', {
                    q: searchName,
                }, { signal: options.signal });
                videos = (searchData.items || [])
                    .filter((item) => {
                        const chId = this.extractIdFromUrl(item.uploaderUrl);
                        return chId === cleanId;
                    })
                    .map((item) => this.transformTrack(item))
                    .filter(Boolean);
            } catch {
                // ignore
            }
        }

        if (videos.length === 0) {
            try {
                const searchData = await this.fetchJSON('/search', {
                    q: searchName,
                }, { signal: options.signal });
                videos = (searchData.items || [])
                    .filter((item) => item.type === 'stream' || item.url)
                    .map((item) => this.transformTrack(item))
                    .filter(Boolean);
            } catch {
                // ignore
            }
        }

        artist.tracks = videos.slice(0, 50);
        artist.albums = [];

        return artist;
    }

    async getPlaylist(id, options = {}) {
        const cleanId = this.stripPrefix(id);
        const data = await this.fetchJSON(`/playlists/${cleanId}`, {}, { signal: options.signal });

        const tracks = (data.items || []).map((item, index) => {
            const track = this.transformTrack(item);
            if (track) track.trackNumber = index + 1;
            return track;
        }).filter(Boolean);

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

    async getMix(id, _options = {}) {
        const cleanId = this.stripPrefix(id);
        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {});
            const related = (data.relatedStreams || [])
                .map((item) => this.transformTrack(item))
                .filter(Boolean);

            return {
                mix: {
                    id: `y:${cleanId}`,
                    title: data.title || 'YouTube Mix',
                    subTitle: data.uploaderName || '',
                    description: data.description || '',
                    mixType: 'USER_GENERATED',
                    cover: data.thumbnailUrl || null,
                },
                tracks: related,
            };
        } catch {
            return { mix: null, tracks: [] };
        }
    }

    async getTrackRecommendations(id, options = {}) {
        const cleanId = this.stripPrefix(id);

        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });

            return (data.relatedStreams || []).slice(0, 20)
                .map((item) => this.transformTrack(item))
                .filter(Boolean);
        } catch {
            return [];
        }
    }

    async getSimilarArtists(artistId, options = {}) {
        const cleanId = this.stripPrefix(artistId);
        try {
            const data = await this.fetchJSON(`/channel/${cleanId}`, {}, { signal: options.signal });
            const artistName = (data.name || '').replace(/\s*-\s*Topic$/i, '').trim();

            const related = (data.relatedStreams || [])
                .reduce((acc, item) => {
                    const url = item.uploaderUrl || item.url || '';
                    const chId = this.extractIdFromUrl(url);
                    if (chId && chId !== 'unknown' && chId !== cleanId && !acc.some((a) => a.id === chId)) {
                        acc.push({
                            id: `y:${chId}`,
                            name: item.uploaderName || 'Unknown',
                            picture: item.uploaderAvatar || null,
                        });
                    }
                    return acc;
                }, [])
                .slice(0, 12);

            if (related.length > 0) return related;

            if (artistName) {
                try {
                    const searchData = await this.fetchJSON('/search', {
                        q: artistName,
                        filter: 'channels',
                    }, { signal: options.signal });
                    return (searchData.items || [])
                        .filter((item) => {
                            const chId = item.id || this.extractIdFromUrl(item.url);
                            return chId && chId !== cleanId;
                        })
                        .slice(0, 12)
                        .map((item) => this.transformArtist(item))
                        .filter(Boolean);
                } catch {
                    // ignore
                }
            }

            return [];
        } catch {
            return [];
        }
    }

    async getTrackVersions(trackId, options = {}) {
        const cleanId = this.stripPrefix(trackId);
        try {
            const trackData = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const title = trackData.title || '';
            const uploader = trackData.uploaderName || '';
            const searchQuery = `${uploader} ${title}`.trim();

            const searchData = await this.fetchJSON('/search', { q: searchQuery }, { signal: options.signal });

            const versions = (searchData.items || [])
                .filter((item) => {
                    const id = item.id || this.extractIdFromUrl(item.url);
                    return id !== cleanId;
                })
                .slice(0, 10)
                .map((item) => this.transformTrack(item))
                .filter(Boolean);

            return versions;
        } catch {
            return [];
        }
    }

    async getSimilarAlbums(albumId, options = {}) {
        const cleanId = this.stripPrefix(albumId);
        try {
            const trackData = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const uploader = (trackData.uploaderName || '').replace(/\s*-\s*Topic$/i, '').trim();
            if (!uploader) return [];

            const data = await this.fetchJSON('/search', { q: uploader, filter: 'playlists' }, { signal: options.signal });
            return (data.items || [])
                .filter((item) => item.type === 'playlist' || item.url)
                .slice(0, 8)
                .map((item) => {
                    const plId = item.id || this.extractIdFromUrl(item.url);
                    return {
                        id: `y:${plId}`,
                        title: item.name || item.title || 'YouTube Playlist',
                        description: item.description || '',
                        numberOfTracks: item.videos || item.videoCount || 0,
                        cover: item.thumbnailUrl || item.thumbnail || null,
                        type: 'PLAYLIST',
                        providers: { youtube: plId },
                    };
                });
        } catch {
            return [];
        }
    }

    async getRecommendedTracksForPlaylist(tracks, limit = 20, _options = {}) {
        if (!tracks || tracks.length === 0) return [];

        const artistNames = new Set();
        for (const track of tracks) {
            if (track.artist?.name) artistNames.add(track.artist.name);
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

        const seenIds = new Set(tracks.map((t) => {
            const id = t.id;
            return typeof id === 'string' && id.startsWith('y:') ? id.slice(2) : id;
        }));
        const recommended = [];

        const artists = [...artistNames].sort(() => Math.random() - 0.5).slice(0, 5);

        for (const name of artists) {
            try {
                const data = await this.fetchJSON('/search', {
                    q: name,
                    filter: 'music_songs',
                });

                const items = (data.items || [])
                    .filter((item) => {
                        const id = item.id || this.extractIdFromUrl(item.url);
                        return !seenIds.has(id);
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
            } catch (e) {
                console.warn(`YouTube recommendation search failed for "${name}":`, e.message);
            }
        }

        return recommended.slice(0, limit);
    }

    // Stream methods
    async getStreamUrl(id, _quality, options = {}) {
        const cleanId = this.stripPrefix(id);
        const cacheKey = `stream_${cleanId}`;

        if (this.streamCache.has(cacheKey)) {
            return this.streamCache.get(cacheKey);
        }

        const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });

        if (data.error) throw new Error(data.error);

        const audioStreams = (data.audioStreams || []).filter((s) => s.mimeType?.startsWith('audio/'));
        const adaptiveAudio = (data.adaptiveFormats || []).filter((s) => s.mimeType?.startsWith('audio/'));
        const allAudio = audioStreams.length > 0 ? audioStreams : adaptiveAudio;

        if (allAudio.length === 0 && data.hls) {
            this.streamCache.set(cacheKey, data.hls);
            return data.hls;
        }

        if (allAudio.length === 0) {
            const combined = (data.videoStreams || []).find((s) => !s.videoOnly && s.url);
            if (combined) {
                this.streamCache.set(cacheKey, combined.url);
                return combined.url;
            }
            throw new Error('No audio streams available');
        }

        // Sort by bitrate descending, prefer opus > aac > mp3
        const sorted = allAudio
            .sort((a, b) => {
                const aPriority = a.mimeType?.includes('opus') ? 3 : a.mimeType?.includes('aac') ? 2 : 1;
                const bPriority = b.mimeType?.includes('opus') ? 3 : b.mimeType?.includes('aac') ? 2 : 1;
                if (aPriority !== bPriority) return bPriority - aPriority;
                return (b.bitrate || 0) - (a.bitrate || 0);
            });

        if (sorted.length === 0) throw new Error('No suitable audio stream found');

        const streamUrl = sorted[0].url;
        this.streamCache.set(cacheKey, streamUrl);
        return streamUrl;
    }

    // Cover/artwork methods
    getCoverUrl(id, _size = '320') {
        const cleanId = this.stripPrefix(id);
        return `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
    }

    getArtistPictureUrl(id, _size = '320') {
        const cleanId = this.stripPrefix(id);
        if (cleanId.startsWith('http')) return cleanId;
        return `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
    }

    getVideoCoverUrl(_videoCoverId, fallbackCoverId, size = '1280') {
        return this.getCoverUrl(fallbackCoverId, size);
    }

    extractStreamUrlFromManifest() {
        return null;
    }

    // Download methods
    async downloadTrack(id, quality, filename, options = {}) {
        const streamUrl = await this.getStreamUrl(id, quality, options);

        const response = await fetch(streamUrl, {
            cache: 'no-store',
            signal: options.signal,
        });

        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const blob = await response.blob();
        return { blob, url: URL.createObjectURL(blob) };
    }

    // Cache methods
    async clearCache() {
        this.streamCache.clear();
        this.trackCache.clear();
    }

    getCacheStats() {
        return {
            streamCache: this.streamCache.size,
            trackCache: this.trackCache.size,
        };
    }

    async getVideoStreamUrl(id, options = {}) {
        const cleanId = this.stripPrefix(id);
        try {
            const data = await this.fetchJSON(`/streams/${cleanId}`, {}, { signal: options.signal });
            const videoStream = (data.videoStreams || []).find((s) => s.url && s.mimeType?.startsWith('video/') && !s.videoOnly);
            if (videoStream) return videoStream.url;
            const anyVideo = (data.videoStreams || []).find((s) => s.url);
            if (anyVideo) return anyVideo.url;
        } catch {
            // ignore
        }
        return null;
    }
}
