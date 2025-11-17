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

4. Package the VS Code extension (must be run from vscode-extension directory):
   ```bash
   cd vscode-extension
   npx vsce package
   ```

   This creates a `.vsix` file (e.g., zx-basic-vscode-extension-1.0.0.vsix) for installation.

## Development Workflow

1. Start the LSP server in debug mode:
   ```bash
   cd lsp-server
   npm run start
   ```

2. Open the project in VS Code.

3. Install the extension locally:
   - After packaging, run `code --install-extension zx-basic-vscode-extension-1.0.0.vsix`

4. Edit BASIC programs with .bas extension to trigger language server.

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

- Syntax highlighting for BASIC keywords
- Completion of commands, functions, variables
- Diagnostics for invalid syntax
- RS232 transfer to ZX Spectrum
- Support for ZX Spectrum 128K extensions
- Support for ZX Interface 1 extensions

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
