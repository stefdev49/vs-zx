/**
 * ZX Spectrum TAP File Format Handler
 * TAP is an emulator format that represents ZX Spectrum tape files
 */

export interface TapBlock {
  data: Buffer;
  blockNumber: number;
}

export interface TapHeader {
  type: number; // 0x00 = header, 0xFF = data
  programName: string;
  programLength: number;
  autostart?: number; // Optional autostart line
  variablesArea?: number; // Optional variables area
}

/**
 * Create a TAP file header block
 * TAP format:
 * - 2 bytes: block length (little-endian, excluding these 2 bytes)
 * - 1 byte: type (0x00 = header)
 * - 17 bytes: header data
 * - 1 byte: checksum (XOR of all 18 bytes)
 */
export function createHeaderBlock(name: string, programLength: number, autostart?: number): Buffer {
  const headerData = Buffer.alloc(19);
  
  // Type: 0x00 for header
  headerData[0] = 0x00;
  
  // File type: 0x00 for BASIC program
  headerData[1] = 0x00;
  
  // Program name (10 bytes, padded with spaces)
  const nameBytes = Buffer.alloc(10, 0x20); // 0x20 = space
  const nameData = Buffer.from(name.substring(0, 10), 'utf-8');
  nameData.copy(nameBytes);
  nameBytes.copy(headerData, 2);
  
  // Program length (2 bytes, little-endian)
  headerData[12] = programLength & 0xFF;
  headerData[13] = (programLength >> 8) & 0xFF;
  
  // Autostart line (2 bytes, little-endian)
  // 0x8000 = no autostart (32768 in decimal)
  const autostartLine = autostart ?? 0x8000;
  headerData[14] = autostartLine & 0xFF;
  headerData[15] = (autostartLine >> 8) & 0xFF;
  
  // Variables area (2 bytes, little-endian)
  // Should be >= program_length + start_address
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
 * Create a TAP file data block
 * TAP format:
 * - 2 bytes: block length (little-endian, excluding these 2 bytes)
 * - 1 byte: type (0xFF for data)
 * - N bytes: program data
 * - 1 byte: checksum (XOR of all data)
 */
export function createDataBlock(programData: Buffer): Buffer {
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
 * Create a complete TAP file
 */
export function createTapFile(
  programData: Buffer,
  programName: string,
  autostart?: number
): Buffer {
  const headerBlock = createHeaderBlock(programName, programData.length, autostart);
  const dataBlock = createDataBlock(programData);
  
  return Buffer.concat([headerBlock, dataBlock]);
}

/**
 * Parse TAP file blocks
 */
export function parseTapFile(tapData: Buffer): TapBlock[] {
  const blocks: TapBlock[] = [];
  let offset = 0;

  while (offset < tapData.length) {
    if (offset + 2 > tapData.length) break;

    // Read block length
    const length = tapData[offset] | (tapData[offset + 1] << 8);
    offset += 2;

    if (offset + length > tapData.length) break;

    // Extract block data
    const blockData = tapData.slice(offset, offset + length);
    offset += length;

    blocks.push({
      data: blockData,
      blockNumber: blocks.length
    });
  }

  return blocks;
}

/**
 * Extract TAP file metadata
 */
export function getTapMetadata(tapData: Buffer): TapHeader | null {
  const blocks = parseTapFile(tapData);
  
  if (blocks.length === 0) return null;

  const headerBlock = blocks[0];
  
  if (headerBlock.data.length < 18 || headerBlock.data[0] !== 0x00) {
    return null;
  }

  // Extract program name (10 bytes, trim trailing spaces)
  const nameBytes = headerBlock.data.slice(2, 12);
  const programName = nameBytes.toString('utf-8').trimEnd();

  // Extract program length (little-endian)
  const programLength = headerBlock.data[12] | (headerBlock.data[13] << 8);

  // Extract autostart line (little-endian)
  const autostartValue = headerBlock.data[14] | (headerBlock.data[15] << 8);
  const autostart = autostartValue === 0x8000 ? undefined : autostartValue;

  // Extract variables area (little-endian)
  const variablesArea = headerBlock.data[16] | (headerBlock.data[17] << 8);

  return {
    type: 0x00,
    programName,
    programLength,
    autostart,
    variablesArea
  };
}

/**
 * Verify TAP file checksums
 */
export function verifyTapChecksums(tapData: Buffer): boolean {
  const blocks = parseTapFile(tapData);

  for (const block of blocks) {
    if (block.data.length < 1) continue;

    let checksum = 0;
    for (let i = 0; i < block.data.length - 1; i++) {
      checksum ^= block.data[i];
    }

    if (checksum !== block.data[block.data.length - 1]) {
      return false;
    }
  }

  return true;
}
