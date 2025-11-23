const code = require('./out/bas2tap');

// Get access to tokenizeLine - it's not exported, so let's test via basicToTap
const result = code.basicToTap('10 LET n=100\nEND');
console.log('Result:', result);
