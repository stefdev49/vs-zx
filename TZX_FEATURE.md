# Save as TZX Feature

## Overview

The "Save as TZX" feature allows you to convert ZX Spectrum BASIC programs to TZX tape format directly from VS Code. TZX is an advanced tape image format that extends the simpler TAP format with additional metadata and is widely supported by ZX Spectrum emulators and tape preservation tools.

## Features

- **Direct Conversion**: Convert BASIC (.bas) files to TZX format with a single command
- **Customizable Metadata**: Set program name, autostart line, and description
- **Bidirectional Compatibility**: TZX files can be reverted back to BASIC using standard tools like `listbasic`
- **User-Friendly Interface**: Interactive prompts guide you through the conversion process

## Usage

### From VS Code Command Palette

1. Open a ZX BASIC file (.bas extension)
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the Command Palette
3. Type "Save as TZX" and select the command
4. Follow the prompts:
   - Enter program name (max 10 characters)
   - Enter autostart line number (optional)
   - Enter description (optional)
   - Choose save location

### From Context Menu

1. Right-click in a ZX BASIC file
2. Select "ZX BASIC: Save as TZX" from the context menu
3. Follow the prompts as above

## Conversion Details

### TZX Format

TZX files created by this extension use the following structure:

- **Header**: Standard TZX signature "ZXTape!" + version (1.20)
- **Text Description Block** (if provided): Optional metadata about the program
- **Standard Speed Data Blocks**: Program header and data in standard ZX Spectrum tape format
- **Pause**: 1000ms pause between blocks (configurable in future versions)

### Compatibility

The generated TZX files are compatible with:

- ZX Spectrum emulators (Fuse, ZEsarUX, SpecEmu, etc.)
- Tape preservation tools
- Hardware tape interfaces
- The `listbasic` utility for conversion back to BASIC

## Testing

### Automated Tests

The feature has been tested with the following workflow:

1. **Conversion Test**: All sample BASIC files are converted to TZX format
2. **Validation Test**: TZX files are verified to have correct structure and metadata
3. **Reversion Test**: TZX files are converted back to BASIC using `listbasic`
4. **Comparison Test**: Reverted BASIC files are compared with originals

### Test Results

Successfully converted and verified **10 sample BASIC programs**:

- example_date_to_day.bas
- example_hangman.bas
- example_i_ching.bas
- example_pangolins.bas
- example_union_flag.bas
- example_yards_feet_inches.bas
- pangolin.bas
- renumber.bas
- statement-parser-demo.bas
- undeclared-array-demo.bas

All files successfully converted to TZX and back to BASIC with preserved line numbers and program structure.

### Running Tests

To test the conversion workflow manually:

```bash
# Convert all samples to TZX
node test-tzx-conversion.js

# Revert TZX files back to BASIC
./test-tzx-revert.sh

# Run complete workflow test
./test-complete-workflow.sh
```

## Technical Details

### Converter Module

The TZX conversion is implemented in the `converter` module:

- **tzx-format.ts**: Core TZX format implementation
  - `convertTapToTzx()`: Convert TAP to TZX format
  - `convertTzxToTap()`: Convert TZX to TAP format
  - `createTzxWithDescription()`: Create TZX with text description
  - `parseTzxFile()`: Parse TZX blocks
  - `getTzxMetadata()`: Extract TZX metadata

### VS Code Extension

The feature is implemented as a command in the VS Code extension:

- **saveAsTzx.ts**: Command implementation
  - User interface for metadata input
  - File save dialog
  - Error handling and user feedback

## Limitations

- Only BASIC files with proper line numbers are supported
- Program names are limited to 10 characters (ZX Spectrum constraint)
- Autostart line must be a valid line number (0-9999)
- Description text is limited to 255 characters (TZX format constraint)

## Future Enhancements

Potential improvements for future versions:

- Batch conversion of multiple files
- Support for custom pause durations between blocks
- Additional TZX block types (turbo speed, direct recording, etc.)
- Integration with emulators for direct loading
- Preview of TZX metadata before saving

## References

- [TZX Format Specification](https://worldofspectrum.net/TZXformat.html)
- [TAP Format Documentation](https://sinclair.wiki.zxnet.co.uk/wiki/TAP_format)
- [ZX Spectrum File Formats](https://faqwiki.zxnet.co.uk/wiki/ZX_Spectrum_File_Formats)

## License

This feature is part of the ZX BASIC Development Environment extension and is licensed under the MIT License.
