import { Play, Pause, Heart, MoreHorizontal, ArrowLeft, Clock, Menu, X, Trash2, Pencil, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { musicAPI } from '../lib/music-api';
import type { Track } from '../types';

export default function PlaylistView({ onMenuClick }: { onMenuClick?: () => void }) {
    const { t } = useI18n();
    const {
        selectedPlaylist, setActiveView, playTrack, currentTrack, isPlaying,
        likedTracks, toggleLike, showToast, openArtist, playTrackWithQueue,
        removeTrackFromPlaylist, deletePlaylist, updatePlaylist,
    } = usePlayer();
    const [isPlaylistLiked, setIsPlaylistLiked] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAddTracks, setShowAddTracks] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Close more menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        if (showMoreMenu) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showMoreMenu]);

    if (!selectedPlaylist) return null;

    const tracks = selectedPlaylist.tracks || [];

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        await deletePlaylist(selectedPlaylist.id);
        showToast(t('playlist-deleted'));
    };

    return (
        <div className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">
            {/* Header Info Banner */}
            <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-end justify-start gap-8 bg-gradient-to-b from-indigo-50/80 dark:from-indigo-900/20 to-white dark:to-transparent border-b border-transparent dark:border-white/[0.02]">

                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-30 flex items-center gap-2">
                    <button onClick={onMenuClick} className="md:hidden p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white dark:hover:bg-black/80 rounded-full shadow-sm dark:shadow-none transition-all text-slate-800 dark:text-white border border-transparent dark:border-white/10">
                        <Menu className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setActiveView('library')}
                        className="p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white dark:hover:bg-black/80 rounded-full shadow-sm dark:shadow-none transition-all text-slate-800 dark:text-white border border-transparent dark:border-white/10 hidden sm:block"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-[2rem] shadow-2xl flex-shrink-0 mt-8 sm:mt-12 overflow-hidden border-4 border-white dark:border-[#1A1A1A]">
                    {selectedPlaylist.cover ? (
                        <img src={selectedPlaylist.cover} className="w-full h-full object-cover" alt="Playlist Cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                    )}
                </div>

                <div className="flex flex-col gap-2 relative z-10 w-full pb-2">
                    <span className="text-[12px] font-bold tracking-widest text-indigo-500 dark:text-indigo-400 uppercase">{t('playlist-type')}</span>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-sm line-clamp-2">
                        {selectedPlaylist.title}
                    </h1>
                    {selectedPlaylist.description && (
                        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base mt-2 max-w-2xl">{selectedPlaylist.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPlaylist.creator}</span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span className="text-slate-500 dark:text-slate-500 font-medium tracking-tight">{tracks.length} {t('playlist-songs')}</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 sm:px-10 py-6 flex items-center gap-4">
                <motion.button
                    onClick={() => { if (tracks.length > 0) playTrackWithQueue(tracks[0], tracks, 0); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 flex items-center justify-center bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-xl shadow-indigo-600/30 dark:shadow-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors flex-shrink-0"
                >
                    <Play className="w-7 h-7 fill-current pl-1" />
                </motion.button>
                <button
                    onClick={() => {
                        setIsPlaylistLiked(!isPlaylistLiked);
                        showToast(isPlaylistLiked ? t('playlist-removed') : t('playlist-added'));
                    }}
                    className={`flex items-center justify-center transition-colors w-12 h-12 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 ${isPlaylistLiked ? 'text-rose-500' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                >
                    <Heart className="w-8 h-8" fill={isPlaylistLiked ? "currentColor" : "none"} />
                </button>
                <button
                    onClick={() => setShowAddTracks(true)}
                    className="flex items-center justify-center transition-colors w-12 h-12 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    title={t('playlist-add-tracks')}
                >
                    <Plus className="w-8 h-8" />
                </button>
                <div className="relative" ref={moreMenuRef}>
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        <MoreHorizontal className="w-8 h-8" />
                    </button>
                    {showMoreMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl dark:shadow-none border border-slate-200 dark:border-white/[0.08] overflow-hidden py-2 z-50"
                        >
                            <button
                                onClick={() => { setShowMoreMenu(false); setShowEditModal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <Pencil className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                {t('playlist-edit')}
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-white/[0.05] mx-3 my-1" />
                            <button
                                onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('playlist-delete')}
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="px-6 sm:px-10 pb-8">
                <div className="flex items-center gap-4 text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">
                    <div className="w-5 text-center">#</div>
                    <div className="flex-1 min-w-0">{t('playlist-column-title')}</div>
                    <div className="w-10 text-center"><Clock className="w-4 h-4 mx-auto" strokeWidth={2.5} /></div>
                </div>
                <div className="flex flex-col gap-1.5">
                    {tracks.map((track, idx) => {
                        const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                        const isTrackLiked = likedTracks.has(track.id);
                        return (
                        <motion.div
                            key={track.id}
                            onClick={() => playTrackWithQueue(track, tracks, idx)}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                            whileHover={{ x: 4 }}
                            className={`flex items-center gap-4 p-2 sm:p-3 rounded-2xl transition-colors group cursor-pointer border ${isTrackPlaying ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/[0.05]'}`}
                        >
                            <div className={`font-extrabold w-5 text-right tabular-nums text-[15px] transition-colors hidden sm:block ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>
                                {isTrackPlaying ? <div className="flex justify-end gap-0.5 items-end h-3">
                                    <div className="w-1 bg-indigo-600 dark:bg-indigo-400 animate-[bounce_1s_infinite] h-full" />
                                    <div className="w-1 bg-indigo-600 dark:bg-indigo-400 animate-[bounce_1.2s_infinite_0.1s] h-full" />
                                    <div className="w-1 bg-indigo-600 dark:bg-indigo-400 animate-[bounce_0.8s_infinite_0.2s] h-full" />
                                </div> : String(idx + 1).padStart(2, '0')}
                            </div>
                            <div className="relative w-12 h-12 rounded-[1rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                {track.cover ? (
                                    <img src={track.cover} className={`w-full h-full object-cover transition-transform duration-500 ${isTrackPlaying ? 'scale-110' : 'group-hover:scale-110'}`} />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
                                )}
                                <div className={`absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center transition-all ${isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {isTrackPlaying ? <Pause className="w-4 h-4 text-white fill-current" /> : <Play className="w-4 h-4 text-white fill-current" />}
                                </div>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1 pr-4">
                                <span className={`font-extrabold text-[15px] sm:text-[16px] leading-tight transition-colors mb-0.5 truncate ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{track.title}</span>
                                <span
                                    onClick={(e) => { e.stopPropagation(); openArtist(track.artist || t('playlist-unknown-artist')); }}
                                    className="text-slate-500 dark:text-slate-400 font-semibold text-[12px] sm:text-[13px] truncate cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                                >
                                    {track.artist || t('playlist-unknown-artist')}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 text-slate-400 dark:text-slate-500 flex-shrink-0">
                                <button
                                    onClick={(e) => toggleLike(track.id, e)}
                                    className={`p-2 rounded-full transition-all ${isTrackLiked ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-500'}`}
                                >
                                    <Heart className="w-5 h-5" fill={isTrackLiked ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeTrackFromPlaylist(selectedPlaylist.id, track.id); showToast(t('playlist-track-removed')); }}
                                    className="p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:text-rose-500"
                                    title={t('playlist-remove-track')}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <span className="text-sm font-bold tabular-nums pr-2 bg-slate-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 px-3 py-1 rounded-full">{formatDuration(track.duration)}</span>
                            </div>
                        </motion.div>
                    )})}
                    {tracks.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-slate-500 dark:text-slate-400 mb-4">{t('playlist-no-tracks')}</p>
                            <button
                                onClick={() => setShowAddTracks(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full font-bold hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                <Plus className="w-5 h-5" />
                                {t('playlist-add-tracks')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Playlist Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <EditPlaylistModal
                        playlist={selectedPlaylist}
                        onClose={() => setShowEditModal(false)}
                        onSave={async (updates) => {
                            await updatePlaylist(selectedPlaylist.id, updates);
                            showToast(t('playlist-updated'));
                            setShowEditModal(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#1A1A1A] rounded-[2rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-sm p-8 border border-transparent dark:border-white/[0.05]"
                        >
                            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white mb-3">{t('playlist-delete-confirm-title')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">{t('playlist-delete-confirm-desc')}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-3 rounded-2xl font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
                                >
                                    {t('playlist-delete')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Tracks Modal */}
            <AnimatePresence>
                {showAddTracks && (
                    <AddTracksModal
                        playlistId={selectedPlaylist.id}
                        existingTrackIds={new Set(tracks.map(t => t.id))}
                        onClose={() => setShowAddTracks(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function EditPlaylistModal({ playlist, onClose, onSave }: {
    playlist: { id: string; title: string; description?: string; cover?: string };
    onClose: () => void;
    onSave: (updates: { title: string; description: string; cover?: string }) => void;
}) {
    const { t } = useI18n();
    const [title, setTitle] = useState(playlist.title);
    const [description, setDescription] = useState(playlist.description || '');
    const [coverPreview, setCoverPreview] = useState<string | null>(playlist.cover || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: { target: { files?: FileList | null } }) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    return (
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
                className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-md p-8 border border-transparent dark:border-white/[0.05]"
            >
                <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white mb-6">{t('playlist-edit')}</h2>

                <div className="flex items-center gap-6 mb-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-24 h-24 rounded-[1.2rem] flex items-center justify-center cursor-pointer transition-colors shadow-sm overflow-hidden border-2 ${coverPreview ? 'border-transparent' : 'bg-indigo-50 dark:bg-indigo-500/10 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-300 dark:text-indigo-500/50 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20'}`}
                    >
                        {coverPreview ? (
                            <img src={coverPreview} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                            <Pencil className="w-8 h-8" />
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('create-playlist-cover')}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 px-5 py-2.5 rounded-full transition-colors"
                        >
                            {t('create-playlist-choose')}
                        </button>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                    </div>
                </div>

                <div className="flex flex-col gap-4 mb-6">
                    <div>
                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{t('create-playlist-name')}</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{t('create-playlist-desc')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all resize-none text-[15px]"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        {t('cancel')}
                    </button>
                    <button
                        onClick={() => onSave({ title: title.trim(), description: description.trim(), cover: coverPreview || undefined })}
                        disabled={!title.trim()}
                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${title.trim() ? 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'}`}
                    >
                        {t('save')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function AddTracksModal({ playlistId, existingTrackIds, onClose }: {
    playlistId: string;
    existingTrackIds: Set<string>;
    onClose: () => void;
}) {
    const { t } = useI18n();
    const { addTrackToPlaylist, showToast, playTrackWithQueue } = usePlayer();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setLoading(true);
        try {
            const result = await musicAPI.searchTracks(q, { limit: 20 });
            setResults(result.items);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => search(value), 400);
    };

    const handleAdd = async (track: Track) => {
        await addTrackToPlaylist(playlistId, track);
        setAddedIds(prev => new Set(prev).add(track.id));
        showToast(t('playlist-track-added'));
    };

    return (
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
                className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden w-full max-w-lg max-h-[80vh] flex flex-col border border-transparent dark:border-white/[0.05]"
            >
                <div className="p-6 pb-0">
                    <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white mb-4">{t('playlist-add-tracks')}</h2>
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => handleQueryChange(e.target.value)}
                            placeholder={t('main-search-placeholder')}
                            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold pl-12 pr-5 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-[15px]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {loading && (
                        <div className="text-center py-8">
                            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    {!loading && results.length === 0 && query.trim() && (
                        <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('search-no-results')}</p>
                    )}
                    {!loading && results.map(track => {
                        const isAlreadyIn = existingTrackIds.has(track.id) || addedIds.has(track.id);
                        return (
                            <div key={track.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-800">
                                    {track.cover && <img src={track.cover} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate">{track.title}</p>
                                    <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 truncate">{track.artist || 'Unknown'}</p>
                                </div>
                                {isAlreadyIn ? (
                                    <span className="text-[12px] font-bold text-indigo-500 dark:text-indigo-400 px-3 py-1">{t('playlist-already-added')}</span>
                                ) : (
                                    <button
                                        onClick={() => handleAdd(track)}
                                        className="px-4 py-1.5 rounded-full text-[13px] font-bold bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        {t('add')}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {!query.trim() && (
                        <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('playlist-search-hint')}</p>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-white/[0.05]">
                    <button onClick={onClose} className="w-full py-3 rounded-2xl font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        {t('done')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
