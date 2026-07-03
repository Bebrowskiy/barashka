import { malojaSettings, scrobbleSettings } from './storage';
import type { Track } from '../types';

export class MalojaScrobbler {
    private currentTrack: Track | null = null;
    private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;
    private hasScrobbled = false;
    private isScrobbling = false;

    private getApiUrl(): string {
        const customUrl = malojaSettings.get().url;
        return customUrl ? customUrl.replace(/\/$/, '') : '';
    }

    isEnabled(): boolean {
        const settings = malojaSettings.get();
        return settings.enabled && !!settings.apiKey && !!this.getApiUrl();
    }

    private getApiKey(): string | null {
        return malojaSettings.get().apiKey || null;
    }

    private _getScrobbleArtist(track: Track): string {
        if (!track) return 'Unknown Artist';

        let artistName = 'Unknown Artist';

        if (track.artist) {
            artistName = typeof track.artist === 'string' ? track.artist : (track.artist as any)?.name || 'Unknown Artist';
        } else if (track.artists && track.artists.length > 0) {
            const first = track.artists[0];
            artistName = typeof first === 'string' ? first : first.name || 'Unknown Artist';
        }

        if (typeof artistName !== 'string') return 'Unknown Artist';

        artistName = artistName
            .split(/\s*[&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+/i)[0]
            .trim();

        return artistName || 'Unknown Artist';
    }

    async submitScrobble(track: Track, timestamp?: number): Promise<void> {
        if (!this.isEnabled()) return;

        const apiUrl = this.getApiUrl();
        const apiKey = this.getApiKey();

        if (!apiUrl || !apiKey) return;

        const artist = this._getScrobbleArtist(track);
        const title = track.title;

        const scrobbleData: Record<string, string | number> = {
            artist: artist,
            title: title,
            key: apiKey,
        };

        if (track.album?.title) {
            scrobbleData.album = track.album.title;
        }

        if (track.duration) {
            scrobbleData.duration = Math.floor(track.duration);
        }

        if (track.trackNumber) {
            scrobbleData.track_number = track.trackNumber;
        }

        if (timestamp) {
            scrobbleData.time = timestamp;
        }

        let response = await fetch(`${apiUrl}/apis/mlj_1/newscrobble`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(scrobbleData as Record<string, string>),
        });

        if (!response.ok) {
            response = await fetch(`${apiUrl}/apis/native/newscrobble`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(scrobbleData as Record<string, string>),
            });
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Maloja API Error ${response.status}: ${text}`);
        }
    }

    async updateNowPlaying(track: Track): Promise<void> {
        if (!this.isEnabled()) return;

        this.currentTrack = track;
        if (!this.isScrobbling) {
            this.hasScrobbled = false;
        }
        this.clearScrobbleTimer();

        const percentage = scrobbleSettings.get().percentage;
        const scrobbleThreshold = Math.min(track.duration * (percentage / 100), 240);
        this.scheduleScrobble(scrobbleThreshold * 1000);
    }

    private scheduleScrobble(delay: number): void {
        this.clearScrobbleTimer();
        this.scrobbleTimer = setTimeout(() => {
            this.scrobbleCurrentTrack();
        }, delay);
    }

    private clearScrobbleTimer(): void {
        if (this.scrobbleTimer) {
            clearTimeout(this.scrobbleTimer);
            this.scrobbleTimer = null;
        }
    }

    async scrobbleCurrentTrack(): Promise<void> {
        if (!this.isEnabled() || !this.currentTrack || this.hasScrobbled) return;

        this.isScrobbling = true;

        try {
            const timestamp = Math.floor(Date.now() / 1000);
            await this.submitScrobble(this.currentTrack, timestamp);
            this.hasScrobbled = true;
        } finally {
            this.isScrobbling = false;
        }
    }

    onTrackChange(track: Track): void {
        this.updateNowPlaying(track);
    }

    onPlaybackStop(): void {
        this.clearScrobbleTimer();
    }

    disconnect(): void {
        this.clearScrobbleTimer();
        this.currentTrack = null;
    }
}
