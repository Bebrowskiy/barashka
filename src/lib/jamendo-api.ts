import { type Track, type Album, type Artist, type SearchResult } from '../types';
import { jamendoSettings } from './storage';

const BASE_URL = 'https://api.jamendo.com/v3.0';

class JamendoAPI {
    private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
    private TTL = 30 * 60 * 1000;
    private MAX_CACHE = 200;

    private getClientId(): string {
        return jamendoSettings.get().clientId;
    }

    private getAudioFormat(): string {
        return jamendoSettings.get().audioFormat;
    }

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

    private async fetchJSON(endpoint: string, params: Record<string, string> = {}): Promise<any> {
        const clientId = this.getClientId();
        if (!clientId) throw new Error('Jamendo client_id not configured');

        const url = new URL(`${BASE_URL}${endpoint}`);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('format', 'json');
        for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
        }

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Jamendo API error: ${response.status}`);
        return response.json();
    }

    private transformTrack(item: any): Track {
        const id = String(item.id);
        const artistName = item.artist_name || 'Unknown Artist';
        const artistId = String(item.artist_id || '');

        return {
            id: `j:${id}`,
            title: item.name || 'Unknown Title',
            duration: item.duration || 0,
            artist: artistName,
            artists: [{ id: `j:${artistId}`, name: artistName }],
            album: item.album_id ? {
                id: `j:${item.album_id}`,
                title: item.album_name || '',
                cover: item.album_image || undefined,
            } : undefined,
            cover: item.image || item.album_image || undefined,
            audioUrl: item.audio || undefined,
            remoteUrl: item.audiodownload || undefined,
        };
    }

    private transformAlbum(item: any): Album {
        return {
            id: `j:${item.id}`,
            title: item.name || item.album_name || 'Unknown Album',
            cover: item.image || item.album_image || undefined,
            trackCount: item.track_count || 0,
            releaseDate: item.releasedate || undefined,
        };
    }

    private transformArtist(item: any): Artist {
        return {
            id: `j:${item.id}`,
            name: item.name || item.artist_name || 'Unknown Artist',
            avatar: item.image || item.artist_image || undefined,
        };
    }

    async searchTracks(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        const limit = options.limit || 20;
        const cacheKey = `search:tracks:${query}:${limit}`;
        const cached = this.getCached(cacheKey) as SearchResult | null;
        if (cached) return cached;

        const data = await this.fetchJSON('/tracks/', {
            search: query,
            limit: String(limit),
            offset: String(options.offset || 0),
            audioformat: this.getAudioFormat(),
            imagesize: '300',
        });

        const items = (data.results || []).map((t: any) => this.transformTrack(t));
        const result: SearchResult = {
            items,
            limit,
            offset: options.offset || 0,
            totalNumberOfItems: data.headers?.results_count || items.length,
        };

        this.setCache(cacheKey, result);
        return result;
    }

    async searchArtists(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        const limit = options.limit || 20;
        const cacheKey = `search:artists:${query}:${limit}`;
        const cached = this.getCached(cacheKey) as SearchResult | null;
        if (cached) return cached;

        const data = await this.fetchJSON('/artists/', {
            name: query,
            limit: String(limit),
            offset: String(options.offset || 0),
            imagesize: '300',
        });

        const items = (data.results || []).map((a: any) => ({
            id: `j:${a.id}`,
            title: a.name || 'Unknown',
            artist: a.name,
            duration: 0,
            cover: a.image || undefined,
        }));

        const result: SearchResult = {
            items,
            limit,
            offset: options.offset || 0,
            totalNumberOfItems: data.headers?.results_count || items.length,
        };

        this.setCache(cacheKey, result);
        return result;
    }

    async searchAlbums(query: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<SearchResult> {
        const limit = options.limit || 20;
        const cacheKey = `search:albums:${query}:${limit}`;
        const cached = this.getCached(cacheKey) as SearchResult | null;
        if (cached) return cached;

        const data = await this.fetchJSON('/albums/', {
            name: query,
            limit: String(limit),
            offset: String(options.offset || 0),
            imagesize: '300',
        });

        const items = (data.results || []).map((a: any) => ({
            id: `j:${a.id}`,
            title: a.name || 'Unknown',
            artist: a.artist_name || '',
            duration: 0,
            cover: a.image || undefined,
        }));

        const result: SearchResult = {
            items,
            limit,
            offset: options.offset || 0,
            totalNumberOfItems: data.headers?.results_count || items.length,
        };

        this.setCache(cacheKey, result);
        return result;
    }

    async getTrack(id: string): Promise<Track> {
        const cleanId = id.replace(/^j:/, '');
        const cacheKey = `track:${cleanId}`;
        const cached = this.getCached(cacheKey) as Track | null;
        if (cached) return cached;

        const data = await this.fetchJSON('/tracks/', {
            id: cleanId,
            audioformat: this.getAudioFormat(),
            imagesize: '300',
        });

        if (!data.results?.length) throw new Error('Track not found');
        const track = this.transformTrack(data.results[0]);
        this.setCache(cacheKey, track);
        return track;
    }

    async getStreamUrl(id: string): Promise<string> {
        const cleanId = id.replace(/^j:/, '');
        const track = await this.getTrack(`j:${cleanId}`);
        if (track.audioUrl) return track.audioUrl;

        // Fallback: construct stream URL directly
        return `https://prod-1.storage.jamendo.com/?trackid=${cleanId}&format=${this.getAudioFormat()}&from=app-barashka`;
    }

    async getAlbum(id: string): Promise<{ album: Album; tracks: Track[] }> {
        const cleanId = id.replace(/^j:/, '');
        const cacheKey = `album:${cleanId}`;
        const cached = this.getCached(cacheKey) as { album: Album; tracks: Track[] } | null;
        if (cached) return cached;

        const data = await this.fetchJSON('/albums/tracks/', {
            id: cleanId,
            audioformat: this.getAudioFormat(),
            imagesize: '300',
        });

        if (!data.results?.length) throw new Error('Album not found');
        const albumData = data.results[0];
        const album: Album = this.transformAlbum(albumData);
        const tracks = (albumData.tracks || []).map((t: any) => this.transformTrack(t));

        const result = { album, tracks };
        this.setCache(cacheKey, result);
        return result;
    }

    async getArtist(id: string): Promise<{ artist: Artist; albums: Album[]; tracks: Track[] }> {
        const cleanId = id.replace(/^j:/, '');
        const cacheKey = `artist:${cleanId}`;
        const cached = this.getCached(cacheKey) as { artist: Artist; albums: Album[]; tracks: Track[] } | null;
        if (cached) return cached;

        // Get artist info
        const artistData = await this.fetchJSON('/artists/', {
            id: cleanId,
            imagesize: '300',
        });

        if (!artistData.results?.length) throw new Error('Artist not found');
        const artist = this.transformArtist(artistData.results[0]);

        // Get artist tracks
        const tracksData = await this.fetchJSON('/artists/tracks/', {
            id: cleanId,
            limit: '50',
            audioformat: this.getAudioFormat(),
            imagesize: '300',
        });

        const tracks = (tracksData.results || []).map((t: any) => this.transformTrack(t));

        // Get artist albums
        const albumsData = await this.fetchJSON('/artists/albums/', {
            id: cleanId,
            limit: '20',
            imagesize: '300',
        });

        const albums = (albumsData.results || []).map((a: any) => this.transformAlbum(a));

        const result = { artist, albums, tracks };
        this.setCache(cacheKey, result);
        return result;
    }

    async getTrackRecommendations(id: string): Promise<Track[]> {
        const cleanId = id.replace(/^j:/, '');
        const cacheKey = `recs:${cleanId}`;
        const cached = this.getCached(cacheKey) as Track[] | null;
        if (cached) return cached;

        try {
            const data = await this.fetchJSON('/tracks/similar/', {
                id: cleanId,
                limit: '20',
                audioformat: this.getAudioFormat(),
                imagesize: '300',
            });

            const tracks = (data.results || []).map((t: any) => this.transformTrack(t));
            this.setCache(cacheKey, tracks);
            return tracks;
        } catch {
            return [];
        }
    }

    async clearCache(): Promise<void> {
        this.cache.clear();
    }
}

export const jamendoAPI = new JamendoAPI();
