import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Bell, Clock, Play, Pause, Heart, Menu, Loader2, RefreshCw, Music, Disc, User, X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from '../context/PlayerContext';
import { musicAPI } from '../lib/music-api';
import { db } from '../lib/db';
import { shouldHideTrack, blockTrack } from '../lib/storage';
import { useI18n } from '../lib/i18n';
import ContextMenu from './ContextMenu';
import AddToPlaylistPicker from './AddToPlaylistPicker';
import type { Track } from '../types';

interface MainViewProps {
    onMenuClick?: () => void;
    onOpenHistory?: () => void;
    resetKey?: number;
}

export default function MainView({ onMenuClick, onOpenHistory, resetKey }: MainViewProps) {
    const {
        currentTrack,
        isPlaying, togglePlay,
        likedTracks, toggleLike,
        activeMix, toggleMix,
        openArtist,
        openPlaylist,
        showToast,
        playTrackWithQueue,
        addToQueue,
        addNextToQueue,
        setIsCreatePlaylistOpen,
    } = usePlayer();
    const { t } = useI18n();

    const [recentTracks, setRecentTracks] = useState<Track[]>([]);
    const [mixTracks, setMixTracks] = useState<Track[]>([]);
    const [mixLoading, setMixLoading] = useState(false);
    const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
    const [recommendedAlbums, setRecommendedAlbums] = useState<any[]>([]);
    const [recommendedArtists, setRecommendedArtists] = useState<any[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [loadingAlbums, setLoadingAlbums] = useState(true);
    const [loadingArtists, setLoadingArtists] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ tracks: Track[]; albums: any[]; artists: any[] }>({ tracks: [], albums: [], artists: [] });
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; track: Track | null; position: { x: number; y: number } }>({ isOpen: false, track: null, position: { x: 0, y: 0 } });
    const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('barashka-search-history') || '[]');
        } catch { return []; }
    });
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load content on mount
    // Clear search when navigating back to home
    useEffect(() => {
        setSearchQuery('');
        setSearchResults({ tracks: [], albums: [], artists: [] });
        setIsSearchFocused(false);
    }, [resetKey]);

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        setLoadingTracks(true);
        setLoadingAlbums(true);
        setLoadingArtists(true);

        // Load history for mix seeds
        try {
            const history = await db.getHistory(20);
            setRecentTracks(history.slice(0, 10));
        } catch {}

        // Load recommended tracks
        try {
            const result = await musicAPI.searchTracks('popular music 2026', { limit: 12 });
            setRecommendedTracks(result.items);
        } catch {
            setRecommendedTracks([]);
        } finally {
            setLoadingTracks(false);
        }

        // Load recommended albums
        try {
            const result = await musicAPI.searchAlbums('popular music playlists', { limit: 10 });
            setRecommendedAlbums(result.items);
        } catch {
            setRecommendedAlbums([]);
        } finally {
            setLoadingAlbums(false);
        }

        // Load recommended artists
        try {
            const result = await musicAPI.searchArtists('popular artists music', { limit: 10 });
            setRecommendedArtists(result.items);
        } catch {
            setRecommendedArtists([]);
        } finally {
            setLoadingArtists(false);
        }
    };

    // Mix functionality
    const startMix = useCallback(async () => {
        if (activeMix === 'daily-fluff' && isPlaying) {
            toggleMix('daily-fluff');
            return;
        }

        setMixLoading(true);
        try {
            // Get seeds from history
            const history = await db.getHistory(10);
            let tracks: Track[] = [];

            if (history.length > 0) {
                // Try to get recommendations based on history
                const seedTrack = history[0];
                try {
                    const recs = await musicAPI.getTrackRecommendations(seedTrack.id);
                    if (recs.length > 0) {
                        tracks = recs;
                    }
                } catch {}
            }

            // Fallback: search for popular/relaxing music
            if (tracks.length === 0) {
                const queries = ['relaxing music', 'chill vibes', 'peaceful ambient', 'lofi hip hop'];
                const query = queries[Math.floor(Math.random() * queries.length)];
                const result = await musicAPI.searchTracks(query, { limit: 20 });
                tracks = result.items;
            }

            if (tracks.length > 0) {
                setMixTracks(tracks);
                playTrackWithQueue(tracks[0], tracks, 0);
                toggleMix('daily-fluff');
                showToast('Mix started');
            } else {
                showToast('Could not load mix tracks');
            }
        } catch (e) {
            console.error('Mix error:', e);
            showToast('Failed to start mix');
        } finally {
            setMixLoading(false);
        }
    }, [activeMix, isPlaying, toggleMix, playTrackWithQueue, showToast]);

    // Search
    const saveToHistory = useCallback((query: string) => {
        if (!query.trim()) return;
        setSearchHistory(prev => {
            const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
            const next = [query, ...filtered].slice(0, 10);
            localStorage.setItem('barashka-search-history', JSON.stringify(next));
            return next;
        });
    }, []);

    const removeFromHistory = useCallback((query: string) => {
        setSearchHistory(prev => {
            const next = prev.filter(q => q !== query);
            localStorage.setItem('barashka-search-history', JSON.stringify(next));
            return next;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setSearchHistory([]);
        localStorage.removeItem('barashka-search-history');
    }, []);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!query.trim()) {
            setSearchResults({ tracks: [], albums: [], artists: [] });
            setIsSearching(false);
            return;
        }

        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true);
            const [tracksResult, albumsResult, artistsResult] = await Promise.allSettled([
                musicAPI.searchTracks(query, { limit: 8 }),
                musicAPI.searchAlbums(query, { limit: 6 }),
                musicAPI.searchArtists(query, { limit: 4 }),
            ]);
            setSearchResults({
                tracks: (tracksResult.status === 'fulfilled' ? tracksResult.value.items : []).filter(t => !shouldHideTrack(t)),
                albums: albumsResult.status === 'fulfilled' ? albumsResult.value.items : [],
                artists: artistsResult.status === 'fulfilled' ? artistsResult.value.items : [],
            });
            setIsSearching(false);
        }, 300);
    }, []);

    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            saveToHistory(searchQuery.trim());
        }
        if (e.key === 'Escape') {
            setSearchQuery('');
            setSearchResults({ tracks: [], albums: [], artists: [] });
            searchInputRef.current?.blur();
        }
    }, [searchQuery, saveToHistory]);

    const isMixActive = activeMix === 'daily-fluff' && isPlaying;

    return (
        <div className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">

            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center gap-4 border-b border-transparent dark:border-white/[0.02]">
                <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0 focus:outline-none">
                    <Menu className="w-6 h-6" />
                </button>

                <div className="relative w-full max-w-md group flex-1 md:flex-none">
                    <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" strokeWidth={2.5} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={t('main-search-placeholder')}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent text-slate-800 dark:text-slate-200 text-[15px] font-bold rounded-full pl-12 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-3.5 focus:outline-none focus:bg-white dark:focus:bg-[#0A0A0A] focus:border-indigo-100 dark:focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    {isSearching ? (
                        <Loader2 className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
                    ) : searchQuery ? (
                        <button
                            onClick={() => { setSearchQuery(''); setSearchResults({ tracks: [], albums: [], artists: [] }); searchInputRef.current?.focus(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}

                    {/* Search History Dropdown */}
                    <AnimatePresence>
                        {isSearchFocused && !searchQuery && searchHistory.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl dark:shadow-none border border-slate-100 dark:border-white/[0.08] overflow-hidden z-50"
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.05]">
                                    <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('main-recent-searches')}</span>
                                    <button
                                        onClick={clearHistory}
                                        className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                    >
                                        {t('main-clear-all')}
                                    </button>
                                </div>
                                <div className="py-1 max-h-60 overflow-y-auto">
                                    {searchHistory.map((query, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer group transition-colors"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearchQuery(query);
                                                handleSearch(query);
                                                searchInputRef.current?.blur();
                                            }}
                                        >
                                            <History className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex-1 truncate">{query}</span>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => { e.stopPropagation(); removeFromHistory(query); }}
                                                className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center flex-shrink-0">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => showToast("No new notifications")} className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/[0.05] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/10 hover:shadow-sm dark:hover:shadow-none transition-all focus:outline-none">
                        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3.5 w-2 flex h-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full w-2 h-2 bg-rose-500"></span>
                        </div>
                    </motion.button>
                </div>
            </header>

            <div className="px-4 sm:px-8 pb-10 space-y-12">

                {/* Search Results */}
                {searchQuery === '.' ? (
                    <div className="space-y-4">
                        <button
                            onClick={() => { setSearchQuery(''); onOpenHistory?.(); }}
                            className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-2xl transition-colors text-left group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/20 transition-colors">
                                <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">Open Listening History</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">View all your recently played tracks</p>
                            </div>
                        </button>
                    </div>
                ) : searchQuery && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center mb-6 px-1">
                            <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">Search Results</h2>
                        </div>

                        {searchResults.tracks.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">Tracks</h3>
                                <div className="flex flex-col gap-1.5">
                                    {searchResults.tracks.map((track, idx) => {
                                        const isTrackLiked = likedTracks.has(track.id);
                                        const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                                        return (
                                            <motion.div key={track.id} onClick={() => playTrackWithQueue(track, searchResults.tracks, idx)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, track, position: { x: e.clientX, y: e.clientY } }); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={`flex items-center justify-between p-2 sm:p-3 rounded-2xl transition-colors group cursor-pointer border ${isTrackPlaying ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/[0.05]'}`}>
                                                <div className="flex items-center gap-3 sm:gap-5 min-w-0 pr-4">
                                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-[1rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                                        {track.cover ? <img src={track.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />}
                                                        <div className={`absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center transition-all ${isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                            {isTrackPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`font-extrabold text-[15px] sm:text-[16px] leading-tight transition-colors mb-0.5 truncate ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{track.title}</span>
                                                        <span className="text-slate-500 dark:text-slate-400 font-semibold text-[12px] sm:text-[13px] truncate hover:underline hover:text-indigo-600 dark:hover:text-indigo-400" onClick={(e) => { e.stopPropagation(); openArtist(track.artist || 'Unknown'); }}>{track.artist || 'Unknown'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-6 text-slate-400 dark:text-slate-500 flex-shrink-0">
                                                    <button onClick={(e) => toggleLike(track.id, e)} className={`p-2 rounded-full transition-all ${isTrackLiked ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-500'}`}>
                                                        <Heart className="w-5 h-5" fill={isTrackLiked ? "currentColor" : "none"} />
                                                    </button>
                                                    <span className="text-[12px] sm:text-sm font-bold tabular-nums pr-2 bg-slate-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 px-2 sm:px-3 py-1 rounded-full">{formatDuration(track.duration)}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {searchResults.tracks.length === 0 && !isSearching && (
                            <div className="text-center py-20">
                                <Search className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('main-search-no-results')}</h3>
                                <p className="text-slate-500 dark:text-slate-400">{t('main-search-no-results-desc')}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Main content when not searching */}
                {!searchQuery && (
                    <>
                        {/* Hero Banner / Mix */}
                        <div className={`rounded-[2rem] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden group transition-all duration-700 cursor-pointer ${isMixActive ? 'bg-indigo-950 scale-[1.01] shadow-xl shadow-indigo-900/20' : 'bg-[#0A0A14] hover:shadow-2xl hover:scale-[1.01]'}`} onClick={startMix}>
                            {/* Playing Animation Background */}
                            <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isMixActive ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/30 via-transparent to-transparent opacity-60"></div>
                                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/20 blur-[100px] rounded-full animate-[pulse_4s_infinite]"></div>
                                <div className="absolute rounded-[2rem] inset-0 shadow-[inset_0_0_100px_rgba(79,70,229,0.3)]"></div>
                            </div>

                            <div className="relative z-10 w-full max-w-lg mb-8 md:mb-0 text-center md:text-left flex flex-col items-center md:items-start">
                                <div className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-[11px] mb-5 bg-white/10 backdrop-blur-sm w-fit px-4 py-2 rounded-full border border-white/10">
                                    <Clock className="w-3.5 h-3.5" />
                                    {t('main-daily-mix')}
                                </div>
                                <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-display font-extrabold text-white mb-5 leading-[1.1] tracking-tight">Cloud Nine <br className="hidden sm:block"/><span className="text-indigo-400">Pastures</span></h1>
                                <p className="text-slate-300 mb-8 text-[15px] sm:text-[16px] font-medium max-w-md leading-relaxed hidden sm:block">{t('main-mix-desc')}</p>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 w-full" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={startMix}
                                        disabled={mixLoading}
                                        className={`flex-1 sm:flex-none justify-center px-8 py-4 rounded-full font-bold shadow-lg transition-all outline-none flex items-center gap-2 relative overflow-hidden ${isMixActive ? 'bg-white text-indigo-900 shadow-white/20 hover:bg-slate-100' : 'bg-indigo-500 text-white shadow-indigo-500/30 hover:bg-indigo-400 hover:-translate-y-1'}`}
                                    >
                                        {mixLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : isMixActive ? (
                                            <>
                                                <div className="flex items-end gap-0.5 h-3 mr-1">
                                                    <div className="w-1 bg-indigo-600 animate-[bounce_1s_infinite] h-full" />
                                                    <div className="w-1 bg-indigo-600 animate-[bounce_1.2s_infinite_0.1s] h-full" />
                                                    <div className="w-1 bg-indigo-600 animate-[bounce_0.8s_infinite_0.2s] h-full" />
                                                    <div className="w-1 bg-indigo-600 animate-[bounce_1.1s_infinite_0.15s] h-full" />
                                                </div>
                                                <span>{t('main-mix-pause')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5 fill-current" />
                                                <span>{t('main-mix-play')}</span>
                                            </>
                                        )}
                                    </button>
                                    <button onClick={loadContent} className="flex-1 sm:flex-none bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all outline-none flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Decorative Imagery */}
                            <div className="relative z-10 hidden md:block">
                                <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-2 shadow-2xl group-hover:rotate-[15deg] transition-transform duration-700">
                                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#0A0A14]">
                                        {mixTracks.length > 0 && mixTracks[0].cover ? (
                                            <img src={mixTracks[0].cover} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
                                        ) : (
                                            <img src="https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&q=80&w=600&h=600" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recommended Tracks */}
                        <div>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">{t('main-for-you')}</h2>
                                <button onClick={() => { setLoadingTracks(true); loadContent(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <RefreshCw className={`w-4 h-4 ${loadingTracks ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingTracks ? (
                                <div className="flex flex-col gap-1.5">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl animate-pulse">
                                            <div className="w-14 h-14 rounded-[1rem] bg-slate-100 dark:bg-white/5" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-3/4 mb-2" />
                                                <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : recommendedTracks.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                    {recommendedTracks.map((track, idx) => {
                                        const isTrackLiked = likedTracks.has(track.id);
                                        const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                                        return (
                                            <motion.div key={track.id} onClick={() => playTrackWithQueue(track, recommendedTracks, idx)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, track, position: { x: e.clientX, y: e.clientY } }); }} initial={{ opacity: 0, x: -10, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: idx * 0.03, type: "spring", stiffness: 400, damping: 30 }} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} className={`flex items-center justify-between p-2 sm:p-3 rounded-2xl transition-colors group cursor-pointer border ${isTrackPlaying ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/[0.05]'}`}>
                                                <div className="flex items-center gap-3 sm:gap-5 min-w-0 pr-4">
                                                    <div className={`font-extrabold w-5 text-right tabular-nums text-[15px] transition-colors hidden sm:block ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>
                                                        {isTrackPlaying ? <div className="flex justify-end gap-0.5 items-end h-3"><div className="w-1 bg-indigo-600 dark:bg-indigo-400 animate-[bounce_1s_infinite] h-full" /><div className="w-1 bg-indigo-600 dark:bg-indigo-400 animate-[bounce_1.2s_infinite_0.1s] h-full" /><div className="w-1 bg-indigo-600 dark:bg-indigo-400 animate-[bounce_0.8s_infinite_0.2s] h-full" /></div> : String(idx + 1).padStart(2, '0')}
                                                    </div>
                                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-[1rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                                        {track.cover ? <img src={track.cover} className={`w-full h-full object-cover transition-transform duration-500 ${isTrackPlaying ? 'scale-110' : 'group-hover:scale-110'}`} /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />}
                                                        <div className={`absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center transition-all ${isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                            {isTrackPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`font-extrabold text-[15px] sm:text-[16px] leading-tight transition-colors mb-0.5 truncate ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{track.title}</span>
                                                        <span className="text-slate-500 dark:text-slate-400 font-semibold text-[12px] sm:text-[13px] truncate hover:underline hover:text-indigo-600 dark:hover:text-indigo-400" onClick={(e) => { e.stopPropagation(); openArtist(track.artist || 'Unknown'); }}>{track.artist || 'Unknown'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-6 text-slate-400 dark:text-slate-500 flex-shrink-0">
                                                    <button onClick={(e) => toggleLike(track.id, e)} className={`p-2 rounded-full transition-all ${isTrackLiked ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-500'}`}>
                                                        <Heart className="w-5 h-5" fill={isTrackLiked ? "currentColor" : "none"} />
                                                    </button>
                                                    <span className="text-[12px] sm:text-sm font-bold tabular-nums pr-2 bg-slate-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 px-2 sm:px-3 py-1 rounded-full">{formatDuration(track.duration)}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                    <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-bold">{t('main-no-recommendations')}</p>
                                    <p className="text-sm mt-1">{t('main-no-recommendations-desc')}</p>
                                </div>
                            )}
                        </div>

                        {/* Recommended Albums */}
                        <div>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">{t('main-popular-albums')}</h2>
                                <button onClick={() => { setLoadingAlbums(true); loadContent(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <RefreshCw className={`w-4 h-4 ${loadingAlbums ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingAlbums ? (
                                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-[160px] sm:w-[200px] flex-shrink-0 animate-pulse">
                                            <div className="w-full aspect-square rounded-[1.5rem] bg-slate-100 dark:bg-white/5 mb-3" />
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-3/4 mb-2" />
                                            <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : recommendedAlbums.length > 0 ? (
                                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 snap-x snap-mandatory">
                                    {recommendedAlbums.map((album, idx) => (
                                        <motion.div key={album.id || idx} onClick={() => openPlaylist(album)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + idx * 0.08 }} className="w-[160px] sm:w-[200px] flex-shrink-0 group cursor-pointer snap-start p-2 sm:p-3 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none">
                                            <div className="relative w-full aspect-square rounded-[1.5rem] overflow-hidden mb-3 sm:mb-4 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                                {album.cover ? <img src={album.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />}
                                                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors duration-300" />
                                                <button className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:scale-110">
                                                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-1" />
                                                </button>
                                            </div>
                                            <h3 className="font-extrabold text-[14px] sm:text-[16px] text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors px-1">{album.title}</h3>
                                            <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 line-clamp-1 px-1">{album.artist || 'Album'}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                    <Disc className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-bold">No albums found</p>
                                </div>
                            )}
                        </div>

                        {/* Recommended Artists */}
                        <div>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">{t('main-popular-artists')}</h2>
                                <button onClick={() => { setLoadingArtists(true); loadContent(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <RefreshCw className={`w-4 h-4 ${loadingArtists ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingArtists ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex flex-col items-center animate-pulse">
                                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-100 dark:bg-white/5 mb-3" />
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-20 mb-1" />
                                            <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-12" />
                                        </div>
                                    ))}
                                </div>
                            ) : recommendedArtists.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                                    {recommendedArtists.map((artist, idx) => (
                                        <motion.div key={artist.id || idx} onClick={() => openArtist(artist)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="flex flex-col items-center text-center group cursor-pointer p-4 hover:-translate-y-1 transition-transform">
                                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3 shadow-sm dark:shadow-none group-hover:shadow-lg group-hover:shadow-indigo-200 dark:group-hover:shadow-indigo-500/20 transition-all relative border-[3px] border-white dark:border-[#121212]">
                                                {artist.cover ? <img src={artist.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />}
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[14px] sm:text-[15px] mb-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{artist.title || artist.artist || 'Artist'}</h4>
                                            <p className="text-[11px] sm:text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Artist</p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-bold">No artists found</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <ContextMenu
                isOpen={contextMenu.isOpen}
                track={contextMenu.track}
                position={contextMenu.position}
                onClose={() => setContextMenu({ isOpen: false, track: null, position: { x: 0, y: 0 } })}
                onPlay={(t) => playTrackWithQueue(t, recommendedTracks)}
                onPlayNext={(t) => addNextToQueue([t])}
                onAddToQueue={(t) => addToQueue([t])}
                onToggleLike={(t) => toggleLike(t.id)}
                isLiked={contextMenu.track ? likedTracks.has(contextMenu.track.id) : false}
                onAddToPlaylist={(t) => setAddToPlaylistTrack(t)}
                onGoToArtist={(artist) => openArtist(artist)}
                onBlock={(t) => { blockTrack(t); showToast('Track blocked'); }}
            />

            <AddToPlaylistPicker
                isOpen={!!addToPlaylistTrack}
                track={addToPlaylistTrack}
                onClose={() => setAddToPlaylistTrack(null)}
            />
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
