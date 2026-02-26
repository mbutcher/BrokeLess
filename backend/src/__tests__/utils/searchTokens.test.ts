import { tokenize, extractSearchTokens } from '../../utils/searchTokens';

describe('tokenize', () => {
  it('lowercases and splits on spaces', () => {
    expect(tokenize('Whole Foods')).toEqual(['whole', 'foods']);
  });

  it('splits on hyphens', () => {
    expect(tokenize('Tim-Hortons')).toEqual(['tim', 'hortons']);
  });

  it('splits on apostrophes and other punctuation', () => {
    expect(tokenize("McDonald's Coffee")).toEqual(['mcdonald', 'coffee']);
  });

  it('filters out single-character tokens', () => {
    expect(tokenize('a b c do')).toEqual(['do']);
  });

  it('deduplicates tokens', () => {
    expect(tokenize('coffee coffee COFFEE')).toEqual(['coffee']);
  });

  it('handles multiple separators in a row', () => {
    expect(tokenize('Shell---Gas  Station')).toEqual(['shell', 'gas', 'station']);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array when all tokens are too short', () => {
    expect(tokenize('a b c')).toEqual([]);
  });

  it('filters single-digit tokens and keeps alphanumeric words', () => {
    // '7' is length 1 → filtered; 'eleven' and 'store' pass
    expect(tokenize('7-Eleven store')).toEqual(['eleven', 'store']);
  });
});

describe('extractSearchTokens', () => {
  it('combines payee and description', () => {
    expect(extractSearchTokens('Whole Foods', 'weekly groceries')).toEqual([
      'whole',
      'foods',
      'weekly',
      'groceries',
    ]);
  });

  it('handles null payee', () => {
    expect(extractSearchTokens(null, 'Grocery run')).toEqual(['grocery', 'run']);
  });

  it('handles null description', () => {
    expect(extractSearchTokens('Tim Hortons', null)).toEqual(['tim', 'hortons']);
  });

  it('returns empty array when both are null', () => {
    expect(extractSearchTokens(null, null)).toEqual([]);
  });

  it('deduplicates tokens across payee and description', () => {
    expect(extractSearchTokens('coffee shop', 'coffee')).toEqual(['coffee', 'shop']);
  });

  it('handles empty strings', () => {
    expect(extractSearchTokens('', '')).toEqual([]);
  });
});
