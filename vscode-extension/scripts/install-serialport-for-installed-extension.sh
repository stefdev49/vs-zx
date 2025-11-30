#!/usr/bin/env bash
set -euo pipefail

EXT_NAME="zx-basic-vscode-extension"
EXT_PKG_NAME="\"name\"\s*:\s*\"${EXT_NAME}\""
SEARCH_DIRS=("$HOME/.vscode/extensions" "$HOME/.vscode-oss/extensions" "$HOME/.vscode-server/extensions")

echo "Searching for installed extension '${EXT_NAME}'..."
found=""
for base in "${SEARCH_DIRS[@]}"; do
  [ -d "$base" ] || continue
  for d in "$base"/*; do
    [ -f "$d/package.json" ] || continue
    if grep -Eq "$EXT_PKG_NAME" "$d/package.json"; then
      if [ -z "$found" ] || [ "$d" -nt "$found" ]; then
        found="$d"
      fi
    fi
  done
done

if [ -z "$found" ]; then
  echo "Could not locate the installed extension folder for '${EXT_NAME}'."
  echo
  echo "Try running this script with the extension path as an argument:" 
  echo "  $0 /path/to/<publisher>.${EXT_NAME}-<version>"
  echo
  echo "Or install serialport manually inside the extension folder, for example:"
  echo "  cd ~/.vscode/extensions/<publisher>.${EXT_NAME}-<version>"
  echo "  npm install --no-audit --no-fund --production serialport@^13.0.0"
  exit 2
fi

if [ $# -ge 1 ]; then
  # Allow overriding found path with an explicit argument
  found="$1"
fi

echo "Found extension folder: $found"

if [ ! -f "$found/package.json" ]; then
  echo "No package.json in $found — aborting." >&2
  exit 3
fi

echo "Installing serialport into the extension folder (this may trigger native builds)..."
NPM_CMD="${NPM_CMD:-npm}"
echo "Running: $NPM_CMD install --no-audit --no-fund --production serialport@^13.0.0"

pushd "$found" >/dev/null
  $NPM_CMD install --no-audit --no-fund --production serialport@^13.0.0
popd >/dev/null

echo "Installation finished. You may need to restart VS Code for the extension host to pick up the newly installed module."
echo "If the install failed due to missing build tools, ensure you have a working native build toolchain (node-gyp, Python, C/C++ tools)."

exit 0
