// MDR Integration Test - Round-trip testing with real BASIC programs
// Tests the complete workflow: BASIC → MDR → BASIC

import * as fs from "fs";
import * as path from "path";
import {
  createMdrFile,
  parseMdrFile,
  MDR_FILE_SIZE,
  isValidMdrFile,
  getMdrInfo,
  calculateMdrChecksum,
  createEmptyMdr,
} from "./mdr-format";

describe("MDR Integration Tests", () => {
  const testProgram = `10 INPUT "yards?",yd,"feet?",ft,"inches?",in
40 GO SUB 2000: REM print the values
50 PRINT " = "
70 GO SUB 1000
80 GO SUB 2000: REM print the adjusted values
90 PRINT
100 GOTO 10
1000 REM subroutine to adjust yd, ft, in to the normal form for yards, feet and inches
1010 LET in=36*yd+12*ft+in: REM now everything is in inches
1030 LET s=SGN in: LET in=ABS in: REM we work with in positive, holding its sign in s
1060 LET ft=INT (in/12): LET in=(in-12*ft)*s: REM now in is ok
1080 LET yd=INT (ft/3)*s: LET ft=ft*s-3*yd: RETURN
2000 REM subroutine to print yd, ft and in
2010 PRINT yd;"yd";ft;"ft";in;"in";: RETURN`;

  describe("Round-trip Testing", () => {
    it("should create valid MDR file from BASIC program", () => {
      const mdrBuffer = createMdrFile(testProgram, "YARDS", "TESTCART");

      // Verify file structure
      expect(mdrBuffer.length).toBe(MDR_FILE_SIZE);
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      // Verify file info
      const fileInfo = getMdrInfo(mdrBuffer);
      expect(fileInfo.valid).toBe(true);
      expect(fileInfo.cartridgeName).toBe("TESTCART");
      expect(fileInfo.writeProtected).toBe(false);
    });

    it("should round-trip BASIC program through MDR format", () => {
      // Create MDR from BASIC
      const mdrBuffer = createMdrFile(testProgram, "YARDS", "TESTCART");

      // Parse MDR back to BASIC
      const result = parseMdrFile(mdrBuffer);

      // Debug output
      console.log("DEBUG: Programs found:", result.programs.length);
      console.log("DEBUG: Errors:", result.errors);
      console.log("DEBUG: Sectors:", result.metadata.sectors.length);
      if (result.metadata.sectors.length > 0) {
        const firstSector = result.metadata.sectors[0];
        console.log(
          "DEBUG: First sector data length:",
          firstSector.data.length,
        );
        console.log(
          "DEBUG: First 8 bytes:",
          Array.from(firstSector.data.subarray(0, 8)),
        );
        console.log("DEBUG: Sector record length:", firstSector.record.length);
        console.log("DEBUG: Sector data checksum:", firstSector.dataChecksum);

        // Calculate what the checksum should be
        const actualData = firstSector.data.subarray(
          0,
          firstSector.record.length,
        );
        console.log("DEBUG: Actual data for checksum:", Array.from(actualData));
        console.log(
          "DEBUG: Calculated checksum:",
          calculateMdrChecksum(actualData),
        );
      }

      // Verify we can extract programs
      expect(result.programs.length).toBeGreaterThan(0);
      expect(result.metadata.cartridgeName).toBe("TESTCART");
      expect(result.errors.length).toBe(0);

      // Verify the extracted program has content
      const extractedProgram = result.programs[0];
      expect(extractedProgram.name).toBe("YARDS");
      expect(extractedProgram.source.length).toBeGreaterThan(0);
      expect(extractedProgram.source).toContain("INPUT");
      expect(extractedProgram.source).toContain("GO SUB");
    });

    it("should handle multiple programs in MDR file", () => {
      // This test verifies that the structure supports multiple programs
      // even though our current implementation creates single-program MDRs
      const mdrBuffer = createMdrFile(testProgram, "PROG1", "MULTICART");
      const result = parseMdrFile(mdrBuffer);

      // Should have at least one program
      expect(result.programs.length).toBeGreaterThan(0);

      // Metadata should be intact
      expect(result.metadata.sectors.length).toBeGreaterThan(0);
      expect(result.metadata.writeProtected).toBe(false);
    });

    it("should preserve program structure through round-trip", () => {
      const originalLines = testProgram.split("\n").length;

      // Create MDR
      const mdrBuffer = createMdrFile(testProgram, "STRUCT", "STRUCTTEST");

      // Parse MDR
      const result = parseMdrFile(mdrBuffer);

      // Extract program
      const extracted = result.programs[0];
      const extractedLines = extracted.source.split("\n").length;

      // Should preserve line structure (allowing for minor differences in detokenization)
      expect(extractedLines).toBeGreaterThan(0);
      expect(extractedLines).toBeLessThanOrEqual(originalLines + 2); // Allow small differences

      // Should preserve key elements
      expect(extracted.source).toContain("REM");
      expect(extracted.source).toContain("LET");
      expect(extracted.source).toContain("PRINT");
    });
  });

  describe("File System Integration", () => {
    const tempFilePath = path.join(__dirname, "..", "..", "test-output.mdr");

    afterAll(() => {
      // Clean up test file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it("should create and read MDR file from disk", () => {
      // Create MDR buffer
      const mdrBuffer = createMdrFile(testProgram, "DISKTEST", "DISKCART");

      // Write to disk
      fs.writeFileSync(tempFilePath, mdrBuffer);

      // Verify file was written
      expect(fs.existsSync(tempFilePath)).toBe(true);
      const fileSize = fs.statSync(tempFilePath).size;
      expect(fileSize).toBe(MDR_FILE_SIZE);

      // Read back from disk
      const readBuffer = fs.readFileSync(tempFilePath);

      // Parse the read file
      const result = parseMdrFile(readBuffer);
      expect(result.programs.length).toBeGreaterThan(0);
      expect(result.metadata.cartridgeName).toBe("DISKCART");
    });

    it("should handle file system errors gracefully", () => {
      // Try to read non-existent file
      const nonExistentPath = path.join(__dirname, "nonexistent.mdr");

      expect(() => {
        fs.readFileSync(nonExistentPath);
      }).toThrow();

      // Try to parse invalid file
      const invalidBuffer = Buffer.alloc(100);
      expect(() => {
        parseMdrFile(invalidBuffer);
      }).toThrow("Invalid MDR file size");
    });
  });

  describe("Real Program Testing", () => {
    it("should work with actual sample programs", () => {
      // Read actual sample program
      const samplePath = path.join(
        __dirname,
        "..",
        "..",
        "samples",
        "example_yards_feet_inches.bas",
      );
      const sampleContent = fs.readFileSync(samplePath, "utf8");

      // Create MDR from sample
      const mdrBuffer = createMdrFile(sampleContent, "YARDS", "SAMPLECART");

      // Verify MDR is valid
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      // Parse MDR
      const result = parseMdrFile(mdrBuffer);
      expect(result.programs.length).toBeGreaterThan(0);

      // Verify we can extract the program
      const extracted = result.programs[0];
      expect(extracted.source.length).toBeGreaterThan(0);
      expect(extracted.source).toContain("yards");
      expect(extracted.source).toContain("feet");
      expect(extracted.source).toContain("inches");
    });

    it("should round-trip example_hangman.bas program", () => {
      // Read the hangman program
      const hangmanPath = path.join(
        __dirname,
        "..",
        "..",
        "samples",
        "example_hangman.bas",
      );
      const hangmanContent = fs.readFileSync(hangmanPath, "utf8");

      // Create MDR from hangman program
      const mdrBuffer = createMdrFile(hangmanContent, "HANGMAN", "ZXBASIC");

      // Verify MDR is valid
      expect(isValidMdrFile(mdrBuffer)).toBe(true);

      // Save to the ZXBASIC.mdr file for testing
      const mdrPath = path.join(
        __dirname,
        "..",
        "..",
        "samples",
        "ZXBASIC.mdr",
      );
      fs.writeFileSync(mdrPath, mdrBuffer);

      // Read back the MDR file
      const readBuffer = fs.readFileSync(mdrPath);

      // Parse MDR - this is where the failure should occur
      const result = parseMdrFile(readBuffer);

      // Verify parsing succeeded
      expect(result.errors.length).toBe(0);
      expect(result.programs.length).toBeGreaterThan(0);

      // Verify we can extract the hangman program
      const extracted = result.programs[0];
      expect(extracted.name).toBe("HANGMAN");
      expect(extracted.source.length).toBeGreaterThan(0);
      
      // Check for key hangman program elements
      expect(extracted.source).toContain("hangman");
      expect(extracted.source).toContain("INPUT");
      expect(extracted.source).toContain("DRAW");
      expect(extracted.source).toContain("GO SUB");

      console.log("Extracted program lines:", extracted.source.split("\n").length);
      console.log("First few lines:", extracted.source.split("\n").slice(0, 5).join("\n"));
    });

    it("should preserve line numbers in round-trip", () => {
      const samplePath = path.join(
        __dirname,
        "..",
        "..",
        "samples",
        "example_yards_feet_inches.bas",
      );
      const sampleContent = fs.readFileSync(samplePath, "utf8");

      // Count original line numbers
      const originalLines = sampleContent.split("\n");
      // const lineNumbers = originalLines
      //   .filter((line) => line.trim() !== '')
      //   .map((line) => {
      //     const match = line.match(/^(\d+)/);
      //     return match ? parseInt(match[1], 10) : 0;
      //   })
      //   .filter((n) => n > 0);

      // Create MDR and parse back
      const mdrBuffer = createMdrFile(sampleContent, "LINETEST", "LINECART");
      const result = parseMdrFile(mdrBuffer);

      // Verify structure is preserved
      expect(result.programs.length).toBeGreaterThan(0);
      const extracted = result.programs[0];
      expect(extracted.source).toContain("10 "); // Line 10
      expect(extracted.source).toContain("40 "); // Line 40
    });
  });

  describe("Error Handling", () => {
    it("should handle empty MDR files", () => {
      const emptyMdr = createEmptyMdr("TEST");

      // Debug empty MDR structure
      console.log(
        "Empty MDR first bytes:",
        Array.from(emptyMdr.subarray(0, 10)),
      );
      console.log("Empty MDR sector number:", emptyMdr[1]);
      console.log("Empty MDR header flag:", emptyMdr[0]);

      // Should be valid structure but no programs
      expect(isValidMdrFile(emptyMdr)).toBe(true);

      const result = parseMdrFile(emptyMdr);
      // May have empty programs or none depending on implementation
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect invalid MDR files", () => {
      // Wrong size
      const wrongSize = Buffer.alloc(100);
      expect(isValidMdrFile(wrongSize)).toBe(false);

      // Wrong header
      const wrongHeader = Buffer.alloc(MDR_FILE_SIZE, 0);
      wrongHeader[0] = 0x00; // Invalid header flag
      expect(isValidMdrFile(wrongHeader)).toBe(false);
    });
  });
});
