import { useEffect, useRef } from 'react';
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
    showShortcuts: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const h = handlersRef.current;
            const { key, ctrlKey, metaKey, shiftKey } = e;
            const mod = ctrlKey || metaKey;

            switch (key) {
                case ' ':
                    e.preventDefault();
                    h.togglePlay();
                    break;

                case 'ArrowRight':
                    if (mod) {
                        e.preventDefault();
                        h.playNext();
                    } else if (shiftKey) {
                        e.preventDefault();
                        h.seekRelative(10);
                    } else {
                        e.preventDefault();
                        h.seekRelative(5);
                    }
                    break;

                case 'ArrowLeft':
                    if (mod) {
                        e.preventDefault();
                        h.playPrev();
                    } else if (shiftKey) {
                        e.preventDefault();
                        h.seekRelative(-10);
                    } else {
                        e.preventDefault();
                        h.seekRelative(-5);
                    }
                    break;

                case 'ArrowUp':
                    if (!mod) {
                        e.preventDefault();
                        const current = audioEngine.getState().volume;
                        h.setVolume(Math.min(1, current + 0.05));
                    }
                    break;

                case 'ArrowDown':
                    if (!mod) {
                        e.preventDefault();
                        const current = audioEngine.getState().volume;
                        h.setVolume(Math.max(0, current - 0.05));
                    }
                    break;

                case 'm':
                case 'M':
                    e.preventDefault();
                    h.toggleMute();
                    break;

                case 's':
                case 'S':
                    if (!mod) {
                        e.preventDefault();
                        h.toggleShuffle();
                    }
                    break;

                case 'r':
                case 'R':
                    if (!mod) {
                        e.preventDefault();
                        h.toggleRepeat();
                    }
                    break;

                case 'f':
                case 'F':
                    if (!mod) {
                        e.preventDefault();
                        h.toggleFullscreen();
                    }
                    break;

                case 'q':
                case 'Q':
                    if (!mod) {
                        e.preventDefault();
                        h.toggleQueue();
                    }
                    break;

                case 'l':
                case 'L':
                    if (!mod) {
                        e.preventDefault();
                        h.toggleLyrics();
                    }
                    break;

                case 'n':
                case 'N':
                    if (mod) {
                        e.preventDefault();
                        h.playNext();
                    }
                    break;

                case 'p':
                case 'P':
                    if (mod) {
                        e.preventDefault();
                        h.playPrev();
                    }
                    break;

                case '?':
                    if (shiftKey) {
                        e.preventDefault();
                        h.showShortcuts();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}
