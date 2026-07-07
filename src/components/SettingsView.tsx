import { useState, useEffect } from 'react';
import { Volume2, Palette, Globe, Headphones, Zap, Menu, Search, Link2, Music, Cloud, Download, Timer, ListMusic, Eye, FileText, Calendar } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n, LANGUAGES } from '../lib/i18n';
import { logger } from '../lib/youtube-api';
import { profileSettings, discordRPCSettings } from '../lib/storage';
import {
    replayGainSettings,
    crossfadeSettings,
    audioEffectsSettings,
    audioEnhancementsSettings,
    cardSettings,
    sidebarSettings,
    musicProviderSettings,
    jamendoSettings,
    downloadSettings,
    lastFMSettings,
    listenBrainzSettings,
    malojaSettings,
    libreFmSettings,
    scrobbleSettings,
    apiSettings,
} from '../lib/storage';
import { musicAPI } from '../lib/music-api';
import { audioEngine } from '../lib/audio-engine';
import { equalizer } from '../lib/equalizer';
import type { QualityPreset } from '../types';

const TABS = ['Appearance', 'Audio', 'Interface', 'Scrobbling', 'Downloads', 'System'];

const QUALITY_OPTIONS: { value: QualityPreset; label: string; desc: string }[] = [
    { value: 'HI_RES_LOSSLESS', label: 'Hi-Res Lossless', desc: 'Up to 24-bit/192kHz' },
    { value: 'LOSSLESS', label: 'Lossless', desc: '16-bit/44.1kHz FLAC' },
    { value: 'HIGH', label: 'High', desc: '320kbps AAC' },
    { value: 'MP3_320', label: 'MP3 320', desc: '320kbps MP3' },
    { value: 'LOW', label: 'Low', desc: '96kbps AAC' },
];

const REPLAY_GAIN_MODES = ['off', 'track', 'album'] as const;

const CROSSFADE_CURVES = ['linear', 'logarithmic', 'exponential', 'sine', 'cosine'] as const;

const PROVIDERS = [
    { value: 'youtube', label: 'YouTube Music' },
    { value: 'jamendo', label: 'Jamendo Music' },
    { value: 'internet_archive', label: 'Internet Archive' },
] as const;

export default function SettingsView({ onMenuClick, onSyncOpen, onOpenProfile }: { onMenuClick?: () => void; onSyncOpen?: () => void; onOpenProfile?: () => void }) {
    const { showToast, setActiveView, theme, setTheme, quality, setQuality } = usePlayer();
    const { lang, setLang, t } = useI18n();
    const [activeTab, setActiveTab] = useState('Appearance');
    const [searchQuery, setSearchQuery] = useState('');

    // Audio settings
    const [rg, setRg] = useState(replayGainSettings.get());
    const [crossfade, setCrossfade] = useState(crossfadeSettings.get());
    const [audioFx, setAudioFx] = useState(audioEffectsSettings.get());
    const [audioEnh, setAudioEnh] = useState(audioEnhancementsSettings.get());
    const [eqState, setEqState] = useState({
        enabled: equalizer.enabled,
        gains: [...equalizer.gains],
        preamp: equalizer.preamp,
        bandCount: equalizer.bandCount,
        frequencies: [...equalizer.frequencies],
    });

    useEffect(() => {
        return equalizer.subscribe(() => {
            setEqState({
                enabled: equalizer.enabled,
                gains: [...equalizer.gains],
                preamp: equalizer.preamp,
                bandCount: equalizer.bandCount,
                frequencies: [...equalizer.frequencies],
            });
        });
    }, []);

    // UI settings
    const [cards, setCards] = useState(cardSettings.get());
    const [sidebar, setSidebar] = useState(sidebarSettings.get());

    // Provider
    const [provider, setProvider] = useState(musicProviderSettings.get());
    const [jamendo, setJamendo] = useState(jamendoSettings.get());

    // Downloads
    const [downloads, setDownloads] = useState(downloadSettings.get());

    // Scrobbling
    const [lastfm, setLastfm] = useState(lastFMSettings.get());
    const [listenbrainz, setListenbrainz] = useState(listenBrainzSettings.get());
    const [maloja, setMaloja] = useState(malojaSettings.get());
    const [librefm, setLibrefm] = useState(libreFmSettings.get());
    const [scrobble, setScrobble] = useState(scrobbleSettings.get());

    // API
    const [apiInstances, setApiInstances] = useState(apiSettings.get());
    const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>(logger.getLogs());
    const [discordRPC, setDiscordRPC] = useState(discordRPCSettings.get());

    // Sync providers to audio engine on change
    useEffect(() => {
        audioEngine.setQuality(quality);
    }, [quality]);

    const updateRg = (patch: Partial<typeof rg>) => {
        const next = { ...rg, ...patch };
        setRg(next);
        replayGainSettings.set(next);
        showToast('ReplayGain settings saved');
    };

    const updateCrossfade = (patch: Partial<typeof crossfade>) => {
        const next = { ...crossfade, ...patch };
        setCrossfade(next);
        crossfadeSettings.set(next);
        showToast('Crossfade settings saved');
    };

    const updateAudioFx = (patch: Partial<typeof audioFx>) => {
        const next = { ...audioFx, ...patch };
        setAudioFx(next);
        audioEffectsSettings.set(next);
        showToast('Audio effects saved');
    };

    const updateAudioEnh = (patch: Partial<typeof audioEnh>) => {
        const next = { ...audioEnh, ...patch };
        setAudioEnh(next);
        audioEnhancementsSettings.set(next);
        showToast('Audio enhancements saved');
    };

    const updateCards = (patch: Partial<typeof cards>) => {
        const next = { ...cards, ...patch };
        setCards(next);
        cardSettings.set(next);
    };

    const updateSidebar = (patch: Partial<typeof sidebar>) => {
        const next = { ...sidebar, ...patch };
        setSidebar(next);
        sidebarSettings.set(next);
    };

    const updateProvider = (val: typeof provider) => {
        setProvider(val);
        musicProviderSettings.set(val);
        showToast(`Music provider changed to ${val}`);
    };

    const updateDownloads = (patch: Partial<typeof downloads>) => {
        const next = { ...downloads, ...patch };
        setDownloads(next);
        downloadSettings.set(next);
        showToast('Download settings saved');
    };

    const updateLastfm = (patch: Partial<typeof lastfm>) => {
        const next = { ...lastfm, ...patch };
        setLastfm(next);
        lastFMSettings.set(next);
    };

    const updateListenbrainz = (patch: Partial<typeof listenbrainz>) => {
        const next = { ...listenbrainz, ...patch };
        setListenbrainz(next);
        listenBrainzSettings.set(next);
    };

    const updateMaloja = (patch: Partial<typeof maloja>) => {
        const next = { ...maloja, ...patch };
        setMaloja(next);
        malojaSettings.set(next);
    };

    const updateLibrefm = (patch: Partial<typeof librefm>) => {
        const next = { ...librefm, ...patch };
        setLibrefm(next);
        libreFmSettings.set(next);
    };

    const updateScrobble = (patch: Partial<typeof scrobble>) => {
        const next = { ...scrobble, ...patch };
        setScrobble(next);
        scrobbleSettings.set(next);
    };

    const updateDiscordRPC = (patch: Partial<typeof discordRPC>) => {
        const next = { ...discordRPC, ...patch };
        setDiscordRPC(next);
        discordRPCSettings.set(next);
        if (patch.enabled === true) {
            discordRPC.enable();
            showToast('Discord RPC enabled');
        } else if (patch.enabled === false) {
            discordRPC.disable();
            showToast('Discord RPC disabled');
        }
    };

    const testApi = async () => {
        setApiTestStatus('testing');
        try {
            await musicAPI.searchTracks('test', { limit: 1 });
            setApiTestStatus('ok');
            showToast('API connection successful');
        } catch {
            setApiTestStatus('error');
            showToast('API connection failed');
        }
    };

    return (
        <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] rounded-[2.5rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.05] overflow-y-auto relative hide-scrollbar pb-32">
            <div className="sticky top-0 z-20 bg-slate-50/90 dark:bg-[#000000]/80 backdrop-blur-xl flex flex-col pt-8 px-6 sm:px-10 gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0 focus:outline-none">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">{t('settings-title')}</h1>
                    </div>
                </div>

                <div className="relative max-w-2xl">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('settings-search')}
                        className="w-full bg-slate-200/50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-8 overflow-x-auto hide-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-[15px] font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            {t(`settings-tab-${tab.toLowerCase()}`)}
                        </button>
                    ))}
                </div>
                <div className="h-px bg-slate-200 dark:bg-white/10 w-full absolute bottom-0 left-0"></div>
            </div>

            <div className="px-6 sm:px-10 py-8 max-w-5xl mx-auto space-y-8 min-h-[50vh]">
                {activeTab === 'Appearance' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">{t('settings-heading-appearance')}</h2>
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            {/* Theme */}
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Palette className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-theme-label')}</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-theme-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 dark:bg-[#000000]/40 border border-transparent dark:border-white/5 p-1 rounded-[1rem] w-full sm:w-auto min-w-[240px]">
                                    {['Light', 'Dark', 'System'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => {
                                                setTheme(t.toLowerCase() as any);
                                                showToast(`Theme changed to ${t}`);
                                            }}
                                            className={`flex-1 py-2 text-[13px] font-bold rounded-[0.75rem] transition-all ${theme === t.toLowerCase() ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cover art size */}
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Eye className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-cover-quality-label')}</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-cover-quality-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {[160, 320, 640].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateCards({ coverArtSize: size })}
                                            className={`px-4 py-2 text-[13px] font-bold rounded-full transition-all ${cards.coverArtSize === size ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                                        >
                                            {size}px
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quality badges */}
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Music className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-quality-badges-label')}</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-quality-badges-desc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={cards.showQualityBadge}
                                        onChange={() => updateCards({ showQualityBadge: !cards.showQualityBadge })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                </label>
                            </div>

                            {/* Track dates */}
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-track-dates-label')}</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-track-dates-desc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={cards.showTrackDates}
                                        onChange={() => updateCards({ showTrackDates: !cards.showTrackDates })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                </label>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'Audio' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">{t('settings-heading-audio')}</h2>

                        {/* Streaming Quality */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-4 mb-4">
                                <Headphones className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[16px]">{t('settings-streaming-quality-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-streaming-quality-desc')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {QUALITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setQuality(opt.value);
                                            showToast(`Quality set to ${opt.label}`);
                                        }}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left ${quality === opt.value ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-white/[0.05] hover:border-slate-200 dark:hover:border-white/10'}`}
                                    >
                                        <div className={`font-bold text-[15px] ${quality === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>{opt.label}</div>
                                        <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ReplayGain */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Volume2 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
                                    <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-replaygain-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-replaygain-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {REPLAY_GAIN_MODES.map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => updateRg({ mode })}
                                            className={`px-4 py-2 text-[13px] font-bold rounded-full capitalize transition-all ${rg.mode === mode ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-5 sm:p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Pre-Amp</span>
                                    <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{rg.preamp > 0 ? '+' : ''}{rg.preamp} dB</span>
                                </div>
                                <input
                                    type="range"
                                    min="-15"
                                    max="15"
                                    step="0.5"
                                    value={rg.preamp}
                                    onChange={(e) => updateRg({ preamp: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                                    <span>-15 dB</span>
                                    <span>0 dB</span>
                                    <span>+15 dB</span>
                                </div>
                            </div>
                        </div>

                        {/* Crossfade */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Timer className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                    <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-crossfade-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-crossfade-desc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={crossfade.enabled}
                                        onChange={() => updateCrossfade({ enabled: !crossfade.enabled })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                </label>
                            </div>

                            {crossfade.enabled && (
                                <div className="p-5 sm:p-6 space-y-5">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-crossfade-duration')}</span>
                                            <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{(crossfade.duration / 1000).toFixed(1)}s</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="12000"
                                            step="500"
                                            value={crossfade.duration}
                                            onChange={(e) => updateCrossfade({ duration: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>

                                    <div>
                                            <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300 block mb-2">{t('settings-crossfade-curve')}</span>
                                        <div className="flex gap-2 flex-wrap">
                                            {CROSSFADE_CURVES.map((curve) => (
                                                <button
                                                    key={curve}
                                                    onClick={() => updateCrossfade({ curve })}
                                                    className={`px-4 py-2 text-[13px] font-bold rounded-full capitalize transition-all ${crossfade.curve === curve ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                                                >
                                                    {curve}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-auto-crossfade-label')}</span>
                                            <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('settings-auto-crossfade-desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={crossfade.autoCrossfade}
                                                onChange={() => updateCrossfade({ autoCrossfade: !crossfade.autoCrossfade })}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Audio Effects */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-audio-effects-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-audio-effects-desc')}</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 space-y-5">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-playback-speed')}</span>
                                        <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{audioFx.speed.toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.05"
                                        value={audioFx.speed}
                                        onChange={(e) => updateAudioFx({ speed: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                                        <span>0.5x</span>
                                        <span>1.0x</span>
                                        <span>2.0x</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-preserve-pitch')}</span>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('settings-preserve-pitch-desc')}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={audioFx.preservePitch}
                                            onChange={() => updateAudioFx({ preservePitch: !audioFx.preservePitch })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Audio Enhancements */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <Zap className="w-5 h-5 text-pink-500 dark:text-pink-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-audio-enhancements-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-audio-enhancements-desc')}</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-mono-audio')}</span>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('settings-mono-audio-desc')}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={audioEnh.monoAudio}
                                            onChange={() => updateAudioEnh({ monoAudio: !audioEnh.monoAudio })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-exponential-volume')}</span>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('settings-exponential-volume-desc')}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={audioEnh.exponentialVolume}
                                            onChange={() => updateAudioEnh({ exponentialVolume: !audioEnh.exponentialVolume })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Equalizer */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Music className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                                    <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-equalizer-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-equalizer-desc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={eqState.enabled}
                                        onChange={() => equalizer.setEnabled(!eqState.enabled)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                </label>
                            </div>

                            {eqState.enabled && (
                                <div className="p-5 sm:p-6 space-y-5">
                                    {/* Presets */}
                                    <div>
                                        <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 block mb-2.5">Preset</span>
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(equalizer.getPresets()).slice(0, 10).map(([key, preset]) => {
                                                const isActive = JSON.stringify(eqState.gains) === JSON.stringify(preset.gains);
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => equalizer.applyPreset(key)}
                                                        className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all ${isActive ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-100 dark:border-white/[0.05]'}`}
                                                    >
                                                        {preset.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pre-Amp */}
                                    <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-4 border border-slate-100 dark:border-white/[0.05]">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">Pre-Amp</span>
                                            <span className="text-[14px] font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">{eqState.preamp > 0 ? '+' : ''}{eqState.preamp} dB</span>
                                        </div>
                                        <div className="relative">
                                            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div className={`absolute h-full rounded-full transition-all ${eqState.preamp >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ left: eqState.preamp >= 0 ? '50%' : `${50 + (eqState.preamp / 12) * 50}%`, width: `${Math.abs(eqState.preamp) / 12 * 50}%` }} />
                                            </div>
                                            <input type="range" min={-12} max={12} step={0.5} value={eqState.preamp} onChange={(e) => equalizer.setPreamp(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-200 rounded-full shadow-lg border-2 border-indigo-500 pointer-events-none" />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2"><span>-12 dB</span><span>0</span><span>+12 dB</span></div>
                                    </div>

                                    {/* Frequency Bands */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">Frequency Bands</span>
                                            <button onClick={() => equalizer.reset()} className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-3 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10">Reset All</button>
                                        </div>
                                        <div className="space-y-1">
                                            {eqState.gains.map((gain, i) => (
                                                <div key={i} className="flex items-center gap-3 py-1.5 group">
                                                    <span className="w-10 text-[11px] font-bold text-slate-400 dark:text-slate-500 text-right tabular-nums shrink-0">{equalizer.getFrequencyLabel(i)}</span>
                                                    <div className="flex-1 relative h-8 flex items-center">
                                                        <div className="absolute inset-x-0 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div className={`absolute h-full rounded-full transition-all duration-75 ${gain > 0 ? 'bg-indigo-500' : gain < 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`} style={{ left: gain >= 0 ? '50%' : `${50 + (gain / 12) * 50}%`, width: `${Math.abs(gain) / 12 * 50}%` }} />
                                                        </div>
                                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-300 dark:bg-slate-600 rounded-full pointer-events-none" />
                                                        <input type="range" min={-12} max={12} step={0.5} value={gain} onChange={(e) => equalizer.setBandGain(i, parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-200 rounded-full shadow-lg border-2 border-indigo-500 pointer-events-none transition-all group-hover:scale-110 group-hover:shadow-xl" style={{ left: `calc(${50 + (gain / 12) * 50}% - 8px)` }} />
                                                    </div>
                                                    <span className={`w-12 text-[11px] font-extrabold tabular-nums text-right shrink-0 ${gain > 0 ? 'text-indigo-600 dark:text-indigo-400' : gain < 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{gain > 0 ? '+' : ''}{gain}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'Interface' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">{t('settings-heading-interface')}</h2>

                        {/* Language */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Globe className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Language / Язык</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">Choose interface language</p>
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 dark:bg-[#000000]/40 border border-transparent dark:border-white/5 p-1 rounded-[1rem] w-full sm:w-auto min-w-[200px]">
                                    {LANGUAGES.map((l) => (
                                        <button
                                            key={l.value}
                                            onClick={() => setLang(l.value)}
                                            className={`flex-1 py-2 text-[13px] font-bold rounded-[0.75rem] transition-all ${lang === l.value ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Music Provider */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <Cloud className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-provider-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-provider-desc')}</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {PROVIDERS.map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => updateProvider(p.value)}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left ${provider === p.value ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-white/[0.05] hover:border-slate-200 dark:hover:border-white/10'}`}
                                    >
                                        <div className={`font-bold text-[15px] ${provider === p.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>{p.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jamendo Settings */}
                        {provider === 'jamendo' && (
                            <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                                <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                    <Cloud className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Jamendo Settings</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">Configure your Jamendo API access</p>
                                    </div>
                                </div>
                                <div className="p-5 sm:p-6 space-y-4">
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Client ID</label>
                                        <input
                                            type="text"
                                            value={jamendo.clientId}
                                            onChange={e => {
                                                const updated = { ...jamendo, clientId: e.target.value };
                                                setJamendo(updated);
                                                jamendoSettings.set(updated);
                                            }}
                                            placeholder="Enter your Jamendo client_id"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-[14px] font-bold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                                        />
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                                            Get your client_id at <a href="https://devportal.jamendo.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">devportal.jamendo.com</a>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Audio Format</label>
                                        <div className="flex gap-2">
                                            {[
                                                { value: 'mp31', label: 'MP3 96kbps' },
                                                { value: 'mp32', label: 'MP3 VBR' },
                                                { value: 'ogg', label: 'OGG' },
                                                { value: 'flac', label: 'FLAC' },
                                            ].map(f => (
                                                <button
                                                    key={f.value}
                                                    onClick={() => {
                                                        const updated = { ...jamendo, audioFormat: f.value as typeof jamendo.audioFormat };
                                                        setJamendo(updated);
                                                        jamendoSettings.set(updated);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                                                        jamendo.audioFormat === f.value
                                                            ? 'bg-indigo-500 text-white'
                                                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                                    }`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sidebar */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <ListMusic className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-sidebar-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-sidebar-desc')}</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{t('settings-sidebar-collapsed')}</span>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{t('settings-sidebar-collapsed-desc')}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={sidebar.collapsed}
                                            onChange={() => updateSidebar({ collapsed: !sidebar.collapsed })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* API Instances */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <Link2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{t('settings-api-label')}</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('settings-api-desc')}</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 space-y-4">
                                {apiInstances.instances.map((inst, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <input
                                            type="url"
                                            value={inst.url}
                                            onChange={(e) => {
                                                const next = [...apiInstances.instances];
                                                next[idx] = { ...next[idx], url: e.target.value };
                                                setApiInstances({ instances: next });
                                                apiSettings.set({ instances: next });
                                            }}
                                            className="flex-1 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] font-mono px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="https://api.example.com"
                                        />
                                        <button
                                            onClick={() => {
                                                const next = apiInstances.instances.filter((_, i) => i !== idx);
                                                setApiInstances({ instances: next });
                                                apiSettings.set({ instances: next });
                                            }}
                                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const next = [...apiInstances.instances, { url: '', version: '' }];
                                            setApiInstances({ instances: next });
                                            apiSettings.set({ instances: next });
                                        }}
                                        className="px-4 py-2.5 text-[13px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-colors"
                                    >
                                        {t('settings-api-add')}
                                    </button>
                                    <button
                                        onClick={testApi}
                                        disabled={apiTestStatus === 'testing'}
                                        className={`px-4 py-2.5 text-[13px] font-bold rounded-xl transition-colors ${apiTestStatus === 'ok' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : apiTestStatus === 'error' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                                    >
                                        {apiTestStatus === 'testing' ? t('settings-api-testing') : apiTestStatus === 'ok' ? t('settings-api-connected') : apiTestStatus === 'error' ? t('settings-api-failed') : t('settings-api-test')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'Scrobbling' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">{t('settings-heading-scrobbling')}</h2>

                        {/* Scrobble Threshold */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm dark:shadow-none">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                        <Timer className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[16px] mb-1">{t('settings-scrobble-threshold-label')}</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md">{t('settings-scrobble-threshold-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{scrobble.percentage}%</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05]">
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={scrobble.percentage}
                                    onChange={(e) => updateScrobble({ percentage: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                                    <span>10%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>

                        {/* Last.fm */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm dark:shadow-none">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                        <Link2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[16px] mb-1">{t('settings-lastfm-label')}</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md">{t('settings-lastfm-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {lastfm.enabled && (
                                        <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">{t('settings-scrobbling-connected')}</span>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={lastfm.enabled}
                                            onChange={() => updateLastfm({ enabled: !lastfm.enabled })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                            {lastfm.enabled && (
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.05]">
                                    <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">Last.fm Username</label>
                                    <input
                                        type="text"
                                        value={lastfm.username}
                                        onChange={(e) => updateLastfm({ username: e.target.value })}
                                        placeholder="your-username"
                                        className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ListenBrainz */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm dark:shadow-none">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                        <Music className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[16px] mb-1">ListenBrainz</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md">Open-source music tracking. Submit your listening history to ListenBrainz.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {listenbrainz.enabled && (
                                        <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">Connected</span>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={listenbrainz.enabled}
                                            onChange={() => updateListenbrainz({ enabled: !listenbrainz.enabled })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                            {listenbrainz.enabled && (
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.05]">
                                    <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">ListenBrainz Token</label>
                                    <input
                                        type="password"
                                        value={listenbrainz.token}
                                        onChange={(e) => updateListenbrainz({ token: e.target.value })}
                                        placeholder="Your ListenBrainz auth token"
                                        className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                    />
                                    <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2 mt-4">Custom API URL (optional)</label>
                                    <input
                                        type="url"
                                        value={listenbrainz.customUrl}
                                        onChange={(e) => updateListenbrainz({ customUrl: e.target.value })}
                                        placeholder="https://api.listenbrainz.org/1"
                                        className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Maloja */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm dark:shadow-none">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                        <Music className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[16px] mb-1">Maloja</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md">Self-hosted scrobbling service. Requires a Maloja instance URL and API key.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {maloja.enabled && (
                                        <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">Connected</span>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={maloja.enabled}
                                            onChange={() => updateMaloja({ enabled: !maloja.enabled })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                            {maloja.enabled && (
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.05] space-y-4">
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">Maloja Instance URL</label>
                                        <input
                                            type="url"
                                            value={maloja.url}
                                            onChange={(e) => updateMaloja({ url: e.target.value })}
                                            placeholder="https://malloja.example.com"
                                            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">API Key</label>
                                        <input
                                            type="password"
                                            value={maloja.apiKey}
                                            onChange={(e) => updateMaloja({ apiKey: e.target.value })}
                                            placeholder="Your Maloja API key"
                                            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Libre.fm */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm dark:shadow-none">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[16px] mb-1">Libre.fm</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md">Free and open-source music scrobbling service. Log in with your Libre.fm account.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {librefm.enabled && (
                                        <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">Connected</span>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={librefm.enabled}
                                            onChange={() => updateLibrefm({ enabled: !librefm.enabled })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400"></div>
                                    </label>
                                </div>
                            </div>
                            {librefm.enabled && (
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.05]">
                                    <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2">Libre.fm Username</label>
                                    <input
                                        type="text"
                                        value={librefm.username}
                                        onChange={(e) => updateLibrefm({ username: e.target.value })}
                                        placeholder="your-username"
                                        className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[14px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'Downloads' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">Storage & Downloads</h2>

                        {/* Download Quality */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <Download className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Download Quality</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">Quality when downloading tracks for offline</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {QUALITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateDownloads({ quality: opt.value })}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left ${downloads.quality === opt.value ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-white/[0.05] hover:border-slate-200 dark:hover:border-white/10'}`}
                                    >
                                        <div className={`font-bold text-[15px] ${downloads.quality === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>{opt.label}</div>
                                        <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Container Format */}
                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <Music className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Container Format</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">Lossless container for downloaded files</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {(['flac', 'alac', 'mp3'] as const).map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={() => updateDownloads({ container: fmt, convertToMp3: fmt === 'mp3' })}
                                            className={`px-4 py-2 text-[13px] font-bold rounded-full uppercase transition-all ${downloads.container === fmt ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'System' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <h2 className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1">Account & System</h2>

                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                {(() => {
                                    const p = profileSettings.get();
                                    const initials = (p.nickname || 'B').charAt(0).toUpperCase();
                                    return p.avatar ? (
                                        <img src={p.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-lg" crossOrigin="anonymous" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg" style={{ backgroundColor: p.color || '#6366f1' }}>
                                            {initials}
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{profileSettings.get().nickname || 'Barashka User'}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">{profileSettings.get().bio || 'Tap Profile to customize'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenProfile?.()}
                                className="w-full md:w-auto bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold px-6 py-3 rounded-full transition-colors border border-transparent dark:border-white/5"
                            >
                                {t('settings-edit-profile')}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div onClick={() => onSyncOpen?.()} className="p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Sync Library</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">Transfer your library to another device via QR code or link</p>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <div className="flex items-center gap-4">
                                    <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Discord Rich Presence</h3>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">Show what you're listening to on Discord</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {discordRPC.enabled && discordRPC.connected && (
                                        <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">Connected</span>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={discordRPC.enabled}
                                            onChange={() => updateDiscordRPC({ enabled: !discordRPC.enabled })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2] dark:peer-checked:bg-[#5865F2]"></div>
                                    </label>
                                </div>
                            </div>
                            {discordRPC.enabled && (
                                <div className="p-5 sm:p-6 space-y-4">
                                    {[
                                        { key: 'showDetails' as const, label: 'Show Track Title', desc: 'Display the currently playing track name' },
                                        { key: 'showArtist' as const, label: 'Show Artist', desc: 'Display the artist name' },
                                        { key: 'showAlbum' as const, label: 'Show Album', desc: 'Display the album name in image tooltip' },
                                        { key: 'showTimestamp' as const, label: 'Show Timestamp', desc: 'Show remaining time countdown' },
                                        { key: 'showButtons' as const, label: 'Show Buttons', desc: 'Add "Listen on Barashka" button' },
                                    ].map(({ key, label, desc }) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <div>
                                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{label}</span>
                                                <p className="text-[12px] text-slate-500 dark:text-slate-400">{desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={discordRPC[key]}
                                                    onChange={() => updateDiscordRPC({ [key]: !discordRPC[key] })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2] dark:peer-checked:bg-[#5865F2]"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.05]">
                                <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">Logs</h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400">Recent API activity and errors</p>
                                </div>
                                <button
                                    onClick={() => setLogs(logger.getLogs())}
                                    className="px-3 py-1.5 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                >
                                    Refresh
                                </button>
                            </div>
                            <div className="p-4 max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0a0a0a]">
                                {logs.length === 0 ? (
                                    <p className="text-slate-400 dark:text-slate-500 text-center py-4">No logs yet</p>
                                ) : (
                                    logs.slice(-50).reverse().map((log, i) => (
                                        <div key={i} className={`py-0.5 ${log.includes('[ERROR]') ? 'text-rose-500' : log.includes('[WARN]') ? 'text-amber-500' : ''}`}>
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
