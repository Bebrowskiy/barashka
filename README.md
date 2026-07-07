<p align="center">
   <img src="app-icon.png" width="200" alt="Barashka icon">
</p>

# Barashka Music Player

> A minimalist music player for your collection. Streaming, local files, and downloads.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](license)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.x-green.svg)](https://nodejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)](https://tauri.app/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.x-blue.svg)](https://capacitorjs.com/)
[![GitHub stars](https://img.shields.io/github/stars/Bebrowskiy/barashka?style=social)](https://github.com/Bebrowskiy/barashka/stargazers)

---

## About

Barashka is a music player built with React 19, TypeScript, Tailwind CSS 4, and Vite. It combines local file playback with streaming from multiple providers. Works across web, desktop (Tauri), and mobile (Capacitor).

---

## Features

### Audio Playback

- Multiple formats: MP3, FLAC, WAV, OGG, M4A, AAC, WMA, Opus
- Hi-Res audio quality support
- Crossfade with 5 configurable curves (linear, logarithmic, exponential, sine, cosine)
- ReplayGain volume normalization (track and album modes)
- Configurable equalizer (3 to 32 bands)
- Multiple audio visualizers
- Playback speed control with pitch preservation
- Mono audio and exponential volume options
- Sleep timer

### Streaming Providers

- **YouTube** — Track streaming via Piped API
- **Jamendo** — Free music catalog (requires client ID)
- **Internet Archive** — Public domain and Creative Commons audio

### Library Management

- User playlists with full CRUD
- Playlist import/export (CSV, M3U, XSPF, JSPF, JSON)
- Favorites for tracks, albums, and artists
- Listening history
- Local file import (drag & drop)
- Content blocking (tracks, artists)
- Profile customization (nickname, avatar, bio, accent color)

### Downloads

- Download tracks with format conversion (MP3, FLAC, WAV, OGG, AAC)
- ID3 and Vorbis metadata tags (title, artist, album, cover art)
- Powered by FFmpeg (WebAssembly)

### Scrobbling

- Last.fm
- ListenBrainz
- Libre.fm
- Maloja (self-hosted)

### Lyrics

- LRCLib (synced and plain lyrics)
- Genius (annotations)

### User Interface

- Minimalist, responsive design
- Light, dark, and system themes
- Fullscreen player with lyrics
- Context menus with queue management
- Keyboard shortcuts
- i18n (English, Russian)
- Accent color extraction from album art

### Sync

- Cross-device sync via QR code / base64 export
- Syncs favorites, playlists, and history

### Desktop App (Tauri)

- Windows, macOS, Linux
- Discord Rich Presence

### Mobile App (Capacitor)

- Android and iOS
- Background playback, media controls

---

## Screenshots

![Light Theme](screenshots/lightTheme.png)
![Dark Theme](screenshots/darkTheme.png)
![Profile Page](screenshots/profile.png)

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Install

```bash
git clone https://github.com/Bebrowskiy/barashka.git
cd barashka
npm install
```

### Development

```bash
npm run dev
# App available at http://localhost:3000
```

### Production Build

```bash
npm run build

# Desktop app (Tauri)
npm run tauri:build

# Mobile apps (Capacitor)
npm run cap:sync
npm run cap:android   # or cap:ios
```

---

## Project Structure

```
barashka/
├── src/                        # React application
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   ├── types.ts                # TypeScript types
│   ├── context/                # React contexts
│   │   └── PlayerContext.tsx    # Global player state
│   ├── components/             # UI components
│   │   ├── MainView.tsx        # Home / search
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── Player.tsx          # Bottom player bar
│   │   ├── FullscreenPlayer.tsx
│   │   ├── Visualizer.tsx      # Audio visualizer
│   │   ├── LibraryView.tsx     # Library (playlists, favorites)
│   │   ├── PlaylistView.tsx    # Playlist detail
│   │   ├── ArtistView.tsx      # Artist page
│   │   ├── LocalFilesView.tsx  # Local file management
│   │   ├── HistoryView.tsx     # Listening history
│   │   ├── SettingsView.tsx    # Settings
│   │   ├── AudioPanel.tsx      # Audio effects panel
│   │   ├── ContextMenu.tsx     # Right-click menu
│   │   └── ...
│   └── lib/                    # Utilities & services
│       ├── audio-engine.ts     # Playback engine
│       ├── equalizer.ts        # Configurable equalizer
│       ├── crossfade.ts        # Crossfade manager
│       ├── music-api.ts        # Unified music API client
│       ├── youtube-api.ts      # YouTube provider (Piped)
│       ├── jamendo-api.ts      # Jamendo provider
│       ├── internet-archive-api.ts  # Internet Archive provider
│       ├── deezer-api.ts       # Deezer artist enrichment
│       ├── download-service.ts # Track download + conversion
│       ├── ffmpeg-service.ts   # FFmpeg WebAssembly
│       ├── sleep-timer.ts      # Sleep timer
│       ├── share-service.ts    # Track sharing
│       ├── db.ts               # IndexedDB CRUD
│       ├── scrobbler.ts        # Scrobbling router
│       ├── lastfm-scrobbler.ts
│       ├── listenbrainz-scrobbler.ts
│       ├── librefm-scrobbler.ts
│       ├── maloja-scrobbler.ts
│       ├── lyrics-api.ts       # LRCLib lyrics
│       ├── genius-api.ts       # Genius annotations
│       ├── local-files.ts      # Local file import
│       ├── playlist-io.ts      # Import/export
│       ├── sync.ts             # Cross-device sync
│       ├── waveform.ts         # Waveform generation
│       ├── vibrant-color.ts    # Accent color extraction
│       ├── discord-rpc.ts      # Discord Rich Presence
│       ├── keyboard-shortcuts.ts
│       ├── i18n.tsx            # Translations
│       ├── storage.ts          # LocalStorage settings
│       └── ...
├── public/                     # Static assets
├── src-tauri/                  # Tauri desktop app (Rust)
├── android/                    # Capacitor Android project
├── ios/                        # Capacitor iOS project
├── screenshots/                # App screenshots
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Test configuration
├── capacitor.config.json       # Capacitor configuration
└── package.json
```

---

## Technology Stack

| Technology | Purpose |
| --- | --- |
| React 19 | UI framework |
| TypeScript 5.8 | Type safety |
| Tailwind CSS 4 | Styling |
| Vite 6 | Build tool |
| Motion (Framer Motion) | Animations |
| Lucide React | Icons |
| IndexedDB | Local storage |
| FFmpeg (WASM) | Audio conversion |
| Tauri 2.x | Desktop app (Rust) |
| Capacitor 8.x | Mobile app |

---

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Play/Pause | `Space` |
| Next Track | `Ctrl/Cmd + N` |
| Previous Track | `Ctrl/Cmd + P` |
| Seek Forward 5s | `->` |
| Seek Forward 10s | `Shift + ->` |
| Seek Backward 5s | `<-` |
| Seek Backward 10s | `Shift + <-` |
| Volume Up | `Up` |
| Volume Down | `Down` |
| Toggle Mute | `M` |
| Toggle Shuffle | `S` |
| Toggle Repeat | `R` |
| Toggle Fullscreen | `F` |
| Toggle Queue | `Q` |
| Toggle Lyrics | `L` |
| Show Shortcuts | `?` |

---

## License

Licensed under the [Apache License 2.0](license).

---

## Acknowledgments

- **[Tauri](https://tauri.app/)** - Desktop framework
- **[Capacitor](https://capacitorjs.com/)** - Mobile framework
- **[FFmpeg](https://ffmpeg.org/)** - Audio processing
- All open-source contributors

---

> _Listen the way you want._
