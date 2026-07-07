import { describe, it, expect } from 'vitest';
import { lyricsAPI } from '../lyrics-api';

describe('lyricsAPI.parseLrc', () => {
  it('parses simple synced lyrics', () => {
    const lrc = `[00:12.00]First line
[00:24.50]Second line
[00:36.80]Third line`;

    const result = lyricsAPI.parseLrc(lrc);
    expect(result).toEqual([
      { time: 12, text: 'First line' },
      { time: 24.5, text: 'Second line' },
      { time: 36.8, text: 'Third line' },
    ]);
  });

  it('parses milliseconds with 2 digits', () => {
    const lrc = `[00:01.50]Half second`;
    const result = lyricsAPI.parseLrc(lrc);
    expect(result[0].time).toBe(1.5);
  });

  it('parses milliseconds with 3 digits', () => {
    const lrc = `[00:01.500]Half second`;
    const result = lyricsAPI.parseLrc(lrc);
    expect(result[0].time).toBe(1.5);
  });

  it('skips lines without timestamps', () => {
    const lrc = `[00:10.00]Timed line
Untimed line
[00:20.00]Another timed line`;

    const result = lyricsAPI.parseLrc(lrc);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Timed line');
    expect(result[1].text).toBe('Another timed line');
  });

  it('skips empty text lines', () => {
    const lrc = `[00:10.00]Has text
[00:20.00]
[00:30.00]Also has text`;

    const result = lyricsAPI.parseLrc(lrc);
    expect(result).toHaveLength(2);
  });

  it('sorts lines by time', () => {
    const lrc = `[00:30.00]Third
[00:10.00]First
[00:20.00]Second`;

    const result = lyricsAPI.parseLrc(lrc);
    expect(result.map(l => l.text)).toEqual(['First', 'Second', 'Third']);
  });

  it('handles minutes >= 10', () => {
    const lrc = `[10:00.00]Ten minutes in`;
    const result = lyricsAPI.parseLrc(lrc);
    expect(result[0].time).toBe(600);
  });

  it('returns empty array for empty input', () => {
    expect(lyricsAPI.parseLrc('')).toEqual([]);
  });

  it('handles multiple timestamps on one line (uses first timestamp)', () => {
    const lrc = `[00:10.00][00:20.00]Repeated line`;
    const result = lyricsAPI.parseLrc(lrc);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(10);
    expect(result[0].text).toBe('[00:20.00]Repeated line');
  });

  it('trims whitespace from text', () => {
    const lrc = `[00:10.00]  Spaced text  `;
    const result = lyricsAPI.parseLrc(lrc);
    expect(result[0].text).toBe('Spaced text');
  });
});
