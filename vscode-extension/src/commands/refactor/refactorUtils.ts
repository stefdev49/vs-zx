import { TextDocument, Position, Range, TextEdit, window } from 'vscode';

/**
 * Common utilities for refactoring operations
 */

export interface RefactoringResult {
  success: boolean;
  edits?: TextEdit[];
  errorMessage?: string;
}

export function getCurrentDocument(): TextDocument | undefined {
  const activeEditor = window.activeTextEditor;
  return activeEditor?.document;
}

export function getSelectionRange(_document: TextDocument): Range | undefined {
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) return undefined;

  const selection = activeEditor.selection;
  return new Range(
    selection.start.line,
    selection.start.character,
    selection.end.line,
    selection.end.character,
  );
}

export function getWordAtPosition(
  _document: TextDocument,
  position: Position,
): { word: string; range: Range } | null {
  const lineText = _document.lineAt(position.line).text;
  let start = position.character;
  let end = position.character;

  // Expand left to find word start
  while (start > 0 && /[A-Za-z0-9_$%]/.test(lineText[start - 1])) {
    start--;
  }

  // Expand right to find word end
  while (end < lineText.length && /[A-Za-z0-9_$%]/.test(lineText[end])) {
    end++;
  }

  if (start === end) return null;

  return {
    word: lineText.slice(start, end),
    range: new Range(position.line, start, position.line, end),
  };
}

export function generateUniqueVariableName(
  baseName: string,
  document: TextDocument,
  excludeNames: string[] = [],
): string {
  const existingNames = new Set(excludeNames);
  const text = document.getText();

  // Extract all variable names from document
  const varRegex = /\b([A-Za-z][A-Za-z0-9_]*)[$%]?\b/g;
  let match;
  while ((match = varRegex.exec(text)) !== null) {
    existingNames.add(match[1].toUpperCase());
  }

  // Try base name first
  let candidate = baseName.toUpperCase();
  if (!existingNames.has(candidate)) {
    return candidate;
  }

  // Try with numbers
  let counter = 1;
  const maxAttempts = 1000;
  let attempts = 0;
  while (attempts < maxAttempts) {
    candidate = `${baseName}${counter}`.toUpperCase();
    if (!existingNames.has(candidate)) {
      return candidate;
    }
    counter++;
    attempts++;
  }

  // Fallback if we can't find a unique name
  return `${baseName}${Date.now()}`;
}

export function inferVariableType(expression: string): {
  type: 'string' | 'numeric' | 'integer';
  suffix: string;
} {
  // Check if expression contains string operations
  if (expression.includes('+') && expression.includes('$')) {
    return { type: 'string', suffix: '$' };
  }

  // Check if expression is numeric
  if (
    /^\d+$/.test(expression.trim()) ||
    expression.includes('+') ||
    expression.includes('-') ||
    expression.includes('*') ||
    expression.includes('/') ||
    expression.includes('(') ||
    expression.includes(')')
  ) {
    return { type: 'numeric', suffix: '' };
  }

  // Default to numeric
  return { type: 'numeric', suffix: '' };
}

export function isValidExpression(expression: string): boolean {
  if (!expression || expression.trim() === '') return false;

  // Basic validation - should not contain statements or line numbers
  const invalidPatterns = [
    /^\d+\s/,
    /\b(LET|PRINT|IF|FOR|GOTO|GOSUB)\b/i,
    /:/,
    /\bTHEN\b/i,
    /\bELSE\b/i,
  ];

  return !invalidPatterns.some((pattern) => pattern.test(expression));
}

export function getLineNumberAtPosition(
  document: TextDocument,
  position: Position,
): string | null {
  const lineText = document.lineAt(position.line).text;
  const lineNumberMatch = lineText.match(/^(\d+)/);
  return lineNumberMatch ? lineNumberMatch[1] : null;
}

export function findNextAvailableLineNumber(
  document: TextDocument,
  startFrom: number = 10,
): number {
  const text = document.getText();
  const lineNumbers = new Set<number>();

  // Extract all line numbers
  const regex = /^(\d+)/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    lineNumbers.add(parseInt(match[1]));
  }

  // Find next available
  let candidate = startFrom;
  while (lineNumbers.has(candidate)) {
    candidate += 10;
  }

  return candidate;
}
