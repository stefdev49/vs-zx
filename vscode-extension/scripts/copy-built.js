const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const root = path.resolve(__dirname, '..', '..');
const out = path.resolve(__dirname, '..', 'out');

ensureDir(out);
ensureDir(path.join(out, 'server'));
ensureDir(path.join(out, 'syntax-definitions'));

// Remove converter and rs232-transfer from out if present to avoid duplication
function removeIfExists(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`removed ${p}`);
  }
}

removeIfExists(path.join(out, 'converter'));
removeIfExists(path.join(out, 'rs232-transfer'));

function copy(srcRel, destRel) {
  const src = path.join(root, srcRel);
  const dest = path.join(out, destRel);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`copied ${srcRel} -> ${destRel}`);
  } else {
    console.warn(`missing ${srcRel}, skipping`);
  }
}

copy('lsp-server/out/server.js', 'server/server.js');
if (fs.existsSync(path.join(root, 'syntax-definitions', 'keywords.js'))) {
  copy('syntax-definitions/keywords.js', 'syntax-definitions/keywords.js');
} else {
  copy('syntax-definitions/keywords.ts', 'syntax-definitions/keywords.ts');
}

  console.log('copy-built complete');
