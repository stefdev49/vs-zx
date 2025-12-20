# 📋 MDR Implementation Plan for ZX BASIC Extension

## 🎯 Objective

Add "Load from MDR/Save to MDR" functionality to the VS Code ZX BASIC extension, allowing users to work with Sinclair Microdrive cartridge images (.mdr format) directly within the development environment.

## 📚 Background Research

### Current Extension Architecture

The ZX BASIC extension currently supports:

- **TAP format**: Standard ZX Spectrum tape files
- **TZX format**: Advanced tape format with metadata
- **Audio playback**: Direct audio transfer to ZX Spectrum
- **Recording**: Audio capture from ZX Spectrum

### MDR Format Analysis (from mdv2img)

- **Structure**: 254 sectors × 543 bytes + 1 write protection byte = 137,923 bytes
- **Sector format**: Header (15B) + Record Descriptor (15B) + Data (513B)
- **Checksums**: Three-level error detection (HDCHK, DESCHK, DCHK)
- **Compatibility**: WinZ80 emulator standard format

### Existing Tools

- **mdv2img**: Microdrive image recovery tool by Volker Bartheld
- **Test data**: `test_00.mdr` (perfect) and `Games_01.mdr` (problematic)
- **Documentation**: Comprehensive technical specs in `mdv2img.h`

## 🔧 Technical Implementation Plan

### 1. Architecture Integration Points

**Existing Structure Analysis:**

```
vscode-extension/
├── src/
│   ├── commands/          # Command handlers
│   │   ├── transfer.ts    # File transfer
│   │   ├── saveAsTzx.ts    # TZX export
│   │   ├── playToZx.ts     # Audio playback
│   │   └── recordFromZx.ts # Audio recording
│   └── extension.ts       # Main extension entry
└── converter/
    ├── src/               # Format converters
    │   ├── tap-format.ts  # TAP format
    │   ├── tzx-format.ts  # TZX format
    │   ├── index.ts       # Exports
    │   └── ...            # Core conversion
    └── package.json       # Converter package
```

**New Files to Add:**

```
vscode-extension/
├── src/
│   ├── commands/
│   │   ├── loadFromMdr.ts       # ✨ NEW: MDR load command
│   │   └── saveToMdr.ts         # ✨ NEW: MDR save command
└── converter/
    └── src/
        ├── mdr-format.ts        # ✨ NEW: MDR format support
        └── mdr-format.spec.ts   # ✨ NEW: Unit tests
```

### 2. Detailed Implementation Steps

#### Phase 1: MDR Format Module (converter/)

**File: `converter/src/mdr-format.ts`**

```typescript
// MDR Format Constants - Based on mdv2img analysis
export const MDR_SECTOR_SIZE = 543;
export const MDR_TOTAL_SECTORS = 254;
export const MDR_FILE_SIZE = 137923; // 254 * 543 + 1 (write protection byte)

export interface MdrSector {
  header: {
    flag: number; // Always 1
    sectorNumber: number; // 254 down to 1
    name: string; // Cartridge name (10 chars, blank-padded)
    checksum: number; // Header checksum
  };
  record: {
    flags: number; // Bit 0=0, Bit 1=EOF, Bit 2=PRINT file
    sequence: number; // Data block sequence
    length: number; // Data length (≤512 bytes)
    filename: string; // Filename (10 chars, blank-padded)
    checksum: number; // Record descriptor checksum
  };
  data: Uint8Array; // 512 bytes of data
  dataChecksum: number; // Data block checksum
}

export interface MdrFile {
  sectors: MdrSector[];
  writeProtected: boolean;
  cartridgeName: string;
  version: string;
}

/**
 * Calculate Sinclair Microdrive checksum (from mdv2img.h)
 */
export function calculateMdrChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) % 255;
  }
  return sum;
}

/**
 * Parse MDR file and extract BASIC programs
 */
export function parseMdrFile(mdrBuffer: Buffer): {
  programs: { name: string; source: string; sector: number }[];
  metadata: MdrFile;
  errors: {
    sector: number;
    type: "HDCHK" | "DESCHK" | "DCHK";
    message: string;
  }[];
} {
  // Implementation based on mdv2img.h specifications
}

/**
 * Create MDR file from BASIC source
 */
export function createMdrFile(
  basicSource: string,
  programName: string,
  cartridgeName: string = "ZXBASIC",
): Buffer {
  // Implementation using MDR format specification
}
```

**File: `converter/src/index.ts` (Update)**

```typescript
// Add to existing exports
export * from "./mdr-format";
```

#### Phase 2: VS Code Commands

**File: `vscode-extension/src/commands/loadFromMdr.ts`**

```typescript
import { commands, window, workspace, Uri } from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as converter from "converter";

export function register() {
  return commands.registerCommand("zx-basic.loadFromMdr", async () => {
    try {
      // Show file picker for .mdr files
      const fileUris = await window.showOpenDialog({
        filters: { "Microdrive Images": ["mdr"] },
        canSelectMany: false,
      });

      if (!fileUris || fileUris.length === 0) return;

      const fileUri = fileUris[0];
      const fileContent = fs.readFileSync(fileUri.fsPath);

      // Parse MDR file
      const result = converter.parseMdrFile(fileContent);

      // Show summary
      window.showInformationMessage(
        `Found ${result.programs.length} programs in ${result.metadata.cartridgeName}`,
      );

      // Create editor for each program
      for (const program of result.programs) {
        const doc = await workspace.openTextDocument({
          language: "zx-basic",
          content: program.source,
        });
        await window.showTextDocument(doc);
      }

      // Show errors if any
      if (result.errors.length > 0) {
        const outputChannel = window.createOutputChannel("ZX Spectrum MDR");
        outputChannel.appendLine("MDR Load Errors:");
        result.errors.forEach((error) => {
          outputChannel.appendLine(
            `Sector ${error.sector}: ${error.type} - ${error.message}`,
          );
        });
        outputChannel.show(true);
      }
    } catch (error) {
      window.showErrorMessage(
        `Failed to load MDR: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}
```

**File: `vscode-extension/src/commands/saveToMdr.ts`**

```typescript
import { commands, window, workspace, Uri } from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as converter from "converter";

export function register() {
  return commands.registerCommand("zx-basic.saveToMdr", async () => {
    try {
      // Get active editor
      const editor = window.activeTextEditor;
      if (!editor || editor.document.languageId !== "zx-basic") {
        window.showErrorMessage("Active editor must be a ZX BASIC file");
        return;
      }

      // Get cartridge name
      const cartridgeName = await window.showInputBox({
        prompt: "Enter cartridge name (max 10 characters)",
        value: "ZXBASIC",
        validateInput: (value) =>
          value.length > 10 ? "Max 10 characters" : null,
      });

      if (!cartridgeName) return;

      // Get save location
      const saveUri = await window.showSaveDialog({
        filters: { "Microdrive Images": ["mdr"] },
        defaultUri: Uri.file(
          path.join(
            workspace.workspaceFolders?.[0]?.uri.fsPath || "",
            "cartridge.mdr",
          ),
        ),
      });

      if (!saveUri) return;

      // Convert to MDR
      const mdrBuffer = converter.createMdrFile(
        editor.document.getText(),
        path.basename(editor.document.fileName, ".bas"),
        cartridgeName,
      );

      // Save file
      fs.writeFileSync(saveUri.fsPath, mdrBuffer);

      window.showInformationMessage(
        `Successfully saved to MDR: ${path.basename(saveUri.fsPath)}`,
      );
    } catch (error) {
      window.showErrorMessage(
        `Failed to save MDR: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}
```

#### Phase 3: Extension Integration

**File: `vscode-extension/src/extension.ts` (Updates)**

```typescript
// Add imports
import * as loadFromMdrCmd from "./commands/loadFromMdr";
import * as saveToMdrCmd from "./commands/saveToMdr";

// In activate() function:
context.subscriptions.push(loadFromMdrCmd.register());
context.subscriptions.push(saveToMdrCmd.register());
```

**File: `vscode-extension/package.json` (Updates)**

```json
{
  "contributes": {
    "commands": [
      {
        "command": "zx-basic.loadFromMdr",
        "title": "Load from MDR",
        "category": "ZX BASIC"
      },
      {
        "command": "zx-basic.saveToMdr",
        "title": "Save to MDR",
        "category": "ZX BASIC"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "zx-basic.loadFromMdr",
          "when": "editorLangId == zx-basic"
        },
        {
          "command": "zx-basic.saveToMdr",
          "when": "editorLangId == zx-basic"
        }
      ],
      "editor/context": [
        {
          "command": "zx-basic.loadFromMdr",
          "when": "editorLangId == zx-basic",
          "group": "1_modification"
        },
        {
          "command": "zx-basic.saveToMdr",
          "when": "editorLangId == zx-basic",
          "group": "1_modification"
        }
      ],
      "editor/title": [
        {
          "command": "zx-basic.loadFromMdr",
          "when": "editorLangId == zx-basic",
          "group": "1_modification"
        },
        {
          "command": "zx-basic.saveToMdr",
          "when": "editorLangId == zx-basic",
          "group": "1_modification"
        }
      ]
    }
  },
  "activationEvents": [
    "onCommand:zx-basic.loadFromMdr",
    "onCommand:zx-basic.saveToMdr"
  ]
}
```

### 3. Error Handling & User Experience

**Error Recovery Strategies (from mdv2img)**

```typescript
export enum MdrErrorPolicy {
  FIX_HEADER = 0x0001, // Recreate broken headers
  FIX_RECORD = 0x0002, // Recreate broken records
  FIX_DATA = 0x0004, // Recreate broken data blocks
  ACCEPT_ERRORS = 0x0008, // Tolerate checksum errors
  OVERWRITE_SECTORS = 0x0010, // Overwrite existing sectors
}

const DEFAULT_POLICY = MdrErrorPolicy.FIX_DATA | MdrErrorPolicy.ACCEPT_ERRORS;
```

**Configuration Options**

```json
{
  "zxBasic.mdr": {
    "errorPolicy": "fix-data",
    "defaultCartridgeName": "ZXBASIC",
    "showSectorMapOnError": true,
    "maxRetries": 3
  }
}
```

### 4. Testing Strategy

**Unit Tests (`converter/src/mdr-format.spec.ts`)**

```typescript
describe("MDR Format", () => {
  it("should calculate checksums correctly", () => {
    const testData = new Uint8Array([0x01, 0x02, 0x03]);
    expect(calculateMdrChecksum(testData)).toBe((1 + 2 + 3) % 255);
  });

  it("should parse valid MDR files", () => {
    const mdrBuffer = fs.readFileSync("test_00.mdr");
    const result = parseMdrFile(mdrBuffer);
    expect(result.programs.length).toBeGreaterThan(0);
    expect(result.metadata.cartridgeName).toBeDefined();
  });

  it("should handle corrupted sectors", () => {
    // Test with Games_01.mdr (known to have errors)
  });
});
```

**Integration Tests**

- Load MDR → Extract BASIC → Edit → Save MDR roundtrip
- Error handling with corrupted test files
- Multiple program extraction
- Configuration options validation

## 📋 Implementation Roadmap

### Phase 1: Foundation (2-3 days)

- [ ] Create MDR format specification and interfaces
- [ ] Implement checksum calculation and validation
- [ ] Basic MDR parsing and creation
- [ ] Unit tests for core functionality

### Phase 2: Integration (2-3 days)

- [ ] Create VS Code commands with file pickers
- [ ] Implement menu integration (3 locations)
- [ ] Add error handling and user feedback
- [ ] Integration tests with test data

### Phase 3: Enhancement (1-2 days)

- [ ] Add error recovery options (from mdv2img)
- [ ] Implement sector visualization for diagnostics
- [ ] Add configuration options
- [ ] Comprehensive documentation

### Phase 4: Testing & Polish (1 day)

- [ ] Test with real MDR files (test_00.mdr, Games_01.mdr)
- [ ] Performance optimization
- [ ] Final documentation and examples
- [ ] User guide updates

## 🎯 Success Criteria

### Minimum Viable Feature

- ✅ Load MDR files and extract BASIC programs
- ✅ Save BASIC programs to MDR format
- ✅ Basic error handling with user feedback
- ✅ VS Code command integration (3 menu locations)
- ✅ Unit and integration tests

### Enhanced Feature

- ✅ Error recovery and repair options
- ✅ Sector visualization and diagnostics
- ✅ Configuration options for advanced users
- ✅ Comprehensive documentation with examples
- ✅ Integration with existing extension features

## 🚀 Benefits of Integrated Approach

### Code Reuse

- ✅ Leverage existing file handling infrastructure
- ✅ Reuse BASIC parsing and tokenization
- ✅ Consistent error handling patterns
- ✅ Shared testing framework

### User Experience

- ✅ Consistent with existing TAP/TZX commands
- ✅ Familiar menu locations and workflows
- ✅ Unified configuration system
- ✅ Integrated documentation

### Maintenance

- ✅ Single repository management
- ✅ Unified versioning and releases
- ✅ Shared dependency management
- ✅ Simplified CI/CD pipeline

## 💡 Key Technical Decisions

### 1. Error Handling Strategy

**Decision**: Lenient validation with configurable policies

- Show warnings but proceed when possible
- Offer repair options for corrupted sectors
- Configurable through settings

### 2. Multiple Program Handling

**Decision**: Extract all programs to separate tabs

- Automatic extraction with summary notification
- Clear program naming based on MDR metadata
- Option to show sector map for diagnostics

### 3. File Naming Convention

**Decision**: Use cartridge name with timestamp suffix

- Format: `CARTRIDG-YYYY-MM-DD-HH-MM-SS.mdr`
- Configurable default cartridge name
- Preserve original names when possible

### 4. Checksum Validation

**Decision**: Validate but provide recovery options

- Warn on checksum mismatches
- Offer automatic repair (based on mdv2img)
- Allow manual override for known-good files

## 📚 References

### Existing Code Patterns

- `converter/src/tap-format.ts` - TAP format structure
- `converter/src/tzx-format.ts` - TZX format structure
- `vscode-extension/src/commands/saveAsTzx.ts` - Save command pattern
- `vscode-extension/src/commands/playToZx.ts` - Audio command pattern

### Technical Documentation

- `extras/mdv2img/mdv2img.h` - MDR sector format
- `extras/mdv2img/helper.h` - Error recovery algorithms
- `extras/mdv2img/Mdv2Img.txt` - User documentation
- `extras/mdv2img/Test_Data/` - Test files

## 🎯 Next Steps

1. **Start Implementation**: Begin with Phase 1 (MDR format module)
2. **Incremental Testing**: Test each component as it's built
3. **Integration**: Connect components in Phase 2
4. **Enhancement**: Add advanced features in Phase 3
5. **Finalization**: Testing and documentation in Phase 4

This plan provides a comprehensive approach to adding MDR support while maintaining architectural consistency and leveraging existing infrastructure.
