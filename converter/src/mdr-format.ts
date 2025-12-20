// MDR (Microdrive) Format Support for ZX BASIC Extension
// Based on mdv2img by Volker Bartheld <vbartheld@gmx.de>
// WinZ80 emulator compatible .mdr format

import { tokenizeLine } from "./tokenizer";

/**
 * MDR File Format Constants
 * Based on Sinclair Microdrive specification and WinZ80 emulator format
 */
export const MDR_SECTOR_SIZE = 543; // bytes per sector
export const MDR_TOTAL_SECTORS = 254; // total sectors in cartridge
export const MDR_FILE_SIZE = 137923; // 254 * 543 + 1 (write protection byte)
export const MDR_HEADER_SIZE = 15; // sector header size
export const MDR_RECORD_SIZE = 15; // record descriptor size
export const MDR_DATA_SIZE = 513; // data block size (512 + checksum)

/**
 * MDR Sector Structure - matches Sinclair Microdrive format
 * Total: 543 bytes per sector
 */
export interface MdrSector {
  header: {
    flag: number; // 0x01 = header block indicator
    sectorNumber: number; // Sector number (254 down to 1)
    name: string; // Cartridge name (10 chars, blank-padded)
    checksum: number; // Header checksum (first 14 bytes)
  };
  record: {
    flags: number; // Bit field: EOF, PRINT file, etc.
    sequence: number; // Data block sequence number
    length: number; // Data length in bytes (≤ 512)
    filename: string; // Filename (10 chars, blank-padded)
    checksum: number; // Record descriptor checksum
  };
  data: Uint8Array; // 512 bytes of actual data
  dataChecksum: number; // Data block checksum
}

/**
 * Complete MDR File Structure
 */
export interface MdrFile {
  sectors: MdrSector[];
  writeProtected: boolean; // Write protection flag
  cartridgeName: string; // Cartridge name from sector headers
  version: string; // Format version
  errors?: MdrError[]; // Any errors found during parsing
}

/**
 * Error types for MDR sectors
 */
export interface MdrError {
  sector: number; // Sector number with error
  type: "HDCHK" | "DESCHK" | "DCHK" | "STRUCTURE";
  message: string; // Error description
  expected?: number; // Expected checksum value
  actual?: number; // Actual checksum value
}

/**
 * Error recovery policies (from mdv2img)
 */
export enum MdrErrorPolicy {
  NONE = 0x0000, // No error recovery
  FIX_HEADER = 0x0001, // Recreate broken headers (HDCHK mismatches)
  FIX_RECORD = 0x0002, // Recreate broken records (DESCHK mismatches)
  FIX_DATA = 0x0004, // Recreate broken data blocks (DCHK)
  ACCEPT_ERRORS = 0x0008, // Tolerate checksum errors when writing
  OVERWRITE_SECTORS = 0x0010, // Overwrite existing sectors
  OVERWRITE_OUTPUT = 0x0020, // Overwrite output file
  ALLOW_NONSTANDARD = 0x0040, // Allow nonstandard .mdr files
}

// Default policy: Fix data blocks, accept errors, overwrite output
export const DEFAULT_ERROR_POLICY =
  MdrErrorPolicy.FIX_DATA |
  MdrErrorPolicy.ACCEPT_ERRORS |
  MdrErrorPolicy.OVERWRITE_OUTPUT;

/**
 * Calculate Sinclair Microdrive checksum
 * Algorithm from mdv2img.h - matches IF-1 ROM implementation
 *
 * @param data - Data to calculate checksum for
 * @returns Checksum value (0-254)
 */
export function calculateMdrChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) % 255;
  }
  return sum;
}

/**
 * Validate MDR sector checksums
 * @param sector - Sector to validate
 * @returns Array of errors, or empty array if valid
 */
export function validateMdrSector(sector: MdrSector): MdrError[] {
  const errors: MdrError[] = [];

  // Validate header checksum
  const headerData = new Uint8Array([
    sector.header.flag,
    sector.header.sectorNumber,
    ...Array.from({ length: 2 }, () => 0), // unused bytes
    ...Array.from(Buffer.from(sector.header.name.padEnd(10, " "))),
  ]);
  const calculatedHeaderChk = calculateMdrChecksum(headerData);
  if (calculatedHeaderChk !== sector.header.checksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "HDCHK",
      message: "Header checksum mismatch",
      expected: calculatedHeaderChk,
      actual: sector.header.checksum,
    });
  }

  // Validate record checksum
  const recordData = new Uint8Array([
    sector.record.flags,
    sector.record.sequence,
    sector.record.length & 0xff, // LSB first
    (sector.record.length >> 8) & 0xff,
    ...Array.from(Buffer.from(sector.record.filename.padEnd(10, " "))),
  ]);
  const calculatedRecordChk = calculateMdrChecksum(recordData);
  if (calculatedRecordChk !== sector.record.checksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "DESCHK",
      message: "Record descriptor checksum mismatch",
      expected: calculatedRecordChk,
      actual: sector.record.checksum,
    });
  }

  // Validate data checksum
  const calculatedDataChk = calculateMdrChecksum(sector.data);
  if (calculatedDataChk !== sector.dataChecksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "DCHK",
      message: "Data block checksum mismatch",
      expected: calculatedDataChk,
      actual: sector.dataChecksum,
    });
  }

  return errors;
}

/**
 * Parse MDR file buffer and extract structure
 * Handles multi-sector programs by combining sectors with the same filename
 * @param mdrBuffer - Complete MDR file buffer
 * @returns Parsed MDR file with programs and metadata
 */
export function parseMdrFile(mdrBuffer: Buffer): {
  programs: { name: string; source: string; sector: number }[];
  metadata: MdrFile;
  errors: MdrError[];
} {
  const programs: { name: string; source: string; sector: number }[] = [];
  const errors: MdrError[] = [];

  // Validate overall file structure
  if (mdrBuffer.length !== MDR_FILE_SIZE) {
    throw new Error(
      `Invalid MDR file size: ${mdrBuffer.length} bytes (expected ${MDR_FILE_SIZE})`,
    );
  }

  // Extract write protection byte (last byte)
  const writeProtected = mdrBuffer[mdrBuffer.length - 1] !== 0;

  // Parse all sectors
  const sectors: MdrSector[] = [];
  for (let sectorIndex = 0; sectorIndex < MDR_TOTAL_SECTORS; sectorIndex++) {
    const offset = sectorIndex * MDR_SECTOR_SIZE;
    const sectorBuffer = mdrBuffer.subarray(offset, offset + MDR_SECTOR_SIZE);

    // Parse sector
    const sector = parseMdrSector(sectorBuffer, sectorIndex + 1);
    sectors.push(sector);

    // Validate checksums
    const sectorErrors = validateMdrSector(sector);
    errors.push(...sectorErrors);
  }

  // Group sectors by filename for multi-sector programs
  const programSectors: Map<string, MdrSector[]> = new Map();
  
  for (const sector of sectors) {
    const sectorErrors = validateMdrSector(sector);
    if (sectorErrors.length === 0) {
      const filename = sector.record.filename.trim();
      if (filename) {
        if (!programSectors.has(filename)) {
          programSectors.set(filename, []);
        }
        programSectors.get(filename)!.push(sector);
      }
    }
  }

  // Process each program (possibly multi-sector)
  for (const [filename, sectorList] of programSectors) {
    try {
      // Sort sectors by sequence number
      sectorList.sort((a, b) => a.record.sequence - b.record.sequence);
      
      // Check if the first sector (flags=0x02) starts with valid BASIC
      const firstSector = sectorList.find(s => (s.record.flags & 0x02) !== 0) || sectorList[0];
      if (!isBasicSector(firstSector)) {
        continue; // Not a BASIC program, skip
      }
      
      // Combine data from all sectors
      const totalLength = sectorList.reduce((sum, s) => sum + s.record.length, 0);
      const combinedData = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const sector of sectorList) {
        const dataLength = sector.record.length;
        combinedData.set(sector.data.subarray(0, dataLength), offset);
        offset += dataLength;
      }
      
      // Extract BASIC from combined data
      const programSource = extractBasicFromData(combinedData);
      if (programSource.trim()) {
        programs.push({
          name: filename || `PROGRAM`,
          source: programSource,
          sector: sectorList[0].header.sectorNumber,
        });
      }
    } catch (error) {
      // Skip programs that can't be parsed as BASIC
      console.warn(
        `Failed to extract BASIC from program ${filename}: ${error}`,
      );
    }
  }

  // Determine cartridge name from first valid sector
  let cartridgeName = "UNKNOWN";
  for (const sector of sectors) {
    if (sector.header.name && sector.header.name.trim()) {
      cartridgeName = sector.header.name.trim();
      break;
    }
  }

  return {
    programs,
    metadata: {
      sectors,
      writeProtected,
      cartridgeName,
      version: "1.0",
      errors: errors.length > 0 ? errors : undefined,
    },
    errors,
  };
}

/**
 * Parse single MDR sector from buffer
 */
function parseMdrSector(
  sectorBuffer: Buffer,
  _sectorNumber: number,
): MdrSector {
  // Parse header (first 15 bytes)
  const header = {
    flag: sectorBuffer[0],
    sectorNumber: sectorBuffer[1],
    name: sectorBuffer.subarray(4, 14).toString("ascii").trim(),
    checksum: sectorBuffer[14],
  };

  // Parse record descriptor (next 15 bytes)
  const record = {
    flags: sectorBuffer[15],
    sequence: sectorBuffer[16],
    length: sectorBuffer.readUInt16LE(17), // LSB first
    filename: sectorBuffer.subarray(19, 29).toString("ascii").trim(),
    checksum: sectorBuffer[29],
  };

  // Parse data (512 bytes) and checksum (1 byte)
  const data = sectorBuffer.subarray(30, 542); // 512 bytes
  const dataChecksum = sectorBuffer[542];

  return {
    header,
    record,
    data,
    dataChecksum,
  };
}

/**
 * Check if sector contains BASIC program
 * ZX BASIC programs start with line number (2 bytes) and length (2 bytes)
 */
function isBasicSector(sector: MdrSector): boolean {
  try {
    // Check minimum length for a valid BASIC line
    if (sector.data.length < 4) return false;

    // Read line number (2 bytes, little-endian)
    const lineNumber = sector.data[0] | (sector.data[1] << 8);

    // Read line length (2 bytes, little-endian)
    const lineLength = sector.data[2] | (sector.data[3] << 8);

    // Validate line number and length
    // Line numbers are typically 1-9999, line length should be reasonable
    return (
      lineNumber > 0 &&
      lineNumber <= 9999 &&
      lineLength > 0 &&
      lineLength <= 512 &&
      lineLength <= sector.data.length - 4
    );
  } catch (error) {
    return false;
  }
}

/**
 * Extract BASIC source from sector data
 */
function extractBasicFromSector(sector: MdrSector): string {
  return extractBasicFromData(sector.data);
}

/**
 * Extract BASIC source from combined sector data (Uint8Array)
 * Used for multi-sector programs where data is combined
 */
function extractBasicFromData(data: Uint8Array): string {
  let source = "";
  let position = 0;

  while (position < data.length - 2) {
    // Read line number (2 bytes, little-endian)
    const lineNumber = data[position] | (data[position + 1] << 8);
    position += 2;

    // Read line length (2 bytes, little-endian)
    const lineLength = data[position] | (data[position + 1] << 8);
    position += 2;

    if (lineLength === 0) break;

    // Extract line content (excluding terminator)
    const lineContent = data.subarray(
      position,
      position + lineLength - 1,
    );
    position += lineLength;

    // Detokenize the line content
    const lineText = detokenizeLine(lineContent);

    source += `${lineNumber} ${lineText}\n`;
  }

  return source;
}

/**
 * Detokenize a line of tokenized BASIC code.
 * This function reverses what tokenizeLine() in tokenizer.ts does.
 * 
 * With real ZX Spectrum tokens (0xA5-0xFF range), there's no ambiguity:
 * - All tokens are >= 0xA3
 * - ASCII characters 0x00-0x7F are output as-is
 * - Special handling for 0x0E (number marker) and string literals
 */
function detokenizeLine(tokens: Uint8Array): string {
  let result = "";
  let i = 0;
  let lastWasKeyword = false;
  let lastWasNumber = false;
  let inRem = false; // After REM, everything is literal

  while (i < tokens.length) {
    const byte = tokens[i];

    // After REM token (0xEA), everything is literal ASCII
    if (inRem) {
      result += String.fromCharCode(byte);
      i++;
      continue;
    }

    // Handle number encoding: 0x0E + 5 bytes
    // The ASCII digits have already been output before this marker,
    // so we just skip over the binary representation
    if (byte === 0x0e && i + 5 < tokens.length) {
      i += 6; // Skip 0x0E + 5 bytes
      lastWasKeyword = false;
      lastWasNumber = true; // We just passed a number
      continue;
    }

    // Handle string literals - enclosed in quotes (0x22)
    if (byte === 0x22) {
      result += '"';
      i++; // Skip opening quote
      
      // Read chars until closing quote or end
      while (i < tokens.length && tokens[i] !== 0x22) {
        result += String.fromCharCode(tokens[i]);
        i++;
      }
      
      if (i < tokens.length && tokens[i] === 0x22) {
        result += '"';
        i++; // Skip closing quote
      }
      lastWasKeyword = false;
      lastWasNumber = false;
      continue;
    }

    // Check if this byte is a keyword token (>= 0xA3)
    const keyword = getKeywordFromToken(byte);

    if (keyword !== null) {
      // This is a keyword token - add space before if needed
      // Add space after a keyword or after a number (e.g., "2 TO")
      if ((lastWasKeyword || lastWasNumber) && result.length > 0 && !result.endsWith(" ")) {
        result += " ";
      }
      result += keyword;
      i++;
      lastWasKeyword = true;
      lastWasNumber = false;
      
      // Check if we just output REM - everything after is literal
      // Add space after REM since tokenizer strips it
      if (keyword === "REM") {
        inRem = true;
        // Add space after REM if there's more content
        if (i < tokens.length) {
          result += " ";
        }
      }
      continue;
    }

    // Not a token - treat as literal ASCII character
    // Add space after keyword if this isn't whitespace/punctuation
    if (lastWasKeyword && byte !== 0x20 && result.length > 0 && !result.endsWith(" ")) {
      const isPunctuation = "(),:;+-*/<>=".includes(String.fromCharCode(byte));
      if (!isPunctuation) {
        result += " ";
      }
    }
    result += String.fromCharCode(byte);
    
    i++;
    lastWasKeyword = false;
    // Track if this is a digit (we're building a number)
    lastWasNumber = (byte >= 0x30 && byte <= 0x39); // '0'-'9'
  }

  return result;
}

/**
 * Convert a token byte to its keyword string.
 * This is the reverse of keywordToToken() in tokenizer.ts.
 * 
 * Real ZX Spectrum tokens:
 * - 0x00-0x7F: ASCII characters (printed as-is)
 * - 0x80-0x8F: Block graphics
 * - 0x90-0xA2: UDGs
 * - 0xA3-0xA4: 128K tokens (SPECTRUM, PLAY)
 * - 0xA5-0xFF: BASIC keyword tokens
 * 
 * With real tokens, there's NO ambiguity - tokens are all >= 0xA3
 */
function getKeywordFromToken(byte: number): string | null {
  // ASCII range (0x00-0x7F) - not tokens, output as-is
  if (byte <= 0x7F) {
    return null;
  }
  
  // Block graphics (0x80-0x8F) and UDGs (0x90-0xA2) - not keyword tokens
  if (byte >= 0x80 && byte <= 0xA2) {
    return null;
  }

  // 0x0E is number marker - handled separately in detokenizeLine
  // (but with real tokens, 0x0E is in ASCII range so already returns null)

  // Real ZX Spectrum token map (0xA3-0xFF)
  const tokenToKeyword: Record<number, string> = {
    // 128K tokens
    0xA3: "SPECTRUM",
    0xA4: "PLAY",
    
    // Function tokens (0xA5-0xC4)
    0xA5: "RND",
    0xA6: "INKEY$",
    0xA7: "PI",
    0xA8: "FN",
    0xA9: "POINT",
    0xAA: "SCREEN$",
    0xAB: "ATTR",
    0xAC: "AT",
    0xAD: "TAB",
    0xAE: "VAL$",
    0xAF: "CODE",
    0xB0: "VAL",
    0xB1: "LEN",
    0xB2: "SIN",
    0xB3: "COS",
    0xB4: "TAN",
    0xB5: "ASN",
    0xB6: "ACS",
    0xB7: "ATN",
    0xB8: "LN",
    0xB9: "EXP",
    0xBA: "INT",
    0xBB: "SQR",
    0xBC: "SGN",
    0xBD: "ABS",
    0xBE: "PEEK",
    0xBF: "IN",
    0xC0: "USR",
    0xC1: "STR$",
    0xC2: "CHR$",
    0xC3: "NOT",
    0xC4: "BIN",
    
    // Operator tokens (0xC5-0xCD)
    0xC5: "OR",
    0xC6: "AND",
    0xC7: "<=",
    0xC8: ">=",
    0xC9: "<>",
    0xCA: "LINE",
    0xCB: "THEN",
    0xCC: "TO",
    0xCD: "STEP",
    
    // Command tokens (0xCE-0xFF)
    0xCE: "DEF FN",
    0xCF: "CAT",
    0xD0: "FORMAT",
    0xD1: "MOVE",
    0xD2: "ERASE",
    0xD3: "OPEN #",
    0xD4: "CLOSE #",
    0xD5: "MERGE",
    0xD6: "VERIFY",
    0xD7: "BEEP",
    0xD8: "CIRCLE",
    0xD9: "INK",
    0xDA: "PAPER",
    0xDB: "FLASH",
    0xDC: "BRIGHT",
    0xDD: "INVERSE",
    0xDE: "OVER",
    0xDF: "OUT",
    0xE0: "LPRINT",
    0xE1: "LLIST",
    0xE2: "STOP",
    0xE3: "READ",
    0xE4: "DATA",
    0xE5: "RESTORE",
    0xE6: "NEW",
    0xE7: "BORDER",
    0xE8: "CONTINUE",
    0xE9: "DIM",
    0xEA: "REM",
    0xEB: "FOR",
    0xEC: "GO TO",
    0xED: "GO SUB",
    0xEE: "INPUT",
    0xEF: "LOAD",
    0xF0: "LIST",
    0xF1: "LET",
    0xF2: "PAUSE",
    0xF3: "NEXT",
    0xF4: "POKE",
    0xF5: "PRINT",
    0xF6: "PLOT",
    0xF7: "RUN",
    0xF8: "SAVE",
    0xF9: "RANDOMIZE",
    0xFA: "IF",
    0xFB: "CLS",
    0xFC: "DRAW",
    0xFD: "CLEAR",
    0xFE: "RETURN",
    0xFF: "COPY",
  };

  return tokenToKeyword[byte] || null;
}

/**
 * Create MDR file from BASIC source code
 * Supports multi-sector programs (programs larger than 512 bytes)
 * @param basicSource - BASIC program source code
 * @param programName - Program name (max 10 characters)
 * @param cartridgeName - Cartridge name (max 10 characters)
 * @returns MDR format buffer
 */
export function createMdrFile(
  basicSource: string,
  programName: string,
  cartridgeName: string = "ZXBASIC",
): Buffer {
  // Validate inputs
  if (programName.length > 10) {
    throw new Error("Program name must be 10 characters or less");
  }
  if (cartridgeName.length > 10) {
    throw new Error("Cartridge name must be 10 characters or less");
  }

  // Create buffer for MDR file
  const mdrBuffer = Buffer.alloc(MDR_FILE_SIZE, 0);

  // Convert BASIC source to tokenized format
  const tokenizedData = tokenizeBasic(basicSource);

  // Calculate how many sectors we need (512 bytes per sector data area)
  const DATA_PER_SECTOR = 512;
  const numSectors = Math.ceil(tokenizedData.length / DATA_PER_SECTOR);
  
  // MDR can hold max 254 sectors
  if (numSectors > 254) {
    throw new Error(`Program too large: requires ${numSectors} sectors, max is 254`);
  }

  // Write each sector
  for (let sectorIdx = 0; sectorIdx < numSectors; sectorIdx++) {
    const dataOffset = sectorIdx * DATA_PER_SECTOR;
    const dataEnd = Math.min(dataOffset + DATA_PER_SECTOR, tokenizedData.length);
    const sectorData = tokenizedData.subarray(dataOffset, dataEnd);
    
    // Pad sector data to 512 bytes if needed
    const paddedData = new Uint8Array(DATA_PER_SECTOR);
    paddedData.set(sectorData);
    
    // Determine record flags
    // 0x00 = normal block, 0x01 = EOF (last block), 0x02 = first block
    let recordFlags = 0x00;
    if (sectorIdx === 0) {
      recordFlags |= 0x02; // First block
    }
    if (sectorIdx === numSectors - 1) {
      recordFlags |= 0x01; // Last block (EOF)
    }

    const sector: MdrSector = {
      header: {
        flag: 0x01,
        sectorNumber: 254 - sectorIdx, // Start from 254 and count down
        name: cartridgeName.padEnd(10, " "),
        checksum: 0, // Will be calculated
      },
      record: {
        flags: recordFlags,
        sequence: sectorIdx,
        length: sectorData.length,
        filename: programName.padEnd(10, " "),
        checksum: 0, // Will be calculated
      },
      data: paddedData,
      dataChecksum: 0, // Will be calculated
    };

    // Calculate checksums
    sector.header.checksum = calculateHeaderChecksum(sector);
    sector.record.checksum = calculateRecordChecksum(sector);
    sector.dataChecksum = calculateMdrChecksum(sector.data);

    // Write sector to buffer
    writeMdrSector(mdrBuffer, sector, sectorIdx);
  }

  // Mark as not write-protected
  mdrBuffer[MDR_FILE_SIZE - 1] = 0;

  return mdrBuffer;
}

/**
 * Calculate header checksum for sector
 */
function calculateHeaderChecksum(sector: MdrSector): number {
  const headerData = new Uint8Array([
    sector.header.flag,
    sector.header.sectorNumber,
    0,
    0, // unused bytes
    ...Array.from(Buffer.from(sector.header.name.padEnd(10, " "))),
  ]);
  return calculateMdrChecksum(headerData);
}

/**
 * Calculate record checksum for sector
 */
function calculateRecordChecksum(sector: MdrSector): number {
  const recordData = new Uint8Array([
    sector.record.flags,
    sector.record.sequence,
    sector.record.length & 0xff,
    (sector.record.length >> 8) & 0xff,
    ...Array.from(Buffer.from(sector.record.filename.padEnd(10, " "))),
  ]);
  return calculateMdrChecksum(recordData);
}

/**
 * Write MDR sector to buffer
 */
function writeMdrSector(
  buffer: Buffer,
  sector: MdrSector,
  sectorIndex: number,
): void {
  const offset = sectorIndex * MDR_SECTOR_SIZE;

  // Write header
  buffer[offset] = sector.header.flag;
  buffer[offset + 1] = sector.header.sectorNumber;
  buffer[offset + 2] = 0; // unused
  buffer[offset + 3] = 0; // unused
  buffer.write(sector.header.name.padEnd(10, " "), offset + 4, 10, "ascii");
  buffer[offset + 14] = sector.header.checksum;

  // Write record descriptor
  buffer[offset + 15] = sector.record.flags;
  buffer[offset + 16] = sector.record.sequence;
  buffer.writeUInt16LE(sector.record.length, offset + 17);
  buffer.write(
    sector.record.filename.padEnd(10, " "),
    offset + 19,
    10,
    "ascii",
  );
  buffer[offset + 29] = sector.record.checksum;

  // Write data
  Buffer.from(sector.data).copy(buffer, offset + 30);
  buffer[offset + 542] = sector.dataChecksum;
}

/**
 * Simple BASIC tokenizer (simplified version)
 * Real implementation would use full ZX BASIC tokenizer
 */
export function tokenizeBasic(source: string): Uint8Array {
  const lines = source.split("\n");
  // Start with initial capacity, will grow as needed
  let result = new Uint8Array(4096);
  let position = 0;

  const ensureCapacity = (needed: number) => {
    if (position + needed > result.length) {
      const newSize = Math.max(result.length * 2, position + needed);
      const newResult = new Uint8Array(newSize);
      newResult.set(result);
      result = newResult;
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Parse line number (first token should be line number)
    const lineNumberMatch = trimmedLine.match(/^(\d+)\s+/);
    if (!lineNumberMatch) continue;

    const lineNumber = parseInt(lineNumberMatch[1]);
    const lineContent = trimmedLine.substring(lineNumberMatch[0].length);

    // Tokenize the line content
    const tokens = tokenizeLine(lineContent);
    const lineLength = tokens.length + 1; // +1 for 0x0D terminator

    // Ensure we have room for this line (4 bytes header + tokens + terminator)
    ensureCapacity(4 + tokens.length + 1);

    // Write line number (2 bytes, little-endian)
    result[position++] = lineNumber & 0xff;
    result[position++] = (lineNumber >> 8) & 0xff;

    // Write line length (2 bytes, little-endian)
    result[position++] = lineLength & 0xff;
    result[position++] = (lineLength >> 8) & 0xff;

    // Write tokens
    for (const token of tokens) {
      result[position++] = token;
    }

    // Write terminator
    result[position++] = 0x0d;
  }

  return result.subarray(0, position);
}

/**
 * Repair MDR sector using specified policy
 */
export function repairMdrSector(
  sector: MdrSector,
  policy: MdrErrorPolicy,
): MdrSector {
  const repaired = { ...sector };

  // Apply repair policies
  if (policy & MdrErrorPolicy.FIX_HEADER) {
    repaired.header.checksum = calculateHeaderChecksum(repaired);
  }

  if (policy & MdrErrorPolicy.FIX_RECORD) {
    repaired.record.checksum = calculateRecordChecksum(repaired);
  }

  if (policy & MdrErrorPolicy.FIX_DATA) {
    repaired.dataChecksum = calculateMdrChecksum(repaired.data);
  }

  return repaired;
}

/**
 * Create empty MDR file with specified cartridge name
 */
export function createEmptyMdr(cartridgeName: string = "EMPTY"): Buffer {
  const mdrBuffer = Buffer.alloc(MDR_FILE_SIZE, 0);

  // Create minimal valid sector
  const sector: MdrSector = {
    header: {
      flag: 0x01,
      sectorNumber: 254,
      name: cartridgeName.padEnd(10, " ").substring(0, 10),
      checksum: 0,
    },
    record: {
      flags: 0x00,
      sequence: 0,
      length: 0,
      filename: "EMPTY   ",
      checksum: 0,
    },
    data: Buffer.alloc(512, 0),
    dataChecksum: 0,
  };

  // Calculate checksums
  sector.header.checksum = calculateHeaderChecksum(sector);
  sector.record.checksum = calculateRecordChecksum(sector);
  sector.dataChecksum = calculateMdrChecksum(sector.data);

  // Write sector
  writeMdrSector(mdrBuffer, sector, 0);

  // Mark as not write-protected
  mdrBuffer[MDR_FILE_SIZE - 1] = 0;

  return mdrBuffer;
}

/**
 * Get MDR sector by number
 */
export function getMdrSector(
  mdrBuffer: Buffer,
  sectorNumber: number,
): MdrSector | null {
  // Sector numbers are 254 down to 1
  // Sector 254 is at position 0, 253 at 1, ..., 1 at 253
  const logicalSector = 254 - sectorNumber;
  if (logicalSector < 0 || logicalSector >= MDR_TOTAL_SECTORS) {
    return null;
  }

  const offset = logicalSector * MDR_SECTOR_SIZE;
  const sectorBuffer = mdrBuffer.subarray(offset, offset + MDR_SECTOR_SIZE);

  return parseMdrSector(sectorBuffer, sectorNumber);
}

/**
 * Check if buffer is valid MDR file
 */
export function isValidMdrFile(buffer: Buffer): boolean {
  // Check size
  if (buffer.length !== MDR_FILE_SIZE) return false;

  // Check first sector header flag
  if (buffer[0] !== 0x01) return false;

  // Check sector count
  if (buffer[1] !== 254) return false;

  return true;
}

/**
 * Get MDR file information without full parsing
 */
export function getMdrInfo(buffer: Buffer): {
  valid: boolean;
  cartridgeName?: string;
  writeProtected: boolean;
  sectorCount: number;
} {
  if (!isValidMdrFile(buffer)) {
    return { valid: false, writeProtected: false, sectorCount: 0 };
  }

  return {
    valid: true,
    cartridgeName: buffer.subarray(4, 14).toString("ascii").trim(),
    writeProtected: buffer[buffer.length - 1] !== 0,
    sectorCount: MDR_TOTAL_SECTORS,
  };
}
