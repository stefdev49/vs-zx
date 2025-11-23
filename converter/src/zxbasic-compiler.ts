/**
 * ZX BASIC Compiler Integration
 * Provides TypeScript wrapper around bas2tap and zxbasic compilers
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CompileOptions {
  optimize?: boolean;
  verbose?: boolean;
  debug?: boolean;
  outputType?: 'binary' | 'hex' | 'asm';
}

export interface CompileResult {
  success: boolean;
  binary?: Buffer;
  assembly?: string;
  error?: string;
  warnings?: string[];
  stats?: {
    codeSize: number;
    dataSize: number;
    totalSize: number;
  };
}

/**
 * Check if bas2tap compiler is available
 */
export function isBas2tapAvailable(): boolean {
  try {
    execSync('which bas2tap || true', { stdio: 'pipe', shell: '/bin/bash' });
    // Try to find bas2tap in the project
    const bas2tapPath = path.join(__dirname, '../../extras/bas2tap/bas2tap');
    if (fs.existsSync(bas2tapPath)) {
      return true;
    }
    // Also try in PATH
    try {
      execSync('bas2tap --help 2>/dev/null || true', { 
        stdio: 'pipe',
        shell: '/bin/bash'
      });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get bas2tap compiler path
 */
export function getBas2tapPath(): string | null {
  // Try local project path first
  const localPath = path.join(__dirname, '../../extras/bas2tap/bas2tap');
  if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
    return localPath;
  }
  
  // Try to find in PATH
  try {
    const result = execSync('which bas2tap 2>/dev/null', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: '/bin/bash'
    }).trim();
    if (result) {
      return result;
    }
  } catch {
    // Not found in PATH
  }
  
  return null;
}

/**
 * Check if zxbasic compiler is available
 */
export function isZxbasicAvailable(): boolean {
  try {
    execSync('zxbasic --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get zxbasic compiler version
 */
export function getZxbasicVersion(): string | null {
  try {
    const output = execSync('zxbasic --version', { encoding: 'utf-8' });
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Compile BASIC code string
 */
export async function compileBASIC(
  basicCode: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const tempDir = os.tmpdir();
  const tempBasicFile = path.join(tempDir, `temp_${Date.now()}.bas`);
  const tempOutputFile = path.join(tempDir, `temp_${Date.now()}.bin`);

  try {
    // Write BASIC code to temporary file
    fs.writeFileSync(tempBasicFile, basicCode, 'utf-8');

    // Build zxbasic command
    let command = `zxbasic "${tempBasicFile}" -o "${tempOutputFile}"`;

    if (options.optimize) {
      command += ' --optimize';
    }

    if (options.debug) {
      command += ' -g';
    }

    if (options.outputType === 'asm') {
      command += ' --asm';
    }

    if (options.verbose) {
      console.log(`Compiling BASIC code...`);
      console.log(`Command: ${command}`);
    }

    // Execute compiler
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (options.verbose && output) {
        console.log('Compiler output:', output);
      }
    } catch (execError: any) {
      const error = execError as any;
      const stderr = error.stderr?.toString() || '';
      const stdout = error.stdout?.toString() || '';

      // zxbasic returns non-zero exit code even on warnings
      // Only fail if there are actual errors
      if (stderr.includes('Error') || stderr.includes('error')) {
        return {
          success: false,
          error: stderr || stdout || 'Compilation failed'
        };
      }
    }

    // Check if output file was created
    if (!fs.existsSync(tempOutputFile)) {
      return {
        success: false,
        error: 'Compiler did not produce output file'
      };
    }

    // Read compiled binary
    const binary = fs.readFileSync(tempOutputFile);

    // Analyze generated code
    const stats = {
      codeSize: binary.length,
      dataSize: 0,
      totalSize: binary.length
    };

    const warnings: string[] = [];

    // Check for common issues
    if (binary.length > 32768) {
      warnings.push('Warning: Binary larger than 32KB memory');
    }

    if (binary.length === 0) {
      warnings.push('Warning: Empty binary generated');
    }

    return {
      success: true,
      binary,
      stats,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempBasicFile)) {
        fs.unlinkSync(tempBasicFile);
      }
      if (fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Compile BASIC file
 */
export async function compileBasicFile(
  basicFile: string,
  outputFile: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  try {
    if (!fs.existsSync(basicFile)) {
      return {
        success: false,
        error: `File not found: ${basicFile}`
      };
    }

    const basicCode = fs.readFileSync(basicFile, 'utf-8');
    const result = await compileBASIC(basicCode, options);

    if (result.success && result.binary) {
      fs.writeFileSync(outputFile, result.binary);
      if (options.verbose) {
        console.log(`Output written to: ${outputFile}`);
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Validate BASIC syntax
 */
export async function validateBasicSyntax(basicCode: string): Promise<{
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}> {
  const tempDir = os.tmpdir();
  const tempBasicFile = path.join(tempDir, `validate_${Date.now()}.bas`);

  try {
    fs.writeFileSync(tempBasicFile, basicCode, 'utf-8');

    const command = `zxbasic "${tempBasicFile}" --syntax-only`;

    try {
      execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return { valid: true };
    } catch (error: any) {
      const stderr = (error as any).stderr?.toString() || '';
      const lines = stderr.split('\n').filter((line: string) => line.trim().length > 0);

      return {
        valid: false,
        errors: lines
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  } finally {
    try {
      if (fs.existsSync(tempBasicFile)) {
        fs.unlinkSync(tempBasicFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get compiler capabilities
 */
export function getCompilerCapabilities(): {
  supportedFeatures: string[];
  maxCodeSize: number;
  optimizations: string[];
} {
  return {
    supportedFeatures: [
      'ZX BASIC syntax',
      'Inline assembly',
      'Functions',
      'Arrays',
      'Strings',
      'File I/O'
    ],
    maxCodeSize: 32768, // 32KB for ZX Spectrum 48K
    optimizations: [
      'Dead code elimination',
      'Constant folding',
      'Inline optimization',
      'Jump optimization'
    ]
  };
}

/**
 * Compile with custom options for optimization
 */
export async function compileOptimized(
  basicCode: string
): Promise<CompileResult> {
  return compileBASIC(basicCode, {
    optimize: true,
    verbose: false
  });
}

/**
 * Compile with debug symbols
 */
export async function compileWithDebug(
  basicCode: string
): Promise<CompileResult> {
  return compileBASIC(basicCode, {
    debug: true,
    verbose: false
  });
}
