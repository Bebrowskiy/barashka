import { describe, it, expect, beforeEach } from 'vitest';
import {
    replayGainSettings,
    monoAudioSettings,
    exponentialVolumeSettings,
    audioEffectsSettings,
    crossfadeSettings,
    equalizerSettings,
} from '../../js/storage/audio.js';

describe('replayGainSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default mode "track"', () => {
        expect(replayGainSettings.getMode()).toBe('track');
    });

    it('sets and gets mode', () => {
        replayGainSettings.setMode('album');
        expect(replayGainSettings.getMode()).toBe('album');
    });

    it('returns default preamp 3', () => {
        expect(replayGainSettings.getPreamp()).toBe(3);
    });

    it('sets and gets preamp', () => {
        replayGainSettings.setPreamp(5);
        expect(replayGainSettings.getPreamp()).toBe(5);
    });
});

describe('monoAudioSettings', () => {
    beforeEach(() => localStorage.clear());

    it('is disabled by default', () => {
        expect(monoAudioSettings.isEnabled()).toBe(false);
    });

    it('toggles enabled state', () => {
        monoAudioSettings.setEnabled(true);
        expect(monoAudioSettings.isEnabled()).toBe(true);
        monoAudioSettings.setEnabled(false);
        expect(monoAudioSettings.isEnabled()).toBe(false);
    });
});

describe('exponentialVolumeSettings', () => {
    beforeEach(() => localStorage.clear());

    it('is disabled by default', () => {
        expect(exponentialVolumeSettings.isEnabled()).toBe(false);
    });

    it('returns linear volume when disabled', () => {
        expect(exponentialVolumeSettings.applyCurve(0.5)).toBe(0.5);
    });

    it('applies cubic curve when enabled', () => {
        exponentialVolumeSettings.setEnabled(true);
        expect(exponentialVolumeSettings.applyCurve(0.5)).toBeCloseTo(0.125, 5);
    });

    it('inverse curve returns cbrt when enabled', () => {
        exponentialVolumeSettings.setEnabled(true);
        expect(exponentialVolumeSettings.inverseCurve(0.125)).toBeCloseTo(0.5, 5);
    });
});

describe('audioEffectsSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default speed 1.0', () => {
        expect(audioEffectsSettings.getSpeed()).toBe(1.0);
    });

    it('clamps speed to valid range', () => {
        audioEffectsSettings.setSpeed(0.001);
        expect(audioEffectsSettings.getSpeed()).toBe(0.01);
        audioEffectsSettings.setSpeed(200);
        expect(audioEffectsSettings.getSpeed()).toBe(100);
    });

    it('preserve pitch defaults to true', () => {
        expect(audioEffectsSettings.isPreservePitchEnabled()).toBe(true);
    });
});

describe('crossfadeSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns defaults when nothing stored', () => {
        const s = crossfadeSettings.get();
        expect(s.enabled).toBe(false);
        expect(s.duration).toBe(5000);
        expect(s.curve).toBe('logarithmic');
    });

    it('toggles enabled', () => {
        const result = crossfadeSettings.toggle();
        expect(result).toBe(true);
        expect(crossfadeSettings.isEnabled()).toBe(true);
    });

    it('clamps duration to min/max', () => {
        crossfadeSettings.setDuration(0);
        expect(crossfadeSettings.getDuration()).toBe(1000);
        crossfadeSettings.setDuration(99999);
        expect(crossfadeSettings.getDuration()).toBe(30000);
    });

    it('validates curve', () => {
        expect(crossfadeSettings.setCurve('invalid')).toBe(false);
        expect(crossfadeSettings.setCurve('sine')).toBe(true);
        expect(crossfadeSettings.getCurve()).toBe('sine');
    });
});

describe('equalizerSettings', () => {
    beforeEach(() => localStorage.clear());

    it('is disabled by default', () => {
        expect(equalizerSettings.isEnabled()).toBe(false);
    });

    it('returns default band count 16', () => {
        expect(equalizerSettings.getBandCount()).toBe(16);
    });

    it('clamps band count', () => {
        equalizerSettings.setBandCount(1);
        expect(equalizerSettings.getBandCount()).toBe(equalizerSettings.MIN_BANDS);
        equalizerSettings.setBandCount(100);
        expect(equalizerSettings.getBandCount()).toBe(equalizerSettings.MAX_BANDS);
    });

    it('returns flat gains by default', () => {
        const gains = equalizerSettings.getGains(16);
        expect(gains).toHaveLength(16);
        expect(gains.every((g) => g === 0)).toBe(true);
    });

    it('saves and loads gains', () => {
        const gains = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        equalizerSettings.setGains(gains);
        const loaded = equalizerSettings.getGains(16);
        expect(loaded).toEqual(gains);
    });

    it('interpolates gains when band count changes', () => {
        equalizerSettings.setGains([0, 10, 0]);
        const interpolated = equalizerSettings.getGains(5);
        expect(interpolated).toHaveLength(5);
    });

    it('returns default range', () => {
        const range = equalizerSettings.getRange();
        expect(range.min).toBe(-30);
        expect(range.max).toBe(30);
    });

    it('validates range min/max', () => {
        expect(equalizerSettings.setRangeMin(5)).toBe(false);
        expect(equalizerSettings.setRangeMin(-30)).toBe(true);
        expect(equalizerSettings.setRangeMax(-5)).toBe(false);
        expect(equalizerSettings.setRangeMax(30)).toBe(true);
    });

    it('returns default preamp 0', () => {
        expect(equalizerSettings.getPreamp()).toBe(0);
    });

    it('validates preamp range', () => {
        expect(equalizerSettings.setPreamp(-25)).toBe(false);
        expect(equalizerSettings.setPreamp(25)).toBe(false);
        expect(equalizerSettings.setPreamp(5)).toBe(true);
    });

    it('saves and loads custom presets', () => {
        const id = equalizerSettings.saveCustomPreset('Test', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        expect(id).toBeTruthy();
        const presets = equalizerSettings.getCustomPresets();
        expect(presets[id]).toBeDefined();
        expect(presets[id].name).toBe('Test');
    });

    it('deletes custom preset', () => {
        const id = equalizerSettings.saveCustomPreset('Del', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        expect(equalizerSettings.deleteCustomPreset(id)).toBe(true);
        expect(equalizerSettings.getCustomPresets()[id]).toBeUndefined();
    });
});
