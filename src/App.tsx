import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import MainView from './components/MainView';
import RightSidebar from './components/RightSidebar';
import ArtistView from './components/ArtistView';
import LibraryView from './components/LibraryView';
import PlaylistView from './components/PlaylistView';
import SettingsView from './components/SettingsView';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import AboutModal from './components/AboutModal';
import AudioPanel from './components/AudioPanel';
import FullscreenPlayer from './components/FullscreenPlayer';
import SyncModal from './components/SyncModal';
import HistoryView from './components/HistoryView';
import ProfileView from './components/ProfileView';
import ProfileEditModal from './components/ProfileEditModal';
import { usePlayer } from './context/PlayerContext';
import { AnimatePresence, motion } from 'motion/react';
import { useKeyboardShortcuts } from './lib/keyboard-shortcuts';
import { audioEngine } from './lib/audio-engine';

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const homeKeyRef = useRef(0);
  const {
    activeView, toastMessage,
    isAudioPanelOpen, setIsAudioPanelOpen,
    isFullscreen, setIsFullscreen,
    isQueueOpen, setIsQueueOpen,
    togglePlay, setVolume,
  } = usePlayer();

  // Auto-detect sync import from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#sync=')) {
      setIsSyncOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleTogglePlay = useCallback(() => togglePlay(), [togglePlay]);
  const handlePlayNext = useCallback(() => audioEngine.playNext(), []);
  const handlePlayPrev = useCallback(() => audioEngine.playPrev(), []);
  const handleToggleShuffle = useCallback(() => audioEngine.toggleShuffle(), []);
  const handleToggleRepeat = useCallback(() => audioEngine.toggleRepeat(), []);
  const handleSetVolume = useCallback((v: number) => audioEngine.setVolume(v), []);
  const handleSeekRelative = useCallback((s: number) => {
    const el = audioEngine.getAudioElement();
    const time = el.currentTime + s;
    audioEngine.seekTo(Math.max(0, Math.min(time, el.duration || 0)));
  }, []);
  const handleToggleMute = useCallback(() => audioEngine.toggleMute(), []);
  const handleToggleFullscreen = useCallback(() => setIsFullscreen(!isFullscreen), [isFullscreen, setIsFullscreen]);
  const handleToggleQueue = useCallback(() => setIsQueueOpen(!isQueueOpen), [isQueueOpen, setIsQueueOpen]);
  const handleToggleLyrics = useCallback(() => {
    if (!isFullscreen) setIsFullscreen(true);
  }, [isFullscreen, setIsFullscreen]);

  useKeyboardShortcuts({
    togglePlay: handleTogglePlay,
    playNext: handlePlayNext,
    playPrev: handlePlayPrev,
    toggleShuffle: handleToggleShuffle,
    toggleRepeat: handleToggleRepeat,
    setVolume: handleSetVolume,
    seekRelative: handleSeekRelative,
    toggleMute: handleToggleMute,
    toggleFullscreen: handleToggleFullscreen,
    toggleQueue: handleToggleQueue,
    toggleLyrics: handleToggleLyrics,
  });

  return (
    <div className="flex h-[100dvh] w-full bg-[#F2F4F8] dark:bg-[#000000] text-slate-800 dark:text-slate-200 p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden font-sans selection:bg-indigo-200 dark:selection:bg-indigo-500/30">

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Responsive Container */}
      <div className={`fixed inset-y-2 left-2 md:static md:inset-auto z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'} md:translate-x-0 transition-transform duration-300 ease-in-out md:flex h-[calc(100dvh-1rem)] md:h-full`}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} onOpenProfile={() => setShowProfile(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {showHistory ? (
          <HistoryView onBack={() => setShowHistory(false)} />
        ) : showProfile ? (
          <ProfileView onBack={() => setShowProfile(false)} onEditProfile={() => setIsProfileEditOpen(true)} refreshKey={profileRefreshKey} />
        ) : activeView === 'home' ? (
          <MainView resetKey={homeKeyRef.current++} onMenuClick={() => setIsMobileMenuOpen(true)} onOpenHistory={() => setShowHistory(true)} />
        ) : activeView === 'library' ? (
          <LibraryView onMenuClick={() => setIsMobileMenuOpen(true)} />
        ) : activeView === 'playlist' ? (
          <PlaylistView onMenuClick={() => setIsMobileMenuOpen(true)} />
        ) : activeView === 'settings' ? (
          <SettingsView onMenuClick={() => setIsMobileMenuOpen(true)} onSyncOpen={() => setIsSyncOpen(true)} onOpenProfile={() => setShowProfile(true)} />
        ) : (
          <ArtistView onMenuClick={() => setIsMobileMenuOpen(true)} />
        )}
        <Player />
      </div>
      <div className="hidden 2xl:flex h-full">
        <RightSidebar />
      </div>

      <CreatePlaylistModal />
      <AboutModal />
      <AudioPanel isOpen={isAudioPanelOpen} onClose={() => setIsAudioPanelOpen(false)} />
      <FullscreenPlayer />
      <SyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} />
      <ProfileEditModal isOpen={isProfileEditOpen} onClose={() => setIsProfileEditOpen(false)} onSaved={() => setProfileRefreshKey(k => k + 1)} />

      {/* Global Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-[100] border border-slate-700/50"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
