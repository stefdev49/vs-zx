const fs = require('fs');
function readXxd(p){const t=fs.readFileSync(p,'utf8');const bs=[];t.split(/\r?\n/).forEach(line=>{const c=line.indexOf(':');if(c===-1) return;const payload=line.slice(c+1).trim();if(!payload) return;const hexSection=payload.split('  ')[0]?.trim();if(!hexSection) return;hexSection.split(/\s+/).forEach(tok=>{if(!tok) return;for(let i=0;i<tok.length;i+=2){const ch=tok.slice(i,i+2);if(ch.length===2) bs.push(parseInt(ch,16));}});});return Buffer.from(bs);} 
const raw = readXxd('samples/pangolin.raw.hex');
const tap = readXxd('samples/pangolin.tap.hex');
// extract tap blocks
let off=0;const blocks=[];while(off+2<=tap.length){const len=tap[off]|(tap[off+1]<<8);off+=2;blocks.push(tap.slice(off,off+len));off+=len;} 
const programData = blocks[1].slice(1, blocks[1].length-1); // skip 0xff and checksum
console.log('raw.len=', raw.length, 'programData.len=', programData.length);
// find first index where programData differs from raw
let idx=0;for(; idx<Math.min(raw.length, programData.length); idx++){if(raw[idx]!==programData[idx]) break}
console.log('first diff idx=', idx);
console.log('raw ctx:', Array.from(raw.slice(idx-16, idx+16)).map(x=>x.toString(16).padStart(2,'0')).join(' '));
console.log('tap ctx:', Array.from(programData.slice(idx-16, idx+16)).map(x=>x.toString(16).padStart(2,'0')).join(' '));
// show the extra 6 bytes location
if (programData.length - raw.length === 6) {
  console.log('programData has 6 extra bytes between positions');
  // find the region where insertion occurs by sliding
  for (let i=0;i<raw.length;i++){
    let match=true; for(let j=0;j<raw.length - i;j++){ if (programData[i+6+j] !== raw[i+j]){match=false;break}} if (match){console.log('insertion at pos', i); break}
  }
}

// If insertion was found earlier, print inserted bytes and context
for (let i = 0; i < programData.length - raw.length; i++) {
  // find where raw aligns within programData
}
// attempt to find the earliest insertion point by comparing slices
let ins = -1;
for (let i = 0; i <= programData.length; i++) {
  // check if programData with a gap of size 6 at i equals raw
  const prefix = programData.slice(0, i);
  const suffix = programData.slice(i + 6);
  if (Buffer.concat([prefix, suffix]).equals(raw)) {
    ins = i;
    break;
  }
}
if (ins >= 0) {
  console.log('Detected insertion at programData index', ins);
  console.log('Inserted bytes:', Array.from(programData.slice(ins, ins+6)).map(x=>x.toString(16).padStart(2,'0')).join(' '));
  console.log('programData context:', Array.from(programData.slice(ins-12, ins+18)).map(x=>x.toString(16).padStart(2,'0')).join(' '));
  console.log('raw context around alignment:', Array.from(raw.slice(ins-12, ins+18)).map(x=>x.toString(16).padStart(2,'0')).join(' '));
} else {
  console.log('Could not find exact insertion point by simple alignment');
}
