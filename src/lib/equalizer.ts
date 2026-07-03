import { equalizerSettings } from './storage';

function generateFrequencies(bandCount: number, minFreq = 20, maxFreq = 20000): number[] {
    const frequencies: number[] = [];
    const safeMin = Math.max(10, minFreq);
    const safeMax = Math.min(96000, maxFreq);

    for (let i = 0; i < bandCount; i++) {
        const t = i / (bandCount - 1);
        const freq = safeMin * Math.pow(safeMax / safeMin, t);
        frequencies.push(Math.round(freq));
    }

    return frequencies;
}

function generateFrequencyLabel(freq: number): string {
    if (freq < 1000) return freq.toString();
    if (freq < 10000) return (freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1) + 'K';
    return (freq / 1000).toFixed(0) + 'K';
}

// 16-band presets
const EQ_PRESETS_16: Record<string, { name: string; gains: number[] }> = {
    flat: { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    bass_boost: { name: 'Bass Boost', gains: [6, 5, 4.5, 4, 3, 2, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0] },
    bass_reducer: { name: 'Bass Reducer', gains: [-6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    treble_boost: { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 5.5, 6] },
    treble_reducer: { name: 'Treble Reducer', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -3, -4, -5, -5.5, -6] },
    vocal_boost: { name: 'Vocal Boost', gains: [-2, -1, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, -1, -2] },
    loudness: { name: 'Loudness', gains: [5, 4, 3, 1, 0, -1, -1, 0, 0, 1, 2, 3, 4, 4.5, 4, 3] },
    rock: { name: 'Rock', gains: [4, 3.5, 3, 2, -1, -2, -1, 1, 2, 3, 3.5, 4, 4, 3, 2, 1] },
    pop: { name: 'Pop', gains: [-1, 0, 1, 2, 3, 3, 2, 1, 0, 1, 2, 2, 2, 2, 1, 0] },
    classical: { name: 'Classical', gains: [3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2] },
    jazz: { name: 'Jazz', gains: [3, 2, 1, 1, -1, -1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2] },
    electronic: { name: 'Electronic', gains: [4, 3.5, 3, 1, 0, -1, 0, 1, 2, 3, 3, 2, 2, 3, 4, 3.5] },
    hip_hop: { name: 'Hip-Hop', gains: [5, 4.5, 4, 3, 1, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2] },
    r_and_b: { name: 'R&B', gains: [3, 5, 4, 2, 1, 0, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1] },
    acoustic: { name: 'Acoustic', gains: [3, 2, 1, 1, 2, 2, 1, 0, 0, 1, 1, 2, 3, 3, 2, 1] },
    podcast: { name: 'Podcast', gains: [-3, -2, -1, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, -1, -2, -3] },
};

function interpolatePreset(preset16: number[], targetBands: number): number[] {
    if (targetBands === 16) return [...preset16];
    const result: number[] = [];
    for (let i = 0; i < targetBands; i++) {
        const sourceIndex = (i / (targetBands - 1)) * (preset16.length - 1);
        const indexLow = Math.floor(sourceIndex);
        const indexHigh = Math.min(Math.ceil(sourceIndex), preset16.length - 1);
        const fraction = sourceIndex - indexLow;
        const interpolated = preset16[indexLow] + (preset16[indexHigh] - preset16[indexLow]) * fraction;
        result.push(Math.round(interpolated * 10) / 10);
    }
    return result;
}

function getPresetsForBandCount(bandCount: number): Record<string, { name: string; gains: number[] }> {
    const presets: Record<string, { name: string; gains: number[] }> = {};
    for (const [key, preset] of Object.entries(EQ_PRESETS_16)) {
        presets[key] = {
            name: preset.name,
            gains: interpolatePreset(preset.gains, bandCount),
        };
    }
    return presets;
}

type EQListener = () => void;

class EqualizerService {
    private audioContext: AudioContext | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private filters: BiquadFilterNode[] = [];
    private preampNode: GainNode | null = null;
    private analyser: AnalyserNode | null = null;
    private outputNode: GainNode | null = null;
    private initialized = false;
    private audio: HTMLAudioElement | null = null;
    private listeners = new Set<EQListener>();

    bandCount: number;
    frequencies: number[];
    gains: number[];
    preamp: number;
    enabled: boolean;

    constructor() {
        const settings = equalizerSettings.get();
        this.bandCount = settings.bandCount || 10;
        this.frequencies = generateFrequencies(this.bandCount);
        this.gains = settings.gains.length === this.bandCount ? [...settings.gains] : new Array(this.bandCount).fill(0);
        this.preamp = settings.preamp || 0;
        this.enabled = settings.enabled || false;
    }

    subscribe(listener: EQListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    private save() {
        equalizerSettings.set({
            enabled: this.enabled,
            bandCount: this.bandCount,
            gains: this.gains,
            preamp: this.preamp,
            preset: null,
        });
    }

    getPresets() {
        return getPresetsForBandCount(this.bandCount);
    }

    getFrequencyLabel(index: number): string {
        return generateFrequencyLabel(this.frequencies[index] || 0);
    }

    init(audio: HTMLAudioElement) {
        if (this.initialized && this.audio === audio) return;

        this.audio = audio;

        try {
            this.audioContext = new AudioContext();
            this.source = this.audioContext.createMediaElementSource(audio);

            this.preampNode = this.audioContext.createGain();
            this.analyser = this.audioContext.createAnalyser();
            this.outputNode = this.audioContext.createGain();

            this.createFilters();
            this.connectGraph();

            this.initialized = true;

            if (this.enabled) {
                this.applyGains();
            }
        } catch (e) {
            console.error('Failed to initialize equalizer:', e);
        }
    }

    private createFilters() {
        if (!this.audioContext) return;

        this.filters.forEach(f => { try { f.disconnect(); } catch {} });
        this.filters = [];

        this.filters = this.frequencies.map((freq, i) => {
            const filter = this.audioContext!.createBiquadFilter();
            filter.type = i === 0 ? 'lowshelf' : i === this.frequencies.length - 1 ? 'highshelf' : 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.4;
            filter.gain.value = 0;
            return filter;
        });
    }

    private connectGraph() {
        if (!this.source || !this.preampNode || !this.analyser || !this.outputNode) return;

        // Disconnect everything
        try { this.source.disconnect(); } catch {}
        try { this.preampNode.disconnect(); } catch {}
        this.filters.forEach(f => { try { f.disconnect(); } catch {} });
        try { this.analyser.disconnect(); } catch {}
        try { this.outputNode.disconnect(); } catch {}

        if (this.enabled && this.filters.length > 0) {
            // source -> preamp -> filters -> analyser -> output -> destination
            this.source.connect(this.preampNode);
            let lastNode: AudioNode = this.preampNode;

            for (const filter of this.filters) {
                lastNode.connect(filter);
                lastNode = filter;
            }

            lastNode.connect(this.analyser);
            this.analyser.connect(this.outputNode);
            this.outputNode.connect(this.audioContext!.destination);
        } else {
            // Bypass: source -> analyser -> destination
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext!.destination);
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.save();
        this.connectGraph();
        if (enabled) this.applyGains();
        this.notify();
    }

    setBandGain(index: number, gain: number) {
        if (index < 0 || index >= this.filters.length) return;
        this.gains[index] = Math.max(-12, Math.min(12, gain));
        this.save();

        if (this.enabled && this.filters[index]) {
            this.filters[index].gain.setTargetAtTime(this.gains[index], this.audioContext?.currentTime || 0, 0.01);
        }
        this.notify();
    }

    setPreamp(value: number) {
        this.preamp = Math.max(-12, Math.min(12, value));
        this.save();

        if (this.preampNode) {
            const gainValue = Math.pow(10, this.preamp / 20);
            this.preampNode.gain.setTargetAtTime(gainValue, this.audioContext?.currentTime || 0, 0.01);
        }
        this.notify();
    }

    applyPreset(presetKey: string) {
        const presets = this.getPresets();
        const preset = presets[presetKey];
        if (!preset) return;

        this.gains = [...preset.gains];
        this.save();
        this.applyGains();
        this.notify();
    }

    private applyGains() {
        if (!this.enabled) return;

        this.filters.forEach((filter, i) => {
            if (filter && this.gains[i] !== undefined) {
                filter.gain.setTargetAtTime(this.gains[i], this.audioContext?.currentTime || 0, 0.01);
            }
        });

        if (this.preampNode) {
            const gainValue = Math.pow(10, this.preamp / 20);
            this.preampNode.gain.setTargetAtTime(gainValue, this.audioContext?.currentTime || 0, 0.01);
        }
    }

    setBandCount(count: number) {
        const newCount = Math.max(3, Math.min(32, count));
        if (newCount === this.bandCount) return;

        this.bandCount = newCount;
        this.frequencies = generateFrequencies(newCount);

        // Interpolate gains
        const newGains: number[] = [];
        for (let i = 0; i < newCount; i++) {
            const sourceIndex = (i / (newCount - 1)) * (this.gains.length - 1);
            const indexLow = Math.floor(sourceIndex);
            const indexHigh = Math.min(Math.ceil(sourceIndex), this.gains.length - 1);
            const fraction = sourceIndex - indexLow;
            newGains.push(Math.round((this.gains[indexLow] + (this.gains[indexHigh] - this.gains[indexLow]) * fraction) * 10) / 10);
        }
        this.gains = newGains;

        if (this.initialized) {
            this.createFilters();
            this.connectGraph();
            if (this.enabled) this.applyGains();
        }

        this.save();
        this.notify();
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    getAudioContext(): AudioContext | null {
        return this.audioContext;
    }

    reset() {
        this.gains = new Array(this.bandCount).fill(0);
        this.preamp = 0;
        this.save();
        this.applyGains();
        this.notify();
    }
}

export const equalizer = new EqualizerService();
