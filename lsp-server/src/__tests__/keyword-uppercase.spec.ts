import { uppercaseKeywords } from '../formatting-utils';

describe('Keyword Uppercasing', () => {
    it('should uppercase keywords', () => {
        expect(uppercaseKeywords('print "hello"')).toBe('PRINT "hello"');
        expect(uppercaseKeywords('let x = 10')).toBe('LET x = 10');
        expect(uppercaseKeywords('if x=1 then goto 10')).toBe('IF x=1 THEN GOTO 10');
    });

    it('should uppercase operators', () => {
        expect(uppercaseKeywords('if x and y or z')).toBe('IF x AND y OR z');
        expect(uppercaseKeywords('let x = not y')).toBe('LET x = NOT y');
    });

    it('should not uppercase inside strings', () => {
        expect(uppercaseKeywords('print "print"')).toBe('PRINT "print"');
        expect(uppercaseKeywords('let s$ = "and or not"')).toBe('LET s$ = "and or not"');
    });

    it('should not uppercase inside REM comments', () => {
        expect(uppercaseKeywords('10 rem print command')).toBe('10 REM print command');
        expect(uppercaseKeywords('20 : rem if then else')).toBe('20 : REM if then else');
    });

    it('should handle mixed case keywords', () => {
        expect(uppercaseKeywords('Print "Hello"')).toBe('PRINT "Hello"');
        expect(uppercaseKeywords('LeT x = 1')).toBe('LET x = 1');
    });

    it('should handle special keywords', () => {
        expect(uppercaseKeywords('go to 10')).toBe('GO TO 10');
        expect(uppercaseKeywords('go sub 100')).toBe('GO SUB 100');
        expect(uppercaseKeywords('def fn a(x) = x*x')).toBe('DEF FN a(x) = x*x');
    });
});
