import {
  commands,
  ExtensionContext,
  window,
  workspace,
  StatusBarAlignment,
  StatusBarItem,
  OutputChannel,
  Uri,
} from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as converter from 'converter';

let activeRecordingProcess: child_process.ChildProcess | null = null;
let recordingStatusBar: StatusBarItem | null = null;
let recordingOutputChannel: OutputChannel | null = null;
let tempWavFile: string | null = null;
let tempTzxFile: string | null = null;

export function register(
  context: ExtensionContext,
): ExtensionContext['subscriptions'][0] {
  // Create output channel for recording progress
  recordingOutputChannel = window.createOutputChannel('ZX Spectrum Recording');
  context.subscriptions.push(recordingOutputChannel);

  // Create status bar item
  recordingStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 101);
  recordingStatusBar.command = 'zx-basic.stopZxRecording';
  recordingStatusBar.tooltip = 'Click to stop recording';
  context.subscriptions.push(recordingStatusBar);

  // Register record command
  const recordDisposable = commands.registerCommand(
    'zx-basic.recordFromZx',
    async () => {
      await recordFromZx();
    },
  );

  // Register stop command
  const stopDisposable = commands.registerCommand(
    'zx-basic.stopZxRecording',
    async () => {
      await stopZxRecording();
    },
  );

  context.subscriptions.push(recordDisposable, stopDisposable);

  return recordDisposable;
}

async function recordFromZx() {
  // Prevent multiple simultaneous recordings
  if (activeRecordingProcess) {
    const choice = await window.showWarningMessage(
      'A recording is already in progress. Stop it first?',
      'Stop and Record New',
      'Cancel',
    );

    if (choice === 'Stop and Record New') {
      await stopZxRecording();
    } else {
      return;
    }
  }

  // Get configuration
  const config = workspace.getConfiguration('zxBasic.recordFromZx');
  const tzxwavPath = config.get<string>('tzxwavPath', 'tzxwav');
  const recordingDuration = config.get<number>('recordingDuration', 0); // 0 = manual stop
  const outputDirectory = config.get<string>(
    'outputDirectory',
    '${workspaceFolder}/recordings',
  );

  // Resolve output directory
  let resolvedOutputDir = outputDirectory;
  if (
    outputDirectory.includes('${workspaceFolder}') &&
    workspace.workspaceFolders?.length
  ) {
    resolvedOutputDir = outputDirectory.replace(
      '${workspaceFolder}',
      workspace.workspaceFolders[0].uri.fsPath,
    );
  } else {
    resolvedOutputDir = path.join(os.homedir(), 'zx-recordings');
  }

  // Create output directory if it doesn't exist
  try {
    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }
  } catch (error) {
    window.showErrorMessage(
      `Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  // Create temporary files
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  tempWavFile = path.join(os.tmpdir(), `zx-recording-${timestamp}.wav`);
  tempTzxFile = path.join(os.tmpdir(), `zx-recording-${timestamp}.tzx`);

  try {
    // Show progress
    window.showInformationMessage('Starting ZX Spectrum recording...');

    // Prepare output channel
    if (!recordingOutputChannel) {
      recordingOutputChannel = window.createOutputChannel(
        'ZX Spectrum Recording',
      );
    }
    recordingOutputChannel.clear();
    recordingOutputChannel.appendLine('Starting ZX Spectrum recording...');
    recordingOutputChannel.appendLine(`Temporary WAV file: ${tempWavFile}`);
    recordingOutputChannel.appendLine(`Output directory: ${resolvedOutputDir}`);
    recordingOutputChannel.show(true);

    // Update status bar
    if (recordingStatusBar) {
      recordingStatusBar.text = '$(mic) Recording from ZX...';
      recordingStatusBar.show();
    }

    // Start audio recording
    // Use arecord on Linux, or fall back to other tools
    let recordCommand: string;
    let recordArgs: string[];

    if (process.platform === 'linux') {
      recordCommand = 'arecord';
      recordArgs = [
        '-f',
        'cd', // CD quality: 16-bit, 44100 Hz, stereo
        '-c',
        '2', // Stereo
        '-t',
        'wav', // WAV format
        tempWavFile,
      ];

      if (recordingDuration > 0) {
        recordArgs.unshift('-d', recordingDuration.toString());
      }
    } else if (process.platform === 'darwin') {
      recordCommand = 'rec';
      recordArgs = [
        '-r',
        '44100', // Sample rate
        '-c',
        '2', // Channels
        '-b',
        '16', // Bit depth
        '-e',
        'signed', // Encoding
        tempWavFile,
      ];

      if (recordingDuration > 0) {
        recordArgs.unshift('-l', recordingDuration.toString());
      }
    } else if (process.platform === 'win32') {
      recordCommand = 'ffmpeg';
      recordArgs = [
        '-f',
        'dshow',
        '-i',
        'audio=Microphone',
        '-t',
        recordingDuration > 0 ? recordingDuration.toString() : '300', // 5 minutes default
        '-acodec',
        'pcm_s16le',
        '-ar',
        '44100',
        '-ac',
        '2',
        tempWavFile,
      ];
    } else {
      throw new Error('Audio recording not supported on this platform');
    }

    // Check if recording command is available
    try {
      await new Promise<void>((resolve, reject) => {
        const checkProcess = child_process.spawn(recordCommand, ['--help']);
        let hasError = false;

        checkProcess.on('error', () => {
          hasError = true;
          reject(
            new Error(
              `Recording tool ${recordCommand} not found. Please install it first.`,
            ),
          );
        });

        checkProcess.on('exit', (code) => {
          if (!hasError && code !== 0) {
            reject(
              new Error(
                `Recording tool ${recordCommand} failed with exit code ${code}`,
              ),
            );
          } else if (!hasError) {
            resolve();
          }
        });

        // Timeout after 2 seconds
        setTimeout(() => {
          if (!hasError) {
            checkProcess.kill();
            resolve();
          }
        }, 2000);
      });
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(err.message);
      recordingOutputChannel?.appendLine(`Error: ${err.message}`);

      // Clean up
      if (recordingStatusBar) {
        recordingStatusBar.hide();
      }

      // Clean up temp files
      cleanupTempFiles();
      return;
    }

    // Start recording process
    activeRecordingProcess = child_process.spawn(recordCommand, recordArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    recordingOutputChannel?.appendLine(
      `Started recording with: ${recordCommand} ${recordArgs.join(' ')}`,
    );

    // Handle stdout
    activeRecordingProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      recordingOutputChannel?.append(output);
    });

    // Handle stderr
    activeRecordingProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      recordingOutputChannel?.append(output);
    });

    // Handle process exit (auto-stop due to duration)
    activeRecordingProcess.on('exit', async (code, signal) => {
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        recordingOutputChannel?.appendLine('---');
        recordingOutputChannel?.appendLine('Recording stopped by user');
      } else if (code === 0) {
        recordingOutputChannel?.appendLine('---');
        recordingOutputChannel?.appendLine('Recording completed');
      } else {
        recordingOutputChannel?.appendLine('---');
        recordingOutputChannel?.appendLine(
          `Recording failed with code ${code}`,
        );
        window.showErrorMessage(`Recording failed with exit code ${code}`);
      }

      // Process the recording
      await processRecording(tzxwavPath, resolvedOutputDir);

      // Clean up
      if (recordingStatusBar) {
        recordingStatusBar.hide();
      }
      activeRecordingProcess = null;
    });

    // Handle process errors
    activeRecordingProcess.on('error', (err) => {
      recordingOutputChannel?.appendLine('---');
      recordingOutputChannel?.appendLine(`Error: ${err.message}`);
      window.showErrorMessage(`Recording error: ${err.message}`);

      // Clean up
      if (recordingStatusBar) {
        recordingStatusBar.hide();
      }
      activeRecordingProcess = null;

      // Clean up temp files
      cleanupTempFiles();
    });

    window.showInformationMessage(
      'Recording started. Click the microphone icon in status bar to stop.',
    );
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to start recording: ${err.message}`);
    recordingOutputChannel?.appendLine(`Error: ${err.message}`);
    console.error('Record from ZX error:', err);

    // Clean up
    if (recordingStatusBar) {
      recordingStatusBar.hide();
    }
    activeRecordingProcess = null;

    // Clean up temp files
    cleanupTempFiles();
  }
}

async function processRecording(tzxwavPath: string, outputDirectory: string) {
  if (!tempWavFile || !tempTzxFile) {
    window.showErrorMessage('No temporary files available for processing');
    return;
  }

  try {
    // Check if WAV file was created and has content
    if (!fs.existsSync(tempWavFile)) {
      window.showErrorMessage('Recording failed: No WAV file created');
      return;
    }

    const wavStats = fs.statSync(tempWavFile);
    if (wavStats.size === 0) {
      window.showErrorMessage('Recording failed: WAV file is empty');
      return;
    }

    recordingOutputChannel?.appendLine(
      `WAV file created: ${tempWavFile} (${wavStats.size} bytes)`,
    );

    // Convert WAV to TZX using tzxwav
    recordingOutputChannel?.appendLine('Converting WAV to TZX using tzxwav...');

    const tzxwavProcess = child_process.spawn(
      tzxwavPath,
      [
        '-o',
        tempTzxFile,
        '-v', // Verbose output
        tempWavFile,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let tzxwavError = '';

    tzxwavProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      recordingOutputChannel?.append(output);
    });

    tzxwavProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      tzxwavError += output;
      recordingOutputChannel?.append(output);
    });

    await new Promise<void>((resolve, reject) => {
      tzxwavProcess.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`tzxwav failed with exit code ${code}: ${tzxwavError}`),
          );
        }
      });

      tzxwavProcess.on('error', (err) => {
        reject(new Error(`tzxwav error: ${err.message}`));
      });
    });

    // Check if TZX file was created
    if (!fs.existsSync(tempTzxFile)) {
      throw new Error('TZX conversion failed: No TZX file created');
    }

    const tzxStats = fs.statSync(tempTzxFile);
    if (tzxStats.size === 0) {
      throw new Error('TZX conversion failed: TZX file is empty');
    }

    recordingOutputChannel?.appendLine(
      `TZX file created: ${tempTzxFile} (${tzxStats.size} bytes)`,
    );

    // Parse TZX file to extract program name and convert to BASIC
    await convertTzxToBasic(tempTzxFile, outputDirectory);
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to process recording: ${err.message}`);
    recordingOutputChannel?.appendLine(`Error: ${err.message}`);
    console.error('Recording processing error:', err);
  } finally {
    // Clean up temp files after processing
    cleanupTempFiles();
  }
}

async function convertTzxToBasic(tzxFile: string, outputDirectory: string) {
  try {
    recordingOutputChannel?.appendLine(
      'Parsing TZX file to extract BASIC program...',
    );

    // Read TZX file
    const tzxBuffer = fs.readFileSync(tzxFile);

    // Convert TZX to TAP format first (easier to extract BASIC)
    const tapBuffer = converter.convertTzxToTap(tzxBuffer);

    if (!tapBuffer || tapBuffer.length === 0) {
      throw new Error('Failed to convert TZX to TAP format');
    }

    recordingOutputChannel?.appendLine(
      `TAP data extracted: ${tapBuffer.length} bytes`,
    );

    // Parse TAP file to extract program name from header
    const tapMetadata = converter.getTapMetadata(tapBuffer);

    let programName = 'recorded-program';
    if (tapMetadata) {
      programName = tapMetadata.programName || 'recorded-program';
      // Clean up program name for filename
      programName = programName
        .replace(/[^a-zA-Z0-9\-_.]/g, '_')
        .substring(0, 20)
        .trim();
      if (programName === '') {
        programName = 'recorded-program';
      }
    }

    recordingOutputChannel?.appendLine(
      `Extracted program name: ${programName}`,
    );

    // Convert TAP to BASIC source
    // We need to use the converter's functionality to extract BASIC from TAP
    // For now, we'll create a simple conversion by parsing the TAP data
    const basicSource = convertTapToBasicSource(tapBuffer);

    if (!basicSource || basicSource.trim() === '') {
      throw new Error('Extracted BASIC source is empty');
    }

    // Create output file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFileName = `${programName}-${timestamp}.bas`;
    const outputFilePath = path.join(outputDirectory, outputFileName);

    // Write BASIC source to file
    fs.writeFileSync(outputFilePath, basicSource);

    recordingOutputChannel?.appendLine(
      `BASIC program saved to: ${outputFilePath}`,
    );
    recordingOutputChannel?.appendLine(
      `Program has ${basicSource.split('\n').length} lines`,
    );

    // Show success message with option to open file
    const choice = await window.showInformationMessage(
      `Successfully recorded program "${programName}" from ZX Spectrum!`,
      'Open File',
      'Show in Explorer',
    );

    if (choice === 'Open File') {
      const document = await workspace.openTextDocument(outputFilePath);
      await window.showTextDocument(document);
    } else if (choice === 'Show in Explorer') {
      const fileUri = Uri.file(outputFilePath);
      await commands.executeCommand('revealFileInOS', fileUri);
    }
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to convert TZX to BASIC: ${err.message}`);
    recordingOutputChannel?.appendLine(`Conversion error: ${err.message}`);
    console.error('TZX to BASIC conversion error:', err);
    throw err;
  }
}

function convertTapToBasicSource(tapBuffer: Buffer): string {
  // Simple TAP to BASIC conversion
  // This is a basic implementation - for production use, we should use the proper tokenizer

  let result = '';
  let i = 0;

  // Parse TAP blocks
  while (i < tapBuffer.length) {
    if (i + 1 >= tapBuffer.length) break;

    // Read block length (little-endian)
    const blockLength = tapBuffer[i] | (tapBuffer[i + 1] << 8);
    i += 2;

    if (i + blockLength > tapBuffer.length) break;

    const blockData = tapBuffer.slice(i, i + blockLength);
    i += blockLength;

    // Skip header block (type 0x00), process data block (type 0xFF)
    if (blockData.length > 0 && blockData[0] === 0xff) {
      // Data block - extract BASIC program data
      const programData = blockData.slice(1, -1); // Remove type byte and checksum

      // Parse BASIC lines
      let j = 0;
      while (j < programData.length) {
        if (j + 3 >= programData.length) break;

        // Read line number (little-endian)
        const lineNumber = programData[j] | (programData[j + 1] << 8);
        j += 2;

        // Read line length (little-endian)
        const lineLength = programData[j] | (programData[j + 1] << 8);
        j += 2;

        if (j + lineLength > programData.length) break;

        // Extract line content
        const lineContent = programData.slice(j, j + lineLength);
        j += lineLength;

        // Convert to text (simple ASCII conversion for now)
        result += lineNumber + ' ';
        for (let k = 0; k < lineContent.length; k++) {
          const byte = lineContent[k];
          if (byte === 0x0d) {
            // End of line
            result += '\n';
            break;
          } else if (byte >= 32 && byte < 127) {
            // Printable ASCII
            result += String.fromCharCode(byte);
          } else {
            // Non-printable - show as hex
            result += `[${byte.toString(16)}]`;
          }
        }
        result += '\n';
      }
    }
  }

  return result;
}

async function stopZxRecording() {
  if (!activeRecordingProcess) {
    window.showInformationMessage('No recording in progress');
    return;
  }

  try {
    // Try graceful termination first
    activeRecordingProcess.kill('SIGTERM');

    // If still running after 1 second, force kill
    setTimeout(() => {
      if (activeRecordingProcess && !activeRecordingProcess.killed) {
        activeRecordingProcess.kill('SIGKILL');
      }
    }, 1000);

    window.showInformationMessage('Stopping recording...');
    recordingOutputChannel?.appendLine('Stopping recording process...');
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to stop recording: ${err.message}`);
  }
}

function cleanupTempFiles() {
  try {
    if (tempWavFile && fs.existsSync(tempWavFile)) {
      fs.unlinkSync(tempWavFile);
      recordingOutputChannel?.appendLine(
        `Cleaned up temporary WAV file: ${tempWavFile}`,
      );
    }
    if (tempTzxFile && fs.existsSync(tempTzxFile)) {
      fs.unlinkSync(tempTzxFile);
      recordingOutputChannel?.appendLine(
        `Cleaned up temporary TZX file: ${tempTzxFile}`,
      );
    }
  } catch (error) {
    console.warn('Failed to clean up temporary files:', error);
  } finally {
    tempWavFile = null;
    tempTzxFile = null;
  }
}

export function deactivate() {
  // Clean up active recording on extension deactivate
  if (activeRecordingProcess) {
    try {
      activeRecordingProcess.kill('SIGKILL');
    } catch (error) {
      // Ignore errors during cleanup
    }
    activeRecordingProcess = null;
  }

  // Clean up temp files
  cleanupTempFiles();
}
