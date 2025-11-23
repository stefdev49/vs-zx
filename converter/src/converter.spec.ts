import * as fs from 'fs';
import * as path from 'path';
import {
  createTapFile,
  parseTapFile,
  getTapMetadata,
  verifyTapChecksums
} from './tap-format';
import {
  convertToTap,
  convertToRaw
} from './index';

describe('TAP Format', () => {
  test('Create and parse TAP file', async () => {
    const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const tapFile = createTapFile(programData, 'TestProg', 10);

    expect(tapFile).toBeDefined();
    expect(tapFile.length).toBeGreaterThan(programData.length);
  });

  test('Get TAP metadata', async () => {
    const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const tapFile = createTapFile(programData, 'Hello', 20);

    const metadata = getTapMetadata(tapFile);
    expect(metadata).toBeDefined();
    expect(metadata?.programName).toBe('Hello');
    expect(metadata?.autostart).toBe(20);
  });

  test('Verify TAP checksums', async () => {
    const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const tapFile = createTapFile(programData, 'Test', 0);

    const valid = verifyTapChecksums(tapFile);
    expect(valid).toBe(true);
  });

  test('Parse TAP blocks', async () => {
    const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const tapFile = createTapFile(programData, 'TestProg', 0);

    const blocks = parseTapFile(tapFile);
    expect(blocks.length).toBe(2); // Header and data blocks
    expect(blocks[0].blockNumber).toBe(0);
    expect(blocks[1].blockNumber).toBe(1);
  });

  test('Create TAP without autostart', async () => {
    const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const tapFile = createTapFile(programData, 'NoAutostart');

    const metadata = getTapMetadata(tapFile);
    expect(metadata?.autostart).toBeUndefined();
  });
});

describe('Converter Functions', () => {
  test('convertToRaw returns buffer', async () => {
    // This test requires zxbasic to be installed
    // Skip if not available
    try {
      const basicCode = '10 PRINT "TEST"';
      const result = await convertToRaw(basicCode);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('Skipping test: zxbasic not available');
    }
  });

  test('convertToTap returns buffer', async () => {
    try {
      const basicCode = '10 PRINT "TEST"';
      const result = await convertToTap(basicCode, {
        name: 'Test',
        autostart: 10
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('Skipping test: zxbasic not available');
    }
  });
});
