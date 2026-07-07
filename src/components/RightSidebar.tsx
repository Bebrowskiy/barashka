import { Heart, Play, ListPlus, Radio, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';

export default function RightSidebar() {
    const { t } = useI18n();
    const { currentTrack, playTrack, isPlaying, likedTracks, toggleLike, isQueueOpen, showToast, openArtist, queue, removeFromQueue } = usePlayer();
    const isLiked = currentTrack ? likedTracks.has(currentTrack.id) : false;

    if (!isQueueOpen) return null;

    return (
        <aside className="w-[340px] h-full flex flex-col bg-white dark:bg-white/[0.02] rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-white/[0.05] flex-shrink-0 transition-all relative">

            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-lg">{t('right-now-playing')}</h3>
                <button
                    onClick={() => showToast("Added to queue")}
                    className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <ListPlus className="w-5 h-5" strokeWidth={2.5} />
                </button>
            </div>

            {/* Large Cover Art */}
            <div className="relative mb-8 w-full aspect-square">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTrack?.id || 'empty'}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute inset-0 w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none group border border-slate-50 dark:border-white/[0.05]"
                    >
                        {currentTrack?.cover ? (
                            <img src={currentTrack.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Info & Actions */}
            <div className="flex justify-between items-start mb-10 px-2">
                <div className="min-w-0 pr-4">
                    <h2 className="text-[1.35rem] font-display font-extrabold text-slate-900 dark:text-white leading-tight mb-1 truncate">{currentTrack?.title || t('right-no-track')}</h2>
                    <p
                        onClick={() => currentTrack?.artist && openArtist(currentTrack.artist)}
                        className="text-indigo-600 dark:text-indigo-400 font-bold text-[15px] truncate cursor-pointer hover:underline"
                    >
                        {currentTrack?.artist || t('player-unknown-artist')}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    {currentTrack && (
                        <button
                            onClick={() => toggleLike(currentTrack.id)}
                            className={`p-3 rounded-full transition-colors ${isLiked ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-inner dark:shadow-none' : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-400 dark:hover:text-rose-400'}`}
                        >
                            <Heart className="w-5 h-5 transition-transform hover:scale-110 active:scale-95" fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 2 : 2.5} />
                        </button>
                    )}
                </div>
            </div>

            {/* Up Next / Queue */}
            <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-[#000000]/50 rounded-[2rem] p-5 border border-slate-100 dark:border-white/[0.05]">
                <div className="flex justify-between items-center mb-5 px-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-[15px] flex items-center gap-2">
                        <Radio className="w-4 h-4 text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                        {t('right-up-next')}
                    </h4>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto hide-scrollbar">
                    <AnimatePresence>
                    {queue.slice(0, 20).map((track, idx) => {
                        const isTPlaying = isPlaying && currentTrack?.id === track.id;
                        return (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, x: 20 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            key={`${track.id}-${idx}`}
                            className={`flex items-center gap-2 group cursor-pointer p-2 rounded-2xl border transition-all ${isTPlaying ? 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none border-indigo-100 dark:border-indigo-500/20' : 'border-transparent hover:bg-white dark:hover:bg-white/5 hover:shadow-sm dark:hover:shadow-none hover:border-slate-100 dark:hover:border-white/[0.05]'}`}
                        >
                            <button
                                className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromQueue(idx);
                                }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-white/[0.05]" onClick={() => playTrack(track.id)}>
                                {track.cover ? (
                                    <img src={track.cover} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
                                )}
                                <div className="absolute inset-0 bg-indigo-600/20 dark:bg-[#000000]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => playTrack(track.id)}>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{track.title}</p>
                                <p
                            onClick={(e) => { e.stopPropagation(); openArtist(track.artist || t('player-unknown-artist')); }}
                            className="text-[12px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5 hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            {track.artist || t('player-unknown-artist')}
                                </p>
                            </div>
                        </motion.div>
                    )})}
                    </AnimatePresence>
                </div>
            </div>

        </aside>
    );
}
