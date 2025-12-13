const fs=require('fs');
function readXxd(p){const t=fs.readFileSync(p,'utf8');const bs=[];t.split(/\r?\n/).forEach(line=>{const c=line.indexOf(':');if(c===-1) return;const payload=line.slice(c+1).trim();if(!payload) return;const hexSection=payload.split('  ')[0]?.trim();if(!hexSection) return;hexSection.split(/\s+/).forEach(tok=>{if(!tok) return;for(let i=0;i<tok.length;i+=2){const ch=tok.slice(i,i+2);if(ch.length===2) bs.push(parseInt(ch,16));}});});return Buffer.from(bs);} 
const raw=readXxd('samples/pangolin.raw.hex');
const tap=readXxd('samples/pangolin.tap.hex');let off=0;const blocks=[];while(off+2<=tap.length){const len=tap[off]|(tap[off+1]<<8);off+=2;blocks.push(tap.slice(off,off+len));off+=len;}const pd=blocks[1].slice(1,blocks[1].length-1);
console.log('raw',raw.length,'pd',pd.length);
let i=0,j=0;const insertions=[];while(i<pd.length && j<raw.length){if(pd[i]===raw[j]){i++;j++;continue;} // mismatch
 // try skip in pd
 let found=false;
 for(let k=1;k<=12;k++){
   if(i+k>=pd.length) break;
   // check next 16 bytes match
   let match=true;
   for(let m=0;m<16 && (j+m)<raw.length && (i+k+m)<pd.length;m++){
     if(pd[i+k+m]!==raw[j+m]){match=false;break}
   }
   if(match){ insertions.push({atRawIndex:j, inserted: pd.slice(i,i+k)}); i+=k; found=true; break; }
 }
 if(found) continue;
 // try skip in raw (i.e., pd is missing bytes)
 for(let k=1;k<=12;k++){
   if(j+k>=raw.length) break;
   let match=true;
   for(let m=0;m<16 && (j+k+m)<raw.length && (i+m)<pd.length;m++){
     if(pd[i+m]!==raw[j+k+m]){match=false;break}
   }
   if(match){ insertions.push({atRawIndex:j, deleted: raw.slice(j,j+k)}); j+=k; found=true; break; }
 }
 if(!found){ // give up for this mismatch; advance both
   insertions.push({atRawIndex:j, note:'unresolved mismatch', pdByte:pd[i], rawByte:raw[j]}); i++; j++; }
}
console.log('insertions/findings:', insertions.length);
insertions.slice(0,50).forEach((it,idx)=>{
 console.log('#'+(idx+1), it.atRawIndex, it.inserted ? ('inserted '+Array.from(it.inserted).map(b=>b.toString(16).padStart(2,'0')).join(' ')) : (it.deleted?('deleted '+Array.from(it.deleted).map(b=>b.toString(16).padStart(2,'0')).join(' ')):it.note));
});

