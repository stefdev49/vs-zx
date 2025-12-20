# MDR (Microdrive) Format Complete Reference

> **AI Agent Quick Reference**: This document contains everything needed to work with MDR (Microdrive) format files in the ZX BASIC VS Code extension. All code examples are production-ready TypeScript.

## 📋 Table of Contents

1. [Format Overview](#format-overview)
2. [File Structure](#file-structure)
3. [Data Types & Interfaces](#data-types--interfaces)
4. [Core Operations](#core-operations)
5. [BASIC Tokenization](#basic-tokenization)
6. [Error Handling](#error-handling)
7. [Testing Guide](#testing-guide)
8. [Implementation Checklist](#implementation-checklist)

---

## Format Overview

**Purpose**: Store Sinclair ZX Spectrum Microdrive cartridge images  
**File Extension**: `.mdr`  
**File Size**: Always 137,923 bytes (254 sectors × 543 bytes + 1 write protection byte)  
**Emulator Compatibility**: WinZ80 standard format  
**Source**: Based on mdv2img tool by Volker Bartheld

### Key Characteristics

- **Fixed-size sectors**: Each sector is exactly 543 bytes
- **Sector numbering**: 254 (first) down to 1 (last)
- **Three-level checksums**: Header, Record, Data
- **Write protection**: Single byte at file end (0=writable, 1=protected)

---

## File Structure

### Complete File Layout (137,923 bytes)

```
Byte Offset  | Size      | Content
-------------|-----------|----------------------------------
0            | 543       | Sector 254 (first sector)
543          | 543       | Sector 253
1,086        | 543       | Sector 252
...          | ...       | ...
137,379      | 543       | Sector 1 (last sector)
137,922      | 1         | Write protection byte
```

### Single Sector Structure (543 bytes)

```
Byte Offset  | Size | Field              | Description
-------------|------|--------------------|---------------------------------
0            | 1    | header.flag        | Always 0x01 (header indicator)
1            | 1    | header.sectorNum   | Sector number (254→1)
2-3          | 2    | [unused]           | Reserved bytes (ignored)
4-13         | 10   | header.name        | Cartridge name (blank-padded)
14           | 1    | header.checksum    | Header checksum (bytes 0-13)
15           | 1    | record.flags       | Record flags (see below)
16           | 1    | record.sequence    | Data block sequence (0-based)
17-18        | 2    | record.length      | Data length (little-endian, ≤512)
19-28        | 10   | record.filename    | Filename (blank-padded)
29           | 1    | record.checksum    | Record descriptor checksum
30-541       | 512  | data               | Actual data payload
542          | 1    | dataChecksum       | Data block checksum
```

### Record Flags Bit Field

```
Bit  | Meaning
-----|----------------------------------------
0    | Always 0 (indicates record block)
1    | EOF marker (1 = last block of file)
2    | File type (0 = PRINT file, 1 = CODE/DATA)
3-7  | Unused (always 0)
```

---

## Data Types & Interfaces

### TypeScript Constants

```typescript
// File-level constants
export const MDR_SECTOR_SIZE = 543;
export const MDR_TOTAL_SECTORS = 254;
export const MDR_FILE_SIZE = 137923; // 254 * 543 + 1
export const MDR_HEADER_SIZE = 15;
export const MDR_RECORD_SIZE = 15;
export const MDR_DATA_SIZE = 513; // 512 bytes + 1 checksum
```

### Core Interfaces

```typescript
export interface MdrSector {
  header: {
    flag: number;           // Always 0x01
    sectorNumber: number;   // 254 down to 1
    name: string;           // Cartridge name (10 chars max, blank-padded)
    checksum: number;       // Header checksum
  };
  record: {
    flags: number;          // Bit field (see above)
    sequence: number;       // Block sequence number (0-based)
    length: number;         // Data length (≤ 512 bytes)
    filename: string;       // Filename (10 chars max, blank-padded)
    checksum: number;       // Record checksum
  };
  data: Uint8Array;         // 512 bytes of data
  dataChecksum: number;     // Data checksum
}

export interface MdrFile {
  sectors: MdrSector[];
  writeProtected: boolean;
  cartridgeName: string;
  version: string;
  errors?: MdrError[];
}

export interface MdrError {
  sector: number;
  type: "HDCHK" | "DESCHK" | "DCHK" | "STRUCTURE";
  message: string;
  expected?: number;
  actual?: number;
}

export enum MdrErrorPolicy {
  NONE = 0x0000,
  FIX_HEADER = 0x0001,
  FIX_RECORD = 0x0002,
  FIX_DATA = 0x0004,
  ACCEPT_ERRORS = 0x0008,
  OVERWRITE_SECTORS = 0x0010,
  OVERWRITE_OUTPUT = 0x0020,
  ALLOW_NONSTANDARD = 0x0040,
}
```

---

## Core Operations

### 1. Checksum Calculation

**Algorithm**: Sinclair Microdrive ROM checksum (modulo 255)

```typescript
/**
 * Calculate MDR checksum - matches IF-1 ROM implementation
 * @param data - Bytes to checksum
 * @returns Checksum value (0-254)
 */
export function calculateMdrChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) % 255;
  }
  return sum;
}
```

### 2. File Validation

```typescript
/**
 * Quick validation of MDR file structure
 */
export function isValidMdrFile(buffer: Buffer): boolean {
  if (buffer.length !== MDR_FILE_SIZE) return false;
  if (buffer[0] !== 0x01) return false;  // Header flag
  if (buffer[1] !== 254) return false;   // First sector number
  return true;
}

/**
 * Get file metadata without full parsing
 */
export function getMdrInfo(buffer: Buffer): {
  valid: boolean;
  cartridgeName?: string;
  writeProtected: boolean;
  sectorCount: number;
} {
  if (!isValidMdrFile(buffer)) {
    return { valid: false, writeProtected: false, sectorCount: 0 };
  }
  return {
    valid: true,
    cartridgeName: buffer.subarray(4, 14).toString("ascii").trim(),
    writeProtected: buffer[buffer.length - 1] !== 0,
    sectorCount: MDR_TOTAL_SECTORS,
  };
}
```

### 3. Sector Parsing

```typescript
/**
 * Parse single sector from buffer
 */
function parseMdrSector(sectorBuffer: Buffer, sectorNumber: number): MdrSector {
  return {
    header: {
      flag: sectorBuffer[0],
      sectorNumber: sectorBuffer[1],
      name: sectorBuffer.subarray(4, 14).toString("ascii").trim(),
      checksum: sectorBuffer[14],
    },
    record: {
      flags: sectorBuffer[15],
      sequence: sectorBuffer[16],
      length: sectorBuffer.readUInt16LE(17), // Little-endian
      filename: sectorBuffer.subarray(19, 29).toString("ascii").trim(),
      checksum: sectorBuffer[29],
    },
    data: sectorBuffer.subarray(30, 542),
    dataChecksum: sectorBuffer[542],
  };
}
```

### 4. Sector Writing

```typescript
/**
 * Write sector to buffer at specified position
 */
function writeMdrSector(buffer: Buffer, sector: MdrSector, sectorIndex: number): void {
  const offset = sectorIndex * MDR_SECTOR_SIZE;

  // Write header (15 bytes)
  buffer[offset] = sector.header.flag;
  buffer[offset + 1] = sector.header.sectorNumber;
  buffer[offset + 2] = 0; // unused
  buffer[offset + 3] = 0; // unused
  buffer.write(sector.header.name.padEnd(10, " "), offset + 4, 10, "ascii");
  buffer[offset + 14] = sector.header.checksum;

  // Write record descriptor (15 bytes)
  buffer[offset + 15] = sector.record.flags;
  buffer[offset + 16] = sector.record.sequence;
  buffer.writeUInt16LE(sector.record.length, offset + 17);
  buffer.write(sector.record.filename.padEnd(10, " "), offset + 19, 10, "ascii");
  buffer[offset + 29] = sector.record.checksum;

  // Write data (512 bytes + 1 checksum)
  Buffer.from(sector.data).copy(buffer, offset + 30);
  buffer[offset + 542] = sector.dataChecksum;
}
```

### 5. Complete File Parsing

```typescript
/**
 * Parse complete MDR file and extract all programs
 */
export function parseMdrFile(mdrBuffer: Buffer): {
  programs: { name: string; source: string; sector: number }[];
  metadata: MdrFile;
  errors: MdrError[];
} {
  if (mdrBuffer.length !== MDR_FILE_SIZE) {
    throw new Error(`Invalid MDR file size: ${mdrBuffer.length} (expected ${MDR_FILE_SIZE})`);
  }

  const programs: { name: string; source: string; sector: number }[] = [];
  const errors: MdrError[] = [];
  const sectors: MdrSector[] = [];
  const writeProtected = mdrBuffer[mdrBuffer.length - 1] !== 0;

  // Parse all sectors
  for (let i = 0; i < MDR_TOTAL_SECTORS; i++) {
    const offset = i * MDR_SECTOR_SIZE;
    const sectorBuffer = mdrBuffer.subarray(offset, offset + MDR_SECTOR_SIZE);
    const sector = parseMdrSector(sectorBuffer, i + 1);
    sectors.push(sector);

    // Validate checksums
    const sectorErrors = validateMdrSector(sector);
    errors.push(...sectorErrors);

    // Extract BASIC programs from valid sectors
    if (sectorErrors.length === 0 && isBasicSector(sector)) {
      try {
        const source = extractBasicFromSector(sector);
        if (source.trim()) {
          programs.push({
            name: sector.record.filename.trim() || `PROGRAM${i}`,
            source,
            sector: sector.header.sectorNumber,
          });
        }
      } catch (err) {
        console.warn(`Failed to extract BASIC from sector ${sector.header.sectorNumber}`);
      }
    }
  }

  // Get cartridge name from first valid sector
  const cartridgeName = sectors.find(s => s.header.name.trim())?.header.name.trim() || "UNKNOWN";

  return {
    programs,
    metadata: {
      sectors,
      writeProtected,
      cartridgeName,
      version: "1.0",
      errors: errors.length > 0 ? errors : undefined,
    },
    errors,
  };
}
```

### 6. File Creation

```typescript
/**
 * Create MDR file from BASIC source code
 */
export function createMdrFile(
  basicSource: string,
  programName: string,
  cartridgeName: string = "ZXBASIC",
): Buffer {
  if (programName.length > 10) throw new Error("Program name max 10 chars");
  if (cartridgeName.length > 10) throw new Error("Cartridge name max 10 chars");

  const mdrBuffer = Buffer.alloc(MDR_FILE_SIZE, 0);
  const tokenizedData = tokenizeBasic(basicSource);

  const sector: MdrSector = {
    header: {
      flag: 0x01,
      sectorNumber: 254,
      name: cartridgeName.padEnd(10, " "),
      checksum: 0,
    },
    record: {
      flags: 0x00,
      sequence: 0,
      length: Math.min(tokenizedData.length, 512),
      filename: programName.padEnd(10, " "),
      checksum: 0,
    },
    data: tokenizedData.subarray(0, 512),
    dataChecksum: 0,
  };

  // Calculate checksums
  sector.header.checksum = calculateHeaderChecksum(sector);
  sector.record.checksum = calculateRecordChecksum(sector);
  sector.dataChecksum = calculateMdrChecksum(sector.data);

  writeMdrSector(mdrBuffer, sector, 0);
  mdrBuffer[MDR_FILE_SIZE - 1] = 0; // Not write-protected

  return mdrBuffer;
}
```

### 7. Checksum Helpers

```typescript
function calculateHeaderChecksum(sector: MdrSector): number {
  const data = new Uint8Array([
    sector.header.flag,
    sector.header.sectorNumber,
    0, 0, // unused bytes
    ...Buffer.from(sector.header.name.padEnd(10, " ")),
  ]);
  return calculateMdrChecksum(data);
}

function calculateRecordChecksum(sector: MdrSector): number {
  const data = new Uint8Array([
    sector.record.flags,
    sector.record.sequence,
    sector.record.length & 0xff,
    (sector.record.length >> 8) & 0xff,
    ...Buffer.from(sector.record.filename.padEnd(10, " ")),
  ]);
  return calculateMdrChecksum(data);
}
```

---

## BASIC Tokenization

### Overview

**Important**: This implementation uses the **standard ZX Spectrum tokenization scheme** with tokens in the 0xA3-0xFF range, matching the real ZX Spectrum ROM. This ensures compatibility with bas2tap and other authentic tools.

### Token Map Reference

#### 128K Tokens (0xA3-0xA4)

```
0xA3=SPECTRUM   0xA4=PLAY
```

#### Function Tokens (0xA5-0xC4)

```
0xA5=RND       0xAD=TAB       0xB5=ASN       0xBD=ABS
0xA6=INKEY$    0xAE=VAL$      0xB6=ACS       0xBE=PEEK
0xA7=PI        0xAF=CODE      0xB7=ATN       0xBF=IN
0xA8=FN        0xB0=VAL       0xB8=LN        0xC0=USR
0xA9=POINT     0xB1=LEN       0xB9=EXP       0xC1=STR$
0xAA=SCREEN$   0xB2=SIN       0xBA=INT       0xC2=CHR$
0xAB=ATTR      0xB3=COS       0xBB=SQR       0xC3=NOT
0xAC=AT        0xB4=TAN       0xBC=SGN       0xC4=BIN
```

#### Operator Tokens (0xC5-0xCD)

```
0xC5=OR        0xC9=<>        0xCC=TO
0xC6=AND       0xCA=LINE      0xCD=STEP
0xC7=<=        0xCB=THEN
0xC8=>=
```

#### Command Tokens (0xCE-0xFF)

```
0xCE=DEF FN    0xD6=VERIFY    0xDE=OVER      0xE6=NEW       0xEE=INPUT     0xF6=PLOT
0xCF=CAT       0xD7=BEEP      0xDF=OUT       0xE7=BORDER    0xEF=LOAD      0xF7=RUN
0xD0=FORMAT    0xD8=CIRCLE    0xE0=LPRINT    0xE8=CONTINUE  0xF0=LIST      0xF8=SAVE
0xD1=MOVE      0xD9=INK       0xE1=LLIST     0xE9=DIM       0xF1=LET       0xF9=RANDOMIZE
0xD2=ERASE     0xDA=PAPER     0xE2=STOP      0xEA=REM       0xF2=PAUSE     0xFA=IF
0xD3=OPEN #    0xDB=FLASH     0xE3=READ      0xEB=FOR       0xF3=NEXT      0xFB=CLS
0xD4=CLOSE #   0xDC=BRIGHT    0xE4=DATA      0xEC=GO TO     0xF4=POKE      0xFC=DRAW
0xD5=MERGE     0xDD=INVERSE   0xE5=RESTORE   0xED=GO SUB    0xF5=PRINT     0xFD=CLEAR
                                                                           0xFE=RETURN
                                                                           0xFF=COPY
```

### Number Encoding

**Format**: `<ASCII digits> 0x0E <5-byte floating point>`  
**Byte order**: Little-endian for small integers

Numbers are stored as ASCII digits followed by a 0x0E marker and 5-byte floating point representation:
- For small integers (0-65535): `0x0E 0x00 <sign> <low_byte> <high_byte> 0x00`
- Sign byte: 0x00 for positive, 0xFF for negative

**Example**: Number 100 encodes as `31 30 30 0E 00 00 64 00 00` (ASCII "100" + 5-byte representation)

### Token Ranges (No Overlap with ASCII)

With real ZX Spectrum tokens (0xA3-0xFF), there is **NO overlap** with printable ASCII (0x20-0x7F):

- **0x00-0x1F**: Control characters (rarely used)
- **0x20-0x7F**: Printable ASCII characters (variables, strings, punctuation)
- **0x80-0x8F**: Block graphics
- **0x90-0xA2**: User-defined graphics (UDGs)
- **0xA3-0xFF**: BASIC keyword tokens

### BASIC Line Structure in Data Block

```
For each line:
  +0: Line number (2 bytes, little-endian)
  +2: Line length (2 bytes, little-endian, includes terminator)
  +4: Tokenized content (variable length)
  +n: 0x0D terminator
```

### Detokenization Algorithm

```typescript
function detokenizeLine(tokens: Uint8Array): string {
  let result = "";
  let i = 0;
  let lastWasNumber = false;

  while (i < tokens.length) {
    const byte = tokens[i];

    // Handle 5-byte number encoding (0x0E + 5 bytes)
    if (byte === 0x0E && i + 5 < tokens.length) {
      i += 6; // Skip 0x0E and 5-byte representation
      lastWasNumber = true;
      continue;
    }

    // Try keyword interpretation (tokens are >= 0xA3)
    const keyword = getKeywordFromToken(byte);
    if (keyword !== null) {
      // Add space before TO/STEP if last was a number
      if (lastWasNumber && (keyword === "TO" || keyword === "STEP")) {
        result += " ";
      }
      result += keyword;
      i++;
      lastWasNumber = false;
    } else {
      // Treat as ASCII character
      result += String.fromCharCode(byte);
      i++;
      lastWasNumber = false;
    }
  }

  return result;
}

function getKeywordFromToken(byte: number): string | null {
  // ASCII range (0x00-0x7F) - not tokens
  if (byte <= 0x7F) return null;
  
  // Block graphics and UDGs (0x80-0xA2) - not keyword tokens
  if (byte >= 0x80 && byte <= 0xA2) return null;

  // Real ZX Spectrum token map (0xA3-0xFF)
  const tokenToKeyword: Record<number, string> = {
    0xA3: "SPECTRUM", 0xA4: "PLAY",
    0xA5: "RND", 0xA6: "INKEY$", 0xA7: "PI", 0xA8: "FN",
    0xA9: "POINT", 0xAA: "SCREEN$", 0xAB: "ATTR", 0xAC: "AT",
    0xAD: "TAB", 0xAE: "VAL$", 0xAF: "CODE", 0xB0: "VAL",
    0xB1: "LEN", 0xB2: "SIN", 0xB3: "COS", 0xB4: "TAN",
    0xB5: "ASN", 0xB6: "ACS", 0xB7: "ATN", 0xB8: "LN",
    0xB9: "EXP", 0xBA: "INT", 0xBB: "SQR", 0xBC: "SGN",
    0xBD: "ABS", 0xBE: "PEEK", 0xBF: "IN", 0xC0: "USR",
    0xC1: "STR$", 0xC2: "CHR$", 0xC3: "NOT", 0xC4: "BIN",
    0xC5: "OR", 0xC6: "AND", 0xC7: "<=", 0xC8: ">=",
    0xC9: "<>", 0xCA: "LINE", 0xCB: "THEN", 0xCC: "TO",
    0xCD: "STEP", 0xCE: "DEF FN", 0xCF: "CAT", 0xD0: "FORMAT",
    0xD1: "MOVE", 0xD2: "ERASE", 0xD3: "OPEN #", 0xD4: "CLOSE #",
    0xD5: "MERGE", 0xD6: "VERIFY", 0xD7: "BEEP", 0xD8: "CIRCLE",
    0xD9: "INK", 0xDA: "PAPER", 0xDB: "FLASH", 0xDC: "BRIGHT",
    0xDD: "INVERSE", 0xDE: "OVER", 0xDF: "OUT", 0xE0: "LPRINT",
    0xE1: "LLIST", 0xE2: "STOP", 0xE3: "READ", 0xE4: "DATA",
    0xE5: "RESTORE", 0xE6: "NEW", 0xE7: "BORDER", 0xE8: "CONTINUE",
    0xE9: "DIM", 0xEA: "REM", 0xEB: "FOR", 0xEC: "GO TO",
    0xED: "GO SUB", 0xEE: "INPUT", 0xEF: "LOAD", 0xF0: "LIST",
    0xF1: "LET", 0xF2: "PAUSE", 0xF3: "NEXT", 0xF4: "POKE",
    0xF5: "PRINT", 0xF6: "PLOT", 0xF7: "RUN", 0xF8: "SAVE",
    0xF9: "RANDOMIZE", 0xFA: "IF", 0xFB: "CLS", 0xFC: "DRAW",
    0xFD: "CLEAR", 0xFE: "RETURN", 0xFF: "COPY",
  };
  
  return tokenToKeyword[byte] || null;
}
```

### Extract BASIC from Sector

```typescript
function isBasicSector(sector: MdrSector): boolean {
  if (sector.data.length < 4) return false;
  const lineNum = sector.data[0] | (sector.data[1] << 8);
  const lineLen = sector.data[2] | (sector.data[3] << 8);
  return lineNum > 0 && lineNum <= 9999 && lineLen > 0 && lineLen <= 512;
}

function extractBasicFromSector(sector: MdrSector): string {
  let source = "";
  let pos = 0;

  while (pos < sector.data.length - 2) {
    const lineNum = sector.data[pos] | (sector.data[pos + 1] << 8);
    const lineLen = sector.data[pos + 2] | (sector.data[pos + 3] << 8);
    pos += 4;

    if (lineLen === 0) break;

    const lineContent = sector.data.subarray(pos, pos + lineLen - 1);
    const lineText = detokenizeLine(lineContent);
    source += `${lineNum} ${lineText}\n`;
    pos += lineLen;
  }

  return source;
}
```

---

## Error Handling

### Checksum Validation

```typescript
function validateMdrSector(sector: MdrSector): MdrError[] {
  const errors: MdrError[] = [];

  // Header checksum
  const headerData = new Uint8Array([
    sector.header.flag,
    sector.header.sectorNumber,
    0, 0,
    ...Buffer.from(sector.header.name.padEnd(10, " ")),
  ]);
  const expectedHdrChk = calculateMdrChecksum(headerData);
  if (expectedHdrChk !== sector.header.checksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "HDCHK",
      message: "Header checksum mismatch",
      expected: expectedHdrChk,
      actual: sector.header.checksum,
    });
  }

  // Record checksum
  const recordData = new Uint8Array([
    sector.record.flags,
    sector.record.sequence,
    sector.record.length & 0xff,
    (sector.record.length >> 8) & 0xff,
    ...Buffer.from(sector.record.filename.padEnd(10, " ")),
  ]);
  const expectedRecChk = calculateMdrChecksum(recordData);
  if (expectedRecChk !== sector.record.checksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "DESCHK",
      message: "Record checksum mismatch",
      expected: expectedRecChk,
      actual: sector.record.checksum,
    });
  }

  // Data checksum
  const expectedDataChk = calculateMdrChecksum(sector.data);
  if (expectedDataChk !== sector.dataChecksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "DCHK",
      message: "Data checksum mismatch",
      expected: expectedDataChk,
      actual: sector.dataChecksum,
    });
  }

  return errors;
}
```

### Sector Repair

```typescript
function repairMdrSector(sector: MdrSector, policy: MdrErrorPolicy): MdrSector {
  const repaired = { ...sector };

  if (policy & MdrErrorPolicy.FIX_HEADER) {
    repaired.header.checksum = calculateHeaderChecksum(repaired);
  }
  if (policy & MdrErrorPolicy.FIX_RECORD) {
    repaired.record.checksum = calculateRecordChecksum(repaired);
  }
  if (policy & MdrErrorPolicy.FIX_DATA) {
    repaired.dataChecksum = calculateMdrChecksum(repaired.data);
  }

  return repaired;
}
```

---

## Testing Guide

### Unit Tests Required

```typescript
describe("MDR Format", () => {
  test("checksum calculation", () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    expect(calculateMdrChecksum(data)).toBe(10);
  });

  test("file validation", () => {
    const validFile = Buffer.alloc(MDR_FILE_SIZE);
    validFile[0] = 0x01;
    validFile[1] = 254;
    expect(isValidMdrFile(validFile)).toBe(true);
  });

  test("sector parsing", () => {
    // Create test sector buffer
    const sector = parseMdrSector(testBuffer, 254);
    expect(sector.header.flag).toBe(0x01);
  });

  test("number encoding/decoding", () => {
    const tokens = new Uint8Array([0x0E, 0xF0, 0x00]); // 240
    const result = detokenizeLine(tokens);
    expect(result).toBe("240");
  });
});
```

### Integration Tests Required

```typescript
describe("MDR Round-trip", () => {
  test("BASIC program round-trip", () => {
    const source = "10 PRINT \"HELLO\"\n20 GOTO 10";
    const mdr = createMdrFile(source, "TEST", "CART");
    const parsed = parseMdrFile(mdr);
    
    expect(parsed.programs.length).toBe(1);
    expect(parsed.programs[0].source).toContain("PRINT");
    expect(parsed.programs[0].source).toContain("GOTO");
  });

  test("complex program round-trip", () => {
    // Use actual sample like example_hangman.bas
    const hangman = fs.readFileSync("samples/example_hangman.bas", "utf8");
    const mdr = createMdrFile(hangman, "HANGMAN", "ZXBASIC");
    const parsed = parseMdrFile(mdr);
    
    expect(parsed.errors.length).toBe(0);
    expect(parsed.programs[0].source).toContain("INPUT");
    expect(parsed.programs[0].source).toContain("GO SUB");
  });
});
```

---

## Implementation Checklist

### For AI Agents: Step-by-Step Implementation

- [ ] **Phase 1: Core Format Support**
  - [ ] Implement `calculateMdrChecksum()`
  - [ ] Implement `isValidMdrFile()`
  - [ ] Implement `parseMdrSector()`
  - [ ] Implement `writeMdrSector()`
  - [ ] Add unit tests for checksum calculation

- [ ] **Phase 2: File Operations**
  - [ ] Implement `createEmptyMdr()`
  - [ ] Implement `getMdrInfo()`
  - [ ] Implement `validateMdrSector()`
  - [ ] Add integration tests for file creation

- [ ] **Phase 3: BASIC Support**
  - [ ] Implement token map (all 92 tokens)
  - [ ] Implement `getKeywordFromToken()`
  - [ ] Implement `detokenizeLine()`
  - [ ] Implement `isBasicSector()`
  - [ ] Implement `extractBasicFromSector()`
  - [ ] Add tests for tokenization/detokenization

- [ ] **Phase 4: Full Parsing**
  - [ ] Implement `parseMdrFile()`
  - [ ] Implement `createMdrFile()`
  - [ ] Add comprehensive round-trip tests
  - [ ] Test with real programs (hangman, etc.)

- [ ] **Phase 5: VS Code Integration**
  - [ ] Add MDR commands to `package.json`
  - [ ] Implement `loadFromMdr.ts` command
  - [ ] Implement `saveToMdr.ts` command
  - [ ] Add UI/UX for file selection
  - [ ] Add error messaging to user

- [ ] **Phase 6: Error Handling**
  - [ ] Implement error recovery policies
  - [ ] Implement `repairMdrSector()`
  - [ ] Add user-friendly error messages
  - [ ] Test with corrupted files

### File Locations

```
converter/src/mdr-format.ts              # Core implementation
converter/src/mdr-format.spec.ts         # Unit tests
converter/src/mdr-integration.spec.ts    # Integration tests
vscode-extension/src/commands/loadFromMdr.ts
vscode-extension/src/commands/saveToMdr.ts
```

---

## Quick Reference Card

```
File Size:    137,923 bytes fixed
Sector Size:  543 bytes fixed
Sectors:      254 (numbered 254→1)
Checksums:    3 levels (header, record, data)
Algorithm:    sum(bytes) % 255

Byte Ranges:
  0x00-0x1F   Control characters
  0x20-0x7F   Printable ASCII (variables, strings, punctuation)
  0x80-0x8F   Block graphics
  0x90-0xA2   User-defined graphics (UDGs)
  0xA3-0xA4   128K tokens (SPECTRUM, PLAY)
  0xA5-0xC4   Function tokens (RND, SIN, CHR$, etc.)
  0xC5-0xCD   Operator tokens (OR, AND, TO, STEP, etc.)
  0xCE-0xFF   Command tokens (REM, LET, PRINT, FOR, etc.)

Number encoding: <ASCII digits> 0x0E <5-byte float>

BASIC Line Structure:
  <linenum:2> <length:2> <tokens...> <0x0D>
  (line number is big-endian, length is little-endian)
```

---

**Document Version**: 1.1  
**Last Updated**: 2025-12-20  
**Maintained By**: ZX BASIC VS Code Extension Team
