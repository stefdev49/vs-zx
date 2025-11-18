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
