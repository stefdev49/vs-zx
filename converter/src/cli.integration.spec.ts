/**
 * CLI Integration Tests
 * Tests the CLI tool end-to-end with real file I/O
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  });

  test('CLI generates tokenized output, not plain ASCII', () => {
    const basicFile = path.join(tempDir, 'test.bas');
    const tapFile = path.join(tempDir, 'test.tap');

    // Write a simple BASIC program
    fs.writeFileSync(basicFile, '10 REM Test\n20 LET n=100\n30 PRINT n');

    // Run the CLI
    execSync(`node out/cli.js ${basicFile} ${tapFile}`, { cwd: '/home/stef/projets/vs-zx/converter' });

    // Read the generated TAP file
    const tap = fs.readFileSync(tapFile);

    // Skip TAP header (first 21 bytes)
    const programData = tap.slice(23); // Skip header + data block marker + length

    // Convert to hex string for easier verification
    const hexStr = Array.from(programData).map(b => b.toString(16).padStart(2, '0')).join(' ');

    // Verify tokenization:
    // Line 10 should start with: 0a 00 (line number 10 in little-endian)
    expect(hexStr).toContain('0a 00');

    // After line number, should have REM token 0xa4, NOT ASCII "REM" (52 45 4d)
    expect(hexStr).toContain('0a 00 a4'); // Line 10 + REM token
    expect(hexStr).not.toContain('0a 00 52 45 4d'); // NOT ASCII "REM"

    // Line 20 should have: 14 00 (line 20 in little-endian) + b3 (LET token)
    expect(hexStr).toContain('14 00 b3'); // Line 20 + LET token
    expect(hexStr).not.toContain('14 00 4c 45 54'); // NOT ASCII "LET"

    // Line 30 should have: 1e 00 (line 30 in little-endian) + b7 (PRINT token)
    expect(hexStr).toContain('1e 00 b7'); // Line 30 + PRINT token
    expect(hexStr).not.toContain('1e 00 50 52 49 4e 54'); // NOT ASCII "PRINT"
  });

  test('CLI with metadata produces correct TAP header', () => {
    const basicFile = path.join(tempDir, 'meta.bas');
    const tapFile = path.join(tempDir, 'meta.tap');

    fs.writeFileSync(basicFile, '10 PRINT "Hello"');

    execSync(`node out/cli.js ${basicFile} ${tapFile} -n "MYPROG" -s 10`, {
      cwd: '/home/stef/projets/vs-zx/converter'
    });

    const tap = fs.readFileSync(tapFile);

    // TAP header structure:
    // 0-1: header block length (0x1300 = 19 bytes, little-endian)
    // 2: block type (0x00 = header)
    // 3: file type (0x00 = BASIC)
    // 4-13: program name (10 bytes)
    // 14-15: program length (little-endian)
    // 16-17: autostart line (little-endian)

    expect(tap[0]).toBe(0x13); // Header length low byte
    expect(tap[1]).toBe(0x00); // Header length high byte
    expect(tap[2]).toBe(0x00); // Block type: header
    expect(tap[3]).toBe(0x00); // File type: BASIC

    // Program name should be "MYPROG  " (padded to 10 bytes)
    const name = tap.slice(4, 14).toString('ascii').trim();
    expect(name).toBe('MYPROG');

    // Autostart line at bytes 16-17 (little-endian) should be 10 (0x000A)
    const autostart = tap[16] | (tap[17] << 8);
    expect(autostart).toBe(10);
  });

  test('CLI tokenizes all major keyword types', () => {
    const basicFile = path.join(tempDir, 'keywords.bas');
    const tapFile = path.join(tempDir, 'keywords.tap');

    const basicCode = `
10 REM Comment line
20 LET x=5
30 FOR i=1 TO 10
40 PRINT i
50 NEXT i
60 INPUT y$
70 IF y$="yes" THEN GOTO 10
80 STOP
`;

    fs.writeFileSync(basicFile, basicCode.trim());
    execSync(`node out/cli.js ${basicFile} ${tapFile}`, {
      cwd: '/home/stef/projets/vs-zx/converter'
    });

    const tap = fs.readFileSync(tapFile);
    const programData = tap.slice(23);
    const bytes = Array.from(programData);

    // Map of expected tokens (keyword -> token byte)
    const expectedTokens: { [key: string]: number } = {
      'REM': 0xA4,
      'LET': 0xB3,
      'FOR': 0xAB,
      'PRINT': 0xB7,
      'NEXT': 0xB5,
      'INPUT': 0xB0,
      'IF': 0xBC,
      'STOP': 0xCB,
    };

    // Verify we find the expected tokens in the binary data
    for (const [keyword, tokenByte] of Object.entries(expectedTokens)) {
      const found = bytes.includes(tokenByte);
      expect(found).toBe(true);
    }

    // Make sure we DON'T have the ASCII representations of keywords
    // (This is a stricter check - verifies tokens replaced keywords)
    const asciiREM = [0x52, 0x45, 0x4d]; // "REM"
    const asciiLET = [0x4c, 0x45, 0x54]; // "LET"
    const asciiPRINT = [0x50, 0x52, 0x49, 0x4e, 0x54]; // "PRINT"

    // Check that ASCII sequences don't appear as complete keywords
    // (They might appear in string literals, which is OK)
    // But at the start of lines they shouldn't appear
    for (let i = 0; i < bytes.length - 2; i++) {
      // Look for pattern: line number (2 bytes) + ASCII keyword
      if ((i === 0 || i > 2) && bytes[i] === 0x0d) { // Previous line ending
        const nextPos = i + 1;
        if (nextPos + 2 < bytes.length) {
          // Skip line number (2 bytes) and check if ASCII keyword follows
          const afterLineNum = nextPos + 2;
          if (afterLineNum + 3 <= bytes.length) {
            // We should NOT see "REM" as ASCII here
            if (bytes[afterLineNum] === asciiREM[0] &&
                bytes[afterLineNum + 1] === asciiREM[1] &&
                bytes[afterLineNum + 2] === asciiREM[2]) {
              // Check if it's actually a complete line start (would indicate tokenization failed)
              if (afterLineNum + 3 < bytes.length && bytes[afterLineNum + 3] === 0x20) { // Space after REM
                fail(`Found ASCII "REM" at position ${afterLineNum} - keywords not tokenized!`);
              }
            }
          }
        }
      }
    }
  });

  test('CLI handles real BASIC file correctly', () => {
    const samplesDir = '/home/stef/projets/vs-zx/samples';
    const basicFile = path.join(samplesDir, 'pangolin.bas');

    if (!fs.existsSync(basicFile)) {
      console.log(`Skipping test: ${basicFile} not found`);
      return;
    }

    const tapFile = path.join(tempDir, 'pangolin.tap');

    execSync(`node out/cli.js ${basicFile} ${tapFile}`, {
      cwd: '/home/stef/projets/vs-zx/converter'
    });

    const tap = fs.readFileSync(tapFile);

    // Verify TAP structure
    expect(tap[0]).toBe(0x13); // TAP header length
    expect(tap[2]).toBe(0x00); // Header block type
    expect(tap[3]).toBe(0x00); // BASIC file type

    // Should contain tokenized data after header
    // Look for some expected tokens
    const bytes = Array.from(tap);
    const hasREM = bytes.includes(0xA4); // REM token
    const hasLET = bytes.includes(0xB3); // LET token
    const hasDIM = bytes.includes(0xD2); // DIM token

    expect(hasREM || hasLET || hasDIM).toBe(true);
  });

  test('CLI output size is smaller than input (due to tokenization)', () => {
    const basicFile = path.join(tempDir, 'large.bas');
    const tapFile = path.join(tempDir, 'large.tap');

    // Create a BASIC program with repeated keywords
    let basicCode = '';
    for (let i = 10; i <= 100; i += 10) {
      basicCode += `${i} REM Line ${i}\n`;
      basicCode += `${i + 1} LET x=x+1\n`;
      basicCode += `${i + 2} PRINT x\n`;
    }

    fs.writeFileSync(basicFile, basicCode);
    const inputSize = fs.statSync(basicFile).size;

    execSync(`node out/cli.js ${basicFile} ${tapFile}`, {
      cwd: '/home/stef/projets/vs-zx/converter'
    });

    const tapData = fs.readFileSync(tapFile);
    // TAP file includes header overhead, but should still be smaller than raw text
    // due to tokenization (REM = 3 bytes -> 1 byte token)
    // LET = 3 bytes -> 1 byte token, etc.

    // The tokenized program data should be significantly smaller
    const programDataStart = 23; // Skip TAP headers
    const programSize = tapData.length - programDataStart;

    // Keywords take 3 bytes each in ASCII, 1 byte as token = 2 bytes saved per keyword
    // With 30+ keywords in our test program, we should save at least 30 bytes
    expect(programSize).toBeLessThan(inputSize - 20);
  });

  test('CLI preserves non-keyword text correctly', () => {
    const basicFile = path.join(tempDir, 'strings.bas');
    const tapFile = path.join(tempDir, 'strings.tap');

    // Simple test - just verify PRINT and LET are tokenized
    fs.writeFileSync(basicFile, '10 PRINT "hello"\n20 LET x=5');

    execSync(`node out/cli.js ${basicFile} ${tapFile}`, {
      cwd: '/home/stef/projets/vs-zx/converter'
    });

    const tap = fs.readFileSync(tapFile);
    const hexStr = Array.from(tap.slice(23)).map(b => b.toString(16).padStart(2, '0')).join('');

    // PRINT should be tokenized (0xb7)
    const printToken = 'b7';
    expect(hexStr).toContain(printToken);

    // LET should be tokenized (0xb3)
    const letToken = 'b3';
    expect(hexStr).toContain(letToken);

    // String content should still be there (ASCII "hello" = 68656c6c6f)
    const hello = '68656c6c6f'; // "hello" in hex
    expect(hexStr).toContain(hello);
  });
});
