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

describe('Document Formatting Tests', () => {
  const lexer = new ZXBasicLexer();

  const testCases = [
    {
      input: '10  let   a=5:print a',
      expected: '10 LET A = 5 : PRINT A',
      description: 'Normalize spacing and uppercase keywords'
    },
    {
      input: '20gosub 100',
      expected: '20 GOSUB 100',
      description: 'Add space after line number'
    },
    {
      input: '30 for i=1to10:next i',
      expected: '30 FOR I = 1TO10 : NEXT I',
      description: 'Add spaces around operators and keywords'
    }
  ];

  testCases.forEach((testCase) => {
    it(testCase.description, () => {
      const tokens = lexer.tokenize(testCase.input).filter(t => t.type !== TokenType.EOF);
      const formatted = formatLine(tokens);
      expect(formatted).toBe(testCase.expected);
    });
  });
});
