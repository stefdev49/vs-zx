const fs = require('fs');
function readXxd(p){const t=fs.readFileSync(p,'utf8');const bs=[];t.split(/\r?\n/).forEach(line=>{const c=line.indexOf(':');if(c===-1) return;const payload=line.slice(c+1).trim();if(!payload) return;const hexSection=payload.split('  ')[0]?.trim();if(!hexSection) return;hexSection.split(/\s+/).forEach(tok=>{if(!tok) return;for(let i=0;i<tok.length;i+=2){const ch=tok.slice(i,i+2);if(ch.length===2) bs.push(parseInt(ch,16));}});});return Buffer.from(bs);} 
const raw = readXxd('samples/pangolin.raw.hex');
const tap = readXxd('samples/pangolin.tap.hex');
let off=0;const blocks=[];while(off+2<=tap.length){const len=tap[off]|(tap[off+1]<<8);off+=2;blocks.push(tap.slice(off,off+len));off+=len;} 
const pd = blocks[1].slice(1, blocks[1].length-1);

function ctx(buf, idx, n=24){const start=Math.max(0, idx-n);const end=Math.min(buf.length, idx+n);return Array.from(buf.slice(start,end)).map(b=>b.toString(16).padStart(2,'0')).join(' ')}

const positions=[133,1909];
positions.forEach(pos=>{
  console.log('\n=== position', pos, '===');
  console.log('raw ctx:', ctx(raw,pos));
  console.log('pd ctx :', ctx(pd,pos));
});
console.log('\nraw len', raw.length, 'pd len', pd.length);