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

---

## Pull Request Process

1. **Ensure your code passes type checks**:
   ```bash
   npm run lint
   ```

2. **Test your changes** thoroughly

3. **Create a Pull Request** with:
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
│   ├── context/                # React contexts (player state)
│   └── lib/                    # Services, API clients, utilities
├── src-tauri/                  # Tauri desktop app (Rust)
├── android/                    # Capacitor Android project
├── ios/                        # Capacitor iOS project
├── public/                     # Static assets
├── vite.config.ts              # Vite build config
└── tsconfig.json               # TypeScript config
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

### Examples

```bash
feat(player): add crossfade between tracks
fix(search): resolve query parsing issue
docs(readme): update installation instructions
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
