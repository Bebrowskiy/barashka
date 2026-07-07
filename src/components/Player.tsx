import type React from 'react';
import { motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, SlidersHorizontal, Maximize2, ListMusic, Heart, Download, Share2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { audioEngine } from '../lib/audio-engine';
import { downloadService } from '../lib/download-service';
import { shareService } from '../lib/share-service';
import { cardSettings } from '../lib/storage';
import { useI18n } from '../lib/i18n';

export default function Player() {
    const {
        currentTrack,
        isPlaying, togglePlay,
        likedTracks, toggleLike,
        isShuffle, toggleShuffle,
        isRepeat, toggleRepeat,
        volume, setVolume,
        isFullscreen, setIsFullscreen,
        isQueueOpen, setIsQueueOpen,
        isAudioPanelOpen, setIsAudioPanelOpen,
        openArtist,
        showToast,
        currentTime,
        duration,
        seekTo,
    } = usePlayer();
    const { t } = useI18n();

    const isLiked = currentTrack ? likedTracks.has(currentTrack.id) : false;
    const cards = cardSettings.get();

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        seekTo(percent * duration);
    };

    const handleSkipBack = () => {
        audioEngine.playPrev();
    };

    const handleSkipForward = () => {
        audioEngine.playNext();
    };

    const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        setVolume(percent);
    };

    const handleMobileSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        seekTo(percent * duration);
    };

    return (
        <>
            <div className={`absolute bottom-0 sm:bottom-6 left-1/2 -translate-x-1/2 w-full sm:w-[95%] lg:w-[90%] max-w-[1200px] sm:rounded-[2.5rem] bg-white/80 dark:bg-[#121212]/80 backdrop-blur-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1),0_0_20px_rgba(0,0,0,0.05)] dark:shadow-none border-t sm:border border-slate-200 dark:border-white/[0.05] z-50 flex flex-col justify-center px-4 sm:px-6 h-[80px] sm:h-[96px] transition-all ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center justify-between h-full gap-2 sm:gap-4 relative">

                    {/* LEFT: Track Info */}
                    <div className="flex items-center gap-3 sm:gap-4 w-[60%] sm:w-[30%] min-w-0 pr-2">
                        <motion.div
                            layoutId={currentTrack ? `cover-${currentTrack.id}` : undefined}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05] cursor-pointer group"
                            onClick={() => setIsFullscreen(true)}
                        >
                            {currentTrack?.cover ? (
                                <img src={currentTrack.cover} className="w-full h-full object-cover transition-transform duration-500" alt="" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                            )}
                            <div className="absolute inset-0 bg-black/20 dark:bg-[#000000]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="w-5 h-5 text-white" />
                            </div>
                        </motion.div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span onClick={() => setIsFullscreen(true)} className="font-extrabold text-[14px] sm:text-[16px] text-slate-800 dark:text-slate-200 truncate leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                                    {currentTrack?.title || t('player-no-track')}
                                </span>
                                {cards.showQualityBadge && currentTrack && (
                                    <QualityBadge quality={currentTrack.id} />
                                )}
                                {isPlaying && (
                                    <div className="flex items-end gap-[2px] h-3">
                                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }} className="w-1 bg-indigo-500 rounded-full" />
                                        <motion.div animate={{ height: [8, 4, 10, 4] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} className="w-1 bg-indigo-500 rounded-full" />
                                        <motion.div animate={{ height: [4, 10, 6, 4] }} transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }} className="w-1 bg-indigo-500 rounded-full" />
                                    </div>
                                )}
                            </div>
                            <span
                                onClick={() => currentTrack?.artist && openArtist(currentTrack.artist)}
                                className="font-semibold text-[12px] sm:text-[13px] text-slate-500 dark:text-slate-400 truncate cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                            >{currentTrack?.artist || t('player-unknown-artist')}</span>
                        </div>
                        {currentTrack && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className={`hidden xl:block transition-colors p-2 ${isLiked ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500 hover:text-rose-500'}`}
                                onClick={(e) => toggleLike(currentTrack.id, e)}
                            >
                                <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
                            </motion.button>
                        )}
                    </div>

                    {/* CENTER: Main Controls */}
                    <div className="flex sm:flex-col items-center justify-end sm:justify-center flex-1 sm:max-w-[500px] gap-2">
                        <div className="flex items-center gap-3 sm:gap-5">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleShuffle}
                                className={`hidden sm:block transition-colors ${isShuffle ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                            >
                                <Shuffle className="w-4 h-4" strokeWidth={2.5} />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSkipBack}
                                className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                                <SkipBack className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                            </motion.button>

                            <motion.button
                                onClick={togglePlay}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-200 dark:shadow-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors flex-shrink-0"
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                                ) : (
                                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current pl-1" />
                                )}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSkipForward}
                                className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ml-1 sm:ml-0"
                            >
                                <SkipForward className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleRepeat}
                                className={`hidden sm:block transition-colors ${isRepeat ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                            >
                                {isRepeat === 2 ? (
                                    <Repeat1 className="w-4 h-4" strokeWidth={2.5} />
                                ) : (
                                    <Repeat className="w-4 h-4" strokeWidth={2.5} />
                                )}
                            </motion.button>
                        </div>

                        {/* Timeline Desktop */}
                        <div className="hidden sm:flex items-center w-full gap-3 mt-1.5 group cursor-pointer">
                            <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 tabular-nums min-w-[36px] text-right">{formatTime(currentTime)}</span>
                            <div
                                className="h-2 flex-1 bg-slate-100 dark:bg-white/10 rounded-full relative shadow-inner dark:shadow-none overflow-hidden transition-all group-hover:h-3"
                                onClick={handleSeek}
                            >
                                <div
                                    className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full flex items-center justify-end transition-[width] duration-75"
                                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                                >
                                    <div className="w-3 h-3 bg-white rounded-full shadow-sm shadow-black/20 opacity-0 group-hover:opacity-100 translate-x-1.5 transition-opacity"></div>
                                </div>
                            </div>
                            <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 tabular-nums min-w-[36px]">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* RIGHT: Tools */}
                    <div className="hidden md:flex items-center justify-end gap-3 w-[30%]">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsAudioPanelOpen(!isAudioPanelOpen)}
                            className={`transition-colors ${isAudioPanelOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            onClick={() => { if (currentTrack) { downloadService.downloadTrack(currentTrack); showToast(t('player-downloading')); } }}
                        >
                            <Download className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            onClick={async () => { if (currentTrack) { const ok = await shareService.shareTrack(currentTrack); if (ok) showToast(t('player-link-copied')); } }}
                        >
                            <Share2 className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`transition-colors ml-1 ${isQueueOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                            onClick={() => setIsQueueOpen(!isQueueOpen)}
                        >
                            <ListMusic className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
                        </motion.button>

                        <div className="flex items-center gap-2 w-24 group pl-2">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => audioEngine.toggleMute()}
                                className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none"
                            >
                                {volume === 0 ? <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} /> : <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />}
                            </motion.button>
                            <div
                                className="h-1.5 flex-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden cursor-pointer shadow-inner dark:shadow-none relative transition-all group-hover:h-2.5"
                                onClick={handleVolumeClick}
                            >
                                <div style={{ width: `${volume * 100}%` }} className="absolute left-0 top-0 h-full bg-slate-300 dark:bg-slate-500 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400 transition-all rounded-full"></div>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsFullscreen(true)}
                            className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 p-2.5 rounded-full transition-colors border border-slate-100 dark:border-white/[0.05] ml-2"
                        >
                            <Maximize2 className="w-4 h-4" strokeWidth={2.5} />
                        </motion.button>
                    </div>
                </div>

                {/* Mobile Timeline */}
                <div className="sm:hidden absolute top-0 left-0 w-full h-[3px] bg-slate-100 dark:bg-white/10 cursor-pointer" onClick={handleMobileSeek}>
                    <div
                        className="h-full bg-indigo-500 relative transition-[width] duration-75"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                    ></div>
                </div>
            </div>
        </>
    );
}

function QualityBadge({ quality }: { quality: string }) {
    if (quality.startsWith('y:')) {
        return (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                YouTube
            </span>
        );
    }

    if (quality.startsWith('j:')) {
        return (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                Jamendo
            </span>
        );
    }

    if (quality.startsWith('ia:')) {
        return (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                Archive
            </span>
        );
    }

    return null;
}

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
