import { commands, ExtensionContext, window, Uri } from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as converter from 'converter';

export function register(): ExtensionContext['subscriptions'][0] {
  const disposable = commands.registerCommand(
    'zx-basic.saveAsTzx',
    async () => {
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
      const fileName = path.basename(
        document.fileName,
        path.extname(document.fileName),
      );
      const dirName = path.dirname(document.fileName);

      try {
        // Prompt for program name
        const programName = await window.showInputBox({
          prompt: 'Enter program name (max 10 characters)',
          value: fileName.substring(0, 10),
          validateInput: (value) => {
            if (!value || value.length === 0) {
              return 'Program name cannot be empty';
            }
            if (value.length > 10) {
              return 'Program name must be 10 characters or less';
            }
            return null;
          },
        });

        if (!programName) {
          return; // User cancelled
        }

        // Prompt for autostart line (optional)
        const autostartInput = await window.showInputBox({
          prompt:
            'Enter autostart line number (optional, leave empty for none)',
          placeHolder: 'e.g., 10',
          validateInput: (value) => {
            if (!value || value.length === 0) {
              return null; // Empty is valid
            }
            const lineNum = parseInt(value);
            if (isNaN(lineNum) || lineNum < 0 || lineNum > 9999) {
              return 'Line number must be between 0 and 9999';
            }
            return null;
          },
        });

        if (autostartInput === undefined) {
          return; // User cancelled
        }

        const autostart =
          autostartInput && autostartInput.length > 0
            ? parseInt(autostartInput)
            : undefined;

        // Prompt for description (optional)
        const description = await window.showInputBox({
          prompt: 'Enter description (optional)',
          placeHolder: 'e.g., ZX BASIC program converted from VS Code',
        });

        if (description === undefined) {
          return; // User cancelled
        }

        // Convert BASIC to TZX
        window.showInformationMessage('Converting to TZX format...');

        const tzxBuffer: Buffer = converter.convertBasicToTzx(
          content,
          programName,
          autostart,
          description || undefined,
        );

        // Prompt for save location
        const defaultUri = Uri.file(path.join(dirName, `${fileName}.tzx`));
        const saveUri = await window.showSaveDialog({
          defaultUri,
          filters: {
            'TZX Files': ['tzx'],
            'All Files': ['*'],
          },
          title: 'Save as TZX',
        });

        if (!saveUri) {
          return; // User cancelled
        }

        // Write TZX file
        await fs.writeFile(saveUri.fsPath, tzxBuffer);

        // Show success message with option to reveal file
        const choice = await window.showInformationMessage(
          `Successfully saved ${path.basename(saveUri.fsPath)} (${tzxBuffer.length} bytes)`,
          'Reveal in Explorer',
          'OK',
        );

        if (choice === 'Reveal in Explorer') {
          await commands.executeCommand('revealFileInOS', saveUri);
        }
      } catch (error) {
        const err = error as Error;
        window.showErrorMessage(`Failed to save TZX: ${err.message}`);
        console.error('Save as TZX error:', err);
      }
    },
  );

  return disposable;
}
