/**
 * Integration test for tokenization/detokenization
 * Tests the complete round-trip: BASIC → Tokens → BASIC
 */

import { tokenizeLine } from "./tokenizer";
import { createMdrFile, parseMdrFile } from "./mdr-format";

describe("Tokenization Integration Tests", () => {
  // Simple test program with known tokens
  const simpleProgram = `10 REM Simple Test
20 INPUT "Name"; n$
30 PRINT "Hello "; n$
40 GO SUB 1000
50 IF x > 10 THEN PRINT "Big"
60 FOR i = 1 TO 10
70 NEXT i
80 GO TO 10
1000 RETURN`;

  describe("Individual Token Tests", () => {
    it("should tokenize REM correctly", () => {
      const result = tokenizeLine("REM This is a comment");
      // REM should be token 0x46
      expect(result[0]).toBe(0x46);
    });

    it("should tokenize INPUT correctly", () => {
      const result = tokenizeLine('INPUT "Name"; n$');
      // INPUT should be token 0x4A
      expect(result[0]).toBe(0x4a);
    });

    it("should tokenize PRINT correctly", () => {
      const result = tokenizeLine('PRINT "Hello"');
      // PRINT should be token 0x51
      expect(result[0]).toBe(0x51);
    });

    it("should tokenize GO SUB correctly", () => {
      const result = tokenizeLine("GO SUB 1000");
      // GO SUB should be token 0x49
      expect(result[0]).toBe(0x49);
    });

    it("should tokenize IF correctly", () => {
      const result = tokenizeLine('IF x > 10 THEN PRINT "Big"');
      // IF should be token 0x56
      expect(result[0]).toBe(0x56);
    });

    it("should tokenize FOR correctly", () => {
      const result = tokenizeLine("FOR i = 1 TO 10");
      // FOR should be token 0x47
      expect(result[0]).toBe(0x47);
    });

    it("should tokenize NEXT correctly", () => {
      const result = tokenizeLine("NEXT i");
      // NEXT should be token 0x4F
      expect(result[0]).toBe(0x4f);
    });
  });

  describe("MDR Round-trip Tests", () => {
    it("should round-trip simple program correctly", () => {
      const mdrBuffer = createMdrFile(simpleProgram, "SIMPLE", "TESTCART");
      const result = parseMdrFile(mdrBuffer);

      expect(result.programs.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);

      const extracted = result.programs[0].source;

      // Check that key tokens are preserved
      expect(extracted).toContain("REM");
      expect(extracted).toContain("INPUT");
      expect(extracted).toContain("PRINT");
      expect(extracted).toContain("GO SUB");
      expect(extracted).toContain("IF");
      expect(extracted).toContain("FOR");
      expect(extracted).toContain("NEXT");
      expect(extracted).toContain("GO TO");
      expect(extracted).toContain("RETURN");
    });

    it("should handle string literals correctly", () => {
      const programWithStrings = '10 PRINT "Hello World"\n20 INPUT "Name"; n$';
      const mdrBuffer = createMdrFile(
        programWithStrings,
        "STRTEST",
        "TESTCART",
      );
      const result = parseMdrFile(mdrBuffer);

      expect(result.programs.length).toBeGreaterThan(0);
      const extracted = result.programs[0].source;

      // Should preserve string content
      expect(extracted).toContain("PRINT");
      expect(extracted).toContain("INPUT");
    });

    it("should handle numeric expressions correctly", () => {
      const programWithMath =
        '10 LET x = 10 + 20\n20 IF x > 15 THEN PRINT "Big"';
      const mdrBuffer = createMdrFile(programWithMath, "MATHTEST", "TESTCART");
      const result = parseMdrFile(mdrBuffer);

      expect(result.programs.length).toBeGreaterThan(0);
      const extracted = result.programs[0].source;

      expect(extracted).toContain("LET");
      expect(extracted).toContain("IF");
      expect(extracted).toContain("PRINT");
    });
  });

  describe("Hangman Program Test", () => {
    // Test with the actual hangman program that was failing
    const hangmanProgram = `5 REM hangman
10 REM set up screen
20 INK 0: PAPER 7: CLS
30 LET x=240: GO SUB 1000: REM draw man
40 PLOT 238,128: DRAW 4,0: REM mouth
100 REM set up word
110 INPUT w$: REM word to guess
120 LET b=LEN w$: LET v$=" "`;

    it("should tokenize hangman program correctly", () => {
      const mdrBuffer = createMdrFile(hangmanProgram, "HANGTEST", "TESTCART");
      const result = parseMdrFile(mdrBuffer);

      expect(result.programs.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);

      const extracted = result.programs[0].source;

      // Check that the extracted program contains the expected keywords
      expect(extracted).toContain("REM hangman");
      expect(extracted).toContain("INK");
      expect(extracted).toContain("PAPER");
      expect(extracted).toContain("CLS");
      expect(extracted).toContain("LET");
      expect(extracted).toContain("GO SUB");
      expect(extracted).toContain("PLOT");
      expect(extracted).toContain("DRAW");
      expect(extracted).toContain("INPUT");
      expect(extracted).toContain("LEN");

      // Should NOT contain corrupted tokens
      expect(extracted).not.toContain("SIN");
      expect(extracted).not.toContain("COS");
      expect(extracted).not.toContain("TAN");
      expect(extracted).not.toContain("LLIST");
      expect(extracted).not.toContain("FORMAT");
    });
  });

  describe("Token Mapping Verification", () => {
    // Verify that our detokenization mapping matches the tokenization
    const tokenTests = [
      { keyword: "REM", token: 0x46 },
      { keyword: "INPUT", token: 0x4a },
      { keyword: "PRINT", token: 0x51 },
      { keyword: "GO TO", token: 0x48 },
      { keyword: "GO SUB", token: 0x49 },
      { keyword: "IF", token: 0x56 },
      { keyword: "FOR", token: 0x47 },
      { keyword: "NEXT", token: 0x4f },
      { keyword: "LET", token: 0x4d },
      { keyword: "CLS", token: 0x57 },
      { keyword: "INK", token: 0x35 },
      { keyword: "PAPER", token: 0x36 },
    ];

    tokenTests.forEach(({ keyword, token }) => {
      it(`should map ${keyword} (token ${token.toString(16)}) correctly`, () => {
        // Tokenize the keyword
        const tokenized = tokenizeLine(keyword);
        expect(tokenized[0]).toBe(token);

        // Create a simple program with this keyword
        const program = `10 ${keyword} test`;
        const mdrBuffer = createMdrFile(program, "TOKENTEST", "TESTCART");
        const result = parseMdrFile(mdrBuffer);

        expect(result.programs.length).toBeGreaterThan(0);
        const extracted = result.programs[0].source;

        // The extracted program should contain the original keyword
        expect(extracted).toContain(keyword.toUpperCase());
      });
    });
  });
});
