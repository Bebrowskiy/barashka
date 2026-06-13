export const downloadQualitySettings = {
    STORAGE_KEY: 'download-quality',
    getQuality() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'HI_RES_LOSSLESS';
        } catch {
            return 'HI_RES_LOSSLESS';
        }
    },
    setQuality(quality) {
        localStorage.setItem(this.STORAGE_KEY, quality);
    },
};

export const losslessContainerSettings = {
    STORAGE_KEY: 'lossless-container',
    getContainer() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'flac';
        } catch {
            return 'flac';
        }
    },
    setContainer(container) {
        localStorage.setItem(this.STORAGE_KEY, container);
    },
};

export const bulkDownloadSettings = {
    STORAGE_KEY: 'force-individual-downloads',

    shouldForceIndividual() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setForceIndividual(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};
