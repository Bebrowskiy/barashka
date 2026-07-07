import { describe, it, expect } from 'vitest';
import {
  generateCSV,
  generateM3U,
  generateXSPF,
  generateJSON,
  detectFormat,
  exportPlaylist,
} from '../playlist-io';
import type { Track } from '../../types';

const sampleTracks: Track[] = [
  {
    id: 'y:abc123',
    title: 'Test Song',
    duration: 210,
    artist: 'Test Artist',
    album: { id: 'alb1', title: 'Test Album' },
  },
  {
    id: 'y:def456',
    title: 'Another Song',
    duration: 185,
    artists: [{ id: 'a1', name: 'Artist One' }, { id: 'a2', name: 'Artist Two' }],
  },
];

describe('generateCSV', () => {
  it('generates valid CSV with headers', () => {
    const csv = generateCSV('My Playlist', sampleTracks);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('Track Name');
    expect(lines[0]).toContain('Artist Name(s)');
    expect(lines.length).toBe(3); // header + 2 tracks
  });

  it('escapes quotes in track data', () => {
    const tracks: Track[] = [
      { id: 'y:1', title: 'Song "Special" chars', duration: 100, artist: 'Artist' },
    ];
    const csv = generateCSV('Test', tracks);
    expect(csv).toContain('""Special""');
  });

  it('handles empty tracks array', () => {
    const csv = generateCSV('Empty', []);
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(1); // only header
  });

  it('formats duration as mm:ss', () => {
    const csv = generateCSV('Test', sampleTracks);
    expect(csv).toContain('3:30'); // 210s
    expect(csv).toContain('3:05'); // 185s
  });
});

describe('generateM3U', () => {
  it('generates valid M3U with header', () => {
    const m3u = generateM3U('My Playlist', sampleTracks);
    expect(m3u).toContain('#EXTM3U');
    expect(m3u).toContain('#PLAYLIST:My Playlist');
  });

  it('includes EXTINF entries', () => {
    const m3u = generateM3U('Test', sampleTracks);
    expect(m3u).toContain('#EXTINF:');
    expect(m3u).toContain('Test Artist - Test Song');
  });

  it('includes track IDs', () => {
    const m3u = generateM3U('Test', sampleTracks);
    expect(m3u).toContain('y:abc123');
    expect(m3u).toContain('y:def456');
  });
});

describe('generateXSPF', () => {
  it('generates valid XSPF XML', () => {
    const xspf = generateXSPF('My Playlist', sampleTracks);
    expect(xspf).toContain('<?xml version="1.0"');
    expect(xspf).toContain('<playlist');
    expect(xspf).toContain('<title>My Playlist</title>');
    expect(xspf).toContain('<trackList>');
  });

  it('includes track details', () => {
    const xspf = generateXSPF('Test', sampleTracks);
    expect(xspf).toContain('<title>Test Song</title>');
    expect(xspf).toContain('<creator>Test Artist</creator>');
    expect(xspf).toContain('<album>Test Album</album>');
    expect(xspf).toContain('<duration>210000</duration>'); // ms
  });

  it('escapes XML special characters', () => {
    const tracks: Track[] = [
      { id: 'y:1', title: 'Tom & Jerry <2>', duration: 100, artist: 'A "B" C' },
    ];
    const xspf = generateXSPF('Test', tracks);
    expect(xspf).toContain('Tom &amp; Jerry &lt;2&gt;');
    expect(xspf).toContain('A &quot;B&quot; C');
  });
});

describe('generateJSON', () => {
  it('generates valid JSON', () => {
    const json = generateJSON('My Playlist', sampleTracks);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('barashka-playlist');
    expect(parsed.version).toBe('1.0');
    expect(parsed.playlist.title).toBe('My Playlist');
    expect(parsed.tracks).toHaveLength(2);
  });

  it('includes track positions', () => {
    const json = generateJSON('Test', sampleTracks);
    const parsed = JSON.parse(json);
    expect(parsed.tracks[0].position).toBe(1);
    expect(parsed.tracks[1].position).toBe(2);
  });

  it('handles multiple artists', () => {
    const json = generateJSON('Test', sampleTracks);
    const parsed = JSON.parse(json);
    expect(parsed.tracks[1].artist).toBe('Artist One, Artist Two');
  });
});

describe('detectFormat', () => {
  it('detects CSV', () => {
    expect(detectFormat('playlist.csv')).toBe('csv');
    expect(detectFormat('playlist.tsv')).toBe('csv');
  });

  it('detects M3U', () => {
    expect(detectFormat('playlist.m3u')).toBe('m3u');
    expect(detectFormat('playlist.m3u8')).toBe('m3u');
  });

  it('detects XSPF', () => {
    expect(detectFormat('playlist.xspf')).toBe('xspf');
  });

  it('detects JSPF', () => {
    expect(detectFormat('playlist.jspf')).toBe('jspf');
  });

  it('detects JSON', () => {
    expect(detectFormat('playlist.json')).toBe('json');
  });

  it('returns unknown for unsupported formats', () => {
    expect(detectFormat('playlist.txt')).toBe('unknown');
    expect(detectFormat('playlist')).toBe('unknown');
  });
});

describe('exportPlaylist', () => {
  it('delegates to correct generator', () => {
    expect(exportPlaylist('Test', sampleTracks, 'csv')).toBe(generateCSV('Test', sampleTracks));
    expect(exportPlaylist('Test', sampleTracks, 'm3u')).toBe(generateM3U('Test', sampleTracks));
    expect(exportPlaylist('Test', sampleTracks, 'xspf')).toBe(generateXSPF('Test', sampleTracks));
    expect(exportPlaylist('Test', sampleTracks, 'json')).toBe(generateJSON('Test', sampleTracks));
  });
});
