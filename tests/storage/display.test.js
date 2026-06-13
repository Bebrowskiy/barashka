import { describe, it, expect, beforeEach } from 'vitest';
import {
    nowPlayingSettings,
    fullscreenCoverClickSettings,
    lyricsSettings,
    backgroundSettings,
    dynamicColorSettings,
    cardSettings,
    waveformSettings,
    smoothScrollingSettings,
    qualityBadgeSettings,
    trackDateSettings,
    coverArtSizeSettings,
} from '../../js/storage/display.js';

describe('nowPlayingSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default mode "cover"', () => {
        expect(nowPlayingSettings.getMode()).toBe('cover');
    });

    it('sets and gets mode', () => {
        nowPlayingSettings.setMode('visualizer');
        expect(nowPlayingSettings.getMode()).toBe('visualizer');
    });
});

describe('fullscreenCoverClickSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default action "exit"', () => {
        expect(fullscreenCoverClickSettings.getAction()).toBe('exit');
    });

    it('sets and gets action', () => {
        fullscreenCoverClickSettings.setAction('lyrics');
        expect(fullscreenCoverClickSettings.getAction()).toBe('lyrics');
    });
});

describe('lyricsSettings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to false', () => {
        expect(lyricsSettings.shouldDownloadLyrics()).toBe(false);
    });

    it('toggles download lyrics', () => {
        lyricsSettings.setDownloadLyrics(true);
        expect(lyricsSettings.shouldDownloadLyrics()).toBe(true);
    });
});

describe('backgroundSettings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to true', () => {
        expect(backgroundSettings.isEnabled()).toBe(true);
    });

    it('toggles', () => {
        backgroundSettings.setEnabled(false);
        expect(backgroundSettings.isEnabled()).toBe(false);
    });
});

describe('dynamicColorSettings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to true', () => {
        expect(dynamicColorSettings.isEnabled()).toBe(true);
    });
});

describe('cardSettings', () => {
    beforeEach(() => localStorage.clear());

    it('compact artist defaults to true', () => {
        expect(cardSettings.isCompactArtist()).toBe(true);
    });

    it('compact album defaults to false', () => {
        expect(cardSettings.isCompactAlbum()).toBe(false);
    });

    it('toggles compact artist', () => {
        cardSettings.setCompactArtist(false);
        expect(cardSettings.isCompactArtist()).toBe(false);
    });
});

describe('waveformSettings', () => {
    beforeEach(() => localStorage.clear());

    it('is disabled by default', () => {
        expect(waveformSettings.isEnabled()).toBe(false);
    });
});

describe('smoothScrollingSettings', () => {
    beforeEach(() => localStorage.clear());

    it('is disabled by default', () => {
        expect(smoothScrollingSettings.isEnabled()).toBe(false);
    });
});

describe('qualityBadgeSettings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to true', () => {
        expect(qualityBadgeSettings.isEnabled()).toBe(true);
    });
});

describe('trackDateSettings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to true', () => {
        expect(trackDateSettings.useAlbumYear()).toBe(true);
    });
});

describe('coverArtSizeSettings', () => {
    beforeEach(() => localStorage.clear());

    it('returns default size "1280"', () => {
        expect(coverArtSizeSettings.getSize()).toBe('1280');
    });

    it('sets and gets size', () => {
        coverArtSizeSettings.setSize('640');
        expect(coverArtSizeSettings.getSize()).toBe('640');
    });
});
