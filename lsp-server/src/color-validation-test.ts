// Test color value validation
import { ZXBasicLexer, TokenType } from './zxbasic';

const testCases = [
  {
    code: `10 INK 0`,
    description: 'Valid: INK with black (0)',
    isValid: true
  },
  {
    code: `20 INK 7`,
    description: 'Valid: INK with white (7)',
    isValid: true
  },
  {
    code: `30 INK 8`,
    description: 'Valid: INK with no change (8)',
    isValid: true
  },
  {
    code: `40 INK 9`,
    description: 'Valid: INK with contrast (9)',
    isValid: true
  },
  {
    code: `50 PAPER 0`,
    description: 'Valid: PAPER with black (0)',
    isValid: true
  },
  {
    code: `60 PAPER 9`,
    description: 'Valid: PAPER with contrast (9)',
    isValid: true
  },
  {
    code: `70 BORDER 3`,
    description: 'Valid: BORDER with color 3',
    isValid: true
  },
  {
    code: `80 INK 10`,
    description: 'Invalid: INK with value 10 (out of range)',
    isValid: false
  },
  {
    code: `90 PAPER 8`,
    description: 'Valid: PAPER with no change (8)',
    isValid: true
  },
  {
    code: `100 BORDER 8`,
    description: 'Invalid: BORDER does not support value 8',
    isValid: false
  },
  {
    code: `110 BORDER -1`,
    description: 'Invalid: BORDER with negative value',
    isValid: false
  }
];

console.log('Color Value Validation Tests:\n');

const lexer = new ZXBasicLexer();

testCases.forEach(test => {
  const tokens = lexer.tokenize(test.code).filter(t => t.type !== TokenType.EOF);
  
  // Find color keyword and following number
  let colorKeyword: string | undefined;
  let colorValue: number | undefined;
  
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === TokenType.KEYWORD && ['INK', 'PAPER', 'BORDER'].includes(tokens[i].value)) {
      colorKeyword = tokens[i].value;
      
      // Find next number
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === TokenType.NUMBER) {
          colorValue = parseInt(tokens[j].value, 10);
          break;
        }
      }
      break;
    }
  }
  
  console.log(`  Test: ${test.description}`);
  console.log(`    Code: "${test.code}"`);
  
  if (colorKeyword && colorValue !== undefined) {
    console.log(`    ${colorKeyword}: ${colorValue}`);
    
    let isValidRange = false;
    if (colorKeyword === 'BORDER') {
      isValidRange = colorValue >= 0 && colorValue <= 7;
    } else if (colorKeyword === 'INK' || colorKeyword === 'PAPER') {
      isValidRange = (colorValue >= 0 && colorValue <= 7) || colorValue === 8 || colorValue === 9;
    }
    
    if (isValidRange === test.isValid) {
      console.log(`    ✓ ${test.isValid ? 'Valid' : 'Invalid'} as expected`);
    } else {
      console.log(`    ✗ Expected ${test.isValid ? 'valid' : 'invalid'}, but got ${isValidRange ? 'valid' : 'invalid'}`);
    }
  }
  
  console.log();
});

console.log('✅ All color value validation tests completed!');
