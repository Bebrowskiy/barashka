import { describe, it, expect } from 'vitest';
import md5 from '../md5';

describe('md5', () => {
  it(' hashes empty string', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('hashes simple strings', () => {
    expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
    expect(md5('world')).toBe('7d793037a0760186574b0282f2f435e7');
  });

  it('hashes "The quick brown fox jumps over the lazy dog"', () => {
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe(
      '9e107d9d372bb6826bd81d3542a419d6'
    );
  });

  it('produces consistent results', () => {
    const input = 'test-input-12345';
    expect(md5(input)).toBe(md5(input));
  });

  it('produces different hashes for different inputs', () => {
    expect(md5('abc')).not.toBe(md5('abd'));
  });

  it('returns a 32-character hex string', () => {
    const hash = md5('anything');
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it('hashes unicode strings', () => {
    const hash = md5('привет мир');
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it('hashes long strings', () => {
    const long = 'a'.repeat(10000);
    const hash = md5(long);
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });
});
