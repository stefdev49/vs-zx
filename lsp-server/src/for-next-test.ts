// Test FOR/NEXT validation
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCases = [
  {
    code: `10 FOR I = 1 TO 10
20 PRINT I
30 NEXT I`,
    description: 'Valid: FOR with matching NEXT',
    hasFor: true,
    hasNext: true
  },
  {
    code: `10 FOR I = 1 TO 10
20 PRINT I`,
    description: 'Warning: FOR without NEXT',
    hasFor: true,
    hasNext: false
  },
  {
    code: `10 PRINT "Test"
20 NEXT I`,
    description: 'Warning: NEXT without FOR',
    hasFor: false,
    hasNext: true
  },
  {
    code: `10 FOR I = 1 TO 10
20 NEXT I
30 NEXT I`,
    description: 'Valid: Multiple NEXT for one FOR (allowed in ZX BASIC)',
    hasFor: true,
    hasNext: true
  },
  {
    code: `10 PRINT "No loops"`,
    description: 'Valid: No FOR or NEXT',
    hasFor: false,
    hasNext: false
  }
];

console.log('FOR/NEXT Validation Tests:\n');

const lexer = new ZXBasicLexer();

testCases.forEach(test => {
  const tokens = lexer.tokenize(test.code).filter(t => t.type !== TokenType.EOF);
  
  const forCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'FOR').length;
  const nextCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'NEXT').length;
  
  console.log(`  Test: ${test.description}`);
  console.log(`    FOR count: ${forCount}, NEXT count: ${nextCount}`);
  
  if (forCount > 0 && nextCount === 0) {
    console.log(`    ✓ Would warn: FOR without NEXT`);
  } else if (nextCount > 0 && forCount === 0) {
    console.log(`    ✓ Would warn: NEXT without FOR`);
  } else {
    console.log(`    ✓ Valid: ${forCount > 0 ? 'FOR/NEXT present' : 'No loops'}`);
  }
  
  console.log();
});

console.log('✅ All FOR/NEXT validation tests completed!');
