import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, List } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import type { Track } from '../types';

interface AddToPlaylistPickerProps {
    isOpen: boolean;
    track: Track | null;
    onClose: () => void;
}

export default function AddToPlaylistPicker({ isOpen, track, onClose }: AddToPlaylistPickerProps) {
    const { t } = useI18n();
    const { userPlaylists, addTrackToPlaylist, showToast, setIsCreatePlaylistOpen } = usePlayer();
    const [addedTo, setAddedTo] = useState<string | null>(null);

    if (!track) return null;

    const handleAdd = async (playlistId: string) => {
        await addTrackToPlaylist(playlistId, track);
        setAddedTo(playlistId);
        showToast(t('playlist-track-added'));
        setTimeout(() => {
            setAddedTo(null);
            onClose();
        }, 600);
    };

    const handleCreateNew = () => {
        onClose();
        setIsCreatePlaylistOpen(true);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-sm max-h-[70vh] flex flex-col border border-transparent dark:border-white/[0.05]"
                    >
                        <div className="p-6 pb-4 flex items-center justify-between">
                            <h2 className="text-xl font-display font-black text-slate-900 dark:text-white">{t('playlist-add-tracks')}</h2>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Track info */}
                        <div className="px-6 pb-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-800">
                                {track.cover && <img src={track.cover} className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{track.title}</p>
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{track.artist || 'Unknown'}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {/* Create new playlist option */}
                            <button
                                onClick={handleCreateNew}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors mb-1"
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                    <Plus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                </div>
                                <span className="font-bold text-[14px] text-indigo-600 dark:text-indigo-400">{t('library-new-playlist')}</span>
                            </button>

                            {/* Existing playlists */}
                            {userPlaylists.map(pl => {
                                const isAdded = addedTo === pl.id;
                                return (
                                    <button
                                        key={pl.id}
                                        onClick={() => handleAdd(pl.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isAdded ? 'bg-green-100 dark:bg-green-500/20' : 'bg-slate-100 dark:bg-white/5'}`}>
                                            {pl.cover ? (
                                                <img src={pl.cover} className="w-full h-full object-cover" />
                                            ) : (
                                                <List className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate">{pl.title}</p>
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{(pl.tracks || []).length} {t('playlist-songs')}</p>
                                        </div>
                                        {isAdded && (
                                            <span className="text-[12px] font-bold text-green-500">{t('playlist-already-added')}</span>
                                        )}
                                    </button>
                                );
                            })}

                            {userPlaylists.length === 0 && (
                                <p className="text-center py-6 text-slate-500 dark:text-slate-400 text-[13px] font-medium">{t('library-no-playlists')}</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
