import { ZXBasicLexer, TokenType } from './zxbasic';

describe('GO TO / GO SUB Two-Word Form Tests', () => {
  const lexer = new ZXBasicLexer();

  const testCases = [
    {
      input: '10 GOTO 100',
      description: 'Single-word GOTO',
      shouldHaveGotoToken: true,
      shouldHaveGosubToken: false
    },
    {
      input: '20 GO TO 100',
      description: 'Two-word GO TO',
      shouldHaveGotoToken: true,
      shouldHaveGosubToken: false
    },
    {
      input: '30 GOSUB 1000',
      description: 'Single-word GOSUB',
      shouldHaveGotoToken: false,
      shouldHaveGosubToken: true
    },
    {
      input: '40 GO SUB 1000',
      description: 'Two-word GO SUB',
      shouldHaveGotoToken: false,
      shouldHaveGosubToken: true
    },
    {
      input: '50 GO',
      description: 'GO alone (not a keyword)',
      shouldHaveGotoToken: false,
      shouldHaveGosubToken: false
    },
    {
      input: '60 LET GO = 5',
      description: 'GO as variable name',
      shouldHaveGotoToken: false,
      shouldHaveGosubToken: false
    }
  ];

  testCases.forEach((testCase) => {
    it(testCase.description, () => {
      const tokens = lexer.tokenize(testCase.input).filter(t => t.type !== TokenType.EOF);

      const gotoToken = tokens.find(t => t.value === 'GOTO');
      const gosubToken = tokens.find(t => t.value === 'GOSUB');

      expect(!!gotoToken).toBe(testCase.shouldHaveGotoToken);
      expect(!!gosubToken).toBe(testCase.shouldHaveGosubToken);
    });
  });
});
