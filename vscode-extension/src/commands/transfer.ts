import { commands, ExtensionContext, window, workspace, env, Uri } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import converter directly; require rs232-transfer lazily when needed so
// missing optional native modules (like serialport) don't break extension activation
const converter = require('converter');


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


      // Transfer via RS232 - require lazily to avoid activation failure if serialport is not installed
      let rs232: any;
      try {
        rs232 = require('rs232-transfer');
      } catch (err) {
        // Offer inline quick-fix actions: open docs or copy install command
        const installCmd = 'npm install --no-audit --no-fund --production serialport@^13.0.0';
        const docUrl = 'https://github.com/serialport/node-serialport';

        const choice = await window.showErrorMessage(
          'RS232 transfer is unavailable because the native "serialport" module is not installed.',
          'Copy install command',
          'Open serialport docs',
          'Ignore'
        );

        if (choice === 'Copy install command') {
          try {
            await env.clipboard.writeText(installCmd);
            window.showInformationMessage(`Install command copied to clipboard: ${installCmd}`);
          } catch (e) {
            window.showInformationMessage(`Install command: ${installCmd}`);
          }
        } else if (choice === 'Open serialport docs') {
          try {
            await env.openExternal(Uri.parse(docUrl));
          } catch (e) {
            // Fallback: show URL in message
            window.showInformationMessage(`See: ${docUrl}`);
          }
        }

        return;
      }

      await rs232.transfer(binary, port, baudRate);

      window.showInformationMessage(`Successfully transferred ${fileName} to ZX Spectrum`);
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Transfer failed: ${err.message}`);
    }
  });

  return disposable;
}
