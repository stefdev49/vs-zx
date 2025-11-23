function tokenizeLine(line: string): number[] {
  const TOKENS: Map<string, number> = new Map([
    ['REM', 0xA4],
    ['LET', 0xB3],
    ['PRINT', 0xB7],
    ['FOR', 0xAB],
  ]);

  const tokens: number[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === ' ') {
      i++;
      continue;
    }

    let found = false;

    // Try 3-character tokens
    if (i + 2 < line.length) {
      const threeChar = line.substring(i, i + 3).toUpperCase();
      console.log(`  Checking 3-char at pos ${i}: "${threeChar}"`);
      if (TOKENS.has(threeChar)) {
        const token = TOKENS.get(threeChar)!;
        console.log(`    -> Found! Token: 0x${token.toString(16)}`);
        tokens.push(token);
        i += 3;
        found = true;
      }
    }

    if (!found) {
      // Single character
      const code = line.charCodeAt(i);
      console.log(`  Single char at pos ${i}: '${line[i]}' (0x${code.toString(16)})`);
      tokens.push(code);
      i++;
    }
  }

  return tokens;
}

console.log('Input: "REM Test"');
const result = tokenizeLine('REM Test');
console.log('Output:', result.map(x => '0x' + x.toString(16)));
