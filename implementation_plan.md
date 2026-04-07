# Implementation Plan: Guess The Track (TikTok Style)

## Goal
Replace the "Unreleased" section of the app with an interactive, beautifully designed "Guess the Track" minigame. The requested style mimics a popular TikTok format: a full-screen vertical split presenting two choices after playing a 5-second audio snippet.

## Proposed Changes

### 1. Navigation & Routing ([js/router.js](file:///c:/Users/User/Documents/barashka/js/router.js), [js/ui.js](file:///c:/Users/User/Documents/barashka/js/ui.js), `js/i18n.js`)
- **Renaming**: Transition the "Unreleased" sidebar and navigation sections to "Guess the Track".
- **Translations ([i18n.js](file:///c:/Users/User/Documents/barashka/public/js/i18n.js))**: Update locale keys so the UI says "Угадай трек" internally and in Russian locales.
- **Routing ([js/router.js](file:///c:/Users/User/Documents/barashka/js/router.js))**: Update the `/unreleased` path to `/guess-the-track`.

### 2. Visual Layout & Animations ([styles.css](file:///c:/Users/User/Documents/barashka/styles.css) & `js/guess-track.js`)
- **Split-Screen Design**: Generate a dynamic 50/50 split layout (`left` vs `right`) mimicking the provided mockup.
- **Visuals**: 
  - Each half will feature the album cover.
  - Bottom alignment for the "Track Title" and "Artist Name".
  - Premium animations for hover states.
  - Dynamic overlay when guessed: Bright *Green* with "Верно" or *Red* with "Неверно".
- **Header Structure**: A minimal top bar displaying "раунд X" (Round X) and a smoothly reducing progress bar representing the countdown timer.

### 3. Game Logic (`js/guess-track.js`)
- **Track Selection**: Pull from the user's `history_tracks` via [db.js](file:///c:/Users/User/Documents/barashka/js/db.js).
- **Matchmaking Engine**: For each round, pick 1 correct track and 1 distract track.
- **Audio Engine Hook**: Play the audio starting from an offset (e.g. 30 seconds into the track) for exactly 5 seconds.
- **Interactivity**: Allow the user to tap either the right or left half of the screen. Freeze the timer, reveal the correct color state, and proceed to the next round automatically after 2.5 seconds.

## Verification Plan
1. Ensure the web application runs without breaking the bundler tools.
2. Confirm the game logic fetches the tracks safely and processes the audio precisely using standard DOM API controls.
3. Validate that the UI accurately mimics the TikTok style splitting logic.
