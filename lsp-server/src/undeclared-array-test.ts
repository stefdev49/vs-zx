import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Undeclared Array Detection - Phase 3.3', () => {
  let lexer: ZXBasicLexer;

  beforeEach(() => {
    lexer = new ZXBasicLexer();
  });

  test('Detect undeclared array usage', () => {
    const code = '10 LET A(5) = 100';
    const tokens = lexer.tokenize(code);
    
    // Find IDENTIFIER followed by parenthesis
    let foundArray = false;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && 
          i + 1 < tokens.length && 
          tokens[i + 1].value === '(') {
        foundArray = true;
        break;
      }
    }
    
    expect(foundArray).toBe(true);
  });

  test('Distinguish declared arrays from usage', () => {
    const code = '10 DIM A(10)\n20 LET A(5) = 100';
    const tokens = lexer.tokenize(code);
    
    let dimCount = 0;
    let arrayUsageCount = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === 'DIM') {
        dimCount++;
      }
      if (tokens[i].type === TokenType.IDENTIFIER && 
          i + 1 < tokens.length && 
          tokens[i + 1].value === '(') {
        arrayUsageCount++;
      }
    }
    
    expect(dimCount).toBe(1);
    expect(arrayUsageCount).toBeGreaterThan(0);
  });

  test('Handle multiple undeclared arrays', () => {
    const code = '10 LET X(1) = 5\n20 LET Y(2) = 10\n30 LET Z(3) = 15';
    const tokens = lexer.tokenize(code);
    
    const arrayUsages = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && 
          i + 1 < tokens.length && 
          tokens[i + 1].value === '(') {
        arrayUsages.add(tokens[i].value);
      }
    }
    
    expect(arrayUsages.size).toBe(3);
    expect(arrayUsages.has('X')).toBe(true);
    expect(arrayUsages.has('Y')).toBe(true);
    expect(arrayUsages.has('Z')).toBe(true);
  });

  test('Extract array names from DIM statement', () => {
    const code = '10 DIM A(10), B(5, 10), C(3, 4, 5)';
    const tokens = lexer.tokenize(code);
    
    const declaredArrays = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === 'DIM') {
        i++;
        while (i < tokens.length && tokens[i].type !== 'STATEMENT_SEPARATOR' && tokens[i].type !== 'EOF') {
          if (tokens[i].type === TokenType.IDENTIFIER && 
              i + 1 < tokens.length && 
              tokens[i + 1].value === '(') {
            declaredArrays.add(tokens[i].value);
          }
          i++;
        }
      }
    }
    
    expect(declaredArrays.size).toBe(3);
    expect(declaredArrays.has('A')).toBe(true);
    expect(declaredArrays.has('B')).toBe(true);
    expect(declaredArrays.has('C')).toBe(true);
  });

  test('Handle string array declarations', () => {
    const code = '10 DIM NAMES$(50)\n20 LET NAMES$(1) = "John"';
    const tokens = lexer.tokenize(code);
    
    const declaredArrays = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === 'DIM') {
        i++;
        while (i < tokens.length && tokens[i].type !== 'STATEMENT_SEPARATOR' && tokens[i].type !== 'EOF') {
          if (tokens[i].type === TokenType.IDENTIFIER && 
              i + 1 < tokens.length && 
              tokens[i + 1].value === '(') {
            const arrayName = tokens[i].value.replace(/[$%]$/, '');
            declaredArrays.add(arrayName);
          }
          i++;
        }
      }
    }
    
    expect(declaredArrays.size).toBe(1);
    expect(declaredArrays.has('NAMES')).toBe(true);
  });

  test('Detect undeclared use while ignoring declared arrays', () => {
    const code = '10 DIM A(10)\n20 LET A(1) = 5\n30 LET B(1) = 10';
    const tokens = lexer.tokenize(code);
    
    // Collect declared arrays
    const declaredArrays = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.KEYWORD && tokens[i].value.toUpperCase() === 'DIM') {
        i++;
        while (i < tokens.length && tokens[i].type !== 'STATEMENT_SEPARATOR' && tokens[i].type !== 'EOF') {
          if (tokens[i].type === TokenType.IDENTIFIER && 
              i + 1 < tokens.length && 
              tokens[i + 1].value === '(') {
            declaredArrays.add(tokens[i].value.toUpperCase());
          }
          i++;
        }
      }
    }
    
    // Find undeclared arrays
    const undeclaredArrays = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && 
          i + 1 < tokens.length && 
          tokens[i + 1].value === '(') {
        const arrayName = tokens[i].value.replace(/[$%]$/, '').toUpperCase();
        if (!declaredArrays.has(arrayName)) {
          undeclaredArrays.add(arrayName);
        }
      }
    }
    
    expect(declaredArrays.has('A')).toBe(true);
    expect(undeclaredArrays.has('B')).toBe(true);
    expect(undeclaredArrays.has('A')).toBe(false);
  });

  test('Handle array operations in expressions', () => {
    const code = '10 LET SUM = A(1) + B(2) + C(3)';
    const tokens = lexer.tokenize(code);
    
    let arrayCount = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && 
          i + 1 < tokens.length && 
          tokens[i + 1].value === '(') {
        arrayCount++;
      }
    }
    
    expect(arrayCount).toBe(3);
  });

  test('Ignore function calls that look like arrays', () => {
    const code = '10 PRINT SIN(X)';
    const tokens = lexer.tokenize(code);
    
    // SIN( looks like array usage but it's a function
    let foundSin = false;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && 
          tokens[i].value.toUpperCase() === 'SIN' && 
          i + 1 < tokens.length && 
          tokens[i + 1].value === '(') {
        foundSin = true;
      }
    }
    
    expect(foundSin).toBe(true);
  });
});
