import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import neutralino from 'vite-plugin-neutralino';
import authGatePlugin from './vite-plugin-auth-gate.js';

export default defineConfig(({ mode }) => {
    const IS_NEUTRALINO = mode === 'neutralino';

    return {
        base: IS_NEUTRALINO ? './' : '/',
        resolve: {
            alias: {
                pocketbase: '/node_modules/pocketbase/dist/pocketbase.es.js',
            },
        },
        optimizeDeps: {
            exclude: ['pocketbase', '@ffmpeg/ffmpeg', '@ffmpeg/util'],
        },
        server: {
            host: true,
            allowedHosts: ['12ea-109-61-46-145.ngrok-free.app'],
            fs: {
                allow: ['.', 'node_modules'],
            },
        },
        preview: {
            host: true,
            allowedHosts: ['12ea-109-61-46-145.ngrok-free.app'],
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true,
        },
        plugins: [
            IS_NEUTRALINO && neutralino(),
            authGatePlugin(),
            VitePWA({
                registerType: 'prompt',
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
                    cleanupOutdatedCaches: true,
                    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
                    navigateFallback: '/index.html',
                    navigateFallbackDenylist: [/^\/_/],
                    runtimeCaching: [
                        // ...твои существующие правила
                    ],
                },
                includeAssets: ['discord.html'],
                manifest: false,
                base: '/',
            }),
        ],
    };
});