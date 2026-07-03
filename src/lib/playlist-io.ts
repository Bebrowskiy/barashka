import type { Track } from '../types';
import { musicAPI } from './music-api';

function getTrackArtists(track: Track): string {
    if (track.artists && track.artists.length > 0) {
        return track.artists.map(a => a.name).join(', ');
    }
    return track.artist || 'Unknown Artist';
}

function escapeXml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseLine(text: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"').trim());
}

function isFuzzyMatch(a: string, b: string): boolean {
    if (!a || !b) return false;
    const s1 = a.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const s2 = b.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return s1.includes(s2) || s2.includes(s1);
}

function findBestMatch(items: Track[], artist?: string, album?: string): Track | null {
    if (!items.length) return null;
    if (!artist && !album) return items[0];

    return items.find(item => {
        let artistOk = true;
        let albumOk = true;
        if (artist) {
            const itemArtist = item.artist || item.artists?.[0]?.name || '';
            if (!isFuzzyMatch(itemArtist, artist)) artistOk = false;
        }
        if (album && item.album?.title) {
            if (!isFuzzyMatch(item.album.title, album)) albumOk = false;
        }
        return artistOk && albumOk;
    }) || items[0];
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === EXPORT ===

export function generateCSV(title: string, tracks: Track[]): string {
    const headers = ['Track Name', 'Artist Name(s)', 'Album', 'Duration'];
    let content = headers.map(h => `"${h}"`).join(',') + '\n';
    for (const track of tracks) {
        const t = (track.title || '').replace(/"/g, '""');
        const a = getTrackArtists(track).replace(/"/g, '""');
        const al = (track.album?.title || '').replace(/"/g, '""');
        const d = formatDuration(track.duration || 0);
        content += `"${t}","${a}","${al}","${d}"\n`;
    }
    return content;
}

export function generateM3U(title: string, tracks: Track[]): string {
    let content = '#EXTM3U\n';
    content += `#PLAYLIST:${sanitizeFilename(title)}\n\n`;
    for (const track of tracks) {
        const duration = Math.round(track.duration || 0);
        const artists = getTrackArtists(track);
        const name = track.title || 'Unknown Title';
        content += `#EXTINF:${duration},${artists} - ${name}\n`;
        content += `${track.id}\n\n`;
    }
    return content;
}

export function generateXSPF(title: string, tracks: Track[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<playlist xmlns="http://xspf.org/ns/0/" version="1">\n';
    xml += `  <title>${escapeXml(title)}</title>\n`;
    xml += '  <trackList>\n';
    for (const track of tracks) {
        xml += '    <track>\n';
        xml += `      <title>${escapeXml(track.title || '')}</title>\n`;
        xml += `      <creator>${escapeXml(getTrackArtists(track))}</creator>\n`;
        if (track.album?.title) xml += `      <album>${escapeXml(track.album.title)}</album>\n`;
        if (track.duration) xml += `      <duration>${Math.round(track.duration * 1000)}</duration>\n`;
        xml += '    </track>\n';
    }
    xml += '  </trackList>\n</playlist>\n';
    return xml;
}

export function generateJSON(title: string, tracks: Track[]): string {
    return JSON.stringify({
        format: 'barashka-playlist',
        version: '1.0',
        generated: new Date().toISOString(),
        playlist: { title },
        tracks: tracks.map((t, i) => ({
            position: i + 1,
            id: t.id,
            title: t.title || 'Unknown Title',
            artist: getTrackArtists(t),
            album: t.album?.title || null,
            duration: Math.round(t.duration || 0),
        })),
    }, null, 2);
}

// === IMPORT ===

export interface ImportProgress {
    current: number;
    total: number;
    currentItem: string;
}

export interface ImportResult {
    tracks: Track[];
    missing: { title: string; artist: string; album?: string }[];
    stats: { total: number; found: number; missing: number };
}

export async function importCSV(
    csvText: string,
    onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { tracks: [], missing: [], stats: { total: 0, found: 0, missing: 0 } };

    const headers = parseLine(lines[0]);
    const trackIdx = headers.findIndex(h => /track|title|song|name/i.test(h));
    const artistIdx = headers.findIndex(h => /artist|creator/i.test(h));
    const albumIdx = headers.findIndex(h => /album/i.test(h));

    if (trackIdx === -1) return { tracks: [], missing: [], stats: { total: 0, found: 0, missing: 0 } };

    const rows = lines.slice(1).filter(l => l.trim());
    const tracks: Track[] = [];
    const missing: ImportResult['missing'] = [];

    for (let i = 0; i < rows.length; i++) {
        const values = parseLine(rows[i]);
        const title = values[trackIdx] || '';
        const artist = artistIdx >= 0 ? values[artistIdx] : '';
        const album = albumIdx >= 0 ? values[albumIdx] : '';

        if (onProgress) onProgress({ current: i, total: rows.length, currentItem: title || artist || 'Unknown' });
        if (!title) continue;

        await delay(300);

        try {
            const query = artist ? `"${title}" ${artist}` : title;
            const result = await musicAPI.searchTracks(query, { limit: 5 });
            if (result.items.length > 0) {
                const match = findBestMatch(result.items, artist, album);
                if (match) tracks.push(match);
                else missing.push({ title, artist, album });
            } else {
                missing.push({ title, artist, album });
            }
        } catch {
            missing.push({ title, artist, album });
        }
    }

    return { tracks, missing, stats: { total: rows.length, found: tracks.length, missing: missing.length } };
}

export async function importM3U(
    m3uText: string,
    onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
    const lines = m3uText.trim().split('\n');
    const trackInfo: { title: string; artist: string }[] = [];
    let current: { title: string; artist: string } | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#EXTM3U') || trimmed.startsWith('#PLAYLIST') || trimmed.startsWith('#ARTIST') || trimmed.startsWith('#DATE')) continue;

        if (trimmed.startsWith('#EXTINF:')) {
            const match = trimmed.match(/#EXTINF:(-?\d+)?,(.+)/);
            if (match) {
                const display = match[2];
                const parts = display.split(' - ');
                current = {
                    title: parts.length > 1 ? parts.slice(1).join(' - ') : display,
                    artist: parts.length > 1 ? parts[0] : '',
                };
            }
        } else if (!trimmed.startsWith('#')) {
            if (current) {
                trackInfo.push(current);
                current = null;
            }
        }
    }

    const tracks: Track[] = [];
    const missing: ImportResult['missing'] = [];

    for (let i = 0; i < trackInfo.length; i++) {
        const info = trackInfo[i];
        if (onProgress) onProgress({ current: i, total: trackInfo.length, currentItem: info.title || 'Unknown' });
        if (!info.title) continue;

        await delay(300);
        try {
            const query = info.artist ? `${info.title} ${info.artist}` : info.title;
            const result = await musicAPI.searchTracks(query, { limit: 5 });
            if (result.items.length > 0) {
                const match = findBestMatch(result.items, info.artist);
                if (match) tracks.push(match);
                else missing.push({ title: info.title, artist: info.artist });
            } else {
                missing.push({ title: info.title, artist: info.artist });
            }
        } catch {
            missing.push({ title: info.title, artist: info.artist });
        }
    }

    return { tracks, missing, stats: { total: trackInfo.length, found: tracks.length, missing: missing.length } };
}

export async function importXSPF(
    xspfText: string,
    onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
    if (!xspfText || xspfText.length > 10 * 1024 * 1024) {
        throw new Error('Invalid XSPF content');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xspfText, 'application/xml');
    const trackEls = doc.getElementsByTagName('track');
    const tracks: Track[] = [];
    const missing: ImportResult['missing'] = [];

    for (let i = 0; i < trackEls.length; i++) {
        const el = trackEls[i];
        const title = el.getElementsByTagName('title')[0]?.textContent || '';
        const creator = el.getElementsByTagName('creator')[0]?.textContent || '';
        const album = el.getElementsByTagName('album')[0]?.textContent || '';

        if (onProgress) onProgress({ current: i, total: trackEls.length, currentItem: title || 'Unknown' });
        if (!title) continue;

        await delay(300);
        try {
            const query = creator ? `${title} ${creator}` : title;
            const result = await musicAPI.searchTracks(query, { limit: 5 });
            if (result.items.length > 0) {
                const match = findBestMatch(result.items, creator, album);
                if (match) tracks.push(match);
                else missing.push({ title, artist: creator, album });
            } else {
                missing.push({ title, artist: creator, album });
            }
        } catch {
            missing.push({ title, artist: creator, album });
        }
    }

    return { tracks, missing, stats: { total: trackEls.length, found: tracks.length, missing: missing.length } };
}

export async function importJSPF(
    jspfText: string,
    onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
    const data = JSON.parse(jspfText);
    if (!data.playlist?.track || !Array.isArray(data.playlist.track)) {
        throw new Error('Invalid JSPF format');
    }

    const trackEls = data.playlist.track;
    const tracks: Track[] = [];
    const missing: ImportResult['missing'] = [];

    for (let i = 0; i < trackEls.length; i++) {
        const t = trackEls[i];
        const title = t.title || '';
        const creator = t.creator || '';
        const album = t.album || '';

        if (onProgress) onProgress({ current: i, total: trackEls.length, currentItem: title || 'Unknown' });
        if (!title) continue;

        await delay(300);
        try {
            const query = creator ? `${title} ${creator}` : title;
            const result = await musicAPI.searchTracks(query, { limit: 5 });
            if (result.items.length > 0) {
                tracks.push(result.items[0]);
            } else {
                missing.push({ title, artist: creator, album });
            }
        } catch {
            missing.push({ title, artist: creator, album });
        }
    }

    return { tracks, missing, stats: { total: trackEls.length, found: tracks.length, missing: missing.length } };
}

export function detectFormat(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'csv' || ext === 'tsv') return 'csv';
    if (ext === 'm3u' || ext === 'm3u8') return 'm3u';
    if (ext === 'xspf') return 'xspf';
    if (ext === 'jspf') return 'jspf';
    if (ext === 'json') return 'json';
    return 'unknown';
}

export async function importPlaylist(
    text: string,
    format: string,
    onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
    switch (format) {
        case 'csv': return importCSV(text, onProgress);
        case 'm3u': return importM3U(text, onProgress);
        case 'xspf': return importXSPF(text, onProgress);
        case 'jspf': return importJSPF(text, onProgress);
        default: throw new Error(`Unsupported format: ${format}`);
    }
}

export function exportPlaylist(
    title: string,
    tracks: Track[],
    format: 'csv' | 'm3u' | 'xspf' | 'json'
): string {
    switch (format) {
        case 'csv': return generateCSV(title, tracks);
        case 'm3u': return generateM3U(title, tracks);
        case 'xspf': return generateXSPF(title, tracks);
        case 'json': return generateJSON(title, tracks);
    }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadPlaylist(title: string, tracks: Track[], format: 'csv' | 'm3u' | 'xspf' | 'json'): void {
    const content = exportPlaylist(title, tracks, format);
    const mimeTypes: Record<string, string> = {
        csv: 'text/csv',
        m3u: 'audio/x-mpegurl',
        xspf: 'application/xspf+xml',
        json: 'application/json',
    };
    const ext = format === 'm3u' ? 'm3u' : format;
    downloadFile(content, `${sanitizeFilename(title)}.${ext}`, mimeTypes[format] || 'text/plain');
}
