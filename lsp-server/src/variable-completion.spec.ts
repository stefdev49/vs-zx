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

const extractArrays = (tokens: any[]): string[] => {
  const arrayNames = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
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
        }
      }
    }
  }

  return Array.from(arrayNames).sort();
};

const extractVariables = (tokens: any[]): string[] => {
  const variableNames = new Set<string>();
  const arrayNames = new Set<string>();

  // First pass: collect arrays
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DIM' && i + 1 < tokens.length) {
      i++;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && tokens[i].type !== TokenType.EOF) {
        if (tokens[i].type === TokenType.IDENTIFIER) {
          const arrayName = tokens[i].value.replace(/[$%]$/, '');
          if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
            arrayNames.add(arrayName);
          }
        }
        i++;
      }
    } else if (token.type === TokenType.IDENTIFIER) {
      const varName = token.value.replace(/[$%]$/, '');
      if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
        if (!arrayNames.has(varName)) {
          arrayNames.add(varName);
        }
      }
      // Even if it's array, we add it as variable? No, wait, variables are non-arrays.
    }
    i++;
  }

  // Second pass: variables
  i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === TokenType.IDENTIFIER) {
      const varName = token.value.replace(/[$%]$/, '');

      if (!arrayNames.has(varName) && i + 1 < tokens.length && tokens[i + 1].value !== '(') {
        // Filter out keywords and built-ins
        if (!/^(LINE|END|INPUT|PRINT|READ|DATA|NEXT|FOR|IF|THEN|GOSUB|RETURN|LET|DIM)$/i.test(varName)) {
          variableNames.add(varName);
        }
      }
    }
    i++;
  }

  return Array.from(variableNames).sort();
};

const filterPrefix = (prefix: string, names: string[]): string[] => {
  return names.filter(n => n.toUpperCase().startsWith(prefix.toUpperCase()));
};

describe('Variable and Array Completion', () => {
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(testCode);

  test('should extract arrays correctly', () => {
    const arrays = extractArrays(tokens);
    expect(arrays).toEqual(['NAMES', 'SCORES']);
  });

  test('should extract variables correctly', () => {
    const variables = extractVariables(tokens);
    expect(variables).toEqual(['COUNT', 'I', 'PLAYER', 'RESULT', 'S', 'SCORE', 'X', 'Y', 'Z']);
  });

  test('should filter variables by prefix', () => {
    const variables = extractVariables(tokens);
    expect(filterPrefix('p', variables)).toEqual(['PLAYER']);
    expect(filterPrefix('c', variables)).toEqual(['COUNT']);
    expect(filterPrefix('s', variables)).toEqual(['S', 'SCORE']);
  });

  test('should filter arrays by prefix', () => {
    const arrays = extractArrays(tokens);
    expect(filterPrefix('n', arrays)).toEqual(['NAMES']);
    expect(filterPrefix('s', arrays)).toEqual(['SCORES']);
  });
});
