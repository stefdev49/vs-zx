#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { convertToTap, convertToRaw, convertToBinary, ProgramMetadata, FileFormat } from './index';

const program = new Command();

program
  .name('zx-converter')
  .description('ZX Spectrum BASIC to TAP converter (Native bas2tap implementation)')
  .version('1.0.0')
  .argument('<input>', 'Input BASIC file')
  .argument('[output]', 'Output file (defaults to input name with new extension)')
  .option('-f, --format <format>', 'Output format: tap or raw', 'tap')
  .option('-n, --name <name>', 'Program name for TAP files (defaults to input filename)')
  .option('-s, --start <line>', 'Autostart line number', '0')
  .option('-q, --quiet', 'Suppress output messages')
  .action((inputFile: string, outputFile?: string, options?: any) => {
    try {
      // Validate input file
      if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file '${inputFile}' does not exist`);
        process.exit(1);
      }

      // Set default output filename if not provided
      if (!outputFile) {
        const ext = options.format === 'raw' ? '.raw' : '.tap';
        outputFile = path.basename(inputFile, path.extname(inputFile)) + ext;
      }

      // Read input file
      const basicText = fs.readFileSync(inputFile, 'utf-8');

      // Parse command line options
      const metadata: ProgramMetadata = {
        name: options.name || path.basename(inputFile, path.extname(inputFile)),
        autostart: parseInt(options.start) || 0
      };

      const format: FileFormat = options.format as FileFormat;

      if (!options.quiet) {
        console.log(`Converting ${inputFile} to ${format.toUpperCase()} format...`);
        if (format === 'tap') {
          console.log(`Program name: ${metadata.name}`);
          console.log(`Autostart line: ${metadata.autostart}`);
        }
      }

      // Convert the BASIC file
      let outputBuffer: Buffer;
      
      switch (format) {
        case 'raw':
          outputBuffer = convertToRaw(basicText);
          break;
        case 'tap':
          outputBuffer = convertToTap(basicText, metadata);
          break;
        default:
          console.error(`Error: Unknown format '${format}'. Use 'tap' or 'raw'.`);
          process.exit(1);
      }

      // Write output file
      fs.writeFileSync(outputFile, outputBuffer);

      if (!options.quiet) {
        console.log(`Output written to: ${outputFile}`);
        console.log(`File size: ${outputBuffer.length} bytes`);
      }

    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add help examples
program.addHelpText('after', `
Examples:
  zx-converter program.bas program.tap
  zx-converter program.bas --format raw
  zx-converter program.bas -f tap -n "My Program" -s 10
  zx-converter program.bas -o output.raw --format raw --quiet

Formats:
  tap  - TAP file with header block and checksums
  raw  - Raw tokenized BASIC program data only

The TAP format is compatible with ZX Spectrum emulators like FUSE and Spectator.
The RAW format contains only the tokenized BASIC program.
`);

program.parse();
