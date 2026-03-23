import { invoke } from '@tauri-apps/api/core';

export function updateDiscordPresence(player, isPaused = false) {
    if (!window.__TAURI_INTERNALS__) return; // Run only in Tauri

    try {
        const track = player.currentTrack;
        if (!track) {
            invoke('clear_discord_presence');
            return;
        }

        const title = track.title || 'Unknown Title';
        const artists = (track.artists || []).map(a => a.name).join(', ') || 'Unknown Artist';
        const album = track.album?.title || 'Single';
        
        const stateStr = isPaused ? `Paused: ${artists}` : artists;

        let endTimestamp = null;
        if (!isPaused && player.audio && player.audio.duration > 0) {
            const now = Math.floor(Date.now() / 1000);
            const remaining = Math.floor(player.audio.duration - player.audio.currentTime);
            if (remaining > 0) {
                endTimestamp = now + remaining;
            }
        }

        let coverUrl = 'logo'; // Keep the default fallback
        if (track.album && player.api) {
            const rawCover = player.api.getCoverUrl(track.album.cover);
            if (rawCover && rawCover.startsWith('http')) {
                coverUrl = rawCover;
            }
        }

        invoke('set_discord_presence', {
            details: title,
            stateStr: stateStr,
            largeImageKey: coverUrl,
            largeText: album,
            smallImageKey: 'logop',
            smallText: 'Barashka Music',
            startTimestamp: null,
            endTimestamp: endTimestamp,
            button1Label: 'Listen in Barashka',
            button1Url: 'https://barashka-music.ru/'
        }).catch(e => console.error('Tauri Discord RPC Error:', e));
    } catch (err) {
        console.error('Failed to update Discord presence:', err);
    }
}

export function initDiscordRpc(player) {
    if (!window.__TAURI_INTERNALS__) return;

    player.audio.addEventListener('play', () => {
        updateDiscordPresence(player, false);
    });

    player.audio.addEventListener('pause', () => {
        updateDiscordPresence(player, true);
    });
}
