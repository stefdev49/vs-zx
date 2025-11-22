// Test type checking diagnostics
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCode = `10 LET x = 10
20 LET name$ = "Alice"
30 LET result% = 42
40 INPUT "Enter value: "; input_val
50 INPUT "Enter name: "; input_name$
60 FOR i = 1 TO 10
70 LET y = ABS(x)
80 LET z = SQR(x)
90 REM Invalid operations:
100 LET bad1 = ABS(name$)
110 LET bad2 = SQR(input_name$)
120 LET concat = name$ + input_name$
`;

console.log('=== Type Checking Diagnostics Test ===\n');

const lexer = new ZXBasicLexer();
const tokens = lexer.tokenize(testCode);

// Build variable type map
const variableTypes = new Map<string, 'string' | 'numeric' | 'unknown'>();

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  
  // LET assignments
  if (token.type === TokenType.KEYWORD && token.value === 'LET' && i + 1 < tokens.length) {
    const varToken = tokens[i + 1];
    if (varToken.type === TokenType.IDENTIFIER) {
      const varName = varToken.value.replace(/[$%]$/, '');
      if (varToken.value.endsWith('$')) {
        variableTypes.set(varName, 'string');
      } else if (varToken.value.endsWith('%')) {
        variableTypes.set(varName, 'numeric');
      } else {
        variableTypes.set(varName, 'numeric');
      }
    }
  }
  
  // INPUT statements
  if (token.type === TokenType.KEYWORD && token.value === 'INPUT') {
    i++;
    while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && tokens[i].type !== TokenType.EOF) {
      if (tokens[i].type === TokenType.IDENTIFIER) {
        const varName = tokens[i].value.replace(/[$%]$/, '');
        if (tokens[i].value.endsWith('$')) {
          variableTypes.set(varName, 'string');
        } else {
          variableTypes.set(varName, 'numeric');
        }
      }
      i++;
    }
    i--;
  }
  
  // FOR loops
  if (token.type === TokenType.KEYWORD && token.value === 'FOR' && i + 1 < tokens.length) {
    const varToken = tokens[i + 1];
    if (varToken.type === TokenType.IDENTIFIER) {
      const varName = varToken.value.replace(/[$%]$/, '');
      variableTypes.set(varName, 'numeric');
    }
  }
}

console.log('Detected variable types:');
variableTypes.forEach((type, name) => {
  console.log(`  ${name}: ${type}`);
});
console.log();

// Check for type mismatches
console.log('Type mismatch checks:');

// Check numeric functions with string arguments
const numericFunctions = ['ABS', 'SQR', 'SIN', 'COS'];
let mismatchCount = 0;

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  
  if (token.type === TokenType.KEYWORD && numericFunctions.includes(token.value) && 
      i + 1 < tokens.length && tokens[i + 1].value === '(') {
    if (i + 2 < tokens.length && tokens[i + 2].type === TokenType.IDENTIFIER) {
      const varName = tokens[i + 2].value.replace(/[$%]$/, '');
      const varType = variableTypes.get(varName);
      
      if (varType === 'string') {
        console.log(`  ✗ ${token.value}(${varName}$) - function requires numeric argument`);
        mismatchCount++;
      }
    }
  }
}

console.log();
console.log(`✅ Type checking diagnostics test complete!`);
console.log(`   Found ${mismatchCount} type mismatches`);
