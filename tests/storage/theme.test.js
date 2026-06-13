import { describe, it, expect, beforeEach } from 'vitest';
import { themeManager } from '../../js/storage/theme.js';

describe('themeManager', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns "system" by default', () => {
        expect(themeManager.getTheme()).toBe('system');
    });

    it('sets and gets theme', () => {
        themeManager.setTheme('dark');
        expect(themeManager.getTheme()).toBe('dark');
    });

    it('returns null custom theme by default', () => {
        expect(themeManager.getCustomTheme()).toBeNull();
    });

    it('sets and gets custom theme', () => {
        const colors = { background: '#000', foreground: '#fff' };
        themeManager.setCustomTheme(colors);
        expect(themeManager.getCustomTheme()).toEqual(colors);
    });
});
