import * as fs from 'fs';
import * as path from 'path';
import {
  createTapFile,
  verifyTapChecksums,
  basicToTap
} from './bas2tap';

/**
 * Helper function to convert BASIC to TAP
 */
function convertToTap(basicCode: string, metadata: { name: string; autostart?: number }): Buffer {
  return createTapFile(Buffer.from(basicCode), metadata.name, metadata.autostart);
}

describe('Integration Tests - BAS2TAP Converter', () => {
  const samplesDir = path.join(__dirname, '../../samples');

  beforeAll(() => {
    // Ensure samples directory exists
    if (!fs.existsSync(samplesDir)) {
      console.warn(`Samples directory not found at ${samplesDir}`);
    }
  });

  describe('Pangolin Program (Complex BASIC)', () => {
    const pangolin = path.join(samplesDir, 'pangolin.bas');

    test('Convert pangolin.bas to TAP format', () => {
      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      expect(basicCode.length).toBeGreaterThan(0);

      const tapBuffer = convertToTap(basicCode, { name: 'pangolin' });

      expect(tapBuffer).toBeInstanceOf(Buffer);
      expect(tapBuffer.length).toBeGreaterThan(0);

      // TAP file should start with header block length (little-endian)
      // For BASIC header: 19 bytes (0x13 0x00)
      expect(tapBuffer[0]).toBe(0x13);
      expect(tapBuffer[1]).toBe(0x00);
    });

    test('TAP file contains valid header block', () => {
      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tapBuffer = convertToTap(basicCode, { name: 'pangolin' });

      // Check header structure
      // Bytes 2-3: Block type and file type (0x00 0x00 for BASIC)
      expect(tapBuffer[2]).toBe(0x00); // Block type header
      expect(tapBuffer[3]).toBe(0x00); // File type BASIC

      // Bytes 4-13: Program name (padded with spaces)
      const nameBytes = tapBuffer.slice(4, 14);
      const name = nameBytes.toString('utf-8').trim();
      expect(name).toBe('pangolin');
    });

    test('TAP file has valid checksum', () => {
      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tapBuffer = convertToTap(basicCode, { name: 'pangolin' });

      const isValid = verifyTapChecksums(tapBuffer);
      expect(isValid).toBe(true);
    });

    test('TAP file size is reasonable', () => {
      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tapBuffer = convertToTap(basicCode, { name: 'pangolin' });

      // TAP file should be larger than source due to headers, but not excessively so
      const sourceSize = basicCode.length;
      const tapSize = tapBuffer.length;

      expect(tapSize).toBeGreaterThan(sourceSize * 0.5);
      expect(tapSize).toBeLessThan(sourceSize * 2);
    });

    test('TAP file with autostart line', () => {
      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tapBuffer = convertToTap(basicCode, {
        name: 'pangolin',
        autostart: 100
      });

      expect(tapBuffer).toBeInstanceOf(Buffer);
      expect(tapBuffer.length).toBeGreaterThan(0);

      // Autostart line should be at bytes 16-17 (little-endian)
      // 100 = 0x64 0x00
      expect(tapBuffer[16]).toBe(100); // Autostart line low byte
      expect(tapBuffer[17]).toBe(0); // Autostart line high byte
    });

    test('TAP file can be saved and loaded', () => {
      if (!fs.existsSync(pangolin)) {
        console.warn(`Skipping: ${pangolin} not found`);
        return;
      }

      const basicCode = fs.readFileSync(pangolin, 'utf-8');
      const tapBuffer = convertToTap(basicCode, { name: 'pangolin' });

      // Save to temp file
      const tempFile = path.join(__dirname, 'temp_pangolin_test.tap');
      fs.writeFileSync(tempFile, tapBuffer);

      try {
        // Verify file was written
        expect(fs.existsSync(tempFile)).toBe(true);

        // Read back and verify
        const readBuffer = fs.readFileSync(tempFile);
        expect(readBuffer.length).toBe(tapBuffer.length);
        expect(readBuffer.equals(tapBuffer)).toBe(true);

        // Verify checksum still valid
        const isValid = verifyTapChecksums(readBuffer);
        expect(isValid).toBe(true);
      } finally {
        // Clean up
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });

  describe('Sample Programs', () => {
    test('Convert all .bas files in samples directory', () => {
      if (!fs.existsSync(samplesDir)) {
        console.warn(`Samples directory not found at ${samplesDir}`);
        return;
      }

      const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.bas'));

      if (files.length === 0) {
        console.warn('No .bas files found in samples directory');
        return;
      }

      for (const file of files) {
        const filePath = path.join(samplesDir, file);
        const basicCode = fs.readFileSync(filePath, 'utf-8');
        const name = path.basename(file, '.bas');

        // Should not throw
        const tapBuffer = convertToTap(basicCode, { name });

        expect(tapBuffer).toBeInstanceOf(Buffer);
        expect(tapBuffer.length).toBeGreaterThan(0);
        expect(verifyTapChecksums(tapBuffer)).toBe(true);
      }
    });
  });

  describe('TAP Format Specifications', () => {
    const simpleBasic = `
10 PRINT "Hello"
20 PAUSE 0
`;

    test('TAP file has two blocks (header and data)', () => {
      const tapBuffer = convertToTap(simpleBasic, { name: 'Test' });

      // First block: header (21 bytes: 2-byte length + 19-byte header)
      const headerLen = tapBuffer[0] | (tapBuffer[1] << 8);
      expect(headerLen).toBe(19);

      // Second block starts at offset 2 + 19 = 21
      const dataLenOffset = 21;
      const dataLen = tapBuffer[dataLenOffset] | (tapBuffer[dataLenOffset + 1] << 8);

      expect(dataLen).toBeGreaterThan(0);
    });

    test('Header block has correct structure', () => {
      const tapBuffer = convertToTap(simpleBasic, { name: 'Test' });

      // Type 0x00 (header)
      expect(tapBuffer[2]).toBe(0x00);

      // File type 0x00 (BASIC)
      expect(tapBuffer[3]).toBe(0x00);

      // Program name
      const nameBytes = tapBuffer.slice(4, 14);
      expect(nameBytes[0]).toBe('T'.charCodeAt(0));
      expect(nameBytes[1]).toBe('e'.charCodeAt(0));
      expect(nameBytes[2]).toBe('s'.charCodeAt(0));
      expect(nameBytes[3]).toBe('t'.charCodeAt(0));
      // Rest should be spaces (0x20)
      for (let i = 4; i < 10; i++) {
        expect(nameBytes[i]).toBe(0x20);
      }
    });

    test('Data block has flag 0xFF', () => {
      const tapBuffer = convertToTap(simpleBasic, { name: 'Test' });

      // Data block starts at offset 21 (after header length + header data)
      const dataBlockStart = 21;
      const dataLen = tapBuffer[dataBlockStart] | (tapBuffer[dataBlockStart + 1] << 8);

      // Data block type should be 0xFF
      expect(tapBuffer[dataBlockStart + 2]).toBe(0xFF);
    });

    test('Checksum verification for each block', () => {
      const tapBuffer = convertToTap(simpleBasic, { name: 'Test' });

      // Verify header block checksum (last byte of first block)
      const headerChecksum = tapBuffer[20]; // Last byte of 21-byte header block
      let headerCalc = 0;
      for (let i = 2; i < 20; i++) {
        headerCalc ^= tapBuffer[i];
      }
      expect(headerChecksum).toBe(headerCalc);

      // Verify data block checksum
      const dataBlockStart = 21;
      const dataLen = tapBuffer[dataBlockStart] | (tapBuffer[dataBlockStart + 1] << 8);
      const dataBlockEnd = dataBlockStart + 2 + dataLen;
      const dataChecksum = tapBuffer[dataBlockEnd - 1];

      let dataCalc = 0;
      for (let i = dataBlockStart + 2; i < dataBlockEnd - 1; i++) {
        dataCalc ^= tapBuffer[i];
      }
      expect(dataChecksum).toBe(dataCalc);
    });
  });

  describe('Program Metadata', () => {
    const basicCode = '10 PRINT "Test"';

    test('Autostart line 0 (no autostart)', () => {
      const tapBuffer = convertToTap(basicCode, { name: 'Test', autostart: 0 });

      // Autostart at bytes 16-17: 0x00 0x00 means no autostart actually
      // But 0x8000 (32768) is the standard "no autostart" value
      const autostart = tapBuffer[16] | (tapBuffer[17] << 8);
      expect(autostart).toBe(0);
    });

    test('Autostart line 10', () => {
      const tapBuffer = convertToTap(basicCode, { name: 'Test', autostart: 10 });

      const autostart = tapBuffer[16] | (tapBuffer[17] << 8);
      expect(autostart).toBe(10);
    });

    test('Program name in header', () => {
      const names = ['A', 'AB', 'ABC', 'HelloWorld', 'VeryLongProgramNameHere'];

      for (const testName of names) {
        const tapBuffer = convertToTap(basicCode, { name: testName });

        const nameBytes = tapBuffer.slice(4, 14);
        const extractedName = nameBytes.toString('utf-8').trim();

        // Should be truncated to 10 chars
        expect(extractedName).toBe(testName.substring(0, 10));
      }
    });
  });

  describe('Error Handling', () => {
    test('Empty BASIC code', () => {
      expect(() => {
        convertToTap('', { name: 'Empty' });
      }).not.toThrow();
    });

    test('BASIC code without line numbers', () => {
      const basicNoLines = 'PRINT "No line numbers"';

      // Should not crash
      expect(() => {
        convertToTap(basicNoLines, { name: 'NoLines' });
      }).not.toThrow();
    });

    test('Mixed valid and invalid lines', () => {
      const mixedBasic = `
10 PRINT "Valid"
No line number here
20 PRINT "Also valid"
`;

      // Should not crash
      expect(() => {
        convertToTap(mixedBasic, { name: 'Mixed' });
      }).not.toThrow();
    });
  });

  describe('Hex Dump Analysis', () => {
    test('Pangolin TAP hex structure analysis', () => {
      if (!fs.existsSync(path.join(samplesDir, 'pangolin.bas'))) {
        console.warn('Skipping: pangolin.bas not found');
        return;
      }

      const basicCode = fs.readFileSync(path.join(samplesDir, 'pangolin.bas'), 'utf-8');
      const tapBuffer = convertToTap(basicCode, { name: 'pangolin' });

      // Show some hex info for debugging
      console.log('\n=== TAP File Structure ===');
      console.log(`Total size: ${tapBuffer.length} bytes`);
      console.log(`Header block length: ${tapBuffer[0]} | ${tapBuffer[1]} (${tapBuffer[0] | (tapBuffer[1] << 8)})`);
      console.log(`File type: ${tapBuffer[3]} (${tapBuffer[3] === 0 ? 'BASIC' : 'Unknown'})`);

      const programName = tapBuffer.slice(4, 14).toString('utf-8').trim();
      console.log(`Program name: "${programName}"`);

      const progLen = tapBuffer[12] | (tapBuffer[13] << 8);
      console.log(`Program length: ${progLen}`);

      const autostart = tapBuffer[16] | (tapBuffer[17] << 8);
      console.log(`Autostart line: ${autostart}`);

      // Data block info
      const dataStart = 21;
      const dataLen = tapBuffer[dataStart] | (tapBuffer[dataStart + 1] << 8);
      console.log(`Data block length: ${dataLen}`);
      console.log(`Data block type: 0x${tapBuffer[dataStart + 2].toString(16)}`);

      // Verify structure makes sense
      expect(tapBuffer[0]).toBe(19); // Standard header block length
      expect(tapBuffer[3]).toBe(0); // BASIC file type
      expect(tapBuffer[dataStart + 2]).toBe(0xFF); // Data block type
    });
  });
});
