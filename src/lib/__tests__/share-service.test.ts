import { describe, it, expect, beforeEach } from 'vitest';
import { shareService } from '../share-service';
import type { Track } from '../../types';

describe('shareService.buildTrackUrl', () => {
  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://barashka.app' },
      writable: true,
    });
  });

  it('builds YouTube Music URL for y: prefix', () => {
    const track: Track = { id: 'y:dQw4w9WgXcQ', title: 'Test', duration: 200 };
    expect(shareService.buildTrackUrl(track)).toBe(
      'https://music.youtube.com/watch?v=dQw4w9WgXcQ'
    );
  });

  it('builds app URL for t: prefix', () => {
    const track: Track = { id: 't:123', title: 'Test', duration: 200 };
    expect(shareService.buildTrackUrl(track)).toBe('https://barashka.app/track/t:123');
  });

  it('builds app URL for q: prefix', () => {
    const track: Track = { id: 'q:456', title: 'Test', duration: 200 };
    expect(shareService.buildTrackUrl(track)).toBe('https://barashka.app/track/q:456');
  });

  it('builds app URL for unknown prefix', () => {
    const track: Track = { id: 'abc789', title: 'Test', duration: 200 };
    expect(shareService.buildTrackUrl(track)).toBe('https://barashka.app/track/abc789');
  });
});

describe('shareService.buildShareData', () => {
  it('builds share data with single artist', () => {
    const track: Track = { id: 'y:1', title: 'My Song', duration: 200, artist: 'My Artist' };
    const data = shareService.buildShareData(track);
    expect(data.title).toBe('My Song - My Artist');
    expect(data.text).toContain('My Song');
    expect(data.text).toContain('My Artist');
  });

  it('builds share data with multiple artists', () => {
    const track: Track = {
      id: 'y:2',
      title: 'Duet',
      duration: 200,
      artists: [{ id: 'a1', name: 'First' }, { id: 'a2', name: 'Second' }],
    };
    const data = shareService.buildShareData(track);
    expect(data.title).toBe('Duet - First, Second');
  });

  it('uses "Unknown" when no artist', () => {
    const track: Track = { id: 'y:3', title: 'Orphan', duration: 200 };
    const data = shareService.buildShareData(track);
    expect(data.title).toBe('Orphan - Unknown');
  });
});
