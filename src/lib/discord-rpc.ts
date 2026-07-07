import type { Track } from '../types';
import { discordRPCSettings } from './storage';

const WS_URL = 'ws://localhost:6969';

let ws: WebSocket | null = null;
let wsConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

function isTauri(): boolean {
    return !!(window as any).__TAURI_INTERNALS__;
}

async function invokeTauri(cmd: string, args?: Record<string, unknown>): Promise<any> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
}

function connectWs(): void {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    try {
        ws = new WebSocket(WS_URL);
    } catch {
        scheduleReconnect();
        return;
    }

    ws.onopen = () => {
        wsConnected = true;
        reconnectDelay = 1000;
    };

    ws.onclose = () => {
        wsConnected = false;
        ws = null;
        scheduleReconnect();
    };

    ws.onerror = () => {
        wsConnected = false;
    };
}

function scheduleReconnect(): void {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        const settings = discordRPCSettings.get();
        if (settings.enabled) connectWs();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
}

function wsSend(data: unknown): void {
    if (ws && wsConnected) {
        try { ws.send(JSON.stringify(data)); } catch {}
    }
}

function getTrackArtists(track: Track): string {
    if (track.artists && track.artists.length > 0) {
        return track.artists.map(a => a.name).join(', ');
    }
    return track.artist || 'Unknown Artist';
}

interface PresenceData {
    details?: string;
    state?: string;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    buttons?: { label: string; url: string }[];
}

function buildPresence(track: Track | null, isPlaying: boolean, elapsed: number = 0): PresenceData {
    const settings = discordRPCSettings.get();

    if (!track) {
        return {
            details: 'Idle',
            state: 'Not playing',
        };
    }

    const presence: PresenceData = {};

    if (settings.showDetails) {
        presence.details = track.title || 'Unknown Title';
    }
    if (settings.showArtist) {
        presence.state = getTrackArtists(track);
    }

    presence.largeImageKey = track.cover ? 'music' : 'default';
    presence.largeImageText = settings.showAlbum ? (track.album?.title || 'Barashka Music') : 'Barashka Music';
    presence.smallImageKey = isPlaying ? 'play' : 'pause';
    presence.smallImageText = isPlaying ? 'Playing' : 'Paused';

    if (settings.showTimestamp && isPlaying && track.duration) {
        presence.endTimestamp = Math.floor(Date.now() / 1000) + Math.floor(track.duration - elapsed);
    }

    if (settings.showButtons) {
        presence.buttons = [
            { label: 'Listen on Barashka', url: window.location.href },
        ];
    }

    return presence;
}

class DiscordRPC {
    private lastTrackId: string | null = null;
    private lastIsPlaying: boolean = false;
    private initialized = false;

    init(): void {
        const settings = discordRPCSettings.get();
        if (!settings.enabled) return;

        if (this.initialized) return;
        this.initialized = true;

        if (isTauri()) return;

        connectWs();
    }

    update(track: Track | null, isPlaying: boolean, elapsed: number = 0): void {
        const settings = discordRPCSettings.get();
        if (!settings.enabled) return;

        if (!this.initialized) {
            this.init();
        }
        if (!this.initialized) return;

        const trackId = track?.id || null;
        if (trackId === this.lastTrackId && isPlaying === this.lastIsPlaying) return;

        this.lastTrackId = trackId;
        this.lastIsPlaying = isPlaying;

        const presence = buildPresence(track, isPlaying, elapsed);

        if (isTauri()) {
            this.updateTauri(presence, track?.id);
        } else {
            this.updateWebSocket(presence);
        }
    }

    private async updateTauri(presence: PresenceData, trackId?: string): Promise<void> {
        try {
            await invokeTauri('set_discord_presence', {
                details: presence.details || null,
                stateStr: presence.state || null,
                largeImageKey: presence.largeImageKey || null,
                largeText: presence.largeImageText || null,
                smallImageKey: presence.smallImageKey || null,
                smallText: presence.smallImageText || null,
                startTimestamp: presence.startTimestamp || null,
                endTimestamp: presence.endTimestamp || null,
                button1Label: presence.buttons?.[0]?.label || null,
                button1Url: presence.buttons?.[0]?.url || null,
                button2Label: presence.buttons?.[1]?.label || null,
                button2Url: presence.buttons?.[1]?.url || null,
                trackId: trackId || null,
            });
        } catch (e) {
            console.warn('Tauri RPC update failed:', e);
        }
    }

    private updateWebSocket(presence: PresenceData): void {
        if (!wsConnected) return;
        wsSend({
            cmd: 'SET_ACTIVITY',
            args: { activity: presence },
            nonce: Math.random().toString(36).substring(2),
        });
    }

    clear(): void {
        const settings = discordRPCSettings.get();
        if (!settings.enabled || !this.initialized) return;

        this.lastTrackId = null;
        this.lastIsPlaying = false;

        if (isTauri()) {
            invokeTauri('clear_discord_presence').catch(() => {});
        } else if (wsConnected) {
            wsSend({
                cmd: 'SET_ACTIVITY',
                args: { activity: null },
                nonce: Math.random().toString(36).substring(2),
            });
        }
    }

    enable(): void {
        this.initialized = true;
        if (!isTauri()) connectWs();
    }

    disable(): void {
        this.clear();
        if (!isTauri()) {
            if (ws) { ws.close(); ws = null; }
            wsConnected = false;
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        }
        this.initialized = false;
    }

    destroy(): void {
        this.clear();
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (ws) { ws.close(); ws = null; }
        wsConnected = false;
        this.initialized = false;
    }

    get connected(): boolean {
        if (isTauri()) return true;
        return wsConnected;
    }

    get enabled(): boolean {
        return discordRPCSettings.get().enabled;
    }
}

export const discordRPC = new DiscordRPC();
