function encodeSensitiveData(text) {
    if (!text) return '';
    const encoded = btoa(text.split('').reverse().join(''));
    return encoded;
}

function decodeSensitiveData(encoded) {
    if (!encoded) return '';
    try {
        return atob(encoded).split('').reverse().join('');
    } catch {
        return '';
    }
}

export const lastFMStorage = {
    STORAGE_KEY: 'lastfm-enabled',
    LOVE_ON_LIKE_KEY: 'lastfm-love-on-like',
    SCROBBLE_PERCENTAGE_KEY: 'lastfm-scrobble-percentage',
    CUSTOM_API_KEY: 'lastfm-custom-api-key',
    CUSTOM_API_SECRET: 'lastfm-custom-api-secret',
    USE_CUSTOM_CREDENTIALS_KEY: 'lastfm-use-custom-credentials',

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

    shouldLoveOnLike() {
        try {
            return localStorage.getItem(this.LOVE_ON_LIKE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setLoveOnLike(enabled) {
        localStorage.setItem(this.LOVE_ON_LIKE_KEY, enabled ? 'true' : 'false');
    },

    getScrobblePercentage() {
        const value = localStorage.getItem(this.SCROBBLE_PERCENTAGE_KEY);
        if (value === null) return 75;
        return parseInt(value, 10) || 75;
    },

    setScrobblePercentage(percentage) {
        const validPercentage = Math.max(1, Math.min(100, parseInt(percentage, 10) || 75));
        localStorage.setItem(this.SCROBBLE_PERCENTAGE_KEY, validPercentage.toString());
    },

    getCustomApiKey() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_API_KEY);
            return stored ? decodeSensitiveData(stored) : '';
        } catch {
            return '';
        }
    },

    setCustomApiKey(key) {
        localStorage.setItem(this.CUSTOM_API_KEY, encodeSensitiveData(key));
    },

    getCustomApiSecret() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_API_SECRET);
            return stored ? decodeSensitiveData(stored) : '';
        } catch {
            return '';
        }
    },

    setCustomApiSecret(secret) {
        localStorage.setItem(this.CUSTOM_API_SECRET, encodeSensitiveData(secret));
    },

    useCustomCredentials() {
        try {
            return localStorage.getItem(this.USE_CUSTOM_CREDENTIALS_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setUseCustomCredentials(enabled) {
        localStorage.setItem(this.USE_CUSTOM_CREDENTIALS_KEY, enabled ? 'true' : 'false');
    },

    clearCustomCredentials() {
        localStorage.removeItem(this.CUSTOM_API_KEY);
        localStorage.removeItem(this.CUSTOM_API_SECRET);
        localStorage.removeItem(this.USE_CUSTOM_CREDENTIALS_KEY);
    },
};

export const listenBrainzSettings = {
    ENABLED_KEY: 'listenbrainz-enabled',
    TOKEN_KEY: 'listenbrainz-token',
    CUSTOM_URL_KEY: 'listenbrainz-custom-url',

    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    getToken() {
        try {
            return localStorage.getItem(this.TOKEN_KEY) || '';
        } catch {
            return '';
        }
    },

    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    getCustomUrl() {
        try {
            return localStorage.getItem(this.CUSTOM_URL_KEY) || '';
        } catch {
            return '';
        }
    },

    setCustomUrl(url) {
        localStorage.setItem(this.CUSTOM_URL_KEY, url);
    },
};

export const malojaSettings = {
    ENABLED_KEY: 'maloja-enabled',
    TOKEN_KEY: 'maloja-token',
    CUSTOM_URL_KEY: 'maloja-custom-url',

    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    getToken() {
        try {
            return localStorage.getItem(this.TOKEN_KEY) || '';
        } catch {
            return '';
        }
    },

    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    getCustomUrl() {
        try {
            return localStorage.getItem(this.CUSTOM_URL_KEY) || '';
        } catch {
            return '';
        }
    },

    setCustomUrl(url) {
        localStorage.setItem(this.CUSTOM_URL_KEY, url);
    },
};

export const libreFmSettings = {
    ENABLED_KEY: 'librefm-enabled',
    LOVE_ON_LIKE_KEY: 'librefm-love-on-like',

    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    shouldLoveOnLike() {
        try {
            return localStorage.getItem(this.LOVE_ON_LIKE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setLoveOnLike(enabled) {
        localStorage.setItem(this.LOVE_ON_LIKE_KEY, enabled ? 'true' : 'false');
    },
};
