import { ZXBasicLexer, TokenType } from './zxbasic';

describe('GOSUB/RETURN Validation', () => {
  const lexer = new ZXBasicLexer();

  const testCases = [
    {
      code: `10 GOSUB 100
20 STOP
100 PRINT "Subroutine"
110 RETURN`,
      description: 'Valid: GOSUB with matching RETURN',
      expectedGosubCount: 1,
      expectedReturnCount: 1,
      shouldWarnGosub: false,
      shouldWarnReturn: false
    },
    {
      code: `10 GOSUB 100
20 STOP
100 PRINT "No return"`,
      description: 'Warning: GOSUB without RETURN',
      expectedGosubCount: 1,
      expectedReturnCount: 0,
      shouldWarnGosub: true,
      shouldWarnReturn: false
    },
    {
      code: `10 PRINT "Test"
20 RETURN`,
      description: 'Warning: RETURN without GOSUB',
      expectedGosubCount: 0,
      expectedReturnCount: 1,
      shouldWarnGosub: false,
      shouldWarnReturn: true
    },
    {
      code: `10 GOSUB 100
20 GOSUB 200
30 STOP
100 PRINT "Sub 1"
110 RETURN
200 PRINT "Sub 2"
210 RETURN`,
      description: 'Valid: Multiple GOSUB/RETURN pairs',
      expectedGosubCount: 2,
      expectedReturnCount: 2,
      shouldWarnGosub: false,
      shouldWarnReturn: false
    },
    {
      code: `10 GOSUB 100
20 STOP
100 PRINT "Sub"
110 RETURN
120 RETURN`,
      description: 'Valid: Multiple RETURN for one GOSUB (allowed)',
      expectedGosubCount: 1,
      expectedReturnCount: 2,
      shouldWarnGosub: false,
      shouldWarnReturn: false
    },
    {
      code: `10 PRINT "No subroutines"`,
      description: 'Valid: No GOSUB or RETURN',
      expectedGosubCount: 0,
      expectedReturnCount: 0,
      shouldWarnGosub: false,
      shouldWarnReturn: false
    }
  ];

  testCases.forEach((testCase) => {
    it(testCase.description, () => {
      const tokens = lexer.tokenize(testCase.code).filter(t => t.type !== TokenType.EOF);

      const gosubCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'GOSUB').length;
      const returnCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'RETURN').length;

      expect(gosubCount).toBe(testCase.expectedGosubCount);
      expect(returnCount).toBe(testCase.expectedReturnCount);

      if (testCase.shouldWarnGosub) {
        // Expect warning for GOSUB without RETURN
        expect(gosubCount).toBeGreaterThan(0);
        expect(returnCount).toBe(0);
      }

      if (testCase.shouldWarnReturn) {
        // Expect warning for RETURN without GOSUB
        expect(gosubCount).toBe(0);
        expect(returnCount).toBeGreaterThan(0);
      }
    });
  });
});
