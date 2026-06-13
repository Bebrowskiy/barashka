import { keyboardShortcuts } from '../storage.js';
import { trackKeyboardShortcut } from '../analytics.js';
import { sidePanelManager } from '../side-panel.js';
import { clearLyricsPanelSync } from '../lyrics.js';

export function initializeKeyboardShortcuts(player, audioPlayer) {
    const keyActionMap = {
        playPause: () => {
            trackKeyboardShortcut('Space');
            player.handlePlayPause();
        },
        seekForward: () => {
            trackKeyboardShortcut('Right');
            audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
        },
        seekBackward: () => {
            trackKeyboardShortcut('Left');
            audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
        },
        nextTrack: () => {
            trackKeyboardShortcut('Shift+Right');
            player.playNext();
        },
        previousTrack: () => {
            trackKeyboardShortcut('Shift+Left');
            player.playPrev();
        },
        volumeUp: () => {
            trackKeyboardShortcut('Up');
            player.setVolume(player.userVolume + 0.1);
        },
        volumeDown: () => {
            trackKeyboardShortcut('Down');
            player.setVolume(player.userVolume - 0.1);
        },
        mute: () => {
            trackKeyboardShortcut('M');
            audioPlayer.muted = !audioPlayer.muted;
        },
        shuffle: () => {
            trackKeyboardShortcut('S');
            document.getElementById('shuffle-btn')?.click();
        },
        repeat: () => {
            trackKeyboardShortcut('R');
            document.getElementById('repeat-btn')?.click();
        },
        queue: () => {
            trackKeyboardShortcut('Q');
            document.getElementById('queue-btn')?.click();
        },
        lyrics: () => {
            trackKeyboardShortcut('L');
            document.querySelector('.now-playing-bar .cover')?.click();
        },
        search: () => {
            trackKeyboardShortcut('/');
            document.getElementById('search-input')?.focus();
        },
        escape: () => {
            trackKeyboardShortcut('Escape');
            document.getElementById('search-input')?.blur();
            sidePanelManager.close();
            clearLyricsPanelSync(audioPlayer, sidePanelManager.panel);
        },
        visualizerNext: () => {
            trackKeyboardShortcut('VisualizerNext');
            const ui = window.monochromeUi;
            if (ui?.visualizer?.presets?.['butterchurn']) {
                ui.visualizer.presets['butterchurn'].nextPreset();
            }
        },
        visualizerPrev: () => {
            trackKeyboardShortcut('VisualizerPrev');
            const ui = window.monochromeUi;
            if (ui?.visualizer?.presets?.['butterchurn']) {
                ui.visualizer.presets['butterchurn'].prevPreset();
            }
        },
        visualizerCycle: () => {
            trackKeyboardShortcut('VisualizerCycle');
            const ui = window.monochromeUi;
            if (ui?.visualizer?.presets?.['butterchurn']) {
                ui.visualizer.presets['butterchurn'].toggleCycle();
            }
        },
    };

    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea, [contenteditable="true"]')) return;

        const shortcuts = keyboardShortcuts.getShortcuts();
        const pressedKey = e.key.toLowerCase();
        const hasShift = e.shiftKey;
        const hasCtrl = e.ctrlKey || e.metaKey;
        const hasAlt = e.altKey;

        for (const [action, shortcut] of Object.entries(shortcuts)) {
            if (!shortcut?.key) continue;
            const shortcutKey = shortcut.key.toLowerCase();
            const matches =
                pressedKey === shortcutKey &&
                shortcut.shift === hasShift &&
                shortcut.ctrl === hasCtrl &&
                shortcut.alt === hasAlt;

            if (matches) {
                e.preventDefault();
                const actionFn = keyActionMap[action];
                if (actionFn) {
                    actionFn();
                }
                return;
            }
        }
    });
}

export function showKeyboardShortcuts() {
    const modal = document.getElementById('shortcuts-modal');

    const closeModal = () => {
        modal.classList.remove('active');
        modal.removeEventListener('click', handleClose);
    };

    const handleClose = (e) => {
        if (
            e.target === modal ||
            e.target.classList.contains('close-shortcuts') ||
            e.target.classList.contains('modal-overlay')
        ) {
            closeModal();
        }
    };

    modal.addEventListener('click', handleClose);
    modal.classList.add('active');
}

export function showCustomizeShortcutsModal() {
    const modal = document.getElementById('customize-shortcuts-modal');
    const shortcutsList = document.getElementById('shortcuts-list');
    let recordingAction = null;
    let recordingTimeout = null;

    const formatKey = (key) => {
        if (!key) return 'none';
        const keyMap = {
            ' ': 'Space',
            arrowup: '↑',
            arrowdown: '↓',
            arrowleft: '←',
            arrowright: '→',
            escape: 'Esc',
            backspace: 'Backspace',
            delete: 'Delete',
            insert: 'Insert',
            home: 'Home',
            end: 'End',
            pageup: 'Page Up',
            pagedown: 'Page Down',
            '[': '[',
            ']': ']',
            '\\': '\\',
            tab: 'Tab',
            enter: 'Enter',
            capslock: 'Caps Lock',
            shift: 'Shift',
            control: 'Ctrl',
            alt: 'Alt',
            meta: 'Meta',
            contextmenu: 'Context Menu',
        };
        return keyMap[key.toLowerCase()] || key.toUpperCase();
    };

    const renderShortcuts = () => {
        shortcutsList.innerHTML = '';
        const currentShortcuts = keyboardShortcuts.getShortcuts();

        for (const [action, shortcut] of Object.entries(currentShortcuts || {})) {
            const item = document.createElement('div');
            item.className = 'customize-shortcut-item';
            item.dataset.action = action;

            const modifiers = [];
            if (shortcut?.shift) modifiers.push('Shift');
            if (shortcut?.ctrl) modifiers.push('Ctrl');
            if (shortcut?.alt) modifiers.push('Alt');

            const keyDisplay = [...modifiers, formatKey(shortcut?.key)].join(' + ');

            item.innerHTML = `
                <span class="shortcut-description">${shortcut?.description || 'Unknown'}</span>
                <div class="shortcut-key">
                    <kbd class="${recordingAction === action ? 'recording' : ''}">${keyDisplay}</kbd>
                    <button class="shortcut-btn" title="Reset to default">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                    </button>
                </div>
            `;

            const kbd = item.querySelector('kbd');
            kbd.addEventListener('click', (e) => {
                e.stopPropagation();
                if (recordingAction === action) {
                    recordingAction = null;
                    clearTimeout(recordingTimeout);
                } else {
                    recordingAction = action;
                    recordingTimeout = setTimeout(() => {
                        keyboardShortcuts.setShortcut(action, {
                            key: null,
                            shift: false,
                            ctrl: false,
                            alt: false,
                            description: shortcut?.description || 'Unknown',
                        });
                        recordingAction = null;
                        renderShortcuts();
                    }, 3000);
                }
                renderShortcuts();
            });

            const resetBtn = item.querySelector('.shortcut-btn');
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const defaults = keyboardShortcuts.getDefaultShortcuts();
                keyboardShortcuts.setShortcut(action, defaults[action]);
                renderShortcuts();
            });

            shortcutsList.appendChild(item);
        }
    };

    const handleKeyDown = (e) => {
        if (!recordingAction) return;

        e.preventDefault();
        e.stopPropagation();

        const key = e.key === ' ' ? ' ' : e.key;

        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
            return;
        }

        keyboardShortcuts.setShortcut(recordingAction, {
            key: key,
            shift: e.shiftKey,
            ctrl: e.ctrlKey || e.metaKey,
            alt: e.altKey,
        });

        clearTimeout(recordingTimeout);
        recordingAction = null;
        renderShortcuts();
    };

    const closeModal = () => {
        modal.classList.remove('active');
        recordingAction = null;
        clearTimeout(recordingTimeout);
        document.removeEventListener('keydown', handleKeyDown);
        modal.removeEventListener('click', handleClose);
    };

    const handleClose = (e) => {
        if (
            e.target === modal ||
            e.target.classList.contains('close-customize-shortcuts') ||
            e.target.id === 'close-customize-shortcuts-btn' ||
            e.target.classList.contains('modal-overlay')
        ) {
            closeModal();
        }
    };

    document.getElementById('reset-shortcuts-btn')?.addEventListener('click', () => {
        keyboardShortcuts.resetShortcuts();
        renderShortcuts();
    });

    document.addEventListener('keydown', handleKeyDown);
    modal.addEventListener('click', handleClose);
    renderShortcuts();
    modal.classList.add('active');
}
