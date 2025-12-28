import { ZXBasicLexer, TokenType } from "./zxbasic";

describe("Type Checking Diagnostics", () => {
  const lexer = new ZXBasicLexer();

  const testCode = `10 LET x = 10
20 LET name$ = "Alice"
30 LET result% = 42
40 INPUT "Enter value: "; inputval
50 INPUT "Enter name: "; inputname$
60 FOR i = 1 TO 10
70 LET y = ABS(x)
80 LET z = SQR(x)
90 REM Invalid operations:
100 LET bad1 = ABS(name$)
110 LET bad2 = SQR(inputname$)
120 LET concat = name$ + inputname$
`;

  function buildVariableTypes(
    tokens: any[],
  ): Map<string, "string" | "numeric" | "unknown"> {
    const variableTypes = new Map<string, "string" | "numeric" | "unknown">();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // LET assignments
      if (
        token.type === TokenType.KEYWORD &&
        token.value === "LET" &&
        i + 1 < tokens.length
      ) {
        const varToken = tokens[i + 1];
        if (varToken.type === TokenType.IDENTIFIER) {
          const varName = varToken.value.replace(/[$%]$/, "").toLowerCase();
          if (varToken.value.endsWith("$")) {
            variableTypes.set(varName, "string");
          } else if (varToken.value.endsWith("%")) {
            variableTypes.set(varName, "numeric");
          } else {
            variableTypes.set(varName, "numeric");
          }
        }
      }

      // INPUT statements
      if (token.type === TokenType.KEYWORD && token.value === "INPUT") {
        i++;
        while (
          i < tokens.length &&
          tokens[i].type !== TokenType.STATEMENT_SEPARATOR &&
          tokens[i].type !== TokenType.EOF
        ) {
          if (tokens[i].type === TokenType.IDENTIFIER) {
            const varName = tokens[i].value.replace(/[$%]$/, "").toLowerCase();
            if (tokens[i].value.endsWith("$")) {
              variableTypes.set(varName, "string");
            } else {
              variableTypes.set(varName, "numeric");
            }
          }
          i++;
        }
        i--;
      }

      // FOR loops
      if (
        token.type === TokenType.KEYWORD &&
        token.value === "FOR" &&
        i + 1 < tokens.length
      ) {
        const varToken = tokens[i + 1];
        if (varToken.type === TokenType.IDENTIFIER) {
          const varName = varToken.value.replace(/[$%]$/, "").toLowerCase();
          variableTypes.set(varName, "numeric");
        }
      }
    }

    return variableTypes;
  }

  function checkTypeMismatches(
    tokens: any[],
    variableTypes: Map<string, "string" | "numeric" | "unknown">,
  ): number {
    const numericFunctions = ["ABS", "SQR", "SIN", "COS"];
    let mismatchCount = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (
        token.type === TokenType.KEYWORD &&
        numericFunctions.includes(token.value) &&
        i + 1 < tokens.length &&
        tokens[i + 1].value === "("
      ) {
        if (
          i + 2 < tokens.length &&
          tokens[i + 2].type === TokenType.IDENTIFIER
        ) {
          const varName = tokens[i + 2].value
            .replace(/[$%]$/, "")
            .toLowerCase();
          const varType = variableTypes.get(varName);

          if (varType === "string") {
            mismatchCount++;
          }
        }
      }
    }

    return mismatchCount;
  }

  test("should infer variable types from LET assignments", () => {
    const tokens = lexer.tokenize(testCode);
    const variableTypes = buildVariableTypes(tokens);

    expect(variableTypes.get("x")).toBe("numeric");
    expect(variableTypes.get("name")).toBe("string");
    expect(variableTypes.get("result")).toBe("numeric");
  });

  test("should infer variable types from INPUT statements", () => {
    const tokens = lexer.tokenize(testCode);
    const variableTypes = buildVariableTypes(tokens);

    expect(variableTypes.get("inputval")).toBe("numeric");
    expect(variableTypes.get("inputname")).toBe("string");
  });

  test("should infer variable types from FOR loops", () => {
    const tokens = lexer.tokenize(testCode);
    const variableTypes = buildVariableTypes(tokens);

    expect(variableTypes.get("i")).toBe("numeric");
  });

  test("should detect type mismatches in numeric function calls", () => {
    const tokens = lexer.tokenize(testCode);
    const variableTypes = buildVariableTypes(tokens);
    const mismatchCount = checkTypeMismatches(tokens, variableTypes);

    expect(mismatchCount).toBe(2); // ABS(name$) and SQR(inputname$)
  });

  test("should handle valid types without mismatches", () => {
    const validCode = `10 LET x = 10
20 LET y = 42
30 LET result = ABS(x)
40 LET sqrt = SQR(y)`;

    const tokens = lexer.tokenize(validCode);
    const variableTypes = buildVariableTypes(tokens);
    const mismatchCount = checkTypeMismatches(tokens, variableTypes);

    expect(mismatchCount).toBe(0);
    expect(variableTypes.get("x")).toBe("numeric");
    expect(variableTypes.get("y")).toBe("numeric");
  });

  test("should support string concatenation without type errors", () => {
    const concatCode = `10 LET name1$ = "Alice"
20 LET name2$ = "Bob"
30 LET combined$ = name1$ + name2$`;

    const tokens = lexer.tokenize(concatCode);
    const variableTypes = buildVariableTypes(tokens);

    expect(variableTypes.get("name1")).toBe("string");
    expect(variableTypes.get("name2")).toBe("string");
    expect(variableTypes.get("combined")).toBe("string");
  });
});
