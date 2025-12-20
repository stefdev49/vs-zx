# 📋 MDR (Microdrive) Format Technical Specification

## 🎯 Overview

This specification defines the MDR (Microdrive) format implementation for the ZX BASIC VS Code extension, based on the Sinclair Microdrive cartridge format and WinZ80 emulator compatibility.

## 📐 Format Structure

### File Layout

```
MDR File Structure (137,923 bytes total)
├── Sector 254: 543 bytes (Header + Record + Data)
├── Sector 253: 543 bytes
├── ...
├── Sector 1: 543 bytes
└── Write Protection Byte: 1 byte (0 = writable, 1 = protected)
```

### Sector Structure (543 bytes)

```
Sector Layout
├── Header: 15 bytes
├── Record Descriptor: 15 bytes
├── Data Block: 512 bytes
└── Data Checksum: 1 byte
```

## 🔢 Constants and Definitions

```typescript
// File constants
export const MDR_SECTOR_SIZE = 543; // bytes per sector
export const MDR_TOTAL_SECTORS = 254; // total sectors in cartridge
export const MDR_FILE_SIZE = 137923; // 254 * 543 + 1 (write protection byte)
export const MDR_HEADER_SIZE = 15; // sector header size
export const MDR_RECORD_SIZE = 15; // record descriptor size
export const MDR_DATA_SIZE = 513; // data block size (512 + checksum)
```

## 📦 Data Structures

### MdrSector Interface

```typescript
export interface MdrSector {
  header: {
    flag: number; // 0x01 = header block indicator
    sectorNumber: number; // Sector number (254 down to 1)
    name: string; // Cartridge name (10 chars, blank-padded)
    checksum: number; // Header checksum (first 14 bytes)
  };
  record: {
    flags: number; // Bit field: EOF, PRINT file, etc.
    sequence: number; // Data block sequence number
    length: number; // Data length in bytes (≤ 512)
    filename: string; // Filename (10 chars, blank-padded)
    checksum: number; // Record descriptor checksum
  };
  data: Uint8Array; // 512 bytes of actual data
  dataChecksum: number; // Data block checksum
}
```

### MdrFile Interface

```typescript
export interface MdrFile {
  sectors: MdrSector[];
  writeProtected: boolean; // Write protection flag
  cartridgeName: string; // Cartridge name from sector headers
  version: string; // Format version
  errors?: MdrError[]; // Any errors found during parsing
}
```

### MdrError Interface

```typescript
export interface MdrError {
  sector: number; // Sector number with error
  type: "HDCHK" | "DESCHK" | "DCHK" | "STRUCTURE";
  message: string; // Error description
  expected?: number; // Expected checksum value
  actual?: number; // Actual checksum value
}
```

## 🔧 Checksum Algorithm

### Sinclair Microdrive Checksum

```typescript
/**
 * Calculate Sinclair Microdrive checksum
 * Algorithm from mdv2img.h - matches IF-1 ROM implementation
 *
 * @param data - Data to calculate checksum for
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

### Checksum Validation

The format uses three-level checksum validation:

1. **HDCHK**: Header checksum (first 14 bytes of sector)
2. **DESCHK**: Record descriptor checksum (15 bytes)
3. **DCHK**: Data block checksum (512 bytes)

## 📁 File Operations

### File Validation

```typescript
/**
 * Check if buffer is valid MDR file
 */
export function isValidMdrFile(buffer: Buffer): boolean {
  // Check size
  if (buffer.length !== MDR_FILE_SIZE) return false;

  // Check first sector header flag
  if (buffer[0] !== 0x01) return false;

  // Check sector count
  if (buffer[1] !== 254) return false;

  return true;
}
```

### File Information Extraction

```typescript
/**
 * Get MDR file information without full parsing
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

## 🔄 Sector Operations

### Sector Parsing

```typescript
/**
 * Parse single MDR sector from buffer
 */
function parseMdrSector(
  sectorBuffer: Buffer,
  _sectorNumber: number,
): MdrSector {
  // Parse header (first 15 bytes)
  const header = {
    flag: sectorBuffer[0],
    sectorNumber: sectorBuffer[1],
    name: sectorBuffer.subarray(4, 14).toString("ascii").trim(),
    checksum: sectorBuffer[14],
  };

  // Parse record descriptor (next 15 bytes)
  const record = {
    flags: sectorBuffer[15],
    sequence: sectorBuffer[16],
    length: sectorBuffer.readUInt16LE(17), // LSB first
    filename: sectorBuffer.subarray(19, 29).toString("ascii").trim(),
    checksum: sectorBuffer[29],
  };

  // Parse data (remaining 513 bytes)
  const data = sectorBuffer.subarray(30, 543);
  const dataChecksum = sectorBuffer[542];

  return {
    header,
    record,
    data,
    dataChecksum,
  };
}
```

### Sector Writing

```typescript
/**
 * Write MDR sector to buffer
 */
function writeMdrSector(
  buffer: Buffer,
  sector: MdrSector,
  sectorIndex: number,
): void {
  const offset = sectorIndex * MDR_SECTOR_SIZE;

  // Write header
  buffer[offset] = sector.header.flag;
  buffer[offset + 1] = sector.header.sectorNumber;
  buffer[offset + 2] = 0; // unused
  buffer[offset + 3] = 0; // unused
  buffer.write(sector.header.name.padEnd(10, " "), offset + 4, 10, "ascii");
  buffer[offset + 14] = sector.header.checksum;

  // Write record descriptor
  buffer[offset + 15] = sector.record.flags;
  buffer[offset + 16] = sector.record.sequence;
  buffer.writeUInt16LE(sector.record.length, offset + 17);
  buffer.write(
    sector.record.filename.padEnd(10, " "),
    offset + 19,
    10,
    "ascii",
  );
  buffer[offset + 29] = sector.record.checksum;

  // Write data
  Buffer.from(sector.data).copy(buffer, offset + 30);
  buffer[offset + 542] = sector.dataChecksum;
}
```

## 📂 File Creation and Parsing

### MDR File Creation

```typescript
/**
 * Create MDR file from BASIC source code
 */
export function createMdrFile(
  basicSource: string,
  programName: string,
  cartridgeName: string = "ZXBASIC",
): Buffer {
  // Validate inputs
  if (programName.length > 10) {
    throw new Error("Program name must be 10 characters or less");
  }
  if (cartridgeName.length > 10) {
    throw new Error("Cartridge name must be 10 characters or less");
  }

  // Create buffer for MDR file
  const mdrBuffer = Buffer.alloc(MDR_FILE_SIZE, 0);

  // Convert BASIC source to tokenized format
  const tokenizedData = tokenizeBasic(basicSource);

  // Create first sector with program data
  const sector: MdrSector = {
    header: {
      flag: 0x01,
      sectorNumber: 254, // Start with last sector (254)
      name: cartridgeName.padEnd(10, " "),
      checksum: 0, // Will be calculated
    },
    record: {
      flags: 0x00, // Normal data block
      sequence: 0,
      length: Math.min(tokenizedData.length, 512),
      filename: programName.padEnd(10, " "),
      checksum: 0, // Will be calculated
    },
    data: tokenizedData.subarray(0, 512),
    dataChecksum: 0, // Will be calculated
  };

  // Calculate checksums
  sector.header.checksum = calculateHeaderChecksum(sector);
  sector.record.checksum = calculateRecordChecksum(sector);
  sector.dataChecksum = calculateMdrChecksum(sector.data);

  // Write sector to buffer
  writeMdrSector(mdrBuffer, sector, 0);

  // Mark as not write-protected
  mdrBuffer[MDR_FILE_SIZE - 1] = 0;

  return mdrBuffer;
}
```

### MDR File Parsing

```typescript
/**
 * Parse MDR file buffer and extract structure
 */
export function parseMdrFile(mdrBuffer: Buffer): {
  programs: { name: string; source: string; sector: number }[];
  metadata: MdrFile;
  errors: MdrError[];
} {
  const programs: { name: string; source: string; sector: number }[] = [];
  const errors: MdrError[] = [];

  // Validate overall file structure
  if (mdrBuffer.length !== MDR_FILE_SIZE) {
    throw new Error(
      `Invalid MDR file size: ${mdrBuffer.length} bytes (expected ${MDR_FILE_SIZE})`,
    );
  }

  // Extract write protection byte (last byte)
  const writeProtected = mdrBuffer[mdrBuffer.length - 1] !== 0;

  // Parse all sectors
  const sectors: MdrSector[] = [];
  for (let sectorIndex = 0; sectorIndex < MDR_TOTAL_SECTORS; sectorIndex++) {
    const offset = sectorIndex * MDR_SECTOR_SIZE;
    const sectorBuffer = mdrBuffer.subarray(offset, offset + MDR_SECTOR_SIZE);

    // Parse sector
    const sector = parseMdrSector(sectorBuffer, sectorIndex + 1);
    sectors.push(sector);

    // Validate checksums
    const sectorErrors = validateMdrSector(sector);
    errors.push(...sectorErrors);

    // Extract BASIC programs from valid sectors
    if (sectorErrors.length === 0 && isBasicSector(sector)) {
      try {
        const programSource = extractBasicFromSector(sector);
        if (programSource.trim()) {
          programs.push({
            name: sector.record.filename.trim() || `PROGRAM${sectorIndex}`,
            source: programSource,
            sector: sector.header.sectorNumber,
          });
        }
      } catch (error) {
        // Skip sectors that can't be parsed as BASIC
        console.warn(
          `Failed to extract BASIC from sector ${sector.header.sectorNumber}: ${error}`,
        );
      }
    }
  }

  // Determine cartridge name from first valid sector
  let cartridgeName = "UNKNOWN";
  for (const sector of sectors) {
    if (sector.header.name && sector.header.name.trim()) {
      cartridgeName = sector.header.name.trim();
      break;
    }
  }

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

## 🛠️ Error Handling and Recovery

### Error Validation

```typescript
/**
 * Validate MDR sector checksums
 */
export function validateMdrSector(sector: MdrSector): MdrError[] {
  const errors: MdrError[] = [];

  // Validate header checksum
  const headerData = new Uint8Array([
    sector.header.flag,
    sector.header.sectorNumber,
    ...Array.from({ length: 2 }, () => 0), // unused bytes
    ...Array.from(Buffer.from(sector.header.name.padEnd(10, " "))),
  ]);
  const calculatedHeaderChk = calculateMdrChecksum(headerData);
  if (calculatedHeaderChk !== sector.header.checksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "HDCHK",
      message: "Header checksum mismatch",
      expected: calculatedHeaderChk,
      actual: sector.header.checksum,
    });
  }

  // Validate record checksum
  const recordData = new Uint8Array([
    sector.record.flags,
    sector.record.sequence,
    sector.record.length & 0xff, // LSB first
    (sector.record.length >> 8) & 0xff,
    ...Array.from(Buffer.from(sector.record.filename.padEnd(10, " "))),
  ]);
  const calculatedRecordChk = calculateMdrChecksum(recordData);
  if (calculatedRecordChk !== sector.record.checksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "DESCHK",
      message: "Record descriptor checksum mismatch",
      expected: calculatedRecordChk,
      actual: sector.record.checksum,
    });
  }

  // Validate data checksum
  const calculatedDataChk = calculateMdrChecksum(sector.data);
  if (calculatedDataChk !== sector.dataChecksum) {
    errors.push({
      sector: sector.header.sectorNumber,
      type: "DCHK",
      message: "Data block checksum mismatch",
      expected: calculatedDataChk,
      actual: sector.dataChecksum,
    });
  }

  return errors;
}
```

### Error Recovery Policies

```typescript
export enum MdrErrorPolicy {
  NONE = 0x0000, // No error recovery
  FIX_HEADER = 0x0001, // Recreate broken headers (HDCHK mismatches)
  FIX_RECORD = 0x0002, // Recreate broken records (DESCHK mismatches)
  FIX_DATA = 0x0004, // Recreate broken data blocks (DCHK)
  ACCEPT_ERRORS = 0x0008, // Tolerate checksum errors when writing
  OVERWRITE_SECTORS = 0x0010, // Overwrite existing sectors
  OVERWRITE_OUTPUT = 0x0020, // Overwrite output file
  ALLOW_NONSTANDARD = 0x0040, // Allow nonstandard .mdr files
}

// Default policy: Fix data blocks, accept errors, overwrite output
export const DEFAULT_ERROR_POLICY =
  MdrErrorPolicy.FIX_DATA |
  MdrErrorPolicy.ACCEPT_ERRORS |
  MdrErrorPolicy.OVERWRITE_OUTPUT;
```

### Sector Repair

```typescript
/**
 * Repair MDR sector using specified policy
 */
export function repairMdrSector(
  sector: MdrSector,
  policy: MdrErrorPolicy,
): MdrSector {
  const repaired = { ...sector };

  // Apply repair policies
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

## 🔍 Utility Functions

### Sector Retrieval

```typescript
/**
 * Get MDR sector by number
 */
export function getMdrSector(
  mdrBuffer: Buffer,
  sectorNumber: number,
): MdrSector | null {
  // Sector numbers are 254 down to 1
  // Sector 254 is at position 0, 253 at 1, ..., 1 at 253
  const logicalSector = 254 - sectorNumber;
  if (logicalSector < 0 || logicalSector >= MDR_TOTAL_SECTORS) {
    return null;
  }

  const offset = logicalSector * MDR_SECTOR_SIZE;
  const sectorBuffer = mdrBuffer.subarray(offset, offset + MDR_SECTOR_SIZE);

  return parseMdrSector(sectorBuffer, sectorNumber);
}
```

### Empty MDR Creation

```typescript
/**
 * Create empty MDR file with specified cartridge name
 */
export function createEmptyMdr(cartridgeName: string = "EMPTY"): Buffer {
  const mdrBuffer = Buffer.alloc(MDR_FILE_SIZE, 0);

  // Create minimal valid sector
  const sector: MdrSector = {
    header: {
      flag: 0x01,
      sectorNumber: 254,
      name: cartridgeName.padEnd(10, " ").substring(0, 10),
      checksum: 0,
    },
    record: {
      flags: 0x00,
      sequence: 0,
      length: 0,
      filename: "EMPTY   ",
      checksum: 0,
    },
    data: Buffer.alloc(512, 0),
    dataChecksum: 0,
  };

  // Calculate checksums
  sector.header.checksum = calculateHeaderChecksum(sector);
  sector.record.checksum = calculateRecordChecksum(sector);
  sector.dataChecksum = calculateMdrChecksum(sector.data);

  // Write sector
  writeMdrSector(mdrBuffer, sector, 0);

  // Mark as not write-protected
  mdrBuffer[MDR_FILE_SIZE - 1] = 0;

  return mdrBuffer;
}
```

## 🔤 BASIC Tokenization and Detokenization

### Overview

The MDR format stores BASIC programs in tokenized form within the data blocks. Understanding the tokenization and detokenization process is critical for proper round-trip operations (saving and loading BASIC programs to/from MDR files).

### Tokenization Format

The current implementation uses a **non-standard tokenization scheme** (not the actual ZX Spectrum format) where:

- **Keyword tokens**: 0x00-0x5B (mapped to BASIC keywords)
- **Number marker**: 0x0E (followed by 2 bytes for 16-bit little-endian integer)
- **ASCII characters**: Regular characters, punctuation, and separators

**Note**: The real ZX Spectrum BASIC uses tokens in the range 0xA3-0xFF. This implementation uses a different encoding for internal consistency.

### Token Ranges

#### Function/Expression Tokens (0x00-0x1F)
```typescript
0x00: "RND"      0x08: "TAB"      0x10: "ASN"      0x18: "ABS"
0x01: "INKEY$"   0x09: "VAL$"     0x11: "ACS"      0x19: "PEEK"
0x02: "PI"       0x0A: "CODE"     0x12: "ATN"      0x1A: "IN"
0x03: "FN"       0x0B: "VAL"      0x13: "LN"       0x1B: "USR"
0x04: "POINT"    0x0C: "LEN"      0x14: "EXP"      0x1C: "STR$"
0x05: "SCREEN$"  0x0D: "SIN"      0x15: "INT"      0x1D: "CHR$"
0x06: "ATTR"     0x0E: [NUMBER]   0x16: "SQR"      0x1E: "NOT"
0x07: "AT"       0x0F: "TAN"      0x17: "SGN"      0x1F: "BIN"
```

#### Operator Tokens (0x20-0x3F)
```typescript
0x20: "**"       0x28: "TO"       0x30: "CLOSE #"  0x38: "BRIGHT"
0x21: "OR"       0x29: "STEP"     0x31: "MERGE"    0x39: "INVERSE"
0x22: "AND"      0x2A: "DEF FN"   0x32: "VERIFY"   0x3A: "OVER"
0x23: "<="       0x2B: "CAT"      0x33: "BEEP"     0x3B: "OUT"
0x24: ">="       0x2C: "FORMAT"   0x34: "CIRCLE"   0x3C: "LPRINT"
0x25: "<>"       0x2D: "MOVE"     0x35: "INK"      0x3D: "LLIST"
0x26: "LINE"     0x2E: "ERASE"    0x36: "PAPER"    0x3E: "STOP"
0x27: "THEN"     0x2F: "OPEN #"   0x37: "FLASH"    0x3F: "READ"
```

#### Command Tokens (0x40-0x5B)
```typescript
0x40: "DATA"     0x48: "GO TO"    0x50: "POKE"     0x58: "DRAW"
0x41: "RESTORE"  0x49: "GO SUB"   0x51: "PRINT"    0x59: "CLEAR"
0x42: "NEW"      0x4A: "INPUT"    0x52: "PLOT"     0x5A: "RETURN"
0x43: "BORDER"   0x4B: "LOAD"     0x53: "RUN"      0x5B: "COPY"
0x44: "CONTINUE" 0x4C: "LIST"     0x54: "SAVE"
0x45: "DIM"      0x4D: "LET"      0x55: "RANDOMIZE"
0x46: "REM"      0x4E: "PAUSE"    0x56: "IF"
0x47: "FOR"      0x4F: "NEXT"     0x57: "CLS"
```

### Number Encoding

Numbers are encoded using a special 3-byte sequence:

```
0x0E <low_byte> <high_byte>
```

Where `<low_byte>` and `<high_byte>` form a 16-bit little-endian integer.

**Example**: The number 240 is encoded as:
```
0x0E 0xF0 0x00
```

### ASCII vs Token Overlap Issue

A critical challenge in this tokenization scheme is that **token values overlap with ASCII character codes**:

- 0x35 = both INK token and ASCII '5'
- 0x3A = both OVER token and ASCII ':'
- 0x46 = both REM token and ASCII 'F'

#### Resolution Strategy

The detokenizer resolves this ambiguity by:

1. **Numbers are always encoded with 0x0E marker**: Standalone digits never appear in tokenized data
2. **Punctuation characters are preserved as ASCII**: Certain bytes (`:`, `,`, `.`, `=`, etc.) are never treated as tokens
3. **Keywords take precedence**: When a byte value matches both a token and ASCII, it's interpreted as a token first

### Detokenization Algorithm

```typescript
function detokenizeLine(tokens: Uint8Array): string {
  let result = "";
  let i = 0;
  let lastWasToken = false;

  while (i < tokens.length) {
    const token = tokens[i];

    // Handle number encoding
    if (token === 0x0E && i + 2 < tokens.length) {
      const numLow = tokens[i + 1];
      const numHigh = tokens[i + 2];
      const num = numLow | (numHigh << 8);
      
      if (lastWasToken && result.length > 0) {
        result += " ";
      }
      result += num.toString();
      i += 3;
      lastWasToken = false;
      continue;
    }

    // Try to interpret as keyword token first
    const keyword = getKeywordFromToken(token);

    if (keyword !== null) {
      if (lastWasToken && result.length > 0) {
        result += " ";
      }
      result += keyword;
      i++;
      lastWasToken = true;
    } else {
      // Treat as ASCII
      if (lastWasToken && token !== 0x20 && result.length > 0) {
        result += " ";
      }
      result += String.fromCharCode(token);
      i++;
      lastWasToken = false;
    }
  }

  return result;
}
```

### Token Exclusion List

The following ASCII characters are **never** treated as tokens during detokenization:

```typescript
const neverTokens = [
  0x20, // space
  0x21, // !
  0x22, // "
  0x27, // '
  0x28, // (
  0x29, // )
  0x2C, // ,
  0x2E, // .
  0x3A, // :
  0x3B, // ;
  0x3C, // < (when not part of <=, <>)
  0x3D, // =
  0x3E, // > (when not part of >=)
  0x3F, // ?
];
```

### BASIC Program Structure in MDR

BASIC programs are stored with the following structure within the data block:

```
For each BASIC line:
  +0: Line number (2 bytes, little-endian)
  +2: Line length (2 bytes, little-endian) - includes terminator
  +4: Tokenized line content (variable length)
  +n: 0x0D terminator
```

### Round-Trip Considerations

For successful round-trip operations (BASIC → MDR → BASIC):

1. **Tokenization must be consistent**: Use the same token map for encoding and decoding
2. **Number encoding is required**: All numeric literals must use the 0x0E marker
3. **Preserve whitespace context**: Spacing between tokens must be reconstructed correctly
4. **Handle edge cases**: Empty lines, comments, and special characters

### Known Limitations

1. **Non-standard format**: This is not the actual ZX Spectrum tokenization format
2. **String encoding**: String literals need special handling (not fully implemented)
3. **Float encoding**: Only integer numbers (0-65535) are currently supported with 0x0E marker
4. **Variable names**: May conflict with token values if not handled carefully

### Testing

The tokenization and detokenization logic is validated through:

- **Unit tests**: Individual token encoding/decoding
- **Integration tests**: Full program round-trip (e.g., example_hangman.bas)
- **Edge case tests**: Empty programs, large numbers, special characters

## 🧪 Testing Requirements

### Unit Test Coverage

- Checksum calculation validation
- Sector parsing and writing
- File structure validation
- Error detection and reporting
- Empty MDR creation
- Basic round-trip testing
- **Tokenization/detokenization accuracy**
- **Number encoding/decoding**

### Integration Test Coverage

- Load MDR → Extract BASIC → Edit → Save MDR roundtrip
- Error handling with corrupted test files
- Multiple program extraction
- Configuration options validation
- File system operations
- **Complex BASIC program round-trips** (e.g., hangman, graphics demos)

## 📋 Implementation Notes

### Sector Numbering

- Sector numbers range from 254 (first sector) down to 1 (last sector)
- Sector 254 is stored at buffer position 0
- Sector 1 is stored at buffer position 253 × 543

### Data Format

- All strings are ASCII encoded
- String fields are blank-padded to fixed lengths
- Numeric values use little-endian byte order
- Checksums are calculated using modulo 255 arithmetic

### Error Handling

- Lenient validation with configurable policies
- Comprehensive error reporting with sector details
- Automatic repair options for common issues
- User-friendly error messages

## 🔗 References

- Sinclair Microdrive specification
- WinZ80 emulator .mdr format documentation
- mdv2img tool by Volker Bartheld
- IF-1 ROM checksum implementation

This specification provides a complete technical foundation for implementing MDR format support in the ZX BASIC VS Code extension.
