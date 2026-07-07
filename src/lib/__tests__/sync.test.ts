import { describe, it, expect } from 'vitest';
import { encodeSyncData, decodeSyncData, getDataSize, formatDataSize } from '../sync';
import type { SyncData } from '../sync';

function makeSyncData(overrides: Partial<SyncData> = {}): SyncData {
  return {
    version: 2,
    exportDate: '2025-01-01T00:00:00.000Z',
    app: 'barashka',
    profile: { nickname: 'Test', avatar: '', bio: '', color: '#6366f1' },
    settings: {
      theme: 'system',
      quality: 'HI_RES_LOSSLESS',
      musicProvider: 'youtube',
      equalizer: { enabled: false, bandCount: 10, gains: [], preamp: 0, preset: null },
      crossfade: { enabled: false, duration: 5000, curve: 'logarithmic', autoCrossfade: false },
      replayGain: { mode: 'off', preamp: 0 },
      audioEffects: { speed: 1, preservePitch: true },
      audioEnhancements: { monoAudio: false, exponentialVolume: false },
      discordRPC: { enabled: false, showDetails: true, showArtist: true, showAlbum: true, showTimestamp: true, showButtons: true },
      jamendo: { clientId: '', audioFormat: 'mp32' },
      download: { quality: 'HI_RES_LOSSLESS', container: 'flac', convertToMp3: false },
      scrobblePercentage: 50,
      lastFM: { enabled: false, username: '', apiKey: '', apiSecret: '' },
      listenBrainz: { enabled: false, token: '', customUrl: '' },
      maloja: { enabled: false, url: '', apiKey: '' },
      libreFm: { enabled: false, username: '' },
    },
    likedTracks: [],
    likedAlbums: [],
    likedArtists: [],
    playlists: [],
    history: [],
    contentBlocking: { blockedTracks: [], blockedAlbums: [], blockedArtists: [] },
    queue: { queue: [], shuffledQueue: [], currentQueueIndex: -1, shuffleActive: false, repeatMode: 0 },
    ...overrides,
  };
}

describe('encodeSyncData / decodeSyncData', () => {
  it('roundtrips empty data', () => {
    const data = makeSyncData();
    const encoded = encodeSyncData(data);
    const decoded = decodeSyncData(encoded);
    expect(decoded).toEqual(data);
  });

  it('roundtrips data with tracks', () => {
    const data = makeSyncData({
      likedTracks: [
        { id: 'y:abc', title: 'Test Track', duration: 210, artist: 'Test Artist' },
      ],
      history: [
        { id: 'y:def', title: 'History Track', duration: 180, artist: 'History Artist' },
      ],
    });
    const encoded = encodeSyncData(data);
    const decoded = decodeSyncData(encoded);
    expect(decoded).toEqual(data);
  });

  it('roundtrips data with unicode characters', () => {
    const data = makeSyncData({
      likedTracks: [
        { id: 'y:xyz', title: 'Привет Мир', duration: 200, artist: 'Тест Артист' },
      ],
    });
    const encoded = encodeSyncData(data);
    const decoded = decodeSyncData(encoded);
    expect(decoded).toEqual(data);
  });

  it('roundtrips data with playlists', () => {
    const data = makeSyncData({
      playlists: [
        {
          id: 'pl-1',
          title: 'My Playlist',
          tracks: [
            { id: 'y:1', title: 'Song 1', duration: 100, artist: 'Artist 1' },
            { id: 'y:2', title: 'Song 2', duration: 200, artist: 'Artist 2' },
          ],
        },
      ],
    });
    const encoded = encodeSyncData(data);
    const decoded = decodeSyncData(encoded);
    expect(decoded).toEqual(data);
  });

  it('roundtrips data with profile', () => {
    const data = makeSyncData({
      profile: { nickname: 'Barashka User', avatar: 'data:image/png;base64,abc', bio: 'Hello', color: '#ff0000' },
    });
    const encoded = encodeSyncData(data);
    const decoded = decodeSyncData(encoded);
    expect(decoded?.profile.nickname).toBe('Barashka User');
    expect(decoded?.profile.bio).toBe('Hello');
  });

  it('returns null for invalid base64', () => {
    expect(decodeSyncData('not-valid-base64!!!')).toBeNull();
  });

  it('returns null for valid base64 but wrong app name', () => {
    const data = makeSyncData();
    (data as any).app = 'wrong-app';
    const encoded = encodeSyncData(data);
    expect(decodeSyncData(encoded)).toBeNull();
  });

  it('returns null for valid base64 but wrong version', () => {
    const data = makeSyncData();
    (data as any).version = 99;
    const encoded = encodeSyncData(data);
    expect(decodeSyncData(encoded)).toBeNull();
  });

  it('accepts version 1 (legacy)', () => {
    const data = makeSyncData();
    (data as any).version = 1;
    const encoded = encodeSyncData(data);
    expect(decodeSyncData(encoded)).not.toBeNull();
  });

  it('produces a base64 string', () => {
    const encoded = encodeSyncData(makeSyncData());
    expect(() => atob(encoded)).not.toThrow();
  });
});

describe('getDataSize', () => {
  it('returns size in bytes', () => {
    const data = makeSyncData();
    const size = getDataSize(data);
    expect(size).toBeGreaterThan(0);
    expect(typeof size).toBe('number');
  });

  it('increases with more data', () => {
    const small = makeSyncData();
    const large = makeSyncData({
      likedTracks: Array.from({ length: 100 }, (_, i) => ({
        id: `y:${i}`,
        title: `Track ${i}`,
        duration: 200,
        artist: `Artist ${i}`,
      })),
    });
    expect(getDataSize(large)).toBeGreaterThan(getDataSize(small));
  });
});

describe('formatDataSize', () => {
  it('formats bytes', () => {
    expect(formatDataSize(0)).toBe('0 B');
    expect(formatDataSize(500)).toBe('500 B');
    expect(formatDataSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatDataSize(1024)).toBe('1.0 KB');
    expect(formatDataSize(1536)).toBe('1.5 KB');
    expect(formatDataSize(1048575)).toBe('1024.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatDataSize(1048576)).toBe('1.0 MB');
    expect(formatDataSize(2621440)).toBe('2.5 MB');
  });
});
