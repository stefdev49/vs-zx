/**
 * Integration test for line movement with renumbering feature
 * Tests Alt+Up/Down line movement with automatic BASIC line renumbering
 */

import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

// Commands are registered by the extension on activation - no manual registration needed

suite("Line Movement Integration Tests", () => {
  let testDocument: vscode.TextDocument;
  let testEditor: vscode.TextEditor;
  let testFilePath: string;

  // Set up test environment
  setup(async () => {
    // Create a test file
    testFilePath = path.join(__dirname, "..", "..", "..", "test-move-line.bas");
    const testContent = `100 REM Test line movement\n120 PRINT "Line 120"\n130 PRINT "Line 130"\n140 GOTO 100\n150 REM End of test`;
    fs.writeFileSync(testFilePath, testContent);

    // Open the test file
    testDocument = await vscode.workspace.openTextDocument(testFilePath);
    testEditor = await vscode.window.showTextDocument(testDocument);

    // Wait for extension activation and editor to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  // Clean up test environment
  teardown(async () => {
    if (testEditor) {
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor",
      );
    }
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test("Test document is loaded correctly", () => {
    assert.strictEqual(testDocument.languageId, "zx-basic");
    assert.strictEqual(testDocument.lineCount, 5);
    assert.strictEqual(
      testDocument.lineAt(0).text,
      "100 REM Test line movement",
    );
  });

  test("Test moveLineUp command exists and is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("zx-basic.moveLineUp"));
  });

  test("Test moveLineDown command exists and is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("zx-basic.moveLineDown"));
  });

  test("Test moving single line down", async () => {
    // Position cursor on line 100 (line 0)
    testEditor.selection = new vscode.Selection(0, 0, 0, 0);

    // Get initial content
    const initialContent = testDocument.getText();
    console.log("Initial content:");
    console.log(initialContent);

    // Execute move line down command
    try {
      await vscode.commands.executeCommand("zx-basic.moveLineDown");

      // Wait for the command to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get updated content
      const updatedContent = testDocument.getText();
      console.log("Updated content:");
      console.log(updatedContent);

      // Verify the line was moved and renumbered
      assert.strictEqual(
        testDocument.lineAt(1).text,
        "110 REM Test line movement",
      );
      assert.strictEqual(testDocument.lineAt(0).text, '120 PRINT "Line 120"');
    } catch (error) {
      console.error("Error executing moveLineDown command:", error);
      throw error;
    }
  });

  test("Test moving single line up", async () => {
    // First, reset the document to original state
    await vscode.commands.executeCommand("workbench.action.revertFile");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Position cursor on line 120 (line 1)
    testEditor.selection = new vscode.Selection(1, 0, 1, 0);

    // Get initial content
    const initialContent = testDocument.getText();
    console.log("Initial content for move up:");
    console.log(initialContent);

    // Execute move line up command
    try {
      await vscode.commands.executeCommand("zx-basic.moveLineUp");

      // Wait for the command to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get updated content
      const updatedContent = testDocument.getText();
      console.log("Updated content after move up:");
      console.log(updatedContent);

      // Verify the line was moved and renumbered
      assert.strictEqual(testDocument.lineAt(0).text, '120 PRINT "Line 120"');
      assert.strictEqual(
        testDocument.lineAt(1).text,
        "110 REM Test line movement",
      );
    } catch (error) {
      console.error("Error executing moveLineUp command:", error);
      throw error;
    }
  });

  test("Test moving multiple lines", async () => {
    // Reset the document
    await vscode.commands.executeCommand("workbench.action.revertFile");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Select multiple lines (lines 100 and 120)
    testEditor.selection = new vscode.Selection(0, 0, 1, 0);

    // Get initial content
    const initialContent = testDocument.getText();
    console.log("Initial content for multiple lines:");
    console.log(initialContent);

    // Execute move lines down command
    try {
      await vscode.commands.executeCommand("zx-basic.moveLineDown");

      // Wait for the command to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get updated content
      const updatedContent = testDocument.getText();
      console.log("Updated content after moving multiple lines:");
      console.log(updatedContent);

      // Verify the lines were moved and renumbered sequentially
      assert.strictEqual(
        testDocument.lineAt(2).text,
        "110 REM Test line movement",
      );
      assert.strictEqual(testDocument.lineAt(3).text, '120 PRINT "Line 120"');
    } catch (error) {
      console.error("Error executing moveLineDown on multiple lines:", error);
      throw error;
    }
  });

  test("Test GOTO reference updating", async () => {
    // Reset the document
    await vscode.commands.executeCommand("workbench.action.revertFile");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Position cursor on line 100 (line 0) which is referenced by GOTO 100
    testEditor.selection = new vscode.Selection(0, 0, 0, 0);

    // Get initial content
    const initialContent = testDocument.getText();
    console.log("Initial content with GOTO:");
    console.log(initialContent);

    // Execute move line down command
    try {
      await vscode.commands.executeCommand("zx-basic.moveLineDown");

      // Wait for the command to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get updated content
      const updatedContent = testDocument.getText();
      console.log("Updated content with GOTO reference:");
      console.log(updatedContent);

      // Find the GOTO line and verify it was updated
      const gotoLine = testDocument.lineAt(3).text;
      console.log("GOTO line after move:", gotoLine);

      // The GOTO should now reference the new line number (110)
      assert.ok(gotoLine.includes("GOTO 110") || gotoLine.includes("GOTO 119"));
    } catch (error) {
      console.error("Error testing GOTO reference updating:", error);
      throw error;
    }
  });

  test("Test edge cases", async () => {
    // Test trying to move first line up (should do nothing)
    await vscode.commands.executeCommand("workbench.action.revertFile");
    await new Promise((resolve) => setTimeout(resolve, 500));

    testEditor.selection = new vscode.Selection(0, 0, 0, 0);
    const initialContent = testDocument.getText();

    try {
      await vscode.commands.executeCommand("zx-basic.moveLineUp");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Content should be unchanged
      const updatedContent = testDocument.getText();
      assert.strictEqual(updatedContent, initialContent);
    } catch (error) {
      console.error("Error testing edge case (first line up):", error);
      throw error;
    }

    // Test trying to move last line down (should do nothing)
    testEditor.selection = new vscode.Selection(4, 0, 4, 0);
    const initialContent2 = testDocument.getText();

    try {
      await vscode.commands.executeCommand("zx-basic.moveLineDown");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Content should be unchanged
      const updatedContent2 = testDocument.getText();
      assert.strictEqual(updatedContent2, initialContent2);
    } catch (error) {
      console.error("Error testing edge case (last line down):", error);
      throw error;
    }
  });
});
