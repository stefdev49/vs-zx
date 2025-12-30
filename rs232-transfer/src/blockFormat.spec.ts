import {
  calculateChecksum,
  normalizeFilename,
  createProgramHeader,
  createDataBlock,
  createProgramPackage,
  parseHeaderBlock,
  parseDataBlock,
  validateProgramPackage,
  BlockType,
  BlockFlag,
} from './blockFormat';

describe('Block Format', () => {
  describe('calculateChecksum', () => {
    it('should calculate XOR checksum of buffer', () => {
      const data = Buffer.from([0x00, 0xff, 0x55, 0xaa]);
      expect(calculateChecksum(data)).toBe(0x00 ^ 0xff ^ 0x55 ^ 0xaa);
    });

    it('should return 0 for empty buffer', () => {
      expect(calculateChecksum(Buffer.alloc(0))).toBe(0);
    });

    it('should return same value for single byte', () => {
      expect(calculateChecksum(Buffer.from([0x42]))).toBe(0x42);
    });
  });

  describe('normalizeFilename', () => {
    it('should pad short names to 10 characters', () => {
      expect(normalizeFilename('TEST')).toBe('TEST      ');
      expect(normalizeFilename('TEST').length).toBe(10);
    });

    it('should truncate long names to 10 characters', () => {
      expect(normalizeFilename('VERYLONGFILENAME')).toBe('VERYLONGFI');
    });

    it('should handle empty string', () => {
      expect(normalizeFilename('')).toBe('          ');
    });

    it('should remove non-printable characters', () => {
      expect(normalizeFilename('TEST\x00\x01')).toBe('TEST      ');
    });
  });

  describe('createProgramHeader', () => {
    it('should create 19-byte header block', () => {
      const header = createProgramHeader('TEST', 100);
      expect(header.length).toBe(19);
    });

    it('should set correct flag byte', () => {
      const header = createProgramHeader('TEST', 100);
      expect(header[0]).toBe(BlockFlag.HEADER);
    });

    it('should set correct block type for program', () => {
      const header = createProgramHeader('TEST', 100);
      expect(header[1]).toBe(BlockType.PROGRAM);
    });

    it('should include filename padded to 10 bytes', () => {
      const header = createProgramHeader('TEST', 100);
      const filename = header.subarray(2, 12).toString('ascii');
      expect(filename).toBe('TEST      ');
    });

    it('should encode data length in little-endian', () => {
      const header = createProgramHeader('TEST', 0x1234);
      expect(header.readUInt16LE(12)).toBe(0x1234);
    });

    it('should set autostart line when provided', () => {
      const header = createProgramHeader('TEST', 100, 10);
      expect(header.readUInt16LE(14)).toBe(10);
    });

    it('should set autostart to 32768 when not provided', () => {
      const header = createProgramHeader('TEST', 100, 0);
      expect(header.readUInt16LE(14)).toBe(32768);
    });

    it('should have valid checksum', () => {
      const header = createProgramHeader('TEST', 100);
      const expectedChecksum = calculateChecksum(header.subarray(0, 18));
      expect(header[18]).toBe(expectedChecksum);
    });
  });

  describe('createDataBlock', () => {
    it('should create block with flag + data + checksum', () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      const block = createDataBlock(data);
      expect(block.length).toBe(data.length + 2);
    });

    it('should set correct flag byte', () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      const block = createDataBlock(data);
      expect(block[0]).toBe(BlockFlag.DATA);
    });

    it('should copy data correctly', () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      const block = createDataBlock(data);
      expect(block.subarray(1, 4)).toEqual(data);
    });

    it('should have valid checksum', () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      const block = createDataBlock(data);
      const expectedChecksum = calculateChecksum(block.subarray(0, block.length - 1));
      expect(block[block.length - 1]).toBe(expectedChecksum);
    });
  });

  describe('createProgramPackage', () => {
    it('should create header + data block', () => {
      const basicData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]); // Simple BASIC line
      const package_ = createProgramPackage('TEST', basicData);

      // Header is 19 bytes, data block is data.length + 2
      expect(package_.length).toBe(19 + basicData.length + 2);
    });

    it('should include autostart line in header', () => {
      const basicData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const package_ = createProgramPackage('TEST', basicData, 10);

      // Autostart line is at offset 14 in header
      expect(package_.readUInt16LE(14)).toBe(10);
    });
  });

  describe('parseHeaderBlock', () => {
    it('should parse valid header block', () => {
      const header = createProgramHeader('MYPROGRAM', 1234, 100);
      const parsed = parseHeaderBlock(header);

      expect(parsed).not.toBeNull();
      expect(parsed!.type).toBe(BlockType.PROGRAM);
      expect(parsed!.filename).toBe('MYPROGRAM');
      expect(parsed!.dataLength).toBe(1234);
      expect(parsed!.param1).toBe(100);
    });

    it('should return null for short buffer', () => {
      const header = Buffer.alloc(10);
      expect(parseHeaderBlock(header)).toBeNull();
    });

    it('should return null for wrong flag byte', () => {
      const header = createProgramHeader('TEST', 100);
      header[0] = 0x99; // Wrong flag
      expect(parseHeaderBlock(header)).toBeNull();
    });

    it('should return null for invalid checksum', () => {
      const header = createProgramHeader('TEST', 100);
      header[18] = header[18] ^ 0xff; // Corrupt checksum
      expect(parseHeaderBlock(header)).toBeNull();
    });
  });

  describe('parseDataBlock', () => {
    it('should parse valid data block', () => {
      const data = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const block = createDataBlock(data);
      const parsed = parseDataBlock(block);

      expect(parsed).not.toBeNull();
      expect(parsed).toEqual(data);
    });

    it('should return null for short buffer', () => {
      expect(parseDataBlock(Buffer.alloc(1))).toBeNull();
    });

    it('should return null for wrong flag byte', () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      const block = createDataBlock(data);
      block[0] = 0x00; // Wrong flag (should be 0xff)
      expect(parseDataBlock(block)).toBeNull();
    });

    it('should return null for invalid checksum', () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      const block = createDataBlock(data);
      block[block.length - 1] ^= 0xff; // Corrupt checksum
      expect(parseDataBlock(block)).toBeNull();
    });
  });

  describe('validateProgramPackage', () => {
    it('should validate complete program package', () => {
      const basicData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const package_ = createProgramPackage('TEST', basicData, 10);
      const result = validateProgramPackage(package_);

      expect(result.valid).toBe(true);
      expect(result.header).not.toBeNull();
      expect(result.header!.filename).toBe('TEST');
      expect(result.programData).toEqual(basicData);
    });

    it('should reject too short data', () => {
      const result = validateProgramPackage(Buffer.alloc(10));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Data too short');
    });

    it('should reject invalid header', () => {
      const basicData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const package_ = createProgramPackage('TEST', basicData);
      package_[0] = 0x99; // Corrupt header flag

      const result = validateProgramPackage(package_);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid header block');
    });

    it('should reject incomplete data block', () => {
      const basicData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const package_ = createProgramPackage('TEST', basicData);
      const truncated = package_.subarray(0, 22); // Only partial data

      const result = validateProgramPackage(truncated);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Data block incomplete');
    });

    it('should reject invalid data block checksum', () => {
      const basicData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const package_ = createProgramPackage('TEST', basicData);
      package_[package_.length - 1] ^= 0xff; // Corrupt checksum

      const result = validateProgramPackage(package_);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid data block checksum');
    });
  });
});
