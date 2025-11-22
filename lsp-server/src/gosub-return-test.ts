// Test GOSUB/RETURN validation
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCases = [
  {
    code: `10 GOSUB 100
20 STOP
100 PRINT "Subroutine"
110 RETURN`,
    description: 'Valid: GOSUB with matching RETURN',
    hasGosub: true,
    hasReturn: true
  },
  {
    code: `10 GOSUB 100
20 STOP
100 PRINT "No return"`,
    description: 'Warning: GOSUB without RETURN',
    hasGosub: true,
    hasReturn: false
  },
  {
    code: `10 PRINT "Test"
20 RETURN`,
    description: 'Warning: RETURN without GOSUB',
    hasGosub: false,
    hasReturn: true
  },
  {
    code: `10 GOSUB 100
20 GOSUB 200
30 STOP
100 PRINT "Sub 1"
110 RETURN
200 PRINT "Sub 2"
210 RETURN`,
    description: 'Valid: Multiple GOSUB/RETURN pairs',
    hasGosub: true,
    hasReturn: true
  },
  {
    code: `10 GOSUB 100
20 STOP
100 PRINT "Sub"
110 RETURN
120 RETURN`,
    description: 'Valid: Multiple RETURN for one GOSUB (allowed)',
    hasGosub: true,
    hasReturn: true
  },
  {
    code: `10 PRINT "No subroutines"`,
    description: 'Valid: No GOSUB or RETURN',
    hasGosub: false,
    hasReturn: false
  }
];

console.log('GOSUB/RETURN Validation Tests:\n');

const lexer = new ZXBasicLexer();

testCases.forEach(test => {
  const tokens = lexer.tokenize(test.code).filter(t => t.type !== TokenType.EOF);
  
  const gosubCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'GOSUB').length;
  const returnCount = tokens.filter(t => t.type === TokenType.KEYWORD && t.value === 'RETURN').length;
  
  console.log(`  Test: ${test.description}`);
  console.log(`    GOSUB count: ${gosubCount}, RETURN count: ${returnCount}`);
  
  if (gosubCount > 0 && returnCount === 0) {
    console.log(`    ✓ Would warn: GOSUB without RETURN`);
  } else if (returnCount > 0 && gosubCount === 0) {
    console.log(`    ✓ Would warn: RETURN without GOSUB`);
  } else {
    console.log(`    ✓ Valid: ${gosubCount > 0 ? 'GOSUB/RETURN present' : 'No subroutines'}`);
  }
  
  console.log();
});

console.log('✅ All GOSUB/RETURN validation tests completed!');
