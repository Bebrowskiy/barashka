import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess = null;

export default function discordRpcPlugin() {
    return {
        name: 'vite-plugin-discord-rpc',
        configureServer(server) {
            const serverPath = join(__dirname, 'discord-rpc-server.mjs');

            server.httpServer?.on('listening', () => {
                if (serverProcess) return;

                serverProcess = fork(serverPath, [], {
                    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
                    env: { ...process.env },
                });

                serverProcess.stdout?.on('data', (data) => {
                    process.stdout.write(`[Discord RPC] ${data}`);
                });
                serverProcess.stderr?.on('data', (data) => {
                    process.stderr.write(`[Discord RPC] ${data}`);
                });

                serverProcess.on('exit', (code) => {
                    console.log(`[Discord RPC] Server exited with code ${code}`);
                    serverProcess = null;
                });

                console.log('[Discord RPC] Server started');
            });

            server.httpServer?.on('close', () => {
                if (serverProcess) {
                    serverProcess.kill();
                    serverProcess = null;
                }
            });
        },
    };
}
