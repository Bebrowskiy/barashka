import React, { useState, useRef } from 'react';
import { useI18n } from '../lib/i18n';
import { usePlayer } from '../context/PlayerContext';
import { profileSettings } from '../lib/storage';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7', '#f43f5e'];

const AVATAR_STYLES = [
    { name: 'Avataaars', prefix: 'avataaars', bg: 'b6e3f4' },
    { name: 'Bottts', prefix: 'bottts', bg: 'c0aede' },
    { name: 'Fun Emoji', prefix: 'fun-emoji', bg: 'ffdfbf' },
    { name: 'Icons', prefix: 'icons', bg: 'ffd5dc' },
    { name: 'Lorelei', prefix: 'lorelei', bg: 'b6e3f4' },
    { name: 'Micah', prefix: 'micah', bg: 'd1d4f9' },
    { name: 'Notionists', prefix: 'notionists', bg: 'd1d4f9' },
    { name: 'Open Peeps', prefix: 'open-peeps', bg: 'b6e3f4' },
    { name: 'Peeps', prefix: 'peeps', bg: 'c0aede' },
    { name: 'Pixel Art', prefix: 'pixel-art', bg: 'b6e3f4' },
    { name: 'Rings', prefix: 'rings', bg: 'c0aede' },
    { name: 'Shapes', prefix: 'shapes', bg: 'c0aede' },
];

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

type AvatarTab = 'preset' | 'url' | 'upload';

export default function ProfileEditModal({ isOpen, onClose, onSaved }: ProfileEditModalProps) {
    const { t } = useI18n();
    const { showToast } = usePlayer();
    const [profile, setProfile] = useState(profileSettings.get());
    const [avatarPreview, setAvatarPreview] = useState(profile.avatar);
    const [avatarTab, setAvatarTab] = useState<AvatarTab>('preset');
    const [urlInput, setUrlInput] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('Image must be under 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setAvatarPreview(result);
            setProfile(p => ({ ...p, avatar: result }));
            setSelectedStyle(null);
        };
        reader.readAsDataURL(file);
    };

    const handleUrlApply = () => {
        if (!urlInput.trim()) return;
        setAvatarPreview(urlInput.trim());
        setProfile(p => ({ ...p, avatar: urlInput.trim() }));
        setSelectedStyle(null);
        showToast('Avatar URL applied');
    };

    const handlePresetSelect = (style: typeof AVATAR_STYLES[0]) => {
        const nickname = profile.nickname || 'User';
        const seed = nickname.toLowerCase().replace(/\s/g, '-');
        const url = `https://api.dicebear.com/7.x/${style.prefix}/svg?seed=${seed}&backgroundColor=${style.bg}`;
        setAvatarPreview(url);
        setProfile(p => ({ ...p, avatar: url }));
        setSelectedStyle(style.prefix);
    };

    const randomizePreset = () => {
        const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
        const nickname = profile.nickname || 'User';
        const seed = `${nickname}-${Date.now()}`;
        const url = `https://api.dicebear.com/7.x/${style.prefix}/svg?seed=${seed}&backgroundColor=${style.bg}`;
        setAvatarPreview(url);
        setProfile(p => ({ ...p, avatar: url }));
        setSelectedStyle(style.prefix);
    };

    const removeAvatar = () => {
        setAvatarPreview('');
        setProfile(p => ({ ...p, avatar: '' }));
        setSelectedStyle(null);
        setUrlInput('');
    };

    const handleSave = () => {
        const trimmed = { ...profile, nickname: profile.nickname.trim() || 'Barashka User' };
        profileSettings.set(trimmed);
        showToast('Profile updated');
        onSaved();
        onClose();
    };

    if (!isOpen) return null;

    const initials = (profile.nickname || 'B').charAt(0).toUpperCase();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative group cursor-pointer" onClick={() => avatarTab === 'upload' && fileInputRef.current?.click()}>
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#1a1a1a] shadow-lg" crossOrigin="anonymous" />
                            ) : (
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg border-4 border-white dark:border-[#1a1a1a] transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: profile.color }}
                                >
                                    {initials}
                                </div>
                            )}
                            {avatarTab === 'upload' && (
                                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

                        {/* Avatar Tabs */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-full">
                            {([['preset', 'Choose'], ['url', 'URL'], ['upload', 'Upload']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setAvatarTab(key)}
                                    className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${avatarTab === key ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Preset Avatars */}
                        {avatarTab === 'preset' && (
                            <div className="w-full space-y-3">
                                <button
                                    onClick={randomizePreset}
                                    className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Random Avatar
                                </button>
                                <div className="grid grid-cols-4 gap-2">
                                    {AVATAR_STYLES.map((style) => {
                                        const seed = (profile.nickname || 'User').toLowerCase().replace(/\s/g, '-');
                                        const url = `https://api.dicebear.com/7.x/${style.prefix}/svg?seed=${seed}&backgroundColor=${style.bg}`;
                                        return (
                                            <button
                                                key={style.prefix}
                                                onClick={() => handlePresetSelect(style)}
                                                className={`aspect-square rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${selectedStyle === style.prefix ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                                            >
                                                <img src={url} alt={style.name} className="w-full h-full" crossOrigin="anonymous" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* URL Input */}
                        {avatarTab === 'url' && (
                            <div className="w-full space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://example.com/avatar.jpg"
                                        className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                                    />
                                    <button
                                        onClick={handleUrlApply}
                                        disabled={!urlInput.trim()}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                                    >
                                        Apply
                                    </button>
                                </div>
                                {urlInput && (
                                    <div className="flex justify-center">
                                        <img src={urlInput} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-white/10" crossOrigin="anonymous" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Upload */}
                        {avatarTab === 'upload' && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">Click the avatar above to upload</p>
                        )}

                        {avatarPreview && (
                            <button onClick={removeAvatar} className="text-sm text-rose-500 hover:text-rose-600 font-bold transition-colors">
                                Remove photo
                            </button>
                        )}
                    </div>

                    {/* Nickname */}
                    <div>
                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">Nickname</label>
                        <input
                            type="text"
                            value={profile.nickname}
                            onChange={(e) => setProfile(p => ({ ...p, nickname: e.target.value }))}
                            maxLength={30}
                            placeholder="Your name"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">Bio</label>
                        <textarea
                            value={profile.bio}
                            onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                            maxLength={150}
                            rows={2}
                            placeholder="Tell something about yourself..."
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                        />
                        <p className="text-right text-xs text-slate-400 mt-1">{profile.bio.length}/150</p>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-3">Avatar Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setProfile(p => ({ ...p, color }))}
                                    className={`w-9 h-9 rounded-full transition-all ${profile.color === color ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#121212] scale-110' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-white/5 flex gap-3 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
