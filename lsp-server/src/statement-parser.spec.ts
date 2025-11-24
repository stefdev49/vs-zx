import { ZXBasicLexer, ZXBasicParser } from './zxbasic';

describe('Statement Parser - Phase 1.3', () => {
  let lexer: ZXBasicLexer;
  let parser: ZXBasicParser;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
    parser = new ZXBasicParser([]);
  });

  test('Parse LET statement', () => {
    const code = '10 LET X = 5 + 3';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1)); // Skip line number
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('let_statement');
    expect(stmt?.variable).toBe('X');
    expect(stmt?.expression).not.toBeNull();
  });

  test('Parse PRINT statement', () => {
    const code = '20 PRINT "Hello"; X; Y';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('print_statement');
    expect(Array.isArray(stmt?.expressions)).toBe(true);
    expect(stmt?.expressions?.length).toBeGreaterThan(0);
  });

  test('Parse INPUT statement', () => {
    const code = '30 INPUT X, Y, Z';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('input_statement');
    expect(stmt?.variables).toEqual(['X', 'Y', 'Z']);
  });

  test('Parse IF THEN statement', () => {
    const code = '40 IF X > 5 THEN LET Y = 10';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('if_statement');
    expect(stmt?.condition).not.toBeNull();
    expect(stmt?.thenStatement).not.toBeNull();
  });

  test('Parse FOR statement', () => {
    const code = '50 FOR I = 1 TO 10 STEP 2';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('for_statement');
    expect(stmt?.variable).toBe('I');
    expect(stmt?.start).not.toBeNull();
    expect(stmt?.end).not.toBeNull();
    expect(stmt?.step).not.toBeNull();
  });

  test('Parse FOR statement without STEP', () => {
    const code = '51 FOR J = 1 TO 20';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('for_statement');
    expect(stmt?.variable).toBe('J');
    expect(stmt?.step).toBeNull();
  });

  test('Parse DIM statement with single dimension', () => {
    const code = '60 DIM A(10)';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('dim_statement');
    expect(Array.isArray(stmt?.arrays)).toBe(true);
    expect(stmt?.arrays?.[0].name).toBe('A');
    expect(stmt?.arrays?.[0].dimensions.length).toBe(1);
  });

  test('Parse DIM statement with multiple dimensions', () => {
    const code = '61 DIM B(5, 10, 3)';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('dim_statement');
    expect(stmt?.arrays?.[0].name).toBe('B');
    expect(stmt?.arrays?.[0].dimensions.length).toBe(3);
  });

  test('Parse DIM statement with multiple arrays', () => {
    const code = '62 DIM C(20), D(5, 5), E(3)';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('dim_statement');
    expect(stmt?.arrays?.length).toBe(3);
    expect(stmt?.arrays?.[0].name).toBe('C');
    expect(stmt?.arrays?.[1].name).toBe('D');
    expect(stmt?.arrays?.[2].name).toBe('E');
  });

  test('Parse GOTO statement', () => {
    const code = '70 GOTO 100';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('goto_statement');
    expect(stmt?.lineNumber).toBe('100');
  });

  test('Parse GOSUB statement', () => {
    const code = '80 GOSUB 200';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('gosub_statement');
    expect(stmt?.lineNumber).toBe('200');
  });

  test('Parse READ statement', () => {
    const code = '90 READ X, Y, Z';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('read_statement');
    expect(stmt?.variables).toEqual(['X', 'Y', 'Z']);
  });

  test('Parse DATA statement', () => {
    const code = '100 DATA 10, 20, 30';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).not.toBeNull();
    expect(stmt?.type).toBe('data_statement');
    expect(stmt?.values).toEqual([10, 20, 30]);
  });

  test('Parse null for non-statement keywords', () => {
    const code = '110 NEXT I';
    const tokens = lexer.tokenize(code);
    parser.setTokens(tokens.slice(1));
    
    const stmt = parser.parseStatement();
    expect(stmt).toBeNull();
  });
});
