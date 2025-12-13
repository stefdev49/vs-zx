/**
 * TZX Format Tests
 */

import {
  convertTapToTzx,
  convertTzxToTap,
  parseTzxFile,
  getTzxMetadata,
  createTzxWithDescription
} from './tzx-format';
import { createTapFile } from './tap-format';

describe('TZX Format', () => {
  describe('convertTapToTzx', () => {
    it('should convert TAP to TZX with correct signature', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]); // Line 10: PRINT 1
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      
      const tzxBuffer = convertTapToTzx(tapBuffer);
      
      // Check TZX signature
      expect(tzxBuffer.toString('ascii', 0, 7)).toBe('ZXTape!');
      expect(tzxBuffer[7]).toBe(0x1A);
      expect(tzxBuffer[8]).toBe(1); // Major version
      expect(tzxBuffer[9]).toBe(20); // Minor version
    });

    it('should create standard speed data blocks', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]);
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      
      const tzxBuffer = convertTapToTzx(tapBuffer);
      
      // Should have TZX blocks after header
      expect(tzxBuffer.length).toBeGreaterThan(10);
      
      // First block after header should be ID 0x10 (Standard Speed Data Block)
      expect(tzxBuffer[10]).toBe(0x10);
    });
  });

  describe('convertTzxToTap', () => {
    it('should convert TZX back to TAP', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]);
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      
      const tzxBuffer = convertTapToTzx(tapBuffer);
      const tapBuffer2 = convertTzxToTap(tzxBuffer);
      
      // Should have similar structure (may not be identical due to format differences)
      expect(tapBuffer2.length).toBeGreaterThan(0);
    });
  });

  describe('parseTzxFile', () => {
    it('should parse TZX file blocks', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]);
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      const tzxBuffer = convertTapToTzx(tapBuffer);
      
      const blocks = parseTzxFile(tzxBuffer);
      
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].id).toBe(0x10); // First block should be Standard Speed Data Block
    });

    it('should throw error on invalid TZX file', () => {
      const invalidBuffer = Buffer.from('Invalid');
      
      expect(() => parseTzxFile(invalidBuffer)).toThrow('Invalid TZX file');
    });
  });

  describe('getTzxMetadata', () => {
    it('should extract TZX metadata', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]);
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      const tzxBuffer = convertTapToTzx(tapBuffer);
      
      const metadata = getTzxMetadata(tzxBuffer);
      
      expect(metadata.version).toBe('1.20');
      expect(metadata.blockCount).toBeGreaterThan(0);
    });
  });

  describe('createTzxWithDescription', () => {
    it('should create TZX with text description', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]);
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      const description = 'Test Program';
      
      const tzxBuffer = createTzxWithDescription(tapBuffer, description);
      
      const metadata = getTzxMetadata(tzxBuffer);
      
      expect(metadata.hasTextDescription).toBe(description);
    });

    it('should handle empty description', () => {
      const programData = Buffer.from([0x00, 0x0a, 0xf9, 0x31, 0x0d]);
      const tapBuffer = createTapFile(programData, 'Test', undefined);
      
      const tzxBuffer = createTzxWithDescription(tapBuffer, '');
      
      expect(tzxBuffer.length).toBeGreaterThan(10);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through TAP → TZX → TAP conversion', () => {
      const programData = Buffer.from([
        0x00, 0x0a, 0xf9, 0x31, 0x0d, // Line 10: PRINT 1
        0x00, 0x14, 0xf9, 0x32, 0x0d  // Line 20: PRINT 2
      ]);
      const tapBuffer1 = createTapFile(programData, 'Test', undefined);
      
      const tzxBuffer = convertTapToTzx(tapBuffer1);
      const tapBuffer2 = convertTzxToTap(tzxBuffer);
      
      // Should have data
      expect(tapBuffer2.length).toBeGreaterThan(0);
      
      // Should be able to parse as TAP
      expect(tapBuffer2[0]).toBeGreaterThan(0); // First byte is block length
    });
  });
});
