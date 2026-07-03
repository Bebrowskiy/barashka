import { Play, Pause, Heart, MoreHorizontal, Shuffle, ArrowLeft, BadgeCheck, Menu, Loader2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { musicAPI } from '../lib/music-api';
import { deezerAPI } from '../lib/deezer-api';
import type { Track } from '../types';

export default function ArtistView({ onMenuClick }: { onMenuClick?: () => void }) {
    const { t } = useI18n();
    const { selectedArtist, setActiveView, currentTrack, isPlaying, openPlaylist, playTrackWithQueue, showToast } = usePlayer();
    const [artistTracks, setArtistTracks] = useState<Track[]>([]);
    const [artistAlbums, setArtistAlbums] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [deezerData, setDeezerData] = useState<{ picture: string; pictureXl: string; fans: number } | null>(null);

    // Fetch Deezer data for picture and fans
    useEffect(() => {
        if (!selectedArtist?.name) return;
        deezerAPI.enrichArtist(selectedArtist.name, selectedArtist.avatar).then(data => {
            setDeezerData(data);
        }).catch(() => {});
    }, [selectedArtist?.name]);

    useEffect(() => {
        if (!selectedArtist?.id) return;

        setLoading(true);
        setError(false);
        setArtistTracks([]);
        setArtistAlbums([]);

        const controller = new AbortController();
        const artistName = selectedArtist.name;

        musicAPI.getArtist(selectedArtist.id)
            .then(result => {
                if (controller.signal.aborted) return;
                setArtistTracks(result.tracks || []);
                setArtistAlbums(result.albums || []);
                setLoading(false);
            })
            .catch(async (err) => {
                if (controller.signal.aborted) return;
                console.error('getArtist failed, trying search fallback:', err);
                // Fallback: search tracks by artist name
                if (artistName) {
                    try {
                        const result = await musicAPI.searchTracks(artistName, { limit: 30 });
                        if (controller.signal.aborted) return;
                        // Strict filter: only tracks where artist name matches closely
                        const nameLower = artistName.toLowerCase().replace(/\s*-\s*topic$/i, '').trim();
                        const matching = result.items.filter(t => {
                            const trackArtist = (t.artist || '').toLowerCase().replace(/\s*-\s*topic$/i, '').trim();
                            return trackArtist === nameLower ||
                                   trackArtist.includes(nameLower) ||
                                   nameLower.includes(trackArtist);
                        });
                        setArtistTracks(matching.length > 0 ? matching.slice(0, 20) : []);
                    } catch {
                        if (!controller.signal.aborted) setError(true);
                    }
                } else {
                    setError(true);
                }
                setLoading(false);
            });

        return () => controller.abort();
    }, [selectedArtist?.id]);

    if (!selectedArtist) return null;

    return (
        <div className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">
            {/* Header Image Area */}
            <div className="relative h-[250px] sm:h-[350px] w-full bg-slate-900 group">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 dark:opacity-40 transition-opacity duration-500"
                    style={{ backgroundImage: `url(${deezerData?.pictureXl || selectedArtist.avatar})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#121212] via-white/80 dark:via-[#121212]/80 to-transparent" />

                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-30 flex items-center gap-2">
                    <button onClick={onMenuClick} className="md:hidden p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white dark:hover:bg-black/80 rounded-full shadow-sm dark:shadow-none transition-all text-slate-800 dark:text-white border border-transparent dark:border-white/10">
                        <Menu className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setActiveView('home')}
                        className="p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white dark:hover:bg-black/80 rounded-full shadow-sm dark:shadow-none transition-all text-slate-800 dark:text-white border border-transparent dark:border-white/10 hidden sm:block"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                {/* Artist Title Area */}
                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-col sm:flex-row items-end justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        {selectedArtist.verified && (
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-white/90 dark:bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full w-fit border border-transparent dark:border-white/10">
                                <BadgeCheck className="w-4 h-4 fill-current text-white dark:text-black bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('artist-verified')}</span>
                            </div>
                        )}
                        <h1 className="text-5xl sm:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-sm">
                            {selectedArtist.name}
                        </h1>
                        <div className="flex items-center gap-2 ml-1">
                            {deezerData && deezerData.fans > 0 ? (
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                                    <Users className="w-4 h-4" />
                                    <span>{deezerAPI.formatFans(deezerData.fans)} {t('artist-listeners')}</span>
                                </div>
                            ) : (
                                <p className="text-slate-600 dark:text-slate-400 font-bold">{selectedArtist.monthlyListeners || ''}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        {artistTracks.length > 0 && (
                            <motion.button
                                onClick={() => playTrackWithQueue(artistTracks[0], artistTracks, 0)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-xl shadow-indigo-600/30 dark:shadow-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors flex-shrink-0"
                            >
                                {currentTrack?.artist === selectedArtist.name && isPlaying ? (
                                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                                ) : (
                                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current pl-1" />
                                )}
                            </motion.button>
                        )}
                        <button className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors hidden sm:flex border border-transparent dark:border-white/5">
                            <MoreHorizontal className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 sm:px-10 py-8 grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2">
                    <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 hidden sm:block">{t('artist-popular-tracks')}</h2>

                    {loading ? (
                        <div className="flex flex-col gap-1.5">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl animate-pulse">
                                    <div className="w-5 h-5 bg-slate-100 dark:bg-white/5 rounded" />
                                    <div className="w-12 h-12 rounded-[1rem] bg-slate-100 dark:bg-white/5" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-2/3 mb-2" />
                                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400 mb-4">{t('artist-load-error')}</p>
                            <button onClick={() => setActiveView('home')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Go back</button>
                        </div>
                    ) : artistTracks.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                            {artistTracks.map((track, idx) => {
                                const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                                return (
                                    <motion.div
                                        key={track.id}
                                        onClick={() => playTrackWithQueue(track, artistTracks, idx)}
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 30 }}
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
                                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
                                                )}
                                                <div className={`absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center transition-all ${isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    {isTrackPlaying ? <Pause className="w-4 h-4 text-white fill-current" /> : <Play className="w-4 h-4 text-white fill-current" />}
                                                </div>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`font-extrabold text-[15px] sm:text-[16px] leading-tight transition-colors mb-0.5 truncate ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{track.title}</span>
                                                {track.artist && (
                                                    <span className="text-slate-500 dark:text-slate-400 font-semibold text-[12px] sm:text-[13px] truncate">{track.artist}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-slate-400 dark:text-slate-500 flex-shrink-0">
                                            <span className="text-sm font-bold tabular-nums pr-2 bg-slate-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 px-3 py-1 rounded-full">{formatDuration(track.duration)}</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400">{t('artist-no-tracks')}</p>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-1">
                    <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">{t('artist-discography')}</h2>
                    {loading ? (
                        <div className="flex flex-col gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-[2rem] animate-pulse">
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-slate-100 dark:bg-white/5" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-2/3 mb-2" />
                                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : artistAlbums.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {artistAlbums.slice(0, 5).map((album, idx) => (
                                <div
                                    key={album.id || idx}
                                    onClick={() => openPlaylist(album)}
                                    className="group cursor-pointer p-3 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none flex items-center gap-4"
                                >
                                    <div className="relative w-20 h-20 rounded-[1.5rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                        {album.cover ? (
                                            <img src={album.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                                        )}
                                        <div className="absolute inset-0 bg-black/5 dark:bg-[#000000]/20 group-hover:bg-black/20 dark:group-hover:bg-[#000000]/40 transition-colors duration-300" />
                                        <button className="absolute inset-0 m-auto w-10 h-10 bg-white text-indigo-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
                                            <Play className="w-4 h-4 fill-current ml-1" />
                                        </button>
                                    </div>
                                    <div className="flex flex-col items-start gap-0.5 min-w-0 pr-2">
                                        <h3 className="font-extrabold text-[15px] sm:text-[16px] text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-left">{album.title}</h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 dark:text-slate-500 line-clamp-1">{album.type || 'Album'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-slate-500 dark:text-slate-400">No albums available.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
