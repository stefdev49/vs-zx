const fs = require('fs');
function readXxd(p){const t=fs.readFileSync(p,'utf8');const bs=[];t.split(/\r?\n/).forEach(line=>{const c=line.indexOf(':');if(c===-1) return;const payload=line.slice(c+1).trim();if(!payload) return;const hexSection=payload.split('  ')[0]?.trim();if(!hexSection) return;hexSection.split(/\s+/).forEach(tok=>{if(!tok) return;for(let i=0;i<tok.length;i+=2){const ch=tok.slice(i,i+2);if(ch.length===2) bs.push(parseInt(ch,16));}});});return Buffer.from(bs);} 
const raw = readXxd('samples/pangolin.raw.hex');
const tap = readXxd('samples/pangolin.tap.hex');
let off=0;const blocks=[];while(off+2<=tap.length){const len=tap[off]|(tap[off+1]<<8);off+=2;blocks.push(tap.slice(off,off+len));off+=len;} 
const programData = blocks[1].slice(1, blocks[1].length-1);
console.log('raw.len', raw.length, 'programData.len', programData.length);
const delta = programData.length - raw.length;
console.log('delta', delta);
if (delta<=0) { console.log('no insertion'); process.exit(0);} 
const insLen = delta;
let found = false;
for (let p=0; p<=raw.length; p++){
  let ok=true;
  // check prefix
  for (let i=0;i<p;i++){ if (programData[i] !== raw[i]) { ok=false; break; } }
  if (!ok) continue;
  // check suffix
  for (let i=p;i<raw.length;i++){ if (programData[i+insLen] !== raw[i]) { ok=false; break; } }
  if (ok){
    console.log('insertion at pos', p);
    console.log('inserted bytes:', Array.from(programData.slice(p,p+insLen)).map(b=>b.toString(16).padStart(2,'0')).join(' '));
    found=true; break;
  }
}
if (!found) console.log('no simple insertion match found');
