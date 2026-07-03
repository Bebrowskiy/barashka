import type { Track, Album, Artist, Playlist } from '../types';
import { db } from './db';

export interface SyncData {
    version: 1;
    exportDate: string;
    app: 'barashka';
    likedTracks: Track[];
    likedAlbums: { id: string; title: string; cover?: string; artist?: string }[];
    likedArtists: { id: string; name: string; avatar?: string }[];
    playlists: { id: string; title: string; tracks: Track[] }[];
    history: Track[];
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

export async function exportSyncData(): Promise<SyncData> {
    const [likedTracks, likedAlbums, likedArtists, history] = await Promise.all([
        db.getFavorites('track'),
        db.getFavorites('album'),
        db.getFavorites('artist'),
        db.getHistory(500),
    ]);

    const playlists = await db.getPlaylists();

    return {
        version: 1,
        exportDate: new Date().toISOString(),
        app: 'barashka',
        likedTracks: likedTracks.map(minifyTrack),
        likedAlbums: likedAlbums.map(minifyAlbum),
        likedArtists: likedArtists.map(minifyArtist),
        playlists: playlists.map((p: any) => ({
            id: p.id,
            title: p.title,
            tracks: (p.tracks || []).map(minifyTrack),
        })),
        history: history.map(minifyTrack),
    };
}

export async function importSyncData(data: SyncData, mode: 'merge' | 'replace' = 'merge'): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const track of data.likedTracks) {
        try {
            await db.toggleFavorite('track', track);
            imported++;
        } catch {
            skipped++;
        }
    }

    for (const album of data.likedAlbums) {
        try {
            await db.toggleFavorite('album', album as any);
            imported++;
        } catch {
            skipped++;
        }
    }

    for (const artist of data.likedArtists) {
        try {
            await db.toggleFavorite('artist', artist as any);
            imported++;
        } catch {
            skipped++;
        }
    }

    for (const playlist of data.playlists) {
        try {
            if (playlist.tracks.length > 0) {
                await db.createPlaylist({ title: playlist.title, tracks: playlist.tracks } as any);
                imported++;
            }
        } catch {
            skipped++;
        }
    }

    return { imported, skipped };
}

export function encodeSyncData(data: SyncData): string {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSyncData(encoded: string): SyncData | null {
    try {
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);
        if (data.app === 'barashka' && data.version === 1) return data;
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
