// Test DEF FN two-word form
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCases = [
  {
    input: '10 DEF FN f(x) = x * 2',
    description: 'Two-word DEF FN'
  },
  {
    input: '20 DEFFN g(a,b) = a + b',
    description: 'Single-word DEFFN (if supported)'
  },
  {
    input: '30 PRINT FN f(5)',
    description: 'FN in function call'
  },
  {
    input: '40 LET DEF = 10',
    description: 'DEF as variable name'
  },
  {
    input: '50 DEF',
    description: 'DEF alone'
  }
];

console.log('DEF FN Two-Word Form Tests:\n');

const lexer = new ZXBasicLexer();

testCases.forEach(test => {
  const tokens = lexer.tokenize(test.input).filter(t => t.type !== TokenType.EOF);
  
  console.log(`  Test: ${test.description}`);
  console.log(`    Input: "${test.input}"`);
  console.log(`    Tokens:`);
  
  tokens.forEach(token => {
    console.log(`      ${token.type.padEnd(25)} "${token.value}"`);
  });
  
  // Verify normalization
  if (test.input.includes('DEF FN')) {
    const deffnToken = tokens.find(t => t.value === 'DEFFN');
    if (deffnToken) {
      console.log(`    ✓ "DEF FN" normalized to "DEFFN"`);
    } else {
      console.log(`    ✗ Failed to normalize "DEF FN"`);
    }
  }
  
  console.log();
});

console.log('✅ All DEF FN tests completed!');
