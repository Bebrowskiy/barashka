import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';
import type { Track } from '../types';

interface EditLocalTrackModalProps {
    isOpen: boolean;
    track: Track | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditLocalTrackModal({ isOpen, track, onClose, onSaved }: EditLocalTrackModalProps) {
    const { showToast } = usePlayer();
    const { t } = useI18n();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [saving, setSaving] = useState(false);

    // Update fields when track changes
    const trackKey = track?.id || '';
    const [prevKey, setPrevKey] = useState('');
    if (trackKey !== prevKey && track) {
        setTitle(track.title || '');
        setArtist(track.artist || '');
        setAlbum((track as any).album?.title || '');
        setPrevKey(trackKey);
    }

    if (!track) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await db.updateLocalFile(track.id, {
                title: title.trim() || track.title,
                artist: artist.trim(),
                album: album.trim(),
            });
            showToast(t('edit-local-saved'));
            onSaved();
            onClose();
        } catch {
            showToast(t('edit-local-error'));
        } finally {
            setSaving(false);
        }
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
                        className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-md p-8 relative border border-transparent dark:border-white/[0.05]"
                    >
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                {track.cover ? (
                                    <img src={track.cover} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <Music className="w-6 h-6 text-white/70" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-display font-black text-slate-900 dark:text-white">{t('edit-local-title')}</h2>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 font-bold">{t('edit-local-desc')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('edit-local-track-title')}</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-[15px] font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('edit-local-artist')}</label>
                                <input
                                    type="text"
                                    value={artist}
                                    onChange={e => setArtist(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-[15px] font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('edit-local-album')}</label>
                                <input
                                    type="text"
                                    value={album}
                                    onChange={e => setAlbum(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-[15px] font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6">
                            <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-[15px] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                {t('edit-local-cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold text-[15px] hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors disabled:opacity-50"
                            >
                                {saving ? '...' : t('edit-local-save')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
