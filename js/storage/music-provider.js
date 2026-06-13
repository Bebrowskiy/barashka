export const musicProviderSettings = {
    STORAGE_KEY: 'music-provider',

    getProvider() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'youtube';
        } catch {
            return 'youtube';
        }
    },

    setProvider(provider) {
        localStorage.setItem(this.STORAGE_KEY, provider);
    },
};
