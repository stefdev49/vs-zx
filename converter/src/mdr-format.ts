// MDR (Microdrive) Format Support for ZX BASIC Extension
// Based on mdv2img by Volker Bartheld <vbartheld@gmx.de>
// WinZ80 emulator compatible .mdr format

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

  // Parse data (remaining 513 bytes)
  const data = sectorBuffer.subarray(30, 543);
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
 */
function isBasicSector(sector: MdrSector): boolean {
  // BASIC programs typically have specific patterns
  // Check for line numbers, keywords, etc.
  try {
    // Simple heuristic: look for line number patterns
    const text = Buffer.from(sector.data).toString("ascii");
    return /^\d{1,4} /.test(text.trim());
  } catch (error) {
    return false;
  }
}

/**
 * Extract BASIC source from sector data
 */
function extractBasicFromSector(sector: MdrSector): string {
  // Convert data to ASCII and extract BASIC source
  // This is a simplified extraction - real implementation would use proper tokenizer
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

    // Extract line content
    const lineContent = sector.data.subarray(position, position + lineLength);
    position += lineLength;

    // Convert to text (simplified - real implementation would use proper tokenizer)
    const lineText = Buffer.from(lineContent)
      .toString("ascii")
      .replace(/\r/g, "")
      .replace(/\n/g, "")
      .replace(/\0/g, "");

    source += `${lineNumber} ${lineText}\n`;
  }

  return source;
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
function tokenizeBasic(source: string): Uint8Array {
  // This is a simplified tokenizer - real implementation would:
  // 1. Parse line numbers
  // 2. Convert keywords to tokens
  // 3. Handle variables and expressions
  // 4. Generate proper tokenized format

  // For now, just convert to ASCII bytes
  const lines = source.split("\n");
  let result = new Uint8Array(512);
  let position = 0;

  for (const line of lines) {
    if (!line.trim() || position >= 512) continue;

    // Simple line format: just store as ASCII
    const lineBytes = Buffer.from(line + "\r", "ascii");
    lineBytes.copy(result, position);
    position += lineBytes.length;
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
