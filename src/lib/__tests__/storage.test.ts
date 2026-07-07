import { describe, it, expect, beforeEach } from 'vitest';
import { volumeSettings, themeSettings, musicProviderSettings } from '../storage';

describe('createSetting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default value when nothing stored', () => {
    expect(volumeSettings.get()).toBe(0.7);
  });

  it('stores and retrieves a value', () => {
    volumeSettings.set(0.5);
    expect(volumeSettings.get()).toBe(0.5);
  });

  it('resets to default value', () => {
    volumeSettings.set(0.3);
    expect(volumeSettings.get()).toBe(0.3);
    volumeSettings.reset();
    expect(volumeSettings.get()).toBe(0.7);
  });

  it('handles JSON-serializable objects', () => {
    const defaultTheme = themeSettings.get();
    expect(defaultTheme).toBe('system');

    themeSettings.set('dark');
    expect(themeSettings.get()).toBe('dark');

    themeSettings.reset();
    expect(themeSettings.get()).toBe('system');
  });

  it('handles complex objects', () => {
    const defaultProvider = musicProviderSettings.get();
    expect(defaultProvider).toBe('youtube');

    musicProviderSettings.set('youtube');
    expect(musicProviderSettings.get()).toBe('youtube');
  });

  it('returns default on corrupted data', () => {
    localStorage.setItem('barashka-volume', 'not-a-number');
    expect(volumeSettings.get()).toBe(0.7);
  });

  it('isolates different settings', () => {
    volumeSettings.set(0.2);
    themeSettings.set('light');
    expect(volumeSettings.get()).toBe(0.2);
    expect(themeSettings.get()).toBe('light');
  });
});
