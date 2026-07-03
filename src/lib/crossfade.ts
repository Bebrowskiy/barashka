import { crossfadeSettings } from './storage';

const FADE_CURVES: Record<string, (progress: number) => number> = {
    linear: (p) => p,
    logarithmic: (p) => 1 - Math.log(1 + p * (Math.E - 1)),
    exponential: (p) => Math.pow(p, 3),
    sine: (p) => Math.sin((p * Math.PI) / 2),
    cosine: (p) => 1 - Math.cos((p * Math.PI) / 2),
};

export class CrossfadeManager {
    private currentAudio: HTMLAudioElement;
    private nextAudio: HTMLAudioElement | null = null;
    isActive = false;
    private animationFrame: number | null = null;

    constructor(audio: HTMLAudioElement) {
        this.currentAudio = audio;
    }

    setAudioElement(audio: HTMLAudioElement): void {
        this.currentAudio = audio;
    }

    canCrossfade(timeRemaining: number): boolean {
        const settings = crossfadeSettings.get();
        if (!settings.enabled) return false;
        const minRemaining = (settings.duration / 1000) + 1;
        return timeRemaining >= minRemaining;
    }

    async crossfadeTo(nextAudioEl: HTMLAudioElement): Promise<boolean> {
        if (this.isActive) return false;

        const settings = crossfadeSettings.get();
        if (!settings.enabled) return false;

        this.isActive = true;
        const { duration, curve } = settings;
        const fadeCurve = FADE_CURVES[curve] || FADE_CURVES.logarithmic;
        const startTime = performance.now();
        const startVolume = this.currentAudio.volume;

        nextAudioEl.volume = 0;
        nextAudioEl.preload = 'auto';

        if (nextAudioEl.readyState < 3) {
            await new Promise<void>((resolve) => {
                const handler = () => {
                    nextAudioEl.removeEventListener('canplay', handler);
                    resolve();
                };
                nextAudioEl.addEventListener('canplay', handler);
                setTimeout(resolve, 5000);
            });
        }

        await nextAudioEl.play().catch(() => {});

        return new Promise<boolean>((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = fadeCurve(progress);

                this.currentAudio.volume = startVolume * (1 - eased);
                nextAudioEl.volume = eased;

                if (progress < 1) {
                    this.animationFrame = requestAnimationFrame(animate);
                } else {
                    this.currentAudio.pause();
                    this.currentAudio.src = '';
                    this.currentAudio.load();
                    this.currentAudio.volume = startVolume;
                    this.currentAudio = nextAudioEl;
                    this.isActive = false;
                    this.animationFrame = null;
                    resolve(true);
                }
            };
            this.animationFrame = requestAnimationFrame(animate);
        });
    }

    stop(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.isActive = false;
        if (this.nextAudio) {
            this.nextAudio.pause();
            this.nextAudio.src = '';
            this.nextAudio = null;
        }
    }
}
