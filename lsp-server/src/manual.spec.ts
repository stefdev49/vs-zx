import { ZXBasicLexer, ZXBasicParser, TokenType } from './zxbasic';

describe('ZX Basic Lexer and Parser Tests', () => {
  const lexer = new ZXBasicLexer();

  describe('ZX Basic Lexer', () => {
    test('Simple LET statement', () => {
      const code = 'LET A = 10';
      const tokens = lexer.tokenize(code);
      expect(tokens.length).toBe(5);
      expect(tokens[0].type).toBe(TokenType.KEYWORD);
      expect(tokens[0].value).toBe('LET');
      expect(tokens[1].value).toBe('A');
      expect(tokens[2].value).toBe('=');
      expect(tokens[3].value).toBe('10');
    });

    test('Arithmetic expressions', () => {
      const code = 'A = B + C * D';
      const tokens = lexer.tokenize(code);
      const nonEofTokens = tokens.filter(t => t.type !== TokenType.EOF);
      expect(nonEofTokens.length).toBe(7);
      expect(tokens[1].value).toBe('=');
      expect(tokens[3].value).toBe('+');
      expect(tokens[5].value).toBe('*');
    });

    test('String literals', () => {
      const code = 'PRINT "HELLO"';
      const tokens = lexer.tokenize(code);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('"HELLO"');
    });

    test('Keywords', () => {
      const code = 'IF THEN ELSE FOR TO';
      const tokens = lexer.tokenize(code);
      expect(tokens[0].value).toBe('IF');
      expect(tokens[1].value).toBe('THEN');
      expect(tokens[2].value).toBe('ELSE');
      expect(tokens[3].value).toBe('FOR');
      expect(tokens[4].value).toBe('TO');
    });

    test('REM comments', () => {
      const code = 'REM THIS IS A COMMENT';
      const tokens = lexer.tokenize(code);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe('REM THIS IS A COMMENT');
    });

    test('Complex operators', () => {
      const code = '<> <= >= =';
      const tokens = lexer.tokenize(code);
      expect(tokens[0].value).toBe('<>');
      expect(tokens[1].value).toBe('<=');
      expect(tokens[2].value).toBe('>=');
      expect(tokens[3].value).toBe('=');
    });
  });

  describe('ZX Basic Parser', () => {
    test('Simple arithmetic expression', () => {
      const code = '2 + 3 * 4';
      const tokens = lexer.tokenize(code);
      const parser = new ZXBasicParser(tokens);

      const ast = parser.parseExpression();
      expect(ast?.type).toBe('binary_expr');
      expect(ast?.operator).toBe('+');
      expect(ast?.left?.value).toBe("2");
      expect(ast?.right?.type).toBe('binary_expr');
      expect(ast?.right?.operator).toBe('*');
    });

    test('Function calls', () => {
      const code = 'SIN(X)';
      const tokens = lexer.tokenize(code);
      const parser = new ZXBasicParser(tokens);

      const ast = parser.parseExpression();
      expect(ast?.type).toBe('function');
      expect(ast?.name).toBe('SIN');
      expect(ast?.args?.length).toBe(1);
    });

    test('Comparison expressions', () => {
      const code = 'A > B AND C < D';
      const tokens = lexer.tokenize(code);
      const parser = new ZXBasicParser(tokens);

      const ast = parser.parseExpression();
      expect(ast?.type).toBe('binary_expr');
      expect(ast?.operator).toBe('AND');
    });

    test('Parenthesized expressions', () => {
      const code = '(1 + 2) * 3';
      const tokens = lexer.tokenize(code);
      const parser = new ZXBasicParser(tokens);

      const ast = parser.parseExpression();
      expect(ast?.type).toBe('binary_expr');
      expect(ast?.operator).toBe('*');
      expect(ast?.left?.type).toBe('binary_expr');
      expect(ast?.left?.operator).toBe('+');
    });

    test('Unary operators', () => {
      const code = '-A';
      const tokens = lexer.tokenize(code);
      const parser = new ZXBasicParser(tokens);

      const ast = parser.parseExpression();
      expect(ast?.type).toBe('unary_expr');
      expect(ast?.operator).toBe('-');
    });

    test('Array access', () => {
      const code = 'ARRAY(5)';
      const tokens = lexer.tokenize(code);
      const parser = new ZXBasicParser(tokens);

      const ast = parser.parseExpression();
      expect(ast?.type).toBe('function');
      expect(ast?.name).toBe('ARRAY');
      expect(ast?.args?.length).toBe(1);
    });
  });
});
