/**
 * ZX Spectrum BASIC Converter Library
 * Main entry point for conversion utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { basicToTap as bas2tapBasicToTap, createTapFile as bas2tapCreateTapFile } from './bas2tap';

// BAS2TAP library - re-export all functions
export {
  Bas2TapOptions,
  Bas2TapResult,
  basicToTap,
  createTapFile,
  tapToBasic,
  verifyTapChecksums,
  convertBasicToTap
} from './bas2tap';

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
 * Convert BASIC text to TAP file format (using native bas2tap)
 */
export function convertToTap(
  basicText: string,
  metadata: ProgramMetadata
): Buffer {
  // Use native bas2tap implementation
  const result = bas2tapBasicToTap(basicText, {
    programName: metadata.name,
    autostart: metadata.autostart,
    suppressWarnings: true
  });
  if (!result.success || !result.tap) {
    throw new Error(result.error || 'Failed to convert BASIC');
  }
  return result.tap;
}

/**
 * Convert BASIC text to raw binary format (tokenized BASIC only)
 */
export function convertToRaw(basicText: string): Buffer {
  // Use native bas2tap tokenization
  const result = bas2tapBasicToTap(basicText, { suppressWarnings: true });
  if (!result.success || !result.tap) {
    throw new Error(result.error || 'Failed to convert BASIC');
  }
  return result.tap;
}

/**
 * Convert BASIC text to binary (alias for convertToRaw)
 */
export function convertToBinary(basicText: string): Buffer {
  return convertToRaw(basicText);
}

/**
 * Initialize converter
 */
export function initialize(): {
  initialized: boolean;
  version: string;
  using: string;
} {
  return {
    initialized: true,
    version: VERSION,
    using: 'native bas2tap implementation'
  };
}
