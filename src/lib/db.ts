import { type Track, type Album, type Artist, type Playlist } from '../types';

const DB_NAME = 'BarashkaDB';
const DB_VERSION = 9;

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

        // Remove existing entry for same track
        const index = store.index('timestamp');
        const cursor = index.openCursor();
        cursor.onsuccess = (event) => {
            const cursorResult = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursorResult) {
                if (cursorResult.value.id === track.id) {
                    cursorResult.delete();
                }
                cursorResult.continue();
            }
        };

        store.put({
            ...this.minifyTrack(track),
            timestamp: Date.now(),
            addedAt: new Date().toISOString(),
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
}

export const db = new MusicDatabase();
