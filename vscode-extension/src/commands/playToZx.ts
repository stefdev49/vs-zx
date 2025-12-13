import { commands, ExtensionContext, window, workspace, StatusBarAlignment, StatusBarItem, OutputChannel } from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

const converter = require('converter');

let activePlaybackProcess: child_process.ChildProcess | null = null;
let playbackStatusBar: StatusBarItem | null = null;
let playbackOutputChannel: OutputChannel | null = null;

export function register(context: ExtensionContext): ExtensionContext['subscriptions'][0] {
  // Create output channel for playback progress
  playbackOutputChannel = window.createOutputChannel('ZX Spectrum Playback');
  context.subscriptions.push(playbackOutputChannel);

  // Create status bar item
  playbackStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  playbackStatusBar.command = 'zx-basic.stopTzxPlayback';
  playbackStatusBar.tooltip = 'Click to stop playback';
  context.subscriptions.push(playbackStatusBar);

  // Register play command
  const playDisposable = commands.registerCommand('zx-basic.playToZx', async () => {
    await playToZx();
  });

  // Register stop command
  const stopDisposable = commands.registerCommand('zx-basic.stopTzxPlayback', async () => {
    await stopTzxPlayback();
  });

  context.subscriptions.push(playDisposable, stopDisposable);

  return playDisposable;
}

async function playToZx() {
  // Prevent multiple simultaneous playbacks
  if (activePlaybackProcess) {
    const choice = await window.showWarningMessage(
      'A playback is already in progress. Stop it first?',
      'Stop and Play New',
      'Cancel'
    );
    
    if (choice === 'Stop and Play New') {
      await stopTzxPlayback();
    } else {
      return;
    }
  }

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
  const fileName = path.basename(document.fileName, path.extname(document.fileName));

  // Get configuration
  const config = workspace.getConfiguration('zxBasic.tzxplay');
  const tzxplayPath = config.get<string>('path', 'tzxplay');
  const use48kMode = config.get<boolean>('mode48k', false);
  const useSine = config.get<boolean>('sine', false);

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
      }
    });

    if (!programName) {
      return; // User cancelled
    }

    // Prompt for autostart line (optional)
    const autostartInput = await window.showInputBox({
      prompt: 'Enter autostart line number (optional, leave empty for none)',
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
      }
    });

    if (autostartInput === undefined) {
      return; // User cancelled
    }

    const autostart = autostartInput && autostartInput.length > 0 
      ? parseInt(autostartInput) 
      : undefined;

    // Show progress
    window.showInformationMessage('Converting to TZX and starting playback...');
    
    // Convert BASIC to TZX
    const tzxBuffer: Buffer = converter.convertBasicToTzx(
      content,
      programName,
      autostart,
      undefined // No description needed for playback
    );

    // Prepare output channel
    if (!playbackOutputChannel) {
      playbackOutputChannel = window.createOutputChannel('ZX Spectrum Playback');
    }
    playbackOutputChannel.clear();
    playbackOutputChannel.appendLine(`Playing: ${fileName}`);
    playbackOutputChannel.appendLine(`Program name: ${programName}`);
    if (autostart !== undefined) {
      playbackOutputChannel.appendLine(`Autostart: ${autostart}`);
    }
    playbackOutputChannel.appendLine(`TZX size: ${tzxBuffer.length} bytes`);
    playbackOutputChannel.appendLine('---');
    playbackOutputChannel.show(true); // Show but don't steal focus

    // Build tzxplay arguments
    const args = ['-v']; // Always verbose for progress
    if (use48kMode) {
      args.push('-K');
    }
    if (useSine) {
      args.push('-S');
    }

    // Spawn tzxplay process
    activePlaybackProcess = child_process.spawn(tzxplayPath, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Update status bar
    if (playbackStatusBar) {
      playbackStatusBar.text = '$(play) Playing to ZX...';
      playbackStatusBar.show();
    }

    let blockCount = 0;
    let currentBlock = 0;

    // Handle stdout (progress information)
    activePlaybackProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      playbackOutputChannel?.append(output);

      // Parse progress (tzxplay verbose output shows block information)
      const blockMatch = output.match(/Block\s+#?(\d+)/i);
      if (blockMatch) {
        currentBlock = parseInt(blockMatch[1]);
        if (playbackStatusBar) {
          playbackStatusBar.text = `$(play) Playing: Block ${currentBlock}${blockCount > 0 ? `/${blockCount}` : ''}`;
        }
      }

      // Try to determine total blocks
      const totalMatch = output.match(/(\d+)\s+blocks?/i);
      if (totalMatch && blockCount === 0) {
        blockCount = parseInt(totalMatch[1]);
      }
    });

    // Handle stderr (errors and additional info)
    activePlaybackProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      playbackOutputChannel?.append(output);
    });

    // Handle process exit
    activePlaybackProcess.on('exit', (code, signal) => {
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        playbackOutputChannel?.appendLine('---');
        playbackOutputChannel?.appendLine('Playback stopped by user');
      } else if (code === 0) {
        playbackOutputChannel?.appendLine('---');
        playbackOutputChannel?.appendLine('Playback completed successfully');
        window.showInformationMessage('Playback completed');
      } else {
        playbackOutputChannel?.appendLine('---');
        playbackOutputChannel?.appendLine(`Playback failed with code ${code}`);
        window.showErrorMessage(`Playback failed with exit code ${code}`);
      }

      // Clean up
      if (playbackStatusBar) {
        playbackStatusBar.hide();
      }
      activePlaybackProcess = null;
    });

    // Handle process errors
    activePlaybackProcess.on('error', (err) => {
      playbackOutputChannel?.appendLine('---');
      playbackOutputChannel?.appendLine(`Error: ${err.message}`);
      
      if (err.message.includes('ENOENT')) {
        window.showErrorMessage(
          `tzxplay not found. Please install tzxplay or configure the path in settings.`,
          'Open Settings'
        ).then(choice => {
          if (choice === 'Open Settings') {
            commands.executeCommand('workbench.action.openSettings', 'zxBasic.tzxplay.path');
          }
        });
      } else {
        window.showErrorMessage(`Playback error: ${err.message}`);
      }

      // Clean up
      if (playbackStatusBar) {
        playbackStatusBar.hide();
      }
      activePlaybackProcess = null;
    });

    // Write TZX data to stdin
    if (activePlaybackProcess.stdin) {
      activePlaybackProcess.stdin.write(tzxBuffer);
      activePlaybackProcess.stdin.end();
    }

  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to play TZX: ${err.message}`);
    playbackOutputChannel?.appendLine(`Error: ${err.message}`);
    console.error('Play to ZX error:', err);
    
    // Clean up on error
    if (playbackStatusBar) {
      playbackStatusBar.hide();
    }
    activePlaybackProcess = null;
  }
}

async function stopTzxPlayback() {
  if (!activePlaybackProcess) {
    window.showInformationMessage('No playback in progress');
    return;
  }

  try {
    // Try graceful termination first
    activePlaybackProcess.kill('SIGTERM');

    // If still running after 1 second, force kill
    setTimeout(() => {
      if (activePlaybackProcess && !activePlaybackProcess.killed) {
        activePlaybackProcess.kill('SIGKILL');
      }
    }, 1000);

    window.showInformationMessage('Stopping playback...');
  } catch (error) {
    const err = error as Error;
    window.showErrorMessage(`Failed to stop playback: ${err.message}`);
  }
}

export function deactivate() {
  // Clean up active playback on extension deactivate
  if (activePlaybackProcess) {
    try {
      activePlaybackProcess.kill('SIGKILL');
    } catch (error) {
      // Ignore errors during cleanup
    }
    activePlaybackProcess = null;
  }
}
