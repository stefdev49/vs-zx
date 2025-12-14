/**
 * Integration tests for format-on-type keyword capitalization
 */
import { ZXBasicLexer, TokenType } from "../zxbasic";
import {
  getWordBeforePosition,
  checkKeywordContext,
  findLastKeywordOnLine,
} from "../formatting-utils";

describe("Format-on-Type Integration Tests", () => {
  describe("getWordBeforePosition", () => {
    const testCases = [
      { text: 'print "hello"', pos: 5, expected: "print" },
      { text: "for i=0 to 255", pos: 3, expected: "for" },
      { text: "let x=5", pos: 3, expected: "let" },
      { text: "if x>0 then", pos: 2, expected: "if" },
      { text: "  for i=0", pos: 5, expected: "for" },
      { text: "myVar = 5", pos: 5, expected: "myVar" },
    ];

    testCases.forEach(({ text, pos, expected }) => {
      it(`should extract word before position: "${text}" at ${pos}`, () => {
        const result = getWordBeforePosition(text, pos);
        expect(result).toBe(expected);
      });
    });

    it("should return null when no word found", () => {
      const result = getWordBeforePosition("hello world", 0);
      expect(result).toBeNull();
    });
  });

  describe("checkKeywordContext", () => {
    const keywordTests = [
      // Valid keywords that should be uppercased
      {
        word: "print",
        line: 'print "hello"',
        pos: 5,
        isKeyword: true,
        isVariable: false,
      },
      {
        word: "for",
        line: "for i=0 to 255",
        pos: 3,
        isKeyword: true,
        isVariable: false,
      },
      {
        word: "let",
        line: "let x=5",
        pos: 3,
        isKeyword: true,
        isVariable: false,
      },
      {
        word: "if",
        line: "if x>0 then",
        pos: 2,
        isKeyword: true,
        isVariable: false,
      },

      // Keywords in variable context (should NOT be uppercased)
      {
        word: "for",
        line: "DIM for = 5",
        pos: 7,
        isKeyword: true,
        isVariable: true,
      },
      {
        word: "let",
        line: "INPUT let = 5",
        pos: 9,
        isKeyword: true,
        isVariable: true,
      },

      // Non-keywords
      {
        word: "myVar",
        line: "myVar = 5",
        pos: 5,
        isKeyword: false,
        isVariable: false,
      },
      {
        word: "counter",
        line: "counter = 10",
        pos: 7,
        isKeyword: false,
        isVariable: false,
      },
    ];

    keywordTests.forEach(({ word, line, pos, isKeyword, isVariable }) => {
      it(`should correctly classify: "${word}" in "${line}"`, () => {
        const result = checkKeywordContext(word, line, pos);
        expect(result.isKeyword).toBe(isKeyword);
        expect(result.isVariable).toBe(isVariable);
      });
    });

    it("should skip already uppercase keywords", () => {
      const result = checkKeywordContext("PRINT", 'PRINT "hello"', 5);
      expect(result.isKeyword).toBe(false);
      expect(result.isVariable).toBe(false);
    });
  });

  describe("findLastKeywordOnLine", () => {
    const testCases = [
      { line: '2050 print "data over"', expected: "print" },
      { line: "10 for i=0 to 255", expected: "for" },
      { line: "20 let x=5", expected: "let" },
      { line: "30 if x>0 then goto 100", expected: "if" },
      { line: "40 gosub 1000", expected: "gosub" },
      { line: "50 stop", expected: "stop" },
      { line: "60 dim myArray(10)", expected: "dim" },
      { line: "70 noKeywordHere", expected: null },
      { line: "80 REM this is a comment", expected: null },
      { line: '90 PRINT "keyword in string"', expected: null },
    ];

    testCases.forEach(({ line, expected }) => {
      it(`should find last keyword: "${line}"`, () => {
        const result = findLastKeywordOnLine(line);
        expect(result).toBe(expected);
      });
    });
  });

  describe("Integration Scenarios", () => {
    const lexer = new ZXBasicLexer();

    it("should handle FOR...TO loop correctly", () => {
      const line = "80 FOR i=0 TO 255";
      const tokens = lexer
        .tokenize(line)
        .filter((t) => t.type !== TokenType.EOF);

      // Should have FOR, i, =, 0, TO, 255 tokens
      expect(tokens.length).toBe(6);
      expect(tokens[0].value).toBe("FOR");
      expect(tokens[4].value).toBe("TO");
    });

    it("should preserve variable case in mixed scenarios", () => {
      const line = "LET myVariable = 5";
      const tokens = lexer
        .tokenize(line)
        .filter((t) => t.type !== TokenType.EOF);

      // Should have LET, myVariable, =, 5 tokens
      expect(tokens.length).toBe(4);
      expect(tokens[0].value).toBe("LET");
      expect(tokens[1].value).toBe("myVariable"); // Variable preserved
    });

    it("should handle string literals correctly", () => {
      const line = 'PRINT "for i=0 to 255"';
      const result = findLastKeywordOnLine(line);

      // Should not find keywords inside strings
      expect(result).toBe("PRINT");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty lines", () => {
      const result = getWordBeforePosition("", 0);
      expect(result).toBeNull();
    });

    it("should handle lines with only spaces", () => {
      const result = getWordBeforePosition("   ", 3);
      expect(result).toBeNull();
    });

    it("should handle very long keywords", () => {
      const longLine = "VERYLONGKEYWORDNAME that should not match";
      const result = findLastKeywordOnLine(longLine);
      // Should not match non-existent long keywords
      expect(result).toBeNull();
    });
  });
});
