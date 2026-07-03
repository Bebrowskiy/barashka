import { listenBrainzSettings, scrobbleSettings } from './storage';
import type { Track } from '../types';

const DEFAULT_API_URL = 'https://api.listenbrainz.org/1';

export class ListenBrainzScrobbler {
    private currentTrack: Track | null = null;
    private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;
    private hasScrobbled = false;
    private isScrobbling = false;

    private getApiUrl(): string {
        const customUrl = listenBrainzSettings.get().customUrl;
        return customUrl || DEFAULT_API_URL;
    }

    isEnabled(): boolean {
        const settings = listenBrainzSettings.get();
        return settings.enabled && !!settings.token;
    }

    private getToken(): string | null {
        return listenBrainzSettings.get().token || null;
    }

    private _getMetadata(track: Track): Record<string, any> | null {
        if (!track) return null;

        let artistName = 'Unknown Artist';

        if (track.artist) {
            artistName = typeof track.artist === 'string' ? track.artist : (track.artist as any)?.name || 'Unknown Artist';
        } else if (track.artists && track.artists.length > 0) {
            const first = track.artists[0];
            artistName = typeof first === 'string' ? first : first.name || 'Unknown Artist';
        }

        if (typeof artistName === 'string') {
            artistName = artistName
                .split(/\s*[&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+/i)[0]
                .trim();
        }

        const payload: Record<string, any> = {
            artist_name: artistName,
            track_name: track.title,
            additional_info: {
                submission_client: 'Barashka',
                submission_client_version: '1.0.0',
            },
        };

        if (track.album?.title) {
            payload.release_name = track.album.title;
        }

        if (track.duration) {
            payload.additional_info.duration = Math.floor(track.duration);
        }

        if (track.trackNumber) {
            payload.additional_info.track_number = track.trackNumber;
        }

        if (track.isLocal) {
            payload.additional_info.is_local = true;
        }

        return payload;
    }

    async submitListen(listenType: string, track: Track, timestamp?: number): Promise<void> {
        if (!this.isEnabled()) return;

        const metadata = this._getMetadata(track);
        if (!metadata) return;

        const payload: Record<string, any>[] = [
            {
                track_metadata: metadata,
            },
        ];

        if (timestamp) {
            payload[0].listened_at = timestamp;
        }

        const body = {
            listen_type: listenType,
            payload: payload,
        };

        const apiUrl = this.getApiUrl();
        const token = this.getToken();

        const response = await fetch(`${apiUrl}/submit-listens`, {
            method: 'POST',
            headers: {
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`ListenBrainz API Error ${response.status}: ${text}`);
        }
    }

    async updateNowPlaying(track: Track): Promise<void> {
        if (!this.isEnabled()) return;

        this.currentTrack = track;
        if (!this.isScrobbling) {
            this.hasScrobbled = false;
        }
        this.clearScrobbleTimer();

        await this.submitListen('playing_now', track);

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
            await this.submitListen('single', this.currentTrack, timestamp);
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
