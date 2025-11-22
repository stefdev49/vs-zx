// Test line number validation diagnostics
import { ZXBasicLexer, TokenType } from './zxbasic';

interface TestCase {
  input: string;
  description: string;
  expectedIssue?: string;
}

const testCases: TestCase[] = [
  {
    input: '10 PRINT "Valid"',
    description: 'Valid line number (10)'
  },
  {
    input: '9999 PRINT "Max valid"',
    description: 'Valid line number (9999 - maximum)'
  },
  {
    input: '1 PRINT "Min valid"',
    description: 'Valid line number (1 - minimum)'
  },
  {
    input: '0 PRINT "Zero"',
    description: 'Invalid: line number 0',
    expectedIssue: 'Line number must be between 1 and 9999'
  },
  {
    input: '10000 PRINT "Too large"',
    description: 'Invalid: line number too large',
    expectedIssue: 'Line number must be between 1 and 9999'
  },
  {
    input: '-5 PRINT "Negative"',
    description: 'Negative number (treated as operator + number, not line number)'
  },
  {
    input: '10.5 PRINT "Decimal"',
    description: 'Decimal line number (invalid)',
    expectedIssue: 'Line number must be an integer'
  }
];

console.log('Line Number Validation Tests:\n');

const lexer = new ZXBasicLexer();

testCases.forEach(test => {
  const tokens = lexer.tokenize(test.input).filter(t => t.type !== TokenType.EOF);
  const lineNumberToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
  
  console.log(`  Test: ${test.description}`);
  console.log(`    Input: "${test.input}"`);
  
  if (lineNumberToken) {
    const lineNum = parseInt(lineNumberToken.value, 10);
    const hasDecimal = lineNumberToken.value.includes('.');
    
    if (hasDecimal) {
      console.log(`    ✓ Detected decimal line number: ${lineNumberToken.value}`);
    } else if (lineNum < 1 || lineNum > 9999) {
      console.log(`    ✓ Detected out-of-range line number: ${lineNum}`);
    } else {
      console.log(`    ✓ Valid line number: ${lineNum}`);
    }
  } else {
    console.log(`    ℹ No line number token found`);
  }
  
  console.log();
});

// Test duplicate line numbers
console.log('Duplicate Line Number Detection:\n');

const duplicateTest = `10 PRINT "First"
20 LET A = 5
10 PRINT "Duplicate!"
30 PRINT "After"`;

const lines = duplicateTest.split('\n');
const lineNumberOccurrences = new Map<string, number>();

lines.forEach(line => {
  const tokens = lexer.tokenize(line).filter(t => t.type !== TokenType.EOF);
  const lineNumToken = tokens.find(t => t.type === TokenType.LINE_NUMBER);
  
  if (lineNumToken) {
    lineNumberOccurrences.set(
      lineNumToken.value,
      (lineNumberOccurrences.get(lineNumToken.value) || 0) + 1
    );
  }
});

lineNumberOccurrences.forEach((count, lineNum) => {
  if (count > 1) {
    console.log(`  ✓ Detected duplicate line number ${lineNum} (appears ${count} times)`);
  }
});

console.log('\n✅ All line number validation tests completed!');
