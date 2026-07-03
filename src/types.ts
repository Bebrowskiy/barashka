export const REPEAT_MODE = {
    OFF: 0,
    ONE: 1,
    ALL: 2,
} as const;

export type RepeatMode = typeof REPEAT_MODE[keyof typeof REPEAT_MODE];

export const MUSIC_PROVIDERS = {
    YOUTUBE: 'youtube',
} as const;

export type MusicProvider = typeof MUSIC_PROVIDERS[keyof typeof MUSIC_PROVIDERS];

export const QUALITY_PRESETS = {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    HI_RES_LOSSLESS: 'HI_RES_LOSSLESS',
    LOSSLESS: 'LOSSLESS',
    MP3_320: 'MP3_320',
} as const;

export type QualityPreset = typeof QUALITY_PRESETS[keyof typeof QUALITY_PRESETS];

export interface Track {
    id: string;
    title: string;
    duration: number;
    artists?: Artist[];
    artist?: string;
    album?: Album;
    cover?: string;
    audioUrl?: string;
    remoteUrl?: string;
    isLocal?: boolean;
    file?: File;
    isTracker?: boolean;
    isUnavailable?: boolean;
    mixes?: Record<string, unknown>;
    trackNumber?: number;
    discNumber?: number;
    releaseDate?: string;
    copyright?: string;
    isrc?: string;
}

export interface Album {
    id: string;
    title: string;
    artist?: Artist;
    cover?: string | number;
    videoCover?: string;
    releaseDate?: string;
    trackCount?: number;
    duration?: number;
    explicit?: boolean;
    type?: string;
    year?: number;
}

export interface Artist {
    id: string;
    name: string;
    avatar?: string | number;
    picture?: string | number;
    monthlyListeners?: string;
    verified?: boolean;
    bio?: string;
}

export interface Playlist {
    id: string;
    title: string;
    creator?: string;
    description?: string;
    cover?: string;
    trackCount?: number;
    tracks?: Track[];
    isPublic?: boolean;
    createdAt?: string;
    duration?: number;
}

export interface Mix {
    id: string;
    title: string;
    subtitle?: string;
    cover?: string;
    tracks?: Track[];
}

export interface SearchResult {
    items: Track[];
    limit: number;
    offset: number;
    totalNumberOfItems: number;
}

export interface StreamUrl {
    url: string;
    manifest?: string;
}

export interface ReplayGainValues {
    trackReplayGain?: number;
    trackPeakAmplitude?: number;
    albumReplayGain?: number;
    albumPeakAmplitude?: number;
}
