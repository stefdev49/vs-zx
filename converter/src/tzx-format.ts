/**
 * ZX Spectrum TZX File Format Handler
 * TZX is an advanced tape format that extends TAP with additional metadata
 * Specification: https://worldofspectrum.net/TZXformat.html
 */

import { parseTapFile } from './tap-format';

export interface TzxBlock {
  id: number;
  data: Buffer;
}

/**
 * Create a TZX file from TAP data
 * TZX format:
 * - 8 bytes: signature "ZXTape!" + 0x1A
 * - 1 byte: major version
 * - 1 byte: minor version
 * - Blocks with specific IDs
 */
export function convertTapToTzx(tapData: Buffer): Buffer {
  const blocks: Buffer[] = [];
  
  // TZX header
  const header = Buffer.alloc(10);
  header.write('ZXTape!', 0, 'ascii');
  header[7] = 0x1A; // EOF marker
  header[8] = 1;    // Major version
  header[9] = 20;   // Minor version
  blocks.push(header);
  
  // Parse TAP blocks and convert to TZX blocks
  const tapBlocks = parseTapFile(tapData);
  
  for (const tapBlock of tapBlocks) {
    // ID 0x10: Standard Speed Data Block
    const tzxBlock = createStandardSpeedDataBlock(tapBlock.data);
    blocks.push(tzxBlock);
  }
  
  return Buffer.concat(blocks);
}

/**
 * Create TZX Standard Speed Data Block (ID 0x10)
 * This block stores data in the same format as TAP
 */
function createStandardSpeedDataBlock(data: Buffer): Buffer {
  const block = Buffer.alloc(5 + data.length);
  
  // Block ID
  block[0] = 0x10;
  
  // Pause after block (milliseconds, little-endian)
  block[1] = 0xE8; // 1000ms = 0x03E8
  block[2] = 0x03;
  
  // Data length (little-endian)
  const dataLength = data.length;
  block[3] = dataLength & 0xFF;
  block[4] = (dataLength >> 8) & 0xFF;
  
  // Data
  data.copy(block, 5);
  
  return block;
}

/**
 * Parse TZX file into blocks
 */
export function parseTzxFile(tzxData: Buffer): TzxBlock[] {
  const blocks: TzxBlock[] = [];
  
  // Verify TZX signature
  if (tzxData.length < 10) {
    throw new Error('Invalid TZX file: too short');
  }
  
  const signature = tzxData.toString('ascii', 0, 7);
  if (signature !== 'ZXTape!' || tzxData[7] !== 0x1A) {
    throw new Error('Invalid TZX file: bad signature');
  }
  
  // Skip header (10 bytes)
  let offset = 10;
  
  while (offset < tzxData.length) {
    const blockId = tzxData[offset];
    offset++;
    
    let blockLength = 0;
    
    // Determine block length based on ID
    switch (blockId) {
      case 0x10: // Standard Speed Data Block
        if (offset + 4 > tzxData.length) break;
        blockLength = tzxData[offset + 2] | (tzxData[offset + 3] << 8);
        blockLength += 4; // Include pause and length fields
        break;
      
      case 0x11: // Turbo Speed Data Block
        if (offset + 18 > tzxData.length) break;
        blockLength = tzxData[offset + 15] | (tzxData[offset + 16] << 8) | (tzxData[offset + 17] << 16);
        blockLength += 18;
        break;
      
      case 0x12: // Pure Tone
        blockLength = 4;
        break;
      
      case 0x13: // Pulse Sequence
        if (offset + 1 > tzxData.length) break;
        blockLength = 1 + tzxData[offset] * 2;
        break;
      
      case 0x14: // Pure Data Block
        if (offset + 10 > tzxData.length) break;
        blockLength = tzxData[offset + 7] | (tzxData[offset + 8] << 8) | (tzxData[offset + 9] << 16);
        blockLength += 10;
        break;
      
      case 0x20: // Pause or Stop the Tape
        blockLength = 2;
        break;
      
      case 0x21: // Group Start
        if (offset + 1 > tzxData.length) break;
        blockLength = 1 + tzxData[offset];
        break;
      
      case 0x22: // Group End
        blockLength = 0;
        break;
      
      case 0x30: // Text Description
        if (offset + 1 > tzxData.length) break;
        blockLength = 1 + tzxData[offset];
        break;
      
      case 0x32: // Archive Info
        if (offset + 2 > tzxData.length) break;
        blockLength = 2 + (tzxData[offset] | (tzxData[offset + 1] << 8));
        break;
      
      default:
        console.warn(`Unknown TZX block ID: 0x${blockId.toString(16)}`);
        break;
    }
    
    if (blockLength === 0 || offset + blockLength > tzxData.length) {
      break;
    }
    
    const blockData = tzxData.slice(offset, offset + blockLength);
    blocks.push({
      id: blockId,
      data: blockData
    });
    
    offset += blockLength;
  }
  
  return blocks;
}

/**
 * Convert TZX file back to TAP format
 */
export function convertTzxToTap(tzxData: Buffer): Buffer {
  const blocks = parseTzxFile(tzxData);
  const tapBlocks: Buffer[] = [];
  
  for (const block of blocks) {
    if (block.id === 0x10) {
      // Standard Speed Data Block - extract TAP data
      if (block.data.length >= 4) {
        const dataLength = block.data[2] | (block.data[3] << 8);
        const data = block.data.slice(4, 4 + dataLength);
        
        // Create TAP block with length prefix
        const tapBlock = Buffer.alloc(2 + data.length);
        tapBlock[0] = data.length & 0xFF;
        tapBlock[1] = (data.length >> 8) & 0xFF;
        data.copy(tapBlock, 2);
        
        tapBlocks.push(tapBlock);
      }
    }
  }
  
  return Buffer.concat(tapBlocks);
}

/**
 * Get TZX file metadata
 */
export interface TzxMetadata {
  version: string;
  blockCount: number;
  hasTextDescription?: string;
}

export function getTzxMetadata(tzxData: Buffer): TzxMetadata {
  if (tzxData.length < 10) {
    throw new Error('Invalid TZX file');
  }
  
  const majorVersion = tzxData[8];
  const minorVersion = tzxData[9];
  const version = `${majorVersion}.${minorVersion}`;
  
  const blocks = parseTzxFile(tzxData);
  
  let textDescription: string | undefined;
  
  // Look for text description block (ID 0x30)
  for (const block of blocks) {
    if (block.id === 0x30 && block.data.length > 1) {
      const textLength = block.data[0];
      textDescription = block.data.toString('ascii', 1, 1 + textLength);
      break;
    }
  }
  
  return {
    version,
    blockCount: blocks.length,
    hasTextDescription: textDescription
  };
}

/**
 * Create TZX with text description
 */
export function createTzxWithDescription(tapData: Buffer, description: string): Buffer {
  const blocks: Buffer[] = [];
  
  // TZX header
  const header = Buffer.alloc(10);
  header.write('ZXTape!', 0, 'ascii');
  header[7] = 0x1A;
  header[8] = 1;
  header[9] = 20;
  blocks.push(header);
  
  // Add text description block (ID 0x30)
  if (description && description.length > 0) {
    const descLength = Math.min(description.length, 255);
    const descBlock = Buffer.alloc(2 + descLength);
    descBlock[0] = 0x30; // Block ID
    descBlock[1] = descLength;
    descBlock.write(description, 2, descLength, 'ascii');
    blocks.push(descBlock);
  }
  
  // Parse TAP blocks and convert
  const tapBlocks = parseTapFile(tapData);
  for (const tapBlock of tapBlocks) {
    const tzxBlock = createStandardSpeedDataBlock(tapBlock.data);
    blocks.push(tzxBlock);
  }
  
  return Buffer.concat(blocks);
}
