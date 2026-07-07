import { describe, it, expect } from 'vitest';
import { deezerAPI } from '../deezer-api';

describe('deezerAPI.formatFans', () => {
  it('formats small numbers as-is', () => {
    expect(deezerAPI.formatFans(0)).toBe('0');
    expect(deezerAPI.formatFans(500)).toBe('500');
    expect(deezerAPI.formatFans(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(deezerAPI.formatFans(1000)).toBe('1K');
    expect(deezerAPI.formatFans(1500)).toBe('2K');
    expect(deezerAPI.formatFans(10000)).toBe('10K');
    expect(deezerAPI.formatFans(999999)).toBe('1000K');
  });

  it('formats millions with M suffix', () => {
    expect(deezerAPI.formatFans(1000000)).toBe('1.0M');
    expect(deezerAPI.formatFans(1500000)).toBe('1.5M');
    expect(deezerAPI.formatFans(2500000)).toBe('2.5M');
  });
});
