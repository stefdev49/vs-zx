const { createTapFile } = require('./out/bas2tap');

const basicCode = `5 REM Test
10 LET n=100
20 PRINT n`;

const result = createTapFile(Buffer.from(basicCode), 'test');

// Show first 100 bytes in hex
let hex = '';
for (let i = 0; i < Math.min(100, result.length); i++) {
  hex += result[i].toString(16).padStart(2, '0') + ' ';
  if ((i + 1) % 16 === 0) hex += '\n';
}
console.log(hex);
