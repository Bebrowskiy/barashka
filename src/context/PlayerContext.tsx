import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { audioEngine, type PlayerState } from '../lib/audio-engine';
import { musicAPI } from '../lib/music-api';
import { db } from '../lib/db';
import { themeSettings, contentBlockingSettings, discordRPCSettings } from '../lib/storage';
import { scrobbler } from '../lib/scrobbler';
import { discordRPC } from '../lib/discord-rpc';
import type { Track, Artist, Playlist, RepeatMode, QualityPreset } from '../types';
import { REPEAT_MODE } from '../types';

export interface ArtistState {
    id: string;
    name: string;
    avatar: string;
    monthlyListeners?: string;
    verified?: boolean;
}

interface PlayerContextType {
    currentTrack: Track | null;
    setCurrentTrack: (track: Track) => void;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    togglePlay: () => void;
    likedTracks: Set<string>;
    toggleLike: (id: string, e?: React.MouseEvent) => void;
    isShuffle: boolean;
    toggleShuffle: () => void;
    isRepeat: RepeatMode;
    toggleRepeat: () => void;
    volume: number;
    setVolume: (val: number) => void;
    isFullscreen: boolean;
    setIsFullscreen: (val: boolean) => void;
    isQueueOpen: boolean;
    setIsQueueOpen: (val: boolean) => void;
    playTrack: (id: string) => void;
    playTrackWithQueue: (track: Track, queue?: Track[], startIndex?: number) => void;

    queue: Track[];
    addToQueue: (tracks: Track[]) => void;
    addNextToQueue: (tracks: Track[]) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    moveInQueue: (from: number, to: number) => void;

    currentTime: number;
    duration: number;
    seekTo: (time: number) => void;

    activeMix: string | null;
    toggleMix: (mixId: string) => void;
    activeView: 'home' | 'artist' | 'library' | 'playlist' | 'settings' | 'search';
    setActiveView: (view: 'home' | 'artist' | 'library' | 'playlist' | 'settings' | 'search') => void;
    selectedArtist: ArtistState | null;
    openArtist: (artist: ArtistState | string) => void;

    selectedPlaylist: Playlist | null;
    openPlaylist: (playlist: any) => void;
    refreshPlaylists: () => Promise<void>;
    userPlaylists: Playlist[];
    addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
    removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
    deletePlaylist: (playlistId: string) => Promise<void>;
    updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => Promise<void>;

    isCreatePlaylistOpen: boolean;
    setIsCreatePlaylistOpen: (val: boolean) => void;

    isAboutOpen: boolean;
    setIsAboutOpen: (val: boolean) => void;

    isAudioPanelOpen: boolean;
    setIsAudioPanelOpen: (val: boolean) => void;

    theme: 'light' | 'dark' | 'system';
    setTheme: (val: 'light' | 'dark' | 'system') => void;

    toastMessage: string | null;
    showToast: (msg: string) => void;

    quality: QualityPreset;
    setQuality: (val: QualityPreset) => void;

    audioEngine: typeof audioEngine;
    accentColor: string | null;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [playerState, setPlayerState] = useState<PlayerState>(audioEngine.getState());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [activeMix, setActiveMix] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'home' | 'artist' | 'library' | 'playlist' | 'settings' | 'search'>('home');
    const [selectedArtist, setSelectedArtist] = useState<ArtistState | null>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
    const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
        return themeSettings.get() || 'system';
    });
    const [accentColor, setAccentColor] = useState<string | null>(null);

    // Subscribe to audio engine state
    useEffect(() => {
        return audioEngine.subscribe((state) => {
            setPlayerState(state);
        });
    }, []);

    // Add to history when track finishes playing
    useEffect(() => {
        return audioEngine.subscribeTrackEnd((track) => {
            db.addToHistory(track).catch(console.error);
        });
    }, []);

    // Init Discord RPC only if enabled in settings
    useEffect(() => {
        const settings = discordRPCSettings.get();
        if (settings.enabled) {
            discordRPC.init();
            return () => discordRPC.destroy();
        }
    }, []);

    // Re-init Discord RPC when settings change
    useEffect(() => {
        return discordRPCSettings.get;
    }, []);

    // Load liked tracks from DB on mount
    useEffect(() => {
        db.getFavorites('track').then((tracks) => {
            setLikedTracks(new Set(tracks.map(t => t.id)));
        }).catch(console.error);
    }, []);

    // Load playlists from DB on mount
    const refreshPlaylists = useCallback(async () => {
        try {
            const playlists = await db.getPlaylists();
            setUserPlaylists(playlists);
        } catch (err) {
            console.error('Failed to load playlists:', err);
        }
    }, []);

    useEffect(() => {
        refreshPlaylists();
    }, [refreshPlaylists]);

    const addTrackToPlaylist = useCallback(async (playlistId: string, track: Track) => {
        await db.addTrackToPlaylist(playlistId, track);
        await refreshPlaylists();
        // Update selected playlist if it's the one being modified
        setSelectedPlaylist(prev => {
            if (prev?.id === playlistId) {
                const tracks = prev.tracks || [];
                if (!tracks.find(t => t.id === track.id)) {
                    return { ...prev, tracks: [...tracks, track] };
                }
            }
            return prev;
        });
    }, [refreshPlaylists]);

    const removeTrackFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
        await db.removeTrackFromPlaylist(playlistId, trackId);
        await refreshPlaylists();
        setSelectedPlaylist(prev => {
            if (prev?.id === playlistId) {
                return { ...prev, tracks: (prev.tracks || []).filter(t => t.id !== trackId) };
            }
            return prev;
        });
    }, [refreshPlaylists]);

    const deletePlaylist = useCallback(async (playlistId: string) => {
        await db.deletePlaylist(playlistId);
        await refreshPlaylists();
        if (selectedPlaylist?.id === playlistId) {
            setSelectedPlaylist(null);
            setActiveView('library');
        }
    }, [refreshPlaylists, selectedPlaylist?.id]);

    const updatePlaylist = useCallback(async (playlistId: string, updates: Partial<Playlist>) => {
        await db.updatePlaylist(playlistId, updates);
        await refreshPlaylists();
        setSelectedPlaylist(prev => {
            if (prev?.id === playlistId) {
                return { ...prev, ...updates };
            }
            return prev;
        });
    }, [refreshPlaylists]);

    // Theme management
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
        themeSettings.set(theme);
    }, [theme]);

    // Add to history and scrobble when track changes
    useEffect(() => {
        if (playerState.currentTrack) {
            db.addToHistory(playerState.currentTrack).catch(console.error);
            scrobbler.onTrackChange(playerState.currentTrack);
            discordRPC.update(playerState.currentTrack, playerState.isPlaying, playerState.currentTime);
            document.title = `${playerState.currentTrack.title} • ${playerState.currentTrack.artist || 'Barashka'}`;

            if (playerState.currentTrack.cover) {
                import('../lib/vibrant-color').then(({ getVibrantColorFromImage }) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const color = getVibrantColorFromImage(img);
                        setAccentColor(color);
                    };
                    img.src = String(playerState.currentTrack!.cover);
                });
            }
        }
    }, [playerState.currentTrack?.id]);

    // Update Discord RPC on play/pause
    useEffect(() => {
        discordRPC.update(playerState.currentTrack, playerState.isPlaying, playerState.currentTime);
    }, [playerState.isPlaying]);

    // Stop scrobbling when playback stops
    useEffect(() => {
        if (!playerState.isPlaying) {
            scrobbler.onPlaybackStop();
        }
    }, [playerState.isPlaying]);

    const togglePlay = useCallback(() => {
        audioEngine.togglePlayPause();
        setActiveMix(null);
    }, []);

    const toggleLike = useCallback(async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        const queue = audioEngine.getState().queue;
        const currentTrack = audioEngine.getState().currentTrack;
        const track = queue.find(t => t.id === id) || (currentTrack?.id === id ? currentTrack : null);

        if (!track) return;

        const wasLiked = likedTracks.has(id);

        setLikedTracks(prev => {
            const next = new Set(prev);
            if (wasLiked) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

        try {
            await db.toggleFavorite('track', track);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
            setLikedTracks(prev => {
                const next = new Set(prev);
                if (wasLiked) {
                    next.add(id);
                } else {
                    next.delete(id);
                }
                return next;
            });
        }
    }, [likedTracks]);

    const toggleShuffle = useCallback(() => {
        audioEngine.toggleShuffle();
    }, []);

    const toggleRepeat = useCallback(() => {
        audioEngine.toggleRepeat();
    }, []);

    const setVolume = useCallback((val: number) => {
        audioEngine.setVolume(val);
    }, []);

    const seekTo = useCallback((time: number) => {
        audioEngine.seekTo(time);
    }, []);

    const playTrack = useCallback((id: string) => {
        const queue = audioEngine.getState().queue;
        const track = queue.find(t => t.id === id) || playerState.currentTrack;
        if (track && track.id === id) {
            audioEngine.togglePlayPause();
        } else if (track) {
            audioEngine.playTrack(track);
        }
    }, [playerState.currentTrack]);

    const playTrackWithQueue = useCallback((track: Track, queue?: Track[], startIndex?: number) => {
        audioEngine.playTrack(track, queue, startIndex);
    }, []);

    const addToQueue = useCallback((tracks: Track[]) => {
        audioEngine.addToQueue(tracks);
        showToast(`Added ${tracks.length > 1 ? `${tracks.length} tracks` : 'track'} to queue`);
    }, []);

    const addNextToQueue = useCallback((tracks: Track[]) => {
        audioEngine.addNextToQueue(tracks);
        showToast(`Added ${tracks.length > 1 ? `${tracks.length} tracks` : 'track'} next in queue`);
    }, []);

    const removeFromQueue = useCallback((index: number) => {
        audioEngine.removeFromQueue(index);
    }, []);

    const clearQueue = useCallback(() => {
        audioEngine.clearQueue();
    }, []);

    const moveInQueue = useCallback((from: number, to: number) => {
        audioEngine.moveInQueue(from, to);
    }, []);

    const toggleMix = useCallback((mixId: string) => {
        if (activeMix === mixId) {
            audioEngine.togglePlayPause();
        } else {
            setActiveMix(mixId);
            audioEngine.togglePlayPause();
        }
    }, [activeMix]);

    const openArtist = useCallback(async (artist: ArtistState | string | any) => {
        if (typeof artist === 'string') {
            // Search for artist by name to get real ID
            try {
                const result = await musicAPI.searchArtists(artist, { limit: 1 });
                if (result.items.length > 0) {
                    const found = result.items[0];
                    setSelectedArtist({
                        id: found.id || artist.toLowerCase().replace(/\s/g, '-'),
                        name: found.artist || found.title || artist,
                        avatar: found.cover || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist)}&backgroundColor=6366f1`,
                        monthlyListeners: '1.2M',
                        verified: false,
                    });
                } else {
                    setSelectedArtist({
                        id: artist.toLowerCase().replace(/\s/g, '-'),
                        name: artist,
                        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist)}&backgroundColor=6366f1`,
                        monthlyListeners: '1.2M',
                        verified: false,
                    });
                }
            } catch {
                setSelectedArtist({
                    id: artist.toLowerCase().replace(/\s/g, '-'),
                    name: artist,
                    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist)}&backgroundColor=6366f1`,
                    monthlyListeners: '1.2M',
                    verified: false,
                });
            }
        } else {
            // Object passed — normalize the fields
            setSelectedArtist({
                id: artist.id || '',
                name: artist.name || artist.title || artist.artist || 'Unknown',
                avatar: artist.avatar || artist.cover || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist.name || artist.title || '')}&backgroundColor=6366f1`,
                monthlyListeners: artist.monthlyListeners || '1.2M',
                verified: artist.verified || false,
            });
        }
        setActiveView('artist');
    }, []);

    const openPlaylist = useCallback((playlist: any) => {
        if (typeof playlist === 'string') {
            // Special playlists (Liked Tracks, Local Files, etc.) — load from DB
            const slug = playlist.toLowerCase().replace(/\s/g, '-');
            const found = userPlaylists.find(p => p.id === slug || p.title.toLowerCase().replace(/\s/g, '-') === slug);
            if (found) {
                setSelectedPlaylist(found);
            } else {
                setSelectedPlaylist({
                    id: slug,
                    title: playlist,
                    creator: 'Barashka',
                    description: '',
                    cover: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(playlist)}`,
                    tracks: [],
                });
            }
        } else {
            setSelectedPlaylist({
                id: playlist.id || playlist.title?.toLowerCase().replace(/\s/g, '-') || 'unknown',
                title: playlist.title || 'Untitled Playlist',
                creator: playlist.creator || 'Barashka',
                description: playlist.description || '',
                cover: playlist.cover,
                tracks: playlist.tracks || [],
                createdAt: playlist.createdAt,
            });
        }
        setActiveView('playlist');
    }, [userPlaylists]);

    const setTheme = useCallback((val: 'light' | 'dark' | 'system') => {
        setThemeState(val);
    }, []);

    const setQuality = useCallback((val: QualityPreset) => {
        audioEngine.setQuality(val);
    }, []);

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    }, []);

    return (
        <PlayerContext.Provider value={{
            currentTrack: playerState.currentTrack,
            setCurrentTrack: (track: Track) => audioEngine.playTrack(track),
            isPlaying: playerState.isPlaying,
            setIsPlaying: (playing: boolean) => {
                if (playing) audioEngine.togglePlayPause();
                else audioEngine.togglePlayPause();
            },
            togglePlay,
            likedTracks,
            toggleLike,
            isShuffle: playerState.shuffleActive,
            toggleShuffle,
            isRepeat: playerState.repeatMode,
            toggleRepeat,
            volume: playerState.volume,
            setVolume,
            isFullscreen,
            setIsFullscreen,
            isQueueOpen,
            setIsQueueOpen,
            playTrack,
            playTrackWithQueue,

            queue: playerState.queue,
            addToQueue,
            addNextToQueue,
            removeFromQueue,
            clearQueue,
            moveInQueue,

            currentTime: playerState.currentTime,
            duration: playerState.duration,
            seekTo,

            activeMix,
            toggleMix,
            activeView,
            setActiveView,
            selectedArtist,
            openArtist,

            selectedPlaylist,
            openPlaylist,
            refreshPlaylists,
            userPlaylists,
            addTrackToPlaylist,
            removeTrackFromPlaylist,
            deletePlaylist,
            updatePlaylist,

            isCreatePlaylistOpen,
            setIsCreatePlaylistOpen,

            isAboutOpen,
            setIsAboutOpen,

            isAudioPanelOpen,
            setIsAudioPanelOpen,

            theme,
            setTheme,

            toastMessage,
            showToast,

            quality: playerState.quality,
            setQuality,

            audioEngine,
            accentColor,
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
}
