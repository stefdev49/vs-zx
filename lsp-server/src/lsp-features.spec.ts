import { ZXBasicLexer, TokenType } from './zxbasic';

// Simulate document symbols extraction
function extractDocumentSymbols(text: string) {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  const lineNumbers: string[] = [];
  const subroutines: string[] = [];

  // Collect line numbers
  for (const token of tokens) {
    if (token.type === TokenType.LINE_NUMBER) {
      lineNumbers.push(token.value);
    }
  }

  // Find GOSUB targets
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === TokenType.KEYWORD && tokens[i].value === 'GOSUB') {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === TokenType.NUMBER || tokens[j].type === TokenType.LINE_NUMBER) {
          subroutines.push(tokens[j].value);
          break;
        }
        if (tokens[j].type === TokenType.STATEMENT_SEPARATOR) break;
      }
    }
  }

  return { lineNumbers, subroutines };
}

// Test GOTO/GOSUB reference finding
function findReferences(text: string, targetLine: string) {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const references: { line: number; col: number; keyword: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === TokenType.KEYWORD &&
        ['GOTO', 'GOSUB', 'RUN', 'LIST'].includes(token.value)) {
      for (let j = i + 1; j < tokens.length; j++) {
        const next = tokens[j];
        if ((next.type === TokenType.NUMBER || next.type === TokenType.LINE_NUMBER) &&
            next.value === targetLine) {
          references.push({
            line: next.line,
            col: next.start,
            keyword: token.value
          });
          break;
        }
        if (next.type === TokenType.STATEMENT_SEPARATOR) break;
      }
    }
  }

  return references;
}

describe('LSP Features Integration Tests', () => {
  const testProgram = `10 REM Test
20 GOSUB 100
30 END
100 REM Subroutine
110 PRINT "Hello"
120 RETURN`;

  test('extractDocumentSymbols', () => {
    const result = extractDocumentSymbols(testProgram);
    expect(result.lineNumbers).toEqual(['10', '20', '30', '100', '110', '120']);
    expect(result.subroutines).toEqual(['100']);
  });

  test('findReferences', () => {
    const refs = findReferences(testProgram, '100');
    expect(refs).toHaveLength(1);
    expect(refs[0]).toEqual({
      line: 1, // Based on token.line (GOSUB 100 is on second line)
      col: expect.any(Number),
      keyword: 'GOSUB'
    });
  });
});
