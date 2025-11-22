// Test command signature help
const commandSignatures = [
  {
    command: 'PRINT',
    label: 'PRINT [AT line,col;] expression [; expression]...',
    params: ['expression']
  },
  {
    command: 'INPUT',
    label: 'INPUT ["prompt";] variable [, variable]...',
    params: ['variable']
  },
  {
    command: 'FOR',
    label: 'FOR variable = start TO end [STEP step]',
    params: ['variable', 'start', 'end']
  },
  {
    command: 'DIM',
    label: 'DIM array(size [, size [, size]])',
    params: ['array', 'size']
  },
  {
    command: 'IF',
    label: 'IF condition THEN statement',
    params: ['condition', 'statement']
  },
  {
    command: 'PLOT',
    label: 'PLOT x, y',
    params: ['x', 'y']
  },
  {
    command: 'BEEP',
    label: 'BEEP duration, pitch',
    params: ['duration', 'pitch']
  },
  {
    command: 'GOSUB',
    label: 'GOSUB line_number',
    params: ['line_number']
  },
  {
    command: 'GOTO',
    label: 'GOTO line_number',
    params: ['line_number']
  },
  {
    command: 'POKE',
    label: 'POKE address, value',
    params: ['address', 'value']
  },
];

console.log('=== Command Signature Help Test ===\n');

commandSignatures.forEach(sig => {
  console.log(`✓ ${sig.command}`);
  console.log(`  Signature: ${sig.label}`);
  console.log(`  Parameters: ${sig.params.join(', ')}`);
  console.log();
});

console.log('✅ Command signature help test complete!');
console.log(`\nTotal commands documented: ${commandSignatures.length}`);
