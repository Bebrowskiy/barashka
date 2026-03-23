# Tauri Release and Discord RPC Guide

Here is an overview of how the Tauri integration is set up, how the Discord RPC works, and how you can prepare the application for production.

## 1. Discord RPC Integration

### How it works:
1. When the music player (`js/player.js`) plays or pauses a track, it calls the `updateDiscordPresence()` function from `js/discord-rpc.js`.
2. This function uses the Tauri API (`invoke`) to send a message to the Rust backend, passing track details (Title, Artists, Pause State).
3. The Rust backend receives this via the `set_discord_presence` command and passes it to the `discord-rich-presence` crate.
4. The crate communicates with the Discord client on your computer via IPC (Inter-Process Communication) and updates your profile status instantly!

### Customizing your Discord App ID:
I've temporarily used a placeholder ID (`123456789012345678`). To set up your actual Discord app:
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and give it a name like "Barashka".
3. Copy the **Application ID**.
4. In `src-tauri/src/lib.rs`, replace `123456789012345678` with your new Application ID.
5. In the Developer Portal, go to **Rich Presence > Art Assets**, and upload an image named `logo`. This will be shown alongside your playback status.

---

## 2. Using Tauri in Production

When you are ready to ship your application to users, running `npm run tauri build` will compile the code into a standalone `.exe` installer (and an `.msi` if configured).

### Key steps before release:

1. **Install C++ Build Tools (Windows Only):** 
   You MUST have the [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installed to compile Windows apps. You only need the "Desktop development with C++" workload.

2. **Update Application Metadata:**
   Open `src-tauri/tauri.conf.json` and ensure the following are correct:
   - `productName` (e.g., "Barashka Desktop")
   - `version` (e.g., "1.0.0")
   - `identifier` (e.g., "ru.barashka.desktop") — must be unique.
   - You should also update the `icons/` directory with your real logo.

3. **Building the Application:**
   Run:
   ```bash
   npm run tauri build
   ```
   This process will take a few minutes. Once finished, the installer will be located at:
   `src-tauri/target/release/bundle/nsis/`

4. **Distribution:**
   You can take the generated installer `.exe` from the `nsis` folder and upload it to GitHub Releases, your website, or any other hosting service. Users simply run it to install Barashka on their Windows machines!
