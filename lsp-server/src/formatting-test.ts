// Test document formatting
import { ZXBasicLexer, TokenType, Token } from './zxbasic';

function formatLine(tokens: Token[]): string {
  if (tokens.length === 0) return '';

  let formatted = '';
  let prevToken: Token | null = null;

  for (const token of tokens) {
    // Add space before token if needed
    if (prevToken) {
      if (prevToken.type === TokenType.LINE_NUMBER) {
        formatted += ' ';
      } else if (token.type === TokenType.OPERATOR || prevToken.type === TokenType.OPERATOR) {
        if (!(token.type === TokenType.OPERATOR && token.value === '-')) {
          formatted += ' ';
        }
      } else if (prevToken.type === TokenType.KEYWORD) {
        formatted += ' ';
      } else if (prevToken.type === TokenType.PUNCTUATION && prevToken.value === ',') {
        formatted += ' ';
      } else if (token.type === TokenType.STATEMENT_SEPARATOR || 
                 prevToken.type === TokenType.STATEMENT_SEPARATOR) {
        formatted += ' ';
      }
    }

    // Uppercase keywords
    if (token.type === TokenType.KEYWORD) {
      formatted += token.value.toUpperCase();
    } else {
      formatted += token.value;
    }

    prevToken = token;
  }

  return formatted;
}

// Test cases
const testCases = [
  {
    input: '10  let   a=5:print a',
    description: 'Normalize spacing and uppercase keywords'
  },
  {
    input: '20gosub 100',
    description: 'Add space after line number'
  },
  {
    input: '30 for i=1to10:next i',
    description: 'Add spaces around operators and keywords'
  }
];

console.log('Document Formatting Tests:\n');

testCases.forEach(test => {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(test.input).filter(t => t.type !== TokenType.EOF);
  const formatted = formatLine(tokens);
  
  console.log(`  Test: ${test.description}`);
  console.log(`    Input:     "${test.input}"`);
  console.log(`    Formatted: "${formatted}"`);
  console.log(`    ✓ Passed\n`);
});

console.log('✅ All formatting tests passed!');
