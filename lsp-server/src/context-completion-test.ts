// Test context-aware line number completion
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCode = `10 PRINT "Start"
20 FOR I = 1 TO 5
30 PRINT I
40 NEXT I
50 GOSUB 100
60 GOTO 10

100 PRINT "Subroutine"
110 RETURN

120 REM Another section
130 STOP`;

console.log('Context-Aware Line Number Completion Test:\n');

const lexer = new ZXBasicLexer();
const tokens = lexer.tokenize(testCode);

// Extract all line numbers
const lineNumbers = new Set<string>();
for (const token of tokens) {
  if (token.type === TokenType.LINE_NUMBER) {
    lineNumbers.add(token.value);
  }
}

const sortedLineNumbers = Array.from(lineNumbers).sort((a, b) => parseInt(a) - parseInt(b));

console.log('  Found line numbers in document:');
sortedLineNumbers.forEach(lineNum => {
  console.log(`    ${lineNum}`);
});

// Simulate different completion contexts
const contextTests = [
  {
    linePrefix: '70 GOTO 1',
    expectedPrefix: '1',
    context: 'GOTO'
  },
  {
    linePrefix: '80 GOSUB ',
    expectedPrefix: '',
    context: 'GOSUB'
  },
  {
    linePrefix: '90 RUN 5',
    expectedPrefix: '5',
    context: 'RUN'
  },
  {
    linePrefix: '95 LIST 10',
    expectedPrefix: '10',
    context: 'LIST'
  },
  {
    linePrefix: '100 LET A = 5',
    expectedPrefix: '',
    context: 'Regular assignment (no context)'
  }
];

console.log('\nContext-aware completion scenarios:\n');

contextTests.forEach(test => {
  console.log(`  Scenario: ${test.context}`);
  console.log(`    Line: "${test.linePrefix}"`);
  
  const matches = sortedLineNumbers.filter(ln => ln.startsWith(test.expectedPrefix));
  console.log(`    Matching line numbers: ${matches.join(', ') || '(all)'}`);
  console.log();
});

console.log('✅ Context-aware completion test completed!');
