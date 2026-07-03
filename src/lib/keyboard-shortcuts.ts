import { useEffect } from 'react';
import { audioEngine } from './audio-engine';

interface ShortcutHandlers {
    togglePlay: () => void;
    playNext: () => void;
    playPrev: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    setVolume: (v: number) => void;
    seekRelative: (seconds: number) => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
    toggleQueue: () => void;
    toggleLyrics: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const { key, ctrlKey, metaKey, shiftKey } = e;
            const mod = ctrlKey || metaKey;

            switch (key) {
                case ' ':
                    e.preventDefault();
                    handlers.togglePlay();
                    break;

                case 'ArrowRight':
                    if (mod) {
                        e.preventDefault();
                        handlers.playNext();
                    } else if (shiftKey) {
                        e.preventDefault();
                        handlers.seekRelative(10);
                    } else {
                        e.preventDefault();
                        handlers.seekRelative(5);
                    }
                    break;

                case 'ArrowLeft':
                    if (mod) {
                        e.preventDefault();
                        handlers.playPrev();
                    } else if (shiftKey) {
                        e.preventDefault();
                        handlers.seekRelative(-10);
                    } else {
                        e.preventDefault();
                        handlers.seekRelative(-5);
                    }
                    break;

                case 'ArrowUp':
                    if (!mod) {
                        e.preventDefault();
                        const current = audioEngine.getState().volume;
                        handlers.setVolume(Math.min(1, current + 0.05));
                    }
                    break;

                case 'ArrowDown':
                    if (!mod) {
                        e.preventDefault();
                        const current = audioEngine.getState().volume;
                        handlers.setVolume(Math.max(0, current - 0.05));
                    }
                    break;

                case 'm':
                case 'M':
                    e.preventDefault();
                    handlers.toggleMute();
                    break;

                case 's':
                case 'S':
                    if (!mod) {
                        e.preventDefault();
                        handlers.toggleShuffle();
                    }
                    break;

                case 'r':
                case 'R':
                    if (!mod) {
                        e.preventDefault();
                        handlers.toggleRepeat();
                    }
                    break;

                case 'f':
                case 'F':
                    if (!mod) {
                        e.preventDefault();
                        handlers.toggleFullscreen();
                    }
                    break;

                case 'q':
                case 'Q':
                    if (!mod) {
                        e.preventDefault();
                        handlers.toggleQueue();
                    }
                    break;

                case 'l':
                case 'L':
                    if (!mod) {
                        e.preventDefault();
                        handlers.toggleLyrics();
                    }
                    break;

                case 'n':
                case 'N':
                    if (mod) {
                        e.preventDefault();
                        handlers.playNext();
                    }
                    break;

                case 'p':
                case 'P':
                    if (mod) {
                        e.preventDefault();
                        handlers.playPrev();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
}
