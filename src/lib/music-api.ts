import { type Track, type Album, type Artist, type QualityPreset, type SearchResult } from '../types';
import { youtubeAPI } from './youtube-api';

function isYouTubeId(id: string): boolean {
    return id.startsWith('y:');
}

function getProviderFromId(id: string): string {
    if (id.startsWith('y:')) return 'youtube';
    return 'youtube';
}

class MusicAPIClient {
    private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
    private streamCache: Map<string, string> = new Map();
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

    getProviderFromId(id: string): string {
        return getProviderFromId(id);
    }

    stripProviderPrefix(id: string): string {
        if (id.startsWith('y:')) {
            return id.slice(2);
        }
        return id;
    }

    getCoverUrl(coverId: string | number | undefined, size: string = '320'): string {
        if (!coverId) return '';
        if (typeof coverId === 'string') {
            if (coverId.startsWith('http')) return coverId;
            if (coverId.startsWith('blob:')) return coverId;
        }
        return '';
    }

    getArtistPictureUrl(pictureId: string | number | undefined, size: string = '320'): string {
        if (!pictureId) return '';
        if (typeof pictureId === 'string') {
            if (pictureId.startsWith('http')) return pictureId;
        }
        return '';
    }

    async searchTracks(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        return youtubeAPI.searchTracks(query, { limit: options.limit, signal: options.signal });
    }

    async searchArtists(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        return youtubeAPI.searchArtists(query, { limit: options.limit, signal: options.signal });
    }

    async searchAlbums(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        return youtubeAPI.searchAlbums(query, { limit: options.limit, signal: options.signal });
    }

    async getTrack(id: string, quality?: QualityPreset): Promise<Track> {
        return youtubeAPI.getTrack(id);
    }

    async getStreamUrl(id: string, quality?: QualityPreset): Promise<string> {
        return youtubeAPI.getStreamUrl(id);
    }

    async getAlbum(id: string): Promise<{ album: Album; tracks: Track[] }> {
        const playlist = await youtubeAPI.getPlaylist(id);
        return {
            album: {
                id: playlist.playlist.id,
                title: playlist.playlist.title,
                cover: playlist.playlist.cover,
            },
            tracks: playlist.tracks,
        };
    }

    async getArtist(id: string): Promise<{ artist: Artist; albums: Album[]; tracks: Track[] }> {
        return youtubeAPI.getArtist(id);
    }

    async getPlaylist(id: string): Promise<{ playlist: any; tracks: Track[] }> {
        return youtubeAPI.getPlaylist(id);
    }

    async getTrackRecommendations(id: string): Promise<Track[]> {
        return [];
    }

    async clearCache(): Promise<void> {
        this.cache.clear();
        this.streamCache.clear();
        await youtubeAPI.clearCache();
    }
}

export const musicAPI = new MusicAPIClient();
