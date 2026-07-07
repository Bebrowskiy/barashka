import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Home, Heart, Plus, Library, Settings, Info, FolderOpen } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { profileSettings } from '../lib/storage';

const BarashkaLogo = () => (
    <div className="relative flex items-center justify-center w-12 h-12 rounded-[1.2rem] overflow-hidden shrink-0">
        <img src="assets/logo.svg" alt="Barashka" className="w-full h-full invert dark:invert-0" />
    </div>
);

export default function Sidebar({ onClose, onOpenProfile }: { onClose?: () => void; onOpenProfile?: () => void }) {
    const [activeNav, setActiveNav] = useState('Home');
    const [profile, setProfile] = useState(profileSettings.get());
    const { activeView, setActiveView, setIsCreatePlaylistOpen, openPlaylist, setIsAboutOpen } = usePlayer();
    const { t } = useI18n();

    useEffect(() => {
        const interval = setInterval(() => {
            const p = profileSettings.get();
            setProfile(p);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeView === 'artist' || activeView === 'playlist') {
            setActiveNav('');
        } else if (activeView === 'home') {
            setActiveNav('Home');
        } else if (activeView === 'library') {
            setActiveNav('Library');
        } else if (activeView === 'settings') {
            setActiveNav('Settings');
        } else if (activeView === 'search') {
            setActiveNav('Search');
        } else if (activeView === 'local') {
            setActiveNav('');
        }
    }, [activeView]);

    const navItems = [
        { icon: Home, label: 'Home', translationKey: 'sidebar-nav-home' },
        { icon: Library, label: 'Library', translationKey: 'sidebar-nav-library' },
        { icon: Settings, label: 'Settings', translationKey: 'sidebar-nav-settings' },
    ];

    const libraryItems = [
        { icon: Heart, label: 'Liked Tracks', color: 'text-rose-500', bg: 'bg-rose-50', action: () => openPlaylist('Liked Tracks') },
        { icon: FolderOpen, label: 'Local Files', color: 'text-amber-500', bg: 'bg-amber-50', action: () => setActiveView('local') },
    ];

    return (
        <aside className="w-[280px] h-full flex flex-col bg-white dark:bg-white/[0.02] rounded-[2.5rem] py-8 shadow-sm border border-slate-100 dark:border-white/[0.05] flex-shrink-0 transition-all">

            <div className="flex items-center gap-4 px-8 mb-10">
                <BarashkaLogo />
                <span className="font-display font-extrabold text-[1.4rem] tracking-tight text-slate-900 dark:text-white">
                    Barashka
                </span>
            </div>

            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-8 mb-4">Menu</p>
            <nav className="flex flex-col gap-1.5 mb-10 px-4">
                {navItems.map((item) => {
                    const isActive = activeNav === item.label;
                    return (
                    <motion.a
                        key={item.label}
                        onClick={(e) => {
                            e.preventDefault();
                            setActiveNav(item.label);
                            if (item.label === 'Home') setActiveView('home');
                            if (item.label === 'Library') setActiveView('library');
                            if (item.label === 'Settings') setActiveView('settings');
                            onClose?.();
                        }}
                        href="#"
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-[15px] transition-all duration-200 ${
                            isActive
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                        {t(item.translationKey)}
                    </motion.a>
                )})}
            </nav>

            <div className="flex items-center justify-between px-8 mb-4">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('sidebar-library-heading')}</p>
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsCreatePlaylistOpen(true)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 p-1 rounded-full"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                </motion.button>
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto hide-scrollbar px-4 mb-4">
                {libraryItems.map((item) => (
                    <motion.a
                        key={item.label}
                        href="#"
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.preventDefault(); item.action(); onClose?.(); }}
                        className="flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-[15px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-200 group"
                    >
                        <div className={`w-9 h-9 flex items-center justify-center rounded-xl ${item.bg} dark:bg-white/5 group-hover:scale-105 transition-transform`}>
                           <item.icon className={`w-4 h-4 ${item.color}`} strokeWidth={2.5} />
                        </div>
                        {item.label}
                    </motion.a>
                ))}

            </div>

            <div className="mt-auto px-8 pb-2 pt-4 space-y-2">
                <a href="#" onClick={(e) => { e.preventDefault(); onOpenProfile?.(); onClose?.(); }} className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-bold text-[13px]">
                    {profile.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover" crossOrigin="anonymous" />
                    ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: profile.color }}>
                            {(profile.nickname || 'B').charAt(0).toUpperCase()}
                        </div>
                    )}
                    {profile.nickname || 'Profile'}
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsAboutOpen(true); onClose?.(); }} className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-bold text-[13px]">
                    <Info className="w-4 h-4" strokeWidth={2.5} />
                    {t('sidebar-about')}
                </a>
            </div>

        </aside>
    );
}
