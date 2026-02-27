import { similarity } from '@utils/similarity';

describe('similarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(1.0);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(similarity('', '')).toBe(1.0);
  });

  it('returns 0.0 for completely different strings of equal length', () => {
    // 'abc' vs 'xyz' — 3 substitutions, maxLen=3 => 1 - 3/3 = 0.0
    expect(similarity('abc', 'xyz')).toBe(0.0);
  });

  it('is case-insensitive', () => {
    expect(similarity('Hello', 'hello')).toBe(1.0);
    expect(similarity('STARBUCKS', 'starbucks')).toBe(1.0);
  });

  it('returns a value between 0 and 1 for partially similar strings', () => {
    const score = similarity('coffee shop', 'coffee house');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns higher score for more similar strings', () => {
    const scoreHigh = similarity('Starbucks Coffee', 'STARBUCKS COFFEE');
    const scoreLow = similarity('Starbucks Coffee', 'McDonalds Burger');
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('is symmetric', () => {
    expect(similarity('apple', 'applet')).toBeCloseTo(similarity('applet', 'apple'));
  });

  it('handles one empty string gracefully', () => {
    // '' vs 'hello' — 5 insertions, maxLen=5 => 1 - 5/5 = 0.0
    expect(similarity('', 'hello')).toBe(0.0);
    expect(similarity('hello', '')).toBe(0.0);
  });

  it('scores meaningfully for clearly related payees', () => {
    // Abbreviated vs full name — typically 0.4+ similarity
    expect(similarity('WHOLEFDS MKT #10', 'Whole Foods Market')).toBeGreaterThanOrEqual(0.4);
    // Shared prefix but different suffix — over 0.5 similarity
    expect(similarity('Amazon.com', 'Amazon Prime')).toBeGreaterThanOrEqual(0.5);
  });

  it('stays below fuzzy threshold (0.70) for unrelated payees', () => {
    expect(similarity('Netflix', 'Amazon')).toBeLessThan(0.7);
    expect(similarity('Shell Gas Station', 'Hilton Hotels')).toBeLessThan(0.7);
  });
});
