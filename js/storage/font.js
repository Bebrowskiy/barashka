export const fontSettings = {
    STORAGE_KEY: 'monochrome-font-config-v2',
    CUSTOM_FONTS_KEY: 'monochrome-custom-fonts',
    FONT_SIZE_KEY: 'monochrome-font-size',
    FONT_LINK_ID: 'monochrome-dynamic-font',
    FONT_FACE_ID: 'monochrome-dynamic-fontface',

    getDefaultConfig() {
        return {
            type: 'preset',
            family: 'Nunito',
            fallback: 'sans-serif',
            weights: [400, 500, 600, 700, 800],
        };
    },

    getDefaultFontSize() {
        return 100;
    },

    getFontSize() {
        try {
            const stored = localStorage.getItem(this.FONT_SIZE_KEY);
            if (stored) {
                const size = parseInt(stored, 10);
                if (!isNaN(size) && size >= 50 && size <= 200) {
                    return size;
                }
            }
        } catch {
            // ignore
        }
        return this.getDefaultFontSize();
    },

    setFontSize(size) {
        const validSize = Math.max(50, Math.min(200, parseInt(size, 10) || 100));
        localStorage.setItem(this.FONT_SIZE_KEY, validSize.toString());
        this.applyFontSize();
        return validSize;
    },

    applyFontSize() {
        const size = this.getFontSize();
        document.documentElement.style.setProperty('--font-size-scale', `${size}%`);
    },

    resetFontSize() {
        localStorage.removeItem(this.FONT_SIZE_KEY);
        this.applyFontSize();
        return this.getDefaultFontSize();
    },

    getConfig() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            // ignore
        }
        return this.getDefaultConfig();
    },

    setConfig(config) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    },

    parseGoogleFontsUrl(url) {
        try {
            if (url.includes('fonts.google.com/specimen/')) {
                const match = url.match(/specimen\/([^/?]+)/);
                if (match) {
                    return decodeURIComponent(match[1]).replace(/\+/g, ' ');
                }
            }
            if (url.includes('fonts.googleapis.com/css')) {
                const match = url.match(/family=([^&:]+)/);
                if (match) {
                    return decodeURIComponent(match[1]).replace(/\+/g, ' ').split(':')[0];
                }
            }
        } catch {
            // ignore
        }
        return null;
    },

    async loadGoogleFont(familyName) {
        if (!familyName || typeof familyName !== 'string') {
            return;
        }
        const sanitizedFamily = familyName.replace(/[^a-zA-Z0-9\s\-_,.]/g, '');
        if (!sanitizedFamily) {
            return;
        }

        const encodedFamily = encodeURIComponent(sanitizedFamily);
        const url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@100;200;300;400;500;600;700;800;900&display=swap`;

        let link = document.getElementById(this.FONT_LINK_ID);
        if (!link) {
            link = document.createElement('link');
            link.id = this.FONT_LINK_ID;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        link.href = url;

        this.setConfig({
            type: 'google',
            family: familyName,
            fallback: 'sans-serif',
            weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        });

        document.documentElement.style.setProperty('--font-family', `'${familyName}', sans-serif`);
    },

    async loadFontFromUrl(url, familyName) {
        const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const fontFaceId = this.FONT_FACE_ID;

        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }

        const format = this.getFontFormat(url);
        const fontFamily = familyName || 'CustomFont';

        style.textContent = `
            @font-face {
                font-family: '${fontFamily}';
                src: url('${url}') format('${format}');
                font-weight: 100 900;
                font-style: normal;
                font-display: swap;
            }
        `;

        this.setConfig({
            type: 'url',
            family: fontFamily,
            url: url,
            fallback: 'sans-serif',
            weights: weights,
        });

        document.documentElement.style.setProperty('--font-family', `'${fontFamily}', sans-serif`);
    },

    getFontFormat(url) {
        const ext = url.split('.').pop().toLowerCase();
        const formats = {
            woff2: 'woff2',
            woff: 'woff',
            ttf: 'truetype',
            otf: 'opentype',
        };
        return formats[ext] || 'woff2';
    },

    async saveUploadedFont(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                const fontId = 'uploaded-' + Date.now();
                const customFonts = this.getCustomFonts();

                customFonts[fontId] = {
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    base64: base64,
                    format: this.getFontFormat(file.name),
                    size: file.size,
                    uploadedAt: Date.now(),
                };

                localStorage.setItem(this.CUSTOM_FONTS_KEY, JSON.stringify(customFonts));
                resolve({ id: fontId, ...customFonts[fontId] });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    getCustomFonts() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_FONTS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    },

    async loadUploadedFont(fontId) {
        const customFonts = this.getCustomFonts();
        const font = customFonts[fontId];

        if (!font) {
            throw new Error('Font not found');
        }

        const fontFamily = font.name || 'UploadedFont';
        const fontFaceId = this.FONT_FACE_ID;

        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }

        style.textContent = `
            @font-face {
                font-family: '${fontFamily}';
                src: url('${font.base64}') format('${font.format}');
                font-weight: 100 900;
                font-style: normal;
                font-display: swap;
            }
        `;

        this.setConfig({
            type: 'uploaded',
            family: fontFamily,
            fontId: fontId,
            fallback: 'sans-serif',
            weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        });

        document.documentElement.style.setProperty('--font-family', `'${fontFamily}', sans-serif`);
    },

    deleteUploadedFont(fontId) {
        const customFonts = this.getCustomFonts();
        delete customFonts[fontId];
        localStorage.setItem(this.CUSTOM_FONTS_KEY, JSON.stringify(customFonts));
    },

    loadPresetFont(family, fallback = 'sans-serif') {
        let link = document.getElementById(this.FONT_LINK_ID);
        if (link) {
            link.remove();
        }

        let style = document.getElementById(this.FONT_FACE_ID);
        if (style) {
            style.remove();
        }

        this.setConfig({
            type: 'preset',
            family: family,
            fallback: fallback,
            weights: [400, 500, 600, 700, 800],
        });

        const fontValue = family === 'monospace' ? 'monospace' : `'${family}', ${fallback}`;
        document.documentElement.style.setProperty('--font-family', fontValue);
    },

    loadAppleMusicFont() {
        const APPLE_FONT_LINK_ID = 'monochrome-apple-font';

        let existingLink = document.getElementById(this.FONT_LINK_ID);
        if (existingLink) {
            existingLink.remove();
        }

        let existingStyle = document.getElementById(this.FONT_FACE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }

        let link = document.getElementById(APPLE_FONT_LINK_ID);
        if (!link) {
            link = document.createElement('link');
            link.id = APPLE_FONT_LINK_ID;
            link.rel = 'stylesheet';
            link.href = '/fonts/apple/sf-pro-display.css';
            document.head.appendChild(link);
        }

        this.setConfig({
            type: 'preset',
            family: 'Apple Music',
            fallback: 'sans-serif',
            weights: [400, 500, 600, 700],
        });

        document.documentElement.style.setProperty('--font-family', "'SF Pro Display', sans-serif");
    },

    applyFont() {
        const config = this.getConfig();

        switch (config.type) {
            case 'google':
                this.loadGoogleFont(config.family);
                break;
            case 'url':
                this.loadFontFromUrl(config.url, config.family);
                break;
            case 'uploaded':
                this.loadUploadedFont(config.fontId);
                break;
            case 'preset':
            default:
                if (config.family === 'Apple Music') {
                    this.loadAppleMusicFont();
                } else {
                    this.loadPresetFont(config.family, config.fallback);
                }
                break;
        }
    },

    getUploadedFontList() {
        const fonts = this.getCustomFonts();
        return Object.entries(fonts).map(([id, font]) => ({
            id,
            name: font.name,
            size: font.size,
            uploadedAt: font.uploadedAt,
        }));
    },
};
