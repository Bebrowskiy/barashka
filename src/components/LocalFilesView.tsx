import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Play, Pause, Music, Trash2, Plus, ListPlus, FolderOpen, Pencil } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';
import { importLocalFiles, getAllLocalTracks, revokeLocalBlobUrl, formatFileSize } from '../lib/local-files';
import EditLocalTrackModal from './EditLocalTrackModal';
import type { Track } from '../types';

export default function LocalFilesView({ onMenuClick }: { onMenuClick?: () => void }) {
    const { currentTrack, isPlaying, showToast, playTrackWithQueue, addToQueue, addNextToQueue } = usePlayer();
    const { t } = useI18n();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadTracks = useCallback(async () => {
        setLoading(true);
        try {
            const localTracks = await getAllLocalTracks();
            setTracks(localTracks);
        } catch (err) {
            console.error('Failed to load local files:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    const handleImport = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;

        try {
            const newTracks = await importLocalFiles(fileArray);
            if (newTracks.length > 0) {
                setTracks(prev => [...prev, ...newTracks]);
                showToast(t('local-files-imported').replace('{count}', String(newTracks.length)));
            } else {
                showToast(t('local-files-no-audio'));
            }
        } catch (err) {
            console.error('Failed to import files:', err);
            showToast(t('local-files-error'));
        }
    }, [showToast, t]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleImport(e.dataTransfer.files);
    }, [handleImport]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDelete = useCallback(async (track: Track) => {
        revokeLocalBlobUrl(track.id);
        await db.deleteLocalFile(track.id);
        setTracks(prev => prev.filter(t => t.id !== track.id));
        showToast(t('local-files-removed'));
    }, [showToast, t]);

    const handlePlayAll = useCallback(() => {
        if (tracks.length > 0) {
            playTrackWithQueue(tracks[0], tracks, 0);
        }
    }, [tracks, playTrackWithQueue]);

    return (
        <div
            className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-slate-100 dark:border-white/[0.02] pb-4 pt-8 px-6 sm:px-10 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0">
                        <FolderOpen className="w-6 h-6" />
                    </button>
                    <h1 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">{t('local-files-title')}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        {t('local-files-import')}
                    </button>
                    {tracks.length > 0 && (
                        <button
                            onClick={handlePlayAll}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-full font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            {t('local-files-play-all')}
                        </button>
                    )}
                    <span className="text-[13px] font-bold text-slate-400 dark:text-slate-500 ml-auto">
                        {tracks.length} {t('local-files-tracks')}
                    </span>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleImport(e.target.files)}
                />
            </div>

            {/* Drag overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-30 bg-indigo-50/90 dark:bg-indigo-500/10 backdrop-blur-sm flex flex-col items-center justify-center gap-4 border-2 border-dashed border-indigo-300 dark:border-indigo-500/40 rounded-[2.5rem] m-2">
                    <Upload className="w-16 h-16 text-indigo-400 dark:text-indigo-500" />
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{t('local-files-drop')}</p>
                </div>
            )}

            <div className="px-6 sm:px-10 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tracks.length === 0 ? (
                    <div className="text-center py-20">
                        <Music className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('local-files-empty')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">{t('local-files-empty-desc')}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
                        >
                            <Upload className="w-5 h-5" />
                            {t('local-files-import')}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {tracks.map((track, idx) => {
                            const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                            return (
                                <div
                                    key={track.id}
                                    onClick={() => playTrackWithQueue(track, tracks, idx)}
                                    className={`flex items-center justify-between p-2 sm:p-3 rounded-2xl transition-colors group cursor-pointer border ${isTrackPlaying ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/[0.05]'}`}
                                >
                                    <div className="flex items-center gap-4 min-w-0 pr-4">
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
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                                    <Music className="w-5 h-5 text-white/50" />
                                                </div>
                                            )}
                                            <div className={`absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center transition-all ${isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                {isTrackPlaying ? <Pause className="w-4 h-4 text-white fill-current" /> : <Play className="w-4 h-4 text-white fill-current" />}
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`font-extrabold text-[15px] sm:text-[16px] leading-tight transition-colors mb-0.5 truncate ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{track.title}</span>
                                            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[12px] sm:text-[13px] truncate">
                                                {track.artist || t('local-files-unknown-artist')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 text-slate-400 dark:text-slate-500 flex-shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); addNextToQueue([track]); }}
                                            className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all"
                                            title={t('ctx-play-next')}
                                        >
                                            <ListPlus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); addToQueue([track]); }}
                                            className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all"
                                            title={t('ctx-add-queue')}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <span className="text-[12px] font-bold tabular-nums text-slate-300 dark:text-slate-600">{formatFileSize((track as any).fileSize || 0)}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingTrack(track); }}
                                            className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(track); }}
                                            className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <EditLocalTrackModal
                isOpen={!!editingTrack}
                track={editingTrack}
                onClose={() => setEditingTrack(null)}
                onSaved={loadTracks}
            />
        </div>
    );
}
