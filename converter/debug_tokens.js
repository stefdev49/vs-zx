// Check what's in the compiled TOKENS map
const fs = require('fs');
const code = fs.readFileSync('./out/bas2tap.js', 'utf8');

// Extract TOKENS initialization
const match = code.match(/TOKENS.*?new Map\(\[([\s\S]*?)\]\)/);
if (match) {
  const entries = match[1];
  console.log(entries.substring(0, 500));
}
