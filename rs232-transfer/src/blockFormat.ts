/**
 * ZX Spectrum Block Format for RS232 Transfer
 *
 * This module handles the tape-compatible block format used by Interface 1
 * for RS232 transfers. The format consists of:
 * - Header block (19 bytes): flag byte + type + filename + length + params + checksum
 * - Data block: flag byte + data + checksum
 */

/**
 * Block types as used in ZX Spectrum tape format
 */
export enum BlockType {
  PROGRAM = 0x00,
  NUMBER_ARRAY = 0x01,
  CHARACTER_ARRAY = 0x02,
  CODE = 0x03,
}

/**
 * Flag bytes for tape blocks
 */
export enum BlockFlag {
  HEADER = 0x00,
  DATA = 0xff,
}

/**
 * Header block structure (17 bytes without flag and checksum)
 */
export interface HeaderBlock {
  type: BlockType;
  filename: string; // 10 characters, space-padded
  dataLength: number; // Length of data block
  param1: number; // For PROGRAM: autostart line (or >=32768 for none)
  param2: number; // For PROGRAM: start of variable area offset
}

/**
 * Calculate XOR checksum for a block of data
 */
export function calculateChecksum(data: Buffer): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i];
  }
  return checksum;
}

/**
 * Pad or truncate filename to exactly 10 characters
 */
export function normalizeFilename(name: string): string {
  const cleaned = name.replace(/[^\x20-\x7E]/g, '').substring(0, 10);
  return cleaned.padEnd(10, ' ');
}

/**
 * Create a header block for a BASIC program
 *
 * @param filename - Program name (max 10 chars)
 * @param dataLength - Length of the BASIC program data
 * @param autostartLine - Line number to auto-run (0 or >= 32768 for no autostart)
 * @param variablesOffset - Offset to variables area (usually = dataLength)
 */
export function createProgramHeader(
  filename: string,
  dataLength: number,
  autostartLine: number = 0,
  variablesOffset?: number
): Buffer {
  const header = Buffer.alloc(19);

  // Flag byte for header
  header[0] = BlockFlag.HEADER;

  // Block type
  header[1] = BlockType.PROGRAM;

  // Filename (10 bytes, space-padded)
  const normalizedName = normalizeFilename(filename);
  header.write(normalizedName, 2, 10, 'ascii');

  // Data length (2 bytes, little-endian)
  header.writeUInt16LE(dataLength, 12);

  // Parameter 1: autostart line (2 bytes, little-endian)
  // Use value >= 32768 to indicate no autostart
  const autostart = autostartLine > 0 && autostartLine <= 9999 ? autostartLine : 32768;
  header.writeUInt16LE(autostart, 14);

  // Parameter 2: offset to variables area (2 bytes, little-endian)
  // For a program, this is typically the length of the BASIC portion
  const varsOffset = variablesOffset !== undefined ? variablesOffset : dataLength;
  header.writeUInt16LE(varsOffset, 16);

  // Checksum of bytes 0-17 (flag + header data)
  header[18] = calculateChecksum(header.subarray(0, 18));

  return header;
}

/**
 * Create a data block with flag byte and checksum
 *
 * @param data - The raw data to wrap
 */
export function createDataBlock(data: Buffer): Buffer {
  const block = Buffer.alloc(data.length + 2);

  // Flag byte for data
  block[0] = BlockFlag.DATA;

  // Copy data
  data.copy(block, 1);

  // Checksum of flag + data
  block[data.length + 1] = calculateChecksum(block.subarray(0, data.length + 1));

  return block;
}

/**
 * Create complete transfer package for a BASIC program
 * Returns header block followed by data block
 *
 * @param filename - Program name
 * @param basicData - Tokenized BASIC program data
 * @param autostartLine - Optional autostart line number
 */
export function createProgramPackage(
  filename: string,
  basicData: Buffer,
  autostartLine: number = 0
): Buffer {
  const header = createProgramHeader(filename, basicData.length, autostartLine);
  const dataBlock = createDataBlock(basicData);

  return Buffer.concat([header, dataBlock]);
}

/**
 * Parse a received header block
 *
 * @param block - 19-byte header block (with flag and checksum)
 * @returns Parsed header or null if invalid
 */
export function parseHeaderBlock(block: Buffer): HeaderBlock | null {
  if (block.length < 19) {
    return null;
  }

  // Verify flag byte
  if (block[0] !== BlockFlag.HEADER) {
    return null;
  }

  // Verify checksum
  const expectedChecksum = calculateChecksum(block.subarray(0, 18));
  if (block[18] !== expectedChecksum) {
    return null;
  }

  return {
    type: block[1] as BlockType,
    filename: block.subarray(2, 12).toString('ascii').trimEnd(),
    dataLength: block.readUInt16LE(12),
    param1: block.readUInt16LE(14),
    param2: block.readUInt16LE(16),
  };
}

/**
 * Parse a received data block
 *
 * @param block - Data block with flag and checksum
 * @returns Raw data or null if invalid checksum
 */
export function parseDataBlock(block: Buffer): Buffer | null {
  if (block.length < 2) {
    return null;
  }

  // Verify flag byte
  if (block[0] !== BlockFlag.DATA) {
    return null;
  }

  // Verify checksum (last byte)
  const expectedChecksum = calculateChecksum(block.subarray(0, block.length - 1));
  if (block[block.length - 1] !== expectedChecksum) {
    return null;
  }

  // Return data without flag and checksum
  return block.subarray(1, block.length - 1);
}

/**
 * Validate a complete program package (header + data)
 *
 * @param data - Complete received data
 * @returns Object with parsed header, data, and validation status
 */
export function validateProgramPackage(data: Buffer): {
  valid: boolean;
  header: HeaderBlock | null;
  programData: Buffer | null;
  error?: string;
} {
  if (data.length < 21) {
    return { valid: false, header: null, programData: null, error: 'Data too short' };
  }

  // Parse header (first 19 bytes)
  const header = parseHeaderBlock(data.subarray(0, 19));
  if (!header) {
    return { valid: false, header: null, programData: null, error: 'Invalid header block' };
  }

  // Parse data block (remaining bytes)
  const expectedDataBlockLength = header.dataLength + 2; // data + flag + checksum
  if (data.length < 19 + expectedDataBlockLength) {
    return { valid: false, header, programData: null, error: 'Data block incomplete' };
  }

  const programData = parseDataBlock(data.subarray(19, 19 + expectedDataBlockLength));
  if (!programData) {
    return { valid: false, header, programData: null, error: 'Invalid data block checksum' };
  }

  return { valid: true, header, programData };
}
