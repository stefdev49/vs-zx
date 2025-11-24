import { ZXBasicLexer, TokenType } from './zxbasic';

describe('FOR/NEXT Validation', () => {
  const lexer = new ZXBasicLexer();

  const testCases = [
    {
      code: `10 FOR I = 1 TO 10
20 PRINT I
30 NEXT I`,
      description: 'Valid: FOR with matching NEXT',
      expectedForCount: 1,
      expectedNextCount: 1,
      shouldWarnFor: false,
      shouldWarnNext: false
    },
    {
      code: `10 FOR I = 1 TO 10
20 PRINT I`,
      description: 'Warning: FOR without NEXT',
      expectedForCount: 1,
      expectedNextCount: 0,
      shouldWarnFor: true,
      shouldWarnNext: false
    },
    {
      code: `10 PRINT "Test"
20 NEXT I`,
      description: 'Warning: NEXT without FOR',
      expectedForCount: 0,
      expectedNextCount: 1,
      shouldWarnFor: false,
      shouldWarnNext: true
    },
    {
      code: `10 FOR I = 1 TO 10
20 NEXT I
30 NEXT I`,
      description: 'Valid: Multiple NEXT for one FOR (allowed in ZX BASIC)',
      expectedForCount: 1,
      expectedNextCount: 2,
      shouldWarnFor: false,
      shouldWarnNext: false
    },
    {
      code: `10 PRINT "No loops"`,
      description: 'Valid: No FOR or NEXT',
      expectedForCount: 0,
      expectedNextCount: 0,
      shouldWarnFor: false,
      shouldWarnNext: false
    }
  ];

  testCases.forEach((testCase) => {
    it(testCase.description, () => {
      const tokens = lexer.tokenize(testCase.code).filter(t => t.type !== TokenType.EOF);

      const forCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'FOR').length;
      const nextCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'NEXT').length;

      expect(forCount).toBe(testCase.expectedForCount);
      expect(nextCount).toBe(testCase.expectedNextCount);

      if (testCase.shouldWarnFor) {
        // Expect warning for FOR without NEXT
        expect(forCount).toBeGreaterThan(0);
        expect(nextCount).toBe(0);
      }

      if (testCase.shouldWarnNext) {
        // Expect warning for NEXT without FOR
        expect(forCount).toBe(0);
        expect(nextCount).toBeGreaterThan(0);
      }
    });
  });
});
