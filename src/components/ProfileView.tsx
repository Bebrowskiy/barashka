import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ListMusic, Clock, Music, BarChart3, Pencil, Flame, Play } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePlayer } from '../context/PlayerContext';
import { db } from '../lib/db';
import { profileSettings } from '../lib/storage';

interface ProfileStats {
    likedTracks: number;
    likedAlbums: number;
    likedArtists: number;
    playlists: number;
    historyCount: number;
    totalListeningTime: number;
    totalPlays: number;
    uniqueTracks: number;
    currentStreak: number;
    longestStreak: number;
}

interface TopTrack {
    id: string;
    title: string;
    artist: string;
    cover?: string;
    playCount: number;
}

interface DailyHour {
    date: string;
    hours: number;
}

export default function ProfileView({ onBack, onOpenSettings: _onOpenSettings, onEditProfile, refreshKey }: { onBack: () => void; onOpenSettings?: () => void; onEditProfile?: () => void; refreshKey?: number }) {
    const { t: _t } = useI18n();
    const { likedTracks } = usePlayer();
    const [profile, setProfile] = useState(profileSettings.get());
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [recentTracks, setRecentTracks] = useState<any[]>([]);
    const [topArtists, setTopArtists] = useState<{ name: string; count: number; cover?: string }[]>([]);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
    const [dailyHours, setDailyHours] = useState<DailyHour[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setProfile(profileSettings.get());
        loadProfile();
    }, [refreshKey]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const [likedAlbums, likedArtists, playlists, history, playStats] = await Promise.all([
                db.getFavorites('album'),
                db.getFavorites('artist'),
                db.getPlaylists(),
                db.getHistory(500),
                db.getPlayCountStats(),
            ]);

            let totalListeningTime = 0;
            const artistCounts = new Map<string, { count: number; cover?: string }>();

            for (const track of history) {
                totalListeningTime += (track as any).duration || 0;
                const artistName = track.artist || 'Unknown';
                const existing = artistCounts.get(artistName);
                if (existing) {
                    existing.count++;
                } else {
                    artistCounts.set(artistName, { count: 1, cover: track.cover });
                }
            }

            const sortedArtists = [...artistCounts.entries()]
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([name, data]) => ({ name, ...data }));

            setStats({
                likedTracks: likedTracks.size,
                likedAlbums: likedAlbums.length,
                likedArtists: likedArtists.length,
                playlists: playlists.length,
                historyCount: history.length,
                totalListeningTime,
                totalPlays: playStats.totalPlays,
                uniqueTracks: playStats.uniqueTracks,
                currentStreak: playStats.currentStreak,
                longestStreak: playStats.longestStreak,
            });

            setRecentTracks(history.slice(0, 5));
            setTopArtists(sortedArtists);
            setTopTracks(playStats.topTracks);
            setDailyHours(playStats.dailyHours);
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const initials = (profile.nickname || 'B').charAt(0).toUpperCase();

    return (
        <div className="flex-1 bg-white dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4 border-b border-transparent dark:border-white/[0.02]">
                <button onClick={onBack} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Profile</h1>
                <button onClick={onEditProfile} className="ml-auto p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors" title="Edit profile">
                    <Pencil className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="px-4 sm:px-8 py-6 space-y-6">
                    {/* User Card */}
                    <div className="relative overflow-hidden rounded-3xl shadow-lg" style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}cc)` }}>
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-30" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-20" />
                        </div>
                        <div className="relative p-6 sm:p-8 flex items-center gap-5 text-white">
                            {profile.avatar ? (
                                <img src={profile.avatar} alt="Avatar" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white/20 shadow-xl" />
                            ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl sm:text-4xl font-black border-4 border-white/20 shadow-xl">
                                    {initials}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl sm:text-2xl font-black truncate">{profile.nickname}</h2>
                                {profile.bio && <p className="text-white/70 text-sm font-medium mt-1 line-clamp-2">{profile.bio}</p>}
                                {!profile.bio && <p className="text-white/50 text-sm font-medium mt-1">Tap pencil to edit profile</p>}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Heart className="w-5 h-5 text-rose-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.likedTracks}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Liked Tracks</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <ListMusic className="w-5 h-5 text-indigo-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.playlists}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Playlists</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Music className="w-5 h-5 text-emerald-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.likedAlbums}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Albums</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <BarChart3 className="w-5 h-5 text-amber-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.likedArtists}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Artists</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Clock className="w-5 h-5 text-sky-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.uniqueTracks}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Unique Tracks</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Play className="w-5 h-5 text-violet-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalPlays}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Total Plays</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Music className="w-5 h-5 text-violet-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatDuration(stats.totalListeningTime)}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Listen Time</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Flame className="w-5 h-5 text-orange-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.currentStreak}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Day Streak</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <Flame className="w-5 h-5 text-rose-500 mb-2" />
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.longestStreak}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold">Best Streak</p>
                            </div>
                        </div>
                    )}

                    {/* Listening Activity (Last 7 Days) */}
                    {dailyHours.length > 0 && dailyHours.some(d => d.hours > 0) && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Listening Activity</h3>
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-end gap-2 h-24">
                                    {dailyHours.map((day, i) => {
                                        const maxHours = Math.max(...dailyHours.map(d => d.hours), 1);
                                        const height = Math.max((day.hours / maxHours) * 100, 4);
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{day.hours > 0 ? `${day.hours}h` : ''}</span>
                                                <div className="w-full flex-1 flex items-end">
                                                    <div
                                                        className="w-full rounded-t-md bg-indigo-500 dark:bg-indigo-400 transition-all"
                                                        style={{ height: `${height}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{day.date}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top Tracks */}
                    {topTracks.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Top Tracks</h3>
                            <div className="space-y-2">
                                {topTracks.slice(0, 5).map((track, i) => (
                                    <div key={track.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.05]">
                                        <span className="w-6 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                                            {track.cover ? (
                                                <img src={track.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <Music className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{track.title}</p>
                                            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{track.artist}</p>
                                        </div>
                                        <span className="text-[12px] font-bold text-indigo-500 dark:text-indigo-400">{track.playCount}x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Artists */}
                    {topArtists.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Top Artists</h3>
                            <div className="space-y-2">
                                {topArtists.map((artist, i) => (
                                    <div key={artist.name} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.05]">
                                        <span className="w-6 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                                            {artist.cover ? (
                                                <img src={artist.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <Music className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{artist.name}</p>
                                        </div>
                                        <span className="text-[12px] text-slate-400">{artist.count}x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent */}
                    {recentTracks.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Recently Played</h3>
                            <div className="space-y-2">
                                {recentTracks.map((track, i) => (
                                    <div key={`${track.id}-${i}`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.05]">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                                            {track.cover ? (
                                                <img src={track.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <Music className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{track.title}</p>
                                            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{track.artist || 'Unknown'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
