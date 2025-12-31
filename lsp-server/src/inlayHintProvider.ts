/**
 * Inlay Hint Provider for ZX Spectrum BASIC
 *
 * Provides inline hints for GOTO/GOSUB statements showing what's at the target line.
 * This helps developers understand code flow without navigating away.
 *
 * Example:
 *   30 GOSUB 1000  → "Calculate result"
 *   40 GOTO 50     → "Print output"
 */

import { InlayHint, InlayHintKind, Position } from 'vscode-languageserver/node';
import { Token, TokenType } from './zxbasic';

/**
 * Keywords that reference line numbers
 */
const LINE_REFERENCE_KEYWORDS = new Set(['GOTO', 'GOSUB', 'GO', 'RUN', 'LIST', 'RESTORE']);

/**
 * Information about a line reference (GOTO/GOSUB target)
 */
export interface LineReference {
  keyword: string;
  targetLineNumber: string;
  position: Position; // Position after the line number (where hint appears)
  line: number;
}

/**
 * Information about a line definition
 */
export interface LineDefinition {
  lineNumber: string;
  description: string; // REM content or first keyword
  line: number;
}

/**
 * Find all GOTO/GOSUB/RUN/LIST/RESTORE references in the tokens
 */
export function findLineReferences(tokens: Token[]): LineReference[] {
  const references: LineReference[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type !== TokenType.KEYWORD) {
      continue;
    }

    const keyword = token.value.toUpperCase();

    // Handle "GO TO" and "GO SUB" (two-word variants)
    if (keyword === 'GO') {
      const nextKeyword = findNextNonWhitespaceToken(tokens, i);
      if (nextKeyword && nextKeyword.token.type === TokenType.KEYWORD) {
        const nextValue = nextKeyword.token.value.toUpperCase();
        if (nextValue === 'TO' || nextValue === 'SUB') {
          const fullKeyword = `GO ${nextValue}`;
          const lineNumToken = findNextNumber(tokens, nextKeyword.index);
          if (lineNumToken) {
            references.push({
              keyword: fullKeyword,
              targetLineNumber: lineNumToken.token.value,
              position: {
                line: lineNumToken.token.line,
                character: lineNumToken.token.end,
              },
              line: lineNumToken.token.line,
            });
          }
          continue;
        }
      }
    }

    // Handle single-word keywords: GOTO, GOSUB, RUN, LIST, RESTORE
    if (LINE_REFERENCE_KEYWORDS.has(keyword) && keyword !== 'GO') {
      const lineNumToken = findNextNumber(tokens, i);
      if (lineNumToken) {
        references.push({
          keyword,
          targetLineNumber: lineNumToken.token.value,
          position: {
            line: lineNumToken.token.line,
            character: lineNumToken.token.end,
          },
          line: lineNumToken.token.line,
        });
      }
    }
  }

  return references;
}

/**
 * Build a map of line numbers to their descriptions
 */
export function buildLineDescriptionMap(tokens: Token[]): Map<string, LineDefinition> {
  const definitions = new Map<string, LineDefinition>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type !== TokenType.LINE_NUMBER) {
      continue;
    }

    const lineNumber = token.value;
    const description = getLineDescription(tokens, i);

    definitions.set(lineNumber, {
      lineNumber,
      description,
      line: token.line,
    });
  }

  return definitions;
}

/**
 * Get a description for a line (REM content or first keyword)
 */
function getLineDescription(tokens: Token[], lineNumberIndex: number): string {
  const lineNumberToken = tokens[lineNumberIndex];
  const targetLine = lineNumberToken.line;

  // Look for REM or first meaningful content on this line
  for (let i = lineNumberIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Stop if we've moved to a different line
    if (token.line !== targetLine) {
      break;
    }

    // If it's a COMMENT token, extract the text after REM
    // The lexer produces "REM comment text" as a single COMMENT token
    if (token.type === TokenType.COMMENT) {
      return extractRemContent(token.value);
    }

    // Otherwise return the first keyword or statement type
    if (token.type === TokenType.KEYWORD) {
      return token.value.toUpperCase();
    }

    // For LET statements, include the variable name
    if (token.type === TokenType.IDENTIFIER) {
      const nextToken = findNextToken(tokens, i);
      if (nextToken && nextToken.token.value === '=') {
        return `LET ${token.value}`;
      }
      return token.value;
    }
  }

  return '';
}

/**
 * Extract comment content from a REM token value
 * Input: "REM Main program" -> Output: "Main program"
 */
function extractRemContent(tokenValue: string): string {
  // Remove the "REM " prefix
  let content = tokenValue;
  if (content.toUpperCase().startsWith('REM')) {
    content = content.substring(3).trim();
  }

  // Truncate long comments
  if (content.length > 30) {
    return content.substring(0, 27) + '...';
  }
  return content;
}

/**
 * Extract REM comment content (for separate REM keyword + COMMENT tokens)
 * Note: The ZX BASIC lexer produces a single COMMENT token for REM lines
 */
function getRemContent(tokens: Token[], remIndex: number): string {
  const remToken = tokens[remIndex];
  const targetLine = remToken.line;
  const parts: string[] = [];

  for (let i = remIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Stop at line boundary
    if (token.line !== targetLine) {
      break;
    }

    // Stop at statement separator
    if (token.type === TokenType.STATEMENT_SEPARATOR) {
      break;
    }

    // Collect all content after REM
    if (token.type === TokenType.COMMENT) {
      parts.push(token.value);
    } else {
      parts.push(token.value);
    }
  }

  const content = parts.join('').trim();
  // Truncate long comments
  if (content.length > 30) {
    return content.substring(0, 27) + '...';
  }
  return content;
}

/**
 * Find the next token (skipping nothing since there are no whitespace tokens)
 */
function findNextToken(
  tokens: Token[],
  startIndex: number
): { token: Token; index: number } | null {
  if (startIndex + 1 < tokens.length) {
    return { token: tokens[startIndex + 1], index: startIndex + 1 };
  }
  return null;
}

/**
 * Find the next non-whitespace token
 * Note: The ZX BASIC lexer doesn't produce whitespace tokens, so this just finds the next token
 */
function findNextNonWhitespaceToken(
  tokens: Token[],
  startIndex: number
): { token: Token; index: number } | null {
  for (let i = startIndex + 1; i < tokens.length; i++) {
    return { token: tokens[i], index: i };
  }
  return null;
}

/**
 * Find the next number token (line number reference)
 */
function findNextNumber(
  tokens: Token[],
  startIndex: number
): { token: Token; index: number } | null {
  const startToken = tokens[startIndex];

  for (let i = startIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Stop at statement separator or line boundary for most keywords
    if (token.type === TokenType.STATEMENT_SEPARATOR) {
      break;
    }

    // Stop at new line number (start of new line)
    if (token.type === TokenType.LINE_NUMBER) {
      break;
    }

    // Found a number - this is the line reference
    if (token.type === TokenType.NUMBER) {
      // Make sure it's on the same line for single-statement keywords
      if (token.line === startToken.line || token.line === startToken.line + 1) {
        return { token, index: i };
      }
      break;
    }
  }

  return null;
}

/**
 * Find the effective target line for a line number reference.
 * In Sinclair BASIC, GOTO/GOSUB to a non-existent line jumps to the
 * first line number that is >= the target.
 */
function findEffectiveTarget(
  targetLineNumber: string,
  definitions: Map<string, LineDefinition>
): LineDefinition | null {
  // First try exact match
  const exact = definitions.get(targetLineNumber);
  if (exact) {
    return exact;
  }

  // Find the first line >= target (Sinclair BASIC behavior)
  const target = parseInt(targetLineNumber, 10);
  if (isNaN(target)) {
    return null;
  }

  // Get all line numbers, sort them, find first >= target
  const lineNumbers = Array.from(definitions.keys())
    .map(n => parseInt(n, 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  for (const lineNum of lineNumbers) {
    if (lineNum >= target) {
      return definitions.get(lineNum.toString()) || null;
    }
  }

  return null;
}

/**
 * Generate inlay hints for a document
 */
export function getInlayHints(tokens: Token[]): InlayHint[] {
  const references = findLineReferences(tokens);
  const definitions = buildLineDescriptionMap(tokens);
  const hints: InlayHint[] = [];

  for (const ref of references) {
    const definition = findEffectiveTarget(ref.targetLineNumber, definitions);

    if (!definition) {
      // Target line doesn't exist and no line after it exists either
      hints.push({
        position: ref.position,
        label: ' ⚠ undefined',
        kind: InlayHintKind.Type,
        paddingLeft: true,
      });
      continue;
    }

    // Skip if target is on the same line (self-reference)
    if (definition.line === ref.line) {
      continue;
    }

    // Skip if no description available
    if (!definition.description) {
      continue;
    }

    // Check if we're showing an indirect target (line doesn't exist exactly)
    const isIndirect = definition.lineNumber !== ref.targetLineNumber;
    const prefix = isIndirect ? ` → [${definition.lineNumber}] ` : ' → ';

    // Create the hint
    hints.push({
      position: ref.position,
      label: `${prefix}${definition.description}`,
      kind: InlayHintKind.Type,
      paddingLeft: true,
    });
  }

  return hints;
}
