import { audioContextManager } from '../audio-context.js';

class TikTokModeManager {
    constructor() {
        this.enabled = localStorage.getItem('tiktok-mode') === 'true';
        this.convolver = null;
        this.impulseBuffer = null;
        this.player = null; // reference to the global player

        // Wait for AudioContext to be ready, then init
        this.checkInterval = setInterval(() => {
            if (audioContextManager.isReady() && audioContextManager.getAudioContext()) {
                this._initConvolver();
                clearInterval(this.checkInterval);
            }
        }, 500);
    }

    _generateImpulseResponse(audioContext) {
        // Generate a synthetic reverb impulse response to avoid external file dependencies
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * 1.5; // 1.5 seconds of reverb
        const impulse = audioContext.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // Exponentially decaying white noise
            const decay = Math.exp(-i / (sampleRate * 0.4));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        return impulse;
    }

    _initConvolver() {
        const ctx = audioContextManager.getAudioContext();
        if (!ctx) return;

        this.convolver = ctx.createConvolver();
        this.impulseBuffer = this._generateImpulseResponse(ctx);
        this.convolver.buffer = this.impulseBuffer;

        audioContextManager.setTikTokConvolver(this.convolver);
        if (this.enabled) {
            audioContextManager.toggleTikTokMode(true);
        }
    }

    setPlayer(playerInstance) {
        this.player = playerInstance;
        // Apply immediately if already enabled
        if (this.enabled) {
            this.player.applyAudioEffects();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('tiktok-mode', this.enabled);

        if (audioContextManager.isReady()) {
            audioContextManager.toggleTikTokMode(this.enabled);
        }

        if (this.player) {
            this.player.applyAudioEffects();
        }

        this.updateUI();
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    updateUI() {
        const btn = document.getElementById('tiktok-mode-btn');
        if (btn) {
            if (this.enabled) {
                btn.classList.add('active');
                document.body.classList.add('tiktok-mode-active');
            } else {
                btn.classList.remove('active');
                document.body.classList.remove('tiktok-mode-active');
            }
        }
    }
}

export const tiktokModeManager = new TikTokModeManager();

// Initialize UI when HTML is ready
document.addEventListener('DOMContentLoaded', () => {
    tiktokModeManager.updateUI();

    const mainBtn = document.getElementById('tiktok-mode-btn');
    const fsBtn = document.getElementById('fs-tiktok-mode-btn');

    if (mainBtn) {
        mainBtn.addEventListener('click', () => tiktokModeManager.toggle());
    }
    if (fsBtn) {
        fsBtn.addEventListener('click', () => tiktokModeManager.toggle());
    }
});
