/**
 * ZX Spectrum BASIC Converter Library
 * Main entry point for conversion utilities
 */

import * as fs from 'fs';
import * as path from 'path';

// TAP Format
export {
  TapBlock,
  TapHeader,
  createHeaderBlock,
  createDataBlock,
  createTapFile,
  parseTapFile,
  getTapMetadata,
  verifyTapChecksums
} from './tap-format';

// BASIC Compiler
export {
  CompileOptions,
  CompileResult,
  isZxbasicAvailable,
  getZxbasicVersion,
  compileBASIC,
  compileBasicFile,
  validateBasicSyntax,
  getCompilerCapabilities,
  compileOptimized,
  compileWithDebug
} from './zxbasic-compiler';

// BASIC Conversion
export {
  ConversionOptions,
  ConversionResult,
  convertBasicToBinary,
  convertBasicStringToBinary,
  convertBasicBatch,
  getBasicFileInfo
} from './basic-converter';

// Import implementations for direct use
import { createTapFile } from './tap-format';
import { compileBASIC } from './zxbasic-compiler';

// Version
export const VERSION = '1.0.0';

/**
 * Metadata for a BASIC program
 */
export interface ProgramMetadata {
  name: string;
  autostart?: number;
  variablesArea?: number;
}

/**
 * File format type
 */
export type FileFormat = 'raw' | 'tap';

/**
 * Convert BASIC text to TAP file format
 */
export async function convertToTap(
  basicText: string,
  metadata: ProgramMetadata
): Promise<Buffer> {
  // Compile BASIC code to binary
  const result = await compileBASIC(basicText, { optimize: false });

  if (!result.success || !result.binary) {
    throw new Error(result.error || 'Failed to compile BASIC code');
  }

  // Create TAP file
  return createTapFile(
    result.binary,
    metadata.name,
    metadata.autostart
  );
}

/**
 * Convert BASIC text to raw binary format (tokenized BASIC only)
 */
export async function convertToRaw(basicText: string): Promise<Buffer> {
  // Compile BASIC code to binary
  const result = await compileBASIC(basicText, { optimize: false });

  if (!result.success || !result.binary) {
    throw new Error(result.error || 'Failed to compile BASIC code');
  }

  // Return raw binary data (no TAP wrapper)
  return result.binary;
}

/**
 * Convert BASIC text to binary (alias for convertToRaw)
 */
export async function convertToBinary(basicText: string): Promise<Buffer> {
  return convertToRaw(basicText);
}

/**
 * Initialize converter with version check
 */
export function initialize(): {
  initialized: boolean;
  zxbasicAvailable: boolean;
  version: string;
} {
  const { isZxbasicAvailable, getZxbasicVersion } = require('./zxbasic-compiler');

  return {
    initialized: true,
    zxbasicAvailable: isZxbasicAvailable(),
    version: VERSION
  };
}
