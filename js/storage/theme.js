export const themeManager = {
    STORAGE_KEY: 'monochrome-theme',
    CUSTOM_THEME_KEY: 'monochrome-custom-theme',

    defaultThemes: {
        light: {},
        dark: {},
        monochrome: {},
        lighty: {},
        purple: {},
        forest: {},
        mocha: {},
        macchiato: {},
        frappe: {},
        latte: {},
    },

    getTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'system';
        } catch {
            return 'system';
        }
    },

    setTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', isDark ? 'monochrome' : 'white');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        if (theme !== 'custom') {
            const root = document.documentElement;
            ['background', 'foreground', 'primary', 'secondary', 'muted', 'border', 'highlight'].forEach((key) => {
                root.style.removeProperty(`--${key}`);
            });
        } else {
            const customTheme = this.getCustomTheme();
            if (customTheme) {
                this.applyCustomTheme(customTheme);
            }
        }

        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    },

    getCustomTheme() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_THEME_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    },

    setCustomTheme(colors) {
        localStorage.setItem(this.CUSTOM_THEME_KEY, JSON.stringify(colors));
        this.applyCustomTheme(colors);
        this.setTheme('custom');
    },

    applyCustomTheme(colors) {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(colors)) {
            root.style.setProperty(`--${key}`, value);
        }
    },
};

if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (themeManager.getTheme() === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? 'monochrome' : 'white');
        }
    });
}
