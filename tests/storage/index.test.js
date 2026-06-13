import { describe, it, expect } from 'vitest';
import {
    apiSettings,
    recentActivityManager,
    themeManager,
    lastFMStorage,
    listenBrainzSettings,
    malojaSettings,
    libreFmSettings,
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
    replayGainSettings,
    monoAudioSettings,
    exponentialVolumeSettings,
    audioEffectsSettings,
    crossfadeSettings,
    equalizerSettings,
    downloadQualitySettings,
    losslessContainerSettings,
    bulkDownloadSettings,
    playlistSettings,
    visualizerSettings,
    settingsUiState,
    queueManager,
    sidebarSettings,
    modalSettings,
    sidebarSectionSettings,
    homePageSettings,
    analyticsSettings,
    pwaUpdateSettings,
    musicProviderSettings,
    contentBlockingSettings,
    keyboardShortcuts,
    fontSettings,
} from '../../js/storage/index.js';

describe('storage/index.js re-exports', () => {
    it('exports all 41 settings objects', () => {
        expect(apiSettings).toBeDefined();
        expect(recentActivityManager).toBeDefined();
        expect(themeManager).toBeDefined();
        expect(lastFMStorage).toBeDefined();
        expect(listenBrainzSettings).toBeDefined();
        expect(malojaSettings).toBeDefined();
        expect(libreFmSettings).toBeDefined();
        expect(nowPlayingSettings).toBeDefined();
        expect(fullscreenCoverClickSettings).toBeDefined();
        expect(lyricsSettings).toBeDefined();
        expect(backgroundSettings).toBeDefined();
        expect(dynamicColorSettings).toBeDefined();
        expect(cardSettings).toBeDefined();
        expect(waveformSettings).toBeDefined();
        expect(smoothScrollingSettings).toBeDefined();
        expect(qualityBadgeSettings).toBeDefined();
        expect(trackDateSettings).toBeDefined();
        expect(coverArtSizeSettings).toBeDefined();
        expect(replayGainSettings).toBeDefined();
        expect(monoAudioSettings).toBeDefined();
        expect(exponentialVolumeSettings).toBeDefined();
        expect(audioEffectsSettings).toBeDefined();
        expect(crossfadeSettings).toBeDefined();
        expect(equalizerSettings).toBeDefined();
        expect(downloadQualitySettings).toBeDefined();
        expect(losslessContainerSettings).toBeDefined();
        expect(bulkDownloadSettings).toBeDefined();
        expect(playlistSettings).toBeDefined();
        expect(visualizerSettings).toBeDefined();
        expect(settingsUiState).toBeDefined();
        expect(queueManager).toBeDefined();
        expect(sidebarSettings).toBeDefined();
        expect(modalSettings).toBeDefined();
        expect(sidebarSectionSettings).toBeDefined();
        expect(homePageSettings).toBeDefined();
        expect(analyticsSettings).toBeDefined();
        expect(pwaUpdateSettings).toBeDefined();
        expect(musicProviderSettings).toBeDefined();
        expect(contentBlockingSettings).toBeDefined();
        expect(keyboardShortcuts).toBeDefined();
        expect(fontSettings).toBeDefined();
    });

    it('backward compat: storage.js re-exports match', async () => {
        const compat = await import('../../js/storage.js');
        expect(compat.apiSettings).toBe(apiSettings);
        expect(compat.themeManager).toBe(themeManager);
        expect(compat.equalizerSettings).toBe(equalizerSettings);
        expect(compat.keyboardShortcuts).toBe(keyboardShortcuts);
    });
});
