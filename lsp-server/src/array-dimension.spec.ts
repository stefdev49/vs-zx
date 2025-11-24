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
});
