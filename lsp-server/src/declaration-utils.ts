import { Range } from 'vscode-languageserver/node';
import { ZXBasicLexer, Token, TokenType } from './zxbasic';

const assignmentKeywords = new Set(['LET', 'DIM', 'DEF FN']);

function normalizeName(name: string): string {
  return name.replace(/[$%]$/, '').toUpperCase();
}

function getSuffix(name: string): string {
  const match = name.match(/([$%])$/);
  return match ? match[1] : '';
}

function matchesIdentifier(token: Token, target: string, suffix: string): boolean {
  if (token.type !== TokenType.IDENTIFIER) {
    return false;
  }
  return normalizeName(token.value) === target && getSuffix(token.value) === suffix;
}

function createRangeFromToken(token: Token): Range {
  return {
    start: { line: token.line, character: token.start },
    end: { line: token.line, character: token.end }
  };
}

function isAssignmentContext(tokens: Token[], index: number): boolean {
  const token = tokens[index];
  for (let i = index + 1; i < tokens.length; i++) {
    const nextToken = tokens[i];
    if (nextToken.line !== token.line) {
      return false;
    }
    if (nextToken.type === TokenType.STATEMENT_SEPARATOR ||
        nextToken.type === TokenType.LINE_NUMBER) {
      return false;
    }
    if (nextToken.type === TokenType.PUNCTUATION && nextToken.value === '(') {
      return false;
    }
    if (nextToken.type === TokenType.OPERATOR && nextToken.value === '=') {
      return true;
    }
  }
  return false;
}

export function findDeclarationRange(text: string, rawName: string): Range | null {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const normalized = normalizeName(rawName);
  const suffix = getSuffix(rawName);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === TokenType.KEYWORD) {
      const keyword = token.value.toUpperCase();
      if ((keyword === 'LET' || keyword === 'DIM' || keyword === 'DEF FN') &&
          i + 1 < tokens.length &&
          matchesIdentifier(tokens[i + 1], normalized, suffix)) {
        return createRangeFromToken(tokens[i + 1]);
      }

      if (keyword === 'INPUT') {
        for (let j = i + 1; j < tokens.length; j++) {
          const nextToken = tokens[j];
          if (nextToken.line !== token.line ||
              nextToken.type === TokenType.STATEMENT_SEPARATOR ||
              nextToken.type === TokenType.LINE_NUMBER ||
              nextToken.type === TokenType.EOF) {
            break;
          }
          if (matchesIdentifier(nextToken, normalized, suffix)) {
            return createRangeFromToken(nextToken);
          }
        }
      }
      continue;
    }

    if (matchesIdentifier(token, normalized, suffix) && isAssignmentContext(tokens, i)) {
      return createRangeFromToken(token);
    }
  }

  return null;
}
