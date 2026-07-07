import { type Track, type Album, type Artist, type Playlist } from '../types';

const DB_NAME = 'BarashkaDB';
const DB_VERSION = 12;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('favorites_tracks')) {
                const store = db.createObjectStore('favorites_tracks', { keyPath: 'id' });
                store.createIndex('addedAt', 'addedAt', { unique: false });
            }
            if (!db.objectStoreNames.contains('favorites_albums')) {
                const store = db.createObjectStore('favorites_albums', { keyPath: 'id' });
                store.createIndex('addedAt', 'addedAt', { unique: false });
            }
            if (!db.objectStoreNames.contains('favorites_artists')) {
                const store = db.createObjectStore('favorites_artists', { keyPath: 'id' });
                store.createIndex('addedAt', 'addedAt', { unique: false });
            }
            if (!db.objectStoreNames.contains('history_tracks')) {
                const store = db.createObjectStore('history_tracks', { keyPath: 'timestamp' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains('user_playlists')) {
                const store = db.createObjectStore('user_playlists', { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains('downloads')) {
                const store = db.createObjectStore('downloads', { keyPath: 'id' });
                store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
            }
            if (!db.objectStoreNames.contains('local_files')) {
                const store = db.createObjectStore('local_files', { keyPath: 'id' });
                store.createIndex('addedAt', 'addedAt', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

class MusicDatabase {
    async addToHistory(track: Track): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('history_tracks', 'readwrite');
        const store = tx.objectStore('history_tracks');

        // Check if track already exists
        const existing = await new Promise<any | undefined>((resolve) => {
            const index = store.index('timestamp');
            const cursor = index.openCursor();
            cursor.onsuccess = (event) => {
                const cursorResult = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursorResult) {
                    if (cursorResult.value.id === track.id) {
                        resolve(cursorResult.value);
                        return;
                    }
                    cursorResult.continue();
                } else {
                    resolve(undefined);
                }
            };
        });

        const playCount = existing ? (existing.play_count || 1) + 1 : 1;

        // Remove old entry if exists
        if (existing) {
            const delIndex = store.index('timestamp');
            const delCursor = delIndex.openCursor();
            delCursor.onsuccess = (event) => {
                const cursorResult = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursorResult) {
                    if (cursorResult.value.id === track.id) {
                        cursorResult.delete();
                    }
                    cursorResult.continue();
                }
            };
        }

        store.put({
            ...this.minifyTrack(track),
            timestamp: Date.now(),
            addedAt: new Date().toISOString(),
            play_count: playCount,
        });

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async getHistory(limit: number = 100): Promise<Track[]> {
        const db = await openDB();
        const tx = db.transaction('history_tracks', 'readonly');
        const store = tx.objectStore('history_tracks');
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const results: Track[] = [];
            const request = index.openCursor(null, 'prev');
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor && count < limit) {
                    results.push(cursor.value as Track);
                    count++;
                    cursor.continue();
                } else {
                    db.close();
                    resolve(results);
                }
            };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    }

    async clearHistory(): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('history_tracks', 'readwrite');
        tx.objectStore('history_tracks').clear();
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async getPlayCountStats(): Promise<{
        topTracks: { id: string; title: string; artist: string; cover?: string; playCount: number }[];
        totalPlays: number;
        uniqueTracks: number;
        listeningDays: number;
        currentStreak: number;
        longestStreak: number;
        dailyHours: { date: string; hours: number }[];
    }> {
        const allHistory = await this.getHistory(10000);
        const trackMap = new Map<string, { id: string; title: string; artist: string; cover?: string; playCount: number; duration: number }>();
        const daySet = new Set<string>();
        const dailySeconds = new Map<string, number>();

        let totalPlays = 0;

        for (const entry of allHistory) {
            const playCount = (entry as any).play_count || 1;
            totalPlays += playCount;

            const existing = trackMap.get(entry.id);
            if (existing) {
                existing.playCount += playCount;
            } else {
                trackMap.set(entry.id, {
                    id: entry.id,
                    title: entry.title,
                    artist: entry.artist || 'Unknown',
                    cover: entry.cover,
                    playCount,
                    duration: (entry as any).duration || 0,
                });
            }

            const ts = (entry as any).timestamp;
            if (ts) {
                const date = new Date(ts);
                const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                daySet.add(dayKey);
                const dur = (entry as any).duration || 0;
                dailySeconds.set(dayKey, (dailySeconds.get(dayKey) || 0) + dur * playCount);
            }
        }

        const topTracks = [...trackMap.values()]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 10);

        // Calculate streaks
        const sortedDays = [...daySet].sort();
        let currentStreak = 0;
        let longestStreak = 0;
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (daySet.has(key)) {
                streak++;
                if (i === 0 || currentStreak > 0) currentStreak = streak;
            } else {
                longestStreak = Math.max(longestStreak, streak);
                streak = 0;
                if (i > 0 && currentStreak > 0) break;
            }
        }
        longestStreak = Math.max(longestStreak, streak);

        // Last 7 days hours
        const dailyHours: { date: string; hours: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en', { weekday: 'short' });
            dailyHours.push({ date: label, hours: Math.round((dailySeconds.get(key) || 0) / 3600 * 10) / 10 });
        }

        return {
            topTracks,
            totalPlays,
            uniqueTracks: trackMap.size,
            listeningDays: daySet.size,
            currentStreak,
            longestStreak,
            dailyHours,
        };
    }

    async toggleFavorite(type: 'track' | 'album' | 'artist', item: Track | Album | Artist): Promise<boolean> {
        const storeName = `favorites_${type === 'track' ? 'tracks' : type + 's'}`;
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        const existing = await new Promise<boolean>((resolve) => {
            const req = store.get(item.id);
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => resolve(false);
        });

        if (existing) {
            store.delete(item.id);
        } else {
            store.put({ ...item, addedAt: new Date().toISOString() });
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(!existing); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async isFavorite(type: 'track' | 'album' | 'artist', id: string): Promise<boolean> {
        const storeName = `favorites_${type === 'track' ? 'tracks' : type + 's'}`;
        const db = await openDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => { db.close(); resolve(!!req.result); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async getFavorites(type: 'track' | 'album' | 'artist'): Promise<any[]> {
        const storeName = `favorites_${type === 'track' ? 'tracks' : type + 's'}`;
        const db = await openDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => { db.close(); resolve(req.result || []); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async createPlaylist(playlist: Omit<Playlist, 'id'> & { id?: string }): Promise<Playlist> {
        const id = playlist.id || `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newPlaylist: Playlist = { ...playlist, id, createdAt: new Date().toISOString(), tracks: playlist.tracks || [] };
        const db = await openDB();
        const tx = db.transaction('user_playlists', 'readwrite');
        tx.objectStore('user_playlists').put(newPlaylist);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(newPlaylist); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('user_playlists', 'readwrite');
        const store = tx.objectStore('user_playlists');
        const existing = await new Promise<Playlist | undefined>((resolve) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        });

        if (existing) {
            store.put({ ...existing, ...updates });
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async deletePlaylist(id: string): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('user_playlists', 'readwrite');
        tx.objectStore('user_playlists').delete(id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async getPlaylists(): Promise<Playlist[]> {
        const db = await openDB();
        const tx = db.transaction('user_playlists', 'readonly');
        const store = tx.objectStore('user_playlists');

        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => { db.close(); resolve(req.result || []); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async addTrackToPlaylist(playlistId: string, track: Track): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('user_playlists', 'readwrite');
        const store = tx.objectStore('user_playlists');
        const existing = await new Promise<Playlist | undefined>((resolve) => {
            const req = store.get(playlistId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        });

        if (existing) {
            const tracks = existing.tracks || [];
            if (!tracks.find(t => t.id === track.id)) {
                tracks.push(track);
                store.put({ ...existing, tracks });
            }
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('user_playlists', 'readwrite');
        const store = tx.objectStore('user_playlists');
        const existing = await new Promise<Playlist | undefined>((resolve) => {
            const req = store.get(playlistId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        });

        if (existing) {
            const tracks = (existing.tracks || []).filter(t => t.id !== trackId);
            store.put({ ...existing, tracks });
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    private minifyTrack(track: Track): Partial<Track> {
        return {
            id: track.id,
            title: track.title,
            duration: track.duration,
            artist: track.artist,
            cover: track.cover,
        };
    }

    async exportData(): Promise<string> {
        const data = {
            favorites: {
                tracks: await this.getFavorites('track'),
                albums: await this.getFavorites('album'),
                artists: await this.getFavorites('artist'),
            },
            playlists: await this.getPlaylists(),
            history: await this.getHistory(),
        };
        return JSON.stringify(data, null, 2);
    }

    async importData(json: string): Promise<void> {
        const data = JSON.parse(json);

        if (data.favorites?.tracks) {
            for (const track of data.favorites.tracks) {
                const db = await openDB();
                const tx = db.transaction('favorites_tracks', 'readwrite');
                tx.objectStore('favorites_tracks').put(track);
                await new Promise<void>((resolve, reject) => {
                    tx.oncomplete = () => { db.close(); resolve(); };
                    tx.onerror = () => { db.close(); reject(tx.error); };
                });
            }
        }

        if (data.playlists) {
            for (const playlist of data.playlists) {
                const db = await openDB();
                const tx = db.transaction('user_playlists', 'readwrite');
                tx.objectStore('user_playlists').put(playlist);
                await new Promise<void>((resolve, reject) => {
                    tx.oncomplete = () => { db.close(); resolve(); };
                    tx.onerror = () => { db.close(); reject(tx.error); };
                });
            }
        }
    }

    // === Downloads ===

    async saveDownload(id: string, data: { id: string; title: string; artist: string; cover: string; blob: Blob; size: number; downloadedAt: string }): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('downloads', 'readwrite');
        tx.objectStore('downloads').put(data);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async getDownloads(): Promise<any[]> {
        const db = await openDB();
        const tx = db.transaction('downloads', 'readonly');
        const store = tx.objectStore('downloads');

        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => { db.close(); resolve(req.result || []); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async isDownloaded(id: string): Promise<boolean> {
        const db = await openDB();
        const tx = db.transaction('downloads', 'readonly');
        const store = tx.objectStore('downloads');

        return new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => { db.close(); resolve(!!req.result); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async removeDownload(id: string): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('downloads', 'readwrite');
        tx.objectStore('downloads').delete(id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async getDownloadBlob(id: string): Promise<Blob | null> {
        const db = await openDB();
        const tx = db.transaction('downloads', 'readonly');
        const store = tx.objectStore('downloads');

        return new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => { db.close(); resolve(req.result?.blob || null); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    // === Local Files ===

    async addLocalFile(file: File): Promise<import('../types').LocalTrack> {
        const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const title = file.name.replace(/\.[^.]+$/, '');
        const record = {
            id,
            title,
            artist: '',
            album: '',
            duration: 0,
            fileBlob: file,
            fileName: file.name,
            mimeType: file.type,
            addedAt: new Date().toISOString(),
            fileSize: file.size,
        };

        // Try to get duration
        try {
            const url = URL.createObjectURL(file);
            const audio = new Audio();
            await new Promise<void>((resolve) => {
                audio.onloadedmetadata = () => {
                    record.duration = audio.duration || 0;
                    URL.revokeObjectURL(url);
                    resolve();
                };
                audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
                audio.src = url;
            });
        } catch {}

        const db = await openDB();
        const tx = db.transaction('local_files', 'readwrite');
        tx.objectStore('local_files').put(record);
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });

        return record as import('../types').LocalTrack;
    }

    async getLocalFiles(): Promise<import('../types').LocalTrack[]> {
        const db = await openDB();
        const tx = db.transaction('local_files', 'readonly');
        const store = tx.objectStore('local_files');

        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => { db.close(); resolve(req.result || []); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async deleteLocalFile(id: string): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('local_files', 'readwrite');
        tx.objectStore('local_files').delete(id);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async getLocalFileBlob(id: string): Promise<Blob | null> {
        const db = await openDB();
        const tx = db.transaction('local_files', 'readonly');
        const store = tx.objectStore('local_files');
        return new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => { db.close(); resolve(req.result?.fileBlob || null); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    }

    async updateLocalFile(id: string, updates: Partial<import('../types').LocalTrack>): Promise<void> {
        const db = await openDB();
        const tx = db.transaction('local_files', 'readwrite');
        const store = tx.objectStore('local_files');
        const existing = await new Promise<any | undefined>((resolve) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        });
        if (existing) {
            store.put({ ...existing, ...updates });
        }
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }
}

export const db = new MusicDatabase();
