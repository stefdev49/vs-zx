import { Range } from 'vscode-languageserver/node';
import { Token, TokenType } from './zxbasic';

/**
 * Locate all identifier tokens whose text matches the provided identifier (case-insensitive)
 * and return their ranges within the source.
 */
export function findIdentifierReferenceRanges(tokens: Token[], identifier: string): Range[] {
  const normalized = identifier.toUpperCase();
  const ranges: Range[] = [];

  for (const token of tokens) {
    if (token.type !== TokenType.IDENTIFIER) {
      continue;
    }

    if (token.value.toUpperCase() === normalized) {
      ranges.push({
        start: { line: token.line, character: token.start },
        end: { line: token.line, character: token.end }
      });
    }
  }

  return ranges;
}
