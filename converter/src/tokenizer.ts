/**
 * ZX BASIC Tokenizer
 * Converts ASCII BASIC source to ZX Spectrum tokenized format
 * 
 * Token values follow the real ZX Spectrum ROM:
 * - 0x00-0x7F: ASCII characters (printable chars 0x20-0x7F)
 * - 0x80-0x8F: Block graphics
 * - 0x90-0xA2: UDGs
 * - 0xA3-0xA4: 128K tokens (SPECTRUM, PLAY)
 * - 0xA5-0xFF: BASIC keyword tokens
 */

// Token map - Real ZX Spectrum keyword tokens (0xA5-0xFF)
export const TOKEN_MAP: Record<string, number> = {
  // Function tokens (0xA5-0xC4)
  'RND': 0xA5, 'INKEY$': 0xA6, 'PI': 0xA7, 'FN': 0xA8,
  'POINT': 0xA9, 'SCREEN$': 0xAA, 'ATTR': 0xAB, 'AT': 0xAC,
  'TAB': 0xAD, 'VAL$': 0xAE, 'CODE': 0xAF, 'VAL': 0xB0,
  'LEN': 0xB1, 'SIN': 0xB2, 'COS': 0xB3, 'TAN': 0xB4,
  'ASN': 0xB5, 'ACS': 0xB6, 'ATN': 0xB7, 'LN': 0xB8,
  'EXP': 0xB9, 'INT': 0xBA, 'SQR': 0xBB, 'SGN': 0xBC,
  'ABS': 0xBD, 'PEEK': 0xBE, 'IN': 0xBF, 'USR': 0xC0,
  'STR$': 0xC1, 'CHR$': 0xC2, 'NOT': 0xC3, 'BIN': 0xC4,
  
  // Operator/expression tokens (0xC5-0xCD)
  'OR': 0xC5, 'AND': 0xC6, '<=': 0xC7, '>=': 0xC8,
  '<>': 0xC9, 'LINE': 0xCA, 'THEN': 0xCB, 'TO': 0xCC,
  'STEP': 0xCD,
  
  // Command tokens (0xCE-0xFF)
  'DEF FN': 0xCE, 'CAT': 0xCF, 'FORMAT': 0xD0, 'MOVE': 0xD1,
  'ERASE': 0xD2, 'OPEN #': 0xD3, 'CLOSE #': 0xD4, 'MERGE': 0xD5,
  'VERIFY': 0xD6, 'BEEP': 0xD7, 'CIRCLE': 0xD8, 'INK': 0xD9,
  'PAPER': 0xDA, 'FLASH': 0xDB, 'BRIGHT': 0xDC, 'INVERSE': 0xDD,
  'OVER': 0xDE, 'OUT': 0xDF, 'LPRINT': 0xE0, 'LLIST': 0xE1,
  'STOP': 0xE2, 'READ': 0xE3, 'DATA': 0xE4, 'RESTORE': 0xE5,
  'NEW': 0xE6, 'BORDER': 0xE7, 'CONTINUE': 0xE8, 'DIM': 0xE9,
  'REM': 0xEA, 'FOR': 0xEB, 'GO TO': 0xEC, 'GO SUB': 0xED,
  'INPUT': 0xEE, 'LOAD': 0xEF, 'LIST': 0xF0, 'LET': 0xF1,
  'PAUSE': 0xF2, 'NEXT': 0xF3, 'POKE': 0xF4, 'PRINT': 0xF5,
  'PLOT': 0xF6, 'RUN': 0xF7, 'SAVE': 0xF8, 'RANDOMIZE': 0xF9,
  'IF': 0xFA, 'CLS': 0xFB, 'DRAW': 0xFC, 'CLEAR': 0xFD,
  'RETURN': 0xFE, 'COPY': 0xFF,
};

// Extended keywords (128K)
export const TOKEN_MAP_128K: Record<string, number> = {
  'SPECTRUM': 0xA3, 'PLAY': 0xA4,
};

// Interface 1 commands use regular tokens but with different context
// These are handled via the main TOKEN_MAP (CAT, FORMAT, MOVE, ERASE, etc.)

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
  
  return null;
}

/**
 * Tokenize a BASIC line
 */
export function tokenizeLine(line: string): number[] {
  const bytes: number[] = [];
  let i = 0;
  let inRem = false; // After REM, preserve everything as-is

  while (i < line.length) {
    const char = line[i];

    // After REM token, output everything as literal ASCII (including spaces)
    if (inRem) {
      bytes.push(line.charCodeAt(i));
      i++;
      continue;
    }

    // Skip whitespace (except in strings and after REM)
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // String literals - output with ASCII quotes (0x22)
    if (char === '"') {
      bytes.push(0x22); // Opening ASCII quote
      i++;
      while (i < line.length && line[i] !== '"') {
        bytes.push(line.charCodeAt(i));
        i++;
      }
      if (i < line.length) {
        bytes.push(0x22); // Closing ASCII quote
        i++; // Skip closing quote in source
      }
      continue;
    }

    // Numbers - in ZX Spectrum format: ASCII digits + 0x0E marker + 5-byte float
    if (/\d/.test(char) || (char === '-' && /\d/.test(line[i + 1] || ''))) {
      let numStr = '';
      const startI = i;
      
      if (char === '-') {
        numStr += '-';
        i++;
      }
      while (i < line.length && /[\d.eE+-]/.test(line[i])) {
        // Handle exponent sign specially
        if ((line[i] === '+' || line[i] === '-') && 
            i > startI && line[i-1].toLowerCase() !== 'e') {
          break;
        }
        numStr += line[i];
        i++;
      }
      
      // Output ASCII representation first
      for (const ch of numStr) {
        bytes.push(ch.charCodeAt(0));
      }
      
      // Then output 0x0E marker + 5-byte floating point encoding
      const num = parseFloat(numStr);
      bytes.push(0x0E);
      const floatBytes = encodeZxFloat(num);
      bytes.push(...floatBytes);
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
        
        // If this is REM, skip one space and then preserve everything after
        if (word.toUpperCase() === 'REM') {
          // Skip the single space after REM (if present)
          if (i < line.length && line[i] === ' ') {
            i++;
          }
          inRem = true;
        }
      } else {
        // Identifier (variable name)
        for (const char of word) {
          bytes.push(char.charCodeAt(0));
        }
      }
      continue;
    }

    // Operators and punctuation (including ' which is PRINT newline separator)
    if ("+-*/<>=(),:;.'".includes(char)) {
      // Check for multi-character operators
      if (char === '<' && i + 1 < line.length) {
        if (line[i + 1] === '=') {
          bytes.push(0xC7); // <= token
          i += 2;
          continue;
        }
        if (line[i + 1] === '>') {
          bytes.push(0xC9); // <> token
          i += 2;
          continue;
        }
      }
      if (char === '>' && i + 1 < line.length && line[i + 1] === '=') {
        bytes.push(0xC8); // >= token
        i += 2;
        continue;
      }
      // ** is NOT tokenized in real ZX Spectrum - output as two ASCII asterisks
      // (handled by single-char case below)

      // Single-character operators - output as ASCII
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
 * Encode a number in ZX Spectrum 5-byte format (after ASCII and 0x0E marker)
 * For small integers -65536 to 65535: 00 sign lo hi 00
 * For floats: exp mantissa[4]
 */
export function encodeZxFloat(num: number): number[] {
  const bytes = new Array(5).fill(0);
  
  const intValue = Math.floor(num);
  
  // Check if it's a small integer that can use the short form
  if (num === intValue && intValue >= -65536 && intValue < 65536) {
    bytes[0] = 0x00; // Always 0x00 for integers
    
    if (intValue >= 0) {
      bytes[1] = 0x00; // Positive sign
      bytes[2] = intValue & 0xFF;
      bytes[3] = (intValue >> 8) & 0xFF;
    } else {
      bytes[1] = 0xFF; // Negative sign
      const adjusted = intValue + 65536;
      bytes[2] = adjusted & 0xFF;
      bytes[3] = (adjusted >> 8) & 0xFF;
    }
    bytes[4] = 0x00; // Always 0x00
    return bytes;
  }
  
  // Full floating point format
  let value = num;
  let sign = 0x00;
  
  if (value < 0) {
    sign = 0x80;
    value = -value;
  }
  
  if (value === 0) {
    return bytes; // All zeros
  }
  
  // Calculate exponent
  const exp = Math.floor(Math.log2(value));
  
  // Calculate mantissa: (value / 2^exp - 1) * 2^31
  const mantissa = Math.floor((value / Math.pow(2, exp) - 1.0) * 2147483648.0 + 0.5);
  
  bytes[0] = exp + 0x81; // Exponent with bias
  bytes[1] = ((mantissa >> 24) & 0x7F) | sign; // High mantissa + sign
  bytes[2] = (mantissa >> 16) & 0xFF;
  bytes[3] = (mantissa >> 8) & 0xFF;
  bytes[4] = mantissa & 0xFF;
  
  return bytes;
}

/**
 * Encode a number in ZX Spectrum format (old format - kept for compatibility)
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
