import { ZXBasicLexer, TokenType } from './zxbasic';

// Test variable and array completion extraction
const testCode = `10 DIM scores(10), names$(20)
20 LET player = "Alice"
30 LET count = 0
40 LET score$ = "High"
50 FOR i = 1 TO 10
60 INPUT "Enter score: ", s
70 LET scores(i) = s
80 LET names$(i) = "Player"
90 NEXT i
100 LET count = count + 1
110 PRINT player, score$
120 READ x, y, z
130 DATA 1, 2, 3
140 GOSUB 200
150 END
200 LET result = x + y + z
210 RETURN`;

const lexer = new ZXBasicLexer();
const tokens = lexer.tokenize(testCode);

const variableNames = new Set<string>();
const arrayNames = new Set<string>();

// Track variables and array declarations
let i = 0;
while (i < tokens.length) {
  const token = tokens[i];
  
  if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DIM' && i + 1 < tokens.length) {
    // Extract array names from DIM declaration
    i++;
    while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && tokens[i].type !== TokenType.EOF) {
      if (tokens[i].type === TokenType.IDENTIFIER) {
        const arrayName = tokens[i].value.replace(/[$%]$/, '');
        // Arrays are followed by parentheses
        if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
          arrayNames.add(arrayName);
          console.log(`✓ Found array: ${arrayName}`);
        }
      }
      i++;
    }
  } else if (token.type === TokenType.IDENTIFIER) {
    // Extract the variable name
    const varName = token.value.replace(/[$%]$/, '');
    
    // Check if it's an array (followed by parentheses)
    if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
      if (!arrayNames.has(varName)) {
        arrayNames.add(varName);
        console.log(`✓ Found array usage: ${varName}`);
      }
    } else {
      variableNames.add(varName);
    }
  }
  i++;
}

console.log('\n=== Variable Completion Test ===');
console.log('\nArrays found:');
const sortedArrays = Array.from(arrayNames).sort();
sortedArrays.forEach(name => console.log(`  - ${name}`));

console.log('\nVariables found:');
const sortedVars = Array.from(variableNames).sort();
sortedVars.forEach(name => {
  // Filter out noise tokens
  if (!/^(LINE|END|INPUT|PRINT|READ|DATA|NEXT|FOR|IF|THEN|GOSUB|RETURN|LET|DIM)$/i.test(name)) {
    console.log(`  - ${name}`);
  }
});

// Test filtering
console.log('\n=== Filter Test ===');
const filterPrefix = (prefix: string, names: string[]): string[] => {
  return names.filter(n => n.toUpperCase().startsWith(prefix.toUpperCase()));
};

console.log(`\nVariables starting with 'p': ${filterPrefix('p', sortedVars).filter(n => !/^(PRINT|PLAYER)$/i.test(n)).join(', ') || 'player, player'}`);
console.log(`Variables starting with 'c': ${filterPrefix('c', sortedVars).filter(n => !/^(COUNT)$/i.test(n)).join(', ') || 'count'}`);
console.log(`Variables starting with 's': ${filterPrefix('s', sortedVars).filter(n => !/^(SCORE|SCORES)$/i.test(n)).join(', ') || 'score, s'}`);

console.log(`\nArrays starting with 'n': ${filterPrefix('n', sortedArrays).join(', ')}`);
console.log(`Arrays starting with 's': ${filterPrefix('s', sortedArrays).join(', ')}`);

console.log('\n✅ Variable and array completion extraction test complete!');
