// VS Code Extension E2E Tests using @vscode/test-electron
import * as path from "path";
import { fileURLToPath } from "url";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // Get the latest VSIX file
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const extensionPath = path.resolve(__dirname, "..", "vscode-extension");
    const vsixFiles = await import("fs").then((fs) =>
      fs.promises.readdir(extensionPath).then((files) =>
        files
          .filter((f) => f.endsWith(".vsix"))
          .sort()
          .reverse(),
      ),
    );

    if (vsixFiles.length === 0) {
      throw new Error("No VSIX files found");
    }

    const vsixPath = path.join(extensionPath, vsixFiles[0]);
    console.log("Using VSIX file:", vsixPath);

    // Run the extension test with simple test runner
    const testRunnerPath = path.resolve(
      __dirname,
      "vscode-extension-test-runner-simple.cjs",
    );
    await runTests({
      extensionDevelopmentPath: extensionPath,
      extensionTestsPath: testRunnerPath,
      launchArgs: [
        "--disable-extensions",
        "--extensionDevelopmentPath=" + extensionPath,
        "--extensionTestsPath=" + testRunnerPath,
      ],
    });

    console.log("✅ VS Code extension test completed successfully!");
  } catch (err) {
    console.error("❌ VS Code extension test failed:", err);
    process.exit(1);
  }
}

main();
