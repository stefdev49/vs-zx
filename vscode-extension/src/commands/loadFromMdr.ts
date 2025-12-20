// Load from MDR (Microdrive) Command
// VS Code command to import BASIC programs from .mdr files

import {
  commands,
  window,
  workspace,
  OutputChannel,
  ProgressLocation,
  ThemeColor,
  Range,
  Position,
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as converter from 'converter';

let mdrOutputChannel: OutputChannel | null = null;

export function register() {
  return commands.registerCommand('zx-basic.loadFromMdr', async () => {
    try {
      // Show file picker for .mdr files
      const fileUris = await window.showOpenDialog({
        title: 'Select Microdrive Cartridge Image',
        filters: { 'Microdrive Images': ['mdr'] },
        canSelectMany: false,
      });

      if (!fileUris || fileUris.length === 0) {
        return; // User cancelled
      }

      const fileUri = fileUris[0];

      // Show progress
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Loading Microdrive cartridge...',
          cancellable: false,
        },
        async (progress) => {
          try {
            // Read file
            progress.report({ message: 'Reading MDR file...' });
            const fileContent = fs.readFileSync(fileUri.fsPath);

            // Validate file
            progress.report({ message: 'Validating MDR format...' });
            if (!converter.isValidMdrFile(fileContent)) {
              window.showErrorMessage(
                'Invalid MDR file format: File size or structure is incorrect',
              );
              return;
            }

            // Get file info
            const fileInfo = converter.getMdrInfo(fileContent);

            // Parse MDR file
            progress.report({ message: 'Extracting programs...' });
            const result = converter.parseMdrFile(fileContent);

            // Create output channel for detailed logging
            if (!mdrOutputChannel) {
              mdrOutputChannel = window.createOutputChannel('ZX Spectrum MDR');
            }
            mdrOutputChannel.clear();

            // Use helper function for safe logging
            const log = (message: string) => {
              if (mdrOutputChannel) {
                mdrOutputChannel.appendLine(message);
              }
            };

            log('=== MDR Cartridge Load Report ===');
            log(`File: ${path.basename(fileUri.fsPath)}`);
            log(`Cartridge: ${fileInfo.cartridgeName || 'Unknown'}`);
            log(`Write Protected: ${fileInfo.writeProtected ? 'Yes' : 'No'}`);
            log(`Sectors: ${result.metadata.sectors.length}`);
            log(`Programs Found: ${result.programs.length}`);
            log('');

            // Show errors if any
            if (result.errors && result.errors.length > 0) {
              log('=== Sector Errors ===');
              result.errors.forEach((error) => {
                log(
                  `Sector ${error.sector}: ${error.type} - ${error.message}` +
                    (error.expected !== undefined
                      ? ` (expected: ${error.expected}, got: ${error.actual})`
                      : ''),
                );
              });
              log('');
            }

            // Show summary message
            const summaryMessage =
              result.programs.length > 0
                ? `Found ${result.programs.length} program(s) in cartridge "${fileInfo.cartridgeName || 'Unknown'}"`
                : `No BASIC programs found in cartridge "${fileInfo.cartridgeName || 'Unknown'}"`;

            window
              .showInformationMessage(
                summaryMessage,
                'Show Details',
                'Open First Program',
              )
              .then((selection) => {
                if (selection === 'Show Details') {
                  mdrOutputChannel?.show(true);
                } else if (
                  selection === 'Open First Program' &&
                  result.programs.length > 0
                ) {
                  openProgramInEditor(result.programs[0]);
                }
              });

            // Open all programs in editor
            for (const program of result.programs) {
              await openProgramInEditor(program);
            }
          } catch (error) {
            const err = error as Error;
            window.showErrorMessage(`Failed to load MDR: ${err.message}`);
            if (mdrOutputChannel) {
              mdrOutputChannel.appendLine(`Error: ${err.message}`);
            }
            console.error('MDR load error:', err);
          }
        },
      );
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Failed to load MDR: ${err.message}`);
      console.error('MDR load error:', err);
    }
  });
}

async function openProgramInEditor(program: {
  name: string;
  source: string;
  sector: number;
}) {
  try {
    // Create document with ZX BASIC language
    const doc = await workspace.openTextDocument({
      language: 'zx-basic',
      content: program.source,
    });

    // Show document in editor
    const editor = await window.showTextDocument(doc);

    // Add decoration to show it came from MDR
    const decoration = window.createTextEditorDecorationType({
      before: {
        contentText: `💾 MDR Sector ${program.sector} `,
        color: new ThemeColor('editorInfo.foreground'),
      },
    });

    editor.setDecorations(decoration, [
      new Range(new Position(0, 0), new Position(0, 0)),
    ]);

    // Log to output channel
    if (mdrOutputChannel) {
      mdrOutputChannel.appendLine(
        `Opened: ${program.name} (Sector ${program.sector}, ${program.source.split('\n').length} lines)`,
      );
    }
  } catch (error) {
    const err = error as Error;
    window.showWarningMessage(
      `Failed to open program "${program.name}": ${err.message}`,
    );
    if (mdrOutputChannel) {
      mdrOutputChannel.appendLine(
        `Warning: Failed to open ${program.name}: ${err.message}`,
      );
    }
  }
}

export function deactivate() {
  // Clean up output channel
  if (mdrOutputChannel) {
    mdrOutputChannel.dispose();
    mdrOutputChannel = null;
  }
}
