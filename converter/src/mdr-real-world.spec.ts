// MDR Real-World Integration Test - Test with actual sample programs
// Focuses on testing the core MDR functionality that's currently working

import * as fs from "fs";
import * as path from "path";
import {
  createMdrFile,
  parseMdrFile,
  MDR_FILE_SIZE,
  isValidMdrFile,
  getMdrInfo,
  createEmptyMdr,
} from "./mdr-format";

describe("MDR Real-World Integration Tests", () => {
  describe("Core MDR Functionality", () => {
    it("should create valid MDR files with correct structure", () => {
      const basicProgram = '10 PRINT "HELLO"';
      const mdrBuffer = createMdrFile(basicProgram, "HELLO", "TESTCART");

      // Verify file structure
      expect(mdrBuffer.length).toBe(MDR_FILE_SIZE);
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      // Verify metadata
      const fileInfo = getMdrInfo(mdrBuffer);
      expect(fileInfo.valid).toBe(true);
      expect(fileInfo.cartridgeName).toBe("TESTCART");
      expect(fileInfo.writeProtected).toBe(false);
    });

    it("should handle different program and cartridge names", () => {
      const testCases = [
        { prog: "TEST", cart: "CARTRIDGE" },
        { prog: "A", cart: "B" },
        { prog: "LONGNAME", cart: "LONGCART" },
      ];

      testCases.forEach(({ prog, cart }) => {
        const mdrBuffer = createMdrFile("10 REM TEST", prog, cart);
        const fileInfo = getMdrInfo(mdrBuffer);

        expect(fileInfo.valid).toBe(true);
        expect(fileInfo.cartridgeName).toBe(cart);
      });
    });

    it("should validate MDR file structure correctly", () => {
      // Valid MDR
      const validMdr = createEmptyMdr("VALID");
      expect(isValidMdrFile(validMdr)).toBe(true);

      // Invalid sizes
      const tooSmall = Buffer.alloc(MDR_FILE_SIZE - 1);
      const tooLarge = Buffer.alloc(MDR_FILE_SIZE + 1);
      expect(isValidMdrFile(tooSmall)).toBe(false);
      expect(isValidMdrFile(tooLarge)).toBe(false);

      // Invalid header
      const invalidHeader = Buffer.alloc(MDR_FILE_SIZE, 0);
      invalidHeader[0] = 0x00; // Invalid header flag
      expect(isValidMdrFile(invalidHeader)).toBe(false);
    });

    it("should create empty MDR files for testing", () => {
      const emptyMdr = createEmptyMdr("EMPTY");

      expect(emptyMdr.length).toBe(MDR_FILE_SIZE);
      expect(isValidMdrFile(emptyMdr)).toBe(true);

      const info = getMdrInfo(emptyMdr);
      expect(info.cartridgeName).toBe("EMPTY");
      expect(info.writeProtected).toBe(false);
    });
  });

  describe("File System Operations", () => {
    const tempFilePath = path.join(__dirname, "..", "..", "test-output.mdr");

    afterAll(() => {
      // Clean up
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it("should write and read MDR files from disk", () => {
      const basicProgram = '10 PRINT "DISK TEST"';
      const mdrBuffer = createMdrFile(basicProgram, "DISKPROG", "DISKCART");

      // Write to disk
      fs.writeFileSync(tempFilePath, mdrBuffer);
      expect(fs.existsSync(tempFilePath)).toBe(true);

      // Verify file size
      const fileSize = fs.statSync(tempFilePath).size;
      expect(fileSize).toBe(MDR_FILE_SIZE);

      // Read back
      const readBuffer = fs.readFileSync(tempFilePath);
      expect(readBuffer.length).toBe(MDR_FILE_SIZE);
      expect(isValidMdrFile(readBuffer)).toBe(true);

      // Verify content
      const info = getMdrInfo(readBuffer);
      expect(info.cartridgeName).toBe("DISKCART");
    });

    it("should handle file system errors gracefully", () => {
      // Try to read non-existent file
      const nonExistent = path.join(__dirname, "nonexistent.mdr");
      expect(() => fs.readFileSync(nonExistent)).toThrow();

      // Try to parse invalid file
      const invalidBuffer = Buffer.alloc(100);
      expect(() => parseMdrFile(invalidBuffer)).toThrow(
        "Invalid MDR file size",
      );
    });
  });

  describe("Sample Program Testing", () => {
    it("should work with simple BASIC programs", () => {
      const simplePrograms = [
        '10 PRINT "HELLO"',
        "20 GOTO 10",
        '30 IF X=1 THEN PRINT "YES"',
        "40 LET A=10+B",
      ];

      simplePrograms.forEach((program, index) => {
        const mdrBuffer = createMdrFile(
          program,
          `PROG${index}`,
          `CART${index}`,
        );

        expect(mdrBuffer.length).toBe(MDR_FILE_SIZE);
        expect(isValidMdrFile(mdrBuffer)).toBe(true);

        const info = getMdrInfo(mdrBuffer);
        expect(info.valid).toBe(true);
        expect(info.cartridgeName).toBe(`CART${index}`);
      });
    });

    it("should handle programs with various characteristics", () => {
      // Program with multiple lines
      const multiLine = `10 REM Multi-line
20 PRINT "Line 1"
30 PRINT "Line 2"
40 END`;

      const mdrBuffer = createMdrFile(multiLine, "MULTILINE", "TEST");
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      // Program with REM statements
      const withRem = '10 REM This is a comment\n20 PRINT "OK"';
      const mdrBuffer2 = createMdrFile(withRem, "WITHREM", "TEST");
      expect(isValidMdrFile(mdrBuffer2)).toBe(true);
    });

    it("should work with actual sample programs from disk", () => {
      const samplePath = path.join(
        __dirname,
        "..",
        "..",
        "samples",
        "example_yards_feet_inches.bas",
      );

      // Read sample file
      const sampleContent = fs.readFileSync(samplePath, "utf8");
      expect(sampleContent.length).toBeGreaterThan(0);

      // Create MDR from sample
      const mdrBuffer = createMdrFile(sampleContent, "YARDS", "SAMPLECART");

      // Verify MDR structure
      expect(mdrBuffer.length).toBe(MDR_FILE_SIZE);
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      const info = getMdrInfo(mdrBuffer);
      expect(info.valid).toBe(true);
      expect(info.cartridgeName).toBe("SAMPLECART");
    });
  });

  describe("Configuration and Edge Cases", () => {
    it("should handle maximum length names", () => {
      // 10 character limit for names
      const maxProgName = "1234567890"; // 10 chars
      const maxCartName = "ABCDEFGHIJ"; // 10 chars

      const mdrBuffer = createMdrFile("10 TEST", maxProgName, maxCartName);
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      const info = getMdrInfo(mdrBuffer);
      expect(info.cartridgeName).toBe(maxCartName);
    });

    it("should handle special characters in names", () => {
      // Note: Real Microdrive has limitations on special characters
      // but our implementation should handle basic cases
      const mdrBuffer = createMdrFile("10 TEST", "TEST-1", "CART_1");
      expect(isValidMdrFile(mdrBuffer)).toBe(true);
    });

    it("should create consistent MDR files", () => {
      // Create same MDR twice
      const mdr1 = createMdrFile("10 TEST", "SAME", "SAME");
      const mdr2 = createMdrFile("10 TEST", "SAME", "SAME");

      // Should be identical
      expect(mdr1.equals(mdr2)).toBe(true);
      expect(mdr1.length).toBe(mdr2.length);
    });
  });
});
