import type React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Timer, Zap, SlidersHorizontal, Music, Moon } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../lib/i18n';
import { audioEngine } from '../lib/audio-engine';
import { sleepTimer } from '../lib/sleep-timer';
import { equalizer } from '../lib/equalizer';
import {
    replayGainSettings,
    audioEffectsSettings,
    crossfadeSettings,
} from '../lib/storage';

const REPLAY_GAIN_MODES = ['off', 'track', 'album'] as const;
const CROSSFADE_CURVES = ['linear', 'logarithmic', 'exponential', 'sine', 'cosine'] as const;

interface AudioPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AudioPanel({ isOpen, onClose }: AudioPanelProps) {
    const { t } = useI18n();
    const { showToast } = usePlayer();

    const [rg, setRg] = useState(replayGainSettings.get());
    const [fx, setFx] = useState(audioEffectsSettings.get());
    const [xf, setXf] = useState(crossfadeSettings.get());
    const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
    const [eqState, setEqState] = useState({
        enabled: equalizer.enabled,
        gains: [...equalizer.gains],
        preamp: equalizer.preamp,
        bandCount: equalizer.bandCount,
        frequencies: [...equalizer.frequencies],
    });

    // Sleep timer sync
    useEffect(() => {
        return sleepTimer.subscribe((remaining) => {
            setSleepRemaining(remaining);
        });
    }, []);

    // Equalizer sync
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

    // Sync on open
    useEffect(() => {
        if (isOpen) {
            setRg(replayGainSettings.get());
            setFx(audioEffectsSettings.get());
            setXf(crossfadeSettings.get());
        }
    }, [isOpen]);

    const updateRg = (patch: Partial<typeof rg>) => {
        const next = { ...rg, ...patch };
        setRg(next);
        replayGainSettings.set(next);
        audioEngine.applyReplayGain();
    };

    const updateFx = (patch: Partial<typeof fx>) => {
        const next = { ...fx, ...patch };
        setFx(next);
        audioEffectsSettings.set(next);
        audioEngine.applyAudioEffects();
    };

    const updateXf = (patch: Partial<typeof xf>) => {
        const next = { ...xf, ...patch };
        setXf(next);
        crossfadeSettings.set(next);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[140] bg-black/30 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[145] max-h-[85vh] bg-white dark:bg-[#0A0A0A] rounded-t-[2rem] shadow-2xl border-t border-slate-200 dark:border-white/[0.05] overflow-hidden flex flex-col"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-100 dark:border-white/[0.05]">
                            <div className="flex items-center gap-3">
                                <SlidersHorizontal className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">{t('audio-panel-title')}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                            {/* === Playback Speed === */}
                            <Section icon={<Zap className="w-4 h-4" />} title="Playback Speed" color="amber">
                                <SliderRow
                                    label={t('audio-panel-speed')}
                                    value={fx.speed}
                                    min={0.25}
                                    max={2}
                                    step={0.05}
                                    displayValue={`${fx.speed.toFixed(2)}x`}
                                    marks={[
                                        { pos: 0, label: '0.25x' },
                                        { pos: 0.375, label: '1x' },
                                        { pos: 1, label: '2x' },
                                    ]}
                                    onChange={(v) => updateFx({ speed: v })}
                                />
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                        <button
                                            key={speed}
                                            onClick={() => updateFx({ speed })}
                                            className={`px-3 py-1.5 text-[12px] font-bold rounded-full transition-all ${
                                                Math.abs(fx.speed - speed) < 0.01
                                                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {speed}x
                                        </button>
                                    ))}
                                </div>
                                <ToggleRow
                                    label={t('audio-panel-preserve-pitch')}
                                    description="Keep original pitch when changing speed"
                                    checked={fx.preservePitch}
                                    onChange={() => updateFx({ preservePitch: !fx.preservePitch })}
                                />
                            </Section>

                            {/* === ReplayGain === */}
                            <Section icon={<Volume2 className="w-4 h-4" />} title="ReplayGain" color="fuchsia">
                                <div className="flex gap-2 mb-4">
                                    {REPLAY_GAIN_MODES.map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => updateRg({ mode })}
                                            className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl capitalize transition-all ${
                                                rg.mode === mode
                                                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                                {rg.mode !== 'off' && (
                                    <SliderRow
                                        label="Pre-Amp"
                                        value={rg.preamp}
                                        min={-15}
                                        max={15}
                                        step={0.5}
                                        displayValue={`${rg.preamp > 0 ? '+' : ''}${rg.preamp} dB`}
                                        marks={[
                                            { pos: 0, label: '-15' },
                                            { pos: 0.5, label: '0' },
                                            { pos: 1, label: '+15' },
                                        ]}
                                        onChange={(v) => updateRg({ preamp: v })}
                                    />
                                )}
                            </Section>

                            {/* === Crossfade === */}
                            <Section icon={<Timer className="w-4 h-4" />} title="Crossfade" color="emerald">
                                <ToggleRow
                                    label="Enable Crossfade"
                                    description="Smooth transitions between tracks"
                                    checked={xf.enabled}
                                    onChange={() => updateXf({ enabled: !xf.enabled })}
                                />
                                {xf.enabled && (
                                    <>
                                        <SliderRow
                                            label="Duration"
                                            value={xf.duration}
                                            min={1000}
                                            max={12000}
                                            step={500}
                                            displayValue={`${(xf.duration / 1000).toFixed(1)}s`}
                                            marks={[
                                                { pos: 0, label: '1s' },
                                                { pos: 0.5, label: '6.5s' },
                                                { pos: 1, label: '12s' },
                                            ]}
                                            onChange={(v) => updateXf({ duration: v })}
                                        />
                                        <div className="mt-4">
                                            <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 block mb-2">Fade Curve</span>
                                            <div className="flex gap-2 flex-wrap">
                                                {CROSSFADE_CURVES.map((curve) => (
                                                    <button
                                                        key={curve}
                                                        onClick={() => updateXf({ curve })}
                                                        className={`px-3 py-1.5 text-[12px] font-bold rounded-full capitalize transition-all ${
                                                            xf.curve === curve
                                                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                                                                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {curve}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <ToggleRow
                                            label="Auto Crossfade"
                                            description="Automatically crossfade at end of track"
                                            checked={xf.autoCrossfade}
                                            onChange={() => updateXf({ autoCrossfade: !xf.autoCrossfade })}
                                        />
                                    </>
                                )}
                            </Section>

                            {/* === Equalizer === */}
                            <Section icon={<Music className="w-4 h-4" />} title="Equalizer" color="sky">
                                <ToggleRow
                                    label="Enable Equalizer"
                                    description="Enhance audio with frequency adjustments"
                                    checked={eqState.enabled}
                                    onChange={() => equalizer.setEnabled(!eqState.enabled)}
                                />
                                {eqState.enabled && (
                                    <div className="space-y-5 mt-3">
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
                                                            className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all ${
                                                                isActive
                                                                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-500/20'
                                                                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-100 dark:border-white/[0.05]'
                                                            }`}
                                                        >
                                                            {preset.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Pre-Amp */}
                                        <div className="bg-white dark:bg-white/[0.02] rounded-xl p-4 border border-slate-100 dark:border-white/[0.05]">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">Pre-Amp</span>
                                                <span className="text-[14px] font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                                    {eqState.preamp > 0 ? '+' : ''}{eqState.preamp} dB
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`absolute h-full rounded-full transition-all ${eqState.preamp >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                                                        style={{
                                                            left: eqState.preamp >= 0 ? '50%' : `${50 + (eqState.preamp / 12) * 50}%`,
                                                            width: `${Math.abs(eqState.preamp) / 12 * 50}%`,
                                                        }}
                                                    />
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-12}
                                                    max={12}
                                                    step={0.5}
                                                    value={eqState.preamp}
                                                    onChange={(e) => equalizer.setPreamp(parseFloat(e.target.value))}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-200 rounded-full shadow-lg border-2 border-indigo-500 pointer-events-none" />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">
                                                <span>-12 dB</span>
                                                <span>0</span>
                                                <span>+12 dB</span>
                                            </div>
                                        </div>

                                        {/* Frequency Bands */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">Frequency Bands</span>
                                                <button
                                                    onClick={() => equalizer.reset()}
                                                    className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-3 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                                >
                                                    Reset All
                                                </button>
                                            </div>

                                            <div className="space-y-1">
                                                {eqState.gains.map((gain, i) => (
                                                    <div key={i} className="flex items-center gap-3 py-1.5 group">
                                                        {/* Frequency label */}
                                                        <span className="w-10 text-[11px] font-bold text-slate-400 dark:text-slate-500 text-right tabular-nums shrink-0">
                                                            {equalizer.getFrequencyLabel(i)}
                                                        </span>

                                                        {/* Slider */}
                                                        <div className="flex-1 relative h-8 flex items-center">
                                                            {/* Track background */}
                                                            <div className="absolute inset-x-0 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`absolute h-full rounded-full transition-all duration-75 ${
                                                                        gain > 0 ? 'bg-indigo-500' : gain < 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
                                                                    }`}
                                                                    style={{
                                                                        left: gain >= 0 ? '50%' : `${50 + (gain / 12) * 50}%`,
                                                                        width: `${Math.abs(gain) / 12 * 50}%`,
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Center mark */}
                                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-300 dark:bg-slate-600 rounded-full pointer-events-none" />

                                                            {/* Hidden input */}
                                                            <input
                                                                type="range"
                                                                min={-12}
                                                                max={12}
                                                                step={0.5}
                                                                value={gain}
                                                                onChange={(e) => equalizer.setBandGain(i, parseFloat(e.target.value))}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />

                                                            {/* Thumb */}
                                                            <div
                                                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-200 rounded-full shadow-lg border-2 border-indigo-500 pointer-events-none transition-all group-hover:scale-110 group-hover:shadow-xl"
                                                                style={{ left: `calc(${50 + (gain / 12) * 50}% - 8px)` }}
                                                            />
                                                        </div>

                                                        {/* dB value */}
                                                        <span className={`w-12 text-[11px] font-extrabold tabular-nums text-right shrink-0 ${
                                                            gain > 0 ? 'text-indigo-600 dark:text-indigo-400' : gain < 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                            {gain > 0 ? '+' : ''}{gain}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Section>

                            {/* === Sleep Timer === */}
                            <Section icon={<Moon className="w-4 h-4" />} title={t('audio-panel-sleep-title')} color="purple">
                                {sleepRemaining !== null ? (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 block">Active</span>
                                            <span className="text-[12px] text-slate-500 dark:text-slate-400">
                                                Stops in {sleepTimer.formatRemaining(sleepRemaining)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => { sleepTimer.clear(); showToast('Sleep timer cancelled'); }}
                                            className="px-4 py-2 text-[13px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-colors"
                                        >
                                            {t('audio-panel-sleep-cancel')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {[5, 10, 15, 30, 45, 60, 90, 120].map((min) => (
                                            <button
                                                key={min}
                                                onClick={() => { sleepTimer.set(min); showToast(`Sleep timer set: ${min} min`); }}
                                                className="py-3 text-[13px] font-bold rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                                            >
                                                {min < 60 ? `${min}m` : `${min / 60}h`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </Section>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// === Helper Components ===

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
    const colorMap: Record<string, string> = {
        amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
        fuchsia: 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        sky: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
        purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    };

    return (
        <div className="bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/[0.05] p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.amber}`}>
                    {icon}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-[15px]">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function SliderRow({
    label,
    value,
    min,
    max,
    step,
    displayValue,
    marks,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    displayValue: string;
    marks?: { pos: number; label: string }[];
    onChange: (v: number) => void;
}) {
    const percent = ((value - min) / (max - min)) * 100;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">{label}</span>
                <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{displayValue}</span>
            </div>
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
                {marks && (
                    <div className="flex justify-between mt-1 px-0.5">
                        {marks.map((m, i) => (
                            <span key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{m.label}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <div
            className="flex items-center justify-between py-3 cursor-pointer"
            onClick={onChange}
        >
            <div className="flex-1">
                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 block">{label}</span>
                {description && (
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">{description}</span>
                )}
            </div>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </div>
        </div>
    );
}

