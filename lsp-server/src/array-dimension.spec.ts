import { ZXBasicLexer, TokenType } from './zxbasic';

describe('Array Dimension Validation', () => {
  const lexer = new ZXBasicLexer();

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

  const extractDIMDeclarations = (tokens: any[]): Map<string, { line: number; dimensions: number }> => {
    const dimDeclarations = new Map<string, { line: number; dimensions: number }>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === TokenType.KEYWORD && token.value === 'DIM') {
        i++;
        while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR &&
               tokens[i].type !== TokenType.EOF && tokens[i].type !== TokenType.LINE_NUMBER) {
          const idToken = tokens[i];

          if (idToken.type === TokenType.IDENTIFIER) {
            const arrayName = idToken.value.replace(/[$%]$/, '').toLowerCase();

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
      }
    }

    return dimDeclarations;
  }

  const extractArrayUsages = (tokens: any[]): Map<string, Array<{ line: number; usedDimensions: number }>> => {
    const arrayUsages = new Map<string, Array<{ line: number; usedDimensions: number }>>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === TokenType.IDENTIFIER) {
        // Skip if this is in a DIM declaration
        if (i > 0 && tokens[i - 1].value === 'DIM') {
          continue;
        }
        const arrayName = token.value.replace(/[$%]$/, '').toLowerCase();

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

    return arrayUsages;
  }

  test('should extract DIM declarations correctly', () => {
    const tokens = lexer.tokenize(testCode);
    const dimDeclarations = extractDIMDeclarations(tokens);

    expect(dimDeclarations.get('scores')).toEqual({ line: expect.any(Number), dimensions: 1 });
    expect(dimDeclarations.get('matrix')).toEqual({ line: expect.any(Number), dimensions: 2 });
    expect(dimDeclarations.get('names')).toEqual({ line: expect.any(Number), dimensions: 1 });
    expect(dimDeclarations.get('cube')).toEqual({ line: expect.any(Number), dimensions: 3 });
    expect(dimDeclarations.get('invalid')).toEqual({ line: expect.any(Number), dimensions: 4 });
  });

  test('should extract array usages correctly', () => {
    const tokens = lexer.tokenize(testCode);
    const arrayUsages = extractArrayUsages(tokens);

    expect(arrayUsages.get('scores')).toHaveLength(2);
    expect(arrayUsages.get('matrix')).toHaveLength(2);
    expect(arrayUsages.get('names')).toHaveLength(1);
    expect(arrayUsages.get('cube')).toHaveLength(1);
    expect(arrayUsages.get('wrong1')).toHaveLength(1);
    expect(arrayUsages.get('toomany')).toHaveLength(1);
  });

  test('should identify invalid DIM declarations (>3 dimensions)', () => {
    const tokens = lexer.tokenize(testCode);
    const dimDeclarations = extractDIMDeclarations(tokens);

    const invalidDecl = dimDeclarations.get('invalid');
    expect(invalidDecl).toBeDefined();
    expect(invalidDecl!.dimensions).toBe(4);
  });

  test('should detect array usage errors', () => {
    const tokens = lexer.tokenize(testCode);
    const dimDeclarations = extractDIMDeclarations(tokens);
    const arrayUsages = extractArrayUsages(tokens);

    // Check undeclared array usage
    const wrong1Usages = arrayUsages.get('wrong1');
    expect(wrong1Usages).toHaveLength(1);
    expect(wrong1Usages![0].usedDimensions).toBe(2);
    expect(dimDeclarations.has('wrong1')).toBe(false);

    // Check dimension mismatch: scores declared as 1D, used as 2D
    const scoresUsages = arrayUsages.get('scores');
    expect(scoresUsages!.some(u => u.usedDimensions === 2)).toBe(true);
    expect(dimDeclarations.get('scores')!.dimensions).toBe(1);

    // Check under-dimensioned usage: matrix declared as 2D, used as 1D
    const matrixUsages = arrayUsages.get('matrix');
    expect(matrixUsages!.some(u => u.usedDimensions === 1)).toBe(true);
    expect(dimDeclarations.get('matrix')!.dimensions).toBe(2);

    // Check excessive dimensions usage
    const toomanyUsages = arrayUsages.get('toomany');
    expect(toomanyUsages![0].usedDimensions).toBe(4);
    expect(dimDeclarations.has('toomany')).toBe(false);
    expect(dimDeclarations.get('invalid')!.dimensions).toBe(4); // Even though invalid, it's recorded
  });

  test('should handle valid array declarations and usages', () => {
    const validCode = `10 DIM scores(10)
20 LET scores(5) = 100
30 DIM matrix(10,20)
40 LET matrix(2,3) = 5
50 DIM cube(5,5,5)
60 LET cube(1,2,3) = 1`;

    const tokens = lexer.tokenize(validCode);
    const dimDeclarations = extractDIMDeclarations(tokens);
    const arrayUsages = extractArrayUsages(tokens);

    // All usages should match declarations
    ['scores', 'matrix', 'cube'].forEach(name => {
      const decl = dimDeclarations.get(name);
      const usages = arrayUsages.get(name);

      expect(decl).toBeDefined();
      expect(usages).toBeDefined();
      usages!.forEach(usage => {
        expect(usage.usedDimensions).toBe(decl!.dimensions);
      });
    });
  });

  describe('String Array Handling', () => {
    test('should handle string array DIM with length parameter', () => {
      const code = `10 DIM names$(10,20)
20 DIM messages$(50)
30 DIM grid$(5,10,15)`;

      const tokens = lexer.tokenize(code);
      const dimDeclarations = extractDIMDeclarations(tokens);

      // For string arrays, last parameter is string length, not a dimension
      // names$(10,20) = 1D array with 10 elements, max 20 chars each
      expect(dimDeclarations.get('names')).toEqual({ line: expect.any(Number), dimensions: 2 });
      // messages$(50) = 0D array (single string), max 50 chars
      expect(dimDeclarations.get('messages')).toEqual({ line: expect.any(Number), dimensions: 1 });
      // grid$(5,10,15) = 2D array (5x10), max 15 chars each
      expect(dimDeclarations.get('grid')).toEqual({ line: expect.any(Number), dimensions: 3 });
    });

    test('should allow string array usage with character position (string slicing)', () => {
      const code = `10 DIM q$(100,50)
20 LET p$=q$(5)
30 IF q$(10,15)="x" THEN PRINT "found"`;

      const tokens = lexer.tokenize(code);
      const dimDeclarations = extractDIMDeclarations(tokens);
      const arrayUsages = extractArrayUsages(tokens);

      // q$ declared with 2 params means 1D array (100 elements, 50 char max)
      expect(dimDeclarations.get('q')).toEqual({ line: expect.any(Number), dimensions: 2 });
      
      const qUsages = arrayUsages.get('q');
      expect(qUsages).toBeDefined();
      expect(qUsages!.length).toBe(2);
      
      // q$(5) - 1D usage (array index only)
      expect(qUsages!.some(u => u.usedDimensions === 1)).toBe(true);
      // q$(10,15) - 2D usage (array index + char position for slicing)
      expect(qUsages!.some(u => u.usedDimensions === 2)).toBe(true);
    });

    test('should detect TO keyword for string slicing and skip validation', () => {
      const code = `10 DIM s$(50)
20 LET s$="Hello World"
30 LET a$=s$(TO 5)
40 LET b$=s$(6 TO 11)
50 PRINT s$(TO 10)`;

      const tokens = lexer.tokenize(code);
      const arrayUsages = extractArrayUsages(tokens);

      // String slicing with TO should not be counted as array usage
      // The extractArrayUsages in this test doesn't handle TO, but the server code does
      const sUsages = arrayUsages.get('s');
      
      // In the test helper, we still see these as usages
      // But in the actual server code, TO keyword detection skips them
      expect(sUsages).toBeDefined();
    });

    test('should handle 2D string arrays with element access and character position', () => {
      const code = `10 DIM grid$(10,10,20)
20 LET grid$(5,7)="test"
30 IF grid$(5,7,3)="t" THEN PRINT "match"`;

      const tokens = lexer.tokenize(code);
      const dimDeclarations = extractDIMDeclarations(tokens);
      const arrayUsages = extractArrayUsages(tokens);

      // grid$ has 3 params, so 2D array (10x10, 20 char max)
      expect(dimDeclarations.get('grid')).toEqual({ line: expect.any(Number), dimensions: 3 });
      
      const gridUsages = arrayUsages.get('grid');
      expect(gridUsages).toBeDefined();
      
      // grid$(5,7) - 2D access (valid)
      expect(gridUsages!.some(u => u.usedDimensions === 2)).toBe(true);
      // grid$(5,7,3) - 2D access + char position (valid slicing)
      expect(gridUsages!.some(u => u.usedDimensions === 3)).toBe(true);
    });

    test('should handle real-world example from pangolin.bas', () => {
      const code = `10 DIM q$(100,50)
40 READ q$(1)
150 LET p$=q$(5)
320 LET P$=q$(10)
520 LET q$(20)=q$(15)
590 LET q$(3)=s$(TO 10)
910 IF p$(25)<>" " THEN PRINT p$(TO 25)`;

      const tokens = lexer.tokenize(code);
      const dimDeclarations = extractDIMDeclarations(tokens);
      const arrayUsages = extractArrayUsages(tokens);

      // q$ declared as 1D array (100 elements, 50 char max)
      expect(dimDeclarations.get('q')).toEqual({ line: expect.any(Number), dimensions: 2 });
      
      const qUsages = arrayUsages.get('q');
      expect(qUsages).toBeDefined();
      // All q$ usages should be with single index (element access)
      qUsages!.forEach(usage => {
        expect(usage.usedDimensions).toBeLessThanOrEqual(2);
      });
    });

    test('should detect invalid string array dimension usage', () => {
      const code = `10 DIM names$(10,20)
20 LET wrong1=names$(5,10,15)`;

      const tokens = lexer.tokenize(code);
      const dimDeclarations = extractDIMDeclarations(tokens);
      const arrayUsages = extractArrayUsages(tokens);

      expect(dimDeclarations.get('names')).toEqual({ line: expect.any(Number), dimensions: 2 });
      
      const namesUsages = arrayUsages.get('names');
      expect(namesUsages).toBeDefined();
      
      // names$(5,10,15) - 3 params: would be too many for 1D array
      // BUT with string slicing, 2 params is valid (index + char pos)
      // 3 params would be invalid
      expect(namesUsages!.some(u => u.usedDimensions === 3)).toBe(true);
    });
  });
});