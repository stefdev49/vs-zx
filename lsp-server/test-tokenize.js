const { ZXBasicLexer } = require('./out/zxbasic');

const lexer = new ZXBasicLexer();
const code = '20 IF IN 247<128 THEN GO TO 99';
const tokens = lexer.tokenize(code);

console.log('Tokens for:', code);
tokens.forEach((t, i) => {
  console.log(`${i}: [${t.start}-${t.end}] ${t.type.padEnd(20)} "${t.value}"`);
});
