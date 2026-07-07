import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Heart, Shuffle, LayoutGrid, List, Plus, Menu, Music, Disc, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';
import type { Track, Album, Artist } from '../types';

const tabs = ['Playlists', 'Saved Tracks', 'Albums', 'Artists'];

export default function LibraryView({ onMenuClick }: { onMenuClick?: () => void }) {
    const { currentTrack, isPlaying, likedTracks, toggleLike, likedAlbums, toggleAlbumLike, likedArtists, toggleArtistLike, openArtist, openPlaylist, setIsCreatePlaylistOpen, playTrackWithQueue } = usePlayer();
    const { t } = useI18n();
    const tabLabels: Record<string, string> = {
        'Playlists': t('library-tab-playlists'),
        'Saved Tracks': t('library-tab-saved'),
        'Albums': t('library-tab-albums'),
        'Artists': t('library-tab-artists'),
    };
    const [activeTab, setActiveTab] = useState('Saved Tracks');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [savedTracks, setSavedTracks] = useState<Track[]>([]);
    const [savedAlbums, setSavedAlbums] = useState<Album[]>([]);
    const [savedArtists, setSavedArtists] = useState<Artist[]>([]);
    const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const query = searchQuery.toLowerCase().trim();

    const filteredTracks = useMemo(() =>
        query ? savedTracks.filter(t => t.title.toLowerCase().includes(query) || (t.artist || '').toLowerCase().includes(query)) : savedTracks,
        [savedTracks, query]
    );
    const filteredAlbums = useMemo(() =>
        query ? savedAlbums.filter(a => a.title.toLowerCase().includes(query) || (typeof a.artist === 'object' ? a.artist?.name : a.artist || '').toLowerCase().includes(query)) : savedAlbums,
        [savedAlbums, query]
    );
    const filteredArtists = useMemo(() =>
        query ? savedArtists.filter(a => a.name.toLowerCase().includes(query)) : savedArtists,
        [savedArtists, query]
    );

    useEffect(() => {
        db.getFavorites('track').then(setSavedTracks).catch(console.error);
        db.getFavorites('album').then(setSavedAlbums).catch(console.error);
        db.getFavorites('artist').then(setSavedArtists).catch(console.error);
        db.getPlaylists().then(setUserPlaylists).catch(console.error);
    }, [likedTracks, likedAlbums, likedArtists]);

    return (
        <div className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-slate-100 dark:border-white/[0.02] pb-4 pt-8 px-6 sm:px-10 flex flex-col gap-8">
                <div className="flex items-center gap-4">
                    <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0 focus:outline-none">
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">{t('library-title')}</h1>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                                    activeTab === tab
                                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-500/20'
                                        : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                }`}
                            >
                                {tabLabels[tab]}
                            </button>
                        ))}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-white/10 shadow-sm dark:shadow-none text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 shadow-sm dark:shadow-none text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {activeTab !== 'Playlists' && (
                <div className="px-6 sm:px-10 pt-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('library-search')}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/[0.05] rounded-full text-[14px] font-bold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="px-6 sm:px-10 py-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'Saved Tracks' && (
                            <div className="flex flex-col">
                                {filteredTracks.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Heart className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('library-no-saved')}</h3>
                                        <p className="text-slate-500 dark:text-slate-400">{t('library-no-saved-desc')}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 mb-6">
                                            <button
                                                onClick={() => { if(filteredTracks.length > 0) playTrackWithQueue(filteredTracks[0], filteredTracks, 0) }}
                                                className="flex items-center justify-center bg-indigo-600 dark:bg-indigo-500 text-white w-12 h-12 rounded-full shadow-lg shadow-indigo-200 dark:shadow-indigo-500/20 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors shrink-0"
                                            >
                                                <Play className="w-5 h-5 fill-current pl-1" />
                                            </button>
                                            <button className="flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 w-12 h-12 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors shrink-0">
                                                <Shuffle className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {viewMode === 'list' ? (
                                            <div className="flex flex-col gap-1.5">
                                                {filteredTracks.map((track, idx) => {
                                                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                                                    const isTrackLiked = likedTracks.has(track.id);
                                                    return (
                                                    <div
                                                        key={track.id}
                                                        onClick={() => playTrackWithQueue(track, savedTracks, idx)}
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
                                                                <span
                                                                    className="text-slate-500 dark:text-slate-400 font-semibold text-[12px] sm:text-[13px] truncate hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 w-fit"
                                                                    onClick={(e) => { e.stopPropagation(); openArtist(track.artist || 'Unknown'); }}
                                                                >
                                                                    {track.artist || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 sm:gap-6 text-slate-400 dark:text-slate-500 flex-shrink-0">
                                                            <button
                                                                onClick={(e) => toggleLike(track.id, e)}
                                                                className={`p-2 rounded-full transition-all ${isTrackLiked ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-500'}`}
                                                            >
                                                                <Heart className="w-5 h-5" fill={isTrackLiked ? "currentColor" : "none"} />
                                                            </button>
                                                            <span className="text-sm font-bold tabular-nums pr-2 bg-slate-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 px-3 py-1 rounded-full">{formatDuration(track.duration)}</span>
                                                        </div>
                                                    </div>
                                                )})}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                                {filteredTracks.map((track, idx) => {
                                                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                                                    return (
                                                        <div
                                                            key={track.id}
                                                            className="group cursor-pointer p-4 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none flex flex-col items-start gap-3"
                                                            onClick={() => playTrackWithQueue(track, savedTracks, idx)}
                                                        >
                                                            <div className="relative w-full aspect-square rounded-[1.5rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                                                {track.cover ? (
                                                                    <img src={track.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                                                                )}
                                                                <div className={`absolute inset-0 transition-colors duration-300 ${isTrackPlaying ? 'bg-black/20 dark:bg-[#000000]/40' : 'bg-black/5 dark:bg-[#000000]/20 group-hover:bg-black/20 dark:group-hover:bg-[#000000]/40'}`} />
                                                                <button className={`absolute right-3 bottom-3 w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isTrackPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}>
                                                                    {isTrackPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col items-start gap-0.5 w-full">
                                                                <h3 className={`font-extrabold text-[15px] sm:text-[16px] line-clamp-1 transition-colors text-left w-full ${isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{track.title}</h3>
                                                                <p
                                                                    className="text-[12px] sm:text-[13px] font-bold text-slate-400 dark:text-slate-500 line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                                                    onClick={(e) => { e.stopPropagation(); openArtist(track.artist || 'Unknown'); }}
                                                                >
                                                                    {track.artist || 'Unknown'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'Playlists' && (
                            <div>
                                {viewMode === 'list' ? (
                                    <div className="flex flex-col gap-2">
                                        <div
                                            onClick={() => setIsCreatePlaylistOpen(true)}
                                            className="group cursor-pointer bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-300 dark:hover:border-indigo-400/50 rounded-[1.5rem] transition-all flex items-center p-3 gap-4"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform flex-shrink-0">
                                                <Plus className="w-6 h-6" strokeWidth={3} />
                                            </div>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[16px]">{t('library-new-playlist')}</span>
                                        </div>

                                        {userPlaylists.map((pl, i) => (
                                            <div key={pl.id} onClick={() => openPlaylist(pl)} className="group cursor-pointer p-3 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-[1rem] bg-gradient-to-br ${i%2===0 ? 'from-indigo-400 to-purple-500' : 'from-emerald-400 to-cyan-500'} flex items-center justify-center shadow-inner relative overflow-hidden flex-shrink-0`}>
                                                    <List className="w-6 h-6 text-white/50" />
                                                    <button className="absolute inset-0 m-auto w-8 h-8 bg-white text-slate-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md">
                                                        <Play className="w-4 h-4 fill-current ml-1" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <h3 className="font-extrabold text-[15px] sm:text-[16px] text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{pl.title}</h3>
                                                    <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 dark:text-slate-500">{(pl.tracks || []).length} {t('playlist-songs')}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {userPlaylists.length === 0 && (
                                            <div className="text-center py-12">
                                                <p className="text-slate-500 dark:text-slate-400">{t('library-no-playlists')}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                        <div
                                            onClick={() => setIsCreatePlaylistOpen(true)}
                                            className="group cursor-pointer bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-300 dark:hover:border-indigo-400/50 rounded-[2rem] transition-all flex flex-col items-center justify-center gap-3 aspect-square h-auto"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform">
                                                <Plus className="w-6 h-6" strokeWidth={3} />
                                            </div>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{t('library-new-playlist')}</span>
                                        </div>

                                        {userPlaylists.map((pl, i) => (
                                            <div key={pl.id} onClick={() => openPlaylist(pl)} className="group cursor-pointer rounded-[2rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none overflow-hidden aspect-square flex flex-col">
                                                <div className={`relative flex-1 bg-gradient-to-br ${i%2===0 ? 'from-indigo-400 to-purple-500' : i%3===0 ? 'from-emerald-400 to-cyan-500' : 'from-rose-400 to-orange-500'} flex items-center justify-center`}>
                                                    {pl.cover ? (
                                                        <img src={pl.cover} className="w-full h-full object-cover" alt={pl.title} />
                                                    ) : (
                                                        <List className="w-10 h-10 text-white/30" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                        <div className="w-12 h-12 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-md">
                                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-[#1A1A1A] p-3">
                                                    <h3 className="font-extrabold text-[14px] text-slate-800 dark:text-slate-200 line-clamp-1">{pl.title}</h3>
                                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{(pl.tracks || []).length} {t('playlist-songs')}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {userPlaylists.length === 0 && (
                                            <div className="col-span-full text-center py-12">
                                                <p className="text-slate-500 dark:text-slate-400">{t('library-no-playlists')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Albums' && (
                            <div>
                                {filteredAlbums.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Disc className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('library-no-albums')}</h3>
                                        <p className="text-slate-500 dark:text-slate-400">{t('library-no-albums-desc')}</p>
                                    </div>
                                ) : viewMode === 'list' ? (
                                    <div className="flex flex-col gap-1.5">
                                        {filteredAlbums.map((album) => (
                                            <div
                                                key={album.id}
                                                onClick={() => openPlaylist(album)}
                                                className="group cursor-pointer p-3 rounded-2xl transition-colors border border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/[0.05]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-14 h-14 rounded-[1rem] overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                                        {album.cover ? (
                                                            <img src={String(album.cover)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"><Disc className="w-6 h-6 text-white/50" /></div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                            <Play className="w-5 h-5 text-white fill-current" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-extrabold text-[15px] sm:text-[16px] text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{album.title}</h3>
                                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 dark:text-slate-500 truncate">{typeof album.artist === 'object' ? album.artist?.name : album.artist || 'Unknown'}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => toggleAlbumLike(album, e)}
                                                        className={`p-2 rounded-full transition-all ${likedAlbums.has(album.id) ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 dark:text-slate-500'}`}
                                                    >
                                                        <Heart className="w-5 h-5" fill={likedAlbums.has(album.id) ? "currentColor" : "none"} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                        {filteredAlbums.map((album) => (
                                            <div
                                                key={album.id}
                                                onClick={() => openPlaylist(album)}
                                                className="group cursor-pointer rounded-[2rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none overflow-hidden aspect-square flex flex-col"
                                            >
                                                <div className="relative flex-1 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                                    {album.cover ? (
                                                        <img src={String(album.cover)} className="w-full h-full object-cover" alt={album.title} />
                                                    ) : (
                                                        <Disc className="w-10 h-10 text-white/30" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 dark:bg-[#000000]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                        <div className="w-12 h-12 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-md">
                                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => toggleAlbumLike(album, e)}
                                                        className={`absolute top-3 right-3 p-2 rounded-full transition-all ${likedAlbums.has(album.id) ? 'text-rose-500 bg-black/20 opacity-100' : 'opacity-0 group-hover:opacity-100 text-white bg-black/20'}`}
                                                    >
                                                        <Heart className="w-4 h-4" fill={likedAlbums.has(album.id) ? "currentColor" : "none"} />
                                                    </button>
                                                </div>
                                                <div className="bg-white dark:bg-[#1A1A1A] p-3">
                                                    <h3 className="font-extrabold text-[14px] text-slate-800 dark:text-slate-200 line-clamp-1">{album.title}</h3>
                                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{typeof album.artist === 'object' ? album.artist?.name : album.artist || 'Unknown'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Artists' && (
                            <div>
                                {filteredArtists.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Music className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('library-no-artists')}</h3>
                                        <p className="text-slate-500 dark:text-slate-400">{t('library-no-artists-desc')}</p>
                                    </div>
                                ) : viewMode === 'list' ? (
                                    <div className="flex flex-col gap-1.5">
                                        {filteredArtists.map((artist) => (
                                            <div
                                                key={artist.id}
                                                onClick={() => openArtist({ id: artist.id, name: artist.name, avatar: String(artist.avatar || artist.picture || ''), monthlyListeners: artist.monthlyListeners, verified: artist.verified })}
                                                className="group cursor-pointer p-3 rounded-2xl transition-colors border border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-100 dark:hover:border-white/[0.05]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05]">
                                                        {(artist.avatar || artist.picture) ? (
                                                            <img src={String(artist.avatar || artist.picture)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" crossOrigin="anonymous" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"><Music className="w-6 h-6 text-white/50" /></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-extrabold text-[15px] sm:text-[16px] text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{artist.name}</h3>
                                                        {artist.monthlyListeners && <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 dark:text-slate-500">{artist.monthlyListeners} monthly listeners</p>}
                                                    </div>
                                                    <button
                                                        onClick={(e) => toggleArtistLike(artist, e)}
                                                        className={`p-2 rounded-full transition-all ${likedArtists.has(artist.id) ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 dark:text-slate-500'}`}
                                                    >
                                                        <Heart className="w-5 h-5" fill={likedArtists.has(artist.id) ? "currentColor" : "none"} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                        {filteredArtists.map((artist) => (
                                            <div
                                                key={artist.id}
                                                onClick={() => openArtist({ id: artist.id, name: artist.name, avatar: String(artist.avatar || artist.picture || ''), monthlyListeners: artist.monthlyListeners, verified: artist.verified })}
                                                className="group cursor-pointer rounded-[2rem] border border-slate-100 dark:border-white/[0.05] transition-all hover:shadow-md dark:hover:shadow-none overflow-hidden aspect-square flex flex-col"
                                            >
                                                <div className="relative flex-1 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                                    {(artist.avatar || artist.picture) ? (
                                                        <img src={String(artist.avatar || artist.picture)} className="w-full h-full object-cover rounded-full" alt={artist.name} crossOrigin="anonymous" />
                                                    ) : (
                                                        <Music className="w-10 h-10 text-white/30" />
                                                    )}
                                                    <button
                                                        onClick={(e) => toggleArtistLike(artist, e)}
                                                        className={`absolute top-3 right-3 p-2 rounded-full transition-all ${likedArtists.has(artist.id) ? 'text-rose-500 bg-black/20 opacity-100' : 'opacity-0 group-hover:opacity-100 text-white bg-black/20'}`}
                                                    >
                                                        <Heart className="w-4 h-4" fill={likedArtists.has(artist.id) ? "currentColor" : "none"} />
                                                    </button>
                                                </div>
                                                <div className="bg-white dark:bg-[#1A1A1A] p-3">
                                                    <h3 className="font-extrabold text-[14px] text-slate-800 dark:text-slate-200 line-clamp-1">{artist.name}</h3>
                                                    {artist.monthlyListeners && <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{artist.monthlyListeners}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
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
