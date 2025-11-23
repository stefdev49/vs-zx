/**
 * ZX Spectrum BASIC to Binary Conversion Utilities
 * Converts BASIC programs to binary format suitable for ZX Spectrum loading
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createTapFile } from './tap-format';
import { compileBASIC } from './zxbasic-compiler';

export interface ConversionOptions {
  output?: string;
  format?: 'tap' | 'sna' | 'bin'; // TAP, SNA snapshot, or raw binary
  autostart?: number; // Autostart line number
  programName?: string; // Program name for TAP header
  optimize?: boolean; // Optimize generated code
  verbose?: boolean;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  size: number;
  format: string;
  error?: string;
  warnings?: string[];
}

/**
 * Convert BASIC file to binary format
 */
export async function convertBasicToBinary(
  basicFile: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    // Read BASIC file
    if (!fs.existsSync(basicFile)) {
      return {
        success: false,
        size: 0,
        format: options.format || 'tap',
        error: `File not found: ${basicFile}`
      };
    }

    const basicCode = fs.readFileSync(basicFile, 'utf-8');
    const format = options.format || 'tap';
    const programName = options.programName || path.basename(basicFile, '.bas');

    if (options.verbose) {
      console.log(`Converting ${basicFile} to ${format.toUpperCase()}...`);
    }

    // Compile BASIC code
    if (options.verbose) {
      console.log('Compiling BASIC code...');
    }

    const compilationResult = await compileBASIC(basicCode, {
      optimize: options.optimize,
      verbose: options.verbose
    });

    if (!compilationResult.success) {
      return {
        success: false,
        size: 0,
        format,
        error: compilationResult.error,
        warnings: compilationResult.warnings
      };
    }

    const binaryData = compilationResult.binary!;

    if (options.verbose) {
      console.log(`Binary size: ${binaryData.length} bytes`);
    }

    // Convert to requested format
    let outputData: Buffer;
    const outputPath = options.output || 
      `${path.basename(basicFile, '.bas')}.${format}`;

    switch (format) {
      case 'tap':
        outputData = createTapFile(binaryData, programName, options.autostart);
        break;

      case 'sna':
        outputData = createSnaFile(binaryData, programName);
        break;

      case 'bin':
        outputData = binaryData;
        break;

      default:
        return {
          success: false,
          size: 0,
          format,
          error: `Unknown format: ${format}`
        };
    }

    // Write output file
    fs.writeFileSync(outputPath, outputData);

    if (options.verbose) {
      console.log(`Output written to: ${outputPath}`);
      console.log(`Output size: ${outputData.length} bytes`);
    }

    return {
      success: true,
      outputPath,
      size: outputData.length,
      format
    };
  } catch (error) {
    return {
      success: false,
      size: 0,
      format: options.format || 'tap',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Convert BASIC code string to binary format
 */
export async function convertBasicStringToBinary(
  basicCode: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    const format = options.format || 'tap';
    const programName = options.programName || 'Program';

    if (options.verbose) {
      console.log(`Converting BASIC code to ${format.toUpperCase()}...`);
    }

    // Compile BASIC code
    if (options.verbose) {
      console.log('Compiling BASIC code...');
    }

    const compilationResult = await compileBASIC(basicCode, {
      optimize: options.optimize,
      verbose: options.verbose
    });

    if (!compilationResult.success) {
      return {
        success: false,
        size: 0,
        format,
        error: compilationResult.error,
        warnings: compilationResult.warnings
      };
    }

    const binaryData = compilationResult.binary!;

    if (options.verbose) {
      console.log(`Binary size: ${binaryData.length} bytes`);
    }

    // Convert to requested format
    let outputData: Buffer;

    switch (format) {
      case 'tap':
        outputData = createTapFile(binaryData, programName, options.autostart);
        break;

      case 'sna':
        outputData = createSnaFile(binaryData, programName);
        break;

      case 'bin':
        outputData = binaryData;
        break;

      default:
        return {
          success: false,
          size: 0,
          format,
          error: `Unknown format: ${format}`
        };
    }

    // Write output file if specified
    if (options.output) {
      fs.writeFileSync(options.output, outputData);

      if (options.verbose) {
        console.log(`Output written to: ${options.output}`);
      }
    }

    return {
      success: true,
      outputPath: options.output,
      size: outputData.length,
      format
    };
  } catch (error) {
    return {
      success: false,
      size: 0,
      format: options.format || 'tap',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a ZX Spectrum .sna file (48K snapshot)
 * 
 * SNA File Format (48K):
 * - 1 byte: I register
 * - 2 bytes: L, H registers
 * - 2 bytes: E, D registers
 * - 2 bytes: C, B registers
 * - 2 bytes: F, A registers
 * - 2 bytes: L, H registers (alt)
 * - 2 bytes: E, D registers (alt)
 * - 2 bytes: C, B registers (alt)
 * - 2 bytes: Y, X registers (alt)
 * - 1 byte: Interrupt flip-flop (1 = IFF2)
 * - 1 byte: R register
 * - 2 bytes: I, Y registers (alt)
 * - 1 byte: SP high, SP low (but we need to load from stack)
 * - 2 bytes: Interrupt mode, border colour
 * - 49152 bytes: RAM (0x4000-0xFFFF)
 */
function createSnaFile(programData: Buffer, programName: string): Buffer {
  // Create a 48K snapshot file
  const snapshot = Buffer.alloc(49179); // 127 + 49152

  // CPU State (simplified - assumes program at 0x4000)
  snapshot[0] = 0x3F; // I register
  
  // Registers (simplified defaults)
  snapshot[1] = 0x00; // L
  snapshot[2] = 0x00; // H
  snapshot[3] = 0x00; // E
  snapshot[4] = 0x00; // D
  snapshot[5] = 0x00; // C
  snapshot[6] = 0x00; // B
  snapshot[7] = 0x00; // F
  snapshot[8] = 0x00; // A
  
  // Alt registers
  snapshot[9] = 0x00;
  snapshot[10] = 0x00;
  snapshot[11] = 0x00;
  snapshot[12] = 0x00;
  snapshot[13] = 0x00;
  snapshot[14] = 0x00;
  snapshot[15] = 0x00;
  snapshot[16] = 0x00;
  
  snapshot[17] = 0x3F; // IY register high
  snapshot[18] = 0xFF; // IY register low
  
  snapshot[19] = 0x1A; // Interrupt flip-flop
  snapshot[20] = 0x00; // R register
  
  // IX register (alt)
  snapshot[21] = 0x00;
  snapshot[22] = 0x00;
  
  // SP (stack pointer) - set to high memory
  snapshot[23] = 0xFF;
  snapshot[24] = 0xFF;
  
  // IM (interrupt mode) = 1, border = 0
  snapshot[25] = 0x01;

  // Copy program data into RAM (starting at 0x4000)
  const ramStart = 127;
  const copySize = Math.min(programData.length, snapshot.length - ramStart);
  programData.copy(snapshot, ramStart);

  return snapshot;
}

/**
 * Batch convert multiple BASIC files
 */
export async function convertBasicBatch(
  basicFiles: string[],
  options: ConversionOptions = {}
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];

  for (const file of basicFiles) {
    if (options.verbose) {
      console.log(`\nProcessing ${file}...`);
    }

    const result = await convertBasicToBinary(file, options);
    results.push(result);

    if (!result.success && options.verbose) {
      console.error(`Error: ${result.error}`);
    }
  }

  return results;
}

/**
 * Get information about a BASIC file
 */
export async function getBasicFileInfo(basicFile: string): Promise<{
  name: string;
  size: number;
  lineCount: number;
  hasErrors: boolean;
}> {
  const basicCode = fs.readFileSync(basicFile, 'utf-8');
  const lines = basicCode.split('\n').filter(line => line.trim().length > 0);

  return {
    name: path.basename(basicFile),
    size: basicCode.length,
    lineCount: lines.length,
    hasErrors: false // Could perform basic syntax check here
  };
}
