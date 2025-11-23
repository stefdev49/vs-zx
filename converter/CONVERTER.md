# ZX Spectrum BASIC Converter

A TypeScript library for converting ZX Spectrum BASIC programs to binary formats compatible with ZX Spectrum emulators and hardware.

## Features

- **TAP File Format**: Create TAP files with proper headers and checksums for Spectrum emulators
- **Binary Compilation**: Compile BASIC code to optimized binary using zxbasic compiler
- **Format Support**: Convert to RAW (binary only), TAP (tape image), or SNA (snapshot)
- **Metadata Handling**: Embed program name, autostart line, and variable area information
- **Syntax Validation**: Validate BASIC syntax before compilation
- **Batch Processing**: Convert multiple files efficiently

## Installation

```bash
npm install vs-zx-converter
# or locally
npm link converter/
```

## Usage

### Command Line

```bash
# Convert to TAP format (default)
zx-converter program.bas program.tap

# Convert to RAW format
zx-converter program.bas --format raw

# Specify program name and autostart line
zx-converter program.bas -f tap -n "My Program" -s 10

# Quiet mode
zx-converter program.bas --quiet
```

### Programmatic API

#### Import Functions

```typescript
import {
  convertToTap,
  convertToRaw,
  convertToBinary,
  createTapFile,
  parseTapFile,
  getTapMetadata,
  verifyTapChecksums,
  compileBASIC,
  validateBasicSyntax
} from 'vs-zx-converter';
```

#### Convert BASIC to TAP File

```typescript
const basicCode = `
  10 PRINT "Hello, ZX Spectrum!"
  20 PAUSE 0
`;

const metadata = {
  name: 'HelloWorld',
  autostart: 10
};

const tapBuffer = await convertToTap(basicCode, metadata);
fs.writeFileSync('program.tap', tapBuffer);
```

#### Convert to Raw Binary

```typescript
const basicCode = '10 PRINT "Test"';
const binaryBuffer = await convertToRaw(basicCode);
fs.writeFileSync('program.bin', binaryBuffer);
```

#### Create TAP File Directly

```typescript
import { createTapFile } from 'vs-zx-converter';

const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
const tapFile = createTapFile(
  programData,
  'MyProgram',
  10  // autostart line
);
```

#### Parse TAP File

```typescript
import { parseTapFile, getTapMetadata } from 'vs-zx-converter';

const tapData = fs.readFileSync('program.tap');
const blocks = parseTapFile(tapData);

const metadata = getTapMetadata(tapData);
console.log(metadata);
// Output:
// {
//   type: 0x00,
//   programName: 'MyProgram',
//   programLength: 1024,
//   autostart: 10,
//   variablesArea: 32768
// }
```

#### Validate TAP File

```typescript
import { verifyTapChecksums } from 'vs-zx-converter';

const tapData = fs.readFileSync('program.tap');
const isValid = verifyTapChecksums(tapData);
console.log(`TAP file valid: ${isValid}`);
```

#### Validate BASIC Syntax

```typescript
import { validateBasicSyntax } from 'vs-zx-converter';

const result = await validateBasicSyntax('10 PRINT "Test"');
if (result.valid) {
  console.log('Syntax is valid');
} else {
  console.log('Errors:', result.errors);
}
```

#### Compile BASIC with Options

```typescript
import { compileBASIC } from 'vs-zx-converter';

const result = await compileBASIC(basicCode, {
  optimize: true,
  verbose: true,
  debug: false
});

if (result.success) {
  console.log(`Compiled to ${result.binary!.length} bytes`);
  console.log(`Code size: ${result.stats?.codeSize} bytes`);
} else {
  console.error(`Compilation failed: ${result.error}`);
}
```

## TAP File Format

TAP (Tape) format is an emulator format representing ZX Spectrum cassette tapes.

### Structure

Each TAP file contains blocks:

```
TAP File:
├── Block 1: Header Block (21 bytes)
│   ├── 2 bytes: Block length (19)
│   ├── 1 byte: Type (0x00)
│   ├── 1 byte: File type (0x00 = BASIC)
│   ├── 10 bytes: Program name (space-padded)
│   ├── 2 bytes: Program length
│   ├── 2 bytes: Autostart line (0x8000 = no autostart)
│   ├── 2 bytes: Variables area
│   └── 1 byte: Checksum (XOR)
└── Block 2: Data Block (N+4 bytes)
    ├── 2 bytes: Block length
    ├── 1 byte: Type (0xFF)
    ├── N bytes: Program data
    └── 1 byte: Checksum (XOR)
```

### Metadata Fields

- **Program Name**: Max 10 characters, space-padded
- **Program Length**: Binary length of BASIC program
- **Autostart Line**: Line number to auto-run (0x8000 = no autostart)
- **Variables Area**: Address where variables start in memory

## RAW Format

RAW format contains only the tokenized BASIC program data without any TAP wrapper.

- Use for direct loading into Spectrum memory
- No header or checksum
- Binary representation of BASIC tokens

## SNA Format

SNA format is a Spectrum memory snapshot (48KB).

- Contains CPU state and memory dump
- Format: 48K ZX Spectrum snapshot
- Includes: Registers, interrupt state, memory image
- Maximum size: 49179 bytes

## Requirements

- Node.js 14+
- TypeScript 4.0+
- **zxbasic compiler** (for compilation)
  - Installation: `apt-get install zxbasic` (Linux)
  - Or download from: https://github.com/boriel/zxbasic

## API Reference

### Types

```typescript
export interface TapBlock {
  data: Buffer;
  blockNumber: number;
}

export interface TapHeader {
  type: number;
  programName: string;
  programLength: number;
  autostart?: number;
  variablesArea?: number;
}

export interface ProgramMetadata {
  name: string;
  autostart?: number;
  variablesArea?: number;
}

export interface CompileResult {
  success: boolean;
  binary?: Buffer;
  assembly?: string;
  error?: string;
  warnings?: string[];
  stats?: {
    codeSize: number;
    dataSize: number;
    totalSize: number;
  };
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  size: number;
  format: string;
  error?: string;
  warnings?: string[];
}
```

### Functions

#### TAP Format Functions

- `createHeaderBlock(name: string, length: number, autostart?: number): Buffer`
  - Create a TAP header block

- `createDataBlock(programData: Buffer): Buffer`
  - Create a TAP data block with checksum

- `createTapFile(programData: Buffer, name: string, autostart?: number): Buffer`
  - Create a complete TAP file with header and data blocks

- `parseTapFile(tapData: Buffer): TapBlock[]`
  - Parse TAP file into blocks

- `getTapMetadata(tapData: Buffer): TapHeader | null`
  - Extract metadata from TAP file

- `verifyTapChecksums(tapData: Buffer): boolean`
  - Verify all checksums in TAP file

#### Compiler Functions

- `isZxbasicAvailable(): boolean`
  - Check if zxbasic compiler is installed

- `getZxbasicVersion(): string | null`
  - Get zxbasic version

- `compileBASIC(code: string, options?: CompileOptions): Promise<CompileResult>`
  - Compile BASIC code to binary

- `compileBasicFile(file: string, output: string, options?: CompileOptions): Promise<CompileResult>`
  - Compile BASIC file to output file

- `validateBasicSyntax(code: string): Promise<{valid: boolean; errors?: string[]}>`
  - Validate BASIC syntax without compiling

#### Converter Functions

- `convertToTap(code: string, metadata: ProgramMetadata): Promise<Buffer>`
  - Convert BASIC code to TAP file

- `convertToRaw(code: string): Promise<Buffer>`
  - Convert BASIC code to raw binary

- `convertToBinary(code: string): Promise<Buffer>`
  - Alias for convertToRaw

## Examples

### Complete Example: Convert File to TAP

```typescript
import * as fs from 'fs';
import { convertToTap, getTapMetadata, verifyTapChecksums } from 'vs-zx-converter';

async function convertProgram() {
  const basicCode = fs.readFileSync('myprogram.bas', 'utf-8');

  const result = await convertToTap(basicCode, {
    name: 'MyProgram',
    autostart: 10
  });

  fs.writeFileSync('myprogram.tap', result);

  // Verify
  const metadata = getTapMetadata(result);
  console.log(`Created TAP: ${metadata?.programName}`);

  const valid = verifyTapChecksums(result);
  console.log(`TAP valid: ${valid}`);
}

convertProgram().catch(console.error);
```

### Batch Conversion

```typescript
import * as fs from 'fs';
import { convertBasicBatch } from 'vs-zx-converter';
import * as glob from 'glob';

async function batchConvert() {
  const files = glob.sync('programs/**/*.bas');

  const results = await convertBasicBatch(files, {
    format: 'tap',
    optimize: true,
    verbose: true
  });

  results.forEach((r, i) => {
    if (r.success) {
      console.log(`✓ ${files[i]} → ${r.outputPath} (${r.size} bytes)`);
    } else {
      console.error(`✗ ${files[i]}: ${r.error}`);
    }
  });
}

batchConvert().catch(console.error);
```

## Error Handling

```typescript
try {
  const result = await convertToTap(basicCode, metadata);
  fs.writeFileSync('output.tap', result);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Conversion failed: ${error.message}`);
  }
}
```

## Performance

- **Compilation**: Depends on code size (typically <1s for small programs)
- **TAP Creation**: ~1ms for data size conversion
- **Parsing**: ~1ms per block
- **Validation**: <1ms for checksum verification

## Limitations

- Maximum code size: 32KB for 48K Spectrum
- Program name: Limited to 10 characters
- Supports 48K Spectrum format (SNA 48K)
- Requires zxbasic compiler for compilation

## Troubleshooting

### "zxbasic not found"
Install the zxbasic compiler:
```bash
# Ubuntu/Debian
sudo apt-get install zxbasic

# macOS
brew install zxbasic

# Or download from: https://github.com/boriel/zxbasic
```

### "Failed to compile BASIC code"
- Check BASIC syntax
- Use `validateBasicSyntax()` to check errors
- Ensure program fits in 32KB memory
- Check zxbasic version compatibility

### TAP checksum errors
- TAP files created with `createTapFile()` include correct checksums
- Use `verifyTapChecksums()` to validate third-party TAP files
- Checksums are XOR of all bytes in each block

## Testing

```bash
npm test
```

Tests cover:
- TAP file creation and parsing
- Checksum calculation and verification
- Metadata extraction
- BASIC compilation
- Format conversion

## License

MIT

## See Also

- [ZX BASIC Compiler](https://github.com/boriel/zxbasic)
- [ZX Spectrum TAP Format](https://www.worldofspectrum.org/TZXformat.html)
- [Spectrum Emulators](https://www.worldofspectrum.org/)
