import { describe, it, expect } from 'vitest';
import { sleepTimer } from '../sleep-timer';

describe('sleepTimer.formatRemaining', () => {
  it('formats seconds only', () => {
    expect(sleepTimer.formatRemaining(0)).toBe('0s');
    expect(sleepTimer.formatRemaining(30)).toBe('30s');
    expect(sleepTimer.formatRemaining(59)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(sleepTimer.formatRemaining(60)).toBe('1m 0s');
    expect(sleepTimer.formatRemaining(90)).toBe('1m 30s');
    expect(sleepTimer.formatRemaining(125)).toBe('2m 5s');
  });

  it('formats large values', () => {
    expect(sleepTimer.formatRemaining(3600)).toBe('60m 0s');
    expect(sleepTimer.formatRemaining(3661)).toBe('61m 1s');
  });
});

describe('sleepTimer state', () => {
  it('is not active initially', () => {
    expect(sleepTimer.isActive()).toBe(false);
  });

  it('returns null remaining when not active', () => {
    expect(sleepTimer.getRemaining()).toBeNull();
  });
});
