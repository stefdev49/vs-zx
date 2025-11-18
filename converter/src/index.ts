// ZX BASIC Converter - converts text BASIC to tokenized binary format
// Inspired by zmakebas

import { allKeywords, basicKeywords, zx128Keywords, interface1Keywords, functions } from 'syntax-definitions/keywords';

// Token mapping (standard ZX Spectrum BASIC tokens)
const tokenMap: { [key: string]: number } = {
  'SPECTRUM': 0xA5, 'PLAY': 0xA6, 'RND': 0xA7, 'INKEY$': 0xA8, 'PI': 0xA9, 'FN': 0xAA,
  'POINT': 0xAB, 'SCREEN$': 0xAC, 'ATTR': 0xAD, 'AT': 0xAE, 'TAB': 0xAF, 'VAL$': 0xB0,
  'CODE': 0xB1, 'VAL': 0xB2, 'LEN': 0xB3, 'SIN': 0xB4, 'COS': 0xB5, 'TAN': 0xB6,
  'ASN': 0xB7, 'ACS': 0xB8, 'ATN': 0xB9, 'LN': 0xBA, 'EXP': 0xBB, 'INT': 0xBC,
  'SQR': 0xBD, 'SGN': 0xBE, 'ABS': 0xBF, 'PEEK': 0xC0, 'IN': 0xC1, 'USR': 0xC2,
  'STR$': 0xC3, 'CHR$': 0xC4, 'NOT': 0xC5, 'BIN': 0xC6, 'OR': 0xC7, 'AND': 0xC8,
  '<=': 0xC9, '>=': 0xCA, '<>': 0xCB, 'LINE': 0xCC, 'THEN': 0xCD, 'TO': 0xCE, 'STEP': 0xCF,
  'DEF FN': 0xD0, 'CAT': 0xD1, 'FORMAT': 0xD2, 'MOVE': 0xD3, 'ERASE': 0xD4, 'OPEN #': 0xD5, 'CLOSE #': 0xD6,
  'MERGE': 0xD7, 'VERIFY': 0xD8, 'BEEP': 0xD9, 'CIRCLE': 0xDA, 'INK': 0xDB, 'PAPER': 0xDC,
  'FLASH': 0xDD, 'BRIGHT': 0xDE, 'INVERSE': 0xDF, 'OVER': 0xE0, 'OUT': 0xE1, 'LPRINT': 0xE2, 'LLIST': 0xE3,
  'STOP': 0xE4, 'READ': 0xE5, 'DATA': 0xE6, 'RESTORE': 0xE7, 'NEW': 0xE8, 'BORDER': 0xE9, 'CONTINUE': 0xEA,
  'DIM': 0xEB, 'REM': 0xEC, 'FOR': 0xED, 'GOTO': 0xEE, 'GOSUB': 0xEF, 'INPUT': 0xF0,
  'LOAD': 0xF1, 'LIST': 0xF2, 'LET': 0xF3, 'PAUSE': 0xF4, 'NEXT': 0xF5, 'POKE': 0xF6,
  'PRINT': 0xF7, 'PLOT': 0xF8, 'RUN': 0xF9, 'SAVE': 0xFA, 'RANDOMIZE': 0xFB, 'IF': 0xFC,
  'CLS': 0xFD, 'DRAW': 0xFE, 'CLEAR': 0xFF
};

export function convertToBinary(basicText: string): Buffer {
  const lines = basicText.split('\n').filter(line => line.trim());
  const output: number[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s*(.*?)$/);
    if (!match) continue; // Skip invalid lines

    const lineNumber = parseInt(match[1], 10);
    const code = match[2].trim();

    if (lineNumber < 1 || lineNumber > 9999) {
      throw new Error(`Invalid line number: ${lineNumber}`);
    }

    // Line length placeholder (will be filled later)
    const lineStart = output.length;
    output.push(0, 0); // 2 bytes for length

    // Line number (2 bytes, little endian)
    output.push(lineNumber & 0xFF, lineNumber >> 8);

    // Tokenize the code
    const tokens = tokenizeLine(code);
    output.push(...tokens);

    // End of line
    output.push(0x0D);

    // Update line length
    const lineLen = output.length - lineStart - 2;
    output[lineStart] = lineLen; // LSB
    output[lineStart + 1] = lineLen >> 8; // MSB, should be 0 for short lines
  }

  // End of program
  output.push(0, 0);

  return Buffer.from(output);
}

function tokenizeLine(line: string): number[] {
  const tokens: number[] = [];
  let i = 0;

  while (i < line.length) {
    let found = false;

    // Check for keywords (longest first)
    const sortedKeywords = allKeywords.sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
      if (line.toUpperCase().startsWith(keyword.toUpperCase(), i)) {
        if (tokenMap[keyword]) {
          tokens.push(tokenMap[keyword]);
        } else {
          // If no token, output as letters
          tokens.push(...keyword.split('').map(c => c.charCodeAt(0)));
        }
        i += keyword.length;
        found = true;
        break;
      }
    }

    if (!found) {
      // Regular character
      tokens.push(line.charCodeAt(i));
      i++;
    }

    // Handle numbers, strings, etc. - simplified for now
    // In full implementation, would parse numeric literals, strings in quotes, etc.
  }

  return tokens;
}

// Note: This is a basic implementation. A full converter needs:
// - Proper parsing of expressions
// - Numeric literal encoding (5 bytes floating point)
// - String handling
// - Variable names
// - Full token set
// - Memory layout for ZX Spectrum (program storage address, etc.)
