// Unit Tests for MDR Format Support
// Tests for mdv2img-based Microdrive cartridge format

import {
  calculateMdrChecksum,
  validateMdrSector,
  parseMdrFile,
  createMdrFile,
  createEmptyMdr,
  getMdrSector,
  isValidMdrFile,
  getMdrInfo,
  MDR_FILE_SIZE,
  MDR_SECTOR_SIZE,
} from "./mdr-format";

describe("MDR Format", () => {
  describe("calculateMdrChecksum", () => {
    it("should calculate checksum correctly for empty data", () => {
      const emptyData = new Uint8Array([]);
      expect(calculateMdrChecksum(emptyData)).toBe(0);
    });

    it("should calculate checksum correctly for single byte", () => {
      const singleByte = new Uint8Array([0x42]);
      expect(calculateMdrChecksum(singleByte)).toBe(0x42);
    });

    it("should calculate checksum correctly for multiple bytes", () => {
      const multiByte = new Uint8Array([0x01, 0x02, 0x03]);
      const expected = (1 + 2 + 3) % 255;
      expect(calculateMdrChecksum(multiByte)).toBe(expected);
    });

    it("should wrap around at 255", () => {
      const wrapData = new Uint8Array([0xff, 0x01]); // 255 + 1 = 256 → 1
      expect(calculateMdrChecksum(wrapData)).toBe(1);
    });
  });

  describe("createEmptyMdr", () => {
    it("should create buffer of correct size", () => {
      const emptyMdr = createEmptyMdr("TEST");
      expect(emptyMdr.length).toBe(MDR_FILE_SIZE);
    });

    it("should be marked as not write-protected", () => {
      const emptyMdr = createEmptyMdr("TEST");
      expect(emptyMdr[emptyMdr.length - 1]).toBe(0);
    });

    it("should have valid header flag", () => {
      const emptyMdr = createEmptyMdr("TEST");
      expect(emptyMdr[0]).toBe(0x01); // Header flag
    });

    it("should have sector number 254", () => {
      const emptyMdr = createEmptyMdr("TEST");
      expect(emptyMdr[1]).toBe(254); // Sector number
    });
  });

  describe("isValidMdrFile", () => {
    it("should return false for empty buffer", () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(isValidMdrFile(emptyBuffer)).toBe(false);
    });

    it("should return false for wrong size buffer", () => {
      const wrongSizeBuffer = Buffer.alloc(100);
      expect(isValidMdrFile(wrongSizeBuffer)).toBe(false);
    });

    it("should return false for buffer without header flag", () => {
      const invalidBuffer = Buffer.alloc(MDR_FILE_SIZE, 0);
      invalidBuffer[0] = 0x00; // Invalid header flag
      expect(isValidMdrFile(invalidBuffer)).toBe(false);
    });

    it("should return true for valid empty MDR", () => {
      const validMdr = createEmptyMdr("TEST");
      expect(isValidMdrFile(validMdr)).toBe(true);
    });
  });

  describe("getMdrInfo", () => {
    it("should return valid=false for invalid buffer", () => {
      const invalidBuffer = Buffer.alloc(100);
      const info = getMdrInfo(invalidBuffer);
      expect(info.valid).toBe(false);
    });

    it("should extract cartridge name from valid MDR", () => {
      const validMdr = createEmptyMdr("MYCART");
      const info = getMdrInfo(validMdr);
      expect(info.cartridgeName).toBe("MYCART");
    });

    it("should detect write protection", () => {
      const protectedMdr = createEmptyMdr("TEST");
      protectedMdr[protectedMdr.length - 1] = 1; // Mark as write-protected
      const info = getMdrInfo(protectedMdr);
      expect(info.writeProtected).toBe(true);
    });
  });

  describe("createMdrFile", () => {
    it("should create buffer of correct size", () => {
      const basicSource = '10 PRINT "HELLO"';
      const mdrBuffer = createMdrFile(basicSource, "HELLO", "TESTCART");
      expect(mdrBuffer.length).toBe(MDR_FILE_SIZE);
    });

    it("should throw error for long program name", () => {
      const basicSource = '10 PRINT "HELLO"';
      expect(() => {
        createMdrFile(basicSource, "TOOLONGNAME", "TEST");
      }).toThrow("Program name must be 10 characters or less");
    });

    it("should throw error for long cartridge name", () => {
      const basicSource = '10 PRINT "HELLO"';
      expect(() => {
        createMdrFile(basicSource, "TEST", "TOOLONGCARTNAME");
      }).toThrow("Cartridge name must be 10 characters or less");
    });
  });

  describe("parseMdrFile", () => {
    it("should throw error for invalid file size", () => {
      const invalidBuffer = Buffer.alloc(100);
      expect(() => {
        parseMdrFile(invalidBuffer);
      }).toThrow("Invalid MDR file size");
    });

    it("should parse empty MDR without errors", () => {
      const emptyMdr = createEmptyMdr("TEST");
      const result = parseMdrFile(emptyMdr);
      expect(result.errors.length).toBe(0);
      expect(result.programs.length).toBe(0);
    });

    it("should extract metadata from MDR", () => {
      const emptyMdr = createEmptyMdr("MYCART");
      const result = parseMdrFile(emptyMdr);
      expect(result.metadata.cartridgeName).toBe("MYCART");
      expect(result.metadata.writeProtected).toBe(false);
    });
  });

  describe("getMdrSector", () => {
    it("should return null for invalid sector number", () => {
      const emptyMdr = createEmptyMdr("TEST");
      expect(getMdrSector(emptyMdr, 999)).toBeNull();
      expect(getMdrSector(emptyMdr, 0)).toBeNull();
    });

    it("should return sector for valid sector number", () => {
      const emptyMdr = createEmptyMdr("TEST");
      const sector = getMdrSector(emptyMdr, 254);
      expect(sector).not.toBeNull();
      expect(sector?.header.sectorNumber).toBe(254);
    });
  });

  describe("Integration Tests", () => {
    it("should roundtrip basic program through MDR format", () => {
      const basicSource = '10 PRINT "HELLO"\n20 GOTO 10';

      // Create MDR
      const mdrBuffer = createMdrFile(basicSource, "HELLO", "TESTCART");

      // Parse MDR
      const result = parseMdrFile(mdrBuffer);

      // Should have at least the structure intact
      expect(result.metadata.cartridgeName).toBe("TESTCART");
      expect(result.metadata.sectors.length).toBeGreaterThan(0);
    });

    it("should handle checksum validation", () => {
      const emptyMdr = createEmptyMdr("TEST");
      const result = parseMdrFile(emptyMdr);

      // Empty MDR should have valid checksums
      expect(result.errors.length).toBe(0);
    });
  });
});
