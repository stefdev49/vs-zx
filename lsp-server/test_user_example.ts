import { TextDocument } from "vscode-languageserver-textdocument";
import { formatLine } from "./src/formatting-utils";
import { ZXBasicLexer, TokenType } from "./src/zxbasic";

function createDocument(contents: string): TextDocument {
  return TextDocument.create("file:///test.bas", "zx-basic", 1, contents);
}

// Test the exact example from the user
const doc = createDocument("50 for i=1 to 255");
const lexer = new ZXBasicLexer();
const tokens = lexer
  .tokenize("50 for i=1 to 255")
  .filter((t) => t.type !== TokenType.EOF);

console.log('Original line: "50 for i=1 to 255"');
console.log("Tokens:");
tokens.forEach((token) => {
  console.log(`  Type: ${token.type}, Value: "${token.value}"`);
});

const result = formatLine(tokens, doc);
console.log("\nFormatted result:", result?.newText || "null");
console.log('Expected result:  "50 FOR I = 1 TO 255"');
console.log("Test passed:", result?.newText === "50 FOR I = 1 TO 255");
