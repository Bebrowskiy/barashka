import type { Track } from '../types';
import { youtubeAPI } from './youtube-api';
import { db } from './db';
import { convertAudio, writeID3Tags, writeFLACMetadata, type AudioFormat, type MetadataOptions } from './ffmpeg-service';
import { downloadSettings } from './storage';

export interface DownloadProgress {
    trackId: string;
    state: 'downloading' | 'converting' | 'tagging' | 'done' | 'error';
    progress: number;
    error?: string;
}

type DownloadListener = (progress: DownloadProgress) => void;

class DownloadService {
    private listeners = new Set<DownloadListener>();
    private activeDownloads = new Map<string, AbortController>();

    subscribe(listener: DownloadListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(progress: DownloadProgress) {
        this.listeners.forEach(l => l(progress));
    }

    isDownloading(trackId: string): boolean {
        return this.activeDownloads.has(trackId);
    }

    async downloadTrack(track: Track): Promise<void> {
        if (this.activeDownloads.has(track.id)) return;

        const controller = new AbortController();
        this.activeDownloads.set(track.id, controller);
        const signal = controller.signal;

        this.notify({ trackId: track.id, state: 'downloading', progress: 0 });

        try {
            let streamUrl = track.audioUrl || track.remoteUrl;

            if (!streamUrl) {
                streamUrl = await youtubeAPI.getStreamUrl(track.id, { signal });
            }

            this.notify({ trackId: track.id, state: 'downloading', progress: 10 });

            const response = await fetch(streamUrl, {
                signal,
                cache: 'no-store',
            });

            if (!response.ok) throw new Error(`Download failed: ${response.status}`);

            const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                received += value.length;

                const progress = contentLength > 0
                    ? 10 + Math.round((received / contentLength) * 50)
                    : 40;

                this.notify({ trackId: track.id, state: 'downloading', progress });
            }

            let audioBlob = new Blob(chunks);
            this.notify({ trackId: track.id, state: 'downloading', progress: 60 });

            const settings = downloadSettings.get();
            const targetFormat: AudioFormat = settings.convertToMp3 ? 'mp3' : settings.container as AudioFormat;

            if (targetFormat !== ('webm' as AudioFormat)) {
                this.notify({ trackId: track.id, state: 'converting', progress: 65 });

                audioBlob = await convertAudio(audioBlob, {
                    format: targetFormat,
                    bitrate: settings.convertToMp3 ? '320k' : undefined,
                    sampleRate: 44100,
                    onProgress: (p) => {
                        this.notify({ trackId: track.id, state: 'converting', progress: 65 + Math.round(p * 25) });
                    },
                    signal,
                });
            }

            this.notify({ trackId: track.id, state: 'tagging', progress: 90 });

            const metadata: MetadataOptions = {
                title: track.title,
                artist: track.artist || track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                album: track.album?.title,
                year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : undefined,
                track: track.trackNumber,
            };

            if (track.cover) {
                try {
                    const coverResponse = await fetch(track.cover, { signal });
                    if (coverResponse.ok) {
                        metadata.cover = await coverResponse.blob();
                    }
                } catch {}
            }

            if (targetFormat === 'mp3') {
                audioBlob = await writeID3Tags(audioBlob, metadata);
            } else if (targetFormat === 'flac') {
                audioBlob = await writeFLACMetadata(audioBlob, metadata);
            }

            this.notify({ trackId: track.id, state: 'converting', progress: 95 });

            await db.saveDownload(track.id, {
                id: track.id,
                title: track.title,
                artist: track.artist || 'Unknown',
                cover: track.cover || '',
                blob: audioBlob,
                size: audioBlob.size,
                downloadedAt: new Date().toISOString(),
            });

            const filename = this.sanitizeFilename(`${metadata.artist} - ${metadata.title}`);
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.${targetFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.notify({ trackId: track.id, state: 'done', progress: 100 });
        } catch (error: any) {
            if (error.name === 'AbortError') {
                this.notify({ trackId: track.id, state: 'error', progress: 0, error: 'Cancelled' });
            } else {
                console.error('Download failed:', error);
                this.notify({ trackId: track.id, state: 'error', progress: 0, error: error.message || 'Download failed' });
            }
        } finally {
            this.activeDownloads.delete(track.id);
        }
    }

    cancelDownload(trackId: string) {
        const controller = this.activeDownloads.get(trackId);
        if (controller) {
            controller.abort();
            this.activeDownloads.delete(trackId);
        }
    }

    private sanitizeFilename(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
    }
}

export const downloadService = new DownloadService();
