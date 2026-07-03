export interface WaveformData {
    peaks: Float32Array;
    duration: number;
}

export class WaveformGenerator {
    private ctx: OfflineAudioContext;
    private cache = new Map<string, WaveformData>();

    constructor() {
        this.ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 1, 44100);
    }

    async getWaveform(url: string, trackId: string): Promise<WaveformData | null> {
        if (this.cache.has(trackId)) return this.cache.get(trackId)!;

        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(buffer);
            const peaks = this.extractPeaks(audioBuffer);
            const result: WaveformData = { peaks, duration: audioBuffer.duration };
            this.cache.set(trackId, result);
            return result;
        } catch {
            return null;
        }
    }

    private extractPeaks(audioBuffer: AudioBuffer): Float32Array {
        const { length, duration } = audioBuffer;
        const numPeaks = Math.min(Math.floor(4 * duration), 1000);
        const peaks = new Float32Array(numPeaks);
        const chanData = audioBuffer.getChannelData(0);
        const step = Math.floor(length / numPeaks);
        const stride = 8;

        for (let i = 0; i < numPeaks; i++) {
            let max = 0;
            const start = i * step;
            const end = start + step;
            for (let j = start; j < end; j += stride) {
                const v = chanData[j];
                if (v > max) max = v;
                else if (-v > max) max = -v;
            }
            peaks[i] = max;
        }

        let maxPeak = 0;
        for (let i = 0; i < numPeaks; i++) {
            if (peaks[i] > maxPeak) maxPeak = peaks[i];
        }
        if (maxPeak > 0) {
            for (let i = 0; i < numPeaks; i++) peaks[i] /= maxPeak;
        }
        return peaks;
    }

    drawWaveform(canvas: HTMLCanvasElement, peaks: Float32Array, progress: number = 0, color: string = '#6366f1'): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const step = width / peaks.length;
        const centerY = height / 2;
        const progressX = width * progress;

        ctx.beginPath();
        for (let i = 0; i < peaks.length; i++) {
            const x = i * step;
            const barH = Math.max(1.5, peaks[i] * height * 0.9);
            ctx.rect(x, centerY - barH / 2, Math.max(step - 1, 1), barH);
        }
        ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
        ctx.fill();

        if (progress > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, progressX, height);
            ctx.clip();
            ctx.beginPath();
            for (let i = 0; i < peaks.length; i++) {
                const x = i * step;
                const barH = Math.max(1.5, peaks[i] * height * 0.9);
                ctx.rect(x, centerY - barH / 2, Math.max(step - 1, 1), barH);
            }
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
        }
    }
}

export const waveformGenerator = new WaveformGenerator();
