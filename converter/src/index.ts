// ZX BASIC Converter - converts text BASIC to tokenized binary format
// Inspired by zmakebas

import { allKeywords, basicKeywords, zx128Keywords, interface1Keywords, functions } from 'syntax-definitions/keywords';

// Token mapping (standard ZX Spectrum BASIC tokens)
const tokenMap: { [key: string]: number } = {
  'LOAD': 0xEF,
  'SAVE': 0xF8,
  'RUN': 0xF7,
  'LIST': 0xED,
  'PRINT': 0xF5,
  // Add more standard tokens...
  'REM': 0xEA,
  'LET': 0xF1,
  'IF': 0xEB,
  'THEN': 0xCB,
  'FOR': 0xE9,
  // Note: This is a partial mapping; full implementation would have all tokens
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
