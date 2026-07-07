import { describe, it, expect } from 'vitest';
import { geniusAPI } from '../genius-api';
import type { GeniusAnnotation } from '../genius-api';

function makeAnnotation(fragment: string): GeniusAnnotation {
  return { fragment, annotation: { plain: 'test annotation' } };
}

describe('geniusAPI.findAnnotationsForLine', () => {
  it('returns empty for empty annotations', () => {
    expect(geniusAPI.findAnnotationsForLine('hello', [])).toEqual([]);
  });

  it('returns empty for empty line text', () => {
    const annotations = [makeAnnotation('some fragment')];
    expect(geniusAPI.findAnnotationsForLine('', annotations)).toEqual([]);
  });

  it('matches exact substring (line contains fragment)', () => {
    const annotations = [makeAnnotation('quick brown fox')];
    const result = geniusAPI.findAnnotationsForLine('the quick brown fox jumps', annotations);
    expect(result).toHaveLength(1);
  });

  it('matches exact substring (fragment contains line)', () => {
    const annotations = [makeAnnotation('the quick brown fox jumps over')];
    const result = geniusAPI.findAnnotationsForLine('quick brown fox', annotations);
    expect(result).toHaveLength(1);
  });

  it('matches by word overlap > 60%', () => {
    const annotations = [makeAnnotation('hello world foo bar')];
    // 3 of 4 words match: hello, world, foo -> 75%
    const result = geniusAPI.findAnnotationsForLine('hello world foo baz', annotations);
    expect(result).toHaveLength(1);
  });

  it('does not match when overlap <= 60%', () => {
    const annotations = [makeAnnotation('one two three four five')];
    // only 1 of 5 words match -> 20%
    const result = geniusAPI.findAnnotationsForLine('one six seven eight', annotations);
    expect(result).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const annotations = [makeAnnotation('Hello World')];
    const result = geniusAPI.findAnnotationsForLine('hello world', annotations);
    expect(result).toHaveLength(1);
  });

  it('filters out punctuation when matching', () => {
    const annotations = [makeAnnotation("it's a beautiful day")];
    const result = geniusAPI.findAnnotationsForLine("it's a beautiful day!", annotations);
    expect(result).toHaveLength(1);
  });

  it('matches multiple annotations', () => {
    const annotations = [
      makeAnnotation('first line of the song'),
      makeAnnotation('second line coming up'),
      makeAnnotation('completely different topic'),
    ];
    const result = geniusAPI.findAnnotationsForLine('first line of the song', annotations);
    expect(result).toHaveLength(1);
    expect(result[0].fragment).toBe('first line of the song');
  });
});
