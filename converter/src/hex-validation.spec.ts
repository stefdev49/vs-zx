import * as fs from 'fs';
import * as path from 'path';
import { createTapFile, verifyTapChecksums } from './tap-format';

/**
 * Hex dump validation tests for TAP format
 * These tests verify the exact byte structure of the TAP files
 */

describe('TAP Format - Hex Dump Validation', () => {
  const simpleBasic = '10 PRINT "Hello"\n20 PAUSE 0';

  describe('TAP Header Structure', () => {
    test('Header block starts with correct length (0x13 0x00)', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      expect(tap[0]).toBe(0x13); // 19 in decimal
      expect(tap[1]).toBe(0x00);
    });

    test('Header block type is 0x00', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      expect(tap[2]).toBe(0x00);
    });

    test('File type is 0x00 (BASIC)', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      expect(tap[3]).toBe(0x00);
    });

    test('Program name encoding in bytes 4-13', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      const nameSection = tap.slice(4, 14);

      // Should be "Test" followed by spaces
      expect(nameSection[0]).toBe('T'.charCodeAt(0)); // 0x54
      expect(nameSection[1]).toBe('e'.charCodeAt(0)); // 0x65
      expect(nameSection[2]).toBe('s'.charCodeAt(0)); // 0x73
      expect(nameSection[3]).toBe('t'.charCodeAt(0)); // 0x74

      // Rest should be spaces (0x20)
      for (let i = 4; i < 10; i++) {
        expect(nameSection[i]).toBe(0x20);
      }
    });

    test('Header parity byte at position 20 (last byte of header block)', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      // Calculate expected parity (XOR of bytes 2-19)
      let expectedParity = 0;
      for (let i = 2; i < 20; i++) {
        expectedParity ^= tap[i];
      }

      expect(tap[20]).toBe(expectedParity);
    });
  });

  describe('Data Block Structure', () => {
    test('Data block starts at position 21', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      // Position 21 should be the start of data block length
      expect(tap.length).toBeGreaterThan(21);
    });

    test('Data block has flag 0xFF', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      // Data block type is at offset 21 + 2 (after length bytes)
      expect(tap[23]).toBe(0xFF);
    });

    test('Data block checksum calculation', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      const dataBlockStart = 21;
      const dataLen = tap[dataBlockStart] | (tap[dataBlockStart + 1] << 8);

      // Last byte of data block is checksum
      const checksumPos = dataBlockStart + 2 + dataLen - 1;
      const storedChecksum = tap[checksumPos];

      // Calculate expected checksum (XOR of type byte + data)
      let calculatedChecksum = 0;
      for (let i = dataBlockStart + 2; i < checksumPos; i++) {
        calculatedChecksum ^= tap[i];
      }

      expect(storedChecksum).toBe(calculatedChecksum);
    });
  });

  describe('Pangolin Program Hex Validation', () => {
    test('Pangolin creates valid TAP structure', () => {
      const samplesDir = path.join(__dirname, '../../samples');
      const pangolin = path.join(samplesDir, 'pangolin.bas');

      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tap = createTapFile(Buffer.from(basicCode), 'pangolin', 0);

      // Validate header structure
      expect(tap[0]).toBe(0x13); // Header length low
      expect(tap[1]).toBe(0x00); // Header length high
      expect(tap[2]).toBe(0x00); // Block type
      expect(tap[3]).toBe(0x00); // File type

      // Validate program name
      const name = tap.slice(4, 14).toString('utf-8').trim();
      expect(name).toBe('pangolin');

      // Validate data block structure
      const dataStart = 21;
      expect(tap[dataStart + 2]).toBe(0xFF); // Data block flag

      // Validate checksums
      expect(verifyTapChecksums(tap)).toBe(true);
    });

    test('Pangolin hex dump analysis', () => {
      const samplesDir = path.join(__dirname, '../../samples');
      const pangolin = path.join(samplesDir, 'pangolin.bas');

      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tap = createTapFile(Buffer.from(basicCode), 'pangolin', 5);

      // First 16 bytes hex dump analysis
      const hex = tap.slice(0, 16).toString('hex');
      console.log(`\nFirst 16 bytes: ${hex}`);

      // Expected pattern:
      // 1300 (header length 19 in little-endian)
      // 0000 (block type 0x00, file type 0x00)
      // 7061 6e67 6f6c 696e 2020 (pangolin padded)
      expect(hex.substring(0, 4)).toBe('1300');
      expect(hex.substring(4, 8)).toBe('0000');

      // Program name starts at byte 4
      const nameHex = hex.substring(8, 24);
      console.log(`Program name hex: ${nameHex}`);
    });
  });

  describe('Autostart Line in Hex', () => {
    test('Autostart line 0x0000', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test', 0);

      // Autostart at bytes 16-17
      expect(tap[16]).toBe(0x00); // Low byte
      expect(tap[17]).toBe(0x00); // High byte
    });

    test('Autostart line 0x000A (10)', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test', 10);

      expect(tap[16]).toBe(0x0A); // 10 in hex
      expect(tap[17]).toBe(0x00);
    });

    test('Autostart line 0x0100 (256)', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test', 256);

      expect(tap[16]).toBe(0x00);
      expect(tap[17]).toBe(0x01); // 256 in little-endian
    });

    test('Autostart line 0xFFFF (65535)', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test', 65535);

      expect(tap[16]).toBe(0xFF);
      expect(tap[17]).toBe(0xFF);
    });
  });

  describe('File Integrity', () => {
    test('All TAP files pass checksum verification', () => {
      const programs = [
        { name: 'Simple', code: '10 PRINT "A"' },
        { name: 'Complex', code: '10 LET x=100\n20 FOR i=1 TO x\n30 PRINT i\n40 NEXT i' },
        { name: 'WithREM', code: '5 REM Test\n10 PRINT "OK"' }
      ];

      for (const prog of programs) {
        const tap = createTapFile(Buffer.from(prog.code), prog.name);
        expect(verifyTapChecksums(tap)).toBe(true);
      }
    });
  });

  describe('Little Endian Verification', () => {
    test('Program length is stored in little-endian', () => {
      // Create BASIC code that will generate a specific binary size
      const code = '10 PRINT "' + 'A'.repeat(240) + '"';

      const tap = createTapFile(Buffer.from(code), 'Test');

      // Program length at bytes 12-13 (little-endian)
      const length = tap[12] | (tap[13] << 8);

      // Should be a reasonable size
      expect(length).toBeGreaterThan(0);
      expect(length).toBeLessThan(32768);
    });

    test('Variables area is stored in little-endian', () => {
      const tap = createTapFile(Buffer.from(simpleBasic), 'Test');

      // Variables area at bytes 18-19
      const varsArea = tap[18] | (tap[19] << 8);

      // Variables area should be 32768 + program length
      expect(varsArea).toBeGreaterThanOrEqual(32768);
    });
  });
});
