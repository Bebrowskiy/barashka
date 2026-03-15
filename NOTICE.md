# Notices

## Original Project

**Barashka Music Player** is based on the **Monochrome** project:

- **Repository**: https://github.com/monochrome-music/monochrome
- **License**: Apache License 2.0
- **Copyright**: Original Monochrome Contributors

Barashka extends the original Monochrome codebase with significant modifications and additional features.

---

## Modifications Made

The following major modifications have been made to the original Monochrome project:

### Core Features Added

1. **Crossfade System** (`js/crossfade.js`)
   - Smooth audio transitions between tracks
   - Configurable fade duration and curves
   - Web Audio API integration

2. **VK Music Import** (`js/vk-importer.js`)
   - Import playlists from VKontakte
   - Parser script for VK playlists
   - CSV/TXT export functionality

3. **Endless Mix 2.0**
   - Enhanced infinite music recommendations
   - AI-powered track suggestions
   - Aurora banner UI

4. **Enhanced Import Services**
   - Beautiful service-specific buttons (Spotify, Apple Music, YouTube Music, Yandex, VK)
   - Improved import UI with firm colors
   - Better error handling

5. **Security Hardening**
   - Removed hardcoded API tokens
   - Environment variable configuration
   - Comprehensive .gitignore
   - Security policy documentation

### Documentation Added

- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy and vulnerability reporting
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `GITHUB_PUBLICATION_CHECKLIST.md` - Publication checklist
- `ROADMAP.md` - Development roadmap with unique features
- Enhanced `README.md` with full documentation

### Infrastructure Added

- GitHub Actions CI/CD pipeline (`.github/workflows/ci-cd.yml`)
- Docker support with Dockerfile and docker-compose
- Comprehensive .env.example with documentation
- Build verification scripts

### UI/UX Improvements

- Redesigned import service buttons with brand colors
- Crossfade settings UI
- VK import panel with instructions
- Responsive grid layouts
- Enhanced visual feedback

---

## License

This project is licensed under the **Apache License 2.0**, the same as the original Monochrome project.

```
Copyright 2026 Bebrowskiy

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Attribution

If you use Barashka Music Player in your project, please provide attribution by:

1. Linking to the original Monochrome project: https://github.com/monochrome-music/monochrome
2. Linking to Barashka: https://github.com/Bebrowskiy/barashka
3. Including a copy of the Apache License 2.0

---

## Trademark Notice

"Barashka" and the Barashka logo are trademarks of the Barashka project contributors.

"Monochrome" is a trademark of the original Monochrome project contributors.

All other trademarks mentioned are the property of their respective owners.

---

**Last Updated**: March 2026
