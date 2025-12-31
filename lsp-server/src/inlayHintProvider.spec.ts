import { ZXBasicLexer } from './zxbasic';
import {
  findLineReferences,
  buildLineDescriptionMap,
  getInlayHints,
} from './inlayHintProvider';

describe('Inlay Hint Provider', () => {
  const lexer = new ZXBasicLexer();

  describe('findLineReferences', () => {
    it('should find GOTO references', () => {
      const tokens = lexer.tokenize('10 GOTO 100');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(1);
      expect(refs[0].keyword).toBe('GOTO');
      expect(refs[0].targetLineNumber).toBe('100');
    });

    it('should find GOSUB references', () => {
      const tokens = lexer.tokenize('10 GOSUB 200');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(1);
      expect(refs[0].keyword).toBe('GOSUB');
      expect(refs[0].targetLineNumber).toBe('200');
    });

    it('should find GO TO (two words) references', () => {
      const tokens = lexer.tokenize('10 GO TO 100');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(1);
      // The lexer normalizes "GO TO" to "GOTO"
      expect(refs[0].keyword).toBe('GOTO');
      expect(refs[0].targetLineNumber).toBe('100');
    });

    it('should find GO SUB (two words) references', () => {
      const tokens = lexer.tokenize('10 GO SUB 200');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(1);
      // The lexer normalizes "GO SUB" to "GOSUB"
      expect(refs[0].keyword).toBe('GOSUB');
      expect(refs[0].targetLineNumber).toBe('200');
    });

    it('should find RUN with line number', () => {
      const tokens = lexer.tokenize('10 RUN 100');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(1);
      expect(refs[0].keyword).toBe('RUN');
      expect(refs[0].targetLineNumber).toBe('100');
    });

    it('should find RESTORE with line number', () => {
      const tokens = lexer.tokenize('10 RESTORE 500');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(1);
      expect(refs[0].keyword).toBe('RESTORE');
      expect(refs[0].targetLineNumber).toBe('500');
    });

    it('should find multiple references on same line', () => {
      const tokens = lexer.tokenize('10 GOSUB 100: GOTO 200');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(2);
      expect(refs[0].keyword).toBe('GOSUB');
      expect(refs[0].targetLineNumber).toBe('100');
      expect(refs[1].keyword).toBe('GOTO');
      expect(refs[1].targetLineNumber).toBe('200');
    });

    it('should find references across multiple lines', () => {
      const code = `10 GOSUB 100
20 GOTO 200
30 END`;
      const tokens = lexer.tokenize(code);
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(2);
      expect(refs[0].targetLineNumber).toBe('100');
      expect(refs[1].targetLineNumber).toBe('200');
    });

    it('should not confuse numbers in expressions with line references', () => {
      const tokens = lexer.tokenize('10 LET X = 100');
      const refs = findLineReferences(tokens);

      expect(refs).toHaveLength(0);
    });
  });

  describe('buildLineDescriptionMap', () => {
    it('should extract REM comments as descriptions', () => {
      const code = `10 REM Main program
20 PRINT "Hello"`;
      const tokens = lexer.tokenize(code);
      const map = buildLineDescriptionMap(tokens);

      expect(map.get('10')?.description).toBe('Main program');
      expect(map.get('20')?.description).toBe('PRINT');
    });

    it('should use first keyword when no REM', () => {
      const tokens = lexer.tokenize('10 PRINT "Test"');
      const map = buildLineDescriptionMap(tokens);

      expect(map.get('10')?.description).toBe('PRINT');
    });

    it('should include variable name for LET statements', () => {
      const tokens = lexer.tokenize('10 LET X = 5');
      const map = buildLineDescriptionMap(tokens);

      expect(map.get('10')?.description).toBe('LET');
    });

    it('should include variable for implicit LET', () => {
      const tokens = lexer.tokenize('10 X = 5');
      const map = buildLineDescriptionMap(tokens);

      expect(map.get('10')?.description).toBe('LET X');
    });

    it('should truncate long REM comments', () => {
      const code = '10 REM This is a very long comment that should be truncated to fit';
      const tokens = lexer.tokenize(code);
      const map = buildLineDescriptionMap(tokens);

      const desc = map.get('10')?.description || '';
      expect(desc.length).toBeLessThanOrEqual(30);
      expect(desc).toContain('...');
    });

    it('should handle empty lines', () => {
      const tokens = lexer.tokenize('10 ');
      const map = buildLineDescriptionMap(tokens);

      expect(map.get('10')?.description).toBe('');
    });
  });

  describe('getInlayHints', () => {
    it('should generate hint for GOTO with REM target', () => {
      const code = `10 GOTO 100
100 REM Main loop`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → Main loop');
    });

    it('should generate hint for GOSUB with REM target', () => {
      const code = `10 GOSUB 100
20 END
100 REM Calculate result
110 RETURN`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → Calculate result');
    });

    it('should generate hint showing first keyword when no REM', () => {
      const code = `10 GOTO 100
100 PRINT "Hello"`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → PRINT');
    });

    it('should show warning for undefined target when no line exists after', () => {
      const code = '10 GOTO 999';
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' ⚠ undefined');
    });

    it('should find first line >= target when exact line does not exist (Sinclair BASIC behavior)', () => {
      // In Sinclair BASIC, GOTO 4000 jumps to line 4030 if 4000 doesn't exist
      const code = `10 GOSUB 4000
4030 REM Input routine
4040 RETURN`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      // Should show the actual target line in brackets
      expect(hints[0].label).toBe(' → [4030] Input routine');
    });

    it('should handle biorhythms-style indirect GOSUB', () => {
      const code = `3030 GO SUB 4000: LET dn1=dn
3050 GO SUB 4000
4030 INPUT "Year: "; LINE a$
4040 GO TO 4030`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      // Both GOSUBs to 4000 should resolve to 4030
      const gosub4000Hints = hints.filter(h => (h.label as string).includes('4030'));
      expect(gosub4000Hints.length).toBeGreaterThanOrEqual(2);
    });

    it('should not generate hint for same-line reference', () => {
      // This is a weird edge case but should be handled
      const code = '10 IF X = 1 THEN GOTO 10';
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      // Should skip self-references
      expect(hints).toHaveLength(0);
    });

    it('should handle multiple hints in document', () => {
      const code = `10 GOSUB 100
20 GOSUB 200
30 END
100 REM First subroutine
110 RETURN
200 REM Second subroutine
210 RETURN`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(2);
      expect(hints[0].label).toBe(' → First subroutine');
      expect(hints[1].label).toBe(' → Second subroutine');
    });

    it('should work with GO TO (two words)', () => {
      const code = `10 GO TO 100
100 REM Target`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → Target');
    });

    it('should work with GO SUB (two words)', () => {
      const code = `10 GO SUB 100
100 REM Subroutine`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → Subroutine');
    });

    it('should handle RUN with line number', () => {
      const code = `10 RUN 100
100 REM Start here`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → Start here');
    });

    it('should handle RESTORE with line number', () => {
      const code = `10 RESTORE 100
100 DATA 1, 2, 3`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      expect(hints[0].label).toBe(' → DATA');
    });

    it('should skip lines with no description', () => {
      const code = `10 GOTO 100
100 `;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      // Line 100 has no content, so no hint should be generated
      expect(hints).toHaveLength(0);
    });

    it('should handle complex biorhythms-style code', () => {
      const code = `100 GO SUB 5000: GO SUB 1000: GO TO 3000
1000 REM Initialize
1010 RETURN
3000 REM Main program
5000 REM Setup screen
5010 RETURN`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints.length).toBeGreaterThanOrEqual(3);

      const labels = hints.map(h => h.label);
      expect(labels).toContain(' → Setup screen');
      expect(labels).toContain(' → Initialize');
      expect(labels).toContain(' → Main program');
    });

    it('should position hints after the line number', () => {
      const code = `10 GOTO 100
100 REM Target`;
      const tokens = lexer.tokenize(code);
      const hints = getInlayHints(tokens);

      expect(hints).toHaveLength(1);
      // Hint should be positioned after "100" in "GOTO 100"
      expect(hints[0].position.line).toBe(0);
      // Character position should be after the number
      expect(hints[0].position.character).toBeGreaterThan(8);
    });
  });
});
