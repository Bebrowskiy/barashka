import type { Track } from '../types';
import { db } from './db';
import {
    profileSettings,
    themeSettings,
    qualitySettings,
    equalizerSettings,
    crossfadeSettings,
    replayGainSettings,
    audioEffectsSettings,
    audioEnhancementsSettings,
    discordRPCSettings,
    musicProviderSettings,
    jamendoSettings,
    downloadSettings,
    contentBlockingSettings,
    scrobbleSettings,
    lastFMSettings,
    listenBrainzSettings,
    malojaSettings,
    libreFmSettings,
} from './storage';

export interface SyncData {
    version: 2;
    exportDate: string;
    app: 'barashka';
    profile: {
        nickname: string;
        avatar: string;
        bio: string;
        color: string;
    };
    settings: {
        theme: 'light' | 'dark' | 'system';
        quality: string;
        musicProvider: string;
        equalizer: { enabled: boolean; bandCount: number; gains: number[]; preamp: number; preset: string | null };
        crossfade: { enabled: boolean; duration: number; curve: string; autoCrossfade: boolean };
        replayGain: { mode: string; preamp: number };
        audioEffects: { speed: number; preservePitch: boolean };
        audioEnhancements: { monoAudio: boolean; exponentialVolume: boolean };
        discordRPC: { enabled: boolean; showDetails: boolean; showArtist: boolean; showAlbum: boolean; showTimestamp: boolean; showButtons: boolean };
        jamendo: { clientId: string; audioFormat: string };
        download: { quality: string; container: string; convertToMp3: boolean };
        scrobblePercentage: number;
        lastFM: { enabled: boolean; username: string; apiKey: string; apiSecret: string };
        listenBrainz: { enabled: boolean; token: string; customUrl: string };
        maloja: { enabled: boolean; url: string; apiKey: string };
        libreFm: { enabled: boolean; username: string };
    };
    likedTracks: Track[];
    likedAlbums: { id: string; title: string; cover?: string; artist?: string }[];
    likedArtists: { id: string; name: string; avatar?: string }[];
    playlists: { id: string; title: string; description?: string; cover?: string; tracks: Track[] }[];
    history: Track[];
    contentBlocking: { blockedTracks: string[]; blockedAlbums: string[]; blockedArtists: string[] };
    queue: {
        queue: Track[];
        shuffledQueue: Track[];
        currentQueueIndex: number;
        shuffleActive: boolean;
        repeatMode: number;
    };
}

function minifyTrack(t: Track): any {
    return {
        id: t.id,
        title: t.title,
        duration: t.duration,
        artist: t.artist,
        artists: t.artists,
        album: t.album ? { id: t.album.id, title: t.album.title, cover: t.album.cover } : undefined,
        cover: t.cover,
    };
}

function minifyAlbum(a: any): any {
    return { id: a.id, title: a.title, cover: a.cover, artist: a.artist?.name || a.artist };
}

function minifyArtist(a: any): any {
    return { id: a.id, name: a.name, avatar: a.avatar || a.picture };
}

async function imageToBase64(url: string): Promise<string> {
    if (!url || url.startsWith('data:')) return url;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return '';
    }
}

function getHistoryWithPlayCount(history: Track[]): Track[] {
    return history.map((t: any) => ({
        ...minifyTrack(t),
        play_count: t.play_count || 1,
        timestamp: t.timestamp,
    }));
}

export async function exportSyncData(): Promise<SyncData> {
    const [likedTracks, likedAlbums, likedArtists, history] = await Promise.all([
        db.getFavorites('track'),
        db.getFavorites('album'),
        db.getFavorites('artist'),
        db.getHistory(10000),
    ]);

    const playlists = await db.getPlaylists();
    const profile = profileSettings.get();

    let avatarBase64 = profile.avatar;
    if (profile.avatar && profile.avatar.startsWith('http')) {
        avatarBase64 = await imageToBase64(profile.avatar);
    }

    const queueRaw = localStorage.getItem('barashka-queue');
    let queue = { queue: [] as Track[], shuffledQueue: [] as Track[], currentQueueIndex: -1, shuffleActive: false, repeatMode: 0 };
    if (queueRaw) {
        try {
            const parsed = JSON.parse(queueRaw);
            queue = {
                queue: (parsed.queue || []).map(minifyTrack),
                shuffledQueue: (parsed.shuffledQueue || []).map(minifyTrack),
                currentQueueIndex: parsed.currentQueueIndex ?? -1,
                shuffleActive: parsed.shuffleActive || false,
                repeatMode: parsed.repeatMode ?? 0,
            };
        } catch {}
    }

    return {
        version: 2,
        exportDate: new Date().toISOString(),
        app: 'barashka',
        profile: {
            nickname: profile.nickname,
            avatar: avatarBase64,
            bio: profile.bio,
            color: profile.color,
        },
        settings: {
            theme: themeSettings.get(),
            quality: qualitySettings.get(),
            musicProvider: musicProviderSettings.get(),
            equalizer: equalizerSettings.get(),
            crossfade: crossfadeSettings.get(),
            replayGain: replayGainSettings.get(),
            audioEffects: audioEffectsSettings.get(),
            audioEnhancements: audioEnhancementsSettings.get(),
            discordRPC: discordRPCSettings.get(),
            jamendo: jamendoSettings.get(),
            download: downloadSettings.get(),
            scrobblePercentage: scrobbleSettings.get().percentage,
            lastFM: lastFMSettings.get(),
            listenBrainz: listenBrainzSettings.get(),
            maloja: malojaSettings.get(),
            libreFm: libreFmSettings.get(),
        },
        likedTracks: likedTracks.map(minifyTrack),
        likedAlbums: likedAlbums.map(minifyAlbum),
        likedArtists: likedArtists.map(minifyArtist),
        playlists: playlists.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            cover: p.cover,
            tracks: (p.tracks || []).map(minifyTrack),
        })),
        history: getHistoryWithPlayCount(history),
        contentBlocking: contentBlockingSettings.get(),
        queue,
    };
}

export async function importSyncData(data: SyncData, mode: 'merge' | 'replace' = 'merge'): Promise<{
    imported: number;
    skipped: number;
    breakdown: { profile: boolean; settings: boolean; tracks: number; albums: number; artists: number; playlists: number; history: number };
}> {
    let imported = 0;
    let skipped = 0;
    const breakdown = { profile: false, settings: false, tracks: 0, albums: 0, artists: 0, playlists: 0, history: 0 };

    // Profile
    if (data.profile) {
        if (mode === 'replace' || !profileSettings.get().nickname || profileSettings.get().nickname === 'Barashka User') {
            profileSettings.set({
                nickname: data.profile.nickname || 'Barashka User',
                avatar: data.profile.avatar || '',
                bio: data.profile.bio || '',
                color: data.profile.color || '#6366f1',
            });
            breakdown.profile = true;
            imported++;
        }
    }

    // Settings
    if (data.settings) {
        if (mode === 'replace') {
            themeSettings.set(data.settings.theme);
            qualitySettings.set(data.settings.quality as any);
            musicProviderSettings.set(data.settings.musicProvider as any);
            equalizerSettings.set(data.settings.equalizer as any);
            crossfadeSettings.set(data.settings.crossfade as any);
            replayGainSettings.set(data.settings.replayGain as any);
            audioEffectsSettings.set(data.settings.audioEffects as any);
            audioEnhancementsSettings.set(data.settings.audioEnhancements as any);
            discordRPCSettings.set(data.settings.discordRPC as any);
            jamendoSettings.set(data.settings.jamendo as any);
            downloadSettings.set(data.settings.download as any);
            scrobbleSettings.set({ percentage: data.settings.scrobblePercentage });
            lastFMSettings.set(data.settings.lastFM as any);
            listenBrainzSettings.set(data.settings.listenBrainz as any);
            malojaSettings.set(data.settings.maloja as any);
            libreFmSettings.set(data.settings.libreFm as any);
            breakdown.settings = true;
            imported++;
        }
    }

    // Liked tracks
    for (const track of data.likedTracks) {
        try {
            const isFav = await db.isFavorite('track', track.id);
            if (!isFav) {
                await db.toggleFavorite('track', track);
                breakdown.tracks++;
                imported++;
            } else {
                skipped++;
            }
        } catch {
            skipped++;
        }
    }

    // Liked albums
    for (const album of data.likedAlbums) {
        try {
            const isFav = await db.isFavorite('album', album.id);
            if (!isFav) {
                await db.toggleFavorite('album', album as any);
                breakdown.albums++;
                imported++;
            } else {
                skipped++;
            }
        } catch {
            skipped++;
        }
    }

    // Liked artists
    for (const artist of data.likedArtists) {
        try {
            const isFav = await db.isFavorite('artist', artist.id);
            if (!isFav) {
                await db.toggleFavorite('artist', artist as any);
                breakdown.artists++;
                imported++;
            } else {
                skipped++;
            }
        } catch {
            skipped++;
        }
    }

    // Playlists — create only if not already existing by title
    const existingPlaylists = await db.getPlaylists();
    const existingTitles = new Set(existingPlaylists.map(p => p.title.toLowerCase()));

    for (const playlist of data.playlists) {
        try {
            if (existingTitles.has(playlist.title.toLowerCase())) {
                skipped++;
                continue;
            }
            if (playlist.tracks.length > 0 || mode === 'replace') {
                await db.createPlaylist({
                    title: playlist.title,
                    description: playlist.description || '',
                    cover: playlist.cover,
                    tracks: playlist.tracks,
                } as any);
                breakdown.playlists++;
                imported++;
            }
        } catch {
            skipped++;
        }
    }

    // History — merge by adding play counts
    if (data.history && mode === 'replace') {
        for (const track of data.history) {
            try {
                await db.addToHistory(track);
                breakdown.history++;
                imported++;
            } catch {
                skipped++;
            }
        }
    }

    // Content blocking
    if (data.contentBlocking && mode === 'replace') {
        contentBlockingSettings.set(data.contentBlocking);
    }

    // Queue
    if (data.queue && mode === 'replace') {
        localStorage.setItem('barashka-queue', JSON.stringify(data.queue));
    }

    return { imported, skipped, breakdown };
}

export function encodeSyncData(data: SyncData): string {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSyncData(encoded: string): SyncData | null {
    try {
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);
        if (data.app === 'barashka' && (data.version === 1 || data.version === 2)) return data;
        return null;
    } catch {
        return null;
    }
}

export function getDataSize(data: SyncData): number {
    return new Blob([JSON.stringify(data)]).size;
}

export function formatDataSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
