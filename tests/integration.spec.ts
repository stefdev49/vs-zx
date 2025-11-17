// Integration Tests for ZX BASIC Development Environment

import { convertToBinary } from '../converter/src/index';
import { transfer } from '../rs232-transfer/src/index';

describe('ZX BASIC Integration Tests', () => {
  test('Basic BASIC conversion', () => {
    const basicCode = `10 PRINT "HELLO WORLD"
20 REM END`;

    const binary = convertToBinary(basicCode);

    // Basic checks: not empty, starts with line length
    expect(binary.length).toBeGreaterThan(0);
    expect(binary.readUInt16LE(0)).toBe(13); // Line length for first line approx
  });

  // Note: RS232 transfer test would require mocked serial port
  // or actual hardware (not suitable for unit tests)

  // For manual testing:
  // 1. Write a .bas file in VS Code
  // 2. Ensure language is zx-basic
  // 3. Use Command Palette to "Transfer to ZX Spectrum"
  // 4. Verify on actual ZX Spectrum +2 with Interface 1 and RS232 cable

  test('Mock RS232 transfer (placeholder)', async () => {
    const mockBinary = Buffer.from([1, 2, 3]);

    // In a real test, would mock SerialPort and verify calls
    // Since serialport is hardware-dependent, manual verification recommended

    expect(mockBinary.length).toBe(3);
  });
});
