"use strict";
// ZX Spectrum BASIC keywords and tokens
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInVariables = exports.allKeywords = exports.functions = exports.interface1Keywords = exports.zx128Keywords = exports.basicKeywords = void 0;
exports.basicKeywords = [
    // Standard keywords
    'REM',
    'LET',
    'PRINT',
    'INPUT',
    'LOAD',
    'SAVE',
    'RUN',
    'LIST',
    'CLEAR',
    'CLS',
    'STOP',
    'NEXT',
    'POKE',
    'PEEK',
    'COLOR',
    'FOR',
    'TO',
    'STEP',
    'GOTO',
    'GOSUB',
    'RETURN',
    'IF',
    'THEN',
    'ELSE',
    'END',
    'DIM',
    'READ',
    'DATA',
    'RESTORE',
    'NEW',
    'BORDER',
    'CONTINUE',
    'RANDOMIZE',
    'USR',
    'INK',
    'PAPER',
    'FLASH',
    'BRIGHT',
    'OVER',
    'INVERSE',
    'BEEP',
    'OUT',
    'PLOT',
    'DRAW',
    'CIRCLE',
    'ELLIPSE', // Some systems have this
    'LINE',
    'CLS',
    'PAUSE',
    'VERIFY',
    'MERGE',
    'SCREEN$',
    'ATTR',
    'POINT',
    'STROKE',
    'TINT',
    'BRIGHT',
    'CONTRAST'
];
// ZX Spectrum 128K specific keywords
exports.zx128Keywords = [
    'SPECTRUM',
    'PLAY',
    'LLIST',
    'LPRINT',
    'COPY',
    'CAT',
    'ERASE',
    'MOVE',
    'FORMAT'
];
// ZX Interface 1 keywords
exports.interface1Keywords = [
    'NET',
    'CAT*',
    'LOAD*',
    'SAVE*',
    'MERGE*',
    'VERIFY*',
    'FORMAT*'
];
// Functions
exports.functions = [
    'ABS',
    'ACS',
    'ASN',
    'ATN',
    'CHR$',
    'COS',
    'EXP',
    'INKEY$',
    'INT',
    'LEN',
    'LN',
    'NOT',
    'SIN',
    'SQR',
    'STR$',
    'TAN',
    'VAL',
    'CODE',
    'IN',
    'PEEK',
    'RND',
    'TAB',
    'USR',
    'VAL$',
    'SGN',
    'PI',
    'FN'
];
// All keywords combined
exports.allKeywords = [
    ...exports.basicKeywords,
    ...exports.zx128Keywords,
    ...exports.interface1Keywords,
    ...exports.functions
];
// Built-in variables (some)
exports.builtInVariables = [
    'PI'
];
//# sourceMappingURL=keywords.js.map