# ZX Spectrum BASIC Development Environment - Development Guide

This README provides instructions for building and developing the ZX Spectrum BASIC development environment.

## Prerequisites

- Node.js 14 or later
- npm (Node Package Manager)
- Linux host system
- VS Code for development
- USB-RS232 DB9 cable
- ZX Spectrum +2 with ZX Interface 1 connected

## Project Structure

This is a monorepo with the following packages:

- `lsp-server/`: Language Server Protocol server for ZX BASIC
- `converter/`: Converts BASIC text to ZX Spectrum binary format
- `rs232-transfer/`: Handles RS232 communication for program transfer
- `syntax-definitions/`: Shared keyword definitions for ZX BASIC
- `vscode-extension/`: VS Code extension packaging the client
- `tests/`: Integration tests

## Building the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build all packages:
   ```bash
   npm run build
   ```

   This compiles all TypeScript modules.

3. (Optional) Run tests:
   ```bash
   npm test
   ```

4. Package the VS Code extension:
   ```bash
   npm run package
   ```

   This builds all components and creates a `.vsix` file (e.g., zx-basic-vscode-extension-1.0.0.vsix) in the vscode-extension directory for installation.

   **Notes:**
   - The extension excludes node_modules from the package (--no-dependencies) since dependencies like `serialport` require platform-specific installation
   - When installing the `.vsix` file, VS Code will automatically install the required dependencies
   - For manual testing, `code --install-extension zx-basic-vscode-extension-1.0.0.vsix`

   **Alternative**: Manual packaging (must be run from vscode-extension directory):
   ```bash
   cd vscode-extension
   npx vsce package --no-dependencies
   ```

## Development Workflow

### Option A: Manual Setup
1. Start the LSP server in debug mode:
   ```bash
   cd lsp-server
   npm run start
   ```

2. Open the project in VS Code.

3. Install the extension locally:
   - Build and package: `npm run package`
   - Install: `code --install-extension zx-basic-vscode-extension-1.0.0.vsix`

4. Edit BASIC programs with .bas extension to trigger language server.

### Option B: Launch Configuration (Recommended)
VS Code launch configurations are provided for easy extension development:

1. Open the project in VS Code
2. Go to Run & Debug view (Ctrl+Shift+D)
3. Select one of the launch configurations:
   - **"Launch Extension"**: Automatically compiles and launches VS Code with the extension loaded
   - **"Launch Extension (Compiled)"**: Launches VS Code with pre-compiled extension
4. Press F5 or click Run

This starts a new VS Code instance with your ZX BASIC extension active, including:
- Syntax highlighting for `.bas` and `.zxbas` files
- Full token mapping support (including ZX Spectrum 128 keywords)
- Command palette integration
- Debug console output

**Note**: The extension will be reloaded automatically when you make changes to the source code.

## Hardware Setup

1. Connect ZX Spectrum +2 with ZX Interface 1.
2. Connect USB-RS232 DB9 cable between Linux PC and Interface 1.
3. The serial port will appear as `/dev/ttyUSB0` (or similar).

## Using the Environment

1. Create a new file with `.bas` extension in VS Code.
2. Write ZX BASIC programs (line-numbered, standard ZX BASIC syntax).
3. Use Command Palette: "ZX BASIC: Transfer to ZX Spectrum" to upload.
4. On ZX Spectrum, issue `LOAD ""` command before transfer.

## Configuration

In VS Code settings (JSON):
```json
{
  "zx-basic.serialPort": "/dev/ttyUSB0",
  "zx-basic.baudRate": 9600
}
```

## Supported Features

- **Complete Token Mapping**: Full support for all 58 ZX Spectrum BASIC tokens (A5-FF), including Spectrum 128K keywords like SPECTRUM, PLAY, and all operators (AND, OR, <=, etc.)
- Syntax highlighting for BASIC keywords in .bas and .zxbas files
- Code completion for commands, functions, and variables
- Real-time syntax diagnostics and error reporting
- RS232 transfer to ZX Spectrum via COMMAND palette
- Full support for ZX Spectrum 128K extensions
- Compatibility with ZX Interface 1 extensions

**Recent Enhancements:**
- All ZX BASIC keywords now properly tokenized for accurate conversion to Spectrum binary format
- Comprehensive token map covering functions, operators, and 128K-specific commands
- Improved text-to-binary conversion with complete Spectrum 128 compatibility

## Dependencies

- `vscode-languageserver`: LSP protocol implementation
- `vscode-languageclient`: VS Code LSP client
- `serialport`: Node.js serial communication
- Various dev dependencies for TypeScript, testing, etc.

## Troubleshooting

- Ensure serial port permissions: add user to dialout group
- Verify cable wiring: standard RS232 DB9 pins
- For baud rate issues, adjust Interface 1 settings if possible
- Check ZX Spectrum LOAD command timing

## Contributing

- Run tests before commits
- Maintain TypeScript strict mode
- Follow monorepo structure for new modules
- Test with real hardware when possible

## Architecture

The extension consists of:
- LSP server (Node.js) for syntax services
- VS Code client for integration and UI
- Binary converter for ZX format generation
- RS232 module for hardware communication

All components are TypeScript with cross-package dependencies managed by workspaces.

## Implementation Progress

### Completed Components ✅

**1. Syntax Definitions** (`syntax-definitions/`)
- Complete ZX BASIC keyword definitions
- Support for standard and extended keywords
- Type definitions for IDE support

**2. LSP Server** (`lsp-server/`)
- Full Language Server Protocol implementation
- BASIC syntax parser with diagnostics
- Code completion and hover support
- Jest test suite with coverage
- Real-time error reporting

**3. Converter Module** (`converter/`) - RECENTLY COMPLETED
- **TAP File Format Handler** (`tap-format.ts`)
  - TAP header and data block creation with checksums
  - TAP file parsing and metadata extraction
  - Checksum verification for TAP files
  - Support for program name, autostart line, variable area
  
- **BASIC Compiler Integration** (`zxbasic-compiler.ts`)
  - TypeScript wrapper around zxbasic compiler
  - Syntax validation before compilation
  - Compilation with optimization options
  - Version checking and compiler availability detection
  
- **Conversion Functions** (`basic-converter.ts`)
  - Convert BASIC code to TAP format
  - Convert BASIC code to raw binary
  - Support for RAW (binary only) and TAP (tape image) formats
  - Batch file processing
  - Comprehensive error handling
  
- **Command-Line Interface** (`cli.ts`)
  - Full CLI tool for converting BASIC files
  - Support for multiple output formats
  - Program metadata options (name, autostart, variables)
  - Quiet mode for scripting
  
- **Test Suite** (`converter.spec.ts`)
  - 7 comprehensive tests covering all TAP format functions
  - TAP creation and parsing tests
  - Metadata extraction tests
  - Checksum verification tests
  - Conversion function tests
  - **All tests passing ✅**

**Documentation**: Comprehensive `CONVERTER.md` with:
- Complete API reference
- Usage examples (CLI and programmatic)
- TAP file format specification
- Error handling guide
- Performance notes

**Build Status**: 
- TypeScript compilation: ✅ Successful
- Jest tests: ✅ 7/7 passing
- Package structure: ✅ Ready for use

### In Progress 🔄

**VS Code Extension** (`vscode-extension/`)
- LSP client integration in progress
- Command palette commands to be added
- Serial port configuration UI to be developed

### Not Yet Started ❌

**RS232 Transfer Module** (`rs232-transfer/`)
- Serial port communication layer
- ZX Interface 1 protocol implementation
- Error correction and retry logic

## Recent Work Summary (Latest Session)

### TAP Format Implementation
- Created complete TAP file format handler with proper ZX Spectrum compatibility
- Implemented checksums (XOR-based) for data integrity
- Support for program metadata (name, autostart line, variables area)
- Full parsing capabilities for existing TAP files

### Compiler Integration
- Integrated zxbasic compiler for BASIC code compilation
- Added syntax validation before compilation
- Compiler availability detection
- Optimization and debug options

### Conversion Pipeline
- Complete conversion workflow from BASIC source to binary formats
- Support for multiple output formats (TAP, RAW, binary)
- Metadata handling for TAP files
- Batch processing for multiple files

### CLI Tool
- Full command-line interface for conversions
- Options for format selection and metadata configuration
- Error reporting and logging
- Quiet mode for automation

### Testing
- Comprehensive Jest test suite
- TAP format tests with checksum verification
- Conversion function tests
- All tests passing successfully

## Usage Examples

### Converting a BASIC File via CLI
```bash
# Convert to TAP format (default)
zx-converter program.bas program.tap

# Convert to RAW binary format
zx-converter program.bas --format raw -o program.bin

# With program metadata
zx-converter program.bas -n "MyProgram" -s 10 -o myprogram.tap
```

### Using the Converter API
```typescript
import { convertToTap, convertToRaw, createTapFile } from 'converter';

// Convert BASIC code to TAP
const tapBuffer = await convertToTap(basicCode, {
  name: 'HelloWorld',
  autostart: 10
});

// Convert to raw binary
const binaryBuffer = await convertToRaw(basicCode);

// Create TAP file directly
const tapFile = createTapFile(binaryData, 'MyProgram', 10);
```

See `converter/CONVERTER.md` for complete API documentation and examples.


