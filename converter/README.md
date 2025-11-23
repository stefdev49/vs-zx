# ZX Spectrum BASIC Converter Documentation

## Overview

The ZX Spectrum BASIC Converter is a comprehensive toolkit for converting BASIC programs into formats compatible with ZX Spectrum emulators and real hardware. It provides support for multiple output formats including TAP (tape emulation), raw binary, and SNA (snapshot) formats.

## Features

- **BASIC Compilation**: Integrates with the zxbasic compiler for full BASIC support
- **Multiple Formats**: Export to TAP, RAW binary, or SNA snapshot formats
- **TAP File Support**: Complete TAP format implementation with proper headers and checksums
- **Error Handling**: Comprehensive validation and error reporting
- **Batch Processing**: Convert multiple BASIC files at once
- **Metadata Support**: Program naming, autostart lines, and memory configuration
- **CLI Tool**: Command-line interface for easy batch conversions

## Installation

### Prerequisites

- Node.js 16 or later
- zxbasic compiler (for BASIC compilation)

### Setup

```bash
npm install
npm run build
```

### Install zxbasic

On Ubuntu/Debian:
```bash
sudo apt-get install zxbasic
```

On macOS with Homebrew:
```bash
brew install zxbasic
```

Or download from: https://github.com/boriel/zxbasic

## Usage

### Command Line Interface

#### Basic Usage

Convert a BASIC file to TAP format:
```bash
npm run build
zx-converter program.bas
```

#### Options

- `-f, --format <format>` - Output format: `raw` or `tap` (default: `tap`)
- `-n, --name <name>` - Program name for TAP files
- `-s, --start <line>` - Autostart line number
- `-v, --vars <address>` - Variables area address (default: 32768)
- `-q, --quiet` - Suppress output messages

#### Examples

```bash
# Convert to TAP with autostart
zx-converter program.bas -n "MyProgram" -s 10

# Convert to RAW binary
zx-converter program.bas --format raw

# Convert to TAP with custom output filename
zx-converter program.bas output.tap

# Quiet mode (minimal output)
zx-converter program.bas program.tap -q
```

### Programmatic API

#### Import Module

```typescript
import {
  convertToTap,
  convertToRaw,
  convertToBinary,
  compileBASIC,
  createTapFile
} from 'converter';
```

#### Convert BASIC String to TAP

```typescript
import { convertToTap } from 'converter';

const basicCode = `
10 PRINT "Hello, ZX Spectrum!"
20 GOTO 10
`;

const tapFile = await convertToTap(basicCode, {
  name: 'Hello',
  autostart: 10
});

// Write to file
fs.writeFileSync('hello.tap', tapFile);
```

#### Convert BASIC File to Binary

```typescript
import { convertBasicToBinary } from 'converter';

const result = await convertBasicToBinary('program.bas', {
  output: 'program.tap',
  format: 'tap',
  autostart: 10,
  verbose: true
});

if (result.success) {
  console.log(`Output: ${result.outputPath}, Size: ${result.size} bytes`);
} else {
  console.error(`Error: ${result.error}`);
}
```

#### Compile BASIC Code

```typescript
import { compileBASIC } from 'converter';

const basicCode = `
10 LET x = 10
20 PRINT x
`;

const result = await compileBASIC(basicCode, {
  optimize: true,
  verbose: true
});

if (result.success && result.binary) {
  console.log(`Binary size: ${result.binary.length} bytes`);
} else {
  console.error(`Compilation failed: ${result.error}`);
}
```

#### Create TAP File

```typescript
import { createTapFile } from 'converter';

const programData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
const tapFile = createTapFile(programData, 'MyProgram', 10);

fs.writeFileSync('output.tap', tapFile);
```

#### Parse TAP File

```typescript
import { parseTapFile, getTapMetadata } from 'converter';

const tapData = fs.readFileSync('program.tap');

// Get metadata
const metadata = getTapMetadata(tapData);
console.log(`Program name: ${metadata?.programName}`);
console.log(`Program length: ${metadata?.programLength} bytes`);

// Parse blocks
const blocks = parseTapFile(tapData);
console.log(`TAP file contains ${blocks.length} blocks`);
```

#### Verify TAP Checksums

```typescript
import { verifyTapChecksums } from 'converter';

const tapData = fs.readFileSync('program.tap');
const valid = verifyTapChecksums(tapData);

if (valid) {
  console.log('TAP file checksums are valid');
} else {
  console.log('TAP file has checksum errors');
}
```

#### Validate BASIC Syntax

```typescript
import { validateBasicSyntax } from 'converter';

const basicCode = `
10 PRINT "Test"
20 GOTO 30
`;

const result = await validateBasicSyntax(basicCode);

if (result.valid) {
  console.log('BASIC code is valid');
} else {
  console.log('Errors:', result.errors);
}
```

## File Formats

### TAP Format

The TAP format represents a ZX Spectrum tape file. It consists of:

1. **Header Block**
   - 2-byte length prefix
   - 1-byte type (0x00 for header)
   - 17-byte header data
   - 1-byte checksum

2. **Data Block**
   - 2-byte length prefix
   - 1-byte type (0xFF for data)
   - Program data
   - 1-byte checksum

TAP files are compatible with most ZX Spectrum emulators including:
- Fuse
- Spectaculator
- AmiCycle
- SEL (Spectrum Emulator Live)

### RAW Format

Raw binary format contains only the tokenized BASIC program data without any headers or checksums. This format is useful for:
- Direct memory loading
- Snapshot file creation
- Custom ROM loaders

### SNA Format

SNA format is a 48K snapshot of the ZX Spectrum memory. It includes:
- CPU register state
- Memory contents (49,152 bytes of RAM)
- Interrupt state

## TAP File Structure Details

### Header Block Structure

```
Offset  Bytes   Description
------  -----   -----------
0       2       Block length (19 bytes)
2       1       Type flag (0x00)
3       1       File type (0x00 = BASIC program)
4       10      Program name (null-padded)
14      2       Program length (little-endian)
16      2       Autostart line number (0x8000 = no autostart)
18      2       Variables area address (little-endian)
20      1       Checksum (XOR of bytes 2-19)
```

### Data Block Structure

```
Offset  Bytes   Description
------  -----   -----------
0       2       Block length (program data length + 2)
2       1       Type flag (0xFF)
3       N       Program data
3+N     1       Checksum (XOR of all data including type)
```

## Memory Layout

ZX Spectrum 48K Memory Map:
```
0x0000 - 0x3FFF (16KB)  - ROM
0x4000 - 0x57FF (6KB)   - Screen RAM
0x5800 - 0x5AFF (768B)  - Color attributes
0x5B00 - 0x7FFF (10.5KB)- System variables and stack
0x8000 - 0xFFFF (32KB)  - BASIC program and data
```

Default program start address: 0x8000 (32768)

## Configuration Options

### ConversionOptions

```typescript
interface ConversionOptions {
  output?: string;        // Output file path
  format?: 'tap' | 'sna' | 'bin';  // Output format
  autostart?: number;     // Autostart line number
  programName?: string;   // Program name for TAP
  optimize?: boolean;     // Optimize code
  verbose?: boolean;      // Verbose output
}
```

### CompileOptions

```typescript
interface CompileOptions {
  optimize?: boolean;     // Optimize generated code
  verbose?: boolean;      // Show compilation output
  debug?: boolean;        // Include debug symbols
  outputType?: 'binary' | 'hex' | 'asm';
}
```

## Error Handling

The converter provides detailed error messages:

```typescript
const result = await convertBasicToBinary('program.bas');

if (!result.success) {
  console.error(`Conversion failed: ${result.error}`);
  if (result.warnings) {
    result.warnings.forEach(w => console.warn(`  ${w}`));
  }
}
```

Common errors:
- File not found
- Syntax errors in BASIC code
- Compilation failures
- Output file write errors
- Invalid zxbasic compiler installation

## Examples

### Example 1: Simple Hello World

```typescript
const basicCode = `
10 PRINT "Hello, World!"
20 PAUSE 0
`;

const result = await convertBasicStringToBinary(basicCode, {
  output: 'hello.tap',
  format: 'tap',
  programName: 'Hello',
  verbose: true
});
```

### Example 2: Game Program with Autostart

```typescript
const basicCode = `
100 REM Snake Game
110 LET x = 16
120 LET y = 11
130 PRINT AT y,x; "O"
140 PAUSE 2
150 GOTO 130
`;

const result = await convertBasicStringToBinary(basicCode, {
  output: 'snake.tap',
  format: 'tap',
  programName: 'SNAKE',
  autostart: 100
});
```

### Example 3: Batch Conversion

```typescript
import { convertBasicBatch } from 'converter';

const files = ['prog1.bas', 'prog2.bas', 'prog3.bas'];

const results = await convertBasicBatch(files, {
  format: 'tap',
  verbose: true
});

results.forEach(r => {
  if (r.success) {
    console.log(`✓ ${r.outputPath}`);
  } else {
    console.log(`✗ Error: ${r.error}`);
  }
});
```

## Troubleshooting

### "zxbasic compiler not found"
- Install zxbasic compiler (see Prerequisites)
- Verify installation: `zxbasic --version`
- Check PATH variable includes zxbasic binary

### "Syntax error in BASIC code"
- Verify BASIC syntax
- Use `validateBasicSyntax()` for validation
- Check zxbasic documentation for supported syntax

### "TAP file has checksum errors"
- Verify file not corrupted
- Try recreating the TAP file
- Check for disk I/O errors

### "Binary larger than 32KB"
- Reduce program size
- Use optimization: `optimize: true`
- Consider splitting into multiple files

## Performance

- **Compilation**: ~500ms for typical BASIC programs
- **TAP Creation**: <50ms
- **Batch Processing**: Linear scaling with file count

## API Reference

### Interfaces

#### TapBlock
```typescript
interface TapBlock {
  data: Buffer;
  blockNumber: number;
}
```

#### TapHeader
```typescript
interface TapHeader {
  type: number;
  programName: string;
  programLength: number;
  autostart?: number;
  variablesArea?: number;
}
```

### Functions

#### TAP Format Functions
- `createHeaderBlock(name, length, autostart?)` - Create TAP header
- `createDataBlock(data)` - Create TAP data block
- `createTapFile(data, name, autostart?)` - Create complete TAP file
- `parseTapFile(data)` - Parse TAP file blocks
- `getTapMetadata(data)` - Extract TAP metadata
- `verifyTapChecksums(data)` - Verify TAP checksums

#### Compiler Functions
- `compileBASIC(code, options?)` - Compile BASIC code
- `compileBasicFile(file, output, options?)` - Compile BASIC file
- `validateBasicSyntax(code)` - Validate BASIC syntax
- `getCompilerCapabilities()` - Get compiler info
- `isZxbasicAvailable()` - Check compiler availability
- `getZxbasicVersion()` - Get compiler version

#### Conversion Functions
- `convertToTap(code, metadata)` - Convert to TAP format
- `convertToRaw(code)` - Convert to raw binary
- `convertToBinary(code)` - Alias for convertToRaw
- `convertBasicToBinary(file, options?)` - Convert BASIC file
- `convertBasicStringToBinary(code, options?)` - Convert code string
- `convertBasicBatch(files, options?)` - Batch convert files

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style
- All tests pass
- Documentation is updated

## References

- ZX Spectrum Architecture: https://en.wikipedia.org/wiki/ZX_Spectrum
- TAP Format Documentation: https://www.worldofspectrum.org/FormatSurvey/
- zxbasic Compiler: https://github.com/boriel/zxbasic
- ZX BASIC Documentation: https://zxbasic.readthedocs.io/
