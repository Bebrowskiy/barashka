import { describe, it, expect, beforeEach } from 'vitest';
import { visualizerSettings } from '../../js/storage/visualizer.js';

describe('visualizerSettings', () => {
    beforeEach(() => localStorage.clear());

    it('is enabled by default', () => {
        expect(visualizerSettings.isEnabled()).toBe(true);
    });

    it('returns default preset "butterchurn"', () => {
        expect(visualizerSettings.getPreset()).toBe('butterchurn');
    });

    it('returns default mode "solid"', () => {
        expect(visualizerSettings.getMode()).toBe('solid');
    });

    it('returns default sensitivity 1.0', () => {
        expect(visualizerSettings.getSensitivity()).toBe(1.0);
    });

    it('smart intensity defaults to true', () => {
        expect(visualizerSettings.isSmartIntensityEnabled()).toBe(true);
    });

    it('butterchurn cycle defaults to 30s', () => {
        expect(visualizerSettings.getButterchurnCycleDuration()).toBe(30);
    });

    it('sets and gets preset', () => {
        visualizerSettings.setPreset('particles');
        expect(visualizerSettings.getPreset()).toBe('particles');
    });

    it('sets and gets sensitivity', () => {
        visualizerSettings.setSensitivity(2.5);
        expect(visualizerSettings.getSensitivity()).toBe(2.5);
    });
});
