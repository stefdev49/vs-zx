import { ZXBasicLexer, TokenType } from './zxbasic';

const lexer = new ZXBasicLexer();
const tokens = lexer.tokenize('AND OR NOT');
console.log(tokens.map(t => ({ type: t.type, value: t.value })));

const tokens2 = lexer.tokenize('PRINT LET IF');
console.log(tokens2.map(t => ({ type: t.type, value: t.value })));

const tokens3 = lexer.tokenize('SIN');
const functions = ['SIN', 'SGN', 'COS'];
const expectedFunctions = functions.filter(f => f.toLowerCase().startsWith('SIN'));
console.log('SIN filtered:', expectedFunctions);
