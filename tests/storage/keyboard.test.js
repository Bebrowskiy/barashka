import { describe, it, expect, beforeEach } from 'vitest';
import { keyboardShortcuts } from '../../js/storage/keyboard.js';

describe('keyboardShortcuts', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns default shortcuts', () => {
        const shortcuts = keyboardShortcuts.getShortcuts();
        expect(shortcuts.playPause).toBeDefined();
        expect(shortcuts.playPause.key).toBe(' ');
    });

    it('sets a custom shortcut', () => {
        keyboardShortcuts.setShortcut('playPause', { key: 'p' });
        const shortcut = keyboardShortcuts.getShortcutForAction('playPause');
        expect(shortcut.key).toBe('p');
        expect(shortcut.shift).toBe(false);
    });

    it('resets shortcuts to defaults', () => {
        keyboardShortcuts.setShortcut('playPause', { key: 'x' });
        keyboardShortcuts.resetShortcuts();
        const shortcuts = keyboardShortcuts.getShortcuts();
        expect(shortcuts.playPause.key).toBe(' ');
    });

    it('returns default for unknown action', () => {
        const shortcut = keyboardShortcuts.getShortcutForAction('nonexistent');
        expect(shortcut).toBeUndefined();
    });
});
