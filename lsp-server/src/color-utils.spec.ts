import { describe, expect, it } from '@jest/globals';
import { ZXBasicLexer, TokenType } from './zxbasic';
import { isDrawingAttribute } from './color-utils';

const lexer = new ZXBasicLexer();

function findTokenIndex(code: string, keyword: string): number {
  const tokens = lexer.tokenize(code);
  return tokens.findIndex(token => token.type === TokenType.KEYWORD && token.value.toUpperCase() === keyword.toUpperCase());
}

describe('Drawing attribute detection', () => {
  it('detects PAPER attribute inside PLOT statements', () => {
    const code = '10 PLOT PAPER r;170,140';
    const tokens = lexer.tokenize(code);
    const index = findTokenIndex(code, 'PAPER');
    expect(index).toBeGreaterThan(-1);
    expect(isDrawingAttribute(tokens, index)).toBe(true);
  });

  it('detects PAPER attribute inside DRAW statements', () => {
    const code = '20 DRAW PAPER r;70,-35';
    const tokens = lexer.tokenize(code);
    const index = findTokenIndex(code, 'PAPER');
    expect(index).toBeGreaterThan(-1);
    expect(isDrawingAttribute(tokens, index)).toBe(true);
  });

  it('does not treat stand-alone PAPER statements as attributes', () => {
    const code = '30 PAPER 4';
    const tokens = lexer.tokenize(code);
    const index = findTokenIndex(code, 'PAPER');
    expect(index).toBeGreaterThan(-1);
    expect(isDrawingAttribute(tokens, index)).toBe(false);
  });
});
