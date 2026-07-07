import { describe, it, expect } from 'vitest';
import { parsePath } from '../router';

describe('parsePath', () => {
  it('parses root path as home', () => {
    expect(parsePath('/')).toEqual({
      page: 'home',
      param: '',
      provider: null,
      id: '',
    });
  });

  it('parses empty path as home', () => {
    expect(parsePath('')).toEqual({
      page: 'home',
      param: '',
      provider: null,
      id: '',
    });
  });

  it('parses index.html as home', () => {
    expect(parsePath('/index.html')).toEqual({
      page: 'home',
      param: '',
      provider: null,
      id: '',
    });
  });

  it('parses simple page', () => {
    expect(parsePath('/settings')).toEqual({
      page: 'settings',
      param: '',
      provider: null,
      id: '',
    });
  });

  it('parses page with param', () => {
    expect(parsePath('/track/abc123')).toEqual({
      page: 'track',
      param: 'abc123',
      provider: null,
      id: 'abc123',
    });
  });

  it('parses YouTube provider prefix y/', () => {
    expect(parsePath('/track/y/vid123')).toEqual({
      page: 'track',
      param: 'y/vid123',
      provider: 'youtube',
      id: 'vid123',
    });
  });

  it('parses YouTube provider prefix y:', () => {
    expect(parsePath('/track/y:vid123')).toEqual({
      page: 'track',
      param: 'y:vid123',
      provider: 'youtube',
      id: 'y:vid123',
    });
  });

  it('strips trailing slash', () => {
    expect(parsePath('/settings/')).toEqual({
      page: 'settings',
      param: '',
      provider: null,
      id: '',
    });
  });

  it('decodes URL-encoded params', () => {
    expect(parsePath('/artist/%D1%82%D0%B5%D1%81%D1%82')).toEqual({
      page: 'artist',
      param: 'тест',
      provider: null,
      id: 'тест',
    });
  });

  it('handles multi-segment params', () => {
    expect(parsePath('/playlist/user/my-songs')).toEqual({
      page: 'playlist',
      param: 'user/my-songs',
      provider: null,
      id: 'user/my-songs',
    });
  });
});
