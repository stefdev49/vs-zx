/**
 * ZX BASIC Tokenizer
 * Converts ASCII BASIC source to ZX Spectrum tokenized format
 */

// Token map - ZX Spectrum keyword tokens
export const TOKEN_MAP: Record<string, number> = {
  // 00-0F
  'RND': 0x00, 'INKEY$': 0x01, 'PI': 0x02, 'FN': 0x03,
  'POINT': 0x04, 'SCREEN$': 0x05, 'ATTR': 0x06, 'AT': 0x07,
  'TAB': 0x08, 'VAL$': 0x09, 'CODE': 0x0A, 'VAL': 0x0B,
  'LEN': 0x0C, 'SIN': 0x0D, 'COS': 0x0E, 'TAN': 0x0F,
  
  // 10-1F
  'ASN': 0x10, 'ACS': 0x11, 'ATN': 0x12, 'LN': 0x13,
  'EXP': 0x14, 'INT': 0x15, 'SQR': 0x16, 'SGN': 0x17,
  'ABS': 0x18, 'PEEK': 0x19, 'IN': 0x1A, 'USR': 0x1B,
  'STR$': 0x1C, 'CHR$': 0x1D, 'NOT': 0x1E, 'BIN': 0x1F,
  
  // 20-2F
  '**': 0x20, 'OR': 0x21, 'AND': 0x22, '<=': 0x23,
  '>=': 0x24, '<>': 0x25, 'LINE': 0x26, 'THEN': 0x27,
  'TO': 0x28, 'STEP': 0x29, 'DEF FN': 0x2A, 'CAT': 0x2B,
  'FORMAT': 0x2C, 'MOVE': 0x2D, 'ERASE': 0x2E, 'OPEN #': 0x2F,
  
  // 30-3F
  'CLOSE #': 0x30, 'MERGE': 0x31, 'VERIFY': 0x32, 'BEEP': 0x33,
  'CIRCLE': 0x34, 'INK': 0x35, 'PAPER': 0x36, 'FLASH': 0x37,
  'BRIGHT': 0x38, 'INVERSE': 0x39, 'OVER': 0x3A, 'OUT': 0x3B,
  'LPRINT': 0x3C, 'LLIST': 0x3D, 'STOP': 0x3E, 'READ': 0x3F,
  
  // 40-4F
  'DATA': 0x40, 'RESTORE': 0x41, 'NEW': 0x42, 'BORDER': 0x43,
  'CONTINUE': 0x44, 'DIM': 0x45, 'REM': 0x46, 'FOR': 0x47,
  'GO TO': 0x48, 'GO SUB': 0x49, 'INPUT': 0x4A, 'LOAD': 0x4B,
  'LIST': 0x4C, 'LET': 0x4D, 'PAUSE': 0x4E, 'NEXT': 0x4F,
  
  // 50-5F
  'POKE': 0x50, 'PRINT': 0x51, 'PLOT': 0x52, 'RUN': 0x53,
  'SAVE': 0x54, 'RANDOMIZE': 0x55, 'IF': 0x56, 'CLS': 0x57,
  'DRAW': 0x58, 'CLEAR': 0x59, 'RETURN': 0x5A, 'COPY': 0x5B,
};

// Extended keywords (128K and Interface 1)
export const TOKEN_MAP_128K: Record<string, number> = {
  'SPECTRUM': 0x60, 'PLAY': 0x61, 'ERASE': 0x62, 'OPEN': 0x63,
  'CLOSE': 0x64,
};

export const TOKEN_MAP_INTERFACE1: Record<string, number> = {
  'NET': 0x65, 'CAT*': 0x66, 'LOAD*': 0x67, 'SAVE*': 0x68,
  'MERGE*': 0x69, 'VERIFY*': 0x6A, 'FORMAT*': 0x6B,
};

export enum TokenType {
  KEYWORD = 'keyword',
  NUMBER = 'number',
  STRING = 'string',
  IDENTIFIER = 'identifier',
  OPERATOR = 'operator',
  PUNCTUATION = 'punctuation',
}

export interface Token {
  type: TokenType;
  value: string;
  bytes: number[];
}

/**
 * Check if a string is a two-word keyword that should be treated as one token
 */
function isTwoWordKeyword(word: string, nextWord?: string): boolean {
  const twoWordKeywords = ['GO TO', 'GO SUB', 'DEF FN', 'OPEN #', 'CLOSE #'];
  if (nextWord) {
    const combined = `${word} ${nextWord}`.toUpperCase();
    return twoWordKeywords.includes(combined);
  }
  return false;
}

/**
 * Convert a keyword string to its token byte
 */
export function keywordToToken(keyword: string): number | null {
  const upper = keyword.toUpperCase();
  
  if (TOKEN_MAP[upper] !== undefined) {
    return TOKEN_MAP[upper];
  }
  if (TOKEN_MAP_128K[upper] !== undefined) {
    return TOKEN_MAP_128K[upper];
  }
  if (TOKEN_MAP_INTERFACE1[upper] !== undefined) {
    return TOKEN_MAP_INTERFACE1[upper];
  }
  
  return null;
}

/**
 * Tokenize a BASIC line
 */
export function tokenizeLine(line: string): number[] {
  const bytes: number[] = [];
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    // Skip whitespace (except in strings)
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // String literals
    if (char === '"') {
      bytes.push(0x0F); // String marker in tokens
      i++;
      while (i < line.length && line[i] !== '"') {
        bytes.push(line.charCodeAt(i));
        i++;
      }
      if (i < line.length) {
        i++; // Skip closing quote
      }
      bytes.push(0x0F); // End string marker
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === '-' && /\d/.test(line[i + 1] || ''))) {
      let numStr = '';
      if (char === '-') {
        bytes.push(0x13); // UNARY_MINUS or similar
        i++;
      }
      while (i < line.length && /[\d.eE]/.test(line[i])) {
        numStr += line[i];
        i++;
      }
      const num = parseFloat(numStr);
      const numBytes = encodeNumber(num);
      bytes.push(...numBytes);
      continue;
    }

    // Keywords and identifiers
    if (/[A-Za-z]/.test(char)) {
      let word = '';
      const startI = i;
      while (i < line.length && /[A-Za-z0-9_$%]/.test(line[i])) {
        word += line[i];
        i++;
      }

      // Check for two-word keywords
      let nextWord = '';
      let j = i;
      while (j < line.length && /\s/.test(line[j])) {
        j++;
      }
      let k = j;
      while (k < line.length && /[A-Za-z]/.test(line[k])) {
        nextWord += line[k];
        k++;
      }

      if (isTwoWordKeyword(word, nextWord)) {
        const token = keywordToToken(`${word} ${nextWord}`);
        if (token !== null) {
          bytes.push(token);
          i = k;
          continue;
        }
      }

      // Single-word keyword
      const token = keywordToToken(word);
      if (token !== null) {
        bytes.push(token);
      } else {
        // Identifier (variable name)
        for (const char of word) {
          bytes.push(char.charCodeAt(0));
        }
      }
      continue;
    }

    // Operators and punctuation
    if ('+-*/<>=(),:;.'.includes(char)) {
      // Check for multi-character operators
      if (char === '<' && i + 1 < line.length) {
        if (line[i + 1] === '=') {
          bytes.push(0x23); // <=
          i += 2;
          continue;
        }
        if (line[i + 1] === '>') {
          bytes.push(0x25); // <>
          i += 2;
          continue;
        }
      }
      if (char === '>' && i + 1 < line.length && line[i + 1] === '=') {
        bytes.push(0x24); // >=
        i += 2;
        continue;
      }
      if (char === '*' && i + 1 < line.length && line[i + 1] === '*') {
        bytes.push(0x20); // **
        i += 2;
        continue;
      }

      // Single-character operators
      const charCode = char.charCodeAt(0);
      bytes.push(charCode);
      i++;
      continue;
    }

    // Unknown character - skip
    i++;
  }

  return bytes;
}

/**
 * Encode a number in ZX Spectrum format
 * Small integers: 0-255 are encoded as 0x0E followed by the byte
 * Floats: 0x0F followed by 5 bytes (ZX float format)
 */
export function encodeNumber(num: number): number[] {
  // Check if it's a small integer
  if (Number.isInteger(num) && num >= 0 && num <= 65535) {
    return [0x0E, num & 0xFF, (num >> 8) & 0xFF];
  }

  // Encode as float
  return [0x0F, ...zxFloatToBytes(num)];
}

/**
 * Convert a JavaScript number to ZX Spectrum 5-byte float format
 */
export function zxFloatToBytes(num: number): number[] {
  const bytes = new Array(5).fill(0);

  if (num === 0) {
    return bytes; // All zeros
  }

  // Get sign and absolute value
  const sign = num < 0 ? 0x80 : 0x00;
  const absNum = Math.abs(num);

  // Get exponent and mantissa
  const exp = Math.floor(Math.log2(absNum)) + 1;
  const mantissa = absNum / Math.pow(2, exp - 1);

  // Encode exponent (0-255, with 128 as bias for -128 to 127)
  bytes[0] = exp + 128;

  // Encode 31-bit mantissa across bytes 1-4
  let mant = Math.floor(mantissa * Math.pow(2, 31));
  for (let i = 4; i >= 1; i--) {
    bytes[i] = mant & 0xFF;
    mant >>= 8;
  }

  // Apply sign to first byte
  bytes[0] = (bytes[0] & 0x7F) | sign;

  return bytes;
}

/**
 * Parse a BASIC program line number
 */
export function parseLineNumber(line: string): { lineNumber: number; content: string } {
  const match = line.match(/^(\d+)\s+(.*)/);
  if (match) {
    return {
      lineNumber: parseInt(match[1]),
      content: match[2]
    };
  }
  return {
    lineNumber: 0,
    content: line
  };
}
