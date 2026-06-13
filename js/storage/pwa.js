export const pwaUpdateSettings = {
    STORAGE_KEY: 'pwa-auto-update-enabled',

    isAutoUpdateEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    setAutoUpdateEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};
