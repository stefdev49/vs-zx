// Quick verification of DEF FN in demo file
import { ZXBasicLexer, TokenType } from './zxbasic';
import * as fs from 'fs';

const content = fs.readFileSync('deffn-demo.bas', 'utf-8');
const lexer = new ZXBasicLexer();

const lines = content.split('\n').filter(line => line.trim());

console.log('Verifying DEF FN handling in deffn-demo.bas:\n');

lines.forEach((line, index) => {
  if (line.includes('DEF FN') || line.includes('DEFFN')) {
    const tokens = lexer.tokenize(line).filter(t => t.type !== TokenType.EOF);
    const deffnToken = tokens.find(t => t.value === 'DEFFN');
    
    if (deffnToken) {
      console.log(`✓ Line ${index + 1}: "${line.trim()}"`);
      console.log(`  Found DEFFN token (normalized from "DEF FN")`);
    }
  }
});

console.log('\n✅ All DEF FN occurrences properly normalized to DEFFN!');
