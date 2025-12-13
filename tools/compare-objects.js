#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readXxdHexDump(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const bytes = [];
  text.split(/\r?\n/).forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    const payload = line.slice(colonIndex + 1).trim();
    if (!payload) return;
    const hexSection = payload.split('  ')[0]?.trim();
    if (!hexSection) return;
    hexSection.split(/\s+/).forEach(token => {
      if (!token) return;
      for (let i = 0; i < token.length; i += 2) {
        const chunk = token.slice(i, i+2);
        if (chunk.length === 2) {
          const v = parseInt(chunk, 16);
          if (!Number.isNaN(v)) bytes.push(v);
        }
      }
    });
  });
  return Buffer.from(bytes);
}

function extractProgramDataFromTap(tapBuf) {
  // tapBuf contains: header(21) + dataHeader(3) + programData + checksum
  // We'll parse by reading first header length (first two bytes) then second block length
  let off = 0;
  function readLen() {
    const lo = tapBuf[off];
    const hi = tapBuf[off+1];
    const len = lo | (hi<<8);
    off += 2;
    return len;
  }
  // skip first header block
  const hlen = readLen(); off += hlen;
  // now data block
  const dlen = readLen(); // this is blockSize+2
  const flag = tapBuf[off++];
  const programData = tapBuf.slice(off, off + dlen - 1); // exclude final checksum
  return programData;
}

(async function main(){
  const repo = process.cwd();
  const samples = path.join(repo, 'samples');
  const pangolinBas = path.join(samples, 'pangolin.bas');
  const pangolinTapHex = path.join(samples, 'pangolin.tap.hex');

  if (!fs.existsSync(pangolinBas)) return console.error('pangolin.bas not found');
  if (!fs.existsSync(pangolinTapHex)) return console.error('pangolin.tap.hex not found');

  const canonicalTap = readXxdHexDump(pangolinTapHex);
  // parse as length-prefixed blocks like other tools
  let off = 0;
  const blocks = [];
  while (off + 2 <= canonicalTap.length) {
    const len = canonicalTap[off] | (canonicalTap[off+1] << 8);
    off += 2;
    blocks.push(canonicalTap.slice(off, off + len));
    off += len;
  }
  const programData = blocks[1].slice(1, blocks[1].length - 1);
  console.log('canonical programData len', programData.length);

  const convEntry = path.join(repo, 'converter', 'out', 'index.js');
  if (!fs.existsSync(convEntry)) {
    console.error('Compiled converter not found at', convEntry);
    process.exit(2);
  }
  const conv = require(convEntry);
  const basic = fs.readFileSync(pangolinBas, 'utf8');

  const result = conv.convertBasicWithObjects ? conv.convertBasicWithObjects(basic) : null;
  if (!result) return console.error('convertBasicWithObjects not found in converter.out/index.js');

  const { artifacts, objects } = result;
  const genRaw = artifacts.raw;
  console.log('generated raw len', genRaw.length);
  console.log('object count', objects.length);

  // For each object, check canonical programData bytes at that offset
  objects.forEach((obj, idx) => {
    const pdSlice = programData.slice(obj.offset, obj.offset + obj.length);
    const rawSlice = genRaw.slice(obj.offset, obj.offset + obj.length);
    let mism = -1;
    for (let i = 0; i < Math.min(pdSlice.length, rawSlice.length); i++) {
      if (pdSlice[i] !== rawSlice[i]) { mism = i; break; }
    }
    if (mism >= 0) {
      console.log(`OBJ #${idx} line=${obj.lineNumber} off=${obj.offset} len=${obj.length} mismatch at +${mism} (pd=0x${pdSlice[mism].toString(16)} raw=0x${rawSlice[mism].toString(16)})`);
    }
  });

  // show summary: list objects that have any difference
  const diffs = objects.filter(obj => {
    const pdSlice = programData.slice(obj.offset, obj.offset + obj.length);
    const rawSlice = genRaw.slice(obj.offset, obj.offset + obj.length);
    if (pdSlice.length !== rawSlice.length) return true;
    for (let i = 0; i < pdSlice.length; i++) if (pdSlice[i] !== rawSlice[i]) return true;
    return false;
  });
  console.log('objects with differences:', diffs.length);
  diffs.slice(0,20).forEach(d=>console.log(d));

  // write samples for inspection
  fs.writeFileSync(path.join(repo,'tmp_pd.bin'), programData);
  fs.writeFileSync(path.join(repo,'tmp_gen_raw.bin'), genRaw);

  process.exit(0);
})();
