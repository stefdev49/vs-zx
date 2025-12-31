import { ZXBasicLexer } from './zxbasic';
import { DocumentHighlightKind } from 'vscode-languageserver/node';
import {
  findTokenAtPosition,
  getDocumentHighlights,
} from './documentHighlightProvider';

describe('Document Highlight Provider', () => {
  const lexer = new ZXBasicLexer();

  describe('findTokenAtPosition', () => {
    it('should find token at position', () => {
      const tokens = lexer.tokenize('10 LET x = 5');
      const result = findTokenAtPosition(tokens, { line: 0, character: 7 });

      expect(result).not.toBeNull();
      expect(result!.token.value).toBe('x');
    });

    it('should return null when no token at position', () => {
      const tokens = lexer.tokenize('10 LET x = 5');
      // Position in whitespace
      const result = findTokenAtPosition(tokens, { line: 0, character: 6 });

      expect(result).toBeNull();
    });

    it('should handle multi-line code', () => {
      const code = `10 LET x = 5
20 LET y = 10`;
      const tokens = lexer.tokenize(code);

      // Find 'y' on second line
      const result = findTokenAtPosition(tokens, { line: 1, character: 7 });

      expect(result).not.toBeNull();
      expect(result!.token.value).toBe('y');
    });
  });

  describe('getDocumentHighlights for identifiers', () => {
    it('should highlight all occurrences of a variable', () => {
      const code = `10 LET x = 5
20 LET y = x + 1
30 PRINT x`;
      const tokens = lexer.tokenize(code);

      // Position on 'x' in line 10
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(3);
    });

    it('should mark LET assignments as Write', () => {
      const code = '10 LET x = 5';
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(1);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write);
    });

    it('should mark expression usages as Read', () => {
      const code = `10 LET x = 5
20 PRINT x`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(2);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // LET x
      expect(highlights[1].kind).toBe(DocumentHighlightKind.Read);  // PRINT x
    });

    it('should mark FOR loop variable as Write', () => {
      const code = `10 FOR i = 1 TO 10
20 PRINT i
30 NEXT i`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(3);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // FOR i
      expect(highlights[1].kind).toBe(DocumentHighlightKind.Read);  // PRINT i
      expect(highlights[2].kind).toBe(DocumentHighlightKind.Read);  // NEXT i
    });

    it('should mark INPUT variable as Write', () => {
      const code = `10 INPUT a
20 PRINT a`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 9 });

      expect(highlights).toHaveLength(2);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // INPUT a
      expect(highlights[1].kind).toBe(DocumentHighlightKind.Read);  // PRINT a
    });

    it('should mark DIM array as Write', () => {
      const code = `10 DIM arr(10)
20 LET arr(1) = 5`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(2);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // DIM arr
      expect(highlights[1].kind).toBe(DocumentHighlightKind.Write); // LET arr(1) = 5
    });

    it('should mark READ variable as Write', () => {
      const code = `10 READ x
20 PRINT x
30 DATA 5`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 8 });

      expect(highlights).toHaveLength(2);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // READ x
      expect(highlights[1].kind).toBe(DocumentHighlightKind.Read);  // PRINT x
    });

    it('should be case-insensitive for identifiers', () => {
      const code = `10 LET X = 5
20 PRINT x`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(2);
    });

    it('should not highlight different variables', () => {
      const code = `10 LET x = 5
20 LET y = 10`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(1);
      expect(highlights[0].range.start.line).toBe(0);
    });
  });

  describe('getDocumentHighlights for line numbers', () => {
    it('should highlight line number definition and GOTO reference', () => {
      const code = `10 GOTO 20
20 PRINT "Hello"`;
      const tokens = lexer.tokenize(code);

      // Click on line number 20 definition
      const highlights = getDocumentHighlights(tokens, { line: 1, character: 0 });

      expect(highlights).toHaveLength(2);
      expect(highlights.every(h => h.kind === DocumentHighlightKind.Text)).toBe(true);
    });

    it('should highlight from GOTO reference', () => {
      const code = `10 GOTO 20
20 PRINT "Hello"`;
      const tokens = lexer.tokenize(code);

      // Click on "20" in GOTO 20
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 8 });

      expect(highlights).toHaveLength(2);
    });

    it('should highlight multiple GOSUB references', () => {
      const code = `10 GOSUB 100
20 GOSUB 100
100 REM subroutine
110 RETURN`;
      const tokens = lexer.tokenize(code);

      // Click on line 100 definition
      const highlights = getDocumentHighlights(tokens, { line: 2, character: 0 });

      expect(highlights).toHaveLength(3); // 2 GOSUB refs + 1 definition
    });

    it('should handle GO TO and GO SUB (two words)', () => {
      const code = `10 GO TO 20
20 GO SUB 30
30 RETURN`;
      const tokens = lexer.tokenize(code);

      // Click on "20" in GO TO 20
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 9 });

      expect(highlights.length).toBeGreaterThanOrEqual(1);
    });

    it('should not highlight numbers in expressions as line references', () => {
      const code = `10 LET x = 100
20 GOTO 100
100 PRINT x`;
      const tokens = lexer.tokenize(code);

      // Click on line number 100 definition
      const highlights = getDocumentHighlights(tokens, { line: 2, character: 0 });

      // Should find definition + GOTO reference, but NOT LET x = 100
      expect(highlights).toHaveLength(2);
    });
  });

  describe('getDocumentHighlights for DEF FN functions', () => {
    it('should highlight DEF FN definition and FN calls', () => {
      const code = `10 DEF FN add(a,b) = a + b
20 PRINT FN add(1,2)
30 LET x = FN add(3,4)`;
      const tokens = lexer.tokenize(code);

      // Click on function name in definition
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 10 });

      expect(highlights).toHaveLength(3);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // DEF FN add
    });

    it('should highlight from FN call', () => {
      const code = `10 DEF FN sq(x) = x * x
20 PRINT FN sq(5)`;
      const tokens = lexer.tokenize(code);

      // Click on FN call
      const highlights = getDocumentHighlights(tokens, { line: 1, character: 12 });

      expect(highlights.length).toBeGreaterThanOrEqual(2);
    });

    it('should be case-insensitive for function names', () => {
      const code = `10 DEF FN Test(x) = x * 2
20 PRINT FN TEST(5)
30 LET y = FN test(10)`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 10 });

      expect(highlights).toHaveLength(3);
    });
  });

  describe('getDocumentHighlights edge cases', () => {
    it('should return empty array when clicking on keyword', () => {
      const code = '10 PRINT "Hello"';
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 3 });

      expect(highlights).toHaveLength(0);
    });

    it('should return empty array when clicking on string literal', () => {
      const code = '10 PRINT "Hello"';
      const tokens = lexer.tokenize(code);

      // Click on string
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 10 });

      expect(highlights).toHaveLength(0);
    });

    it('should return empty array when clicking on number in expression', () => {
      const code = '10 LET x = 100 + 50';
      const tokens = lexer.tokenize(code);

      // Click on 100 (not a line reference)
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 11 });

      expect(highlights).toHaveLength(0);
    });

    it('should handle multiple statements on same line', () => {
      const code = '10 LET x = 1: LET y = x: PRINT x';
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(3); // LET x, y = x, PRINT x
    });

    it('should distinguish IF comparison from LET assignment', () => {
      const code = `10 LET x = 5
20 IF x = 5 THEN PRINT "yes"`;
      const tokens = lexer.tokenize(code);

      const highlights = getDocumentHighlights(tokens, { line: 0, character: 7 });

      expect(highlights).toHaveLength(2);
      expect(highlights[0].kind).toBe(DocumentHighlightKind.Write); // LET x = 5
      expect(highlights[1].kind).toBe(DocumentHighlightKind.Read);  // IF x = 5
    });

    it('should handle biorhythms-style complex code', () => {
      const code = `100 GO SUB 5000: GO SUB 1000: GO TO 3000
1000 DIM p$(185): FOR n=0 TO 184: LET p$(n+1)=CHR$ ((16*SIN (PI*n/92))+144): NEXT n
5000 BORDER 0: INK 7: RETURN
3000 CLS : PRINT "BIORHYTHMS"`;
      const tokens = lexer.tokenize(code);

      // Click on 5000 reference in GO SUB (position 11-15 based on token debug)
      const highlights = getDocumentHighlights(tokens, { line: 0, character: 12 });

      expect(highlights).toHaveLength(2); // reference + definition
    });
  });
});
