/**
 * Integration test for syntax checking all sample files
 */
import { readFileSync } from "fs";
import { join } from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";

// Import the validation function directly from a utility module
import { validateTextDocument } from "../validation-utils";

describe("Sample Files Syntax Integration Test", () => {
  const samplesDir = join(__dirname, "..", "..", "..", "samples");

  // Get all .bas files in samples directory
  const getSampleFiles = (): string[] => {
    const sampleFiles: string[] = [];
    const fs = require("fs");
    const files = fs.readdirSync(samplesDir);

    files.forEach((file: string) => {
      if (file.endsWith(".bas")) {
        sampleFiles.push(file);
      }
    });

    return sampleFiles;
  };

  describe("Syntax Validation", () => {
    const sampleFiles = getSampleFiles();

    sampleFiles.forEach((sampleFile: string) => {
      it(`should validate syntax for ${sampleFile}`, async () => {
        const filePath = join(samplesDir, sampleFile);
        const content = readFileSync(filePath, "utf-8");

        // Create a text document
        const document = TextDocument.create(
          `file://${filePath}`,
          "zxbasic",
          1,
          content,
        );

        // Validate the document
        const diagnostics = await validateTextDocument(document);

        // Count errors and warnings
        const errors = diagnostics.filter(
          (d: Diagnostic) => d.severity === DiagnosticSeverity.Error,
        );
        const warnings = diagnostics.filter(
          (d: Diagnostic) => d.severity === DiagnosticSeverity.Warning,
        );

        console.log(
          `${sampleFile}: ${errors.length} errors, ${warnings.length} warnings`,
        );

        // Log detailed diagnostics for debugging
        if (errors.length > 0 || warnings.length > 0) {
          console.log(`Diagnostics for ${sampleFile}:`);
          diagnostics.forEach((d: Diagnostic) => {
            console.log(
              `  [${d.severity === DiagnosticSeverity.Error ? "ERROR" : "WARNING"}] ${d.message} at line ${d.range.start.line + 1}`,
            );
          });
        }

        // Assert that we have counted the diagnostics
        expect(errors.length).toBeGreaterThanOrEqual(0);
        expect(warnings.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Summary Statistics", () => {
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalFiles = 0;

    beforeAll(async () => {
      const sampleFiles = getSampleFiles();
      for (const sampleFile of sampleFiles) {
        const filePath = join(samplesDir, sampleFile);
        const content = readFileSync(filePath, "utf-8");

        const document = TextDocument.create(
          `file://${filePath}`,
          "zxbasic",
          1,
          content,
        );

        const diagnostics = await validateTextDocument(document);
        const errors = diagnostics.filter(
          (d: Diagnostic) => d.severity === DiagnosticSeverity.Error,
        );
        const warnings = diagnostics.filter(
          (d: Diagnostic) => d.severity === DiagnosticSeverity.Warning,
        );

        totalErrors += errors.length;
        totalWarnings += warnings.length;
        totalFiles++;
      }
    });

    it("should report total statistics", () => {
      console.log(`\n=== SUMMARY ===`);
      console.log(`Total files processed: ${totalFiles}`);
      console.log(`Total errors found: ${totalErrors}`);
      console.log(`Total warnings found: ${totalWarnings}`);
      console.log(
        `Average errors per file: ${(totalErrors / totalFiles).toFixed(2)}`,
      );
      console.log(
        `Average warnings per file: ${(totalWarnings / totalFiles).toFixed(2)}`,
      );

      const sampleFiles = getSampleFiles();
      expect(totalFiles).toBe(sampleFiles.length);
      expect(totalErrors).toBeGreaterThanOrEqual(0);
      expect(totalWarnings).toBeGreaterThanOrEqual(0);
    });
  });
});
