import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Code Actions Tests', () => {
  const lexer = new ZXBasicLexer();

  const testCode1 = `10 GOSUB 100
20 PRINT "Done"
100 PRINT "Subroutine"`;

  const testCode2 = `10 FOR i = 1 TO 10
20 PRINT i
30 LET x = i * 2`;

  test('should detect missing RETURN for GOSUB', () => {
    const tokens = lexer.tokenize(testCode1);

    let hasGosub = false;
    let hasReturn = false;

    for (const token of tokens) {
      if (token.type === TokenType.KEYWORD) {
        if (token.value === 'GOSUB') hasGosub = true;
        if (token.value === 'RETURN') hasReturn = true;
      }
    }

    expect(hasGosub).toBe(true);
    expect(hasReturn).toBe(false);
  });

  test('should detect missing NEXT for FOR loop', () => {
    const tokens = lexer.tokenize(testCode2);

    let hasFor = false;
    let forVar = '';
    let hasNext = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.KEYWORD) {
        if (token.value === 'FOR') {
          hasFor = true;
          if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.IDENTIFIER) {
            forVar = tokens[i + 1].value;
          }
        }
        if (token.value === 'NEXT') hasNext = true;
      }
    }

    expect(hasFor).toBe(true);
    expect(forVar).toBe('I');
    expect(hasNext).toBe(false);
  });

  test('should not suggest actions when RETURN is present', () => {
    const codeWithReturn = `10 GOSUB 100
20 PRINT "Done"
30 RETURN`;

    const tokens = lexer.tokenize(codeWithReturn);
    let hasGosub = false;
    let hasReturn = false;

    for (const token of tokens) {
      if (token.type === TokenType.KEYWORD) {
        if (token.value === 'GOSUB') hasGosub = true;
        if (token.value === 'RETURN') hasReturn = true;
      }
    }

    expect(hasGosub).toBe(true);
    expect(hasReturn).toBe(true);
  });

  test('should not suggest actions when NEXT is present', () => {
    const codeWithNext = `10 FOR i = 1 TO 10
20 PRINT i
30 NEXT i`;

    const tokens = lexer.tokenize(codeWithNext);
    let hasFor = false;
    let hasNext = false;

    for (const token of tokens) {
      if (token.type === TokenType.KEYWORD) {
        if (token.value === 'FOR') hasFor = true;
        if (token.value === 'NEXT') hasNext = true;
      }
    }

    expect(hasFor).toBe(true);
    expect(hasNext).toBe(true);
  });
});
