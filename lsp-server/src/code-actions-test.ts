// Test code actions
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCode1 = `10 GOSUB 100
20 PRINT "Done"
100 PRINT "Subroutine"`;

const testCode2 = `10 FOR i = 1 TO 10
20 PRINT i
30 LET x = i * 2`;

console.log('=== Code Actions Test ===\n');

// Test 1: Missing RETURN
console.log('Test 1: GOSUB without RETURN');
const lexer = new ZXBasicLexer();
const tokens1 = lexer.tokenize(testCode1);

let hasGosub = false;
let hasReturn = false;

for (const token of tokens1) {
  if (token.type === TokenType.KEYWORD) {
    if (token.value === 'GOSUB') hasGosub = true;
    if (token.value === 'RETURN') hasReturn = true;
  }
}

console.log(`  GOSUB found: ${hasGosub ? '✓' : '✗'}`);
console.log(`  RETURN found: ${hasReturn ? '✓' : '✗'}`);
if (hasGosub && !hasReturn) {
  console.log(`  → Suggest action: Add RETURN\n`);
}

// Test 2: Missing NEXT
console.log('Test 2: FOR without NEXT');
const tokens2 = lexer.tokenize(testCode2);

let hasFor = false;
let forVar = '';
let hasNext = false;

for (let i = 0; i < tokens2.length; i++) {
  const token = tokens2[i];
  if (token.type === TokenType.KEYWORD) {
    if (token.value === 'FOR') {
      hasFor = true;
      if (i + 1 < tokens2.length && tokens2[i + 1].type === TokenType.IDENTIFIER) {
        forVar = tokens2[i + 1].value;
      }
    }
    if (token.value === 'NEXT') hasNext = true;
  }
}

console.log(`  FOR found: ${hasFor ? '✓' : '✗'}${forVar ? ` (${forVar})` : ''}`);
console.log(`  NEXT found: ${hasNext ? '✓' : '✗'}`);
if (hasFor && !hasNext) {
  console.log(`  → Suggest action: Add NEXT ${forVar}\n`);
}

console.log('✅ Code actions test complete!');
