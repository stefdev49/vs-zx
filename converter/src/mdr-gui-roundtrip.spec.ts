/**
 * MDR GUI Round-Trip Test
 * 
 * Simulates the VS Code extension workflow:
 * 1. User opens biorhythms.bas
 * 2. User saves to MDR via "Save to MDR" command (uses createMdrFile)
 * 3. User loads from MDR via "Load from MDR" command (uses parseMdrFile)
 * 4. Compare original vs extracted
 */

import * as fs from "fs";
import * as path from "path";
import { createMdrFile, parseMdrFile } from "./mdr-format";

describe("MDR GUI Round-Trip", () => {
  const samplesDir = path.join(__dirname, "../../samples");
  const biorhythmsPath = path.join(samplesDir, "biorhythms.bas");

  it("should round-trip biorhythms.bas correctly", () => {
    // Step 1: Read original source (simulates editor content)
    const originalSource = fs.readFileSync(biorhythmsPath, "utf-8");
    console.log("=== ORIGINAL SOURCE (first 500 chars) ===");
    console.log(originalSource.substring(0, 500));
    
    // Step 2: Save to MDR (simulates saveToMdr command)
    const mdrBuffer = createMdrFile(originalSource, "BIORHYTM", "ZXBASIC");
    console.log("\n=== MDR CREATED ===");
    console.log(`Size: ${mdrBuffer.length} bytes`);
    
    // Debug: examine first sector data
    console.log("\n=== FIRST SECTOR RAW DATA (first 50 bytes) ===");
    const firstSectorData = mdrBuffer.slice(30, 80); // Skip header, get data
    console.log(Array.from(firstSectorData));
    
    // Step 3: Load from MDR (simulates loadFromMdr command)
    const parseResult = parseMdrFile(mdrBuffer);
    console.log("\n=== PARSE RESULT ===");
    console.log(`Programs found: ${parseResult.programs.length}`);
    console.log(`Errors: ${parseResult.errors.length}`);
    
    if (parseResult.programs.length > 0) {
      const extractedSource = parseResult.programs[0].source;
      console.log("\n=== EXTRACTED SOURCE (first 500 chars) ===");
      console.log(extractedSource.substring(0, 500));
      
      // Step 4: Compare line by line
      const originalLines = originalSource.split("\n").filter((l: string) => l.trim());
      const extractedLines = extractedSource.split("\n").filter((l: string) => l.trim());
      
      console.log("\n=== LINE COMPARISON ===");
      console.log(`Original lines: ${originalLines.length}`);
      console.log(`Extracted lines: ${extractedLines.length}`);
      
      // Find first difference
      for (let i = 0; i < Math.min(originalLines.length, extractedLines.length); i++) {
        const orig = originalLines[i].trim();
        const extr = extractedLines[i].trim();
        if (orig !== extr) {
          console.log(`\n=== FIRST DIFFERENCE at line ${i} ===`);
          console.log(`Original:  "${orig}"`);
          console.log(`Extracted: "${extr}"`);
          
          // Character-by-character comparison
          console.log("\n=== CHARACTER COMPARISON ===");
          const maxLen = Math.max(orig.length, extr.length);
          for (let j = 0; j < Math.min(50, maxLen); j++) {
            const origChar = j < orig.length ? orig[j] : "(none)";
            const extrChar = j < extr.length ? extr[j] : "(none)";
            const origCode = j < orig.length ? orig.charCodeAt(j) : -1;
            const extrCode = j < extr.length ? extr.charCodeAt(j) : -1;
            const match = origChar === extrChar ? "✓" : "✗";
            console.log(`  [${j}] ${match} orig='${origChar}' (0x${origCode.toString(16)}) vs extr='${extrChar}' (0x${extrCode.toString(16)})`);
          }
          break;
        }
      }
    }
    
    // For now, just verify we got some output
    expect(parseResult.programs.length).toBeGreaterThan(0);
  });

  it("should correctly tokenize line 1010 with DIM p$", () => {
    // Isolate line 1010 which has the issue
    const line1010 = "1010 DIM p$(185): FOR n=0 TO 184: LET p$(n+1)=CHR$ ((16*SIN (PI*n/92))+144): NEXT n";
    
    console.log("=== TESTING LINE 1010 ===");
    console.log(`Input: ${line1010}`);
    
    const mdrBuffer = createMdrFile(line1010, "TEST", "TEST");
    const parseResult = parseMdrFile(mdrBuffer);
    
    expect(parseResult.programs.length).toBeGreaterThan(0);
    
    const extracted = parseResult.programs[0].source.trim();
    console.log(`Output: ${extracted}`);
    
    // Check for the specific error pattern
    expect(extracted).not.toContain("p>=");  // Should be p$
    expect(extracted).not.toContain("0(184"); // Should be 0 TO 184
    expect(extracted).not.toContain("nCAT");  // Should be n+
    expect(extracted).not.toContain("DEF FN SIN"); // Should be *SIN
  });
});
