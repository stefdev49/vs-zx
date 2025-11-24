import { ZXBasicLexer, TokenType } from './zxbasic';

describe('IF/THEN Validation', () => {
  const lexer = new ZXBasicLexer();

  const testCases = [
    {
      code: `10 IF A = 5 THEN PRINT "Equal"`,
      description: 'Valid: IF with THEN',
      expectedIFCount: 1,
      expectedTHENCount: 1,
      shouldHaveValidThen: true
    },
    {
      code: `10 IF A > 0 THEN GOTO 100`,
      description: 'Valid: IF THEN GOTO',
      expectedIFCount: 1,
      expectedTHENCount: 1,
      shouldHaveValidThen: true
    },
    {
      code: `10 IF A = 0 THEN LET X = 1`,
      description: 'Valid: IF THEN assignment',
      expectedIFCount: 1,
      expectedTHENCount: 1,
      shouldHaveValidThen: true
    },
    {
      code: `10 IF A = 5 PRINT "Missing THEN"`,
      description: 'Error: IF without THEN',
      expectedIFCount: 1,
      expectedTHENCount: 0,
      shouldHaveValidThen: false
    },
    {
      code: `20 IF X < 10 GOSUB 100`,
      description: 'Error: IF without THEN (GOSUB)',
      expectedIFCount: 1,
      expectedTHENCount: 0,
      shouldHaveValidThen: false
    },
    {
      code: `10 LET IF = 5`,
      description: 'Using IF as identifier (invalid in BASIC)',
      expectedIFCount: 1,
      expectedTHENCount: 0,
      shouldHaveValidThen: false
    },
    {
      code: `10 IF A: PRINT B
20 NEXT`,
      description: 'Valid: IF followed by colon (multi-statement)',
      expectedIFCount: 1,
      expectedTHENCount: 0,
      shouldHaveValidThen: true
    }
  ];

  function hasValidThen(tokens: any[]): boolean {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value === 'IF') {
        // Look for THEN or : until non-: STATEMENT_SEPARATOR or EOF
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === TokenType.EOF) break;
          if (tokens[j].type === TokenType.STATEMENT_SEPARATOR && tokens[j].value !== ':') break;
          if (tokens[j].type === TokenType.KEYWORD && tokens[j].value === 'THEN') {
            return true; // Found THEN
          } else if (tokens[j].value === ':') {
            return true; // Found colon, valid multi-statement IF
          }
        }
        // If reached STATEMENT_SEPARATOR without THEN or :, it's invalid
        return false;
      }
    }
    // No IF found
    return true; // According to test, if no IF, "if (ifCount > 0)" check
  }

  testCases.forEach((testCase) => {
    it(testCase.description, () => {
      const tokens = lexer.tokenize(testCase.code).filter(t => t.type !== TokenType.EOF);

      const ifCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'IF').length;
      const thenCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'THEN').length;

      expect(ifCount).toBe(testCase.expectedIFCount);
      expect(thenCount).toBe(testCase.expectedTHENCount);

      if (testCase.shouldHaveValidThen) {
        if (ifCount > 0) {
          expect(hasValidThen(tokens)).toBe(true);
        } else {
          expect(hasValidThen(tokens)).toBe(false); // No IF, so false is fine
        }
      } else {
        if (ifCount > 0) {
          expect(hasValidThen(tokens)).toBe(false);
        }
      }
    });
  });
});
