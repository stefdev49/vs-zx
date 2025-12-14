import { window, commands, ExtensionContext, Position, TextEdit } from "vscode";
import {
  getCurrentDocument,
  getSelectionRange,
  findNextAvailableLineNumber,
  generateUniqueVariableName,
  inferVariableType,
  isValidExpression,
  getLineNumberAtPosition,
} from "./refactorUtils";

export function extractVariable() {
  const document = getCurrentDocument();
  if (!document) {
    window.showErrorMessage("No active ZX BASIC document found");
    return;
  }

  if (document.languageId !== "zx-basic") {
    window.showErrorMessage(
      "Extract Variable is only available for ZX BASIC files",
    );
    return;
  }

  const editor = window.activeTextEditor;
  if (!editor) {
    window.showErrorMessage("No active editor found");
    return;
  }

  const selectionRange = getSelectionRange(document);
  if (!selectionRange) {
    window.showErrorMessage("No text selected");
    return;
  }

  const selectedText = document.getText(selectionRange);
  if (!isValidExpression(selectedText)) {
    window.showErrorMessage(
      "Selected text is not a valid expression for variable extraction",
    );
    return;
  }

  // Find next available line number for the new LET statement
  // Start from the current line number to maintain sequencing
  const currentLineNumber = getLineNumberAtPosition(
    document,
    selectionRange.start,
  );
  const startFrom = currentLineNumber ? parseInt(currentLineNumber) + 10 : 10;
  const newLineNumber = findNextAvailableLineNumber(document, startFrom);

  // Infer variable type and generate name
  const varType = inferVariableType(selectedText);
  const baseName = "result";
  const varName = generateUniqueVariableName(baseName, document);
  const fullVarName = varName + varType.suffix;

  // Create the LET statement with line number and proper spacing
  // Ensure there's a space after LET and around operators
  const spacedExpression = selectedText.trim().replace(/([+\-*/()])/g, " $1 ");
  const letStatement = `${newLineNumber} LET ${fullVarName} = ${spacedExpression.trim()}`;

  // Create text edits
  const edits: TextEdit[] = [];

  // Add LET statement before the current line
  const lineStart = new Position(selectionRange.start.line, 0);
  edits.push(TextEdit.insert(lineStart, `${letStatement}\n`));

  // Replace the selected expression with the variable
  // Get the text before and after the selection to determine proper spacing
  const lineText = document.lineAt(selectionRange.start.line).text;
  const textBefore = lineText.substring(0, selectionRange.start.character);
  const textAfter = lineText.substring(selectionRange.end.character);

  // Add space before variable if needed (e.g., after PRINT, LET, etc.)
  let replacement = fullVarName;
  if (
    textBefore.trim().length > 0 &&
    !textBefore.endsWith(" ") &&
    !textBefore.endsWith("=")
  ) {
    replacement = " " + replacement;
  }

  // Add space after variable if needed
  if (
    textAfter.trim().length > 0 &&
    !textAfter.startsWith(" ") &&
    !textAfter.startsWith("\n")
  ) {
    replacement = replacement + " ";
  }

  edits.push(TextEdit.replace(selectionRange, replacement));

  // Apply the edits
  editor
    .edit((editBuilder) => {
      edits.forEach((edit) => {
        editBuilder.replace(edit.range, edit.newText);
      });
    })
    .then((success) => {
      if (success) {
        window.showInformationMessage(
          `Extracted expression to variable ${fullVarName}`,
        );
      } else {
        window.showErrorMessage("Failed to extract variable");
      }
    });
}

export function register(): ExtensionContext["subscriptions"][0] {
  return commands.registerCommand("zx-basic.extractVariable", extractVariable);
}
