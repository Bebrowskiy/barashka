import { type Track, REPEAT_MODE, type RepeatMode, type QualityPreset } from '../types';
import { musicAPI } from './music-api';
import { replayGainSettings, audioEffectsSettings, crossfadeSettings, audioEnhancementsSettings } from './storage';
import { equalizer } from './equalizer';
import { CrossfadeManager } from './crossfade';

export interface PlayerState {
    currentTrack: Track | null;
    queue: Track[];
    shuffledQueue: Track[];
    originalQueueBeforeShuffle: Track[];
    currentQueueIndex: number;
    isPlaying: boolean;
    shuffleActive: boolean;
    repeatMode: RepeatMode;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    quality: QualityPreset;
    playbackSpeed: number;
    preservePitch: boolean;
}

type PlayerListener = (state: PlayerState) => void;
type TrackEndListener = (track: Track) => void;

class AudioEngine {
    private audio: HTMLAudioElement;
    private state: PlayerState;
    private listeners: Set<PlayerListener> = new Set();
    private trackEndListeners: Set<TrackEndListener> = new Set();
    private preloadCache: Map<string, string> = new Map();
    private _quality: QualityPreset = 'HI_RES_LOSSLESS' as QualityPreset;
    private savedVolumeBeforeMute: number = 0.7;
    private crossfade: CrossfadeManager;

    constructor() {
        this.audio = document.getElementById('audio-player') as HTMLAudioElement || this.createAudioElement();
        this.crossfade = new CrossfadeManager(this.audio);
        const storedVolume = parseFloat(localStorage.getItem('barashka-volume') || '0.7');
        const storedQuality = (localStorage.getItem('barashka-quality') as QualityPreset) || 'HI_RES_LOSSLESS';
        const fx = audioEffectsSettings.get();

        this.state = {
            currentTrack: null,
            queue: [],
            shuffledQueue: [],
            originalQueueBeforeShuffle: [],
            currentQueueIndex: -1,
            isPlaying: false,
            shuffleActive: false,
            repeatMode: REPEAT_MODE.OFF,
            currentTime: 0,
            duration: 0,
            volume: storedVolume,
            isMuted: storedVolume === 0,
            quality: storedQuality,
            playbackSpeed: fx.speed,
            preservePitch: fx.preservePitch,
        };

        this.audio.volume = storedVolume;
        this.audio.playbackRate = fx.speed;
        this.audio.preservesPitch = fx.preservePitch;
        this._quality = storedQuality;
        this.savedVolumeBeforeMute = storedVolume > 0 ? storedVolume : 0.7;
        this.setupAudioEvents();
        this.setupMediaSession();
        this.loadQueueState();

        // Initialize equalizer
        try {
            equalizer.init(this.audio);
        } catch {
            // Web Audio API might not be available
        }
    }

    private createAudioElement(): HTMLAudioElement {
        const audio = document.createElement('audio');
        audio.id = 'audio-player';
        document.body.prepend(audio);
        return audio;
    }

    private setupAudioEvents(): void {
        this.audio.addEventListener('play', () => {
            this.updateState({ isPlaying: true });
            this.updateMediaSessionPlaybackState();
        });

        this.audio.addEventListener('pause', () => {
            this.updateState({ isPlaying: false });
            this.updateMediaSessionPlaybackState();
        });

        this.audio.addEventListener('ended', () => {
            if (this.state.currentTrack) {
                this.notifyTrackEnd(this.state.currentTrack);
            }
            const settings = crossfadeSettings.get();
            if (settings.enabled && settings.autoCrossfade) {
                const timeRemaining = this.audio.duration - this.audio.currentTime;
                if (this.crossfade.canCrossfade(timeRemaining)) {
                    this.crossfadePlayNext();
                    return;
                }
            }
            this.playNext();
        });

        this.audio.addEventListener('loadedmetadata', () => {
            this.updateState({ duration: this.audio.duration });
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.playNext();
        });

        this.audio.addEventListener('timeupdate', () => {
            this.updateState({
                currentTime: this.audio.currentTime,
                duration: this.audio.duration,
            });

            const settings = crossfadeSettings.get();
            if (settings.enabled && settings.autoCrossfade && !this.crossfade.isActive) {
                const remaining = this.audio.duration - this.audio.currentTime;
                if (remaining <= (settings.duration / 1000) + 0.5 && remaining > 0) {
                    const currentQueue = this.getCurrentQueue();
                    const nextIdx = this.state.currentQueueIndex + 1;
                    if (nextIdx < currentQueue.length || this.state.repeatMode === REPEAT_MODE.ALL) {
                        this.crossfadePlayNext();
                    }
                }
            }
        });

        this.audio.addEventListener('volumechange', () => {
            // Sync volume from browser (e.g., system volume changes)
        });
    }

    private setupMediaSession(): void {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.setActionHandler('play', async () => {
            await this.safePlay();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            this.audio.pause();
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            this.playPrev();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            this.playNext();
        });

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const skipTime = details.seekOffset || 10;
            this.seekTo(Math.max(0, this.audio.currentTime - skipTime));
        });

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const skipTime = details.seekOffset || 10;
            this.seekTo(Math.min(this.audio.duration, this.audio.currentTime + skipTime));
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) {
                this.seekTo(details.seekTime);
            }
        });
    }

    private updateMediaSessionPlaybackState(): void {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = this.audio.paused ? 'paused' : 'playing';
    }

    private updateMediaSessionPositionState(): void {
        if (!('mediaSession' in navigator)) return;
        if (!('setPositionState' in navigator.mediaSession)) return;
        const duration = this.audio.duration;
        if (!duration || isNaN(duration) || !isFinite(duration)) return;
        try {
            navigator.mediaSession.setPositionState({
                duration,
                playbackRate: this.audio.playbackRate || 1,
                position: Math.min(this.audio.currentTime, duration),
            });
        } catch {
            // Ignore
        }
    }

    private updateMediaSession(track: Track): void {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Unknown Title',
            artist: track.artist || track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
            album: track.album?.title || 'Unknown Album',
            artwork: track.cover ? [{
                src: typeof track.cover === 'string' ? track.cover : String(track.cover),
                sizes: '512x512',
                type: 'image/jpeg',
            }] : undefined,
        });
    }

    private updateState(partial: Partial<PlayerState>): void {
        this.state = { ...this.state, ...partial };
        this.listeners.forEach(listener => listener(this.state));
    }

    subscribe(listener: PlayerListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    subscribeTrackEnd(listener: TrackEndListener): () => void {
        this.trackEndListeners.add(listener);
        return () => this.trackEndListeners.delete(listener);
    }

    private notifyTrackEnd(track: Track): void {
        this.trackEndListeners.forEach(l => l(track));
    }

    getState(): PlayerState {
        return { ...this.state };
    }

    getAudioElement(): HTMLAudioElement {
        return this.audio;
    }

    // === Settings ===

    setQuality(quality: QualityPreset): void {
        this._quality = quality;
        this.state.quality = quality;
        localStorage.setItem('barashka-quality', quality);
        this.updateState({ quality });
    }

    toggleMute(): void {
        if (this.state.isMuted || this.audio.volume === 0) {
            this.setVolume(this.savedVolumeBeforeMute || 0.7);
        } else {
            this.savedVolumeBeforeMute = this.state.volume || 0.7;
            this.audio.volume = 0;
            this.updateState({ isMuted: true, volume: 0 });
        }
    }

    applyAudioEffects(): void {
        const fx = audioEffectsSettings.get();
        this.audio.playbackRate = fx.speed;
        this.audio.preservesPitch = fx.preservePitch;
        this.state.playbackSpeed = fx.speed;
        this.state.preservePitch = fx.preservePitch;
        this.updateState({ playbackSpeed: fx.speed, preservePitch: fx.preservePitch });
    }

    applyReplayGain(): void {
        const rg = replayGainSettings.get();
        if (rg.mode === 'off') {
            this.audio.volume = this.state.volume;
            return;
        }
        const preampScale = Math.pow(10, rg.preamp / 20);
        const effectiveVolume = Math.max(0, Math.min(1, this.state.volume * preampScale));
        this.audio.volume = effectiveVolume;
    }

    setVolume(value: number): void {
        const enhancements = audioEnhancementsSettings.get();
        let clamped = Math.max(0, Math.min(1, value));

        if (enhancements.exponentialVolume) {
            clamped = Math.pow(clamped, 3);
        }

        this.state.volume = value;
        this.state.isMuted = value === 0;
        this.audio.volume = clamped;
        localStorage.setItem('barashka-volume', String(value));
        if (value > 0) this.savedVolumeBeforeMute = value;
        this.updateState({ volume: value, isMuted: value === 0 });
    }

    // === Seeking ===

    async seekTo(time: number): Promise<void> {
        this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
        this.updateState({ currentTime: this.audio.currentTime });
        this.updateMediaSessionPositionState();
    }

    seekForward(seconds: number = 10): void {
        this.seekTo(this.audio.currentTime + seconds);
    }

    seekBackward(seconds: number = 10): void {
        this.seekTo(this.audio.currentTime - seconds);
    }

    // === Playback ===

    async playTrack(track: Track, queue?: Track[], startIndex?: number): Promise<void> {
        if (queue) {
            this.state.queue = [...queue];
            this.state.originalQueueBeforeShuffle = [...queue];
            if (this.state.shuffleActive) {
                this.state.shuffledQueue = this.shuffleArray([...queue]);
                const currentIdx = queue.findIndex(t => t.id === track.id);
                if (currentIdx >= 0) {
                    this.state.shuffledQueue = this.shuffleArray(queue.filter(t => t.id !== track.id));
                    this.state.shuffledQueue.unshift(track);
                }
            }
            this.state.currentQueueIndex = startIndex ?? queue.findIndex(t => t.id === track.id);
        } else {
            const idx = this.getCurrentQueue().findIndex(t => t.id === track.id);
            if (idx >= 0) {
                this.state.currentQueueIndex = idx;
            }
        }

        this.state.currentTrack = track;
        this.updateState({});

        try {
            await this.loadAndPlayTrack(track);
        } catch (error) {
            console.error('Failed to play track:', error);
            this.playNext();
        }
    }

    private async loadAndPlayTrack(track: Track): Promise<void> {
        let streamUrl = track.audioUrl || track.remoteUrl;

        if (!streamUrl) {
            const isProviderTrack = String(track.id).startsWith('q:') || String(track.id).startsWith('y:') || String(track.id).startsWith('t:') || String(track.id).startsWith('j:') || String(track.id).startsWith('ia:');
            if (isProviderTrack) {
                if (this.preloadCache.has(track.id)) {
                    streamUrl = this.preloadCache.get(track.id)!;
                } else {
                    streamUrl = await musicAPI.getStreamUrl(track.id, this.state.quality);
                    if (streamUrl) {
                        this.preloadCache.set(track.id, streamUrl);
                    }
                }
            } else {
                throw new Error('No stream URL for track');
            }
        }

        if (!streamUrl) {
            throw new Error('No stream URL available');
        }

        // MediaElementAudioSourceNode (used by equalizer) requires CORS for all external sources
        this.audio.crossOrigin = 'anonymous';

        this.audio.src = streamUrl;
        this.audio.preload = 'auto';

        this.applyAudioEffects();
        this.applyReplayGain();

        this.updateMediaSession(track);
        this.updateState({ currentTime: 0, duration: 0 });

        await this.safePlay();
        this.preloadNextTracks();
        this.saveQueueState();
    }

    private async fallbackToYouTube(track: Track): Promise<string> {
        const artist = track.artist || track.artists?.map(a => a.name).join(', ') || '';
        const title = track.title || '';
        const query = artist ? `${title} ${artist}` : title;

        const searchResult = await musicAPI.searchTracks(query, { limit: 5 });
        const match = searchResult.items.find(t => {
            const tTitle = (t.title || '').toLowerCase();
            const _tArtist = (t.artist || '').toLowerCase();
            return tTitle.includes(title.toLowerCase().slice(0, 10)) ||
                   title.toLowerCase().includes(tTitle.slice(0, 10));
        }) || searchResult.items[0];

        if (!match) {
            throw new Error('Track not found on any provider');
        }

        return await musicAPI.getStreamUrl(match.id, this.state.quality);
    }

    private async safePlay(): Promise<void> {
        try {
            equalizer.resumeContext();
            await this.audio.play();
        } catch (error: any) {
            if (error.name === 'NotAllowedError') {
                console.warn('Autoplay blocked, waiting for user interaction');
            } else {
                throw error;
            }
        }
    }

    private getCurrentQueue(): Track[] {
        return this.state.shuffleActive ? this.state.shuffledQueue : this.state.queue;
    }

    async playNext(): Promise<void> {
        const currentQueue = this.getCurrentQueue();
        const isLastTrack = this.state.currentQueueIndex >= currentQueue.length - 1;

        if (this.state.repeatMode === REPEAT_MODE.ONE && this.state.currentTrack) {
            await this.loadAndPlayTrack(this.state.currentTrack);
            return;
        }

        if (isLastTrack && this.state.repeatMode === REPEAT_MODE.ALL) {
            this.state.currentQueueIndex = 0;
        } else if (!isLastTrack) {
            this.state.currentQueueIndex++;
        } else {
            return;
        }

        const nextTrack = currentQueue[this.state.currentQueueIndex];
        if (nextTrack) {
            this.state.currentTrack = nextTrack;
            this.updateState({});
            try {
                await this.loadAndPlayTrack(nextTrack);
            } catch (error) {
                console.error('Failed to play next track:', error);
            }
        }
    }

    private async crossfadePlayNext(): Promise<void> {
        const currentQueue = this.getCurrentQueue();
        const isLastTrack = this.state.currentQueueIndex >= currentQueue.length - 1;

        if (this.state.repeatMode === REPEAT_MODE.ONE && this.state.currentTrack) {
            await this.loadAndPlayTrack(this.state.currentTrack);
            return;
        }

        if (isLastTrack && this.state.repeatMode === REPEAT_MODE.ALL) {
            this.state.currentQueueIndex = 0;
        } else if (!isLastTrack) {
            this.state.currentQueueIndex++;
        } else {
            return;
        }

        const nextTrack = currentQueue[this.state.currentQueueIndex];
        if (!nextTrack) return;

        this.state.currentTrack = nextTrack;
        this.updateState({});

        try {
            let streamUrl = nextTrack.audioUrl || nextTrack.remoteUrl;
            if (!streamUrl) {
                const isProviderTrack = String(nextTrack.id).startsWith('q:') || String(nextTrack.id).startsWith('y:') || String(nextTrack.id).startsWith('t:') || String(nextTrack.id).startsWith('j:') || String(nextTrack.id).startsWith('a:');
                if (isProviderTrack) {
                    if (this.preloadCache.has(nextTrack.id)) {
                        streamUrl = this.preloadCache.get(nextTrack.id)!;
                    } else {
                        streamUrl = await musicAPI.getStreamUrl(nextTrack.id, this.state.quality);
                        this.preloadCache.set(nextTrack.id, streamUrl);
                    }
                } else {
                    await this.loadAndPlayTrack(nextTrack);
                    return;
                }
            }

            const nextAudio = document.createElement('audio');
            nextAudio.crossOrigin = 'anonymous';
            nextAudio.src = streamUrl;
            nextAudio.preload = 'auto';
            nextAudio.volume = 0;

            this.applyAudioEffectsToElement(nextAudio);

            await this.crossfade.crossfadeTo(nextAudio);
            this.crossfade.setAudioElement(this.audio);
            equalizer.init(this.audio);
            this.updateMediaSession(nextTrack);
            this.updateMediaSessionPlaybackState();
            this.preloadNextTracks();
            this.saveQueueState();
        } catch (error) {
            console.error('Crossfade failed, falling back to normal play:', error);
            await this.loadAndPlayTrack(nextTrack);
        }
    }

    private applyAudioEffectsToElement(audio: HTMLAudioElement): void {
        const fx = audioEffectsSettings.get();
        audio.playbackRate = fx.speed;
        audio.preservesPitch = fx.preservePitch;
    }

    playPrev(): void {
        // If more than 3s into track, restart it
        if (this.audio.currentTime > 3) {
            this.seekTo(0);
            return;
        }

        if (this.state.currentQueueIndex > 0) {
            this.state.currentQueueIndex--;
            const prevTrack = this.getCurrentQueue()[this.state.currentQueueIndex];
            if (prevTrack) {
                this.state.currentTrack = prevTrack;
                this.updateState({});
                this.loadAndPlayTrack(prevTrack).catch(console.error);
            }
        } else {
            // At beginning of queue, restart current track
            this.seekTo(0);
        }
    }

    playAtIndex(index: number): void {
        const queue = this.getCurrentQueue();
        if (index >= 0 && index < queue.length) {
            this.state.currentQueueIndex = index;
            this.state.currentTrack = queue[index];
            this.updateState({});
            this.loadAndPlayTrack(queue[index]).catch(console.error);
        }
    }

    togglePlayPause(): void {
        if (!this.audio.src || this.audio.error) {
            if (this.state.currentTrack) {
                this.loadAndPlayTrack(this.state.currentTrack).catch(console.error);
            }
            return;
        }

        if (this.audio.paused) {
            this.safePlay().catch(console.error);
        } else {
            this.audio.pause();
            this.saveQueueState();
        }
    }

    // === Queue ===

    toggleShuffle(): void {
        this.state.shuffleActive = !this.state.shuffleActive;

        if (this.state.shuffleActive) {
            this.state.originalQueueBeforeShuffle = [...this.state.queue];
            const currentTrack = this.state.queue[this.state.currentQueueIndex];

            const tracksToShuffle = [...this.state.queue];
            if (currentTrack && this.state.currentQueueIndex >= 0) {
                tracksToShuffle.splice(this.state.currentQueueIndex, 1);
            }

            const shuffled = this.shuffleArray(tracksToShuffle);

            if (currentTrack) {
                this.state.shuffledQueue = [currentTrack, ...shuffled];
                this.state.currentQueueIndex = 0;
            } else {
                this.state.shuffledQueue = shuffled;
                this.state.currentQueueIndex = -1;
            }
        } else {
            const currentTrack = this.getCurrentQueue()[this.state.currentQueueIndex];
            this.state.queue = [...this.state.originalQueueBeforeShuffle];
            this.state.currentQueueIndex = this.state.queue.findIndex(t => t.id === currentTrack?.id);
        }

        this.preloadCache.clear();
        this.preloadNextTracks();
        this.saveQueueState();
        this.updateState({});
    }

    toggleRepeat(): void {
        this.state.repeatMode = ((this.state.repeatMode + 1) % 3) as RepeatMode;
        this.saveQueueState();
        this.updateState({ repeatMode: this.state.repeatMode });
    }

    addToQueue(tracks: Track[]): void {
        this.state.queue.push(...tracks);
        if (this.state.shuffleActive) {
            this.state.shuffledQueue.push(...tracks);
            this.state.originalQueueBeforeShuffle.push(...tracks);
        }

        if (!this.state.currentTrack || this.state.currentQueueIndex === -1) {
            this.state.currentQueueIndex = this.getCurrentQueue().length - tracks.length;
            this.state.currentTrack = this.getCurrentQueue()[this.state.currentQueueIndex];
            this.loadAndPlayTrack(this.state.currentTrack).catch(console.error);
        }

        this.saveQueueState();
        this.updateState({});
    }

    addNextToQueue(tracks: Track[]): void {
        const queue = this.getCurrentQueue();
        const insertIndex = this.state.currentQueueIndex + 1;
        queue.splice(insertIndex, 0, ...tracks);

        if (this.state.shuffleActive) {
            this.state.originalQueueBeforeShuffle.push(...tracks);
        }

        this.saveQueueState();
        this.preloadNextTracks();
        this.updateState({});
    }

    removeFromQueue(index: number): void {
        const queue = this.getCurrentQueue();
        if (index < 0 || index >= queue.length) return;

        const wasCurrent = index === this.state.currentQueueIndex;

        if (index < this.state.currentQueueIndex) {
            this.state.currentQueueIndex--;
        }

        queue.splice(index, 1);

        if (this.state.shuffleActive) {
            // Try to remove from original queue too
            const removedId = queue[index]?.id;
            if (removedId) {
                const origIdx = this.state.originalQueueBeforeShuffle.findIndex(t => t.id === removedId);
                if (origIdx !== -1) this.state.originalQueueBeforeShuffle.splice(origIdx, 1);
            }
        }

        // If we removed the currently playing track, play the next one
        if (wasCurrent && queue.length > 0) {
            const newIndex = Math.min(index, queue.length - 1);
            this.state.currentQueueIndex = newIndex;
            this.state.currentTrack = queue[newIndex];
            this.loadAndPlayTrack(queue[newIndex]).catch(console.error);
        } else if (queue.length === 0) {
            this.audio.pause();
            this.audio.src = '';
            this.state.currentTrack = null;
            this.state.currentQueueIndex = -1;
            this.updateState({ isPlaying: false });
        }

        this.saveQueueState();
        this.preloadNextTracks();
        this.updateState({});
    }

    moveInQueue(fromIndex: number, toIndex: number): void {
        const queue = this.getCurrentQueue();
        if (fromIndex < 0 || fromIndex >= queue.length) return;
        if (toIndex < 0 || toIndex >= queue.length) return;

        const [track] = queue.splice(fromIndex, 1);
        queue.splice(toIndex, 0, track);

        if (this.state.currentQueueIndex === fromIndex) {
            this.state.currentQueueIndex = toIndex;
        } else if (fromIndex < this.state.currentQueueIndex && toIndex >= this.state.currentQueueIndex) {
            this.state.currentQueueIndex--;
        } else if (fromIndex > this.state.currentQueueIndex && toIndex <= this.state.currentQueueIndex) {
            this.state.currentQueueIndex++;
        }

        this.saveQueueState();
        this.updateState({});
    }

    clearQueue(): void {
        if (this.state.currentTrack) {
            this.state.queue = [this.state.currentTrack];
            this.state.shuffledQueue = [this.state.currentTrack];
            this.state.originalQueueBeforeShuffle = [this.state.currentTrack];
            this.state.currentQueueIndex = 0;
        } else {
            this.state.queue = [];
            this.state.shuffledQueue = [];
            this.state.originalQueueBeforeShuffle = [];
            this.state.currentQueueIndex = -1;
        }

        this.preloadCache.clear();
        this.saveQueueState();
        this.updateState({});
    }

    // === Preloading ===

    private async preloadNextTracks(): Promise<void> {
        const queue = this.getCurrentQueue();
        for (let i = 1; i <= 2; i++) {
            const nextIndex = this.state.currentQueueIndex + i;
            if (nextIndex < queue.length) {
                const track = queue[nextIndex];
                if (track.id && !this.preloadCache.has(track.id) && !track.isLocal && !track.isTracker) {
                    try {
            const isProviderTrack = String(track.id).startsWith('q:') || String(track.id).startsWith('y:') || String(track.id).startsWith('t:') || String(track.id).startsWith('j:') || String(track.id).startsWith('ia:');
                        if (isProviderTrack) {
                            const streamUrl = await musicAPI.getStreamUrl(track.id, this.state.quality);
                            this.preloadCache.set(track.id, streamUrl);
                        }
                    } catch (error) {
                        console.warn('Failed to preload track:', error);
                    }
                }
            }
        }
    }

    // === Persistence ===

    private saveQueueState(): void {
        const state = {
            queue: this.state.queue,
            shuffledQueue: this.state.shuffledQueue,
            originalQueueBeforeShuffle: this.state.originalQueueBeforeShuffle,
            currentQueueIndex: this.state.currentQueueIndex,
            shuffleActive: this.state.shuffleActive,
            repeatMode: this.state.repeatMode,
        };
        localStorage.setItem('barashka-queue', JSON.stringify(state));
    }

    private loadQueueState(): void {
        try {
            const saved = localStorage.getItem('barashka-queue');
            if (saved) {
                const state = JSON.parse(saved);
                this.state.queue = state.queue || [];
                this.state.shuffledQueue = state.shuffledQueue || [];
                this.state.originalQueueBeforeShuffle = state.originalQueueBeforeShuffle || [];
                this.state.currentQueueIndex = state.currentQueueIndex ?? -1;
                this.state.shuffleActive = state.shuffleActive || false;
                this.state.repeatMode = state.repeatMode ?? REPEAT_MODE.OFF;

                const currentQueue = this.getCurrentQueue();
                if (this.state.currentQueueIndex >= 0 && this.state.currentQueueIndex < currentQueue.length) {
                    this.state.currentTrack = currentQueue[this.state.currentQueueIndex];
                }
                this.updateState({});
            }
        } catch (error) {
            console.warn('Failed to load queue state:', error);
        }
    }

    // === Utilities ===

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

export const audioEngine = new AudioEngine();
