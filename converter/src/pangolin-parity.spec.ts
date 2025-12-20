import * as fs from 'fs';
import * as path from 'path';
import { convertBasic } from './index';

function readHexDump(filePath: string): Buffer {
  const text = fs.readFileSync(filePath, 'utf8');
  const bytes: number[] = [];

  text.split(/\r?\n/).forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return;
    }
    const payload = line.slice(colonIndex + 1).trim();
    if (!payload) {
      return;
    }
    const hexSection = payload.split('  ')[0]?.trim();
    if (!hexSection) {
      return;
    }
    hexSection.split(/\s+/).forEach(token => {
      if (!token) {
        return;
      }
      for (let i = 0; i < token.length; i += 2) {
        if (i + 2 <= token.length) {
          const byteValue = parseInt(token.slice(i, i + 2), 16);
          if (!Number.isNaN(byteValue)) {
            bytes.push(byteValue);
          }
        }
      }
    });
  });

  return Buffer.from(bytes);
}

describe('Pangolin parity fixtures', () => {
  const samplesDir = path.join(__dirname, '../../samples');
  const pangolinBas = fs.readFileSync(path.join(samplesDir, 'pangolin.bas'), 'utf8');
  const pangolinRaw = readHexDump(path.join(samplesDir, 'pangolin.raw.hex'));
  const pangolinTap = readHexDump(path.join(samplesDir, 'pangolin.tap.hex'));

  test('pangolin tap hex dump matches binary fixture (sanity)', () => {
    const binaryTap = fs.readFileSync(path.join(samplesDir, 'pangolin.tap'));
    expect(binaryTap.length).toBe(pangolinTap.length);
    // The textual hex fixture is canonical for parity; ensure binary file matches as well.
    expect(binaryTap.equals(pangolinTap)).toBe(true);
  });

  test('raw output matches pangolin.raw.hex', () => {
    const { raw } = convertBasic(pangolinBas, { programName: 'pangolin' });
    expect(raw.equals(pangolinRaw)).toBe(true);
  });

  test('tap output matches pangolin.tap', () => {
    const { tap } = convertBasic(pangolinBas, { programName: 'pangolin' });
    expect(tap.equals(pangolinTap)).toBe(true);
  });
});
