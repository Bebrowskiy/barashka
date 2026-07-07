# Contributing to Barashka Music Player

Thank you for your interest in contributing to Barashka Music Player!

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/Bebrowskiy/barashka.git
   cd barashka
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Setup

### Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

### Running in Development

```bash
npm run dev
# App available at http://localhost:3000
```

### Building

```bash
# Build for web
npm run build

# Type check
npm run lint
```

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## Pull Request Process

1. **Ensure your code passes type checks**:
   ```bash
   npm run lint
   ```

2. **Run the test suite**:
   ```bash
   npm run test
   ```

3. **Test your changes** thoroughly

4. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots (for UI changes)
   - Testing instructions

---

## Project Architecture

```
barashka/
├── src/                        # React + TypeScript application
│   ├── components/             # React UI components
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
│   ├── context/                # React contexts (player state)
│   │   └── PlayerContext.tsx    # Global player state
│   └── lib/                    # Services, API clients, utilities
│       ├── audio-engine.ts     # Playback engine
│       ├── equalizer.ts        # Configurable equalizer (3-32 bands)
│       ├── crossfade.ts        # Crossfade manager
│       ├── music-api.ts        # Unified music API client
│       ├── youtube-api.ts      # YouTube provider (Piped)
│       ├── jamendo-api.ts      # Jamendo provider
│       ├── internet-archive-api.ts
│       ├── deezer-api.ts       # Deezer artist enrichment
│       ├── download-service.ts # Track download + conversion
│       ├── ffmpeg-service.ts   # FFmpeg WebAssembly
│       ├── sleep-timer.ts      # Sleep timer
│       ├── db.ts               # IndexedDB CRUD
│       ├── scrobbler.ts        # Scrobbling router
│       ├── lyrics-api.ts       # LRCLib lyrics
│       ├── genius-api.ts       # Genius annotations
│       └── ...
├── src-tauri/                  # Tauri desktop app (Rust)
├── android/                    # Capacitor Android project
├── ios/                        # Capacitor iOS project
├── public/                     # Static assets
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Test config
└── package.json
```

### Key Directories

- **`src/components/`** — React UI components (MainView, Player, Sidebar, etc.)
- **`src/lib/`** — Core services: audio engine, music API, IndexedDB, scrobblers, etc.
- **`src/context/`** — React context for global player state
- **`src-tauri/`** — Rust backend for desktop app (Discord RPC, system tray)

### Tech Stack

- **React 19** — UI framework
- **TypeScript 5.8** — Type safety
- **Tailwind CSS 4** — Utility-first CSS
- **Vite 6** — Build tool and dev server
- **Motion** — Animations
- **FFmpeg (WASM)** — Audio conversion
- **IndexedDB** — Client-side storage

---

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks
- `test`: Adding or updating tests

### Examples

```bash
feat(player): add crossfade between tracks
fix(search): resolve query parsing issue
docs(readme): update installation instructions
test(equalizer): add band gain tests
```

---

## Bug Reports

```markdown
**Description**
Clear description of the bug

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Environment**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
```

---

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
