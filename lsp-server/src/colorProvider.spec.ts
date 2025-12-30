import { ZXBasicLexer } from './zxbasic';
import {
  findColorStatements,
  getDocumentColors,
  findNearestZXColor,
  getColorPresentations,
  getColorName,
  getColorRGB,
} from './colorProvider';

describe('Color Provider', () => {
  const lexer = new ZXBasicLexer();

  describe('findColorStatements', () => {
    it('should find INK statement with color value', () => {
      const tokens = lexer.tokenize('10 INK 2');
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(1);
      expect(colors[0].keyword).toBe('INK');
      expect(colors[0].colorValue).toBe(2);
    });

    it('should find PAPER statement with color value', () => {
      const tokens = lexer.tokenize('10 PAPER 5');
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(1);
      expect(colors[0].keyword).toBe('PAPER');
      expect(colors[0].colorValue).toBe(5);
    });

    it('should find BORDER statement with color value', () => {
      const tokens = lexer.tokenize('10 BORDER 1');
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(1);
      expect(colors[0].keyword).toBe('BORDER');
      expect(colors[0].colorValue).toBe(1);
    });

    it('should find multiple color statements', () => {
      const tokens = lexer.tokenize('10 INK 0: PAPER 7: BORDER 2');
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(3);
      expect(colors[0].keyword).toBe('INK');
      expect(colors[0].colorValue).toBe(0);
      expect(colors[1].keyword).toBe('PAPER');
      expect(colors[1].colorValue).toBe(7);
      expect(colors[2].keyword).toBe('BORDER');
      expect(colors[2].colorValue).toBe(2);
    });

    it('should skip special INK value 8 (transparent)', () => {
      const tokens = lexer.tokenize('10 INK 8');
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(0);
    });

    it('should skip special PAPER value 9 (contrast)', () => {
      const tokens = lexer.tokenize('10 PAPER 9');
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(0);
    });

    it('should find all valid colors 0-7', () => {
      const code = `10 INK 0
20 INK 1
30 INK 2
40 INK 3
50 INK 4
60 INK 5
70 INK 6
80 INK 7`;
      const tokens = lexer.tokenize(code);
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(8);
      for (let i = 0; i <= 7; i++) {
        expect(colors[i].colorValue).toBe(i);
      }
    });

    it('should handle multi-line program', () => {
      const code = `10 BORDER 0
20 INK 7
30 PAPER 1
40 PRINT "Hello"`;
      const tokens = lexer.tokenize(code);
      const colors = findColorStatements(tokens);

      expect(colors).toHaveLength(3);
      expect(colors[0]).toMatchObject({ keyword: 'BORDER', colorValue: 0, line: 0 });
      expect(colors[1]).toMatchObject({ keyword: 'INK', colorValue: 7, line: 1 });
      expect(colors[2]).toMatchObject({ keyword: 'PAPER', colorValue: 1, line: 2 });
    });
  });

  describe('getDocumentColors', () => {
    it('should return ColorInformation with correct RGB values', () => {
      const tokens = lexer.tokenize('10 INK 2');
      const colors = getDocumentColors(tokens);

      expect(colors).toHaveLength(1);
      expect(colors[0].color).toEqual({
        red: 0.803,
        green: 0,
        blue: 0,
        alpha: 1,
      });
    });

    it('should return correct RGB for black (0)', () => {
      const tokens = lexer.tokenize('10 INK 0');
      const colors = getDocumentColors(tokens);

      expect(colors[0].color).toEqual({
        red: 0,
        green: 0,
        blue: 0,
        alpha: 1,
      });
    });

    it('should return correct RGB for white (7)', () => {
      const tokens = lexer.tokenize('10 INK 7');
      const colors = getDocumentColors(tokens);

      expect(colors[0].color).toEqual({
        red: 0.803,
        green: 0.803,
        blue: 0.803,
        alpha: 1,
      });
    });

    it('should return correct RGB for blue (1)', () => {
      const tokens = lexer.tokenize('10 PAPER 1');
      const colors = getDocumentColors(tokens);

      expect(colors[0].color).toEqual({
        red: 0,
        green: 0,
        blue: 0.803,
        alpha: 1,
      });
    });

    it('should return correct RGB for green (4)', () => {
      const tokens = lexer.tokenize('10 BORDER 4');
      const colors = getDocumentColors(tokens);

      expect(colors[0].color).toEqual({
        red: 0,
        green: 0.803,
        blue: 0,
        alpha: 1,
      });
    });
  });

  describe('findNearestZXColor', () => {
    it('should find exact black', () => {
      const result = findNearestZXColor({ red: 0, green: 0, blue: 0, alpha: 1 });
      expect(result).toBe(0);
    });

    it('should find exact blue', () => {
      const result = findNearestZXColor({ red: 0, green: 0, blue: 0.803, alpha: 1 });
      expect(result).toBe(1);
    });

    it('should find exact red', () => {
      const result = findNearestZXColor({ red: 0.803, green: 0, blue: 0, alpha: 1 });
      expect(result).toBe(2);
    });

    it('should find nearest color for bright blue', () => {
      const result = findNearestZXColor({ red: 0, green: 0, blue: 1, alpha: 1 });
      expect(result).toBe(1); // Maps to regular blue
    });

    it('should find nearest color for pure green', () => {
      const result = findNearestZXColor({ red: 0, green: 1, blue: 0, alpha: 1 });
      expect(result).toBe(4); // Maps to green
    });

    it('should find nearest color for orange (between red and yellow)', () => {
      const result = findNearestZXColor({ red: 1, green: 0.5, blue: 0, alpha: 1 });
      // Orange is closer to red (2) or yellow (6) depending on values
      expect([2, 6]).toContain(result);
    });
  });

  describe('getColorPresentations', () => {
    it('should return color presentation with ZX color name', () => {
      const range = { start: { line: 0, character: 7 }, end: { line: 0, character: 8 } };
      const presentations = getColorPresentations(
        { red: 0.803, green: 0, blue: 0, alpha: 1 },
        range
      );

      expect(presentations).toHaveLength(1);
      expect(presentations[0].label).toBe('2 (Red)');
      expect(presentations[0].textEdit).toEqual({
        range,
        newText: '2',
      });
    });

    it('should snap to nearest ZX color', () => {
      const range = { start: { line: 0, character: 7 }, end: { line: 0, character: 8 } };
      const presentations = getColorPresentations(
        { red: 0, green: 0, blue: 1, alpha: 1 }, // Bright blue
        range
      );

      expect(presentations[0].label).toBe('1 (Blue)');
      expect(presentations[0].textEdit?.newText).toBe('1');
    });
  });

  describe('getColorName', () => {
    it('should return color name for valid colors', () => {
      expect(getColorName(0)).toBe('Black');
      expect(getColorName(1)).toBe('Blue');
      expect(getColorName(2)).toBe('Red');
      expect(getColorName(3)).toBe('Magenta');
      expect(getColorName(4)).toBe('Green');
      expect(getColorName(5)).toBe('Cyan');
      expect(getColorName(6)).toBe('Yellow');
      expect(getColorName(7)).toBe('White');
    });

    it('should return undefined for invalid colors', () => {
      expect(getColorName(-1)).toBeUndefined();
      expect(getColorName(100)).toBeUndefined();
    });
  });

  describe('getColorRGB', () => {
    it('should return RGB for valid colors', () => {
      expect(getColorRGB(0)).toEqual({ r: 0, g: 0, b: 0 });
      expect(getColorRGB(2)).toEqual({ r: 0.803, g: 0, b: 0 });
      expect(getColorRGB(7)).toEqual({ r: 0.803, g: 0.803, b: 0.803 });
    });

    it('should return undefined for invalid colors', () => {
      expect(getColorRGB(-1)).toBeUndefined();
      expect(getColorRGB(100)).toBeUndefined();
    });
  });
});
