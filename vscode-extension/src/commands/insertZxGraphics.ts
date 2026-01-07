/**
 * ZX Spectrum Graphics Character Insertion Command
 * Provides an easy way to insert ZX Spectrum block graphics characters into BASIC source code
 * Uses a WebView panel to display a visual 4x4 grid picker
 */

import {
  commands,
  window,
  Position,
  TextEditor,
  ViewColumn,
  WebviewPanel,
  ExtensionContext,
} from "vscode";
import {
  getZxBlockGraphicsChars,
  unicodeToZxByte,
} from "converter/out/core/zx-charset";

let currentPanel: WebviewPanel | undefined;

export function register() {
  return commands.registerCommand("zx-basic.insertZxGraphics", async () => {
    await insertZxGraphicsCharacter();
  });
}

async function insertZxGraphicsCharacter() {
  const editor = window.activeTextEditor;
  if (!editor) {
    window.showWarningMessage("No active editor found");
    return;
  }

  if (editor.document.languageId !== "zx-basic") {
    window.showWarningMessage("This command only works in ZX BASIC files");
    return;
  }

  // Get all ZX block graphics characters
  const graphicsChars = getZxBlockGraphicsChars();

  // Build grid data for the webview
  const gridData: Array<{
    char: string;
    byte: number | null;
    row: number;
    col: number;
  }> = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const index = row * 4 + col;
      if (index < graphicsChars.length) {
        const char = graphicsChars[index];
        const byte = unicodeToZxByte(char);
        gridData.push({ char, byte, row, col });
      }
    }
  }

  // Track selected characters
  let selectedCharacters: Array<{ char: string; byte: number }> = [];

  // Create or show the webview panel
  if (currentPanel) {
    currentPanel.reveal(ViewColumn.Beside);
  } else {
    currentPanel = window.createWebviewPanel(
      "zxGraphicsPicker",
      "ZX Graphics Picker",
      ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
      },
    );

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });
  }

  // Set the webview content with the 4x4 grid
  currentPanel.webview.html = getWebviewContent(gridData);

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "addCharacter") {
      const char = message.char;
      const byte = message.byte;

      // Add character to selection
      selectedCharacters.push({ char, byte });

      // Update the webview to show current selection
      currentPanel!.webview.postMessage({
        command: "updateSelection",
        selection: selectedCharacters,
      });
    } else if (message.command === "confirmSelection") {
      if (selectedCharacters.length === 0) {
        currentPanel?.dispose();
        return;
      }

      // Insert all selected characters at cursor position(s)
      const charactersText = selectedCharacters.map((c) => c.char).join("");

      await editor.edit((editBuilder) => {
        editor.selections.forEach((selection) => {
          const position = selection.active;
          editBuilder.insert(position, charactersText);
        });
      });

      // Show success message
      const byteInfo = selectedCharacters
        .map((c) => `0x${c.byte.toString(16).toUpperCase()}`)
        .join(", ");
      window.showInformationMessage(
        `Inserted ${selectedCharacters.length} ZX graphics character(s): ${charactersText} (${byteInfo})`,
      );

      // Close the panel after insertion
      currentPanel?.dispose();
    } else if (message.command === "close") {
      currentPanel?.dispose();
    }
  });
}

function getWebviewContent(
  gridData: Array<{
    char: string;
    byte: number | null;
    row: number;
    col: number;
  }>,
): string {
  // Generate the 4x4 grid HTML
  let gridHtml = "";
  for (let row = 0; row < 4; row++) {
    gridHtml += '<div class="grid-row">';
    for (let col = 0; col < 4; col++) {
      const item = gridData.find((d) => d.row === row && d.col === col);
      if (item) {
        const byteStr =
          item.byte?.toString(16).toUpperCase().padStart(2, "0") || "??";
        gridHtml += `
          <button class="grid-cell" data-char="${encodeURIComponent(item.char)}" data-byte="${item.byte}" title="0x${byteStr}">
            <span class="char">${item.char}</span>
            <span class="byte">0x${byteStr}</span>
          </button>
        `;
      }
    }
    gridHtml += "</div>";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZX Graphics Picker</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 20px;
      color: var(--vscode-foreground);
    }
    .grid-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--vscode-editor-background);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--vscode-panel-border);
    }
    .grid-row {
      display: flex;
      gap: 8px;
    }
    .grid-cell {
      width: 80px;
      height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--vscode-button-secondaryBackground);
      border: 2px solid var(--vscode-panel-border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 8px;
    }
    .grid-cell:hover {
      background: var(--vscode-button-hoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: scale(1.05);
    }
    .grid-cell:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 2px var(--vscode-focusBorder);
    }
    .grid-cell .char {
      font-size: 32px;
      line-height: 1;
      margin-bottom: 4px;
    }
    .grid-cell .byte {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-family: monospace;
    }
    .instructions {
      margin-top: 20px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }
    .selection-preview {
      margin-top: 20px;
      background: var(--vscode-editor-background);
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--vscode-panel-border);
      min-height: 60px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .selection-title {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
      font-weight: bold;
    }
    .selection-chars {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
      min-height: 40px;
    }
    .selected-char {
      font-size: 24px;
      padding: 4px 8px;
      background: var(--vscode-button-secondaryBackground);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
    }
    .button-container {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    .close-btn, .ok-btn {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .close-btn:hover, .ok-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .ok-btn {
      background: var(--vscode-button-secondaryBackground);
    }
    .ok-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .ok-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .close-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
  <body>
    <h1>🎮 ZX Spectrum Graphics Picker</h1>
    <div class="grid-container">
      ${gridHtml}
    </div>
    <div class="selection-preview">
      <div class="selection-title">Selected Characters (click to add, Enter to confirm):</div>
      <div class="selection-chars" id="selectionChars"></div>
    </div>
    <p class="instructions">Click characters to add them to selection.<br>Press Enter to confirm, Backspace to remove last character, or ESC to cancel.</p>
    <div class="button-container">
      <button class="ok-btn" id="okBtn" disabled>OK</button>
      <button class="close-btn" id="closeBtn">Cancel</button>
    </div>
  
   <script>
      const vscode = acquireVsCodeApi();
      
      // Track selected characters
      let selectedCharacters = [];
      
      // Handle cell clicks
      document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const char = decodeURIComponent(cell.dataset.char);
          const byte = parseInt(cell.dataset.byte, 10);
          
          // Add character to selection
          selectedCharacters.push({ char, byte });
          
          // Update UI
          updateSelectionUI();
          
          // Send message to extension
          vscode.postMessage({
            command: 'addCharacter',
            char: char,
            byte: byte
          });
        });
      });
      
      // Handle OK button
      document.getElementById('okBtn').addEventListener('click', () => {
        if (selectedCharacters.length > 0) {
          vscode.postMessage({
            command: 'confirmSelection'
          });
        }
      });
      
      // Handle close button
      document.getElementById('closeBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'close' });
      });
      
      // Update selection UI
      function updateSelectionUI() {
        const selectionChars = document.getElementById('selectionChars');
        const okBtn = document.getElementById('okBtn');
        
        // Clear current selection
        selectionChars.innerHTML = '';
        
        // Add selected characters
        selectedCharacters.forEach(item => {
          const charElement = document.createElement('div');
          charElement.className = 'selected-char';
          charElement.textContent = item.char;
          charElement.title = "0x" + item.byte.toString(16).toUpperCase();
          selectionChars.appendChild(charElement);
        });
        
        // Enable/disable OK button
        okBtn.disabled = selectedCharacters.length === 0;
      }
      
      // Handle messages from extension
      window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'updateSelection') {
          selectedCharacters = message.selection;
          updateSelectionUI();
        }
      });
    
    // Keyboard navigation for the grid
    const cells = document.querySelectorAll('.grid-cell');
    let currentIndex = 0;
    
    document.addEventListener('keydown', (e) => {
      const cols = 4;
      const rows = 4;
      
      switch(e.key) {
        case 'ArrowRight':
          currentIndex = Math.min(currentIndex + 1, cells.length - 1);
          cells[currentIndex].focus();
          e.preventDefault();
          break;
        case 'ArrowLeft':
          currentIndex = Math.max(currentIndex - 1, 0);
          cells[currentIndex].focus();
          e.preventDefault();
          break;
        case 'ArrowDown':
          if (currentIndex + cols < cells.length) {
            currentIndex += cols;
            cells[currentIndex].focus();
          }
          e.preventDefault();
          break;
        case 'ArrowUp':
          if (currentIndex - cols >= 0) {
            currentIndex -= cols;
            cells[currentIndex].focus();
          }
          e.preventDefault();
          break;
        case 'Enter':
          if (selectedCharacters.length > 0) {
            vscode.postMessage({
              command: 'confirmSelection'
            });
          } else {
            // Add current cell character to selection
            cells[currentIndex].click();
          }
          e.preventDefault();
          break;
        case ' ':
          cells[currentIndex].click();
          e.preventDefault();
          break;
        case 'Backspace':
          if (selectedCharacters.length > 0) {
            // Remove the latest selected character
            selectedCharacters.pop();
            updateSelectionUI();
            
            // Send update to extension
            vscode.postMessage({
              command: 'updateSelection',
              selection: selectedCharacters
            });
          }
          e.preventDefault();
          break;
        case 'Escape':
          vscode.postMessage({ command: 'close' });
          e.preventDefault();
          break;
      }
    });
    
    // Focus first cell on load
    if (cells.length > 0) {
      cells[0].focus();
    }
  </script>
</body>
</html>`;
}

// Additional utility function for direct insertion (used by other commands)
export async function insertZxGraphicsCharacterAtPosition(
  editor: TextEditor,
  character: string,
  position: Position,
): Promise<void> {
  await editor.edit((editBuilder) => {
    editBuilder.insert(position, character);
  });
}
