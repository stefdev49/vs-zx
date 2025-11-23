import { commands, ExtensionContext, window, workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import converter and rs232 modules directly from source so bundler can include them
const converter = require('converter');
const rs232 = require('rs232-transfer');

export function register(): ExtensionContext['subscriptions'][0] {
  const disposable = commands.registerCommand('zx-basic.transfer', async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
      window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'zx-basic') {
      window.showErrorMessage('Not a ZX BASIC file');
      return;
    }

    // Save the document first
    await document.save();

    const content = document.getText();
    const fileName = path.basename(document.fileName, '.bas') || path.basename(document.fileName, '.zxbas');

    window.showInformationMessage('Converting and transferring to ZX Spectrum...');

    try {
      // Convert BASIC to binary
      const binary = converter.convertToBinary(content);

      // Get config for serial port
      const config = workspace.getConfiguration('zx-basic');
      const port = config.get<string>('serialPort', '/dev/ttyUSB0');
      const baudRate = config.get<number>('baudRate', 9600);

      // Transfer via RS232
      await rs232.transfer(binary, port, baudRate);

      window.showInformationMessage(`Successfully transferred ${fileName} to ZX Spectrum`);
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Transfer failed: ${err.message}`);
    }
  });

  return disposable;
}
