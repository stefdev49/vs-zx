#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readXxdHexDump(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const bytes = [];
  text.split(/\r?\n/).forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return;
    }
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

function hexdump(buf, off, ctx = 8) {
  const start = Math.max(0, off - ctx);
  const end = Math.min(buf.length, off + ctx + 1);
  return Array.from(buf.slice(start, end)).map(b => b.toString(16).padStart(2,'0')).join(' ');
}

function compare(a, b, max=20) {
  const mism = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len && mism.length < max; i++) {
    if (a[i] !== b[i]) {
      mism.push({ offset: i, expected: a[i], actual: b[i] });
    }
  }
  if (a.length !== b.length && mism.length < max) {
    mism.push({ offset: Math.min(a.length,b.length), expected_len: a.length, actual_len: b.length });
  }
  return mism;
}

(async function main(){
  const repo = process.cwd();
  const samples = path.join(repo, 'samples');
  const pangolinBas = path.join(samples, 'pangolin.bas');
  const pangolinRawHex = path.join(samples, 'pangolin.raw.hex');
  const pangolinTapHex = path.join(samples, 'pangolin.tap.hex');
  const pangolinTapBin = path.join(samples, 'pangolin.tap');

  if (!fs.existsSync(pangolinBas)) return console.error('pangolin.bas not found');
  if (!fs.existsSync(pangolinRawHex)) return console.error('pangolin.raw.hex not found');
  if (!fs.existsSync(pangolinTapHex)) return console.error('pangolin.tap.hex not found');

  const canonicalRaw = readXxdHexDump(pangolinRawHex);
  const canonicalTap = readXxdHexDump(pangolinTapHex);
  let canonicalTapBin = null;
  if (fs.existsSync(pangolinTapBin)) canonicalTapBin = fs.readFileSync(pangolinTapBin);

  console.log('canonical raw len:', canonicalRaw.length);
  console.log('canonical tap(hex) len:', canonicalTap.length);
  if (canonicalTapBin) console.log('canonical tap(bin) len:', canonicalTapBin.length);

  // load compiled converter
  const entry = path.join(repo, 'converter', 'out', 'index.js');
  if (!fs.existsSync(entry)) {
    console.error('Compiled converter not found at', entry);
    process.exit(2);
  }
  const conv = require(entry);
  const basic = fs.readFileSync(pangolinBas, 'utf8');

  const artifacts = conv.convertBasic ? conv.convertBasic(basic) : (conv.convertBasicSource ? conv.convertBasicSource(basic) : null);
  if (!artifacts) return console.error('convertBasic not found or did not return artifacts');

  const generatedRaw = artifacts.raw;
  const generatedTap = artifacts.tap;

  fs.writeFileSync(path.join(repo,'tmp_generated_pangolin.raw'), generatedRaw);
  fs.writeFileSync(path.join(repo,'tmp_generated_pangolin.tap'), generatedTap);

  console.log('generated raw len:', generatedRaw.length);
  console.log('generated tap len:', generatedTap.length);

  console.log('\nComparing RAW...');
  const mismRaw = compare(canonicalRaw, generatedRaw, 30);
  console.log('raw mismatches count:', mismRaw.length);
  mismRaw.slice(0,10).forEach((m,i)=>{
    if (m.expected_len!==undefined) {
      console.log(`#${i+1} length diff: expected ${m.expected_len} actual ${m.actual_len}`);
    } else {
      console.log(`#${i+1} offset ${m.offset} (0x${m.offset.toString(16)}): expected 0x${m.expected.toString(16)} actual 0x${m.actual.toString(16)}`);
      console.log('  expected ctx:', hexdump(canonicalRaw, m.offset));
      console.log('  actual   ctx:', hexdump(generatedRaw, m.offset));
    }
  });

  console.log('\nComparing TAP...');
  const mismTap = compare(canonicalTap, generatedTap, 30);
  console.log('tap mismatches count:', mismTap.length);
  mismTap.slice(0,20).forEach((m,i)=>{
    if (m.expected_len!==undefined) {
      console.log(`#${i+1} length diff: expected ${m.expected_len} actual ${m.actual_len}`);
    } else {
      console.log(`#${i+1} offset ${m.offset} (0x${m.offset.toString(16)}): expected 0x${m.expected.toString(16)} actual 0x${m.actual.toString(16)}`);
      console.log('  expected ctx:', hexdump(canonicalTap, m.offset));
      console.log('  actual   ctx:', hexdump(generatedTap, m.offset));
    }
  });

  if (canonicalTapBin) {
    console.log('\nComparing canonical binary pangolin.tap with canonical hex parse:');
    console.log('canonical tap(bin) len:', canonicalTapBin.length, 'canonical tap(hex) parsed len:', canonicalTap.length);
    const mism = compare(canonicalTap, canonicalTapBin, 5);
    console.log('mismatches:', mism.length);
    mism.forEach((m,i)=>{ console.log(m); });
  }

  process.exit(0);
})();
