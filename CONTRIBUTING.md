# Contributing to Barashka Music Player

Thank you for your interest in contributing to Barashka Music Player! This document provides guidelines and instructions for contributing.

> **Note**: This project is based on [Monochrome](https://github.com/monochrome-music/monochrome) by [@monochrome-music](https://github.com/monochrome-music). We respect and acknowledge the original work.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Keep discussions professional and on-topic

---

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/barashka.git
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

### Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure required variables:
   - `BARASHKA_PORT` - Development server port
   - `AUTH_ENABLED` - Set to `false` for local development
   - `AUTH_SECRET` - Random string for sessions (if auth enabled)

### Running in Development

```bash
# Start development server
npm run dev

# Start desktop app in development (requires Tauri)
npm run tauri dev
```

### Building

```bash
# Build for web
npm run build:web

# Build desktop app (Tauri)
npm run tauri build

# Sync mobile apps (Capacitor)
npm run cap:sync

# Check code quality before building
npm run build:check
```

---

## Pull Request Process

1. **Ensure your code passes all checks**:
   ```bash
   npm run lint
   npm run format
   npm run build:web
   ```

2. **Update documentation** if you change functionality

3. **Test your changes** thoroughly

4. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots (for UI changes)
   - Testing instructions

5. **Wait for review** - maintainers will review and provide feedback

---

## Coding Standards

### JavaScript

- Use ES6+ features
- Use `const` and `let` (no `var`)
- Use arrow functions where appropriate
- Add semicolons
- Use single quotes for strings
- Indent with 4 spaces
- Maximum line length: 120 characters

Example:
```javascript
// Good
const calculateTotal = (items) => {
    return items.reduce((total, item) => total + item.price, 0);
};

// Bad
var calculateTotal = function(items) {
    return items.reduce(function(total, item) {
        return total + item.price;
    }, 0);
};
```

### CSS

- Use CSS custom properties (variables)
- Follow BEM naming convention for complex components
- Use lowercase with hyphens for class names
- Order properties logically

Example:
```css
/* Good */
.playlist-card {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--card);
    border-radius: var(--radius-md);
}

.playlist-card__title {
    font-size: var(--text-lg);
    font-weight: 600;
}

/* Bad */
.playlistCard {
    display: flex;
    background: #1a1a1a;
}
```

### HTML

- Use semantic HTML elements
- Include proper ARIA attributes for accessibility
- Use lowercase for tags and attributes
- Close all tags

Example:
```html
<!-- Good -->
<article class="track-card" aria-label="Track: Song Title">
    <img src="cover.jpg" alt="Album cover for Album Name" />
    <h3 class="track-card__title">Song Title</h3>
    <p class="track-card__artist">Artist Name</p>
</article>

<!-- Bad -->
<div class="track">
    <img src="cover.jpg">
    <div>Song Title</div>
    <div>Artist Name</div>
</div>
```

### Comments

- Write comments in **English**
- Explain **why**, not **what**
- Use JSDoc for functions and classes

Example:
```javascript
/**
 * Fetches recommended tracks based on seed tracks.
 * Implements caching to reduce API calls.
 * 
 * @param {Array} seedTracks - Array of track objects to base recommendations on
 * @param {number} limit - Maximum number of tracks to return
 * @param {Object} options - Additional options
 * @param {boolean} options.skipCache - Skip cache and fetch fresh data
 * @returns {Promise<Array>} Array of recommended tracks
 */
async getRecommendedTracksForPlaylist(seedTracks, limit = 20, options = {}) {
    // Implementation...
}
```

---

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(crossfade): add smooth transitions between tracks

# Bug fix
fix(player): resolve issue with queue not updating

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(api): simplify error handling logic

# Performance
perf(cache): improve cache hit rate for API calls
```

---

## Bug Reports

### Before Submitting

1. Check existing issues
2. Try to reproduce on latest version
3. Gather information (browser, OS, steps to reproduce)

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.0.0]

**Additional Context**
Any other relevant information
```

---

## Feature Requests

### Before Submitting

1. Check existing feature requests
2. Ensure the feature aligns with project goals
3. Consider if this is something you could contribute

### Feature Request Template

```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other solutions you've thought about

**Additional Context**
Mockups, examples, or references
```

---

## Architecture Overview

```
barashka/
├── js/              # Main application logic (48 modules)
│   ├── app.js       # Application entry point
│   ├── player.js    # Audio player core
│   ├── ui.js        # UI rendering
│   ├── api.js       # API client
│   ├── music-api.js # Music API abstraction
│   ├── db.js        # Database layer (IndexedDB)
│   ├── storage.js   # Settings & storage
│   ├── crossfade.js # Crossfade functionality
│   ├── vk-importer.js # VK Music import
│   ├── guess-the-track.js # Game module (coming soon)
│   └── ...
├── src-tauri/       # Tauri desktop app (Rust)
│   ├── src/lib.rs   # Rust backend (Discord RPC)
│   └── tauri.conf.json
├── android/         # Capacitor Android project
├── ios/             # Capacitor iOS project
├── public/          # Static assets
├── functions/       # Cloudflare Workers
├── index.html       # Main HTML file
├── styles.css       # Global styles
└── vite.config.js   # Build configuration
```

---

## Questions?

- Open an issue for questions
- Check existing documentation
- Join our Discord community

---

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
