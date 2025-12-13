import {
  window,
  commands,
  ExtensionContext,
  TextDocument,
  TextEdit,
  Range,
} from "vscode";
import { getCurrentDocument } from "./refactorUtils";

export function renumberLines() {
  const document = getCurrentDocument();
  if (!document) {
    window.showErrorMessage("No active ZX BASIC document found");
    return;
  }

  if (document.languageId !== "zx-basic") {
    window.showErrorMessage(
      "Line Renumbering is only available for ZX BASIC files",
    );
    return;
  }

  const editor = window.activeTextEditor;
  if (!editor) {
    window.showErrorMessage("No active editor found");
    return;
  }

  // Show options for renumbering
  const options = [
    "Increment by 10",
    "Increment by 20",
    "Increment by 50",
    "Increment by 100",
    "Custom...",
  ];

  window
    .showQuickPick(options, {
      placeHolder: "Select line number increment strategy",
    })
    .then((selectedOption) => {
      if (!selectedOption) return;

      let increment: number;
      if (selectedOption === "Custom...") {
        // Ask for custom increment
        window
          .showInputBox({
            prompt: "Enter custom increment value (e.g., 15, 25, 100)",
            value: "10",
            validateInput: (value) => {
              const num = parseInt(value);
              if (isNaN(num) || num <= 0 || num > 1000) {
                return "Please enter a valid number between 1 and 1000";
              }
              return null;
            },
          })
          .then((customValue) => {
            if (!customValue) return;
            increment = parseInt(customValue);
            performRenumbering(document, editor, increment);
          });
      } else {
        increment = parseInt(selectedOption.match(/\d+/)?.[0] || "10");
        performRenumbering(document, editor, increment);
      }
    });
}

function performRenumbering(
  document: TextDocument,
  editor: any,
  increment: number,
) {
  const text = document.getText();
  const lines = text.split("\n");
  const edits: TextEdit[] = [];

  // Parse all line numbers and their positions
  const lineNumbers: {
    original: string;
    lineIndex: number;
    charIndex: number;
  }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\d+)/);
    if (match) {
      lineNumbers.push({
        original: match[1],
        lineIndex: i,
        charIndex: match.index || 0,
      });
    }
  }

  if (lineNumbers.length === 0) {
    window.showInformationMessage("No line numbers found to renumber");
    return;
  }

  // Sort line numbers by their numeric value
  lineNumbers.sort((a, b) => parseInt(a.original) - parseInt(b.original));

  // Generate new line numbers
  let currentLineNumber = increment;
  const lineNumberMap = new Map<string, string>();

  lineNumbers.forEach((entry) => {
    lineNumberMap.set(entry.original, currentLineNumber.toString());
    currentLineNumber += increment;
  });

  // Create text edits for line number changes
  lineNumbers.forEach((entry) => {
    const newLineNumber = lineNumberMap.get(entry.original);
    if (newLineNumber) {
      const range = new Range(
        entry.lineIndex,
        entry.charIndex,
        entry.lineIndex,
        entry.charIndex + entry.original.length,
      );
      edits.push(new TextEdit(range, newLineNumber));
    }
  });

  // Update GOTO and GOSUB statements
  const gotoPattern = /\b(GOTO|GO\s+TO|GOSUB|GO\s+SUB)\s+(\d+)/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = gotoPattern.exec(line)) !== null) {
      const targetLineNumber = match[2];
      const newTarget = lineNumberMap.get(targetLineNumber);

      if (newTarget) {
        let startPos = match.index + match[1].length;
        while (startPos < line.length && line[startPos] === " ") {
          startPos++;
        }

        const range = new Range(
          i,
          startPos,
          i,
          startPos + targetLineNumber.length,
        );
        edits.push(new TextEdit(range, newTarget));
      }
    }
  }

  // Apply all edits
  editor
    .edit((editBuilder: any) => {
      edits.forEach((edit: any) => {
        editBuilder.replace(edit.range, edit.newText);
      });
    })
    .then((success: boolean) => {
      if (success) {
        window.showInformationMessage(
          `Renumbered ${lineNumbers.length} lines with increment ${increment}`,
        );
      } else {
        window.showErrorMessage("Failed to renumber lines");
      }
    });
}

export function register(): ExtensionContext["subscriptions"][0] {
  return commands.registerCommand("zx-basic.renumberLines", renumberLines);
}
