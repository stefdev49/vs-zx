import { TextEdit } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Token, TokenType, ZXBasicLexer } from "./zxbasic";
import { buildLineReferenceMap } from "./line-number-utils";

// Keywords that should be uppercased
export const BASIC_KEYWORDS = new Set([
  "PRINT",
  "LET",
  "IF",
  "THEN",
  "ELSE",
  "GOTO",
  "GOSUB",
  "RETURN",
  "FOR",
  "NEXT",
  "TO",
  "STEP",
  "REM",
  "STOP",
  "END",
  "INPUT",
  "DIM",
  "READ",
  "DATA",
  "RESTORE",
  "DEF",
  "FN",
  "RANDOMIZE",
  "USR",
  "LOAD",
  "SAVE",
  "VERIFY",
  "MERGE",
  "BEEP",
  "CIRCLE",
  "DRAW",
  "PLOT",
  "POKE",
  "RANDOMIZE",
  "RUN",
  "LIST",
  "NEW",
  "CONTINUE",
  "CLEAR",
  "CLS",
  "AND",
  "OR",
  "NOT",
  "AT",
  "TAB",
  "GO",
  "TO",
  "SUB",
  "LINE",
  "OPEN",
  "CLOSE",
  "ERASE",
  "ON",
  "ERROR",
  "RESUME",
  "OUT",
  "IN",
  "LLIST",
  "LPRINT",
  "COPY",
  "PAUSE",
  "BORDER",
  "INK",
  "PAPER",
  "FLASH",
  "BRIGHT",
  "INVERSE",
  "OVER",
  "ABS",
  "ACS",
  "ASN",
  "ATN",
  "COS",
  "EXP",
  "INT",
  "LN",
  "SGN",
  "SIN",
  "SQR",
  "TAN",
  "PI",
  "RND",
  "CHR$",
  "CODE",
  "LEN",
  "STR$",
  "VAL",
  "ASC",
  "PEEK",
  "POINTER",
  "SCREEN$",
  "ATTR",
  "POINT",
]);

// Operators that should be uppercased
export const BASIC_OPERATORS = new Set([
  "AND",
  "OR",
  "NOT",
  "XOR",
  "IMP",
  "EQV",
  "MOD",
]);

export type RenumberResult = {
  edits: TextEdit[];
  touchedLines: Set<number>;
  mappedLineCount: number;
};

/**
 * Uppercase keywords in BASIC source code
 * @param source - The BASIC source code
 * @returns Source code with keywords uppercased
 */
export function uppercaseKeywords(source: string): string {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(source);

  let result = "";
  let lastPos = 0;

  for (const token of tokens) {
    // Add the text before this token
    if (token.start > lastPos) {
      result += source.substring(lastPos, token.start);
    }

    // Add the token itself, uppercased if it's a keyword or operator
    if (
      token.type === TokenType.KEYWORD ||
      token.type === TokenType.OPERATOR ||
      token.type === TokenType.AND ||
      token.type === TokenType.OR ||
      token.type === TokenType.NOT
    ) {
      // For multi-word keywords like "GO TO", we need to handle them specially
      const originalText = source.substring(token.start, token.end);
      const upperValue = token.value.toUpperCase();

      // Handle special cases for multi-word keywords
      if (upperValue === "GOTO" && originalText.toLowerCase() === "go to") {
        result += "GO TO";
      } else if (
        upperValue === "GOSUB" &&
        originalText.toLowerCase() === "go sub"
      ) {
        result += "GO SUB";
      } else if (
        upperValue === "DEFFN" &&
        originalText.toLowerCase() === "def fn"
      ) {
        result += "DEF FN";
      } else {
        result += upperValue;
      }
    } else if (token.type === TokenType.COMMENT) {
      // For comments, uppercase the REM keyword but preserve the rest
      const commentText = source.substring(token.start, token.end);
      if (commentText.toLowerCase().startsWith("rem")) {
        result += "REM" + commentText.substring(3);
      } else {
        result += commentText;
      }
    } else {
      // Preserve original case for non-keywords
      result += source.substring(token.start, token.end);
    }

    lastPos = token.end;
  }

  // Add any remaining text after the last token
  if (lastPos < source.length) {
    result += source.substring(lastPos);
  }

  return result;
}

export function autoRenumberLines(
  document: TextDocument,
  startLine?: number,
  increment?: number,
): RenumberResult {
  const edits: TextEdit[] = [];
  const touchedLines = new Set<number>();
  const text = document.getText();
  const lines = text.split("\n");

  // Use provided parameters or defaults
  const start = startLine ?? 10;
  const inc = increment ?? 10;

  // Build a mapping of old line numbers to new line numbers
  const lineNumberMap = new Map<string, string>();
  let lineNum = start;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^(\d+)\s+/);
    if (match) {
      const oldLineNum = match[1];
      lineNumberMap.set(oldLineNum, lineNum.toString());
    }

    lineNum += inc;
  }

  // Now apply the renumbering with GOTO/GOSUB target updates
  lineNum = start;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^(\d+)\s+/);
    let newLine = line;

    if (match) {
      const oldLineNum = match[1];
      if (oldLineNum !== lineNum.toString()) {
        newLine = line.replace(/^\d+\s+/, `${lineNum} `);
      }
    } else {
      newLine = `${lineNum} ${line}`;
    }

    // Apply all line number replacements in one pass to avoid chain replacements
    // This regex matches GOTO/GOSUB/RUN/LIST/RESTORE followed by a line number
    newLine = newLine.replace(
      /\b(GOTO|GO\s+TO|GOSUB|GO\s+SUB|RUN|LIST|RESTORE)\s+(\d+)\b/gi,
      (match, keyword, lineNumber) => {
        const normalized = keyword.toUpperCase().replace(/\s+/g, "");
        // Map keyword variations to canonical form
        let keywordStr = normalized;
        if (normalized === "GOTO") keywordStr = "GOTO";
        else if (normalized === "GOSUB") keywordStr = "GOSUB";

        // Check if this line number has a mapping
        const mappedNumber = lineNumberMap.get(lineNumber);
        if (mappedNumber) {
          return `${keywordStr} ${mappedNumber}`;
        }

        // No mapping, keep original
        return match;
      },
    );

    const hadNumber = !!match;
    if (newLine !== line || hadNumber) {
      touchedLines.add(i);
      edits.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        newText: newLine,
      });
    }

    lineNum += inc;
  }

  return { edits, touchedLines, mappedLineCount: lineNumberMap.size };
}

export function formatLine(
  tokens: Token[],
  document: TextDocument,
): TextEdit | null {
  if (tokens.length === 0) {
    return null;
  }

  const line = tokens[0].line;
  const lineText = document
    .getText({
      start: { line, character: 0 },
      end: { line: line + 1, character: 0 },
    })
    .replace(/\n$/, "");

  let formatted = "";
  let prevToken: Token | null = null;

  for (const token of tokens) {
    if (prevToken) {
      if (prevToken.type === TokenType.LINE_NUMBER) {
        formatted += " ";
      } else if (
        token.type === TokenType.OPERATOR ||
        prevToken.type === TokenType.OPERATOR
      ) {
        if (
          !(
            token.type === TokenType.OPERATOR &&
            token.value === "-" &&
            (prevToken.type === TokenType.OPERATOR ||
              prevToken.type === TokenType.PUNCTUATION)
          )
        ) {
          formatted += " ";
        }
      } else if (prevToken.type === TokenType.KEYWORD) {
        formatted += " ";
      } else if (
        prevToken.type === TokenType.PUNCTUATION &&
        prevToken.value === ","
      ) {
        formatted += " ";
      } else if (
        token.type === TokenType.STATEMENT_SEPARATOR ||
        prevToken.type === TokenType.STATEMENT_SEPARATOR
      ) {
        formatted += " ";
      }
    }

    if (token.type === TokenType.KEYWORD) {
      formatted += token.value.toUpperCase();
    } else {
      formatted += token.value;
    }

    prevToken = token;
  }

  if (formatted !== lineText.trim()) {
    return {
      range: {
        start: { line, character: 0 },
        end: { line, character: lineText.length },
      },
      newText: formatted,
    };
  }

  return null;
}
