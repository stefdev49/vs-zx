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
      description: 'Valid: IF as variable name (edge case)',
      expectedIFCount: 0,
      expectedTHENCount: 0,
      shouldHaveValidThen: true
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
    const ifStatements: number[] = [];
    const thenStatements: number[] = [];

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD) {
        if (tokens[i].value === 'IF') {
          ifStatements.push(i);
        } else if (tokens[i].value === 'THEN') {
          thenStatements.push(i);
        }
      }
    }

    if (ifStatements.length > 0 && thenStatements.length > 0) {
      // Simple check: if there's at least one THEN after the last IF
      return thenStatements[thenStatements.length - 1] > ifStatements[ifStatements.length - 1];
    }
    return false;
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
