// Test array dimension validation
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCode = `10 DIM scores(10)
20 DIM matrix(10,20)
30 DIM names$(50)
40 DIM cube(5,5,5)
50 DIM invalid(1,2,3,4)
60 LET scores(5) = 100
70 LET matrix(2,3) = 5
80 LET names$(10) = "Alice"
90 LET cube(1,2,3) = 1
100 REM Intentional errors:
110 LET wrong1(1,2) = 5
120 LET scores(1,2) = 10
130 LET matrix(5) = 3
140 LET toomany(1,2,3,4) = 1`;

console.log('=== Array Dimension Validation Test ===\n');

const lexer = new ZXBasicLexer();
const tokens = lexer.tokenize(testCode);

// Extract DIM declarations
const dimDeclarations = new Map<string, { line: number; dimensions: number }>();

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  
  if (token.type === TokenType.KEYWORD && token.value === 'DIM') {
    i++;
    while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && 
           tokens[i].type !== TokenType.EOF) {
      const idToken = tokens[i];
      
      if (idToken.type === TokenType.IDENTIFIER) {
        const arrayName = idToken.value.replace(/[$%]$/, '');
        
        let dimensionCount = 0;
        i++;
        if (i < tokens.length && tokens[i].value === '(') {
          i++;
          let depth = 1;
          while (i < tokens.length && depth > 0) {
            if (tokens[i].value === '(') depth++;
            else if (tokens[i].value === ')') depth--;
            else if (tokens[i].value === ',' && depth === 1) dimensionCount++;
            i++;
          }
          dimensionCount++;
          
          if (!dimDeclarations.has(arrayName)) {
            dimDeclarations.set(arrayName, { line: idToken.line, dimensions: dimensionCount });
          }
        }
      } else {
        i++;
      }
    }
    i--;
  }
}

console.log('Detected DIM declarations:');
dimDeclarations.forEach((decl, name) => {
  const status = decl.dimensions > 3 ? '✗' : '✓';
  console.log(`  ${status} ${name}: ${decl.dimensions} dimension(s)${decl.dimensions > 3 ? ' (INVALID - max 3)' : ''}`);
});
console.log();

// Extract array usages
const arrayUsages = new Map<string, Array<{ line: number; usedDimensions: number }>>();

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  
  if (token.type === TokenType.IDENTIFIER) {
    const arrayName = token.value.replace(/[$%]$/, '');
    
    if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
      let usedDimensions = 0;
      let j = i + 2;
      let depth = 1;
      
      while (j < tokens.length && depth > 0) {
        if (tokens[j].value === '(') {
          depth++;
        } else if (tokens[j].value === ')') {
          depth--;
        } else if (tokens[j].value === ',' && depth === 1) {
          usedDimensions++;
        }
        j++;
      }
      usedDimensions++;
      
      if (!arrayUsages.has(arrayName)) {
        arrayUsages.set(arrayName, []);
      }
      arrayUsages.get(arrayName)!.push({ line: token.line, usedDimensions });
    }
  }
}

console.log('Detected array usages:');
arrayUsages.forEach((usages, arrayName) => {
  const declaration = dimDeclarations.get(arrayName);
  usages.forEach(usage => {
    let status = '✓';
    if (usage.usedDimensions > 3) {
      status = '✗ (too many dimensions)';
    } else if (!declaration) {
      status = '✗ (not declared)';
    } else if (usage.usedDimensions !== declaration.dimensions) {
      status = '✗ (dimension mismatch)';
    }
    console.log(`  ${status} ${arrayName}: used with ${usage.usedDimensions} dim(s)`);
  });
});

console.log('\n✅ Array dimension validation test complete!');
