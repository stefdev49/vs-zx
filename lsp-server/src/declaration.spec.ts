import { describe, it, expect } from "@jest/globals";
import { findDeclarationRange } from "./declaration-utils";

function extractText(
  text: string,
  rangeStartLine: number,
  rangeStartChar: number,
  rangeEndLine: number,
  rangeEndChar: number,
): string {
  const lines = text.split("\n");
  if (rangeStartLine === rangeEndLine) {
    return lines[rangeStartLine].slice(rangeStartChar, rangeEndChar);
  }
  const start = lines[rangeStartLine].slice(rangeStartChar);
  const middle = lines.slice(rangeStartLine + 1, rangeEndLine).join("\n");
  const end = lines[rangeEndLine].slice(0, rangeEndChar);
  return [start, middle, end].filter(Boolean).join("\n");
}

describe("Declaration utilities", () => {
  it("finds LET assignment declarations", () => {
    const program = `10 LET counter = 0\n20 PRINT counter`;
    const range = findDeclarationRange(program, "counter");
    expect(range).toBeTruthy();
    const identifier = extractText(
      program,
      range!.start.line,
      range!.start.character,
      range!.end.line,
      range!.end.character,
    );
    expect(identifier).toBe("counter");
  });

  it("finds implicit assignments without LET keyword", () => {
    const program = `10 total = 42\n20 PRINT total`;
    const range = findDeclarationRange(program, "total");
    expect(range).toBeTruthy();
    const identifier = extractText(
      program,
      range!.start.line,
      range!.start.character,
      range!.end.line,
      range!.end.character,
    );
    expect(identifier).toBe("total");
  });

  it("finds declarations for compact LET statements used later in expressions", () => {
    const program = `10 LET qf=8\n20 FOR n=1 TO qf/2-1`;
    const range = findDeclarationRange(program, "qf");
    expect(range).toBeTruthy();
    const identifier = extractText(
      program,
      range!.start.line,
      range!.start.character,
      range!.end.line,
      range!.end.character,
    );
    expect(identifier).toBe("qf");
  });

  it("finds DIM declarations for arrays", () => {
    const program = `10 DIM scores(10)\n20 PRINT scores(1)`;
    const range = findDeclarationRange(program, "scores");
    expect(range).toBeTruthy();
    const identifier = extractText(
      program,
      range!.start.line,
      range!.start.character,
      range!.end.line,
      range!.end.character,
    );
    expect(identifier).toBe("scores");
  });

  it("finds INPUT declarations for variables", () => {
    const program = `10 INPUT "Guess";g$
20 PRINT g$`;
    const range = findDeclarationRange(program, "g$");
    expect(range).toBeTruthy();
    const identifier = extractText(
      program,
      range!.start.line,
      range!.start.character,
      range!.end.line,
      range!.end.character,
    );
    expect(identifier).toBe("g$");
  });

  it("finds INPUT LINE declarations for variables", () => {
    const program = `10 INPUT LINE "Enter name";a$
20 PRINT a$`;
    const range = findDeclarationRange(program, "a$");
    expect(range).toBeTruthy();
    const identifier = extractText(
      program,
      range!.start.line,
      range!.start.character,
      range!.end.line,
      range!.end.character,
    );
    expect(identifier).toBe("a$");
  });

  it("returns null when declaration is missing", () => {
    const program = `10 PRINT x`;
    const range = findDeclarationRange(program, "x");
    expect(range).toBeNull();
  });
});
