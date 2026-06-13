export const nowPlayingSettings = {
    STORAGE_KEY: 'now-playing-mode',

    getMode() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'cover';
        } catch {
            return 'cover';
        }
    },

    setMode(mode) {
        localStorage.setItem(this.STORAGE_KEY, mode);
    },
};

export const fullscreenCoverClickSettings = {
    STORAGE_KEY: 'fullscreen-cover-click-action',

    getAction() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'exit';
        } catch {
            return 'exit';
        }
    },

    setAction(action) {
        localStorage.setItem(this.STORAGE_KEY, action);
    },
};

export const lyricsSettings = {
    DOWNLOAD_WITH_TRACKS: 'lyrics-download-with-tracks',

    shouldDownloadLyrics() {
        try {
            return localStorage.getItem(this.DOWNLOAD_WITH_TRACKS) === 'true';
        } catch {
            return false;
        }
    },

    setDownloadLyrics(enabled) {
        localStorage.setItem(this.DOWNLOAD_WITH_TRACKS, enabled ? 'true' : 'false');
    },
};

export const backgroundSettings = {
    STORAGE_KEY: 'album-background-enabled',

    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const dynamicColorSettings = {
    STORAGE_KEY: 'dynamic-color-enabled',

    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const cardSettings = {
    COMPACT_ARTIST_KEY: 'card-compact-artist',
    COMPACT_ALBUM_KEY: 'card-compact-album',

    isCompactArtist() {
        try {
            const val = localStorage.getItem(this.COMPACT_ARTIST_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setCompactArtist(enabled) {
        localStorage.setItem(this.COMPACT_ARTIST_KEY, enabled ? 'true' : 'false');
    },

    isCompactAlbum() {
        try {
            return localStorage.getItem(this.COMPACT_ALBUM_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setCompactAlbum(enabled) {
        localStorage.setItem(this.COMPACT_ALBUM_KEY, enabled ? 'true' : 'false');
    },
};

export const waveformSettings = {
    STORAGE_KEY: 'waveform-seekbar-enabled',

    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const smoothScrollingSettings = {
    STORAGE_KEY: 'smooth-scrolling-enabled',

    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const qualityBadgeSettings = {
    STORAGE_KEY: 'show-quality-badges',

    isEnabled() {
        try {
            const val = localStorage.getItem(this.STORAGE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const trackDateSettings = {
    STORAGE_KEY: 'use-album-release-year',

    useAlbumYear() {
        try {
            const val = localStorage.getItem(this.STORAGE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setUseAlbumYear(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const coverArtSizeSettings = {
    STORAGE_KEY: 'cover-art-size',
    getSize() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || '1280';
        } catch {
            return '1280';
        }
    },
    setSize(size) {
        localStorage.setItem(this.STORAGE_KEY, size);
    },
};
