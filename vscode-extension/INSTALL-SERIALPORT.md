# Installing serialport into an already-installed VS Code extension

This repository ships a VS Code extension that can optionally use the native `serialport` package for RS232 transfers. If you installed the extension from a VSIX or Marketplace and need to add `serialport` later (for example on a machine where the module was not installed at extension install time), use the helper script below.

Script: `scripts/install-serialport-for-installed-extension.sh`

Usage:

1. Run the script without arguments — it will try to locate the extension folder in common VS Code extension locations and install `serialport` there:

```bash
cd vscode-extension
./scripts/install-serialport-for-installed-extension.sh
```

2. If the script cannot find your extension folder, pass the extension path explicitly:

```bash
./scripts/install-serialport-for-installed-extension.sh \
  ~/.vscode/extensions/<publisher>.zx-basic-vscode-extension-1.0.76
```

Notes:
- Installing `serialport` usually builds native bindings. Make sure you have the necessary build toolchain:
  - Node.js compatible with your extension's Node engine.
  - Python (for node-gyp), and a C/C++ toolchain (build-essential on Debian/Ubuntu, Xcode Command Line Tools on macOS).
- The install command used is:

```bash
npm install --no-audit --no-fund --production serialport@^13.0.0
```

- After successful install, restart VS Code to reload the extension host.

If you prefer not to install native modules in the extension folder, the extension will still activate; the transfer command will show instructions on how to install `serialport` when invoked.
