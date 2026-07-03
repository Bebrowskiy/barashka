import type { Track } from '../types';

const GENIUS_TOKEN = 'QoqM8nz23is_rAQHuNEWphY15CiM3Nxb9VjXjaiVuu8ZrS23v8QXuu0N__FgvMDMs3HNoAvtT97yYfzRPgB0Vw';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export interface GeniusSong {
    id: number;
    title: string;
    url: string;
    artist: { name: string };
    song_art_image_thumbnail_url: string;
}

export interface GeniusAnnotation {
    fragment: string;
    annotation: { plain: string };
}

export interface GeniusData {
    song: GeniusSong;
    annotations: GeniusAnnotation[];
}

class GeniusAPI {
    private cache = new Map<string, GeniusData | null>();

    private getArtist(track: Track): string {
        if (track.artists && track.artists.length > 0) return track.artists[0].name;
        return track.artist || 'Unknown';
    }

    async searchTrack(title: string, artist: string): Promise<GeniusSong | null> {
        const cleanTitle = title.split('(')[0].split('-')[0].trim();
        const query = encodeURIComponent(`${cleanTitle} ${artist}`);
        const url = `https://api.genius.com/search?q=${query}&access_token=${GENIUS_TOKEN}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.response?.hits?.length) return null;

        const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const target = normalize(artist);

        const hit = data.response.hits.find((h: any) => {
            const hitArtist = normalize(h.result.primary_artist.name);
            return hitArtist.includes(target) || target.includes(hitArtist);
        });

        return hit ? hit.result : data.response.hits[0]?.result || null;
    }

    async getAnnotations(songId: number): Promise<GeniusAnnotation[]> {
        const url = `https://api.genius.com/referents?song_id=${songId}&text_format=plain&per_page=50&access_token=${GENIUS_TOKEN}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
        if (!response.ok) return [];

        const data = await response.json();
        return data.response?.referents || [];
    }

    async getDataForTrack(track: Track): Promise<GeniusData | null> {
        const key = track.id;
        if (this.cache.has(key)) return this.cache.get(key)!;

        try {
            const artist = this.getArtist(track);
            const song = await this.searchTrack(track.title, artist);
            if (!song) {
                this.cache.set(key, null);
                return null;
            }

            const annotations = await this.getAnnotations(song.id);
            const result: GeniusData = { song, annotations };
            this.cache.set(key, result);
            return result;
        } catch {
            this.cache.set(key, null);
            return null;
        }
    }

    findAnnotationsForLine(lineText: string, annotations: GeniusAnnotation[]): GeniusAnnotation[] {
        if (!annotations.length || !lineText) return [];

        const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
        const normLine = normalize(lineText);
        const lineWords = new Set(normLine.split(' ').filter(w => w.length > 0));

        return annotations.filter(ref => {
            const normFrag = normalize(ref.fragment);
            if (normLine.includes(normFrag) || normFrag.includes(normLine)) return true;

            const fragWords = new Set(normFrag.split(' ').filter(w => w.length > 0));
            if (fragWords.size === 0 || lineWords.size === 0) return false;

            let matches = 0;
            fragWords.forEach(w => { if (lineWords.has(w)) matches++; });
            return matches / Math.min(fragWords.size, lineWords.size) > 0.6;
        });
    }

    clearCache(): void {
        this.cache.clear();
    }
}

export const geniusAPI = new GeniusAPI();
