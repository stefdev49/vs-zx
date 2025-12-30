import {
  commands,
  ExtensionContext,
  window,
  workspace,
  env,
  Uri,
} from 'vscode';
import * as path from 'path';

// Import converter directly; require rs232-transfer lazily when needed so
// missing optional native modules (like serialport) don't break extension activation
import * as converter from 'converter';

/**
 * Lazily load RS232 module with helpful error message
 */
async function getRS232Module(): Promise<any> {
  try {
    return require('rs232-transfer');
  } catch (err) {
    // Offer inline quick-fix actions: open docs or copy install command
    const installCmd =
      'npm install --no-audit --no-fund --production serialport@^13.0.0';
    const docUrl = 'https://github.com/serialport/node-serialport';

    const choice = await window.showErrorMessage(
      'RS232 transfer is unavailable because the native "serialport" module is not installed.',
      'Copy install command',
      'Open serialport docs',
      'Ignore',
    );

    if (choice === 'Copy install command') {
      try {
        await env.clipboard.writeText(installCmd);
        window.showInformationMessage(
          `Install command copied to clipboard: ${installCmd}`,
        );
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

    return null;
  }
}

/**
 * Get RS232 options from VS Code configuration
 */
function getRS232Options() {
  const config = workspace.getConfiguration('zxBasic.rs232');
  return {
    port: config.get<string>('port', '/dev/ttyUSB0'),
    baudRate: config.get<number>('baudRate', 9600),
    mode: config.get<'binary' | 'text'>('mode', 'binary'),
    timeout: config.get<number>('timeout', 30000),
    handshaking: config.get<boolean>('handshaking', true),
  };
}

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
    const fileName =
      path.basename(document.fileName, '.bas') ||
      path.basename(document.fileName, '.zxbas');

    // Get RS232 module
    const rs232 = await getRS232Module();
    if (!rs232) {
      return;
    }

    // Get RS232 options from settings
    const options = getRS232Options();

    window.showInformationMessage(
      `Sending ${fileName} to ZX Spectrum via ${options.port} at ${options.baudRate} baud...`,
    );

    try {
      // Convert BASIC to binary
      const binary = converter.convertToBinary(content);

      // Send using the new API with proper block format
      const result = await rs232.sendProgram(binary, fileName, options);

      if (result.success) {
        window.showInformationMessage(
          `Successfully transferred ${fileName} (${result.bytesTransferred} bytes) to ZX Spectrum`,
        );
      } else {
        window.showErrorMessage(`Transfer failed: ${result.error}`);
      }
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Transfer failed: ${err.message}`);
    }
  });

  return disposable;
}

/**
 * Register the receive command for receiving programs from ZX Spectrum
 */
export function registerReceive(): ExtensionContext['subscriptions'][0] {
  const disposable = commands.registerCommand('zx-basic.receiveFromZx', async () => {
    // Get RS232 module
    const rs232 = await getRS232Module();
    if (!rs232) {
      return;
    }

    // Get RS232 options from settings
    const options = getRS232Options();

    window.showInformationMessage(
      `Waiting to receive from ZX Spectrum via ${options.port} at ${options.baudRate} baud...\n` +
      `On the Spectrum, type: FORMAT "b";${options.baudRate}: SAVE *"b" "PROGRAM"`,
    );

    try {
      const result = await rs232.receiveProgram(options);

      if (result.success && result.data && result.header) {
        // For now, display received data as hex dump since decompilation isn't implemented yet
        // TODO: Implement convertFromBinary in converter module
        const filename = result.header.filename.trim() || 'RECEIVED';
        const hexDump = result.data.toString('hex').match(/.{1,32}/g)?.join('\n') || '';
        const content = `; Received: ${filename}\n; Size: ${result.data.length} bytes\n; Raw data (hex):\n${hexDump}`;

        // Create a new untitled document with the received data
        const doc = await workspace.openTextDocument({
          language: 'zx-basic',
          content: content,
        });

        await window.showTextDocument(doc);

        window.showInformationMessage(
          `Successfully received "${filename}" (${result.bytesReceived} bytes) from ZX Spectrum`,
        );
      } else {
        window.showErrorMessage(`Receive failed: ${result.error}`);
      }
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Receive failed: ${err.message}`);
    }
  });

  return disposable;
}

/**
 * Register the connection test command
 */
export function registerTest(): ExtensionContext['subscriptions'][0] {
  const disposable = commands.registerCommand('zx-basic.testRS232', async () => {
    // Get RS232 module
    const rs232 = await getRS232Module();
    if (!rs232) {
      return;
    }

    // Get RS232 options from settings
    const options = getRS232Options();

    window.showInformationMessage(`Testing RS232 connection on ${options.port}...`);

    try {
      const result = await rs232.testConnection(options);

      if (result.success && result.signals) {
        const signalStatus = [
          `CTS: ${result.signals.cts ? '✓' : '✗'}`,
          `DSR: ${result.signals.dsr ? '✓' : '✗'}`,
          `DCD: ${result.signals.dcd ? '✓' : '✗'}`,
        ].join(', ');

        window.showInformationMessage(
          `RS232 connection OK on ${options.port}\nSignals: ${signalStatus}`,
        );
      } else {
        window.showErrorMessage(`RS232 test failed: ${result.error}`);
      }
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`RS232 test failed: ${err.message}`);
    }
  });

  return disposable;
}

/**
 * Register command to list available serial ports
 */
export function registerListPorts(): ExtensionContext['subscriptions'][0] {
  const disposable = commands.registerCommand('zx-basic.listSerialPorts', async () => {
    // Get RS232 module
    const rs232 = await getRS232Module();
    if (!rs232) {
      return;
    }

    try {
      const ports = await rs232.listPorts();

      if (ports.length === 0) {
        window.showWarningMessage('No serial ports found');
        return;
      }

      interface PortItem {
        label: string;
        description: string;
      }

      const items: PortItem[] = ports.map((p: { path: string; manufacturer?: string }) => ({
        label: p.path,
        description: p.manufacturer || '',
      }));

      const selected = await window.showQuickPick(items, {
        placeHolder: 'Select a serial port to configure',
      });

      if (selected) {
        // Update the configuration
        const config = workspace.getConfiguration('zxBasic.rs232');
        await config.update('port', selected.label, true);
        window.showInformationMessage(`RS232 port set to ${selected.label}`);
      }
    } catch (error) {
      const err = error as Error;
      window.showErrorMessage(`Failed to list ports: ${err.message}`);
    }
  });

  return disposable;
}
