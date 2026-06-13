const RPC_WS_URL = 'ws://localhost:6969';

let ws = null;
let wsConnected = false;
let reconnectTimer = null;

let lastRpcState = {
    trackId: null,
    isPlaying: null,
    lastUpdate: 0,
};

function connectWs() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
        ws = new WebSocket(RPC_WS_URL);
    } catch {
        return;
    }

    ws.onopen = () => {
        wsConnected = true;
        console.log('[Discord RPC] WebSocket connected');
    };

    ws.onclose = () => {
        wsConnected = false;
        ws = null;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWs, 5000);
    };

    ws.onerror = () => {
        wsConnected = false;
    };
}

function wsSend(data) {
    if (ws && wsConnected) {
        try {
            ws.send(JSON.stringify(data));
        } catch {
            /* noop */
        }
    }
}

function isTauri() {
    return !!window.__TAURI_INTERNALS__;
}

async function invokeTauri(cmd, args) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
}

function buildPresenceData(player, isPaused, forceUpdate) {
    const track = player.currentTrack;
    if (!track) return null;

    const now = Date.now();
    const trackId = String(track.id);
    const trackChanged = lastRpcState.trackId !== trackId;

    if (!forceUpdate && !trackChanged && now - lastRpcState.lastUpdate < 15000) {
        return null;
    }

    const title = track.title || 'Unknown Title';
    const artists = (track.artists || []).map((a) => a.name).join(', ') || 'Unknown Artist';
    const album = track.album?.title || 'Single';

    let startTimestamp = null;
    let endTimestamp = null;

    if (!isPaused && player.audio && player.audio.duration > 0 && track.duration) {
        const unixNow = Math.floor(Date.now() / 1000);
        startTimestamp = unixNow - Math.floor(player.audio.currentTime);
        endTimestamp = startTimestamp + Math.floor(track.duration);
    }

    let largeImageKey = 'logo';
    if (track.album && player.api) {
        const rawCover = player.api.getCoverUrl(track.album.cover);
        if (rawCover && rawCover.startsWith('http')) {
            largeImageKey = rawCover;
        }
    }

    let smallImageKey = null;
    let smallText = null;
    if (isPaused) {
        smallImageKey = 'paused';
        smallText = 'Paused';
    } else {
        smallImageKey = 'playing';
        smallText = 'Playing';
    }

    const trackUrl = trackId
        ? `https://barashka-music.ru/track/${trackId}`
        : 'https://barashka-music.ru';

    return {
        details: title,
        stateStr: artists,
        largeImageKey,
        largeText: album,
        smallImageKey,
        smallText,
        startTimestamp,
        endTimestamp,
        button1Label: 'Play Track',
        button1Url: trackUrl,
        button2Label: null,
        button2Url: null,
        trackId,
    };
}

export async function updateDiscordPresence(player, isPaused = false, forceUpdate = false) {
    try {
        const track = player.currentTrack;
        if (!track) {
            if (isTauri()) {
                await invokeTauri('clear_discord_presence').catch(() => {});
            } else {
                wsSend({ type: 'clear' });
            }
            lastRpcState = { trackId: null, isPlaying: null, lastUpdate: 0 };
            return;
        }

        const data = buildPresenceData(player, isPaused, forceUpdate);
        if (!data) return;

        if (isTauri()) {
            await invokeTauri('set_discord_presence', data).catch(() => {});
        } else {
            wsSend({
                type: 'presence',
                data: {
                    details: data.details,
                    state: data.stateStr,
                    largeImageKey: data.largeImageKey,
                    largeText: data.largeText,
                    smallImageKey: data.smallImageKey,
                    smallText: data.smallText,
                    startTimestamp: data.startTimestamp,
                    endTimestamp: data.endTimestamp,
                    button1Label: data.button1Label,
                    button1Url: data.button1Url,
                    button2Label: data.button2Label,
                    button2Url: data.button2Url,
                },
            });
        }

        lastRpcState = {
            trackId: data.trackId,
            isPlaying: !isPaused,
            lastUpdate: Date.now(),
        };
    } catch (err) {
        console.error('[Discord RPC] Failed to update presence:', err);
    }
}

export function initDiscordRpc(player) {
    if (!isTauri()) {
        connectWs();
    }

    const audio = player.audio;

    audio.addEventListener('play', () => {
        updateDiscordPresence(player, false, true);
    });

    audio.addEventListener('pause', () => {
        updateDiscordPresence(player, true);
    });

    audio.addEventListener('ended', () => {
        lastRpcState = { trackId: null, isPlaying: null, lastUpdate: 0 };
    });

    audio.addEventListener('loadstart', () => {
        if (player.currentTrack) {
            const newId = String(player.currentTrack.id);
            if (newId !== lastRpcState.trackId) {
                lastRpcState = { trackId: null, isPlaying: null, lastUpdate: 0 };
            }
        }
    });
}
