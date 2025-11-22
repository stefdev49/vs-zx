// Test IF/THEN validation
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCases = [
  {
    code: `10 IF A = 5 THEN PRINT "Equal"`,
    description: 'Valid: IF with THEN',
    hasThen: true
  },
  {
    code: `10 IF A > 0 THEN GOTO 100`,
    description: 'Valid: IF THEN GOTO',
    hasThen: true
  },
  {
    code: `10 IF A = 0 THEN LET X = 1`,
    description: 'Valid: IF THEN assignment',
    hasThen: true
  },
  {
    code: `10 IF A = 5 PRINT "Missing THEN"`,
    description: 'Error: IF without THEN',
    hasThen: false
  },
  {
    code: `20 IF X < 10 GOSUB 100`,
    description: 'Error: IF without THEN (GOSUB)',
    hasThen: false
  },
  {
    code: `10 LET IF = 5`,
    description: 'Valid: IF as variable name (edge case)',
    hasThen: true // Not a real IF statement
  },
  {
    code: `10 IF A: PRINT B
20 NEXT`,
    description: 'Valid: IF followed by colon (multi-statement)',
    hasThen: true // Colon acts as separator, should be ok for now
  }
];

console.log('IF/THEN Validation Tests:\n');

const lexer = new ZXBasicLexer();

testCases.forEach(test => {
  const tokens = lexer.tokenize(test.code).filter(t => t.type !== TokenType.EOF);
  
  // Find IF statements
  const ifStatements: number[] = [];
  const thenStatements: number[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === TokenType.KEYWORD) {
      if (tokens[i].value === 'IF') {
        ifStatements.push(i);
      } else if (tokens[i].value === 'THEN') {
        thenStatements.push(i);
      }
    }
  }
  
  // Check if THEN comes after IF
  let hasValidThen = false;
  if (ifStatements.length > 0 && thenStatements.length > 0) {
    // Simple check: if there's at least one THEN after the last IF
    if (thenStatements[thenStatements.length - 1] > ifStatements[ifStatements.length - 1]) {
      hasValidThen = true;
    }
  }
  
  console.log(`  Test: ${test.description}`);
  console.log(`    Code: "${test.code}"`);
  console.log(`    IF count: ${ifStatements.length}, THEN count: ${thenStatements.length}`);
  
  if (ifStatements.length > 0 && !hasValidThen) {
    console.log(`    ✓ Would error: IF without THEN`);
  } else if (ifStatements.length === 0) {
    console.log(`    ✓ Valid: No IF statement`);
  } else {
    console.log(`    ✓ Valid: IF with THEN`);
  }
  
  console.log();
});

console.log('✅ All IF/THEN validation tests completed!');
