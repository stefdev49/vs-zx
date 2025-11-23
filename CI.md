# CI: Build and Package VSIX

This repository includes a GitHub Actions workflow to build and package the VS Code extension as a VSIX.

Workflow: `.github/workflows/package-vsix.yml`

Triggers:
- Push a git tag named `v*` (e.g., `v1.0.0`).
- Manual dispatch through the Actions tab.

What it does:
- Runs `npm ci` and `npm run build:tsc`.
- Bundles the language server and extension, runs the copy script, and packages the VSIX with `vsce`.
- Uploads the produced VSIX as artifact `zx-basic-vsix`.

How to use:
- Push a tag or open the Actions tab in GitHub and run the workflow manually.
- After success, download the `zx-basic-vsix` artifact from the workflow run.
