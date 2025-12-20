// Save to MDR (Microdrive) Command
// VS Code command to export BASIC programs to .mdr files

import {
  commands,
  window,
  workspace,
  Uri,
  OutputChannel,
  ProgressLocation,
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as converter from 'converter';

let mdrOutputChannel: OutputChannel | null = null;

export function register() {
  return commands.registerCommand('zx-basic.saveToMdr', async () => {
    try {
      // Get active editor
      const editor = window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'zx-basic') {
        window.showErrorMessage('Active editor must be a ZX BASIC file');
        return;
      }

      // Get cartridge name
      const cartridgeName = await window.showInputBox({
        title: 'Microdrive Cartridge Name',
        prompt: 'Enter cartridge name (max 10 characters)',
        value: 'ZXBASIC',
        validateInput: (value) => {
          if (value.length > 10) {
            return 'Cartridge name must be 10 characters or less';
          }
          if (value.trim().length === 0) {
            return 'Cartridge name cannot be empty';
          }
          return null;
        },
      });

      if (!cartridgeName) return; // User cancelled

      // Get program name (from filename or ask user)
      const defaultProgramName =
        path.basename(editor.document.fileName, '.bas') || 'PROGRAM';
      const programName = await window.showInputBox({
        title: 'Program Name',
        prompt: 'Enter program name (max 10 characters)',
        value: defaultProgramName.substring(0, 10),
        validateInput: (value) => {
          if (value.length > 10) {
            return 'Program name must be 10 characters or less';
          }
          if (value.trim().length === 0) {
            return 'Program name cannot be empty';
          }
          return null;
        },
      });

      if (!programName) return; // User cancelled

      // Get save location
      const defaultFileName = `${cartridgeName.replace(/[^a-zA-Z0-9]/g, '_')}.mdr`;
      const defaultUri = workspace.workspaceFolders?.[0]?.uri;
      const saveUri = await window.showSaveDialog({
        title: 'Save Microdrive Cartridge',
        filters: { 'Microdrive Images': ['mdr'] },
        defaultUri: defaultUri
          ? Uri.joinPath(defaultUri, defaultFileName)
          : undefined,
      });

      if (!saveUri) return; // User cancelled

      // Show progress
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Creating Microdrive cartridge...',
          cancellable: false,
        },
        async (progress) => {
          try {
            // Create output channel for logging
            if (!mdrOutputChannel) {
              mdrOutputChannel = window.createOutputChannel('ZX Spectrum MDR');
            }
            mdrOutputChannel.clear();

            const log = (message: string) => {
              if (mdrOutputChannel) {
                mdrOutputChannel.appendLine(message);
              }
            };

            // Convert to MDR
            progress.report({ message: 'Converting to MDR format...' });
            log('=== Creating MDR Cartridge ===');
            log(`Source: ${path.basename(editor.document.fileName)}`);
            log(`Cartridge: ${cartridgeName}`);
            log(`Program: ${programName}`);
            log(`Lines: ${editor.document.lineCount}`);
            log('');

            const mdrBuffer = converter.createMdrFile(
              editor.document.getText(),
              programName,
              cartridgeName,
            );

            // Save file
            progress.report({ message: 'Writing MDR file...' });
            fs.writeFileSync(saveUri.fsPath, mdrBuffer);

            log(`Saved: ${path.basename(saveUri.fsPath)}`);
            log(`Size: ${mdrBuffer.length} bytes`);
            log(`Location: ${saveUri.fsPath}`);
            log('');
            log('✅ MDR cartridge created successfully!');

            // Show success message
            window
              .showInformationMessage(
                `Successfully saved to MDR: ${path.basename(saveUri.fsPath)}`,
                'Show Details',
                'Open File Location',
              )
              .then((selection) => {
                if (selection === 'Show Details') {
                  mdrOutputChannel?.show(true);
                } else if (selection === 'Open File Location') {
                  commands.executeCommand('revealFileInOS', saveUri);
                }
              });
          } catch (error) {
            const err = error as Error;
            window.showErrorMessage(`Failed to save MDR: ${err.message}`);
            if (mdrOutputChannel) {
              mdrOutputChannel.appendLine(`Error: ${err.message}`);
            }
            console.error('MDR save error:', err);
          }
        },
      );
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Failed to save MDR: ${err.message}`);
      console.error('MDR save error:', err);
    }
  });
}

export function deactivate() {
  // Clean up output channel
  if (mdrOutputChannel) {
    mdrOutputChannel.dispose();
    mdrOutputChannel = null;
  }
}
