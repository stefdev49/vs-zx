import { ZXBasicLexer, TokenType } from './zxbasic';

describe('DEF FN Two-Word Form Tests', () => {
  const lexer = new ZXBasicLexer();

  const testCases = [
    {
      input: '10 DEF FN f(x) = x * 2',
      description: 'Two-word DEF FN',
      shouldNormalize: true
    },
    {
      input: '20 DEFFN g(a,b) = a + b',
      description: 'Single-word DEFFN (if supported)',
      shouldNormalize: false
    },
    {
      input: '30 PRINT FN f(5)',
      description: 'FN in function call',
      shouldNormalize: false
    },
    {
      input: '40 LET DEF = 10',
      description: 'DEF as variable name',
      shouldNormalize: false
    },
    {
      input: '50 DEF',
      description: 'DEF alone',
      shouldNormalize: false
    }
  ];

  test.each(testCases)('$description - tokenizes correctly', ({ input, shouldNormalize }) => {
    const tokens = lexer.tokenize(input).filter(t => t.type !== TokenType.EOF);

    // Verify tokens are generated
    expect(tokens.length).toBeGreaterThan(0);

    // Verify normalization if expected
    if (shouldNormalize) {
      const deffnToken = tokens.find(t => t.value === 'DEFFN');
      expect(deffnToken).toBeDefined();
      expect(deffnToken!.value).toBe('DEFFN');

      // No separate DEF token in normalized case
      const defTokens = tokens.filter(t => t.value === 'DEF');
      expect(defTokens.length).toBe(0);
    }

    // Check for FN keyword in function calls (not in definitions)
    if (input.includes('PRINT FN')) {
      const fnToken = tokens.find(t => t.value === 'FN');
      expect(fnToken).toBeDefined();
      expect(fnToken!.type).toBe(TokenType.KEYWORD);
    }

    // Check FN token in DEFFN definition
    if (input.startsWith('20 DEFFN')) {
      // DEFFN should be present
      const deffnToken = tokens.find(t => t.value === 'DEFFN');
      expect(deffnToken).toBeDefined();
    }

    // Verify DEF standalone is identifier (not a keyword in ZX Spectrum BASIC)
    if (input.startsWith('40 LET DEF') || input === '50 DEF') {
      const defToken = tokens.find(t => t.value === 'DEF');
      expect(defToken).toBeDefined();
      expect(defToken!.type).toBe(TokenType.IDENTIFIER);
    }
  });

  test('should parse FN as keyword', () => {
    const input = 'PRINT FN abs(5)';
    const tokens = lexer.tokenize(input).filter(t => t.type !== TokenType.EOF);

    const fnToken = tokens.find(t => t.value === 'FN');
    expect(fnToken).toBeDefined();
    expect(fnToken!.type).toBe(TokenType.KEYWORD);
  });
});
