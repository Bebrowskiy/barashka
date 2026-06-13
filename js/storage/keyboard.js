export const keyboardShortcuts = {
    STORAGE_KEY: 'keyboard-shortcuts',

    DEFAULT_SHORTCUTS: {
        playPause: { key: ' ', shift: false, ctrl: false, alt: false, description: 'Play / Pause' },
        seekForward: { key: 'arrowright', shift: false, ctrl: false, alt: false, description: 'Seek forward 10s' },
        seekBackward: { key: 'arrowleft', shift: false, ctrl: false, alt: false, description: 'Seek backward 10s' },
        nextTrack: { key: 'arrowright', shift: true, ctrl: false, alt: false, description: 'Next track' },
        previousTrack: { key: 'arrowleft', shift: true, ctrl: false, alt: false, description: 'Previous track' },
        volumeUp: { key: 'arrowup', shift: false, ctrl: false, alt: false, description: 'Volume up' },
        volumeDown: { key: 'arrowdown', shift: false, ctrl: false, alt: false, description: 'Volume down' },
        mute: { key: 'm', shift: false, ctrl: false, alt: false, description: 'Mute / Unmute' },
        shuffle: { key: 's', shift: false, ctrl: false, alt: false, description: 'Toggle shuffle' },
        repeat: { key: 'r', shift: false, ctrl: false, alt: false, description: 'Toggle repeat' },
        queue: { key: 'q', shift: false, ctrl: false, alt: false, description: 'Open queue' },
        lyrics: { key: 'l', shift: false, ctrl: false, alt: false, description: 'Toggle lyrics' },
        search: { key: '/', shift: false, ctrl: false, alt: false, description: 'Focus search' },
        escape: { key: 'escape', shift: false, ctrl: false, alt: false, description: 'Close modals' },
        visualizerNext: { key: ']', shift: false, ctrl: false, alt: false, description: 'Next visualizer preset' },
        visualizerPrev: { key: '[', shift: false, ctrl: false, alt: false, description: 'Previous visualizer preset' },
        visualizerCycle: {
            key: '\\',
            shift: false,
            ctrl: false,
            alt: false,
            description: 'Toggle visualizer auto-cycle',
        },
    },

    getShortcuts() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to load keyboard shortcuts:', e);
        }
        return this.getDefaultShortcuts();
    },

    getDefaultShortcuts() {
        return { ...this.DEFAULT_SHORTCUTS };
    },

    setShortcut(action, shortcut) {
        const shortcuts = this.getShortcuts();
        const defaults = this.DEFAULT_SHORTCUTS;
        shortcuts[action] = {
            ...(defaults[action] || {}),
            ...shortcut,
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(shortcuts));
    },

    resetShortcuts() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    getShortcutForAction(action) {
        const shortcuts = this.getShortcuts();
        return shortcuts[action] || this.DEFAULT_SHORTCUTS[action];
    },
};
