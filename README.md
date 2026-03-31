# 🎵 Barashka Music Player

> A modern, minimalist music player for managing your local media library with streaming capabilities through Tidal and Qobuz APIs.
>
> **Based on:** [Monochrome](https://github.com/monochrome-music/monochrome) by [@monochrome-music](https://github.com/monochrome-music)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](license)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.x-green.svg)](https://nodejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.10.1-blue.svg)](https://tauri.app/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.2.0-blue.svg)](https://capacitorjs.com/)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-2ea44f)](https://pages.github.com/)
[![GitHub stars](https://img.shields.io/github/stars/Bebrowskiy/barashka?style=social)](https://github.com/Bebrowskiy/barashka/stargazers)
---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## ✨ Features

### 🎧 Audio Playback

- **Multiple Formats**: MP3, FLAC, WAV, OGG, M4A
- **Hi-Res Audio**: Support for Hi-Res Lossless quality
- **DASH Streaming**: Adaptive bitrate streaming
- **Crossfade**: Smooth transitions between tracks
- **Replay Gain**: Volume normalization
- **Equalizer**: 10-band parametric equalizer
- **Visualizers**: Multiple visualization modes (Butterchurn, Kawarp, Particles)

### 📁 Library Management

- **Local Files**: Scan and organize your local music collection
- **Playlists**: Create, import, and export playlists
- **Import Formats**: CSV, JSPF, XSPF, M3U, VK Music
- **Folders**: Organize playlists into folders
- **Smart Search**: Fast library search with filters

### 🌐 Streaming Integration

- **Tidal API**: Access Tidal's music catalog
- **Qobuz API**: Stream from Qobuz
- **Multiple Instances**: Support for multiple API endpoints
- **Endless Mix**: AI-powered infinite music recommendations

### 🎨 User Interface

- **Minimalist Design**: Clean, modern interface
- **Responsive**: Works on desktop, tablet, and mobile
- **Themes**: 10+ built-in color themes
- **Customization**: Extensive UI customization options
- **Keyboard Shortcuts**: Full keyboard control

### 📊 Scrobbling

- **Last.fm**: Track your listening history
- **ListenBrainz**: Open-source scrobbling
- **Libre.fm**: Independent scrobbling service
- **Maloja**: Self-hosted scrobbling

### 🖥️ Desktop App

- **Cross-Platform**: Windows, macOS, Linux
- **Tauri**: Lightweight Rust-based framework
- **Discord RPC**: Rich Presence integration
- **Native Features**: System tray, notifications, file system access

### 📱 Mobile App

- **Cross-Platform**: Android, iOS
- **Capacitor**: Native mobile framework
- **Touch Optimized**: Mobile-friendly interface
- **Native Features**: Background playback, media controls

### 📱 PWA

- **Offline Support**: Works without internet
- **Installable**: Add to home screen
- **Push Notifications**: Browser notifications
- **Fast Loading**: Optimized performance

### 🎮 Games & Features

- **Guess The Track** — Guess the song by 5-second preview *(coming soon)*
- **TikTok Mode**: Speed + reverb audio effects *(planned)*
- **Year in Music**: Annual listening reports *(planned)*

---

## 📸 Screenshots

> Add your screenshots here

```
📁 screenshots/
├── home.png          # Main page
├── player.png        # Player view
├── library.png       # Library view
├── settings.png      # Settings page
└── desktop.png       # Desktop app
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (or Bun)

### Install

```bash
# Clone the repository
git clone https://github.com/Bebrowskiy/barashka.git
cd barashka

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Production Build

```bash
# Build for web
npm run build:web

# Build desktop app (Tauri)
npm run tauri build

# Sync mobile apps (Capacitor)
npm run cap:sync

# Build Android
npm run cap:android

# Build iOS
npm run cap:ios

# Preview production build
npm run preview
```

---

## 📦 Installation

### Web Deployment

#### GitHub Pages

1. Enable GitHub Pages in repository settings
2. Set source: `Deploy from branch` → `main` → `/dist`
3. Push changes:
   ```bash
   npm run build:web
   git add dist/
   git commit -m "Build for GitHub Pages"
   git push
   ```
4. Access at: `https://username.github.io/repo-name/`

#### Docker

```bash
# Build and run
docker compose up -d

# Access at http://localhost:3000
```

### Desktop App (Tauri)

#### Windows

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/nsis/Barashka_*.exe
```

#### macOS

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/dmg/Barashka_*.dmg
```

#### Linux

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
# - .deb package
# - .AppImage
```

### Mobile App (Capacitor)

#### Android

```bash
# Sync project
npm run cap:sync

# Open in Android Studio
npm run cap:android

# Build APK in Android Studio
```

#### iOS

```bash
# Sync project
npm run cap:sync

# Open in Xcode
npm run cap:ios

# Build in Xcode
```

---

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Application
BARASHKA_PORT=3000
BARASHKA_DEV_PORT=5173

# Authentication (optional)
AUTH_ENABLED=false
AUTH_SECRET=your-secret-key-minimum-32-characters
FIREBASE_PROJECT_ID=your-firebase-project

# PocketBase (optional)
POCKETBASE_URL=https://db.yourdomain.com
```

See [`.env.example`](.env.example) for all available options.

### Firebase Setup (Optional)

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication → Sign-in methods
3. Copy `firebaseConfig` to `.env`:
   ```env
   FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
   ```

### PocketBase Setup (Optional)

1. Download [PocketBase](https://pocketbase.io)
2. Create collections (see `AUTH_GATE.md`)
3. Set `POCKETBASE_URL` in `.env`

---

## 💻 Usage

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Play/Pause | `Space` |
| Next Track | `Shift + →` |
| Previous Track | `Shift + ←` |
| Volume Up | `↑` |
| Volume Down | `↓` |
| Search | `/` |
| Toggle Lyrics | `L` |
| Toggle Queue | `Q` |

See full list in [Settings → Keyboard Shortcuts](#).

### Import from VK Music

1. Copy parser script from Settings → Import → VK Music
2. Open VK playlist
3. Paste script in browser console (F12)
4. Click "Export to Barashka" button
5. Import downloaded file in Barashka

### Crossfade

1. Go to Settings → Audio → Crossfade
2. Enable Crossfade
3. Adjust duration (1-30 seconds)
4. Select fade curve (Logarithmic recommended)

---

## 🛠 Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **JavaScript ES6+** | Core logic |
| **HTML5** | Structure |
| **CSS3** | Styling with custom properties |
| **IndexedDB** | Local storage |
| **Web Audio API** | Audio processing |

### Build Tools

| Tool | Purpose |
|------|---------|
| **Vite** | Fast bundler |
| **vite-plugin-pwa** | PWA support |
| **Tauri CLI** | Desktop app builder |
| **Capacitor CLI** | Mobile app sync |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Stylelint** | CSS linting |

### Desktop (Tauri)

| Library | Purpose |
|---------|---------|
| **@tauri-apps/api** | JavaScript API for Tauri |
| **@tauri-apps/cli** | Tauri build tools (2.10.1) |
| **discord-rich-presence** | Discord Rich Presence (Rust) |
| **tauri-plugin-log** | Logging system |

### Mobile (Capacitor)

| Library | Purpose |
|---------|---------|
| **@capacitor/core** | Capacitor core |
| **@capacitor/android** | Android platform |
| **@capacitor/ios** | iOS platform |

### Libraries

| Library | Purpose |
|---------|---------|
| **dashjs** | DASH streaming |
| **@ffmpeg/ffmpeg** | Audio conversion |
| **butterchurn** | Winamp visualizer |
| **@kawarp/core** | Caustic visualizer |
| **firebase** | Authentication |
| **pocketbase** | Database sync |
| **appwrite** | Alternative backend |

---

## 📁 Project Structure

```
barashka/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies & scripts
│   ├── vite.config.js            # Vite configuration
│   ├── capacitor.config.json     # Mobile config
│   ├── .env.example              # Environment template
│   ├── .gitignore                # Git ignore rules
│   └── eslint.config.js          # ESLint rules
│
├── 🦀 Tauri Desktop App
│   ├── src-tauri/
│   │   ├── src/
│   │   │   └── lib.rs            # Rust backend (Discord RPC)
│   │   ├── icons/                # App icons
│   │   ├── capabilities/         # Tauri permissions
│   │   ├── tauri.conf.json       # Tauri configuration
│   │   ├── Cargo.toml            # Rust dependencies
│   │   └── Cargo.lock            # Rust lock file
│
├── 📱 Capacitor Mobile App
│   ├── android/                  # Android project
│   │   ├── app/
│   │   ├── build.gradle
│   │   └── gradlew
│   └── ios/                      # iOS project
│       ├── App/
│       └── CapApp-SPM/
│
├── 📚 Documentation
│   ├── README.md                 # This file
│   ├── CONTRIBUTING.md           # Contribution guide
│   ├── LICENSE                   # Apache 2.0 license
│   ├── AUTH_GATE.md              # Authentication setup
│   ├── DESIGN.md                 # Design system
│   ├── INSTANCES.md              # API instances list
│   ├── THEME_GUIDE.md            # Theme creation
│   ├── TAURI_GUIDE.md            # Tauri desktop guide
│   └── DEPLOYMENT.md             # Deployment guide
│
├── 📂 Source Code
│   ├── index.html                # Main HTML (entry point)
│   ├── styles.css                # Global styles
│   ├── js/                       # JavaScript modules
│   │   ├── app.js                # Application entry
│   │   ├── player.js             # Audio player
│   │   ├── ui.js                 # UI rendering
│   │   ├── api.js                # Tidal API client
│   │   ├── discord-rpc.js        # Discord Rich Presence (Tauri)
│   │   ├── guess-the-track.js    # Guess the track game
│   │   ├── tiktok-mode.js        # TikTok audio effects
│   │   ├── crossfade.js          # Crossfade manager
│   │   ├── vk-importer.js        # VK import
│   │   └── ...                   # Other modules
│   │
├── 🌐 Public Assets
│   ├── public/                   # Static files
│   │   ├── assets/               # Images, icons
│   │   ├── fonts/                # Custom fonts
│   │   └── manifest.json         # PWA manifest
│   │
├── ⚡ Cloudflare Workers
│   └── functions/                # Serverless functions
│
└── 📦 Build Output
    └── dist/                     # Production build
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/barashka.git
cd barashka

# Create branch
git checkout -b feature/your-feature

# Make changes, then:
npm run lint
npm run format
npm run build:check

# Commit and push
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## 🙏 Acknowledgments

- **[Monochrome](https://github.com/monochrome-music/monochrome)** - Original project and inspiration
- **[Tauri](https://tauri.app/)** - Desktop framework (Rust-based)
- **[Capacitor](https://capacitorjs.com/)** - Mobile framework
- **[Tidal](https://tidal.com/)** - Music streaming service
- **[Qobuz](https://www.qobuz.com/)** - Hi-Res music streaming
- All open-source contributors 🙌

---

---

> 🎶 *Music is the language of the soul. Let your player sound perfect.*

---
