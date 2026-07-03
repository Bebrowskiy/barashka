import md5 from './md5';
import { lastFMSettings, scrobbleSettings } from './storage';
import type { Track } from '../types';

const DEFAULT_API_KEY = '85214f5abbc730e78770f27784b9bdf7';
const DEFAULT_API_SECRET = '2c2c37fd86739191860db810dd063292';
const API_URL = 'https://ws.audioscrobbler.com/2.0/';

export class LastFMScrobbler {
    private apiKey: string;
    private apiSecret: string;
    private currentTrack: Track | null = null;
    private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;
    private hasScrobbled = false;
    private isScrobbling = false;

    constructor() {
        const settings = lastFMSettings.get();
        this.apiKey = settings.apiKey || DEFAULT_API_KEY;
        this.apiSecret = settings.apiSecret || DEFAULT_API_SECRET;
    }

    private get sessionKey(): string | null {
        const key = lastFMSettings.get().sessionKey;
        return key || null;
    }

    private get username(): string | null {
        const name = lastFMSettings.get().username;
        return name || null;
    }

    isAuthenticated(): boolean {
        return !!this.sessionKey && lastFMSettings.get().enabled;
    }

    _getScrobbleArtist(track: Track): string {
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

    private generateSignature(params: Record<string, any>): string {
        const filteredParams = { ...params };
        delete filteredParams.format;
        delete filteredParams.callback;

        const sortedKeys = Object.keys(filteredParams).sort();
        const signatureString = sortedKeys.map((key) => `${key}${filteredParams[key]}`).join('') + this.apiSecret;

        return md5(signatureString);
    }

    private async makeRequest(method: string, params: Record<string, any> = {}, requiresAuth = false): Promise<any> {
        const requestParams: Record<string, any> = {
            method,
            api_key: this.apiKey,
            ...params,
        };

        if (requiresAuth && this.sessionKey) {
            requestParams.sk = this.sessionKey;
        }

        const signature = this.generateSignature(requestParams);

        const formData = new URLSearchParams({
            ...requestParams,
            api_sig: signature,
            format: 'json',
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.message || 'Last.fm API error');
        }

        return data;
    }

    async getAuthUrl(): Promise<{ token: string; url: string }> {
        const data = await this.makeRequest('auth.getToken');
        const token = data.token;

        return {
            token,
            url: `https://www.last.fm/api/auth/?api_key=${this.apiKey}&token=${token}`,
        };
    }

    async completeAuthentication(token: string): Promise<{ success: boolean; username: string }> {
        const data = await this.makeRequest('auth.getSession', { token });

        if (data.session) {
            lastFMSettings.set({
                ...lastFMSettings.get(),
                sessionKey: data.session.key,
                username: data.session.name,
                enabled: true,
            });
            return {
                success: true,
                username: data.session.name,
            };
        }

        throw new Error('No session returned');
    }

    async updateNowPlaying(track: Track): Promise<void> {
        if (!this.isAuthenticated()) return;

        this.currentTrack = track;
        if (!this.isScrobbling) {
            this.hasScrobbled = false;
        }
        this.clearScrobbleTimer();

        const scrobbleTitle = track.title;
        const params: Record<string, any> = {
            artist: this._getScrobbleArtist(track),
            track: scrobbleTitle,
        };

        if (track.album?.title) {
            params.album = track.album.title;
        }

        if (track.duration) {
            params.duration = Math.floor(track.duration);
        }

        if (track.trackNumber) {
            params.trackNumber = track.trackNumber;
        }

        await this.makeRequest('track.updateNowPlaying', params, true);

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
        if (!this.isAuthenticated() || !this.currentTrack || this.hasScrobbled) return;

        this.isScrobbling = true;

        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const scrobbleTitle = this.currentTrack.title;

            const params: Record<string, any> = {
                artist: this._getScrobbleArtist(this.currentTrack),
                track: scrobbleTitle,
                timestamp: timestamp,
            };

            if (this.currentTrack.album?.title) {
                params.album = this.currentTrack.album.title;
            }

            if (this.currentTrack.duration) {
                params.duration = Math.floor(this.currentTrack.duration);
            }

            if (this.currentTrack.trackNumber) {
                params.trackNumber = this.currentTrack.trackNumber;
            }

            await this.makeRequest('track.scrobble', params, true);

            this.hasScrobbled = true;
        } finally {
            this.isScrobbling = false;
        }
    }

    async loveTrack(track: Track): Promise<void> {
        if (!this.isAuthenticated()) return;

        const params = {
            artist: this._getScrobbleArtist(track),
            track: track.title,
        };

        await this.makeRequest('track.love', params, true);
    }

    onTrackChange(track: Track): void {
        if (!this.isAuthenticated()) return;
        this.updateNowPlaying(track);
    }

    onPlaybackStop(): void {
        this.clearScrobbleTimer();
    }

    disconnect(): void {
        lastFMSettings.set({
            ...lastFMSettings.get(),
            sessionKey: '',
            username: '',
            enabled: false,
        });
        this.clearScrobbleTimer();
        this.currentTrack = null;
    }
}
