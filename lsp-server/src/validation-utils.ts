/**
 * Validation utilities for ZX BASIC syntax checking
 * This module provides standalone validation functions that can be used in tests
 * without requiring the full LSP server connection setup
 */

import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import { ZXBasicLexer, TokenType } from "./zxbasic";

export async function validateTextDocument(
  textDocument: TextDocument,
): Promise<Diagnostic[]> {
  const text = textDocument.getText();

  // Basic syntax validation using our tokenizer and parser
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  const diagnostics: Diagnostic[] = [];

  // Track line numbers for duplicate detection
  const lineNumbers = new Map<string, number[]>(); // lineNumber -> [line positions]

  // Check for invalid characters and basic syntax issues
  tokens.forEach((token) => {
    if (token.type === TokenType.INVALID) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: token.line, character: token.start },
          end: { line: token.line, character: token.end },
        },
        message: `Invalid character '${token.value}' in ZX BASIC code`,
        source: "zx-basic-lsp",
      });
    }

    // Validate variable names according to ZX BASIC rules
    if (token.type === TokenType.IDENTIFIER) {
      const variableName = token.value;

      // Check if this is a string variable (ends with $)
      if (variableName.endsWith("$")) {
        // ZX BASIC allows multi-character string variable names like NAME$
        // Only single character string variables like A$ are standard, but multi-character are common
        // We'll allow both for compatibility with real ZX BASIC programs
      }

      // Note: In standard Sinclair ZX BASIC, numeric variables don't have type suffixes
      // Only string variables end with $, numeric variables are just plain identifiers

      // Check if this is a numeric variable (ends with %)
      if (variableName.endsWith("%")) {
        const baseName = variableName.slice(0, -1);
        // ZX BASIC allows multi-character numeric variable names like COUNT%
        // Only single character numeric variables like A% are standard, but multi-character are common
        // We'll allow both for compatibility with real ZX BASIC programs
      }

      // Check for reserved keywords used as variable names
      // But only if they are not part of a string variable (like NAME$)
      const isStringVariable = variableName.endsWith("$");
      if (!isStringVariable) {
        const keywords = [
          "PRINT",
          "INPUT",
          "LET",
          "IF",
          "THEN",
          "ELSE",
          "FOR",
          "TO",
          "STEP",
          "NEXT",
          "GOTO",
          "GOSUB",
          "RETURN",
          "REM",
          "STOP",
          "END",
          "DIM",
          "READ",
          "DATA",
          "RESTORE",
          "DEF",
          "FN",
          "RANDOMIZE",
          "USR",
          "POKE",
          "PEEK",
          "IN",
          "OUT",
          "LOAD",
          "SAVE",
          "VERIFY",
          "MERGE",
          "BEEP",
          "CIRCLE",
          "DRAW",
          "PLOT",
          "RUN",
          "LIST",
          "LLIST",
          "NEW",
          "CONTINUE",
          "CLEAR",
          "CLS",
          "PAUSE",
          "POKE",
          "RANDOMIZE",
          "USR",
        ];

        if (keywords.includes(variableName.toUpperCase())) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: {
              start: { line: token.line, character: token.start },
              end: { line: token.line, character: token.end },
            },
            message: `Variable name '${variableName}' is a reserved keyword`,
            source: "zx-basic-lsp",
          });
        }
      }
    }

    // Track line numbers for duplicate detection
    if (token.type === TokenType.LINE_NUMBER) {
      const lineNumber = token.value;
      if (!lineNumbers.has(lineNumber)) {
        lineNumbers.set(lineNumber, []);
      }
      lineNumbers.get(lineNumber)?.push(token.line);
    }
  });

  // Check for duplicate line numbers
  lineNumbers.forEach((positions: number[], lineNumber: string) => {
    if (positions.length > 1) {
      positions.forEach((position: number) => {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: position, character: 0 },
            end: { line: position, character: lineNumber.length },
          },
          message: `Duplicate line number ${lineNumber}`,
          source: "zx-basic-lsp",
        });
      });
    }
  });

  return diagnostics;
}
