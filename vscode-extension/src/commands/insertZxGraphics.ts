/**
 * ZX Spectrum Graphics Character Insertion Command
 * Provides an easy way to insert ZX Spectrum block graphics characters into BASIC source code
 */

import {
  commands,
  window,
  QuickPickItem,
  Position,
  Range,
  Selection,
  TextEditor,
  TextEditorEdit,
  workspace,
} from "vscode";
import * as converter from "converter";
import {
  getZxBlockGraphicsChars,
  unicodeToZxByte,
} from "converter/out/core/zx-charset";

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

  // Create quick pick items with character preview and ZX byte code
  interface GraphicsQuickPickItem extends QuickPickItem {
    char: string;
  }

  const quickPickItems: GraphicsQuickPickItem[] = graphicsChars.map(
    (char: string) => {
      const byte = unicodeToZxByte(char);
      return {
        label: char,
        description: `ZX Byte: 0x${byte?.toString(16).toUpperCase().padStart(2, "0")}`,
        detail: getCharacterDescription(char, byte),
        char: char,
      };
    },
  );

  // Show quick pick menu
  const selectedItem = await window.showQuickPick<GraphicsQuickPickItem>(
    quickPickItems,
    {
      title: "Insert ZX Spectrum Graphics Character",
      placeHolder: "Select a graphics character to insert",
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );

  if (!selectedItem) {
    return; // User cancelled
  }

  // Insert the selected character at cursor position(s)
  await editor.edit((editBuilder) => {
    editor.selections.forEach((selection) => {
      // For multi-cursor support, insert at each cursor position
      const position = selection.active;
      editBuilder.insert(position, selectedItem.char);
    });
  });

  // Show success message with character info
  const byte = unicodeToZxByte(selectedItem.char);
  window.showInformationMessage(
    `Inserted ZX graphics character "${selectedItem.char}" (0x${byte?.toString(16).toUpperCase()})`,
  );
}

function getCharacterDescription(char: string, byte: number | null): string {
  if (!byte) return "Unknown character";

  const descriptions: Record<number, string> = {
    0x80: "FULL BLOCK - All 4 quadrants filled (solid block)",
    0x81: "QUADRANT UPPER LEFT - Top-left quadrant only",
    0x82: "QUADRANT UPPER RIGHT - Top-right quadrant only",
    0x83: "QUADRANT LOWER RIGHT - Bottom-right quadrant only",
    0x84: "QUADRANT LOWER LEFT - Bottom-left quadrant only",
    0x85: "THREE QUADRANTS - Missing top-right quadrant",
    0x86: "THREE QUADRANTS - Missing bottom-left quadrant",
    0x87: "THREE QUADRANTS - Missing bottom-right quadrant",
    0x88: "THREE QUADRANTS - Missing bottom-right quadrant (alternative)",
    0x89: "UPPER HALF BLOCK - Top half filled",
    0x8a: "LOWER HALF BLOCK - Bottom half filled",
    0x8b: "LEFT HALF BLOCK - Left half filled",
    0x8c: "RIGHT HALF BLOCK - Right half filled",
    0x8d: "QUADRANT LOWER LEFT - Alternative pattern",
    0x8f: "UPPER ONE EIGHTH BLOCK - Top row only",
  };

  return (
    descriptions[byte] ||
    `ZX Graphics Character (0x${byte.toString(16).toUpperCase()})`
  );
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
