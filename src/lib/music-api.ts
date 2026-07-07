import { type Track, type Album, type Artist, type QualityPreset, type SearchResult } from '../types';
import { youtubeAPI } from './youtube-api';
import { jamendoAPI } from './jamendo-api';
import { internetArchiveAPI } from './internet-archive-api';
import { musicProviderSettings } from './storage';

function getProviderFromId(id: string): string {
    if (id.startsWith('y:')) return 'youtube';
    if (id.startsWith('j:')) return 'jamendo';
    if (id.startsWith('ia:')) return 'internet_archive';
    return musicProviderSettings.get();
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

    private getActiveProvider(): string {
        return musicProviderSettings.get();
    }

    getProviderFromId(id: string): string {
        return getProviderFromId(id);
    }

    stripProviderPrefix(id: string): string {
        if (id.startsWith('y:')) return id.slice(2);
        if (id.startsWith('j:')) return id.slice(2);
        if (id.startsWith('ia:')) return id.slice(2);
        return id;
    }

    getCoverUrl(coverId: string | number | undefined, _size: string = '320'): string {
        if (!coverId) return '';
        if (typeof coverId === 'string') {
            if (coverId.startsWith('http')) return coverId;
            if (coverId.startsWith('blob:')) return coverId;
        }
        return '';
    }

    getArtistPictureUrl(pictureId: string | number | undefined, _size: string = '320'): string {
        if (!pictureId) return '';
        if (typeof pictureId === 'string') {
            if (pictureId.startsWith('http')) return pictureId;
        }
        return '';
    }

    async searchTracks(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (this.getActiveProvider() === 'internet_archive') {
            return internetArchiveAPI.searchTracks(query, options);
        }
        if (this.getActiveProvider() === 'jamendo') {
            return jamendoAPI.searchTracks(query, options);
        }
        return youtubeAPI.searchTracks(query, { limit: options.limit, signal: options.signal });
    }

    async searchArtists(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (this.getActiveProvider() === 'internet_archive') {
            return internetArchiveAPI.searchArtists(query, options);
        }
        if (this.getActiveProvider() === 'jamendo') {
            return jamendoAPI.searchArtists(query, options);
        }
        return youtubeAPI.searchArtists(query, { limit: options.limit, signal: options.signal });
    }

    async searchAlbums(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        if (this.getActiveProvider() === 'internet_archive') {
            return internetArchiveAPI.searchAlbums(query, options);
        }
        if (this.getActiveProvider() === 'jamendo') {
            return jamendoAPI.searchAlbums(query, options);
        }
        return youtubeAPI.searchAlbums(query, { limit: options.limit, signal: options.signal });
    }

    async getTrack(id: string, _quality?: QualityPreset): Promise<Track> {
        if (id.startsWith('ia:')) return internetArchiveAPI.getTrack(id);
        if (id.startsWith('j:')) return jamendoAPI.getTrack(id);
        return youtubeAPI.getTrack(id);
    }

    async getStreamUrl(id: string, _quality?: QualityPreset): Promise<string> {
        if (id.startsWith('ia:')) return internetArchiveAPI.getStreamUrl(id);
        if (id.startsWith('j:')) return jamendoAPI.getStreamUrl(id);
        return youtubeAPI.getStreamUrl(id);
    }

    async getAlbum(id: string): Promise<{ album: Album; tracks: Track[] }> {
        if (id.startsWith('ia:')) return internetArchiveAPI.getAlbum(id);
        if (id.startsWith('j:')) return jamendoAPI.getAlbum(id);
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
        if (id.startsWith('ia:')) return internetArchiveAPI.getArtist(id);
        if (id.startsWith('j:')) return jamendoAPI.getArtist(id);
        return youtubeAPI.getArtist(id);
    }

    async getPlaylist(id: string): Promise<{ playlist: any; tracks: Track[] }> {
        if (id.startsWith('ia:')) {
            const { album, tracks } = await internetArchiveAPI.getAlbum(id);
            return { playlist: album, tracks };
        }
        if (id.startsWith('j:')) {
            const { album, tracks } = await jamendoAPI.getAlbum(id);
            return { playlist: album, tracks };
        }
        return youtubeAPI.getPlaylist(id);
    }

    async getTrackRecommendations(id: string): Promise<Track[]> {
        if (id.startsWith('ia:')) return internetArchiveAPI.getTrackRecommendations(id);
        if (id.startsWith('j:')) return jamendoAPI.getTrackRecommendations(id);
        return youtubeAPI.getTrackRecommendations(id);
    }

    async clearCache(): Promise<void> {
        this.cache.clear();
        this.streamCache.clear();
        await youtubeAPI.clearCache();
        await jamendoAPI.clearCache();
        await internetArchiveAPI.clearCache();
    }
}

export const musicAPI = new MusicAPIClient();
