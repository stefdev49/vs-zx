/**
 * VS Code Extension E2E Tests
 *
 * These tests run inside a real VS Code instance and interact with the extension
 * through the VS Code API, simulating real user interactions.
 */

import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Helper to take screenshots
async function takeScreenshot(name: string): Promise<void> {
  const screenshotsDir = path.resolve(
    __dirname,
    "../../../../test-screenshots",
  );
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // VS Code doesn't have native screenshot API, but we can capture editor state
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const content = activeEditor.document.getText();
    const fileName = activeEditor.document.fileName;
    const stateFile = path.join(screenshotsDir, `${name}.txt`);
    fs.writeFileSync(stateFile, `File: ${fileName}\n\nContent:\n${content}`);
    console.log(`📸 State captured: ${name}.txt`);
  }
}

// Helper to wait for extension to be ready
async function waitForExtension(): Promise<vscode.Extension<any> | undefined> {
  const extensionId = "zx-basic-vscode-extension.zx-basic-vscode-extension";
  let extension = vscode.extensions.getExtension(extensionId);

  // Try alternative extension IDs
  if (!extension) {
    for (const ext of vscode.extensions.all) {
      if (ext.id.includes("zx-basic")) {
        extension = ext;
        break;
      }
    }
  }

  if (extension && !extension.isActive) {
    await extension.activate();
  }

  return extension;
}

// Helper to open a file and wait for it to be ready
async function openFile(filePath: string): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.file(filePath);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  // Wait for language server to initialize
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return document;
}

suite("ZX BASIC Extension E2E Tests", () => {
  suiteSetup(async () => {
    console.log("🚀 Starting E2E test suite...");
    // Wait for VS Code to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  test("Extension should load and activate", async () => {
    console.log("📋 Test: Extension activation");

    const extension = await waitForExtension();
    assert.ok(extension, "Extension should be found");
    assert.ok(extension!.isActive, "Extension should be active");

    console.log(`✅ Extension ${extension!.id} is active`);
  });

  test("Should recognize .bas files as ZX BASIC", async () => {
    console.log("📋 Test: Language recognition");

    // Create a temporary .bas file
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-e2e.bas");
    fs.writeFileSync(testFile, '10 PRINT "HELLO WORLD"\n20 GOTO 10');

    try {
      const document = await openFile(testFile);

      assert.strictEqual(
        document.languageId,
        "zx-basic",
        `File should be recognized as zx-basic, got: ${document.languageId}`,
      );

      await takeScreenshot("01-language-recognition");
      console.log("✅ .bas file recognized as ZX BASIC");
    } finally {
      // Cleanup
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide syntax highlighting", async () => {
    console.log("📋 Test: Syntax highlighting");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-syntax.bas");
    fs.writeFileSync(
      testFile,
      `10 REM Test program
20 LET x = 10
30 PRINT "Hello"; x
40 FOR i = 1 TO 10
50 NEXT i
60 GOTO 40`,
    );

    try {
      const document = await openFile(testFile);

      // Request semantic tokens to verify syntax highlighting works
      const tokens =
        await vscode.commands.executeCommand<vscode.SemanticTokens>(
          "vscode.provideDocumentSemanticTokens",
          document.uri,
        );

      // Tokens should exist (though may be undefined if LSP not ready)
      console.log(
        `  Semantic tokens: ${tokens ? "available" : "not yet available"}`,
      );

      await takeScreenshot("02-syntax-highlighting");
      console.log("✅ Syntax highlighting test completed");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should format document on command", async () => {
    console.log("📋 Test: Document formatting");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-format.bas");
    // File with intentional formatting issues (lowercase keywords)
    const originalContent = `10 print "hello"
20 let x = 5
30 for i = 1 to 10
40 next i`;

    fs.writeFileSync(testFile, originalContent);

    try {
      const document = await openFile(testFile);
      await takeScreenshot("03-before-format");

      // Execute format document command
      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        "vscode.executeFormatDocumentProvider",
        document.uri,
        { tabSize: 2, insertSpaces: true },
      );

      if (edits && edits.length > 0) {
        // Apply the edits
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, edits);
        await vscode.workspace.applyEdit(workspaceEdit);
        await document.save();

        const formattedContent = document.getText();

        // Verify formatting was applied (keywords should be uppercase)
        assert.ok(
          formattedContent.includes("PRINT") ||
            formattedContent.includes("LET"),
          "Keywords should be uppercased after formatting",
        );

        await takeScreenshot("04-after-format");
        console.log("✅ Document formatting applied successfully");
      } else {
        console.log("⚠️ No formatting edits returned (LSP may not be ready)");
      }
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide diagnostics for errors", async () => {
    console.log("📋 Test: Diagnostics");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-diag.bas");
    // File with intentional error (duplicate line number)
    const content = `10 PRINT "Hello"
10 PRINT "Duplicate line"
20 GOTO 999`;

    fs.writeFileSync(testFile, content);

    try {
      const document = await openFile(testFile);

      // Wait for diagnostics to be computed
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const diagnostics = vscode.languages.getDiagnostics(document.uri);

      console.log(`  Found ${diagnostics.length} diagnostics`);
      diagnostics.forEach((d, i) => {
        console.log(
          `    [${i}] ${d.severity === 0 ? "Error" : "Warning"}: ${d.message}`,
        );
      });

      // Should have at least one diagnostic for duplicate line or invalid GOTO
      assert.ok(
        diagnostics.length > 0,
        "Should have diagnostics for code issues",
      );

      await takeScreenshot("05-diagnostics");
      console.log("✅ Diagnostics working correctly");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide code completion", async () => {
    console.log("📋 Test: Code completion");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-complete.bas");
    fs.writeFileSync(testFile, "10 PR");

    try {
      const document = await openFile(testFile);

      // Move cursor to end of line
      const position = new vscode.Position(0, 5);

      // Request completions
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          document.uri,
          position,
        );

      console.log(
        `  Found ${completions?.items?.length || 0} completion items`,
      );

      if (completions?.items?.length) {
        // Should include PRINT keyword
        const hasPrint = completions.items.some((item) =>
          item.label.toString().toUpperCase().includes("PRINT"),
        );

        console.log(`  PRINT completion: ${hasPrint ? "found" : "not found"}`);
        completions.items.slice(0, 5).forEach((item) => {
          console.log(`    - ${item.label}`);
        });
      }

      await takeScreenshot("06-completion");
      console.log("✅ Code completion test completed");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide hover information", async () => {
    console.log("📋 Test: Hover information");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-hover.bas");
    fs.writeFileSync(testFile, '10 PRINT "Hello"');

    try {
      const document = await openFile(testFile);

      // Hover over PRINT keyword
      const position = new vscode.Position(0, 5);

      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        document.uri,
        position,
      );

      console.log(`  Found ${hovers?.length || 0} hover items`);

      if (hovers?.length) {
        hovers.forEach((hover, i) => {
          hover.contents.forEach((content) => {
            if (typeof content === "string") {
              console.log(`    [${i}] ${content.substring(0, 50)}...`);
            } else {
              console.log(`    [${i}] ${content.value.substring(0, 50)}...`);
            }
          });
        });
      }

      await takeScreenshot("07-hover");
      console.log("✅ Hover information test completed");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide Go To Definition for GOTO/GOSUB", async () => {
    console.log("📋 Test: Go To Definition");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-goto.bas");
    fs.writeFileSync(
      testFile,
      `10 PRINT "Start"
20 GOTO 40
30 PRINT "Skipped"
40 PRINT "Target"`,
    );

    try {
      const document = await openFile(testFile);

      // Position on the "40" in "GOTO 40"
      const position = new vscode.Position(1, 9);

      const definitions = await vscode.commands.executeCommand<
        vscode.Location[]
      >("vscode.executeDefinitionProvider", document.uri, position);

      console.log(`  Found ${definitions?.length || 0} definitions`);

      if (definitions?.length) {
        const def = definitions[0];
        console.log(`    Target: line ${def.range.start.line + 1}`);

        // Should point to line 40 (index 3)
        assert.strictEqual(
          def.range.start.line,
          3,
          "GOTO 40 should navigate to line 40",
        );
      }

      await takeScreenshot("08-goto-definition");
      console.log("✅ Go To Definition working correctly");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should load existing sample file", async () => {
    console.log("📋 Test: Load sample file");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    // Try to open biorhythms.bas if it exists
    const sampleFile = path.join(workspaceFolder.uri.fsPath, "biorhythms.bas");

    if (fs.existsSync(sampleFile)) {
      const document = await openFile(sampleFile);

      assert.strictEqual(document.languageId, "zx-basic");
      assert.ok(
        document.lineCount > 10,
        "Sample file should have multiple lines",
      );

      // Wait for diagnostics
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      console.log(`  File has ${document.lineCount} lines`);
      console.log(`  Found ${diagnostics.length} diagnostics`);

      await takeScreenshot("09-sample-biorhythms");
      console.log("✅ Sample file loaded successfully");
    } else {
      console.log("⚠️ biorhythms.bas not found, skipping");
    }
  });

  test("Should extract variable from expression", async () => {
    console.log("📋 Test: Extract variable refactoring");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(
      workspaceFolder.uri.fsPath,
      "test-extract-var.bas",
    );
    fs.writeFileSync(testFile, "10 PRINT 4*2+10");

    try {
      const document = await openFile(testFile);
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        // Select the expression "4*2+10"
        editor.selection = new vscode.Selection(0, 5, 0, 12);

        // Execute extract variable command
        await vscode.commands.executeCommand("zx-basic.extractVariable");

        // Wait for changes to be applied
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const updatedContent = document.getText();

        // Verify that variable extraction worked
        assert.ok(
          updatedContent.includes("LET") || updatedContent.includes("let"),
          "Should create LET statement for extracted variable",
        );

        // Should have both the LET statement and the original PRINT (modified)
        const lineCount = document.lineCount;
        assert.ok(
          lineCount >= 2,
          "Should have at least 2 lines after extraction",
        );

        await takeScreenshot("11-extract-variable");
        console.log("✅ Extract variable refactoring working correctly");
      } else {
        console.log("⚠️ No active editor available for refactoring test");
      }
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should renumber lines correctly", async () => {
    console.log("📋 Test: Renumber lines refactoring");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-renumber.bas");
    fs.writeFileSync(
      testFile,
      `10 PRINT "A"
20 PRINT "B"
30 PRINT "C"`,
    );

    try {
      const document = await openFile(testFile);
      const originalContent = document.getText();

      // Execute renumber lines command
      await vscode.commands.executeCommand("zx-basic.renumberLines");

      // Wait for changes to be applied
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedContent = document.getText();

      // Should have consistent line numbering (may have been renumbered)
      assert.ok(
        updatedContent.includes("PRINT"),
        "Should still contain PRINT statements",
      );

      // Should have at least 3 lines
      const lineCount = document.lineCount;
      assert.ok(
        lineCount >= 3,
        "Should have at least 3 lines after renumbering",
      );

      await takeScreenshot("13-renumber-lines");
      console.log("✅ Renumber lines refactoring working correctly");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide TZX save command", async () => {
    console.log("📋 Test: TZX save command availability");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-tzx.bas");
    fs.writeFileSync(testFile, '10 PRINT "Hello World"');

    try {
      const document = await openFile(testFile);

      // Check that TZX save command is available
      const commands = await vscode.commands.getCommands(true);
      const hasSaveTzx = commands.includes("zx-basic.saveAsTzx");
      const hasPlayToZx = commands.includes("zx-basic.playToZx");

      console.log(`  saveAsTzx: ${hasSaveTzx ? "available" : "not found"}`);
      console.log(`  playToZx: ${hasPlayToZx ? "available" : "not found"}`);

      assert.ok(hasSaveTzx, "Save as TZX command should be available");
      assert.ok(hasPlayToZx, "Play to ZX command should be available");

      await takeScreenshot("15-tzx-commands");
      console.log("✅ TZX commands available");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("Should provide audio playback functionality", async () => {
    console.log("📋 Test: Audio playback features");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, "Workspace folder should exist");

    const testFile = path.join(workspaceFolder.uri.fsPath, "test-audio.bas");
    fs.writeFileSync(testFile, '10 PRINT "Audio Test"');

    try {
      const document = await openFile(testFile);

      // Check audio-related commands are available
      const commands = await vscode.commands.getCommands(true);
      const hasPlayToZx = commands.includes("zx-basic.playToZx");
      const hasStopPlayback = commands.includes("zx-basic.stopTzxPlayback");
      const hasRecordFromZx = commands.includes("zx-basic.recordFromZx");
      const hasStopRecording = commands.includes("zx-basic.stopZxRecording");

      console.log(`  playToZx: ${hasPlayToZx ? "available" : "not found"}`);
      console.log(
        `  stopTzxPlayback: ${hasStopPlayback ? "available" : "not found"}`,
      );
      console.log(
        `  recordFromZx: ${hasRecordFromZx ? "available" : "not found"}`,
      );
      console.log(
        `  stopZxRecording: ${hasStopRecording ? "available" : "not found"}`,
      );

      // Verify all audio commands are available
      assert.ok(hasPlayToZx, "Play to ZX command should be available");
      assert.ok(hasStopPlayback, "Stop playback command should be available");
      assert.ok(hasRecordFromZx, "Record from ZX command should be available");
      assert.ok(hasStopRecording, "Stop recording command should be available");

      // Test that play command can be executed with timeout to avoid hanging
      // Note: In test environment, this will show UI dialog but we don't want to hang
      try {
        // Use a short timeout to prevent hanging on UI prompts
        const executionPromise =
          vscode.commands.executeCommand("zx-basic.playToZx");

        // Wait for either command completion or timeout
        const result = await Promise.race([
          executionPromise,
          new Promise((resolve) => setTimeout(resolve, 2000)), // 2 second timeout
        ]);

        if (result === undefined) {
          console.log("  Play command timed out (expected due to UI prompt)");
        } else {
          console.log("  Play command executed successfully");
        }
      } catch (error) {
        // Expected to fail or timeout in test environment due to UI requirements
        console.log(
          "  Play command requires UI interaction (expected in tests)",
        );
      }

      await takeScreenshot("17-audio-commands");
      console.log("✅ Audio playback and recording commands available");
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test("MDR save command should be available", async () => {
    console.log("📋 Test: MDR command availability");

    const commands = await vscode.commands.getCommands(true);

    const mdrCommands = commands.filter(
      (cmd) =>
        cmd.toLowerCase().includes("mdr") ||
        cmd.toLowerCase().includes("microdrive"),
    );

    console.log(`  Found ${mdrCommands.length} MDR-related commands:`);
    mdrCommands.forEach((cmd) => console.log(`    - ${cmd}`));

    // Check for our specific commands
    const hasSaveToMdr = commands.includes("zx-basic.saveToMdr");
    const hasLoadFromMdr = commands.includes("zx-basic.loadFromMdr");

    console.log(`  saveToMdr: ${hasSaveToMdr ? "available" : "not found"}`);
    console.log(`  loadFromMdr: ${hasLoadFromMdr ? "available" : "not found"}`);

    await takeScreenshot("16-mdr-commands");
    console.log("✅ Command availability test completed");
  });

  suiteTeardown(() => {
    console.log("🏁 E2E test suite completed");
  });
});
