import { describe, it, expect, beforeEach } from 'vitest';
import { playlistSettings } from '../../js/storage/playlist.js';

describe('playlistSettings', () => {
    beforeEach(() => localStorage.clear());

    it('M3U defaults to true', () => {
        expect(playlistSettings.shouldGenerateM3U()).toBe(true);
    });

    it('M3U8 defaults to false', () => {
        expect(playlistSettings.shouldGenerateM3U8()).toBe(false);
    });

    it('CUE defaults to false', () => {
        expect(playlistSettings.shouldGenerateCUE()).toBe(false);
    });

    it('relative paths defaults to true', () => {
        expect(playlistSettings.shouldUseRelativePaths()).toBe(true);
    });

    it('separate discs defaults to true', () => {
        expect(playlistSettings.shouldSeparateDiscsInZip()).toBe(true);
    });

    it('toggles M3U generation', () => {
        playlistSettings.setGenerateM3U(false);
        expect(playlistSettings.shouldGenerateM3U()).toBe(false);
    });

    it('toggles relative paths', () => {
        playlistSettings.setUseRelativePaths(false);
        expect(playlistSettings.shouldUseRelativePaths()).toBe(false);
    });
});
