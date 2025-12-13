import {
  Bas2TapOptions,
  ConvertArtifacts,
  convertBasicSource
} from './core/converter';
export {
  Bas2TapOptions,
  ConvertArtifacts,
  convertBasicSource
} from './core/converter';

export { convertBasicWithObjects, ObjectInfo } from './core/converter';

export {
  createHeaderBlock,
  createDataBlock,
  createTapFile,
  parseTapFile,
  getTapMetadata,
  verifyTapChecksums
} from './tap-format';

export {
  convertTapToTzx,
  convertTzxToTap,
  parseTzxFile,
  getTzxMetadata,
  createTzxWithDescription,
  TzxBlock,
  TzxMetadata
} from './tzx-format';

export const VERSION = '1.0.0';

export interface ProgramMetadata {
  name: string;
  autostart?: number;
  variablesArea?: number;
}

export type FileFormat = 'raw' | 'tap';

export function convertBasic(
  basicText: string,
  options: Bas2TapOptions = {}
): ConvertArtifacts {
  return convertBasicSource(basicText, options);
}

export function convertToTap(
  basicText: string,
  metadata: ProgramMetadata
): Buffer {
  const { tap } = convertBasic(basicText, {
    programName: metadata.name,
    autostart: metadata.autostart
  });
  return tap;
}

export function convertToRaw(
  basicText: string,
  options: Bas2TapOptions = {}
): Buffer {
  const { raw } = convertBasic(basicText, options);
  return raw;
}

export function convertToBinary(
  basicText: string,
  options?: Bas2TapOptions
): Buffer {
  return convertToRaw(basicText, options);
}

export function convertBasicToTap(
  basicCode: string,
  programName = 'Program',
  autostart?: number
): Buffer {
  return convertToTap(basicCode, { name: programName, autostart });
}

export function convertBasicToTzx(
  basicCode: string,
  programName = 'Program',
  autostart?: number,
  description?: string
): Buffer {
  const tapBuffer = convertToTap(basicCode, { name: programName, autostart });
  
  if (description) {
    const { createTzxWithDescription } = require('./tzx-format');
    return createTzxWithDescription(tapBuffer, description);
  }
  
  const { convertTapToTzx } = require('./tzx-format');
  return convertTapToTzx(tapBuffer);
}

export function initialize(): {
  initialized: boolean;
  version: string;
  using: string;
} {
  return {
    initialized: true,
    version: VERSION,
    using: 'TypeScript bas2tap core'
  };
}
