import type { Track } from '../types';

const LRCLIB_BASE = 'https://lrclib.net/api';

interface LrcLibResponse {
    id: number;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string;
    syncedLyrics: string;
}

export interface LyricLine {
    time: number;
    text: string;
}

export interface LyricsData {
    lines: LyricLine[];
    plainText: string;
    source: string;
}

class LyricsAPI {
    private cache = new Map<string, LyricsData | null>();

    private makeCacheKey(track: Track): string {
        return `${track.artist || ''}::${track.title || ''}`.toLowerCase();
    }

    parseLrc(lrc: string): LyricLine[] {
        const lines: LyricLine[] = [];
        const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/g;

        for (const line of lrc.split('\n')) {
            let match;
            while ((match = regex.exec(line)) !== null) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const ms = parseInt(match[3].padEnd(3, '0'), 10);
                const time = min * 60 + sec + ms / 1000;
                const text = match[4].trim();
                if (text) {
                    lines.push({ time, text });
                }
            }
        }

        return lines.sort((a, b) => a.time - b.time);
    }

    async fetchLyrics(track: Track, options: { signal?: AbortSignal } = {}): Promise<LyricsData | null> {
        const cacheKey = this.makeCacheKey(track);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const artist = track.artist || track.artists?.map(a => a.name).join(', ') || '';
        const title = track.title || '';
        if (!artist || !title) return null;

        // Try synced lyrics first
        try {
            const params = new URLSearchParams({
                track_name: title,
                artist_name: artist,
            });
            if (track.album?.title) params.set('album_name', track.album.title);
            if (track.duration) params.set('duration', String(Math.round(track.duration)));

            const response = await fetch(`${LRCLIB_BASE}/get?${params}`, {
                headers: { 'User-Agent': 'Barashka/1.0' },
                signal: options.signal,
            });

            if (response.ok) {
                const data: LrcLibResponse = await response.json();
                const lines = data.syncedLyrics ? this.parseLrc(data.syncedLyrics) : [];

                const result: LyricsData = {
                    lines,
                    plainText: data.plainLyrics || '',
                    source: 'lrclib',
                };

                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
        }

        // Fallback: search by title
        try {
            const params = new URLSearchParams({ q: title });
            const response = await fetch(`${LRCLIB_BASE}/search?${params}`, {
                headers: { 'User-Agent': 'Barashka/1.0' },
                signal: options.signal,
            });

            if (response.ok) {
                const results: LrcLibResponse[] = await response.json();
                // Find best match
                const match = results.find(r =>
                    r.artistName.toLowerCase() === artist.toLowerCase() ||
                    r.artistName.toLowerCase().includes(artist.toLowerCase()) ||
                    artist.toLowerCase().includes(r.artistName.toLowerCase())
                ) || results[0];

                if (match) {
                    const lines = match.syncedLyrics ? this.parseLrc(match.syncedLyrics) : [];
                    const result: LyricsData = {
                        lines,
                        plainText: match.plainLyrics || '',
                        source: 'lrclib',
                    };
                    this.cache.set(cacheKey, result);
                    return result;
                }
            }
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
        }

        this.cache.set(cacheKey, null);
        return null;
    }

    clearCache(): void {
        this.cache.clear();
    }
}

export const lyricsAPI = new LyricsAPI();
