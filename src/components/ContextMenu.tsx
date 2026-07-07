import type React from 'react';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Heart, Plus, ListPlus, Share2, Download, ExternalLink, Ban, Copy, ListMusic } from 'lucide-react';
import type { Track } from '../types';
import { useI18n } from '../lib/i18n';
import { shareService } from '../lib/share-service';
import { downloadService } from '../lib/download-service';

interface ContextMenuItem {
    icon: React.ReactNode;
    label: string;
    action: () => void;
    danger?: boolean;
}

interface ContextMenuProps {
    isOpen: boolean;
    track: Track | null;
    position: { x: number; y: number };
    onClose: () => void;
    onPlay: (track: Track) => void;
    onPlayNext: (track: Track) => void;
    onAddToQueue: (track: Track) => void;
    onToggleLike: (track: Track) => void;
    isLiked: boolean;
    onAddToPlaylist?: (track: Track) => void;
    onGoToArtist?: (artist: string) => void;
    onGoToAlbum?: (albumId: string) => void;
    onBlock?: (track: Track) => void;
}

export default function ContextMenu({
    isOpen, track, position, onClose,
    onPlay, onPlayNext, onAddToQueue, onToggleLike, isLiked,
    onAddToPlaylist, onGoToArtist, onGoToAlbum, onBlock,
}: ContextMenuProps) {
    const { t } = useI18n();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    if (!track) return null;

    const items: ContextMenuItem[] = [
        {
            icon: <Play className="w-4 h-4" />,
            label: t('ctx-play'),
            action: () => { onPlay(track); onClose(); },
        },
        {
            icon: <ListPlus className="w-4 h-4" />,
            label: t('ctx-play-next'),
            action: () => { onPlayNext(track); onClose(); },
        },
        {
            icon: <Plus className="w-4 h-4" />,
            label: t('ctx-add-queue'),
            action: () => { onAddToQueue(track); onClose(); },
        },
        {
            icon: <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />,
            label: isLiked ? t('ctx-unlike') : t('ctx-like'),
            action: () => { onToggleLike(track); onClose(); },
        },
        ...(onAddToPlaylist ? [{
            icon: <ListMusic className="w-4 h-4" />,
            label: t('ctx-add-playlist'),
            action: () => { onAddToPlaylist(track); onClose(); },
        }] : []),
        { icon: null, label: '', action: () => {} }, // separator
        ...(track.isLocal ? [] : [
            {
                icon: <Share2 className="w-4 h-4" />,
                label: t('ctx-share'),
                action: () => { shareService.shareTrack(track); onClose(); },
            },
            {
                icon: <Download className="w-4 h-4" />,
                label: t('ctx-download'),
                action: () => { downloadService.downloadTrack(track); onClose(); },
            },
            { icon: null, label: '', action: () => {} }, // separator
            {
                icon: <ExternalLink className="w-4 h-4" />,
                label: t('ctx-open-original'),
                action: () => {
                    if (track.id.startsWith('y:')) {
                        window.open(`https://music.youtube.com/watch?v=${track.id.slice(2)}`, '_blank');
                    } else if (track.id.startsWith('j:')) {
                        window.open(`https://www.jamendo.com/track/${track.id.slice(2)}`, '_blank');
                    } else if (track.id.startsWith('ia:')) {
                        window.open(`https://archive.org/details/${track.id.slice(3)}`, '_blank');
                    }
                    onClose();
                },
            },
            {
                icon: <Copy className="w-4 h-4" />,
                label: t('ctx-copy-id'),
                action: () => {
                    navigator.clipboard.writeText(track.id);
                    onClose();
                },
            },
        ]),
    ];

    if (onGoToArtist && track.artist) {
        items.splice(3, 0, {
            icon: <ExternalLink className="w-4 h-4" />,
            label: t('ctx-go-artist'),
            action: () => { onGoToArtist(track.artist!); onClose(); },
        });
    }

    if (onGoToAlbum && track.album?.id) {
        items.splice(4, 0, {
            icon: <ExternalLink className="w-4 h-4" />,
            label: t('ctx-go-album'),
            action: () => { onGoToAlbum(track.album!.id); onClose(); },
        });
    }

    if (onBlock) {
        items.push({
            icon: <Ban className="w-4 h-4" />,
            label: t('ctx-block-track'),
            action: () => { onBlock(track); onClose(); },
            danger: true,
        });
    }

    // Calculate position to keep menu in viewport
    const menuWidth = 240;
    const menuHeight = items.length * 44;
    const x = Math.min(position.x, window.innerWidth - menuWidth - 10);
    const y = Math.min(position.y, window.innerHeight - menuHeight - 10);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[200]" onClick={onClose} />
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[201] w-60 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl dark:shadow-none border border-slate-200 dark:border-white/[0.08] overflow-hidden py-2"
                        style={{ left: x, top: y }}
                    >
                        {/* Track info header */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.05]">
                            <p className="text-[13px] font-extrabold text-slate-800 dark:text-white truncate">{track.title}</p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{track.artist || t('player-unknown-artist')}</p>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                            {items.map((item, i) => {
                                if (!item.icon) {
                                    return <div key={i} className="h-px bg-slate-100 dark:bg-white/[0.05] mx-3 my-1" />;
                                }
                                return (
                                    <button
                                        key={i}
                                        onClick={item.action}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold transition-colors ${
                                            item.danger
                                                ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span className={`${item.danger ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
