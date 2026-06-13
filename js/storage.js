//storage.js — Re-exports from js/storage/* domain modules
// This file exists for backward compatibility. All imports from './storage.js' continue to work.
export { apiSettings } from './storage/api-settings.js';
export { recentActivityManager } from './storage/recent.js';
export { themeManager } from './storage/theme.js';
export {
    lastFMStorage,
    listenBrainzSettings,
    malojaSettings,
    libreFmSettings,
} from './storage/scrobbling.js';
export {
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
} from './storage/display.js';
export {
    replayGainSettings,
    monoAudioSettings,
    exponentialVolumeSettings,
    audioEffectsSettings,
    crossfadeSettings,
    equalizerSettings,
} from './storage/audio.js';
export {
    downloadQualitySettings,
    losslessContainerSettings,
    bulkDownloadSettings,
} from './storage/download.js';
export { playlistSettings } from './storage/playlist.js';
export { visualizerSettings } from './storage/visualizer.js';
export {
    settingsUiState,
    queueManager,
    sidebarSettings,
    modalSettings,
    sidebarSectionSettings,
} from './storage/ui-state.js';
export { homePageSettings } from './storage/home.js';
export { analyticsSettings } from './storage/analytics.js';
export { pwaUpdateSettings } from './storage/pwa.js';
export { musicProviderSettings } from './storage/music-provider.js';
export { contentBlockingSettings } from './storage/content-blocking.js';
export { keyboardShortcuts } from './storage/keyboard.js';
export { fontSettings } from './storage/font.js';
