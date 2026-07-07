import { type QualityPreset, type MusicProvider } from '../types';

interface StorageOptions<T> {
    key: string;
    defaultValue: T;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
}

function createSetting<T>(options: StorageOptions<T>) {
    const { key, defaultValue, serialize, deserialize } = options;

    return {
        get(): T {
            try {
                const raw = localStorage.getItem(key);
                if (raw === null) return defaultValue;
                return deserialize ? deserialize(raw) : JSON.parse(raw);
            } catch {
                return defaultValue;
            }
        },
        set(value: T): void {
            const serialized = serialize ? serialize(value) : JSON.stringify(value);
            localStorage.setItem(key, serialized);
        },
        reset(): void {
            localStorage.removeItem(key);
        },
    };
}

// Audio settings
export const volumeSettings = createSetting<number>({
    key: 'barashka-volume',
    defaultValue: 0.7,
});

export const audioEnhancementsSettings = createSetting<{
    monoAudio: boolean;
    exponentialVolume: boolean;
}>({
    key: 'barashka-audio-enhancements',
    defaultValue: { monoAudio: false, exponentialVolume: false },
});

export const qualitySettings = createSetting<QualityPreset>({
    key: 'barashka-quality',
    defaultValue: 'HI_RES_LOSSLESS' as QualityPreset,
});

export const replayGainSettings = createSetting<{ mode: 'off' | 'track' | 'album'; preamp: number }>({
    key: 'barashka-replay-gain',
    defaultValue: { mode: 'track', preamp: 0 },
});

export const equalizerSettings = createSetting<{
    enabled: boolean;
    bandCount: number;
    gains: number[];
    preamp: number;
    preset: string | null;
}>({
    key: 'barashka-equalizer',
    defaultValue: { enabled: false, bandCount: 10, gains: [], preamp: 0, preset: null },
});

export const crossfadeSettings = createSetting<{
    enabled: boolean;
    duration: number;
    curve: 'linear' | 'logarithmic' | 'exponential' | 'sine' | 'cosine';
    autoCrossfade: boolean;
}>({
    key: 'barashka-crossfade',
    defaultValue: { enabled: false, duration: 5000, curve: 'logarithmic', autoCrossfade: false },
});

export const audioEffectsSettings = createSetting<{
    speed: number;
    preservePitch: boolean;
}>({
    key: 'barashka-audio-effects',
    defaultValue: { speed: 1, preservePitch: true },
});

// UI settings
export const themeSettings = createSetting<'light' | 'dark' | 'system'>({
    key: 'barashka-theme',
    defaultValue: 'system',
});

export const cardSettings = createSetting<{
    showQualityBadge: boolean;
    showTrackDates: boolean;
    coverArtSize: number;
}>({
    key: 'barashka-card-settings',
    defaultValue: { showQualityBadge: true, showTrackDates: false, coverArtSize: 320 },
});

export const sidebarSettings = createSetting<{
    collapsed: boolean;
    width: number;
}>({
    key: 'barashka-sidebar',
    defaultValue: { collapsed: false, width: 280 },
});

// Music provider
export const musicProviderSettings = createSetting<MusicProvider>({
    key: 'barashka-music-provider',
    defaultValue: 'youtube' as MusicProvider,
});

// Jamendo settings
export const jamendoSettings = createSetting<{
    clientId: string;
    audioFormat: 'mp31' | 'mp32' | 'ogg' | 'flac';
}>({
    key: 'barashka-jamendo',
    defaultValue: {
        clientId: '',
        audioFormat: 'mp32',
    },
});

// Download settings
export const downloadSettings = createSetting<{
    quality: QualityPreset;
    container: 'mp3' | 'flac' | 'alac';
    convertToMp3: boolean;
}>({
    key: 'barashka-downloads',
    defaultValue: { quality: 'HI_RES_LOSSLESS' as QualityPreset, container: 'flac', convertToMp3: false },
});

// Content blocking
export const contentBlockingSettings = createSetting<{
    blockedTracks: string[];
    blockedAlbums: string[];
    blockedArtists: string[];
}>({
    key: 'barashka-content-blocking',
    defaultValue: { blockedTracks: [], blockedAlbums: [], blockedArtists: [] },
});

export function shouldHideTrack(track: { id: string; artist?: string; album?: { id?: string } }): boolean {
    const blocking = contentBlockingSettings.get();
    if (blocking.blockedTracks.includes(track.id)) return true;
    if (blocking.blockedAlbums.includes(track.album?.id || '')) return true;
    if (track.artist && blocking.blockedArtists.includes(track.artist)) return true;
    return false;
}

export function blockTrack(track: { id: string; artist?: string; album?: { id?: string } }): void {
    const blocking = contentBlockingSettings.get();
    if (!blocking.blockedTracks.includes(track.id)) {
        blocking.blockedTracks.push(track.id);
        contentBlockingSettings.set(blocking);
    }
}

export function blockArtist(artistName: string): void {
    const blocking = contentBlockingSettings.get();
    if (artistName && !blocking.blockedArtists.includes(artistName)) {
        blocking.blockedArtists.push(artistName);
        contentBlockingSettings.set(blocking);
    }
}

export function unblockTrack(trackId: string): void {
    const blocking = contentBlockingSettings.get();
    blocking.blockedTracks = blocking.blockedTracks.filter(id => id !== trackId);
    contentBlockingSettings.set(blocking);
}

export function unblockArtist(artistName: string): void {
    const blocking = contentBlockingSettings.get();
    blocking.blockedArtists = blocking.blockedArtists.filter(name => name !== artistName);
    contentBlockingSettings.set(blocking);
}

// Queue state
export const queueSettings = createSetting<{
    queue: any[];
    shuffledQueue: any[];
    originalQueueBeforeShuffle: any[];
    currentQueueIndex: number;
    shuffleActive: boolean;
    repeatMode: number;
}>({
    key: 'barashka-queue',
    defaultValue: {
        queue: [],
        shuffledQueue: [],
        originalQueueBeforeShuffle: [],
        currentQueueIndex: -1,
        shuffleActive: false,
        repeatMode: 0,
    },
});

// Scrobbling
export const scrobbleSettings = createSetting<{
    percentage: number;
}>({
    key: 'barashka-scrobble',
    defaultValue: { percentage: 50 },
});

export const lastFMSettings = createSetting<{
    enabled: boolean;
    username: string;
    token: string;
    sessionKey: string;
    apiKey: string;
    apiSecret: string;
}>({
    key: 'barashka-lastfm',
    defaultValue: { enabled: false, username: '', token: '', sessionKey: '', apiKey: '', apiSecret: '' },
});

export const listenBrainzSettings = createSetting<{
    enabled: boolean;
    token: string;
    customUrl: string;
}>({
    key: 'barashka-listenbrainz',
    defaultValue: { enabled: false, token: '', customUrl: '' },
});

export const malojaSettings = createSetting<{
    enabled: boolean;
    url: string;
    apiKey: string;
}>({
    key: 'barashka-maloja',
    defaultValue: { enabled: false, url: '', apiKey: '' },
});

export const libreFmSettings = createSetting<{
    enabled: boolean;
    username: string;
    sessionKey: string;
}>({
    key: 'barashka-librefm',
    defaultValue: { enabled: false, username: '', sessionKey: '' },
});

// Profile
export const profileSettings = createSetting<{
    nickname: string;
    avatar: string;
    bio: string;
    color: string;
}>({
    key: 'barashka-profile',
    defaultValue: { nickname: 'Barashka User', avatar: '', bio: '', color: '#6366f1' },
});

// Discord RPC
export const discordRPCSettings = createSetting<{
    enabled: boolean;
    showDetails: boolean;
    showArtist: boolean;
    showAlbum: boolean;
    showTimestamp: boolean;
    showButtons: boolean;
}>({
    key: 'barashka-discord-rpc',
    defaultValue: {
        enabled: false,
        showDetails: true,
        showArtist: true,
        showAlbum: true,
        showTimestamp: true,
        showButtons: true,
    },
});
export const apiSettings = createSetting<{ instances: { url: string; version?: string }[] }>({
    key: 'barashka-api-instances',
    defaultValue: { instances: [] },
});
