import { invoke } from '@tauri-apps/api/core';

// Кэш для предотвращения дублирующих обновлений
let lastRpcState = {
    trackId: null,
    isPlaying: null,
    lastUpdate: 0
};

export function updateDiscordPresence(player, isPaused = false, forceUpdate = false) {
    if (!window.__TAURI_INTERNALS__) return;

    try {
        const track = player.currentTrack;
        if (!track) {
            invoke('clear_discord_presence').catch(e => console.error('Tauri RPC clear error:', e));
            lastRpcState = { trackId: null, isPlaying: null, lastUpdate: 0 };
            return;
        }

        const now = Date.now();
        // 🔥 FIX: Конвертируем ID в строку для сравнения
        const trackId = String(track.id);
        const trackChanged = lastRpcState.trackId !== trackId;
        
        // Rate limiting: не чаще 15 сек, НО игнорируем если трек сменился
        if (!forceUpdate && !trackChanged && now - lastRpcState.lastUpdate < 15000) {
            return;
        }

        const title = track.title || 'Unknown Title';
        const artists = (track.artists || []).map(a => a.name).join(', ') || 'Unknown Artist';
        const album = track.album?.title || 'Single';
        
        // Exact translation of the Yandex Music / Spotify integration: 
        // We only use the artist name as the state.
        const stateStr = artists;

        // Timestamps для прогресс-бара
        let startTimestamp = null;
        let endTimestamp = null;
        
        if (!isPaused && player.audio && player.audio.duration > 0 && track.duration) {
            const unixNow = Math.floor(Date.now() / 1000);
            startTimestamp = unixNow - Math.floor(player.audio.currentTime);
            endTimestamp = startTimestamp + Math.floor(track.duration);
        }

        // URL для обложки
        let largeImageKey = 'logo';
        if (track.album && player.api) {
            const rawCover = player.api.getCoverUrl(track.album.cover);
            if (rawCover && rawCover.startsWith('http')) {
                largeImageKey = rawCover;
            }
        }
        
        // Removed small image overlay to match the clean look in the photo
        const smallImageKey = null;
        const smallText = null;

        const trackUrl = trackId 
            ? `https://barashka-music.ru/track/${trackId}` 
            : 'https://barashka-music.ru';

        // Отправка в RPC с обновленным стилем
        invoke('set_discord_presence', {
            details: title,
            stateStr: stateStr,
            largeImageKey: largeImageKey,
            largeText: album,
            smallImageKey: smallImageKey,
            smallText: smallText,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            button1Label: '🎵 Play Track',  // English button per user request
            button1Url: trackUrl,
            button2Label: null,
            button2Url: null,
            trackId: trackId
        }).then(() => {
            console.log('[RPC] ✓ Activity sent');
        }).catch(e => console.error('Tauri Discord RPC Error:', e));

        // Обновляем кэш
        lastRpcState = {
            trackId: trackId,
            isPlaying: !isPaused,
            lastUpdate: now
        };

    } catch (err) {
        console.error('Failed to update Discord presence:', err);
    }
}

export function initDiscordRpc(player) {
    if (!window.__TAURI_INTERNALS__) return;

    const audio = player.audio;

    audio.addEventListener('play', () => {
        updateDiscordPresence(player, false, true);
    });

    audio.addEventListener('pause', () => {
        updateDiscordPresence(player, true);
    });

    // 🔥 КРИТИЧНО: обработчик ended для авто-плея из очереди
    audio.addEventListener('ended', () => {
        lastRpcState = { trackId: null, isPlaying: null, lastUpdate: 0 };
    });

    // loadstart — новый трек загружается
    audio.addEventListener('loadstart', () => {
        if (player.currentTrack) {
            const newId = String(player.currentTrack.id);
            if (newId !== lastRpcState.trackId) {
                lastRpcState = { trackId: null, isPlaying: null, lastUpdate: 0 };
            }
        }
    });
}