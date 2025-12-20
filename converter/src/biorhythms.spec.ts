/**
 * Tests for biorhythms.bas - a complex BASIC program with:
 * - DEF FN functions
 * - DIM arrays
 * - DATA/READ/RESTORE
 * - GO SUB / RETURN
 * - Multiple colons per line
 * - String slicing
 * - Complex expressions
 */
import * as fs from 'fs';
import * as path from 'path';
import { convertBasic } from './index';

describe('Biorhythms complex program tokenization', () => {
  const samplesDir = path.join(__dirname, '../../samples');
  const biorhythmsBas = fs.readFileSync(path.join(samplesDir, 'biorhythms.bas'), 'utf8');

  test('converts biorhythms.bas without errors', () => {
    expect(() => convertBasic(biorhythmsBas, { programName: 'biorhythm' })).not.toThrow();
  });

  test('produces valid TAP structure', () => {
    const { tap, raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    
    // TAP should have header block
    expect(tap[0]).toBe(0x13); // TAP header length low byte
    expect(tap[1]).toBe(0x00); // TAP header length high byte
    expect(tap[2]).toBe(0x00); // Header block type
    expect(tap[3]).toBe(0x00); // BASIC file type
    
    // Raw data should be non-empty
    expect(raw.length).toBeGreaterThan(1000); // biorhythms is a substantial program
  });

  test('contains expected tokens for keywords', () => {
    const { raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    const bytes = Array.from(raw);
    
    // Check for key tokens (real ZX Spectrum values)
    expect(bytes).toContain(0xED); // GO SUB
    expect(bytes).toContain(0xEC); // GO TO
    expect(bytes).toContain(0xE9); // DIM
    expect(bytes).toContain(0xEB); // FOR
    expect(bytes).toContain(0xF3); // NEXT
    expect(bytes).toContain(0xF1); // LET
    expect(bytes).toContain(0xF5); // PRINT
    expect(bytes).toContain(0xCE); // DEF FN
    expect(bytes).toContain(0xE4); // DATA
    expect(bytes).toContain(0xE5); // RESTORE
    expect(bytes).toContain(0xE3); // READ
    expect(bytes).toContain(0xFE); // RETURN
    expect(bytes).toContain(0xFA); // IF
    expect(bytes).toContain(0xCB); // THEN
    expect(bytes).toContain(0xCC); // TO
    expect(bytes).toContain(0xCD); // STEP
  });

  test('contains expected graphical tokens', () => {
    const { raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    const bytes = Array.from(raw);
    
    // Biorhythms uses graphical commands
    expect(bytes).toContain(0xF6); // PLOT
    expect(bytes).toContain(0xFC); // DRAW
    expect(bytes).toContain(0xD9); // INK
    expect(bytes).toContain(0xDA); // PAPER
    expect(bytes).toContain(0xDE); // OVER
    expect(bytes).toContain(0xFB); // CLS
    expect(bytes).toContain(0xE7); // BORDER
  });

  test('contains expected mathematical functions', () => {
    const { raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    const bytes = Array.from(raw);
    
    // Mathematical functions used in biorhythms (correct ZX Spectrum tokens)
    expect(bytes).toContain(0xB2); // SIN
    expect(bytes).toContain(0xBA); // INT
    expect(bytes).toContain(0xC2); // CHR$
    expect(bytes).toContain(0xAF); // CODE
    expect(bytes).toContain(0xB0); // VAL
  });

  test('line count matches expected', () => {
    const { raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    
    // Count 0x0D line terminators
    const bytes = Array.from(raw);
    const lineCount = bytes.filter(b => b === 0x0D).length;
    
    // biorhythms.bas has 58 lines (some are empty/comments)
    expect(lineCount).toBeGreaterThan(50);
    expect(lineCount).toBeLessThan(70);
  });

  test('preserves string content', () => {
    const { raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    const rawStr = raw.toString('latin1');
    
    // Check key strings are preserved
    expect(rawStr).toContain('BIORHYTHMS');
    expect(rawStr).toContain('Physical');
    expect(rawStr).toContain('Emotional');
    expect(rawStr).toContain('Intellectual');
    expect(rawStr).toContain('january');
    expect(rawStr).toContain('december');
  });

  test('handles line numbers correctly', () => {
    const { raw } = convertBasic(biorhythmsBas, { programName: 'biorhythm' });
    
    // First line number should be 100 (0x0064)
    expect(raw[0]).toBe(0x00); // High byte
    expect(raw[1]).toBe(0x64); // Low byte (100)
    
    // Each line should have valid structure: 
    // 2 bytes line number, 2 bytes length, content, 0x0D terminator
    let offset = 0;
    let linesParsed = 0;
    while (offset < raw.length - 4) {
      const lineNumHi = raw[offset];
      const lineNumLo = raw[offset + 1];
      const lineNum = (lineNumHi << 8) | lineNumLo;
      
      const lengthLo = raw[offset + 2];
      const lengthHi = raw[offset + 3];
      const lineLength = (lengthHi << 8) | lengthLo;
      
      if (lineNum === 0 || lineLength === 0 || lineLength > 1000) {
        break; // Invalid line structure
      }
      
      // Check line ends with 0x0D
      const lineEnd = offset + 4 + lineLength - 1;
      if (lineEnd < raw.length) {
        expect(raw[lineEnd]).toBe(0x0D);
      }
      
      offset += 4 + lineLength;
      linesParsed++;
    }
    
    expect(linesParsed).toBeGreaterThan(50);
  });
});
