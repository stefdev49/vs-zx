# PLAN

## Project Structure Overview
The project will be a monorepo using npm workspaces for easier management of interdependent TypeScript modules. Structure:
- `lsp-server/`: Standalone LSP server for ZX BASIC syntax
- `vscode-extension/`: VS Code extension that embeds the LSP client
- `converter/`: Module for converting BASIC text to ZX Spectrum binary format
- `rs232-transfer/`: Module handling RS232 communication
- `syntax-definitions/`: Grammar and keyword definitions for ZX BASIC
- `tests/`: Unit and integration tests

## Detailed Implementation Steps

1. **Setup Project Infrastructure**
   - Initialize npm workspace in root
   - Configure TypeScript, ESLint, Prettier, and Jest for all modules
   - Add dependencies: `@types/node`, `vscode-languageserver`, `vscode-languageclient`, `vscode`, `serialport`, etc.

2. **Define ZX BASIC Syntax Specifications**
   - Standard ZX Spectrum BASIC keywords (REM, LET, PRINT, etc.)
   - ZX Spectrum 128K extensions (SPECTRUM, PLAY, additional functions)
   - ZX Interface 1 extensions (SAVE *, LOAD *, stream commands)
   - Create lexer/tokenizer definitions for parsing
   - Define context-aware completions (commands, functions, variables)

3. **Implement LSP Server (lsp-server/)**
   - Use vscode-languageserver-node
   - Implement textDocument/didOpen, didChange, didSave handlers
   - Create parser to tokenize BASIC code and identify syntax errors
   - Provide diagnostics for syntax issues, missing line numbers, invalid keywords
   - Implement completion: suggest keywords, functions, variables based on context
   - Add hover information for commands and functions
   - Expose capabilities for syntax highlighting, folding, etc.

4. **Develop BASIC to Binary Converter (converter/)**
   - Port zmakebas Python logic to TypeScript
   - Implement tokenizer for BASIC keywords and expressions
   - Generate tokenized binary format matching ZX Spectrum memory layout
   - Support for line numbers, variables, data types
   - Output in TAP format or direct memory blocks for RS232 transfer
   - Validate program structure (no overlapping line numbers, proper structure)

5. **Create RS232 Transfer Module (rs232-transfer/)**
   - Use node-serialport for Linux RS232 communication
   - Implement handshake protocols for ZX Interface 1
   - Send binary data in blocks (mimicking tape format over serial)
   - Error correction and retry mechanisms
   - Support for different baud rates (standard ZX RS232 is 9600 baud)
   - Logging and status reporting

6. **Build VS Code Extension (vscode-extension/)**
   - Use vscode-extension-samples/lsp-sample as template
   - Register language 'zx-basic' for .bas files
   - Start LSP server when extension activates
   - Add command: "Transfer to ZX Spectrum" (ctrl+shift+t)
   - Menu options: File > Transfer
   - UI for selecting serial port and baud rate
   - Integration: on command, save file → convert to binary → transfer via RS232

7. **Integration and Testing**
   - Ensure LSP server communicates with VS Code effectively
   - Test syntax highlighting and error reporting on sample BASIC programs
   - Mock RS232 testing with loopback or emulator
   - End-to-end test: write simple BASIC program, transfer to real/emulated ZX Spectrum
   - Add configuration options (serial port setup, ZX model selection)

8. **Documentation and Packaging**
   - README with setup instructions (hardware wiring for RS232)
   - VS Code extension manifest (package.json)
   - Publish extension to VS Code Marketplace
   - Optional: create emulator integration for testing without hardware

## Assumptions and Requirements
- Target baud rate: 9600 (standard for ZX Interface 1 RS232)
- RS232 cable: USB-to-RS232 DB9 adapter connected to ZX Interface 1 port
- ZX Spectrum +2 model supported, with Interface 1 attached
- No emulator integration initially (focus on real hardware)
- Line-numbered BASIC programs as primary format

## Risk Considerations
- RS232 timing: ZX Spectrum expects specific timing; may need empirical adjustment
- Binary format accuracy: Must match exact ZX memory layout to load properly
- Hardware compatibility: Test with actual Interface 1 and Spectrum +2

Is this plan aligned with your vision? Would you like me to elaborate on any specific component or make adjustments before we switch to ACT MODE?
