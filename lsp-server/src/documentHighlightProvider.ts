/**
 * Document Highlight Provider for ZX Spectrum BASIC
 *
 * Provides document highlights when the cursor is on:
 * - Variables: highlights all occurrences (read/write)
 * - Line numbers: highlights the definition and all references (GOTO/GOSUB)
 * - DEF FN names: highlights definition and all FN calls
 *
 * Highlight kinds:
 * - Write: where a symbol is assigned (LET x=, DIM arr(), FOR i=)
 * - Read: where a symbol is used
 * - Text: general textual match (line number references)
 */

import {
  DocumentHighlight,
  DocumentHighlightKind,
  Position,
  Range,
} from 'vscode-languageserver/node';
import { Token, TokenType } from './zxbasic';

/**
 * Keywords that indicate a write/assignment context for the next identifier
 */
const WRITE_KEYWORDS = new Set(['LET', 'DIM', 'FOR', 'INPUT', 'READ', 'DEF']);

/**
 * Keywords that reference line numbers
 */
const LINE_REFERENCE_KEYWORDS = new Set(['GOTO', 'GOSUB', 'GO', 'RUN', 'LIST', 'RESTORE']);

/**
 * Find the token at the given position
 */
export function findTokenAtPosition(
  tokens: Token[],
  position: Position
): { token: Token; index: number } | null {
  // Adjust for 1-indexed character positions on lines after the first
  const adjustedCharacter = position.character + (position.line > 0 ? 1 : 0);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (
      token.line === position.line &&
      adjustedCharacter >= token.start &&
      adjustedCharacter < token.end
    ) {
      return { token, index: i };
    }
  }
  return null;
}

/**
 * Check if an identifier at the given index is in a write context
 */
function isWriteContext(tokens: Token[], identifierIndex: number): boolean {
  const identToken = tokens[identifierIndex];
  if (!identToken) return false;

  // Look backwards on the same line for assignment keywords
  for (let i = identifierIndex - 1; i >= 0; i--) {
    const token = tokens[i];

    // Stop at line boundary or statement separator
    if (token.line !== identToken.line || token.type === TokenType.STATEMENT_SEPARATOR) {
      break;
    }

    // Check if preceding keyword indicates write context
    if (token.type === TokenType.KEYWORD) {
      const keyword = token.value.toUpperCase();
      if (WRITE_KEYWORDS.has(keyword)) {
        return true;
      }
    }
  }

  // Check for assignment (identifier followed by =)
  const nextToken = tokens[identifierIndex + 1];
  if (nextToken && nextToken.value === '=' && nextToken.line === identToken.line) {
    // But not if it's part of a comparison (preceded by keyword like IF)
    for (let i = identifierIndex - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.line !== identToken.line || token.type === TokenType.STATEMENT_SEPARATOR) {
        break;
      }
      if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'IF') {
        return false; // It's a comparison, not assignment
      }
    }
    return true;
  }

  return false;
}

/**
 * Check if a NUMBER token is a line number reference (after GOTO/GOSUB/etc)
 */
function isLineNumberReference(tokens: Token[], tokenIndex: number): boolean {
  const token = tokens[tokenIndex];
  if (!token || token.type !== TokenType.NUMBER) {
    return false;
  }

  // Look backwards for a line reference keyword
  for (let i = tokenIndex - 1; i >= 0; i--) {
    const prevToken = tokens[i];

    // Stop at statement separator or different line
    if (prevToken.type === TokenType.STATEMENT_SEPARATOR || prevToken.type === TokenType.LINE_NUMBER) {
      break;
    }

    if (prevToken.type === TokenType.KEYWORD) {
      const keyword = prevToken.value.toUpperCase();
      // Handle "GO TO" and "GO SUB" as well as single keywords
      if (LINE_REFERENCE_KEYWORDS.has(keyword)) {
        return true;
      }
      if (keyword === 'TO' || keyword === 'SUB') {
        // Check if preceded by "GO"
        if (i > 0 && tokens[i - 1].type === TokenType.KEYWORD && tokens[i - 1].value.toUpperCase() === 'GO') {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get all highlights for an identifier (variable, array, function)
 */
function getIdentifierHighlights(
  tokens: Token[],
  identifierName: string
): DocumentHighlight[] {
  const highlights: DocumentHighlight[] = [];
  const normalizedName = identifierName.toUpperCase();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type !== TokenType.IDENTIFIER) {
      continue;
    }

    if (token.value.toUpperCase() !== normalizedName) {
      continue;
    }

    const kind = isWriteContext(tokens, i)
      ? DocumentHighlightKind.Write
      : DocumentHighlightKind.Read;

    highlights.push({
      range: {
        start: { line: token.line, character: token.start },
        end: { line: token.line, character: token.end },
      },
      kind,
    });
  }

  return highlights;
}

/**
 * Get all highlights for a line number (definition and references)
 */
function getLineNumberHighlights(
  tokens: Token[],
  lineNumberValue: string
): DocumentHighlight[] {
  const highlights: DocumentHighlight[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Line number definition
    if (token.type === TokenType.LINE_NUMBER && token.value === lineNumberValue) {
      highlights.push({
        range: {
          start: { line: token.line, character: token.start },
          end: { line: token.line, character: token.end },
        },
        kind: DocumentHighlightKind.Text,
      });
    }

    // Line number reference (after GOTO/GOSUB/etc)
    if (token.type === TokenType.NUMBER && token.value === lineNumberValue) {
      if (isLineNumberReference(tokens, i)) {
        highlights.push({
          range: {
            start: { line: token.line, character: token.start },
            end: { line: token.line, character: token.end },
          },
          kind: DocumentHighlightKind.Text,
        });
      }
    }
  }

  return highlights;
}

/**
 * Get all highlights for a DEF FN function name
 * Note: The lexer produces "DEFFN" as a single token for definitions
 * and "FN" as a separate token for function calls
 */
function getDefFnHighlights(
  tokens: Token[],
  fnName: string
): DocumentHighlight[] {
  const highlights: DocumentHighlight[] = [];
  const normalizedName = fnName.toUpperCase();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Look for DEFFN definitions (lexer combines DEF FN into single token)
    if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DEFFN') {
      // Find function name after DEFFN
      const nameToken = findNextIdentifier(tokens, i);
      if (nameToken && nameToken.token.value.toUpperCase() === normalizedName) {
        highlights.push({
          range: {
            start: { line: nameToken.token.line, character: nameToken.token.start },
            end: { line: nameToken.token.line, character: nameToken.token.end },
          },
          kind: DocumentHighlightKind.Write,
        });
      }
    }

    // Look for FN calls (FN followed by identifier)
    if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'FN') {
      const nameToken = findNextIdentifier(tokens, i);
      if (nameToken && nameToken.token.value.toUpperCase() === normalizedName) {
        highlights.push({
          range: {
            start: { line: nameToken.token.line, character: nameToken.token.start },
            end: { line: nameToken.token.line, character: nameToken.token.end },
          },
          kind: DocumentHighlightKind.Read,
        });
      }
    }
  }

  return highlights;
}

/**
 * Find the next identifier token
 */
function findNextIdentifier(
  tokens: Token[],
  startIndex: number
): { token: Token; index: number } | null {
  const startToken = tokens[startIndex];

  for (let i = startIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Stay on same line
    if (token.line !== startToken.line) {
      break;
    }

    if (token.type === TokenType.IDENTIFIER) {
      return { token, index: i };
    }
  }

  return null;
}

/**
 * Check if the cursor is on a DEF FN function name or FN call name
 * Note: The lexer produces "DEFFN" for definitions and "FN" for calls
 */
function isOnDefFnName(tokens: Token[], tokenIndex: number): boolean {
  const token = tokens[tokenIndex];
  if (token.type !== TokenType.IDENTIFIER) {
    return false;
  }

  // Look back for DEFFN or FN keyword
  for (let i = tokenIndex - 1; i >= 0; i--) {
    const prevToken = tokens[i];

    if (prevToken.line !== token.line) {
      break;
    }

    if (prevToken.type === TokenType.KEYWORD) {
      const keyword = prevToken.value.toUpperCase();
      if (keyword === 'DEFFN' || keyword === 'FN') {
        return true;
      }
    }

    // Stop at punctuation (e.g., open paren means we're past the function name)
    if (prevToken.type === TokenType.PUNCTUATION) {
      break;
    }
  }

  return false;
}

/**
 * Get the function name if cursor is on an FN call
 */
function getFnCallName(tokens: Token[], tokenIndex: number): string | null {
  const token = tokens[tokenIndex];

  // If on FN keyword, get the following identifier
  if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'FN') {
    const nextIdent = findNextIdentifier(tokens, tokenIndex);
    if (nextIdent) {
      return nextIdent.token.value;
    }
  }

  // If on identifier after FN
  if (token.type === TokenType.IDENTIFIER && isOnDefFnName(tokens, tokenIndex)) {
    return token.value;
  }

  return null;
}

/**
 * Main function to get document highlights at a position
 */
export function getDocumentHighlights(
  tokens: Token[],
  position: Position
): DocumentHighlight[] {
  const tokenResult = findTokenAtPosition(tokens, position);

  if (!tokenResult) {
    return [];
  }

  const { token, index } = tokenResult;

  // Handle identifiers (variables, arrays)
  if (token.type === TokenType.IDENTIFIER) {
    // Check if it's a DEF FN name
    if (isOnDefFnName(tokens, index)) {
      return getDefFnHighlights(tokens, token.value);
    }
    return getIdentifierHighlights(tokens, token.value);
  }

  // Handle FN keyword (to highlight function calls)
  if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'FN') {
    const fnName = getFnCallName(tokens, index);
    if (fnName) {
      return getDefFnHighlights(tokens, fnName);
    }
  }

  // Handle DEFFN keyword (to highlight function definitions)
  if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DEFFN') {
    const nameToken = findNextIdentifier(tokens, index);
    if (nameToken) {
      return getDefFnHighlights(tokens, nameToken.token.value);
    }
  }

  // Handle line numbers (definitions)
  if (token.type === TokenType.LINE_NUMBER) {
    return getLineNumberHighlights(tokens, token.value);
  }

  // Handle line number references (after GOTO/GOSUB)
  if (token.type === TokenType.NUMBER && isLineNumberReference(tokens, index)) {
    return getLineNumberHighlights(tokens, token.value);
  }

  return [];
}
