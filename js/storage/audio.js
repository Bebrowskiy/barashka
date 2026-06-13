export const replayGainSettings = {
    STORAGE_KEY_MODE: 'replay-gain-mode',
    STORAGE_KEY_PREAMP: 'replay-gain-preamp',
    getMode() {
        return localStorage.getItem(this.STORAGE_KEY_MODE) || 'track';
    },
    setMode(mode) {
        localStorage.setItem(this.STORAGE_KEY_MODE, mode);
    },
    getPreamp() {
        const val = parseFloat(localStorage.getItem(this.STORAGE_KEY_PREAMP));
        return isNaN(val) ? 3 : val;
    },
    setPreamp(db) {
        localStorage.setItem(this.STORAGE_KEY_PREAMP, db);
    },
};

export const monoAudioSettings = {
    STORAGE_KEY: 'mono-audio-enabled',

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

export const exponentialVolumeSettings = {
    STORAGE_KEY: 'exponential-volume-enabled',

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

    applyCurve(linearVolume) {
        if (!this.isEnabled()) {
            return linearVolume;
        }
        return Math.pow(linearVolume, 3);
    },

    inverseCurve(perceivedVolume) {
        if (!this.isEnabled()) {
            return perceivedVolume;
        }
        return Math.cbrt(perceivedVolume);
    },
};

export const audioEffectsSettings = {
    SPEED_KEY: 'audio-effects-speed',
    PITCH_PRESERVE_KEY: 'audio-effects-pitch-preserve',

    getSpeed() {
        try {
            const val = parseFloat(localStorage.getItem(this.SPEED_KEY));
            return isNaN(val) ? 1.0 : Math.max(0.01, Math.min(100, val));
        } catch {
            return 1.0;
        }
    },

    setSpeed(speed) {
        const validSpeed = Math.max(0.01, Math.min(100, parseFloat(speed) || 1.0));
        localStorage.setItem(this.SPEED_KEY, validSpeed.toString());
    },

    isPreservePitchEnabled() {
        try {
            const val = localStorage.getItem(this.PITCH_PRESERVE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    setPreservePitch(enabled) {
        localStorage.setItem(this.PITCH_PRESERVE_KEY, enabled ? 'true' : 'false');
    },
};

export const crossfadeSettings = {
    KEY: 'crossfade_settings',
    DEFAULTS: {
        enabled: false,
        duration: 5000,
        curve: 'logarithmic',
        autoCrossfade: true,
        minDuration: 1000,
        maxDuration: 30000,
    },

    get() {
        try {
            const stored = localStorage.getItem(this.KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.DEFAULTS, ...parsed };
            }
        } catch (e) {
            console.warn('[Crossfade Settings] Failed to load:', e);
        }
        return { ...this.DEFAULTS };
    },

    set(settings) {
        try {
            const current = this.get();
            const updated = { ...current, ...settings };
            localStorage.setItem(this.KEY, JSON.stringify(updated));

            window.dispatchEvent(new CustomEvent('crossfadeSettingsChange', {
                detail: updated
            }));
        } catch (e) {
            console.error('[Crossfade Settings] Failed to save:', e);
        }
    },

    isEnabled() {
        return this.get().enabled;
    },

    getDuration() {
        const settings = this.get();
        return Math.max(settings.minDuration, Math.min(settings.maxDuration, settings.duration));
    },

    getCurve() {
        const validCurves = ['linear', 'logarithmic', 'exponential', 'sine', 'cosine'];
        const curve = this.get().curve;
        return validCurves.includes(curve) ? curve : 'logarithmic';
    },

    toggle() {
        const current = this.get();
        this.set({ enabled: !current.enabled });
        return !current.enabled;
    },

    setDuration(ms) {
        const clamped = Math.max(this.DEFAULTS.minDuration, Math.min(this.DEFAULTS.maxDuration, ms));
        this.set({ duration: clamped });
        return clamped;
    },

    setCurve(curve) {
        const validCurves = ['linear', 'logarithmic', 'exponential', 'sine', 'cosine'];
        if (validCurves.includes(curve)) {
            this.set({ curve });
            return true;
        }
        return false;
    },

    toggleAutoCrossfade() {
        const current = this.get();
        this.set({ autoCrossfade: !current.autoCrossfade });
        return !current.autoCrossfade;
    },

    reset() {
        localStorage.removeItem(this.KEY);
        window.dispatchEvent(new CustomEvent('crossfadeSettingsChange', {
            detail: this.DEFAULTS
        }));
    },

    export() {
        return JSON.stringify(this.get(), null, 2);
    },

    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.set(imported);
            return true;
        } catch (e) {
            console.error('[Crossfade Settings] Import failed:', e);
            return false;
        }
    },
};

export const equalizerSettings = {
    ENABLED_KEY: 'equalizer-enabled',
    GAINS_KEY: 'equalizer-gains',
    PRESET_KEY: 'equalizer-preset',
    CUSTOM_PRESETS_KEY: 'equalizer-custom-presets',
    BAND_COUNT_KEY: 'equalizer-band-count',
    RANGE_MIN_KEY: 'equalizer-range-min',
    RANGE_MAX_KEY: 'equalizer-range-max',
    FREQ_MIN_KEY: 'equalizer-freq-min',
    FREQ_MAX_KEY: 'equalizer-freq-max',
    PREAMP_KEY: 'equalizer-preamp',
    DEFAULT_BAND_COUNT: 16,
    MIN_BANDS: 3,
    MAX_BANDS: 32,
    DEFAULT_RANGE_MIN: -30,
    DEFAULT_RANGE_MAX: 30,
    ABSOLUTE_MIN: -60,
    ABSOLUTE_MAX: 60,
    DEFAULT_FREQ_MIN: 20,
    DEFAULT_FREQ_MAX: 20000,
    ABSOLUTE_FREQ_MIN: 10,
    ABSOLUTE_FREQ_MAX: 96000,
    DEFAULT_PREAMP: 0,
    PREAMP_MIN: -20,
    PREAMP_MAX: 20,

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

    getBandCount() {
        try {
            const stored = localStorage.getItem(this.BAND_COUNT_KEY);
            if (stored) {
                const count = parseInt(stored, 10);
                if (!isNaN(count) && count >= this.MIN_BANDS && count <= this.MAX_BANDS) {
                    return count;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_BAND_COUNT;
    },

    setBandCount(count) {
        const validCount = Math.max(
            this.MIN_BANDS,
            Math.min(this.MAX_BANDS, parseInt(count, 10) || this.DEFAULT_BAND_COUNT)
        );
        localStorage.setItem(this.BAND_COUNT_KEY, validCount.toString());
    },

    getRangeMin() {
        try {
            const stored = localStorage.getItem(this.RANGE_MIN_KEY);
            if (stored) {
                const val = parseInt(stored, 10);
                if (!isNaN(val) && val >= this.ABSOLUTE_MIN && val < 0) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_RANGE_MIN;
    },

    setRangeMin(value) {
        const val = parseInt(value, 10);
        if (!isNaN(val) && val >= this.ABSOLUTE_MIN && val < 0) {
            localStorage.setItem(this.RANGE_MIN_KEY, val.toString());
            return true;
        }
        return false;
    },

    getRangeMax() {
        try {
            const stored = localStorage.getItem(this.RANGE_MAX_KEY);
            if (stored) {
                const val = parseInt(stored, 10);
                if (!isNaN(val) && val > 0 && val <= this.ABSOLUTE_MAX) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_RANGE_MAX;
    },

    setRangeMax(value) {
        const val = parseInt(value, 10);
        if (!isNaN(val) && val > 0 && val <= this.ABSOLUTE_MAX) {
            localStorage.setItem(this.RANGE_MAX_KEY, val.toString());
            return true;
        }
        return false;
    },

    getRange() {
        return {
            min: this.getRangeMin(),
            max: this.getRangeMax(),
        };
    },

    setRange(min, max) {
        const validMin = this.setRangeMin(min);
        const validMax = this.setRangeMax(max);
        return validMin && validMax;
    },

    getFreqMin() {
        try {
            const stored = localStorage.getItem(this.FREQ_MIN_KEY);
            if (stored) {
                const val = parseInt(stored, 10);
                if (!isNaN(val) && val >= this.ABSOLUTE_FREQ_MIN && val < this.ABSOLUTE_FREQ_MAX) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_FREQ_MIN;
    },

    setFreqMin(value) {
        const val = parseInt(value, 10);
        let effectiveMax = this.DEFAULT_FREQ_MAX;
        try {
            const storedMax = localStorage.getItem(this.FREQ_MAX_KEY);
            if (storedMax) {
                const parsedMax = parseInt(storedMax, 10);
                if (!isNaN(parsedMax) && parsedMax > this.ABSOLUTE_FREQ_MIN && parsedMax <= this.ABSOLUTE_FREQ_MAX) {
                    effectiveMax = parsedMax;
                }
            }
        } catch {
            /* ignore and use default max */
        }
        if (!isNaN(val) && val >= this.ABSOLUTE_FREQ_MIN && val < effectiveMax) {
            localStorage.setItem(this.FREQ_MIN_KEY, val.toString());
            return true;
        }
        return false;
    },

    getFreqMax() {
        try {
            const storedMax = localStorage.getItem(this.FREQ_MAX_KEY);
            if (storedMax) {
                const maxVal = parseInt(storedMax, 10);
                if (!isNaN(maxVal) && maxVal > this.ABSOLUTE_FREQ_MIN && maxVal <= this.ABSOLUTE_FREQ_MAX) {
                    try {
                        const storedMin = localStorage.getItem(this.FREQ_MIN_KEY);
                        if (storedMin) {
                            const minVal = parseInt(storedMin, 10);
                            if (!isNaN(minVal) && maxVal <= minVal) {
                                return this.DEFAULT_FREQ_MAX;
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                    return maxVal;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_FREQ_MAX;
    },

    setFreqMax(value) {
        const maxVal = parseInt(value, 10);
        if (!isNaN(maxVal) && maxVal > this.ABSOLUTE_FREQ_MIN && maxVal <= this.ABSOLUTE_FREQ_MAX) {
            try {
                const storedMin = localStorage.getItem(this.FREQ_MIN_KEY);
                if (storedMin) {
                    const minVal = parseInt(storedMin, 10);
                    if (!isNaN(minVal) && maxVal <= minVal) {
                        return false;
                    }
                }
            } catch {
                /* ignore */
            }
            localStorage.setItem(this.FREQ_MAX_KEY, maxVal.toString());
            return true;
        }
        return false;
    },

    getFreqRange() {
        return {
            min: this.getFreqMin(),
            max: this.getFreqMax(),
        };
    },

    setFreqRange(min, max) {
        const validMax = this.setFreqMax(max);
        const validMin = this.setFreqMin(min);
        return validMin && validMax;
    },

    getPreamp() {
        try {
            const stored = localStorage.getItem(this.PREAMP_KEY);
            if (stored) {
                const val = parseFloat(stored);
                if (!isNaN(val) && val >= this.PREAMP_MIN && val <= this.PREAMP_MAX) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_PREAMP;
    },

    setPreamp(value) {
        const val = parseFloat(value);
        if (!isNaN(val) && val >= this.PREAMP_MIN && val <= this.PREAMP_MAX) {
            localStorage.setItem(this.PREAMP_KEY, val.toString());
            return true;
        }
        return false;
    },

    getGains(bandCount) {
        const count = bandCount || this.getBandCount();
        try {
            const stored = localStorage.getItem(this.GAINS_KEY);
            if (stored) {
                const gains = JSON.parse(stored);
                if (Array.isArray(gains)) {
                    if (gains.length === count) {
                        return gains;
                    }
                    if (gains.length > 0) {
                        return this._interpolateGains(gains, count);
                    }
                }
            }
        } catch {
            /* ignore */
        }
        return new Array(count).fill(0);
    },

    setGains(gains) {
        try {
            if (Array.isArray(gains) && gains.length >= this.MIN_BANDS && gains.length <= this.MAX_BANDS) {
                localStorage.setItem(this.GAINS_KEY, JSON.stringify(gains));
            }
        } catch (e) {
            console.warn('[EQ] Failed to save gains:', e);
        }
    },

    _interpolateGains(sourceGains, targetCount) {
        if (sourceGains.length === targetCount) {
            return [...sourceGains];
        }

        const result = [];
        for (let i = 0; i < targetCount; i++) {
            const sourceIndex = (i / (targetCount - 1)) * (sourceGains.length - 1);
            const indexLow = Math.floor(sourceIndex);
            const indexHigh = Math.min(Math.ceil(sourceIndex), sourceGains.length - 1);
            const fraction = sourceIndex - indexLow;

            const lowValue = sourceGains[indexLow] || 0;
            const highValue = sourceGains[indexHigh] || 0;
            const interpolated = lowValue + (highValue - lowValue) * fraction;
            result.push(Math.round(interpolated * 10) / 10);
        }
        return result;
    },

    getPreset() {
        try {
            return localStorage.getItem(this.PRESET_KEY) || 'flat';
        } catch {
            return 'flat';
        }
    },

    setPreset(preset) {
        localStorage.setItem(this.PRESET_KEY, preset);
    },

    getCustomPresets() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_PRESETS_KEY);
            if (stored) {
                const presets = JSON.parse(stored);
                if (typeof presets === 'object' && presets !== null) {
                    return presets;
                }
            }
        } catch {
            /* ignore */
        }
        return {};
    },

    saveCustomPreset(name, gains) {
        try {
            if (!name || !Array.isArray(gains) || gains.length < this.MIN_BANDS || gains.length > this.MAX_BANDS) {
                console.warn('[EQ] Invalid preset data');
                return false;
            }

            const sanitizedName = name
                .trim()
                .substring(0, 50)
                .replace(/[^\w\s-]/g, '');
            if (!sanitizedName) {
                console.warn('[EQ] Invalid preset name');
                return false;
            }

            const presets = this.getCustomPresets();
            const presetId = 'custom_' + Date.now();

            presets[presetId] = {
                name: sanitizedName,
                gains: gains.map((g) => Math.round(g * 10) / 10),
                bandCount: gains.length,
                createdAt: Date.now(),
            };

            localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
            return presetId;
        } catch (e) {
            console.warn('[EQ] Failed to save custom preset:', e);
            return false;
        }
    },

    deleteCustomPreset(presetId) {
        try {
            const presets = this.getCustomPresets();
            if (presets[presetId]) {
                delete presets[presetId];
                localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
                return true;
            }
            return false;
        } catch (e) {
            console.warn('[EQ] Failed to delete custom preset:', e);
            return false;
        }
    },

    updateCustomPreset(presetId, name, gains) {
        try {
            const presets = this.getCustomPresets();
            if (!presets[presetId]) {
                return false;
            }

            if (name !== undefined) {
                const sanitizedName = name
                    .trim()
                    .substring(0, 50)
                    .replace(/[^\w\s-]/g, '');
                if (sanitizedName) {
                    presets[presetId].name = sanitizedName;
                }
            }

            if (Array.isArray(gains) && gains.length === this.DEFAULT_BAND_COUNT) {
                presets[presetId].gains = gains.map((g) => Math.round(g * 10) / 10);
                presets[presetId].updatedAt = Date.now();
            }

            localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
            return true;
        } catch (e) {
            console.warn('[EQ] Failed to update custom preset:', e);
            return false;
        }
    },
};
