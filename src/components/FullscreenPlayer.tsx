import type React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Mic2, ChevronDown, MoreHorizontal, ListMusic, Heart, Plus, User, Disc, Share2, Download, ListPlus, X, BarChart3 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { audioEngine } from '../lib/audio-engine';
import { lyricsAPI, type LyricLine, type LyricsData } from '../lib/lyrics-api';
import { downloadService } from '../lib/download-service';
import { shareService } from '../lib/share-service';
import Visualizer from './Visualizer';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function FullscreenPlayer() {
    const { t } = useI18n();
    const {
        currentTrack,
        isPlaying, togglePlay,
        likedTracks, toggleLike,
        isShuffle, toggleShuffle,
        isRepeat, toggleRepeat,
        volume, setVolume,
        isFullscreen, setIsFullscreen,
        isQueueOpen, setIsQueueOpen,
        openArtist,
        showToast, playTrack,
        currentTime,
        duration,
        seekTo,
        queue,
        removeFromQueue,
    } = usePlayer();

    const isLiked = currentTrack ? likedTracks.has(currentTrack.id) : false;
    const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [lyrics, setLyrics] = useState<LyricsData | null>(null);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);

    // Fetch lyrics when track changes
    useEffect(() => {
        if (!currentTrack) return;

        setLyrics(null);
        setActiveLyricIndex(-1);
        setLyricsLoading(true);

        const controller = new AbortController();
        lyricsAPI.fetchLyrics(currentTrack, { signal: controller.signal })
            .then(data => {
                setLyrics(data);
                setLyricsLoading(false);
            })
            .catch(e => {
                if (e.name !== 'AbortError') {
                    setLyricsLoading(false);
                }
            });

        return () => controller.abort();
    }, [currentTrack?.id]);

    // Sync active lyric index with current time
    useEffect(() => {
        if (!lyrics || lyrics.lines.length === 0 || !isPlaying) return;

        const findActiveLine = () => {
            const time = audioEngine.getAudioElement().currentTime;
            let idx = -1;
            for (let i = 0; i < lyrics.lines.length; i++) {
                if (time >= lyrics.lines[i].time) {
                    idx = i;
                } else {
                    break;
                }
            }
            return idx;
        };

        const interval = setInterval(() => {
            const idx = findActiveLine();
            if (idx !== activeLyricIndex) {
                setActiveLyricIndex(idx);

                // Auto-scroll to active line
                if (lyricsContainerRef.current && idx >= 0) {
                    const activeEl = lyricsContainerRef.current.querySelector(`[data-lyric-idx="${idx}"]`);
                    if (activeEl) {
                        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }, 250);

        return () => clearInterval(interval);
    }, [lyrics, isPlaying, activeLyricIndex]);

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        seekTo(percent * duration);
    };

    const handleLyricClick = useCallback((line: LyricLine) => {
        seekTo(line.time);
    }, [seekTo]);

    const formatTime = (s: number) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const hasSyncedLyrics = lyrics && lyrics.lines.length > 0;

    return (
        <AnimatePresence>
            {isFullscreen && (
                <motion.div
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                    className="fixed inset-0 z-[150] bg-slate-900 flex flex-col text-white"
                >
                    {/* Animated Background Blur */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {currentTrack?.cover && (
                            <motion.div
                                initial={{ scale: 1.2, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.4 }}
                                transition={{ duration: 1 }}
                                className="absolute inset-0 bg-cover bg-center blur-[80px] saturate-200"
                                style={{ backgroundImage: `url(${currentTrack.cover})` }}
                            />
                        )}
                        <div className="absolute inset-0 bg-black/50" />

                        {/* Real Visualizer */}
                        {isPlaying && activeTab === 'player' && (
                            <div className="absolute inset-0 opacity-40 pointer-events-none">
                                <Visualizer className="w-full h-full" />
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 flex-1 flex flex-col h-[100dvh] overflow-hidden">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between p-6 flex-shrink-0">
                            <button onClick={() => setIsFullscreen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md">
                                <ChevronDown className="w-6 h-6 text-white" />
                            </button>

                            <div className="flex bg-white/10 p-1 rounded-full backdrop-blur-md">
                                <button onClick={() => setActiveTab('player')} className={`px-4 sm:px-6 py-1.5 rounded-full text-[13px] font-bold transition-colors ${activeTab === 'player' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>
                                    Player
                                </button>
                                <button onClick={() => setActiveTab('lyrics')} className={`px-4 sm:px-6 py-1.5 rounded-full text-[13px] font-bold transition-colors ${activeTab === 'lyrics' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>
                                    <div className="flex items-center gap-2">
                                        Lyrics
                                        {isPlaying && activeTab === 'lyrics' && (
                                            <span className="flex items-center gap-[2px]">
                                                <motion.div animate={{ height: [4, 8, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-white rounded-full" />
                                                <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-white rounded-full" />
                                                <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1 bg-white rounded-full" />
                                            </span>
                                        )}
                                    </div>
                                </button>
                                <button onClick={() => setActiveTab('queue')} className={`px-4 sm:px-6 py-1.5 rounded-full text-[13px] font-bold transition-colors ${activeTab === 'queue' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>
                                    Queue
                                </button>
                            </div>

                            <div className="relative">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-3 rounded-full transition-colors backdrop-blur-md ${isMenuOpen ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}>
                                    <MoreHorizontal className="w-6 h-6 text-white" />
                                </button>
                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[160]" onClick={() => setIsMenuOpen(false)} />
                                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 top-full mt-4 w-56 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl py-2 z-[170] flex flex-col overflow-hidden">
                                                <button onClick={() => { setIsMenuOpen(false); showToast("Added to playlist"); }} className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors w-full text-left">
                                                    <ListPlus className="w-4 h-4" /> Add to Playlist
                                                </button>
                                                {currentTrack?.artist && (
                                                        <button onClick={() => { setIsMenuOpen(false); setIsFullscreen(false); openArtist(currentTrack.artist!); }} className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors w-full text-left">
                                                        <User className="w-4 h-4" /> {t('fullscreen-go-artist')}
                                                    </button>
                                                )}
                                                <div className="h-px w-full bg-white/10 my-1"></div>
                                                <button onClick={async () => { setIsMenuOpen(false); if (currentTrack) { const ok = await shareService.shareTrack(currentTrack); if (ok) showToast(t('player-link-copied')); } }} className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors w-full text-left">
                                                    <Share2 className="w-4 h-4" /> {t('fullscreen-share')}
                                                </button>
                                                <button onClick={() => { setIsMenuOpen(false); if (currentTrack) { downloadService.downloadTrack(currentTrack); showToast(t('player-downloading')); } }} className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors w-full text-left">
                                                    <Download className="w-4 h-4" /> {t('fullscreen-download')}
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                {activeTab === 'player' ? (
                                    <motion.div key="player" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col px-6 lg:px-12 xl:px-24 mx-auto max-w-7xl pb-8">
                                        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
                                            <motion.div className="w-full max-w-[320px] lg:max-w-[480px] aspect-square rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl flex-shrink-0 relative group" layoutId={currentTrack ? `cover-${currentTrack.id}` : undefined}>
                                                {currentTrack?.cover ? (
                                                    <img src={currentTrack.cover} className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                                                )}
                                            </motion.div>

                                            <div className="w-full max-w-[500px] flex flex-col justify-center">
                                                <div className="flex items-start justify-between mb-8 z-10">
                                                    <div className="flex flex-col min-w-0 pr-4">
                                                        <h2 className="text-3xl lg:text-5xl font-display font-black text-white mb-2 truncate">{currentTrack?.title || t('right-no-track')}</h2>
                                                        <p onClick={() => { if (currentTrack?.artist) { setIsFullscreen(false); openArtist(currentTrack.artist); } }} className="text-lg lg:text-2xl font-bold text-white/60 truncate cursor-pointer hover:underline hover:text-white w-fit transition-colors">{currentTrack?.artist || t('player-unknown-artist')}</p>
                                                    </div>
                                                    {currentTrack && (
                                                        <button className={`p-4 rounded-full transition-colors flex-shrink-0 bg-white/10 hover:bg-white/20 backdrop-blur-md ${isLiked ? 'text-rose-400' : 'text-white'}`} onClick={(e) => { toggleLike(currentTrack.id, e); showToast(isLiked ? t('playlist-removed') : t('playlist-added')); }}>
                                                            <Heart className="w-7 h-7 lg:w-8 lg:h-8" fill={isLiked ? 'currentColor' : 'none'} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="w-full mb-8 z-10">
                                                    <div className="h-2 w-full bg-white/20 rounded-full mb-4 cursor-pointer relative overflow-hidden group" onClick={handleSeek}>
                                                        <div className={`absolute left-0 top-0 h-full bg-white rounded-full flex items-center justify-end transition-[width] duration-75 ${isPlaying ? 'animate-[pulse_2s_infinite]' : ''}`} style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}>
                                                            <div className="w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 translate-x-1.5 transition-opacity"></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-bold text-white/50 tabular-nums tracking-wider">
                                                        <span>{formatTime(currentTime)}</span>
                                                        <span>{formatTime(duration)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mb-8 z-10">
                                                    <button onClick={toggleShuffle} className={`transition-colors ${isShuffle ? 'text-indigo-400' : 'text-white/50 hover:text-white'}`}>
                                                        <Shuffle className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
                                                    </button>
                                                    <button onClick={() => audioEngine.playPrev()} className="text-white hover:text-indigo-400 transition-colors">
                                                        <SkipBack className="w-8 h-8 lg:w-10 lg:h-10 fill-current" />
                                                    </button>
                                                    <motion.button onClick={togglePlay} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center bg-white text-slate-900 rounded-full shadow-2xl hover:bg-indigo-50 transition-colors">
                                                        {isPlaying ? <Pause className="w-8 h-8 lg:w-10 lg:h-10 fill-current" /> : <Play className="w-8 h-8 lg:w-10 lg:h-10 fill-current pl-2" />}
                                                    </motion.button>
                                                    <button onClick={() => audioEngine.playNext()} className="text-white hover:text-indigo-400 transition-colors">
                                                        <SkipForward className="w-8 h-8 lg:w-10 lg:h-10 fill-current" />
                                                    </button>
                                                    <button onClick={toggleRepeat} className={`transition-colors ${isRepeat ? 'text-indigo-400' : 'text-white/50 hover:text-white'}`}>
                                                        <Repeat className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between text-white/60 z-10">
                                                    <button className="hover:text-white transition-colors" onClick={() => setActiveTab('lyrics')}><Mic2 className="w-6 h-6" /></button>
                                                    <div className="flex items-center gap-3 w-1/2">
                                                        <button onClick={() => audioEngine.toggleMute()} className="hover:text-white transition-colors">
                                                            {volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                                        </button>
                                                        <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setVolume(Math.max(0, Math.min(1, x / rect.width))); }}>
                                                            <div style={{ width: `${volume * 100}%` }} className="h-full bg-white rounded-full"></div>
                                                        </div>
                                                    </div>
                                                    <button className={`hover:text-white transition-colors ${activeTab === 'queue' ? 'text-indigo-400' : ''}`} onClick={() => setActiveTab('queue')}>
                                                        <ListMusic className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : activeTab === 'lyrics' ? (
                                    <motion.div key="lyrics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 flex flex-col px-6 py-8 overflow-hidden max-w-3xl mx-auto w-full items-center text-center pb-32">
                                        {lyricsLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="flex gap-2">
                                                    <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 bg-white/40 rounded-full" />
                                                    <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 bg-white/40 rounded-full" />
                                                    <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 bg-white/40 rounded-full" />
                                                </div>
                                            </div>
                                        ) : hasSyncedLyrics ? (
                                            <div ref={lyricsContainerRef} className="flex flex-col items-center justify-start min-h-full py-[40vh] space-y-5 lg:space-y-7 w-full overflow-y-auto hide-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                                                {lyrics!.lines.map((line, index) => {
                                                    const isActive = index === activeLyricIndex;
                                                    const isPassed = index < activeLyricIndex;
                                                    return (
                                                        <motion.p
                                                            key={index}
                                                            data-lyric-idx={index}
                                                            onClick={() => handleLyricClick(line)}
                                                            animate={{ opacity: isActive ? 1 : isPassed ? 0.3 : 0.5, scale: isActive ? 1.05 : 1, filter: isActive ? 'blur(0px)' : 'blur(1px)' }}
                                                            transition={{ duration: 0.3 }}
                                                            className={`text-xl lg:text-4xl font-black cursor-pointer transition-all ${isActive ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                                                        >
                                                            {line.text}
                                                        </motion.p>
                                                    );
                                                })}
                                            </div>
                                        ) : lyrics?.plainText ? (
                                            <div className="flex flex-col items-center justify-start min-h-full py-12 space-y-4 w-full overflow-y-auto hide-scrollbar">
                                                {lyrics.plainText.split('\n').map((line, index) => (
                                                    <p key={index} className="text-lg lg:text-2xl text-white/60">{line}</p>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-white/40">
                                                <Mic2 className="w-16 h-16 mb-4 opacity-50" />
                                                                <p className="text-lg font-bold">{t('fullscreen-no-lyrics')}</p>
                                                                <p className="text-sm mt-1">{t('fullscreen-no-lyrics-desc')}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div key="queue" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} layoutScroll className="absolute inset-0 flex flex-col px-6 py-8 overflow-y-auto hide-scrollbar max-w-4xl mx-auto w-full pb-32">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-3xl font-display font-black text-white">{t('fullscreen-up-next')}</h3>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <AnimatePresence>
                                                {queue.map((track, idx) => (
                                                    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, x: -20 }} key={`${track.id}-${idx}`} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/10 transition-all group cursor-pointer border border-transparent hover:border-white/10">
                                                        <button className="text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1" onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}>
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                        <div className="font-bold text-white/40 tabular-nums w-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => playTrack(track.id)}>
                                                            <Play className="w-4 h-4 fill-current" />
                                                        </div>
                                                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md flex-shrink-0" onClick={() => playTrack(track.id)}>
                                                            {track.cover ? <img src={track.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-700" />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1" onClick={() => playTrack(track.id)}>
                                                            <p className="text-lg font-bold text-white truncate">{track.title}</p>
                                                            <p className="text-[14px] font-medium text-white/60 truncate">{track.artist || t('player-unknown-artist')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-6 text-white/40 group-hover:text-white transition-colors pr-2">
                                                            <span className="text-[14px] font-bold tabular-nums">{formatTime(track.duration)}</span>
                                                            <button onClick={(e) => { e.stopPropagation(); toggleLike(track.id, e); }}>
                                                                <Heart className={`w-6 h-6 ${likedTracks.has(track.id) ? 'text-rose-400 fill-current' : 'hover:scale-110 transition-transform'}`} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
