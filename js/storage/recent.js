export const recentActivityManager = {
    STORAGE_KEY: 'monochrome-recent-activity',
    LIMIT: 10,

    _get() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            const parsed = data ? JSON.parse(data) : { artists: [], albums: [], playlists: [], mixes: [] };
            if (!parsed.playlists) parsed.playlists = [];
            if (!parsed.mixes) parsed.mixes = [];
            return parsed;
        } catch {
            return { artists: [], albums: [], playlists: [], mixes: [] };
        }
    },

    _save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    getRecents() {
        return this._get();
    },

    _add(type, item) {
        const data = this._get();
        data[type] = data[type].filter((i) => i.id !== item.id);
        data[type].unshift(item);
        data[type] = data[type].slice(0, this.LIMIT);
        this._save(data);
    },

    clear() {
        this._save({ artists: [], albums: [], playlists: [], mixes: [] });
    },

    addArtist(artist) {
        this._add('artists', artist);
    },

    addAlbum(album) {
        this._add('albums', album);
    },

    addPlaylist(playlist) {
        this._add('playlists', playlist);
    },

    addMix(mix) {
        this._add('mixes', mix);
    },
};
