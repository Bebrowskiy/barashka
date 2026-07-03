import type { Track } from '../types';

class ShareService {
    async shareTrack(track: Track): Promise<boolean> {
        const shareData = this.buildShareData(track);

        // Try native Web Share API first (mobile)
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return true;
            } catch (e: any) {
                if (e.name === 'AbortError') return false; // User cancelled
                // Fall through to clipboard
            }
        }

        // Fallback: copy link to clipboard
        const url = this.buildTrackUrl(track);
        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch {
            // Fallback: create temporary textarea
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    }

    buildShareData(track: Track): ShareData {
        const artist = track.artist || track.artists?.map(a => a.name).join(', ') || 'Unknown';
        return {
            title: `${track.title} - ${artist}`,
            text: `Listen to ${track.title} by ${artist} on Barashka`,
            url: this.buildTrackUrl(track),
        };
    }

    buildTrackUrl(track: Track): string {
        const base = window.location.origin;
        const id = track.id || '';

        if (id.startsWith('y:')) {
            const videoId = id.slice(2);
            return `https://music.youtube.com/watch?v=${videoId}`;
        }
        if (id.startsWith('t:')) {
            return `${base}/track/${id}`;
        }
        if (id.startsWith('q:')) {
            return `${base}/track/${id}`;
        }
        return `${base}/track/${id}`;
    }

    async copyLink(track: Track): Promise<boolean> {
        const url = this.buildTrackUrl(track);
        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    }
}

export const shareService = new ShareService();
