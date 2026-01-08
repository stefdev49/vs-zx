/**
 * Line movement commands with automatic renumbering for ZX BASIC
 * Provides Alt+Up/Down functionality to move lines while maintaining valid line numbering
 *
 * Technical decisions:
 * - Gap exhaustion: Auto-renumber entire file when no room exists
 * - Multi-line move: Dynamic spacing based on available gap
 * - Reference updates: Current file only (matches ZX BASIC single-file nature)
 */

import {
  commands,
  window,
  Position,
  Range,
  Selection,
} from "vscode";
import {
  parseLineNumber,
  generateLineNumbersInGap,
  updateLineReferences,
} from "../utils/lineUtils";

/**
 * Move selected lines up with automatic renumbering
 */
async function moveLineUp() {
  const editor = window.activeTextEditor;
  if (!editor || editor.document.languageId !== "zx-basic") {
    // Silently fall through to default behavior for non-BASIC files
    return commands.executeCommand("editor.action.moveLinesUpAction");
  }

  const selection = editor.selection;
  const startLine = selection.start.line;
  const endLine = selection.end.line;

  if (startLine === 0) {
    // Can't move first line up - do nothing
    return;
  }

  const document = editor.document;
  const lines: string[] = [];
  for (let i = 0; i < document.lineCount; i++) {
    lines.push(document.lineAt(i).text);
  }

  // Lines to move (the selected block)
  const movedLines = lines.slice(startLine, endLine + 1);
  // The line that will be displaced (moves down)
  const displacedLine = lines[startLine - 1];

  // Parse line numbers
  const movedLineNums = movedLines.map((l) => parseLineNumber(l));
  const displacedLineNum = parseLineNumber(displacedLine);

  // After move: displaced line goes after the moved block
  // New neighbors for moved block: line at (startLine - 2) and displaced line's old position becomes after
  const lineAboveIdx = startLine - 2;
  const lineBelowIdx = endLine + 1;

  const lineAboveNum = lineAboveIdx >= 0 ? parseLineNumber(lines[lineAboveIdx]) : null;
  const lineBelowNum = lineBelowIdx < lines.length ? parseLineNumber(lines[lineBelowIdx]) : null;

  // Compute new line numbers for the moved block (it now sits between lineAbove and displacedLine)
  const newMovedNums = generateLineNumbersInGap(
    lineAboveNum,
    displacedLineNum,
    movedLines.length
  );

  // Compute new line number for the displaced line (it now sits between moved block and lineBelow)
  const lastMovedNewNum = newMovedNums.length > 0 ? newMovedNums[newMovedNums.length - 1] : lineAboveNum;
  const newDisplacedNums = generateLineNumbersInGap(lastMovedNewNum, lineBelowNum, 1);

  if (!newMovedNums.length || !newDisplacedNums.length) {
    const choice = await window.showWarningMessage(
      "Not enough room between line numbers. Renumber entire file?",
      "Renumber",
      "Cancel"
    );
    if (choice === "Renumber") {
      await commands.executeCommand("zx-basic.renumberLines");
    }
    return;
  }

  // Build the renumbering map for GOTO/GOSUB updates
  const renumberMap = new Map<number, number>();
  for (let i = 0; i < movedLineNums.length; i++) {
    if (movedLineNums[i] !== null) {
      renumberMap.set(movedLineNums[i]!, newMovedNums[i]);
    }
  }
  if (displacedLineNum !== null) {
    renumberMap.set(displacedLineNum, newDisplacedNums[0]);
  }

  // Build the new document content
  const newLines = [...lines];

  // Update moved lines with new numbers
  for (let i = 0; i < movedLines.length; i++) {
    const newNum = newMovedNums[i];
    newLines[startLine + i] = movedLines[i].replace(/^\d+/, newNum.toString());
  }

  // Update displaced line with new number
  newLines[startLine - 1] = displacedLine.replace(/^\d+/, newDisplacedNums[0].toString());

  // Swap positions: move block goes up, displaced goes down
  const movedBlock = newLines.slice(startLine, endLine + 1);
  const displacedBlock = [newLines[startLine - 1]];
  newLines.splice(startLine - 1, endLine - startLine + 2, ...movedBlock, ...displacedBlock);

  // Update all GOTO/GOSUB references
  let fullText = newLines.join("\n");
  Array.from(renumberMap.entries()).forEach(([oldNum, newNum]) => {
    fullText = updateLineReferences(fullText, oldNum, newNum);
  });

  // Apply the edit
  const fullRange = new Range(0, 0, document.lineCount, 0);
  await editor.edit((editBuilder) => {
    editBuilder.replace(fullRange, fullText);
  });

  // Update selection to follow the moved lines
  const newStartLine = startLine - 1;
  const newEndLine = newStartLine + movedLines.length - 1;
  editor.selection = new Selection(
    new Position(newStartLine, 0),
    new Position(newEndLine, newLines[newEndLine]?.length || 0)
  );
}

/**
 * Move selected lines down with automatic renumbering
 */
async function moveLineDown() {
  const editor = window.activeTextEditor;
  if (!editor || editor.document.languageId !== "zx-basic") {
    // Silently fall through to default behavior for non-BASIC files
    return commands.executeCommand("editor.action.moveLinesDownAction");
  }

  const selection = editor.selection;
  const startLine = selection.start.line;
  const endLine = selection.end.line;

  const document = editor.document;
  if (endLine >= document.lineCount - 1) {
    // Can't move last line down - do nothing
    return;
  }

  const lines: string[] = [];
  for (let i = 0; i < document.lineCount; i++) {
    lines.push(document.lineAt(i).text);
  }

  // Lines to move (the selected block)
  const movedLines = lines.slice(startLine, endLine + 1);
  // The line that will be displaced (moves up)
  const displacedLine = lines[endLine + 1];

  // Parse line numbers
  const movedLineNums = movedLines.map((l) => parseLineNumber(l));
  const displacedLineNum = parseLineNumber(displacedLine);

  // After move: displaced line goes before the moved block
  const lineAboveIdx = startLine - 1;
  const lineBelowIdx = endLine + 2;

  const lineAboveNum = lineAboveIdx >= 0 ? parseLineNumber(lines[lineAboveIdx]) : null;
  const lineBelowNum = lineBelowIdx < lines.length ? parseLineNumber(lines[lineBelowIdx]) : null;

  // Compute new line number for the displaced line (it now sits between lineAbove and moved block)
  const firstMovedNum = movedLineNums[0];
  const newDisplacedNums = generateLineNumbersInGap(lineAboveNum, firstMovedNum, 1);

  // Compute new line numbers for the moved block (it now sits between displaced and lineBelow)
  const newMovedNums = generateLineNumbersInGap(
    newDisplacedNums.length > 0 ? newDisplacedNums[0] : lineAboveNum,
    lineBelowNum,
    movedLines.length
  );

  if (!newMovedNums.length || !newDisplacedNums.length) {
    const choice = await window.showWarningMessage(
      "Not enough room between line numbers. Renumber entire file?",
      "Renumber",
      "Cancel"
    );
    if (choice === "Renumber") {
      await commands.executeCommand("zx-basic.renumberLines");
    }
    return;
  }

  // Build the renumbering map for GOTO/GOSUB updates
  const renumberMap = new Map<number, number>();
  for (let i = 0; i < movedLineNums.length; i++) {
    if (movedLineNums[i] !== null) {
      renumberMap.set(movedLineNums[i]!, newMovedNums[i]);
    }
  }
  if (displacedLineNum !== null) {
    renumberMap.set(displacedLineNum, newDisplacedNums[0]);
  }

  // Build the new document content
  const newLines = [...lines];

  // Update displaced line with new number
  newLines[endLine + 1] = displacedLine.replace(/^\d+/, newDisplacedNums[0].toString());

  // Update moved lines with new numbers
  for (let i = 0; i < movedLines.length; i++) {
    const newNum = newMovedNums[i];
    newLines[startLine + i] = movedLines[i].replace(/^\d+/, newNum.toString());
  }

  // Swap positions: displaced goes up, move block goes down
  const displacedBlock = [newLines[endLine + 1]];
  const movedBlock = newLines.slice(startLine, endLine + 1);
  newLines.splice(startLine, endLine - startLine + 2, ...displacedBlock, ...movedBlock);

  // Update all GOTO/GOSUB references
  let fullText = newLines.join("\n");
  Array.from(renumberMap.entries()).forEach(([oldNum, newNum]) => {
    fullText = updateLineReferences(fullText, oldNum, newNum);
  });

  // Apply the edit
  const fullRange = new Range(0, 0, document.lineCount, 0);
  await editor.edit((editBuilder) => {
    editBuilder.replace(fullRange, fullText);
  });

  // Update selection to follow the moved lines
  const newStartLine = startLine + 1;
  const newEndLine = newStartLine + movedLines.length - 1;
  editor.selection = new Selection(
    new Position(newStartLine, 0),
    new Position(newEndLine, newLines[newEndLine]?.length || 0)
  );
}

/**
 * Register the move line commands
 */
export function registerMoveLineCommands() {
  return [
    commands.registerCommand("zx-basic.moveLineUp", moveLineUp),
    commands.registerCommand("zx-basic.moveLineDown", moveLineDown),
  ];
}
