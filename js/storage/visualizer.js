export const visualizerSettings = {
    SENSITIVITY_KEY: 'visualizer-sensitivity',
    SMART_INTENSITY_KEY: 'visualizer-smart-intensity',
    ENABLED_KEY: 'visualizer-enabled',
    MODE_KEY: 'visualizer-mode',
    PRESET_KEY: 'visualizer-preset',
    BUTTERCHURN_CYCLE_KEY: 'butterchurn-cycle-duration',

    getPreset() {
        try {
            return localStorage.getItem(this.PRESET_KEY) || 'butterchurn';
        } catch {
            return 'butterchurn';
        }
    },

    setPreset(preset) {
        localStorage.setItem(this.PRESET_KEY, preset);
    },

    isEnabled() {
        try {
            const val = localStorage.getItem(this.ENABLED_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled);
    },

    getMode() {
        try {
            return localStorage.getItem(this.MODE_KEY) || 'solid';
        } catch {
            return 'solid';
        }
    },

    setMode(mode) {
        localStorage.setItem(this.MODE_KEY, mode);
    },

    getSensitivity() {
        try {
            const val = localStorage.getItem(this.SENSITIVITY_KEY);
            if (val === null) return 1.0;
            return parseFloat(val);
        } catch {
            return 1.0;
        }
    },

    setSensitivity(value) {
        localStorage.setItem(this.SENSITIVITY_KEY, value);
    },

    isSmartIntensityEnabled() {
        try {
            const val = localStorage.getItem(this.SMART_INTENSITY_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setSmartIntensity(enabled) {
        localStorage.setItem(this.SMART_INTENSITY_KEY, enabled);
    },

    getButterchurnCycleDuration() {
        try {
            const val = localStorage.getItem(this.BUTTERCHURN_CYCLE_KEY);
            return val ? parseInt(val, 10) : 30;
        } catch {
            return 30;
        }
    },

    setButterchurnCycleDuration(seconds) {
        localStorage.setItem(this.BUTTERCHURN_CYCLE_KEY, seconds.toString());
    },

    isButterchurnCycleEnabled() {
        try {
            return localStorage.getItem('butterchurn-cycle-enabled') !== 'false';
        } catch {
            return true;
        }
    },

    setButterchurnCycleEnabled(enabled) {
        localStorage.setItem('butterchurn-cycle-enabled', enabled);
    },

    isButterchurnRandomizeEnabled() {
        try {
            return localStorage.getItem('butterchurn-randomize-enabled') !== 'false';
        } catch {
            return true;
        }
    },

    setButterchurnRandomizeEnabled(enabled) {
        localStorage.setItem('butterchurn-randomize-enabled', enabled);
    },
};
