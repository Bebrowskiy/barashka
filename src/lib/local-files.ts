import { db } from './db';
import type { Track, LocalTrack } from '../types';

const AUDIO_EXTENSIONS = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'wma', 'opus'];

function parseFileName(fileName: string): { title: string; artist: string } {
    const name = fileName.replace(/\.[^.]+$/, '');

    // Pattern: "Artist - Title"
    const dashMatch = name.match(/^(.+?)\s*-\s*(.+)$/);
    if (dashMatch) {
        return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
    }

    return { title: name, artist: '' };
}

function isAudioFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (AUDIO_EXTENSIONS.includes(ext)) return true;
    if (file.type.startsWith('audio/')) return true;
    return false;
}

// Blob URL cache
const blobUrlCache = new Map<string, string>();

export function getLocalBlobUrl(id: string, blob: Blob): string {
    const cached = blobUrlCache.get(id);
    if (cached) return cached;
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(id, url);
    return url;
}

export function revokeLocalBlobUrl(id: string): void {
    const url = blobUrlCache.get(id);
    if (url) {
        URL.revokeObjectURL(url);
        blobUrlCache.delete(id);
    }
}

export function localTrackToTrack(local: LocalTrack, blobUrl: string): Track {
    return {
        id: local.id,
        title: local.title,
        duration: local.duration,
        artist: local.artist || undefined,
        album: local.album ? {
            id: local.id,
            title: local.album,
        } : undefined,
        cover: local.cover || undefined,
        audioUrl: blobUrl,
        isLocal: true,
    };
}

export async function importLocalFiles(files: File[]): Promise<Track[]> {
    const tracks: Track[] = [];

    for (const file of files) {
        if (!isAudioFile(file)) continue;

        const local = await db.addLocalFile(file);
        const blob = local.fileBlob;
        const blobUrl = getLocalBlobUrl(local.id, blob);
        tracks.push(localTrackToTrack(local, blobUrl));
    }

    return tracks;
}

export async function getAllLocalTracks(): Promise<Track[]> {
    const locals = await db.getLocalFiles();
    const tracks: Track[] = [];

    for (const local of locals) {
        let blobUrl = blobUrlCache.get(local.id);
        if (!blobUrl) {
            const blob = await db.getLocalFileBlob(local.id);
            if (blob) {
                blobUrl = getLocalBlobUrl(local.id, blob);
            }
        }
        if (blobUrl) {
            tracks.push(localTrackToTrack(local, blobUrl));
        }
    }

    return tracks;
}

export async function resolveLocalTrack(id: string): Promise<Track | null> {
    let blobUrl = blobUrlCache.get(id);
    if (!blobUrl) {
        const blob = await db.getLocalFileBlob(id);
        if (blob) {
            blobUrl = getLocalBlobUrl(id, blob);
        }
    }
    if (!blobUrl) return null;

    const locals = await db.getLocalFiles();
    const local = locals.find(l => l.id === id);
    if (!local) return null;

    return localTrackToTrack(local, blobUrl);
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
