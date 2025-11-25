# LSP Server Features

This document lists all the features that a Language Server Protocol (LSP) server can provide.

## Core Navigation Features

### ✓ Document Symbols
Provide `textDocument/documentSymbol` to return hierarchical outline (symbols with ranges, kinds, and containerName). Support large files and incremental responses.

### Workspace Symbols
Implement `workspace/symbol` for fuzzy workspace-wide symbol search, filtering by kind and workspace scopes.

### Hover
Support `textDocument/hover` to show type/signature/docs on hover, with Markdown/plaintext content and range.

### Go To Definition
Implement `textDocument/definition` to jump to symbol definitions (including multiple locations).

### Go To Declaration
Support `textDocument/declaration` for jumping to declarations where available.

### Type Definition
Implement `textDocument/typeDefinition` to go to the type of a symbol.

### Implementation
Support `textDocument/implementation` to find concrete implementations of interfaces/abstracts.

### Find References
Provide `textDocument/references` to list all references with context and filtered by includeDeclaration.

### Document Highlights
Support `textDocument/documentHighlight` to highlight occurrences in the current document.

### Document Links
Implement `textDocument/documentLink` to discover and resolve links (URIs) inside documents.

## Code Intelligence Features

### Completion
Implement `textDocument/completion` with trigger characters, commitCharacters, and item kinds.

### Completion Resolve
Support `completionItem/resolve` to lazily fetch additional details for completion items.

### Signature Help
Provide `textDocument/signatureHelp` showing active parameter, signatures, and parameter docs.

### Inlay Hints
Implement `textDocument/inlayHint` to show inline parameter names, type hints, and other lightweight annotations.

### Code Actions
Implement `textDocument/codeAction` to offer quick fixes and refactorings, including `resolve` support.

### Code Lens
Provide `textDocument/codeLens` and `codeLens/resolve` to show actionable inline commands (e.g., run tests).

## Formatting Features

### Formatting
Provide `textDocument/formatting` (whole-document) with options and prefer using an external formatter when available.

### Range Formatting
Support `textDocument/rangeFormatting` for formatting a selected range.

### On Type Formatting
Implement `textDocument/onTypeFormatting` to format while typing after trigger characters.

## Refactoring Features

### Rename
Support `textDocument/rename` (and prepareRename) to produce `WorkspaceEdit` across files, preserving undo.

### Prepare Rename
Support `textDocument/prepareRename` to validate rename ranges and return placeholder text before rename.

### Selection Range
Implement `textDocument/selectionRange` to expand/shrink selections semantically (e.g., expression → statement → block).

## Diagnostics & Analysis

### Diagnostics
Publish `textDocument/publishDiagnostics` with ranges, severity, source, relatedInformation, and tags (unnecessary/deprecated).

### Semantic Tokens
Implement `textDocument/semanticTokens` (full and range) to provide rich token types and modifiers for semantic highlighting.

### Document Color
Support `textDocument/documentColor` and `textDocument/colorPresentation` for color literals and color picker integration.

## Advanced Features

### Folding Ranges
Support `textDocument/foldingRange` to provide foldable ranges with kind annotations.

### Call Hierarchy
Provide call hierarchy `callHierarchy/incomingCalls` and `callHierarchy/outgoingCalls` features to traverse callers/callees.

### Moniker/Indexing
Implement `textDocument/moniker` and global indexing capabilities for cross-repo symbol linking and package-level references.

## Workspace Features

### Execute Command
Support `workspace/executeCommand` to run commands from code actions or code lenses on the server.

### Workspace File Watching
Handle `workspace/didChangeWatchedFiles` to react to file system changes (external edits, new files).

### Workspace Folders
Support workspace folder notifications and listing via `workspace/didChangeWorkspaceFolders` and server-side workspace awareness.

### File Operations
Implement file create/rename/delete handling and integrate edits with `workspace/applyEdit` and file operation notifications.

## UI & Communication Features

### Progress Reporting
Support `window/workDoneProgress` and partialResult for long-running tasks and incremental responses.

### Window & Logging APIs
Support `window/showMessage`, `window/showMessageRequest`, `window/logMessage`, and telemetry/logging hooks.

### Experimental/Custom Requests
Provide custom/experimental methods and feature flags for editor-specific integrations and extensions.

---

**Legend:**
- ✓ = Implemented
- (unmarked) = Not yet implemented

**Note:** This list represents the full spectrum of LSP capabilities as defined in the [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/specifications/specification-current/).
