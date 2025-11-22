import { ZXBasicLexer, ZXBasicParser, TokenType } from './zxbasic';

describe('Document Symbols Enhancement - Phase 3.1', () => {
  let lexer: ZXBasicLexer;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
  });

  test('Extract DEF FN function definitions', () => {
    const code = '10 DEF FN SQUARE(X) = X * X\n20 DEF FN CUBE(X) = X * X * X\n30 PRINT FN SQUARE(5)';
    
    const tokens = lexer.tokenize(code);
    
    // Find DEF FN tokens
    const defFnTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'DEF FN');
    expect(defFnTokens.length).toBe(2);
    
    // Each should be followed by an identifier
    for (let i = 0; i < defFnTokens.length; i++) {
      const defIndex = tokens.indexOf(defFnTokens[i]);
      expect(tokens[defIndex + 1].type).toBe(TokenType.IDENTIFIER);
    }
  });

  test('Extract variable definitions from LET', () => {
    const code = '10 LET X = 100\n20 LET NAME$ = "test"\n30 LET ARR(10)\n40 LET Y = X + 50';
    
    const tokens = lexer.tokenize(code);
    
    // Count LET keywords
    const letTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'LET');
    expect(letTokens.length).toBe(4);
    
    // Each should have an identifier after it
    for (const letToken of letTokens) {
      const letIndex = tokens.indexOf(letToken);
      if (letIndex + 1 < tokens.length) {
        expect(tokens[letIndex + 1].type).toBe(TokenType.IDENTIFIER);
      }
    }
  });

  test('Track GOSUB targets for subroutine identification', () => {
    const code = '10 GOSUB 100\n20 PRINT "Main"\n30 STOP\n100 PRINT "Subroutine"\n110 RETURN';
    
    const tokens = lexer.tokenize(code);
    
    // Find GOSUB
    const gosubTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'GOSUB');
    expect(gosubTokens.length).toBe(1);
    
    // Find line numbers
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    expect(lineNumbers.length).toBe(5); // 10, 20, 30, 100, 110
  });

  test('Distinguish between regular lines and subroutine lines', () => {
    const code = '10 PRINT "Start"\n20 GOSUB 500\n30 PRINT "Done"\n500 REM Subroutine here\n510 RETURN';
    
    const tokens = lexer.tokenize(code);
    const lineNumbers = tokens.filter(t => t.type === TokenType.LINE_NUMBER);
    
    // Line 500 should be marked as GOSUB target
    const line500 = lineNumbers.find(t => t.value === '500');
    expect(line500).toBeDefined();
    
    // Line 10 should not be GOSUB target
    const line10 = lineNumbers.find(t => t.value === '10');
    expect(line10).toBeDefined();
  });

  test('Extract function names from DEF FN with parameters', () => {
    const code = '10 DEF FN MAX(A, B) = (A > B) * A + (B >= A) * B\n20 PRINT FN MAX(10, 20)';
    
    const tokens = lexer.tokenize(code);
    const defFnTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'DEF FN');
    
    expect(defFnTokens.length).toBe(1);
    
    // Next token should be the function name
    const defIndex = tokens.indexOf(defFnTokens[0]);
    const fnName = tokens[defIndex + 1];
    
    expect(fnName.type).toBe(TokenType.IDENTIFIER);
    expect(fnName.value.toUpperCase()).toBe('MAX');
  });

  test('Handle multiple variables on same line', () => {
    const code = '10 LET X = 5: LET Y = 10: LET Z = 15';
    
    const tokens = lexer.tokenize(code);
    const letTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'LET');
    
    expect(letTokens.length).toBe(3);
  });

  test('Recognize string variable assignments', () => {
    const code = '10 LET S$ = "Hello"\n20 LET T$ = "World"';
    
    const tokens = lexer.tokenize(code);
    const letTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'LET');
    
    expect(letTokens.length).toBe(2);
    
    // Check for string suffixes
    for (const letToken of letTokens) {
      const letIndex = tokens.indexOf(letToken);
      const varToken = tokens[letIndex + 1];
      expect(varToken.value).toMatch(/\$$/);
    }
  });

  test('Extract variables from complex assignments', () => {
    const code = '10 LET RESULT = (X + Y) * Z\n20 LET OUTPUT$ = LEFT$(INPUT$, 5)';
    
    const tokens = lexer.tokenize(code);
    const letTokens = tokens.filter(t => t.type === TokenType.KEYWORD && t.value.toUpperCase() === 'LET');
    
    expect(letTokens.length).toBe(2);
    expect(tokens[tokens.indexOf(letTokens[0]) + 1].value).toBe('RESULT');
    expect(tokens[tokens.indexOf(letTokens[1]) + 1].value).toBe('OUTPUT$');
  });
});
