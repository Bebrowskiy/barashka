import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Clock, Trash2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePlayer } from '../context/PlayerContext';
import { db } from '../lib/db';
import type { Track } from '../types';

export default function HistoryView({ onBack }: { onBack: () => void }) {
    const { t: _t } = useI18n();
    const { currentTrack, isPlaying, playTrackWithQueue } = usePlayer();
    const [history, setHistory] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const tracks = await db.getHistory(200);
            setHistory(tracks);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const clearHistory = async () => {
        if (!confirm('Clear all listening history?')) return;
        try {
            await db.clearHistory();
            setHistory([]);
        } catch (err) {
            console.error('Failed to clear history:', err);
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const handlePlayTrack = (track: Track, index: number) => {
        playTrackWithQueue(track, history, index);
    };

    return (
        <div className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4 border-b border-transparent dark:border-white/[0.02]">
                <button onClick={onBack} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Listening History</h1>
                </div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors" title="Clear history">
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="px-4 sm:px-8 py-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-16">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400 font-bold">No listening history yet</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Tracks you listen to will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {history.map((track, index) => {
                            const isCurrentTrack = currentTrack?.id === track.id;
                            return (
                                <div
                                    key={`${track.id}-${index}`}
                                    onClick={() => handlePlayTrack(track, index)}
                                    className={`flex items-center gap-3 sm:gap-4 p-3 rounded-xl cursor-pointer group transition-all ${isCurrentTrack ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}`}
                                >
                                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 flex-shrink-0 relative">
                                        {track.cover ? (
                                            <img src={track.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <Play className="w-4 h-4" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isCurrentTrack && isPlaying ? (
                                                <Pause className="w-4 h-4 text-white" />
                                            ) : (
                                                <Play className="w-4 h-4 text-white" fill="white" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[14px] font-bold truncate ${isCurrentTrack ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
                                            {track.title}
                                        </p>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                                            {track.artist || 'Unknown Artist'}
                                        </p>
                                    </div>

                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                        {formatTime((track as any).timestamp || 0)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
