import { window, commands, ExtensionContext, TextEdit } from 'vscode';
import {
  getCurrentDocument,
  getSelectionRange,
  getLineNumberAtPosition,
  findNextAvailableLineNumber,
  getLastLineNumber,
  generateUniqueVariableName,
  removeLineNumbers,
} from './refactorUtils';

export function extractSubroutine() {
  const document = getCurrentDocument();
  if (!document) {
    window.showErrorMessage('No active ZX BASIC document found');
    return;
  }

  if (document.languageId !== 'zx-basic') {
    window.showErrorMessage(
      'Extract Subroutine is only available for ZX BASIC files',
    );
    return;
  }

  const editor = window.activeTextEditor;
  if (!editor) {
    window.showErrorMessage('No active editor found');
    return;
  }

  const selectionRange = getSelectionRange(document);
  if (!selectionRange) {
    window.showErrorMessage('No text selected for subroutine extraction');
    return;
  }

  // Get selected text
  const selectedText = document.getText(selectionRange);
  if (!selectedText || selectedText.trim() === '') {
    window.showErrorMessage('Selected text is empty or invalid');
    return;
  }

  // Find line numbers for subroutine
  // Place subroutine at the end of the program with high line numbers
  const lastLineNumber = getLastLineNumber(document);
  const subroutineLineNumber = findNextAvailableLineNumber(
    document,
    lastLineNumber ? lastLineNumber + 100 : 1000,
  );

  // Generate subroutine name
  const subroutineName = generateUniqueVariableName('SUB', document);

  // Calculate line numbers for the subroutine
  const remLineNumber = subroutineLineNumber;
  const codeLineNumber = subroutineLineNumber + 10;

  // Remove line numbers from selected text
  const cleanedText = removeLineNumbers(selectedText);

  // Calculate return line number based on number of lines in extracted code
  const extractedLines = cleanedText
    .split('\n')
    .filter((line) => line.trim() !== '');
  const returnLineNumber = codeLineNumber + extractedLines.length * 10;

  // Add line numbers to each line of the extracted code with proper sequencing
  const linesWithNumbers = extractedLines.map((line, index) => {
    const lineNumber = codeLineNumber + index * 10;
    // Ensure proper spacing after line number
    return `${lineNumber} ${line.trim()}`;
  });

  // Create subroutine text
  const subroutineText = `
${remLineNumber} REM Subroutine ${subroutineName}
${linesWithNumbers.join('\n')}
${returnLineNumber} RETURN`;

  // Create GOSUB call with line number
  // Find the line number of the first line in the selection
  const firstLineNumber = getLineNumberAtPosition(
    document,
    selectionRange.start,
  );
  const gosubLineNumber =
    firstLineNumber || findNextAvailableLineNumber(document, 10);
  const gosubCall = `${gosubLineNumber} GOSUB ${subroutineLineNumber}`;

  // The extractSubroutine feature will:
  // 1. Extract the selected code block
  // 2. Move it to the end of the program
  // 3. Replace the selection with a GOSUB call
  // 4. Properly renumber all moved lines

  // Create text edits
  const edits: TextEdit[] = [];

  // Replace selected text with GOSUB call
  edits.push(TextEdit.replace(selectionRange, gosubCall));

  // Add subroutine at the end of the document
  const lastLine = document.lineAt(document.lineCount - 1);
  const endPosition = lastLine.range.end;
  edits.push(TextEdit.insert(endPosition, subroutineText));

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
          `Extracted subroutine ${subroutineName} at line ${subroutineLineNumber}`,
        );
      } else {
        window.showErrorMessage('Failed to extract subroutine');
      }
    });
}

export function register(): ExtensionContext['subscriptions'][0] {
  return commands.registerCommand(
    'zx-basic.extractSubroutine',
    extractSubroutine,
  );
}
