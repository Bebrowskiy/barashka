import { type Track, type Album, type Artist, type SearchResult } from '../types';

const SEARCH_URL = 'https://archive.org/advancedsearch.php';
const METADATA_URL = 'https://archive.org/metadata';
const DOWNLOAD_URL = 'https://archive.org/download';

class InternetArchiveAPI {
    private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
    private TTL = 30 * 60 * 1000;
    private MAX_CACHE = 200;

    private getCached(key: string): unknown | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    private setCache(key: string, data: unknown): void {
        if (this.cache.size >= this.MAX_CACHE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    private async search(query: string, limit: number = 20): Promise<any[]> {
        const cacheKey = `search:${query}:${limit}`;
        const cached = this.getCached(cacheKey) as any[] | null;
        if (cached) return cached;

        const params = new URLSearchParams({
            q: `mediatype:audio AND (${query})`,
            fl: 'identifier,title,creator,item_size',
            sort: 'downloads desc',
            rows: String(limit),
            page: '1',
            output: 'json',
        });

        const response = await fetch(`${SEARCH_URL}?${params}`);
        if (!response.ok) throw new Error(`Archive search error: ${response.status}`);
        const data = await response.json();
        const results = data.response?.docs || [];
        this.setCache(cacheKey, results);
        return results;
    }

    private async getMetadata(identifier: string): Promise<any> {
        const cacheKey = `meta:${identifier}`;
        const cached = this.getCached(cacheKey) as any | null;
        if (cached) return cached;

        const response = await fetch(`${METADATA_URL}/${identifier}`);
        if (!response.ok) throw new Error(`Archive metadata error: ${response.status}`);
        const data = await response.json();
        this.setCache(cacheKey, data);
        return data;
    }

    private findAudioFile(files: any[]): { name: string; format: string } | null {
        // Prefer MP3, then OGG, then any audio format
        const audioFormats = ['VBR MP3', 'MP3', 'Ogg Vorbis', '128Kbps MP3', '64Kbps MP3', 'Flac', 'AIFF'];
        for (const fmt of audioFormats) {
            const file = files.find((f: any) => f.format === fmt && f.name?.match(/\.(mp3|ogg|flac|aiff)$/i));
            if (file) return { name: file.name, format: file.format };
        }
        // Fallback: any file ending with audio extension
        const fallback = files.find((f: any) => f.name?.match(/\.(mp3|ogg|flac|wav|m4a)$/i));
        if (fallback) return { name: fallback.name, format: fallback.format || '' };
        return null;
    }

    private findCoverImage(files: any[]): string | null {
        const img = files.find((f: any) => f.name?.match(/\.(jpg|jpeg|png|gif)$/i) && f.size && parseInt(f.size) > 1000);
        return img ? img.name : null;
    }

    private itemToTrack(item: any, metadata: any): Track {
        const files = metadata?.files || [];
        const audioFile = this.findAudioFile(files);
        const coverFile = this.findCoverImage(files);

        const identifier = item.identifier;
        const streamUrl = audioFile
            ? `${DOWNLOAD_URL}/${identifier}/${encodeURIComponent(audioFile.name)}`
            : '';

        const coverUrl = coverFile
            ? `${DOWNLOAD_URL}/${identifier}/${encodeURIComponent(coverFile)}`
            : '';

        // Try to extract duration from metadata
        let duration = 0;
        if (metadata?.metadata?.playtime) {
            duration = parseFloat(metadata.metadata.playtime) || 0;
        }

        return {
            id: `ia:${identifier}`,
            title: item.title || metadata?.metadata?.title || identifier,
            duration,
            artist: item.creator || metadata?.metadata?.creator || 'Unknown Artist',
            album: undefined,
            cover: coverUrl || undefined,
            audioUrl: streamUrl || undefined,
        };
    }

    async searchTracks(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        const limit = options.limit || 20;
        const results = await this.search(query, limit);

        const items: Track[] = [];
        for (const item of results) {
            try {
                const metadata = await this.getMetadata(item.identifier);
                items.push(this.itemToTrack(item, metadata));
            } catch {
                // Skip items that fail to load metadata
            }
        }

        return {
            items,
            limit,
            offset: options.offset || 0,
            totalNumberOfItems: items.length,
        };
    }

    async searchArtists(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        // Archive doesn't have dedicated artist entities — search for albums by creator
        const limit = options.limit || 20;
        const results = await this.search(query, limit);

        // Deduplicate by creator
        const seen = new Set<string>();
        const items: Track[] = [];
        for (const item of results) {
            const creator = item.creator || 'Unknown Artist';
            if (seen.has(creator)) continue;
            seen.add(creator);
            items.push({
                id: `ia:${item.identifier}`,
                title: creator,
                artist: creator,
                duration: 0,
                cover: undefined,
            });
            if (items.length >= limit) break;
        }

        return {
            items,
            limit,
            offset: options.offset || 0,
            totalNumberOfItems: items.length,
        };
    }

    async searchAlbums(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        // Albums on Archive are just items — same as tracks search
        return this.searchTracks(query, options);
    }

    async getTrack(id: string): Promise<Track> {
        const identifier = id.replace(/^ia:/, '');
        const cacheKey = `track:${identifier}`;
        const cached = this.getCached(cacheKey) as Track | null;
        if (cached) return cached;

        const metadata = await this.getMetadata(identifier);
        const item = {
            identifier,
            title: metadata?.metadata?.title || identifier,
            creator: metadata?.metadata?.creator || 'Unknown Artist',
        };

        const track = this.itemToTrack(item, metadata);
        this.setCache(cacheKey, track);
        return track;
    }

    async getStreamUrl(id: string): Promise<string> {
        const identifier = id.replace(/^ia:/, '');
        const track = await this.getTrack(`ia:${identifier}`);
        if (track.audioUrl) return track.audioUrl;
        throw new Error('No audio file found for this item');
    }

    async getAlbum(id: string): Promise<{ album: Album; tracks: Track[] }> {
        const identifier = id.replace(/^ia:/, '');
        const metadata = await this.getMetadata(identifier);
        const files = metadata?.files || [];

        const album: Album = {
            id: `ia:${identifier}`,
            title: metadata?.metadata?.title || identifier,
            cover: this.findCoverImage(files)
                ? `${DOWNLOAD_URL}/${identifier}/${encodeURIComponent(this.findCoverImage(files)!)}`
                : undefined,
        };

        // Get all audio tracks from the item
        const audioFiles = files.filter((f: any) => f.name?.match(/\.(mp3|ogg|flac|wav|m4a)$/i));
        const tracks: Track[] = audioFiles.map((f: any, i: number) => ({
            id: `ia:${identifier}/${f.name}`,
            title: f.title || f.name?.replace(/\.[^.]+$/, '') || `Track ${i + 1}`,
            duration: parseFloat(f.length) || 0,
            artist: metadata?.metadata?.creator || 'Unknown Artist',
            cover: album.cover,
            audioUrl: `${DOWNLOAD_URL}/${identifier}/${encodeURIComponent(f.name)}`,
        }));

        return { album, tracks };
    }

    async getArtist(id: string): Promise<{ artist: Artist; albums: Album[]; tracks: Track[] }> {
        // Search for items by this creator
        const identifier = id.replace(/^ia:/, '');
        const metadata = await this.getMetadata(identifier);
        const creator = metadata?.metadata?.creator || 'Unknown Artist';

        const artist: Artist = {
            id: `ia:${identifier}`,
            name: creator,
            avatar: undefined,
        };

        // Search for more items by this creator
        const searchResults = await this.search(`creator:(${creator})`, 10);
        const albums: Album[] = [];
        const tracks: Track[] = [];

        for (const item of searchResults) {
            try {
                const itemMeta = await this.getMetadata(item.identifier);
                const coverFile = this.findCoverImage(itemMeta?.files || []);
                albums.push({
                    id: `ia:${item.identifier}`,
                    title: item.title || item.identifier,
                    cover: coverFile ? `${DOWNLOAD_URL}/${item.identifier}/${encodeURIComponent(coverFile)}` : undefined,
                });
            } catch {}
        }

        return { artist, albums, tracks };
    }

    async getTrackRecommendations(id: string): Promise<Track[]> {
        // Search for similar content based on the item's title/creator
        const identifier = id.replace(/^ia:/, '');
        try {
            const metadata = await this.getMetadata(identifier);
            const query = metadata?.metadata?.subject || metadata?.metadata?.title || '';
            if (!query) return [];
            const results = await this.search(query, 10);
            const tracks: Track[] = [];
            for (const item of results) {
                if (item.identifier === identifier) continue;
                try {
                    const itemMeta = await this.getMetadata(item.identifier);
                    tracks.push(this.itemToTrack(item, itemMeta));
                } catch {}
            }
            return tracks;
        } catch {
            return [];
        }
    }

    async clearCache(): Promise<void> {
        this.cache.clear();
    }
}

export const internetArchiveAPI = new InternetArchiveAPI();
