import {
  commands,
  ExtensionContext,
  window,
  workspace,
  StatusBarAlignment,
  StatusBarItem,
  OutputChannel,
  Uri,
} from "vscode";
import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as converter from "converter";
import { TOKEN_MAP } from "converter/out/core/token-map";
import {
  zxByteToUnicode,
  isZxBlockGraphicsByte,
} from "converter/out/core/zx-charset";

let activeRecordingProcess: child_process.ChildProcess | null = null;
let recordingStatusBar: StatusBarItem | null = null;
let recordingOutputChannel: OutputChannel | null = null;
let tempWavFile: string | null = null;
let tempTzxFile: string | null = null;

export function register(
  context: ExtensionContext,
): ExtensionContext["subscriptions"][0] {
  // Create output channel for recording progress
  recordingOutputChannel = window.createOutputChannel("ZX Spectrum Recording");
  context.subscriptions.push(recordingOutputChannel);

  // Create status bar item
  recordingStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 101);
  recordingStatusBar.command = "zx-basic.stopZxRecording";
  recordingStatusBar.tooltip = "Click to stop recording";
  context.subscriptions.push(recordingStatusBar);

  // Register record command
  const recordDisposable = commands.registerCommand(
    "zx-basic.recordFromZx",
    async () => {
      await recordFromZx();
    },
  );

  // Register stop command
  const stopDisposable = commands.registerCommand(
    "zx-basic.stopZxRecording",
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
      "A recording is already in progress. Stop it first?",
      "Stop and Record New",
      "Cancel",
    );

    if (choice === "Stop and Record New") {
      await stopZxRecording();
    } else {
      return;
    }
  }

  // Get configuration
  const config = workspace.getConfiguration("zxBasic.recordFromZx");
  const tzxwavPath = config.get<string>("tzxwavPath", "tzxwav");
  const recordingDuration = config.get<number>("recordingDuration", 0); // 0 = manual stop
  const outputDirectory = config.get<string>(
    "outputDirectory",
    "${workspaceFolder}/recordings",
  );

  // Resolve output directory
  let resolvedOutputDir = outputDirectory;
  if (
    outputDirectory.includes("${workspaceFolder}") &&
    workspace.workspaceFolders?.length
  ) {
    resolvedOutputDir = outputDirectory.replace(
      "${workspaceFolder}",
      workspace.workspaceFolders[0].uri.fsPath,
    );
  } else {
    resolvedOutputDir = path.join(os.homedir(), "zx-recordings");
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  tempWavFile = path.join(os.tmpdir(), `zx-recording-${timestamp}.wav`);
  tempTzxFile = path.join(os.tmpdir(), `zx-recording-${timestamp}.tzx`);

  try {
    // Show progress
    window.showInformationMessage("Starting ZX Spectrum recording...");

    // Prepare output channel
    if (!recordingOutputChannel) {
      recordingOutputChannel = window.createOutputChannel(
        "ZX Spectrum Recording",
      );
    }
    recordingOutputChannel.clear();
    recordingOutputChannel.appendLine("Starting ZX Spectrum recording...");
    recordingOutputChannel.appendLine(`Temporary WAV file: ${tempWavFile}`);
    recordingOutputChannel.appendLine(`Output directory: ${resolvedOutputDir}`);
    recordingOutputChannel.show(true);

    // Update status bar
    if (recordingStatusBar) {
      recordingStatusBar.text = "$(mic) Recording from ZX...";
      recordingStatusBar.show();
    }

    // Start audio recording
    // Use arecord on Linux, or fall back to other tools
    let recordCommand: string;
    let recordArgs: string[];

    if (process.platform === "linux") {
      recordCommand = "arecord";
      recordArgs = [
        "-f",
        "cd", // CD quality: 16-bit, 44100 Hz, stereo
        "-c",
        "2", // Stereo
        "-t",
        "wav", // WAV format
        tempWavFile,
      ];

      if (recordingDuration > 0) {
        recordArgs.unshift("-d", recordingDuration.toString());
      }
    } else if (process.platform === "darwin") {
      recordCommand = "rec";
      recordArgs = [
        "-r",
        "44100", // Sample rate
        "-c",
        "2", // Channels
        "-b",
        "16", // Bit depth
        "-e",
        "signed", // Encoding
        tempWavFile,
      ];

      if (recordingDuration > 0) {
        recordArgs.unshift("-l", recordingDuration.toString());
      }
    } else if (process.platform === "win32") {
      recordCommand = "ffmpeg";
      recordArgs = [
        "-f",
        "dshow",
        "-i",
        "audio=Microphone",
        "-t",
        recordingDuration > 0 ? recordingDuration.toString() : "300", // 5 minutes default
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        "-ac",
        "2",
        tempWavFile,
      ];
    } else {
      throw new Error("Audio recording not supported on this platform");
    }

    // Check if recording command is available
    try {
      await new Promise<void>((resolve, reject) => {
        const checkProcess = child_process.spawn(recordCommand, ["--help"]);
        let hasError = false;

        checkProcess.on("error", () => {
          hasError = true;
          reject(
            new Error(
              `Recording tool ${recordCommand} not found. Please install it first.`,
            ),
          );
        });

        checkProcess.on("exit", (code) => {
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
      stdio: ["ignore", "pipe", "pipe"],
    });

    recordingOutputChannel?.appendLine(
      `Started recording with: ${recordCommand} ${recordArgs.join(" ")}`,
    );

    // Handle stdout
    activeRecordingProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      recordingOutputChannel?.append(output);
    });

    // Handle stderr
    activeRecordingProcess.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      recordingOutputChannel?.append(output);
    });

    // Handle process exit (auto-stop due to duration)
    activeRecordingProcess.on("exit", async (code, signal) => {
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        recordingOutputChannel?.appendLine("---");
        recordingOutputChannel?.appendLine("Recording stopped by user");
      } else if (code === 0) {
        recordingOutputChannel?.appendLine("---");
        recordingOutputChannel?.appendLine("Recording completed");
      } else {
        // For audio recording tools, non-zero exit codes can be normal when interrupted
        // Check if we have a WAV file - if so, treat it as success
        if (tempWavFile && fs.existsSync(tempWavFile)) {
          const wavStats = fs.statSync(tempWavFile);
          if (wavStats.size > 0) {
            recordingOutputChannel?.appendLine("---");
            recordingOutputChannel?.appendLine(
              "Recording stopped (interrupted but data captured)",
            );
          } else {
            recordingOutputChannel?.appendLine("---");
            recordingOutputChannel?.appendLine(
              `Recording failed with code ${code}`,
            );
            window.showErrorMessage(`Recording failed with exit code ${code}`);

            // Clean up and return early
            if (recordingStatusBar) {
              recordingStatusBar.hide();
            }
            activeRecordingProcess = null;
            cleanupTempFiles();
            return;
          }
        } else {
          recordingOutputChannel?.appendLine("---");
          recordingOutputChannel?.appendLine(
            `Recording failed with code ${code}`,
          );
          window.showErrorMessage(`Recording failed with exit code ${code}`);

          // Clean up and return early
          if (recordingStatusBar) {
            recordingStatusBar.hide();
          }
          activeRecordingProcess = null;
          cleanupTempFiles();
          return;
        }
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
    activeRecordingProcess.on("error", (err) => {
      recordingOutputChannel?.appendLine("---");
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
      "Recording started. Click the microphone icon in status bar to stop.",
    );
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to start recording: ${err.message}`);
    recordingOutputChannel?.appendLine(`Error: ${err.message}`);
    console.error("Record from ZX error:", err);

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
    window.showErrorMessage("No temporary files available for processing");
    return;
  }

  try {
    // Check if WAV file was created and has content
    if (!fs.existsSync(tempWavFile)) {
      window.showErrorMessage("Recording failed: No WAV file created");
      return;
    }

    const wavStats = fs.statSync(tempWavFile);
    if (wavStats.size === 0) {
      window.showErrorMessage("Recording failed: WAV file is empty");
      return;
    }

    recordingOutputChannel?.appendLine(
      `WAV file created: ${tempWavFile} (${wavStats.size} bytes)`,
    );

    // Convert WAV to TZX using tzxwav
    recordingOutputChannel?.appendLine("Converting WAV to TZX using tzxwav...");

    const tzxwavProcess = child_process.spawn(
      tzxwavPath,
      [
        "-o",
        tempTzxFile,
        "-v", // Verbose output
        tempWavFile,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let tzxwavError = "";

    tzxwavProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      recordingOutputChannel?.append(output);
    });

    tzxwavProcess.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      tzxwavError += output;
      recordingOutputChannel?.append(output);
    });

    await new Promise<void>((resolve, reject) => {
      tzxwavProcess.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`tzxwav failed with exit code ${code}: ${tzxwavError}`),
          );
        }
      });

      tzxwavProcess.on("error", (err) => {
        reject(new Error(`tzxwav error: ${err.message}`));
      });
    });

    // Check if TZX file was created
    if (!fs.existsSync(tempTzxFile)) {
      throw new Error("TZX conversion failed: No TZX file created");
    }

    const tzxStats = fs.statSync(tempTzxFile);
    if (tzxStats.size === 0) {
      throw new Error("TZX conversion failed: TZX file is empty");
    }

    recordingOutputChannel?.appendLine(
      `TZX file created: ${tempTzxFile} (${tzxStats.size} bytes)`,
    );

    // Check if TZX file is suspiciously small (likely no valid tape data found)
    if (tzxStats.size < 100) {
      recordingOutputChannel?.appendLine(
        "⚠️  TZX file is very small - no valid ZX Spectrum tape data detected",
      );
      recordingOutputChannel?.appendLine("💡 Tips for successful recording:");
      recordingOutputChannel?.appendLine(
        "   1. Make sure you have proper audio connection from ZX Spectrum tape output",
      );
      recordingOutputChannel?.appendLine(
        "   2. Start recording BEFORE starting tape output on ZX Spectrum",
      );
      recordingOutputChannel?.appendLine(
        "   3. Use proper volume levels - tape signals should be clear",
      );
      recordingOutputChannel?.appendLine(
        "   4. Try adjusting tzxwav sensitivity settings if needed",
      );
    }

    // Parse TZX file to extract program name and convert to BASIC
    await convertTzxToBasic(tempTzxFile, outputDirectory);
  } catch (error) {
    const err = error as Error;
    recordingOutputChannel?.appendLine(`Error: ${err.message}`);
    console.error("Recording processing error:", err);

    // Keep WAV file for diagnosis when conversion fails
    if (tempWavFile && fs.existsSync(tempWavFile)) {
      recordingOutputChannel?.appendLine(
        `⚠️  WAV file preserved for diagnosis: ${tempWavFile}`,
      );
      recordingOutputChannel?.appendLine(
        "💡 You can manually convert this file using: tzxwav -o output.tzx " +
          tempWavFile,
      );
      // Only clean up TZX file, keep WAV file
      if (tempTzxFile && fs.existsSync(tempTzxFile)) {
        try {
          fs.unlinkSync(tempTzxFile);
          recordingOutputChannel?.appendLine(
            `Cleaned up temporary TZX file: ${tempTzxFile}`,
          );
        } catch (cleanupError) {
          console.warn("Failed to clean up TZX file:", cleanupError);
        }
      }

      window.showErrorMessage(
        `Failed to process recording: ${err.message}. WAV file preserved at ${tempWavFile} for diagnosis.`,
      );
    } else {
      window.showErrorMessage(`Failed to process recording: ${err.message}`);
      cleanupTempFiles();
    }
  }
}

async function convertTzxToBasic(tzxFile: string, outputDirectory: string) {
  try {
    recordingOutputChannel?.appendLine(
      "Parsing TZX file to extract BASIC program...",
    );

    // Read TZX file
    const tzxBuffer = fs.readFileSync(tzxFile);

    // Convert TZX to TAP format first (easier to extract BASIC)
    const tapBuffer = converter.convertTzxToTap(tzxBuffer);

    if (!tapBuffer || tapBuffer.length === 0) {
      throw new Error("Failed to convert TZX to TAP format");
    }

    recordingOutputChannel?.appendLine(
      `TAP data extracted: ${tapBuffer.length} bytes`,
    );

    // Parse TAP file to extract program name from header
    const tapMetadata = converter.getTapMetadata(tapBuffer);

    let programName = "recorded-program";
    if (tapMetadata) {
      programName = tapMetadata.programName || "recorded-program";
      // Clean up program name for filename
      programName = programName
        .replace(/[^a-zA-Z0-9\-_.]/g, "_")
        .substring(0, 20)
        .trim();
      if (programName === "") {
        programName = "recorded-program";
      }
    }

    recordingOutputChannel?.appendLine(
      `Extracted program name: ${programName}`,
    );

    // Convert TAP to BASIC source
    // We need to use the converter's functionality to extract BASIC from TAP
    // For now, we'll create a simple conversion by parsing the TAP data
    const basicSource = convertTapToBasicSource(tapBuffer);

    if (!basicSource || basicSource.trim() === "") {
      throw new Error("Extracted BASIC source is empty");
    }

    // Create output file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `${programName}-${timestamp}.bas`;
    const outputFilePath = path.join(outputDirectory, outputFileName);

    // Write BASIC source to file
    fs.writeFileSync(outputFilePath, basicSource);

    recordingOutputChannel?.appendLine(
      `BASIC program saved to: ${outputFilePath}`,
    );
    recordingOutputChannel?.appendLine(
      `Program has ${basicSource.split("\n").length} lines`,
    );

    // Show success message with option to open file
    const choice = await window.showInformationMessage(
      `Successfully recorded program "${programName}" from ZX Spectrum!`,
      "Open File",
      "Show in Explorer",
    );

    if (choice === "Open File") {
      const document = await workspace.openTextDocument(outputFilePath);
      await window.showTextDocument(document);
    } else if (choice === "Show in Explorer") {
      const fileUri = Uri.file(outputFilePath);
      await commands.executeCommand("revealFileInOS", fileUri);
    }
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to convert TZX to BASIC: ${err.message}`);
    recordingOutputChannel?.appendLine(`Conversion error: ${err.message}`);
    console.error("TZX to BASIC conversion error:", err);
    throw err;
  }
}

export function convertTapToBasicSource(tapBuffer: Buffer): string {
  // TAP to BASIC conversion with proper token and number handling
  let result = "";
  let i = 0;

  // Helper function to decode ZX Spectrum 5-byte float format
  function decodeZxFloat(bytes: number[]): number {
    if (bytes.length !== 5) {
      return 0;
    }

    // Check if it's a small integer format
    if (bytes[0] === 0x00 && bytes[4] === 0x00) {
      // Small integer format: 00 sign lo hi 00
      const sign = bytes[1];
      const lo = bytes[2];
      const hi = bytes[3];

      let value = lo | (hi << 8);

      if (sign === 0xff) {
        // Negative number
        value = value - 65536;
      }

      return value;
    }

    // Full floating point format
    const sign = bytes[1] & 0x80;
    const exponent = bytes[0] - 0x81; // Remove bias
    const mantissa =
      ((bytes[1] & 0x7f) << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4];

    // Convert to JavaScript number
    let value = (mantissa / 0x80000000 + 1.0) * Math.pow(2, exponent);

    if (sign) {
      value = -value;
    }

    return value;
  }

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

        // ZX Spectrum stores line numbers as line_number * 256 for compression
        const actualLineNumber = lineNumber / 256;

        // Convert to text with token and number handling
        result += actualLineNumber + " ";
        let k = 0;
        let needsSpace = false; // Track if we need to add a space before next token

        while (k < lineContent.length) {
          const byte = lineContent[k];

          if (byte === 0x0d) {
            // End of line
            result += "\n";
            break;
          } else if (byte === 0x0e && k + 5 < lineContent.length) {
            // Number encoding: 0x0E + 5-byte float
            const floatBytes = lineContent.slice(k + 1, k + 6);
            const numberValue = decodeZxFloat(Array.from(floatBytes));

            // Skip the ASCII digits that precede the 0x0E marker
            // We need to backtrack to find where the number started
            let numStart = k;
            while (
              numStart > 0 &&
              lineContent[numStart - 1] >= 0x30 &&
              lineContent[numStart - 1] <= 0x39
            ) {
              numStart--; // Backtrack through ASCII digits
            }

            // Replace the entire number sequence with the decoded value
            if (numStart < k) {
              result = result.substring(0, result.length - (k - numStart));
            }

            result += numberValue.toString();
            k += 6; // Skip 0x0E + 5 bytes
            needsSpace = true; // Numbers are usually followed by space
          } else if (
            byte >= 0xa3 &&
            byte < TOKEN_MAP.length &&
            TOKEN_MAP[byte]?.token
          ) {
            // Tokenized keyword
            const token = TOKEN_MAP[byte]!.token;

            // Add space before token if needed (but not at start of line)
            if (
              needsSpace &&
              result.length > String(actualLineNumber).length + 1
            ) {
              result += " ";
            }

            result += token;
            needsSpace = true; // Tokens are usually followed by space
            k++;

            // Add space after token if it's not at end of line and next char is not a token
            if (
              k < lineContent.length &&
              lineContent[k] !== 0x0d &&
              lineContent[k] !== 0x0e &&
              lineContent[k] < 0xa3
            ) {
              result += " ";
            }
          } else if (isZxBlockGraphicsByte(byte)) {
            // ZX Spectrum block graphics character
            const char = zxByteToUnicode(byte);
            if (char) {
              result += char;
              needsSpace = false; // Graphics characters don't need space after them
              k++;
            } else {
              // Fallback to hex if conversion fails
              result += `[${byte.toString(16)}]`;
              k++;
            }
          } else if (byte >= 32 && byte < 127) {
            // Printable ASCII
            const char = String.fromCharCode(byte);

            // Only add space after tokens, not between regular characters
            result += char;
            needsSpace = false; // Regular characters don't need space after them
            k++;
          } else {
            // Non-printable - show as hex
            result += `[${byte.toString(16)}]`;
            k++;
          }
        }
      }
    }
  }

  return result;
}

async function stopZxRecording() {
  if (!activeRecordingProcess) {
    window.showInformationMessage("No recording in progress");
    return;
  }

  try {
    // Try graceful termination first
    activeRecordingProcess.kill("SIGTERM");

    // If still running after 1 second, force kill
    setTimeout(() => {
      if (activeRecordingProcess && !activeRecordingProcess.killed) {
        activeRecordingProcess.kill("SIGKILL");
      }
    }, 1000);

    window.showInformationMessage("Stopping recording...");
    recordingOutputChannel?.appendLine("Stopping recording process...");
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
    console.warn("Failed to clean up temporary files:", error);
  } finally {
    tempWavFile = null;
    tempTzxFile = null;
  }
}

export function deactivate() {
  // Clean up active recording on extension deactivate
  if (activeRecordingProcess) {
    try {
      activeRecordingProcess.kill("SIGKILL");
    } catch (error) {
      // Ignore errors during cleanup
    }
    activeRecordingProcess = null;
  }

  // Clean up temp files
  cleanupTempFiles();
}
