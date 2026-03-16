//js/accounts/pocketbase.js
import PocketBase from 'pocketbase';
import { db } from '../db.js';
import { authManager } from './auth.js';

const PUBLIC_COLLECTION = 'public_playlists';
const DEFAULT_POCKETBASE_URL = 'https://data.samidy.xyz';

// Priority: Vite define (__POCKETBASE_URL__) > window injection > localStorage > default
let POCKETBASE_URL = DEFAULT_POCKETBASE_URL;

// Check if Vite injected PocketBase URL from .env (via define)
try {
    // eslint-disable-next-line no-undef
    if (typeof __POCKETBASE_URL__ !== 'undefined') {
        // eslint-disable-next-line no-undef
        POCKETBASE_URL = __POCKETBASE_URL__;
    }
} catch (e) {
    // Ignore
}

// Fallback to window injection (preview server)
if (typeof window !== 'undefined' && window.__POCKETBASE_URL__) {
    POCKETBASE_URL = window.__POCKETBASE_URL__;
}

// Fallback to localStorage
if (POCKETBASE_URL === DEFAULT_POCKETBASE_URL) {
    const storedUrl = localStorage.getItem('monochrome-pocketbase-url');
    if (storedUrl) {
        POCKETBASE_URL = storedUrl;
    }
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

const syncManager = {
    pb: pb,
    _userRecordCache: null,
    _isSyncing: false,

    async _getUserRecord(uid, email) {
        if (!uid) return null;

        // Check cache first
        if (this._userRecordCache && this._userRecordCache.firebase_id === uid) {
            return this._userRecordCache;
        }

        try {
            // Step 1: Search by firebase_id
            const record = await this.pb.collection('DB_users').getFirstListItem(`firebase_id="${uid}"`, { f_id: uid });
            this._userRecordCache = record;
            return record;

        } catch (error) {
            if (error.status === 404) {
                // Step 2: Search by email (for cases where Firebase UID is different)
                if (email) {
                    try {
                        const recordByEmail = await this.pb.collection('DB_users').getFirstListItem(
                            `email="${email}"`,
                            { f_id: uid }
                        );
                        // Update the record with new firebase_id
                        const updated = await this.pb.collection('DB_users').update(
                            recordByEmail.id,
                            { firebase_id: uid },
                            { f_id: uid }
                        );
                        this._userRecordCache = updated;
                        return updated;
                    } catch (emailError) {
                        if (emailError.status === 404) {
                            return await this._createUserRecord(uid, email);
                        }
                        return null;
                    }
                } else {
                    return await this._createUserRecord(uid, email);
                }
            }

            // Check for unique constraint error
            if (error.status === 400 && error.response?.data?.firebase_id?.code === 'validation_unique') {
                try {
                    const record = await this.pb.collection('DB_users').getFirstListItem(`firebase_id="${uid}"`, { f_id: uid });
                    this._userRecordCache = record;
                    return record;
                } catch (retryError) {
                    return null;
                }
            }

            return null;
        }
    },

    async _createUserRecord(uid, email) {
        if (!uid) return null;

        // Double-check before creation
        try {
            const existingRecord = await this.pb.collection('DB_users').getFirstListItem(
                `firebase_id="${uid}"`,
                { f_id: uid }
            );
            this._userRecordCache = existingRecord;
            return existingRecord;
        } catch (checkError) {
            if (checkError.status !== 404) {
                return null;
            }
        }

        try {
            const createData = {
                firebase_id: uid,
                email: email || '',
                library: JSON.stringify({}),
                history: JSON.stringify([]),
                user_playlists: JSON.stringify({}),
                user_folders: JSON.stringify({}),
            };

            const newRecord = await this.pb.collection('DB_users').create(createData, { f_id: uid });
            this._userRecordCache = newRecord;
            return newRecord;

        } catch (createError) {
            if (createError.status === 400 && createError.response?.data?.firebase_id?.code === 'validation_unique') {
                try {
                    const existingRecord = await this.pb.collection('DB_users').getFirstListItem(`firebase_id="${uid}"`, { f_id: uid });
                    this._userRecordCache = existingRecord;
                    return existingRecord;
                } catch (fetchError) {
                    return null;
                }
            }
            return null;
        }
    },

    async getUserData() {
        const user = authManager.user;
        if (!user) return null;

        const record = await this._getUserRecord(user.$id, user.email);
        if (!record) return null;

        const library = this.safeParseInternal(record.library, 'library', {});
        const history = this.safeParseInternal(record.history, 'history', []);
        const userPlaylists = this.safeParseInternal(record.user_playlists, 'user_playlists', {});
        const userFolders = this.safeParseInternal(record.user_folders, 'user_folders', {});
        const favoriteAlbums = this.safeParseInternal(record.favorite_albums, 'favorite_albums', []);

        const profile = {
            username: record.username,
            display_name: record.display_name,
            avatar_url: record.avatar_url,
            banner: record.banner,
            status: record.status,
            about: record.about,
            website: record.website,
            privacy: this.safeParseInternal(record.privacy, 'privacy', { playlists: 'public', lastfm: 'public' }),
            lastfm_username: record.lastfm_username,
            favorite_albums: favoriteAlbums,
        };

        return { library, history, userPlaylists, userFolders, profile };
    },

    async _updateUserJSON(uid, field, data) {
        const record = await this._getUserRecord(uid);
        if (!record) return;

        try {
            const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data);
            const updated = await this.pb
                .collection('DB_users')
                .update(record.id, { [field]: stringifiedData }, { f_id: uid });
            this._userRecordCache = updated;
        } catch (error) {
            // Silent fail
        }
    },

    safeParseInternal(str, _fieldName, fallback) {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try {
            return JSON.parse(str);
        } catch {
            try {
                const recovered = str.replace(/(:\s*")(.+?)("(?=\s*[,}\n\r]))/g, (match, p1, p2, p3) => {
                    const escapedContent = p2.replace(/(?<!\\)"/g, '\\"');
                    return p1 + escapedContent + p3;
                });
                return JSON.parse(recovered);
            } catch {
                try {
                    if (str.includes("'") || str.includes('True') || str.includes('False')) {
                        const jsFriendly = str
                            .replace(/\bTrue\b/g, 'true')
                            .replace(/\bFalse\b/g, 'false')
                            .replace(/\bNone\b/g, 'null');

                        if (
                            (jsFriendly.trim().startsWith('[') || jsFriendly.trim().startsWith('{')) &&
                            !jsFriendly.match(/function|=>|window|document|alert|eval/)
                        ) {
                            return new Function('return ' + jsFriendly)();
                        }
                    }
                } catch {
                    // Ignore
                }
                return fallback;
            }
        }
    },

    async syncLibraryItem(type, item, added) {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let library = this.safeParseInternal(record.library, 'library', {});

        const pluralType = type === 'mix' ? 'mixes' : `${type}s`;
        const key = type === 'playlist' ? item.uuid : item.id;

        if (!library[pluralType]) {
            library[pluralType] = {};
        }

        if (added) {
            library[pluralType][key] = this._minifyItem(type, item);
        } else {
            delete library[pluralType][key];
        }

        await this._updateUserJSON(user.$id, 'library', library);
    },

    _minifyItem(type, item) {
        if (!item) return item;

        const base = {
            id: item.id,
            addedAt: item.addedAt || Date.now(),
        };

        if (type === 'track') {
            return {
                ...base,
                title: item.title || null,
                duration: item.duration || null,
                explicit: item.explicit || false,
                artist: item.artist || (item.artists && item.artists.length > 0 ? item.artists[0] : null) || null,
                artists: item.artists?.map((a) => ({ id: a.id, name: a.name || null })) || [],
                album: item.album
                    ? {
                          id: item.album.id,
                          title: item.album.title || null,
                          cover: item.album.cover || null,
                          releaseDate: item.album.releaseDate || null,
                          vibrantColor: item.album.vibrantColor || null,
                          artist: item.album.artist || null,
                          numberOfTracks: item.album.numberOfTracks || null,
                      }
                    : null,
                copyright: item.copyright || null,
                isrc: item.isrc || null,
                trackNumber: item.trackNumber || null,
                streamStartDate: item.streamStartDate || null,
                version: item.version || null,
                mixes: item.mixes || null,
            };
        }

        if (type === 'album') {
            return {
                ...base,
                title: item.title || null,
                cover: item.cover || null,
                releaseDate: item.releaseDate || null,
                explicit: item.explicit || false,
                artist: item.artist
                    ? { name: item.artist.name || null, id: item.artist.id }
                    : item.artists?.[0]
                      ? { name: item.artists[0].name || null, id: item.artists[0].id }
                      : null,
                type: item.type || null,
                numberOfTracks: item.numberOfTracks || null,
            };
        }

        if (type === 'artist') {
            return {
                ...base,
                name: item.name || null,
                picture: item.picture || item.image || null,
            };
        }

        if (type === 'playlist') {
            return {
                uuid: item.uuid || item.id,
                addedAt: item.addedAt || Date.now(),
                title: item.title || item.name || null,
                image: item.image || item.squareImage || item.cover || null,
                numberOfTracks: item.numberOfTracks || (item.tracks ? item.tracks.length : 0),
                user: item.user ? { name: item.user.name || null } : null,
            };
        }

        if (type === 'mix') {
            return {
                id: item.id,
                addedAt: item.addedAt || Date.now(),
                title: item.title,
                subTitle: item.subTitle,
                mixType: item.mixType,
                cover: item.cover,
            };
        }

        return item;
    },

    async syncHistoryItem(historyEntry) {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let history = this.safeParseInternal(record.history, 'history', []);

        const newHistory = [historyEntry, ...history].slice(0, 100);
        await this._updateUserJSON(user.$id, 'history', newHistory);
    },

    async syncUserPlaylist(playlist, action) {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let userPlaylists = this.safeParseInternal(record.user_playlists, 'user_playlists', {});

        if (action === 'delete') {
            delete userPlaylists[playlist.id];
            await this.unpublishPlaylist(playlist.id);
        } else {
            userPlaylists[playlist.id] = {
                id: playlist.id,
                name: playlist.name,
                cover: playlist.cover || null,
                tracks: playlist.tracks ? playlist.tracks.map((t) => this._minifyItem('track', t)) : [],
                createdAt: playlist.createdAt || Date.now(),
                updatedAt: playlist.updatedAt || Date.now(),
                numberOfTracks: playlist.tracks ? playlist.tracks.length : 0,
                images: playlist.images || [],
                isPublic: playlist.isPublic || false,
            };

            if (playlist.isPublic) {
                await this.publishPlaylist(playlist);
            }
        }

        await this._updateUserJSON(user.$id, 'user_playlists', userPlaylists);
    },

    async syncUserFolder(folder, action) {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let userFolders = this.safeParseInternal(record.user_folders, 'user_folders', {});

        if (action === 'delete') {
            delete userFolders[folder.id];
        } else {
            userFolders[folder.id] = {
                id: folder.id,
                name: folder.name,
                cover: folder.cover || null,
                playlists: folder.playlists || [],
                createdAt: folder.createdAt || Date.now(),
                updatedAt: folder.updatedAt || Date.now(),
            };
        }

        await this._updateUserJSON(user.$id, 'user_folders', userFolders);
    },

    async getPublicPlaylist(uuid) {
        try {
            const record = await this.pb
                .collection(PUBLIC_COLLECTION)
                .getFirstListItem(`uuid="${uuid}"`, { p_id: uuid });

            let rawCover = record.image || record.cover || record.playlist_cover || '';
            let extraData = this.safeParseInternal(record.data, 'data', {});

            if (!rawCover && extraData && typeof extraData === 'object') {
                rawCover = extraData.cover || extraData.image || '';
            }

            let finalCover = rawCover;
            if (rawCover && !rawCover.startsWith('http') && !rawCover.startsWith('data:')) {
                finalCover = this.pb.files.getUrl(record, rawCover);
            }

            let images = [];
            let tracks = this.safeParseInternal(record.tracks, 'tracks', []);

            if (!finalCover && tracks && tracks.length > 0) {
                const uniqueCovers = [];
                const seenCovers = new Set();
                for (const track of tracks) {
                    const c = track.album?.cover;
                    if (c && !seenCovers.has(c)) {
                        seenCovers.add(c);
                        uniqueCovers.push(c);
                        if (uniqueCovers.length >= 4) break;
                    }
                }
                images = uniqueCovers;
            }

            let finalTitle = record.title || record.name || record.playlist_name;
            if (!finalTitle && extraData && typeof extraData === 'object') {
                finalTitle = extraData.title || extraData.name;
            }
            if (!finalTitle) finalTitle = 'Untitled Playlist';

            let finalDescription = record.description || '';
            if (!finalDescription && extraData && typeof extraData === 'object') {
                finalDescription = extraData.description || '';
            }

            return {
                ...record,
                id: record.uuid,
                name: finalTitle,
                title: finalTitle,
                description: finalDescription,
                cover: finalCover,
                image: finalCover,
                tracks: tracks,
                images: images,
                numberOfTracks: tracks.length,
                type: 'user-playlist',
                isPublic: true,
                user: { name: 'Community Playlist' },
            };
        } catch (error) {
            if (error.status === 404) return null;
            throw error;
        }
    },

    async publishPlaylist(playlist) {
        if (!playlist || !playlist.id) return;
        const uid = authManager.user?.$id;
        if (!uid) return;

        const data = {
            uuid: playlist.id,
            uid: uid,
            firebase_id: uid,
            title: playlist.name,
            name: playlist.name,
            playlist_name: playlist.name,
            image: playlist.cover,
            cover: playlist.cover,
            playlist_cover: playlist.cover,
            description: playlist.description || '',
            tracks: JSON.stringify(playlist.tracks || []),
            isPublic: true,
            data: {
                title: playlist.name,
                cover: playlist.cover,
                description: playlist.description || '',
            },
        };

        try {
            const existing = await this.pb.collection(PUBLIC_COLLECTION).getList(1, 1, {
                filter: `uuid="${playlist.id}"`,
                p_id: playlist.id,
            });

            if (existing.items.length > 0) {
                await this.pb.collection(PUBLIC_COLLECTION).update(existing.items[0].id, data, { f_id: uid });
            } else {
                await this.pb.collection(PUBLIC_COLLECTION).create(data, { f_id: uid });
            }
        } catch (error) {
            // Silent fail
        }
    },

    async unpublishPlaylist(uuid) {
        const uid = authManager.user?.$id;
        if (!uid) return;

        try {
            const existing = await this.pb.collection(PUBLIC_COLLECTION).getList(1, 1, {
                filter: `uuid="${uuid}"`,
                p_id: uuid,
            });

            if (existing.items && existing.items.length > 0) {
                await this.pb.collection(PUBLIC_COLLECTION).delete(existing.items[0].id, { p_id: uuid, f_id: uid });
            }
        } catch (error) {
            // Silent fail
        }
    },

    async getProfile(username) {
        try {
            const record = await this.pb.collection('DB_users').getFirstListItem(`username="${username}"`, {
                fields: 'username,display_name,avatar_url,banner,status,about,website,lastfm_username,privacy,user_playlists,favorite_albums',
            });
            return {
                ...record,
                privacy: this.safeParseInternal(record.privacy, 'privacy', { playlists: 'public', lastfm: 'public' }),
                user_playlists: this.safeParseInternal(record.user_playlists, 'user_playlists', {}),
                favorite_albums: this.safeParseInternal(record.favorite_albums, 'favorite_albums', []),
            };
        } catch {
            return null;
        }
    },

    async updateProfile(data) {
        const user = authManager.user;
        if (!user) return;
        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        const updateData = { ...data };
        if (updateData.privacy) {
            updateData.privacy = JSON.stringify(updateData.privacy);
        }

        await this.pb.collection('DB_users').update(record.id, updateData, { f_id: user.$id });
        if (this._userRecordCache) {
            this._userRecordCache = { ...this._userRecordCache, ...updateData };
        }
    },

    async isUsernameTaken(username) {
        try {
            const list = await this.pb.collection('DB_users').getList(1, 1, { filter: `username="${username}"` });
            return list.totalItems > 0;
        } catch {
            return false;
        }
    },

    async clearCloudData() {
        const user = authManager.user;
        if (!user) return;

        try {
            const record = await this._getUserRecord(user.$id);
            if (record) {
                await this.pb.collection('DB_users').delete(record.id, { f_id: user.$id });
                this._userRecordCache = null;
            }
        } catch (error) {
            throw error;
        }
    },

    async onAuthStateChanged(user) {
        if (user) {
            if (this._isSyncing) return;

            this._isSyncing = true;

            try {
                const cloudData = await this.getUserData();

                if (cloudData) {
                    let database = db;
                    if (typeof database === 'function') {
                        database = await database();
                    } else {
                        database = await database;
                    }

                    const getAll = async (store) => {
                        if (database && typeof database.getAll === 'function') return database.getAll(store);
                        if (database && database.db && typeof database.db.getAll === 'function')
                            return database.db.getAll(store);
                        return [];
                    };

                    const localData = {
                        tracks: (await getAll('favorites_tracks')) || [],
                        albums: (await getAll('favorites_albums')) || [],
                        artists: (await getAll('favorites_artists')) || [],
                        playlists: (await getAll('favorites_playlists')) || [],
                        mixes: (await getAll('favorites_mixes')) || [],
                        history: (await getAll('history_tracks')) || [],
                        userPlaylists: (await getAll('user_playlists')) || [],
                        userFolders: (await getAll('user_folders')) || [],
                    };

                    let { library, history, userPlaylists, userFolders, profile } = cloudData;

                    const mergeById = (local, cloud) => {
                        const merged = { ...cloud };
                        if (local && Array.isArray(local)) {
                            local.forEach((item) => {
                                if (item.id && !merged[item.id]) {
                                    merged[item.id] = item;
                                }
                            });
                        }
                        return merged;
                    };

                    library = {
                        tracks: mergeById(localData.tracks, library.tracks || {}),
                        albums: mergeById(localData.albums, library.albums || {}),
                        artists: mergeById(localData.artists, library.artists || {}),
                        playlists: mergeById(localData.playlists, library.playlists || {}),
                        mixes: mergeById(localData.mixes, library.mixes || {}),
                    };

                    history = Array.from(new Set([...(localData.history || []), ...(history || [])])).slice(0, 100);

                    userPlaylists = { ...userPlaylists };
                    if (localData.userPlaylists && Array.isArray(localData.userPlaylists)) {
                        localData.userPlaylists.forEach((item) => {
                            if (item.id && !userPlaylists[item.id]) {
                                userPlaylists[item.id] = item;
                            }
                        });
                    }

                    userFolders = { ...userFolders };
                    if (localData.userFolders && Array.isArray(localData.userFolders)) {
                        localData.userFolders.forEach((item) => {
                            if (item.id && !userFolders[item.id]) {
                                userFolders[item.id] = item;
                            }
                        });
                    }

                    await db.bulkReplaceAll(library, history, userPlaylists, userFolders);

                    if (profile && (profile.username || profile.display_name)) {
                        await db.saveProfile(profile);
                    }
                }
            } catch (error) {
                throw error;
            } finally {
                this._isSyncing = false;
            }
        }
    },
};

export { syncManager };
