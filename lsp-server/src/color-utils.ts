import { Token, TokenType } from './zxbasic';

const drawingCommands = new Set(['PLOT', 'DRAW', 'CIRCLE']);
const attributeKeywords = new Set(['INK', 'PAPER']);

export function isDrawingAttribute(tokens: Token[], index: number): boolean {
  const token = tokens[index];

  if (!token || token.type !== TokenType.KEYWORD || !attributeKeywords.has(token.value.toUpperCase())) {
    return false;
  }

  for (let i = index - 1; i >= 0; i--) {
    const prev = tokens[i];
    if (!prev) {
      break;
    }

    if (prev.type === TokenType.STATEMENT_SEPARATOR || prev.type === TokenType.LINE_NUMBER || prev.type === TokenType.EOF) {
      break;
    }

    if (prev.type === TokenType.KEYWORD && drawingCommands.has(prev.value.toUpperCase())) {
      return true;
    }
  }

  return false;
}
