# VS Code ZX BASIC Extension

This vs code extension is a complete environment to support development of programs for ZX Spectrum 2+ or ZX Spectrum 48K with ZX Interface 1. The coding takes place in vs code on a linux pc, then program is transfered on real hardware using RS232.

## Features

 - Complete ZX Spectrum basic support in vs code with a LSP server
 - Converter fro mtext file to ZX spectrum basic
 - RS232 transfer utility

## LSP Feature Roadmap

Legend: `[x]` = Done, `[ ]` = To Do, `[ ] (WIP)` = In Progress.

### Core Navigation
- [x] Document Symbols — Outline provider implemented in `lsp-server/src/server.ts`.
- [ ] Workspace Symbols — Not yet implemented.
- [x] Hover — Hover responses wired via `connection.onHover`.
- [x] Go To Definition — GOTO/GOSUB targets resolved through `connection.onDefinition`.
- [x] Go To Declaration — Variable/line declarations resolved via `connection.onDeclaration`.
- [x] Type Definition — Jump to variable declarations and referenced line numbers.
- [x] Implementation — Interface-style lookups jump to variable declarations or GOTO/GOSUB targets via `connection.onImplementation`.
- [x] Find References — Implemented with `connection.onReferences`.
- [ ] Document Highlights — Not yet implemented.
- [ ] Document Links — Not yet implemented.

### Code Intelligence
- [x] Completion — Keyword/variable completion plus snippets handled in `onCompletion`.
- [x] Completion Resolve — Additional detail provided in `onCompletionResolve`.
- [x] Signature Help — Command signatures exposed through `onSignatureHelp`.
- [x] Code Actions — Quick fixes/refactors registered via `onCodeAction`.
- [x] Code Lens — Inline line-number reference counters powered by Code Lens.
- [x] Diagnostics — Extensive validation produced in `validateTextDocument`.
- [x] Semantic Tokens — Rich highlighting via `onSemanticTokens`.

### Formatting & Refactoring
- [x] Formatting — Whole-document formatting available through `onDocumentFormatting`.
- [ ] Range Formatting — Not yet implemented.
- [ ] On Type Formatting — Not yet implemented.
- [x] Rename — Variable and line-number rename supported in `onRenameRequest`.
- [x] Prepare Rename — Validation handler ensures rename targets exist before edits.
- [ ] Selection Range — Not yet implemented.

### Advanced Analysis
- [x] Folding Ranges — Provided through `onFoldingRanges`.
- [x] Call Hierarchy — Incoming/outgoing GOSUB calls supported.
- [ ] Inlay Hints — Not yet implemented.
- [ ] Document Color — Not yet implemented.
- [ ] Moniker/Indexing — Not yet implemented.

### Workspace & Infrastructure
- [ ] Execute Command — Not yet implemented.
- [ ] Workspace File Watching — Not yet implemented.
- [ ] Workspace Folders — Not yet implemented.
- [ ] File Operations — Not yet implemented.
- [ ] Progress Reporting — Not yet implemented.

### UI & Communication
- [x] Window & Logging APIs — Initialization and settings changes notify via `connection.window.showInformationMessage`.
- [ ] Experimental/Custom Requests — Not yet implemented.

