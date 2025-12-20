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

    // Extract BASIC programs from valid sectors
    if (sectorErrors.length === 0 && isBasicSector(sector)) {
      try {
        const programSource = extractBasicFromSector(sector);
        if (programSource.trim()) {
          programs.push({
            name: sector.record.filename.trim() || `PROGRAM${sectorIndex}`,
            source: programSource,
            sector: sector.header.sectorNumber,
          });
        }
      } catch (error) {
        // Skip sectors that can't be parsed as BASIC
        console.warn(
          `Failed to extract BASIC from sector ${sector.header.sectorNumber}: ${error}`,
        );
      }
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
  let source = "";
  let position = 0;

  while (position < sector.data.length - 2) {
    // Read line number (2 bytes, little-endian)
    const lineNumber = sector.data[position] | (sector.data[position + 1] << 8);
    position += 2;

    // Read line length (2 bytes, little-endian)
    const lineLength = sector.data[position] | (sector.data[position + 1] << 8);
    position += 2;

    if (lineLength === 0) break;

    // Extract line content (excluding terminator)
    const lineContent = sector.data.subarray(
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
 * Simple token to keyword mapping for detokenization
 */
function detokenizeLine(tokens: Uint8Array): string {
  let result = "";
  let i = 0;
  let lastWasToken = false;

  while (i < tokens.length) {
    const token = tokens[i];

    // Handle number encoding (0x0E marker followed by 2 bytes for small integers)
    if (token === 0x0e && i + 2 < tokens.length) {
      const numLow = tokens[i + 1];
      const numHigh = tokens[i + 2];
      const num = numLow | (numHigh << 8);
      
      if (lastWasToken && result.length > 0) {
        result += " ";
      }
      result += num.toString();
      i += 3;
      lastWasToken = false;
      continue;
    }

    // Try to interpret as keyword token first (before treating as ASCII)
    // This is necessary because the tokenizer uses 0x00-0x5B for tokens,
    // which overlaps with ASCII range
    const keyword = getKeywordFromToken(token);

    if (keyword !== null) {
      // This is a ZX BASIC keyword token
      if (lastWasToken && result.length > 0) {
        // Add space between consecutive tokens
        result += " ";
      }
      result += keyword;
      i++;
      lastWasToken = true;
    } else {
      // Not a keyword token - treat as ASCII
      // If the last thing was a token and this is not a space, add a space
      if (lastWasToken && token !== 0x20 && result.length > 0) {
        result += " ";
      }
      result += String.fromCharCode(token);
      i++;
      lastWasToken = false;
    }
  }

  return result;
}

function getKeywordFromToken(token: number): string | null {
  // This function needs to match the tokenizer's encoding in tokenizer.ts
  // The tokenizer uses a non-standard encoding where tokens are in ranges 0x00-0x5B
  // This is NOT the real ZX Spectrum format (which uses 0xA3+), but we need to
  // detokenize what the tokenizer creates for round-trip consistency
  
  // Number marker (0x0E) - handled separately in detokenizeLine  
  if (token === 0x0e) {
    return null;
  }

  // ASCII characters that are NEVER tokens (punctuation, separators)
  // These are always output as ASCII by the tokenizer
  const neverTokens = [
    0x20, // space
    0x21, // !
    0x22, // "
    0x27, // '
    0x28, // (
    0x29, // )
    0x2c, // ,
    0x2e, // .
    0x3a, // :
    0x3b, // ;
    0x3c, // <
    0x3d, // =
    0x3e, // >
    0x3f, // ?
  ];
  
  if (neverTokens.includes(token)) {
    return null;
  }

  // Note: This mapping must match TOKEN_MAP in tokenizer.ts
  // Function/expression tokens (0x00-0x1F)
  const functionTokens: Record<number, string> = {
    0x00: "RND",
    0x01: "INKEY$",
    0x02: "PI",
    0x03: "FN",
    0x04: "POINT",
    0x05: "SCREEN$",
    0x06: "ATTR",
    0x07: "AT",
    0x08: "TAB",
    0x09: "VAL$",
    0x0a: "CODE",
    0x0b: "VAL",
    0x0c: "LEN",
    0x0d: "SIN",
    // 0x0e is number marker
    0x0f: "TAN",
    0x10: "ASN",
    0x11: "ACS",
    0x12: "ATN",
    0x13: "LN",
    0x14: "EXP",
    0x15: "INT",
    0x16: "SQR",
    0x17: "SGN",
    0x18: "ABS",
    0x19: "PEEK",
    0x1a: "IN",
    0x1b: "USR",
    0x1c: "STR$",
    0x1d: "CHR$",
    0x1e: "NOT",
    0x1f: "BIN",
  };

  if (functionTokens[token]) {
    return functionTokens[token];
  }

  // Operator tokens that don't overlap with essential ASCII
  const operatorTokens: Record<number, string> = {
    0x20: "**",  // Note: conflicts with space, but ** is tokenized specially
    0x21: "OR",  // Note: conflicts with !, but OR is tokenized as keyword
    0x22: "AND", // Note: conflicts with ", but AND is tokenized as keyword
    0x23: "<=",
    0x24: ">=",
    0x25: "<>",
    0x26: "LINE",
    0x27: "THEN",  // Note: conflicts with '
    0x28: "TO",    // Note: conflicts with (
    0x29: "STEP",  // Note: conflicts with )
    0x2a: "DEF FN",
    0x2b: "CAT",
    // Skip 0x2C (comma)
    0x2d: "MOVE",
    0x2e: "ERASE", // Note: conflicts with .
    0x2f: "OPEN #",
    0x30: "CLOSE #",
    0x31: "MERGE",
    0x32: "VERIFY",
    0x33: "BEEP",
    0x34: "CIRCLE",
    0x35: "INK",
    0x36: "PAPER",
    0x37: "FLASH",
    0x38: "BRIGHT",
    0x39: "INVERSE",
    // Skip 0x3A (colon)
    0x3b: "OUT",
    0x3c: "LPRINT",
    0x3d: "LLIST",
    0x3e: "STOP",
    0x3f: "READ",
  };

  if (operatorTokens[token]) {
    return operatorTokens[token];
  }

  // Command tokens (0x40-0x5B)
  const commandTokens: Record<number, string> = {
    0x40: "DATA",
    0x41: "RESTORE",
    0x42: "NEW",
    0x43: "BORDER",
    0x44: "CONTINUE",
    0x45: "DIM",
    0x46: "REM",
    0x47: "FOR",
    0x48: "GO TO",
    0x49: "GO SUB",
    0x4a: "INPUT",
    0x4b: "LOAD",
    0x4c: "LIST",
    0x4d: "LET",
    0x4e: "PAUSE",
    0x4f: "NEXT",
    0x50: "POKE",
    0x51: "PRINT",
    0x52: "PLOT",
    0x53: "RUN",
    0x54: "SAVE",
    0x55: "RANDOMIZE",
    0x56: "IF",
    0x57: "CLS",
    0x58: "DRAW",
    0x59: "CLEAR",
    0x5a: "RETURN",
    0x5b: "COPY",
  };

  if (commandTokens[token]) {
    return commandTokens[token];
  }

  // Anything else (ASCII characters, variable names, etc.) is not a token
  return null;
}

/**
 * Create MDR file from BASIC source code
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

  // Create first sector with program data
  const sector: MdrSector = {
    header: {
      flag: 0x01,
      sectorNumber: 254, // Start with last sector (254)
      name: cartridgeName.padEnd(10, " "),
      checksum: 0, // Will be calculated
    },
    record: {
      flags: 0x00, // Normal data block
      sequence: 0,
      length: Math.min(tokenizedData.length, 512),
      filename: programName.padEnd(10, " "),
      checksum: 0, // Will be calculated
    },
    data: tokenizedData.subarray(0, 512),
    dataChecksum: 0, // Will be calculated
  };

  // Calculate checksums
  sector.header.checksum = calculateHeaderChecksum(sector);
  sector.record.checksum = calculateRecordChecksum(sector);
  sector.dataChecksum = calculateMdrChecksum(sector.data);

  // Write sector to buffer
  writeMdrSector(mdrBuffer, sector, 0);

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
  let result = new Uint8Array(512);
  let position = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || position >= 512) continue;

    // Parse line number (first token should be line number)
    const lineNumberMatch = trimmedLine.match(/^(\d+)\s+/);
    if (!lineNumberMatch) continue;

    const lineNumber = parseInt(lineNumberMatch[1]);
    const lineContent = trimmedLine.substring(lineNumberMatch[0].length);

    // Tokenize the line content
    const tokens = tokenizeLine(lineContent);
    const lineLength = tokens.length + 1; // +1 for 0x0D terminator

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
