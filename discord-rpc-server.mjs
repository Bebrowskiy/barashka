import { WebSocketServer } from 'ws';
import { Client } from 'discord-rpc';

const RPC_PORT = parseInt(process.env.DISCORD_RPC_PORT || '6969', 10);
const DISCORD_CLIENT_ID = '1484809741959036949';

let rpc = null;
let connected = false;
let activityQueue = null;
let updateTimeout = null;
const MIN_UPDATE_INTERVAL = 15000;
let lastUpdate = 0;

async function connectDiscord() {
    if (rpc) {
        try {
            rpc.destroy();
        } catch {
            /* noop */
        }
        rpc = null;
    }

    rpc = new Client({ transport: 'ipc' });

    rpc.on('ready', () => {
        connected = true;
        console.log('[Discord RPC] Connected to Discord');
        if (activityQueue) {
            setActivity(activityQueue);
            activityQueue = null;
        }
    });

    rpc.on('disconnected', () => {
        connected = false;
        console.log('[Discord RPC] Disconnected from Discord');
        setTimeout(connectDiscord, 5000);
    });

    try {
        await rpc.login({ clientId: DISCORD_CLIENT_ID });
    } catch (err) {
        console.error('[Discord RPC] Failed to connect:', err.message);
        connected = false;
        setTimeout(connectDiscord, 10000);
    }
}

function setActivity(data) {
    if (!rpc || !connected) {
        activityQueue = data;
        return;
    }

    const now = Date.now();
    if (now - lastUpdate < MIN_UPDATE_INTERVAL) {
        activityQueue = data;
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            if (activityQueue && rpc && connected) {
                rpc.setActivity(activityQueue).catch(() => {});
                lastUpdate = Date.now();
                activityQueue = null;
            }
        }, MIN_UPDATE_INTERVAL - (now - lastUpdate));
        return;
    }

    rpc.setActivity(data).catch(() => {});
    lastUpdate = now;
    activityQueue = null;
}

function clearActivity() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = null;
    }
    activityQueue = null;

    if (rpc && connected) {
        rpc.clearActivity().catch(() => {});
    }
}

function startServer() {
    const wss = new WebSocketServer({ port: RPC_PORT });

    console.log(`[Discord RPC] WebSocket server listening on port ${RPC_PORT}`);

    wss.on('connection', (ws) => {
        console.log('[Discord RPC] Client connected');

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);

                if (msg.type === 'presence') {
                    const {
                        details,
                        state,
                        largeImageKey,
                        largeText,
                        smallImageKey,
                        smallText,
                        startTimestamp,
                        endTimestamp,
                        button1Label,
                        button1Url,
                        button2Label,
                        button2Url,
                    } = msg.data;

                    const activity = {
                        details: details || undefined,
                        state: state || undefined,
                        largeImageKey: largeImageKey || 'logo',
                        largeText: largeText || undefined,
                        smallImageKey: smallImageKey || undefined,
                        smallText: smallText || undefined,
                        instance: false,
                    };

                    if (startTimestamp || endTimestamp) {
                        activity.timestamps = {};
                        if (startTimestamp) activity.timestamps.start = startTimestamp;
                        if (endTimestamp) activity.timestamps.end = endTimestamp;
                    }

                    const buttons = [];
                    if (button1Label && button1Url) {
                        buttons.push({ label: button1Label, url: button1Url });
                    }
                    if (button2Label && button2Url) {
                        buttons.push({ label: button2Label, url: button2Url });
                    }
                    if (buttons.length > 0) {
                        activity.buttons = buttons;
                    }

                    setActivity(activity);
                } else if (msg.type === 'clear') {
                    clearActivity();
                }
            } catch (err) {
                console.error('[Discord RPC] Invalid message:', err.message);
            }
        });

        ws.on('close', () => {
            console.log('[Discord RPC] Client disconnected');
        });

        ws.send(JSON.stringify({ type: 'connected', connected }));
    });

    connectDiscord();
}

startServer();
