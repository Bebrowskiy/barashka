export const playlistSettings = {
    M3U_KEY: 'playlist-generate-m3u',
    M3U8_KEY: 'playlist-generate-m3u8',
    CUE_KEY: 'playlist-generate-cue',
    NFO_KEY: 'playlist-generate-nfo',
    JSON_KEY: 'playlist-generate-json',
    RELATIVE_PATHS_KEY: 'playlist-relative-paths',
    SEPARATE_DISCS_KEY: 'playlist-separate-discs-in-zip',

    shouldGenerateM3U() {
        try {
            const val = localStorage.getItem(this.M3U_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    shouldGenerateM3U8() {
        try {
            return localStorage.getItem(this.M3U8_KEY) === 'true';
        } catch {
            return false;
        }
    },

    shouldGenerateCUE() {
        try {
            return localStorage.getItem(this.CUE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    shouldGenerateNFO() {
        try {
            return localStorage.getItem(this.NFO_KEY) === 'true';
        } catch {
            return false;
        }
    },

    shouldGenerateJSON() {
        try {
            return localStorage.getItem(this.JSON_KEY) === 'true';
        } catch {
            return false;
        }
    },

    shouldUseRelativePaths() {
        try {
            const val = localStorage.getItem(this.RELATIVE_PATHS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    shouldSeparateDiscsInZip() {
        try {
            const val = localStorage.getItem(this.SEPARATE_DISCS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setGenerateM3U(enabled) {
        localStorage.setItem(this.M3U_KEY, enabled ? 'true' : 'false');
    },

    setGenerateM3U8(enabled) {
        localStorage.setItem(this.M3U8_KEY, enabled ? 'true' : 'false');
    },

    setGenerateCUE(enabled) {
        localStorage.setItem(this.CUE_KEY, enabled ? 'true' : 'false');
    },

    setGenerateNFO(enabled) {
        localStorage.setItem(this.NFO_KEY, enabled ? 'true' : 'false');
    },

    setGenerateJSON(enabled) {
        localStorage.setItem(this.JSON_KEY, enabled ? 'true' : 'false');
    },

    setUseRelativePaths(enabled) {
        localStorage.setItem(this.RELATIVE_PATHS_KEY, enabled ? 'true' : 'false');
    },

    setSeparateDiscsInZip(enabled) {
        localStorage.setItem(this.SEPARATE_DISCS_KEY, enabled ? 'true' : 'false');
    },
};
