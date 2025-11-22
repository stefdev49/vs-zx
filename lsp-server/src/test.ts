// Simple test runner for ZX Basic tokenizer and parser
import { ZXBasicLexer, ZXBasicParser, TokenType } from './zxbasic';

// Test results
let testsPassed = 0;
let testsTotal = 0;

function assert(condition: boolean, message: string) {
  testsTotal++;
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    console.log(`✗ ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  testsTotal++;
  if (actual === expected) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    console.log(`✗ ${message} (expected: ${expected}, actual: ${actual})`);
  }
}

// Test ZX Basic Lexer
console.log('\n--- Testing ZX Basic Lexer ---');

const lexer = new ZXBasicLexer();

// Test 1: Simple LET statement
{
  const code = 'LET A = 10';
  const tokens = lexer.tokenize(code);
  assertEquals(tokens.length, 6, 'should tokenize LET statement with 6 tokens');
  assertEquals(tokens[0].type, TokenType.KEYWORD, 'first token should be KEYWORD');
  assertEquals(tokens[0].value, 'LET', 'first token value should be LET');
  assertEquals(tokens[1].value, 'A', 'second token should be identifier A');
  assertEquals(tokens[2].value, '=', 'third token should be =');
  assertEquals(tokens[3].value, '10', 'fourth token should be number 10');
}

// Test 2: Arithmetic expressions
{
  const code = 'A = B + C * D';
  const tokens = lexer.tokenize(code);
  const nonEofTokens = tokens.filter(t => t.type !== TokenType.EOF);
  assertEquals(nonEofTokens.length, 6, 'should have 6 non-EOF tokens in arithmetic expression');
  assertEquals(tokens[3].value, '+', 'fourth token should be +');
  assertEquals(tokens[5].value, '*', 'sixth token should be *');
}

// Test 3: String literals
{
  const code = 'PRINT "HELLO"';
  const tokens = lexer.tokenize(code);
  assertEquals(tokens[2].type, TokenType.STRING, 'third token should be a string');
  assertEquals(tokens[2].value, '"HELLO"', 'string value should include quotes');
}

// Test 4: Keywords
{
  const code = 'IF THEN ELSE FOR TO';
  const tokens = lexer.tokenize(code);
  assertEquals(tokens[0].value, 'IF', 'first keyword should be IF');
  assertEquals(tokens[1].value, 'THEN', 'second keyword should be THEN');
  assertEquals(tokens[2].value, 'ELSE', 'third keyword should be ELSE');
  assertEquals(tokens[3].value, 'FOR', 'fourth keyword should be FOR');
  assertEquals(tokens[4].value, 'TO', 'fifth keyword should be TO');
}

// Test 5: REM comments
{
  const code = 'REM THIS IS A COMMENT';
  const tokens = lexer.tokenize(code);
  assertEquals(tokens[0].type, TokenType.COMMENT, 'first token should be a comment');
  assertEquals(tokens[0].value, 'REM THIS IS A COMMENT', 'comment should include REM');
}

// Test 6: Complex operators
{
  const code = '<> <= >= =';
  const tokens = lexer.tokenize(code);
  assertEquals(tokens[0].value, '<>', 'first operator should be <>');
  assertEquals(tokens[1].value, '<=', 'second operator should be <=');
  assertEquals(tokens[2].value, '>=', 'third operator should be >=');
  assertEquals(tokens[3].value, '=', 'fourth operator should be =');
}

// Test ZX Basic Parser
console.log('\n--- Testing ZX Basic Parser ---');

const parser = new ZXBasicParser([]);

// Test 1: Simple arithmetic expression
{
  const code = '2 + 3 * 4';
  const tokens = lexer.tokenize(code);
  parser['tokens'] = tokens;
  parser['currentIndex'] = 0;

  const ast = parser.parseExpression();
  assertEquals(ast?.type, 'binary_expr', 'should parse as binary expression');
  assertEquals(ast?.operator, '+', 'top operator should be +');
  assertEquals(ast?.left?.type, 'number', 'left side should be a number');
  assertEquals(ast?.right?.type, 'binary_expr', 'right side should be binary expression');
  assertEquals(ast?.right?.operator, '*', 'right side operator should be *');
}

// Test 2: Function calls
{
  const code = 'SIN(X)';
  const tokens = lexer.tokenize(code);
  parser['tokens'] = tokens;
  parser['currentIndex'] = 0;

  const ast = parser.parseExpression();
  assertEquals(ast?.type, 'function_call', 'should parse as function call');
  assertEquals(ast?.name, 'SIN', 'function name should be SIN');
  assertEquals(ast?.args?.length, 1, 'should have 1 argument');
}

// Test 3: Comparison expressions
{
  const code = 'A > B AND C < D';
  const tokens = lexer.tokenize(code);
  parser['tokens'] = tokens;
  parser['currentIndex'] = 0;

  const ast = parser.parseExpression();
  assertEquals(ast?.type, 'binary_expr', 'should parse as binary expression');
  assertEquals(ast?.operator, 'AND', 'operator should be AND');
}

// Test 4: Parenthesized expressions
{
  const code = '(1 + 2) * 3';
  const tokens = lexer.tokenize(code);
  parser['tokens'] = tokens;
  parser['currentIndex'] = 0;

  const ast = parser.parseExpression();
  assertEquals(ast?.type, 'binary_expr', 'should parse as binary expression');
  assertEquals(ast?.operator, '*', 'operator should be *');
  assertEquals(ast?.left?.type, 'parenthesized_expr', 'left side should be parenthesized expression');
}

// Test 5: Unary operators
{
  const code = '-A';
  const tokens = lexer.tokenize(code);
  parser['tokens'] = tokens;
  parser['currentIndex'] = 0;

  const ast = parser.parseExpression();
  assertEquals(ast?.type, 'unary_expr', 'should parse as unary expression');
  assertEquals(ast?.operator, '-', 'operator should be -');
}

// Test 6: Array access
{
  const code = 'ARRAY(5)';
  const tokens = lexer.tokenize(code);
  parser['tokens'] = tokens;
  parser['currentIndex'] = 0;

  const ast = parser.parseExpression();
  assertEquals(ast?.type, 'array_access', 'should parse as array access');
  assertEquals(ast?.name, 'ARRAY', 'array name should be ARRAY');
}

// Test Results
console.log(`\n=== Test Results: ${testsPassed}/${testsTotal} tests passed ===`);

if (testsPassed === testsTotal) {
  console.log('🎉 All tests passed! ZX Basic tokenizer and parser implementation complete.');
} else {
  console.log('❌ Some tests failed. Please review the implementation.');
}
