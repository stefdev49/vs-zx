const { basicToTap } = require('./out/bas2tap');

const basicCode = `10 REM Test
20 LET n=100`;

const result = basicToTap(basicCode, { programName: 'TEST', suppressWarnings: true });

if (result.tap) {
  const data = result.tap;
  // Skip TAP header (first 21 bytes: 2-byte length + 19-byte header)
  const programStart = 21 + 2; // Skip header block + data block length
  
  console.log('Raw data after TAP headers (first 60 bytes):');
  let hex = '';
  for (let i = 0; i < 60 && i + programStart < data.length; i++) {
    hex += data[i + programStart].toString(16).padStart(2, '0') + ' ';
    if ((i + 1) % 16 === 0) hex += '\n';
  }
  console.log(hex);
  
  // Expected: Line 10 REM Test -> 
  // 0A 00 (line 10, little-endian) + A4 (REM token) + 54 65 73 74 (Test ASCII) + 0D (ENTER)
}
