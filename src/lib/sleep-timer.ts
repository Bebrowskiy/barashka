import { audioEngine } from './audio-engine';

type SleepTimerListener = (remaining: number | null) => void;

class SleepTimerService {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private interval: ReturnType<typeof setInterval> | null = null;
    private endTime: number | null = null;
    private listeners = new Set<SleepTimerListener>();

    getRemaining(): number | null {
        if (!this.endTime) return null;
        return Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
    }

    isActive(): boolean {
        return this.timer !== null;
    }

    subscribe(listener: SleepTimerListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        const remaining = this.getRemaining();
        this.listeners.forEach(l => l(remaining));
    }

    set(minutes: number): void {
        this.clear();

        this.endTime = Date.now() + minutes * 60 * 1000;

        this.timer = setTimeout(() => {
            audioEngine.togglePlayPause();
            this.clear();
        }, minutes * 60 * 1000);

        // Update every second
        this.interval = setInterval(() => {
            this.notify();
        }, 1000);

        this.notify();
    }

    clear(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.endTime = null;
        this.notify();
    }

    formatRemaining(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    }
}

export const sleepTimer = new SleepTimerService();
