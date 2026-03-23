import { tiktokModeSettings } from './storage.js';
import { audioContextManager } from './audio-context.js';

export function initializeTikTokMode(player) {
    const mainToggleBtn = document.getElementById('tiktok-mode-btn');
    const settingsToggle = document.getElementById('tiktok-mode-toggle');
    const settingsOptions = document.getElementById('tiktok-mode-options');
    const speedSlider = document.getElementById('tiktok-speed-slider');
    const speedValue = document.getElementById('tiktok-speed-value');
    const reverbSlider = document.getElementById('tiktok-reverb-slider');
    const reverbValue = document.getElementById('tiktok-reverb-value');

    function updateUI() {
        const isEnabled = tiktokModeSettings.isEnabled();
        
        // Update main player bar button
        if (mainToggleBtn) {
            if (isEnabled) {
                mainToggleBtn.classList.add('active');
                mainToggleBtn.style.color = 'var(--accent, #a277ff)';
            } else {
                mainToggleBtn.classList.remove('active');
                mainToggleBtn.style.color = '';
            }
        }

        // Update settings panel controls
        if (settingsToggle) {
            settingsToggle.checked = isEnabled;
        }
        
        if (settingsOptions) {
            settingsOptions.style.display = isEnabled ? 'flex' : 'none';
        }

        if (speedSlider && speedValue) {
            const speed = tiktokModeSettings.getSpeed();
            speedSlider.value = speed;
            speedValue.textContent = `${speed.toFixed(2)}x`;
        }

        if (reverbSlider && reverbValue) {
            const reverb = tiktokModeSettings.getReverbMix();
            reverbSlider.value = reverb;
            reverbValue.textContent = `${Math.round(reverb * 100)}%`;
        }
    }

    function toggleMode(enabled) {
        tiktokModeSettings.setEnabled(enabled);
        updateUI();
        
        // Tell audio context to restructure nodes (reverb)
        audioContextManager.toggleTikTokMode(enabled);
        
        // Tell player to update playback rate/pitch
        if (player) {
            player.applyAudioEffects();
        }
    }

    // Main bottom-bar button listener
    if (mainToggleBtn) {
        mainToggleBtn.addEventListener('click', () => {
            const newState = !tiktokModeSettings.isEnabled();
            toggleMode(newState);
        });
    }

    // Settings modal switch listener
    if (settingsToggle) {
        settingsToggle.addEventListener('change', (e) => {
            toggleMode(e.target.checked);
        });
    }

    // Sliders listeners
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            speedValue.textContent = `${val.toFixed(2)}x`;
            tiktokModeSettings.setSpeed(val);
            if (player && tiktokModeSettings.isEnabled()) {
                player.applyAudioEffects();
            }
        });
    }

    if (reverbSlider && reverbValue) {
        reverbSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            reverbValue.textContent = `${Math.round(val * 100)}%`;
            audioContextManager.setReverbMix(val);
        });
    }

    // Initialize state
    updateUI();
}
