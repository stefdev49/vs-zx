Preview VSIX workflow
---------------------

This repository includes a GitHub Actions workflow that builds the VS Code extension and publishes a preview VSIX as a draft prerelease.

Workflow: `.github/workflows/preview-vsix.yml`

How it runs:
- Runs on pushes to `main` and `develop`, and on manual `workflow_dispatch` triggers.
- Builds the workspace, packages the extension with `vsce`, then creates a draft prerelease and attaches the generated `.vsix` file.
- Uploads the generated VSIX also as an Actions artifact (downloadable from the workflow run).

Caching:
- The workflow caches `node_modules` at the repository root and the `vscode-extension/node_modules` folder to speed up repeated runs. Cache keys are based on `package-lock.json` files.

Release notes:
- The workflow uses `peter-evans/create-or-update-release` to generate release notes automatically from commits when creating the draft prerelease. When `RELEASE_TOKEN` is provided and a public release is created, release notes are also generated automatically.

Trigger manually:
1. Go to the repository Actions tab
2. Select "Build & Publish Preview VSIX"
3. Click "Run workflow"

Notes:
- The workflow uses the default `GITHUB_TOKEN` to create a draft prerelease and upload the asset. This token is adequate for draft prereleases and uploading assets.
- The generated VSIX is also uploaded as an Actions artifact named `zx-basic-vscode-extension-<version>-<run_id>.vsix` so you can download it directly from the workflow run.
- To publish a non-draft (public) release automatically, add a repository secret named `RELEASE_TOKEN` containing a personal access token with `repo` scope. When `RELEASE_TOKEN` is set the workflow will:
	1. Create a regular (non-draft) release
	2. Upload the VSIX asset to that release

Security note: store the `RELEASE_TOKEN` as a repository secret and restrict its usage as needed. The workflow will only use `RELEASE_TOKEN` if it exists.
