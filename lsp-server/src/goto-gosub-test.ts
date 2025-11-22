// Test GO TO and GO SUB two-word forms
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCases = [
  {
    input: '10 GOTO 100',
    description: 'Single-word GOTO'
  },
  {
    input: '20 GO TO 100',
    description: 'Two-word GO TO'
  },
  {
    input: '30 GOSUB 1000',
    description: 'Single-word GOSUB'
  },
  {
    input: '40 GO SUB 1000',
    description: 'Two-word GO SUB'
  },
  {
    input: '50 GO',
    description: 'GO alone (not a keyword)'
  },
  {
    input: '60 LET GO = 5',
    description: 'GO as variable name'
  }
];

console.log('GO TO / GO SUB Two-Word Form Tests:\n');

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
  if (test.input.includes('GO TO')) {
    const gotoToken = tokens.find(t => t.value === 'GOTO');
    if (gotoToken) {
      console.log(`    ✓ "GO TO" normalized to "GOTO"`);
    } else {
      console.log(`    ✗ Failed to normalize "GO TO"`);
    }
  }
  
  if (test.input.includes('GO SUB')) {
    const gosubToken = tokens.find(t => t.value === 'GOSUB');
    if (gosubToken) {
      console.log(`    ✓ "GO SUB" normalized to "GOSUB"`);
    } else {
      console.log(`    ✗ Failed to normalize "GO SUB"`);
    }
  }
  
  console.log();
});

console.log('✅ All GO TO / GO SUB tests completed!');
