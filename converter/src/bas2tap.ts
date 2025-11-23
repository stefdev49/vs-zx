/**
 * ZX Spectrum BASIC to TAP Converter
 * Pure TypeScript port of bas2tap functionality
 * Converts ASCII BASIC programs to TAP tape format
 */

type byte = number; // 0-255

export interface Bas2TapOptions {
  quiet?: boolean;
  autostart?: number;
  programName?: string;
  suppressWarnings?: boolean;
  checkSyntax?: boolean;
}

export interface Bas2TapResult {
  success: boolean;
  tap?: Buffer;
  error?: string;
  warnings?: string[];
}

// Token definitions for ZX Spectrum BASIC
interface TokenDef {
  name: string;
  token: byte;
  type: 'keyword' | 'expression' | 'operator' | 'ascii';
}

const TOKENS: Map<string, byte> = new Map([
  // Keywords
  ['REM', 0xA4],
  ['FOR', 0xAB],
  ['GO TO', 0xAD],
  ['GO SUB', 0xAE],
  ['INPUT', 0xB0],
  ['LOAD', 0xB1],
  ['LIST', 0xB2],
  ['LET', 0xB3],
  ['PAUSE', 0xB4],
  ['NEXT', 0xB5],
  ['POKE', 0xB6],
  ['PRINT', 0xB7],
  ['PLOT', 0xB8],
  ['RUN', 0xB9],
  ['SAVE', 0xBA],
  ['RANDOMIZE', 0xBB],
  ['IF', 0xBC],
  ['CLS', 0xBD],
  ['DRAW', 0xBE],
  ['CLEAR', 0xBF],
  ['RETURN', 0xC0],
  ['COPY', 0xC1],
  ['DEF FN', 0xCE],
  ['CAT', 0xC2],
  ['FORMAT', 0xC3],
  ['MOVE', 0xC4],
  ['ERASE', 0xC5],
  ['OPEN #', 0xC6],
  ['CLOSE #', 0xC7],
  ['MERGE', 0xC8],
  ['VERIFY', 0xC9],
  ['BEEP', 0xC0],
  ['CIRCLE', 0xC1],
  ['INK', 0xC2],
  ['PAPER', 0xC3],
  ['FLASH', 0xC4],
  ['BRIGHT', 0xC5],
  ['INVERSE', 0xC6],
  ['OVER', 0xC7],
  ['OUT', 0xC8],
  ['LPRINT', 0xC9],
  ['LLIST', 0xCA],
  ['STOP', 0xCB],
  ['READ', 0xCC],
  ['DATA', 0xCD],
  ['RESTORE', 0xCE],
  ['NEW', 0xCF],
  ['BORDER', 0xD0],
  ['CONTINUE', 0xD1],
  ['DIM', 0xD2],

  // Expression tokens
  ['RND', 0xF0],
  ['INKEY$', 0xF1],
  ['PI', 0xF2],
  ['FN', 0xF3],
  ['POINT', 0xF4],
  ['SCREEN$', 0xF5],
  ['ATTR', 0xF6],
  ['AT', 0xF7],
  ['TAB', 0xF8],
  ['VAL$', 0xF9],
  ['CODE', 0xFA],
  ['VAL', 0xFB],
  ['LEN', 0xFC],
  ['SIN', 0xFD],
  ['COS', 0xFE],
  ['TAN', 0xFF],

  // Two-character operators
  ['<=', 0xCE],
  ['>=', 0xCF],
  ['<>', 0xD0],
  ['AND', 0xC4],
  ['OR', 0xC3],
  ['NOT', 0xC2],
  ['MOD', 0xC1],
]);

const KEYWORDS = [
  'DEF FN', 'CAT', 'FORMAT', 'MOVE', 'ERASE', 'OPEN #', 'CLOSE #',
  'MERGE', 'VERIFY', 'BEEP', 'CIRCLE', 'INK', 'PAPER', 'FLASH',
  'BRIGHT', 'INVERSE', 'OVER', 'OUT', 'LPRINT', 'LLIST', 'STOP',
  'READ', 'DATA', 'RESTORE', 'NEW', 'BORDER', 'CONTINUE', 'DIM',
  'REM', 'FOR', 'GO TO', 'GO SUB', 'INPUT', 'LOAD', 'LIST', 'LET',
  'PAUSE', 'NEXT', 'POKE', 'PRINT', 'PLOT', 'RUN', 'SAVE', 'RANDOMIZE',
  'IF', 'CLS', 'DRAW', 'CLEAR', 'RETURN', 'COPY'
];

/**
 * Convert a BASIC line to tokenized format
 */
function tokenizeLine(line: string): byte[] {
  const tokens: byte[] = [];
  let i = 0;

  while (i < line.length) {
    // Skip whitespace
    if (line[i] === ' ') {
      i++;
      continue;
    }

    // Check for multi-character tokens (keywords and operators)
    let found = false;

    // Try two-character tokens first
    if (i + 1 < line.length) {
      const twoChar = line.substring(i, i + 2).toUpperCase();
      if (TOKENS.has(twoChar)) {
        tokens.push(TOKENS.get(twoChar)!);
        i += 2;
        found = true;
      }
    }

    if (!found) {
      // Try three-character tokens
      if (i + 2 < line.length) {
        const threeChar = line.substring(i, i + 3).toUpperCase();
        if (TOKENS.has(threeChar)) {
          tokens.push(TOKENS.get(threeChar)!);
          i += 3;
          found = true;
        }
      }
    }

    if (!found) {
      // Try multi-character keywords (up to 6 chars)
      for (let len = 6; len > 0 && !found; len--) {
        if (i + len <= line.length) {
          const keyword = line.substring(i, i + len).toUpperCase();
          if (TOKENS.has(keyword)) {
            tokens.push(TOKENS.get(keyword)!);
            i += len;
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      // Single character or literal
      const char = line[i];
      tokens.push(char.charCodeAt(0));
      i++;
    }
  }

  return tokens;
}

/**
 * Create TAP file from tokenized BASIC lines
 */
export function basicToTap(basicCode: string, options: Bas2TapOptions = {}): Bas2TapResult {
  try {
    const lines = basicCode.split('\n');
    const tokenizedLines: Map<number, byte[]> = new Map();
    let totalLength = 0;

    // Process each line
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract line number
      const match = trimmed.match(/^(\d+)\s+(.*)/);
      if (!match) {
        if (!options.suppressWarnings) {
          console.warn(`Skipping line without line number: ${trimmed}`);
        }
        continue;
      }

      const lineNumber = parseInt(match[1]);
      const lineContent = match[2];

      // Tokenize the line content
      const tokens = tokenizeLine(lineContent);

      // Create line data: line number (2 bytes, little-endian) + tokens
      const lineData: byte[] = [
        lineNumber & 0xFF,
        (lineNumber >> 8) & 0xFF,
        ...tokens,
        0x0D // End of line marker (ENTER)
      ];

      tokenizedLines.set(lineNumber, lineData);
      totalLength += lineData.length;
    }

    // Build the complete BASIC program binary
    const programBinary: byte[] = [];
    const sortedLines = Array.from(tokenizedLines.entries()).sort((a, b) => a[0] - b[0]);

    for (const [_, lineData] of sortedLines) {
      programBinary.push(...lineData);
    }

    // Create TAP file with header and data blocks
    const programName = (options.programName || 'Program').padEnd(10);
    const tapFile = createTapFile(
      Buffer.from(programBinary),
      programName,
      options.autostart
    );

    return {
      success: true,
      tap: tapFile
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create TAP file with header and data blocks
 */
export function createTapFile(
  programData: Buffer,
  programName: string,
  autostart?: number
): Buffer {
  // Create header block (type 0x00)
  const headerBlock = createTapHeaderBlock(programName, programData.length, autostart);

  // Create data block (type 0xFF)
  const dataBlock = createTapDataBlock(programData);

  // Combine blocks
  return Buffer.concat([headerBlock, dataBlock]);
}

/**
 * Create TAP header block
 */
function createTapHeaderBlock(name: string, programLength: number, autostart?: number): Buffer {
  const headerData = Buffer.alloc(19);

  // Type: 0x00 for header
  headerData[0] = 0x00;

  // File type: 0x00 for BASIC program
  headerData[1] = 0x00;

  // Program name (10 bytes, padded with spaces)
  const nameBytes = Buffer.alloc(10, 0x20);
  const nameData = Buffer.from(name.substring(0, 10), 'utf-8');
  nameData.copy(nameBytes);
  nameBytes.copy(headerData, 2);

  // Program length (2 bytes, little-endian)
  headerData[12] = programLength & 0xFF;
  headerData[13] = (programLength >> 8) & 0xFF;

  // Autostart line (2 bytes, little-endian)
  const autostartLine = autostart ?? 0x8000; // 0x8000 = no autostart
  headerData[14] = autostartLine & 0xFF;
  headerData[15] = (autostartLine >> 8) & 0xFF;

  // Variables area (2 bytes, little-endian)
  const varsArea = 32768 + programLength;
  headerData[16] = varsArea & 0xFF;
  headerData[17] = (varsArea >> 8) & 0xFF;

  // Calculate checksum (XOR of all header data)
  let checksum = 0;
  for (let i = 0; i < 18; i++) {
    checksum ^= headerData[i];
  }
  headerData[18] = checksum;

  // Create TAP block with 2-byte length prefix
  const block = Buffer.alloc(21);
  block[0] = 19; // Block length (little-endian)
  block[1] = 0;
  headerData.copy(block, 2);

  return block;
}

/**
 * Create TAP data block
 */
function createTapDataBlock(programData: Buffer): Buffer {
  const length = programData.length + 2; // +1 for type, +1 for checksum

  // Create TAP block
  const block = Buffer.alloc(length + 2);

  // Block length (little-endian)
  block[0] = length & 0xFF;
  block[1] = (length >> 8) & 0xFF;

  // Type: 0xFF for data
  block[2] = 0xFF;

  // Copy program data
  programData.copy(block, 3);

  // Calculate checksum (XOR of type + data)
  let checksum = 0xFF; // Start with type byte
  for (let i = 0; i < programData.length; i++) {
    checksum ^= programData[i];
  }

  // Write checksum at the end
  block[block.length - 1] = checksum;

  return block;
}

/**
 * Parse TAP file and extract BASIC program
 */
export function tapToBasic(tapBuffer: Buffer): Bas2TapResult {
  try {
    const blocks = parseTapFile(tapBuffer);

    if (blocks.length < 2) {
      return {
        success: false,
        error: 'TAP file must contain at least header and data blocks'
      };
    }

    // Extract program data from second block
    const dataBlock = blocks[1];
    const programData = dataBlock.slice(1, -1); // Remove type byte and checksum

    // Convert to BASIC text (simplified)
    const basicText = convertBinaryToBasic(programData);

    return {
      success: true,
      tap: Buffer.from(basicText)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Parse TAP file into blocks
 */
function parseTapFile(tapData: Buffer): Buffer[] {
  const blocks: Buffer[] = [];
  let offset = 0;

  while (offset < tapData.length) {
    if (offset + 2 > tapData.length) break;

    // Read block length (little-endian)
    const length = tapData[offset] | (tapData[offset + 1] << 8);
    offset += 2;

    if (offset + length > tapData.length) break;

    // Extract block data
    const blockData = tapData.slice(offset, offset + length);
    offset += length;

    blocks.push(blockData);
  }

  return blocks;
}

/**
 * Convert binary program data back to BASIC text
 */
function convertBinaryToBasic(programData: Buffer): string {
  let result = '';
  let i = 0;

  // Reverse token map for decoding
  const reverseTokens: Map<byte, string> = new Map();
  for (const [name, token] of TOKENS.entries()) {
    reverseTokens.set(token, name);
  }

  while (i < programData.length) {
    // Read line number (little-endian)
    if (i + 1 >= programData.length) break;

    const lineNumber = programData[i] | (programData[i + 1] << 8);
    i += 2;

    result += lineNumber + ' ';

    // Read tokens until end of line (0x0D)
    while (i < programData.length) {
      const byte = programData[i];
      i++;

      if (byte === 0x0D) {
        // End of line
        result += '\n';
        break;
      }

      // Convert token to string
      if (reverseTokens.has(byte)) {
        result += reverseTokens.get(byte) + ' ';
      } else if (byte >= 32 && byte < 127) {
        result += String.fromCharCode(byte);
      } else {
        result += `[${byte.toString(16)}]`;
      }
    }
  }

  return result;
}

/**
 * Verify TAP file checksums
 */
export function verifyTapChecksums(tapData: Buffer): boolean {
  const blocks = parseTapFile(tapData);

  for (const block of blocks) {
    if (block.length < 2) continue;

    // Calculate checksum (XOR of all bytes except last)
    let checksum = 0;
    for (let i = 0; i < block.length - 1; i++) {
      checksum ^= block[i];
    }

    // Verify against stored checksum
    if (checksum !== block[block.length - 1]) {
      return false;
    }
  }

  return true;
}

/**
 * Main conversion function
 */
export function convertBasicToTap(
  basicCode: string,
  programName: string = 'Program',
  autostart?: number
): Buffer {
  const result = basicToTap(basicCode, { programName, autostart });
  if (!result.success || !result.tap) {
    throw new Error(result.error || 'Failed to convert BASIC to TAP');
  }
  return result.tap;
}
