// ZX Spectrum BASIC keywords and tokens
// Note: Two-word keywords GO TO, GO SUB, DEF FN, INPUT LINE are handled specially by the tokenizer
// Operators AND, OR, NOT are not keywords and have dedicated TokenTypes

export const basicKeywords: string[] = [
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
  'FOR',
  'TO',
  'STEP',
  'GOTO',
  'GOSUB',
  'RETURN',
  'IF',
  'THEN',
  'DIM',
  'READ',
  'DATA',
  'RESTORE',
  'NEW',
  'BORDER',
  'CONTINUE',
  'RANDOMIZE',
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
  'PAUSE',
  'VERIFY',
  'MERGE',
  'AT'
];

// ZX Spectrum 128K specific keywords
export const zx128Keywords: string[] = [
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
export const interface1Keywords: string[] = [
  'NET',
  'NET*',
  'OPEN',
  'CLOSE',
  'CAT*',
  'LOAD*',
  'SAVE*',
  'MERGE*',
  'VERIFY*',
  'FORMAT*'
];

// Functions (including built-in functions and operators with dedicated TokenTypes)
export const functions: string[] = [
  'ABS',
  'ACS',
  'ASN',
  'ATN',
  'ATTR',
  'CHR$',
  'CODE',
  'COS',
  'EXP',
  'FN',
  'IN',
  'INKEY$',
  'INT',
  'LEN',
  'LN',
  'PEEK',
  'PI',
  'POINT',
  'RND',
  'SCREEN$',
  'SGN',
  'SIN',
  'SQR',
  'STR$',
  'TAB',
  'TAN',
  'USR',
  'VAL',
  'VAL$'
];

// Operators (have dedicated TokenTypes, not keywords)
export const operators: string[] = [
  'AND',
  'OR',
  'NOT'
];

// All keywords combined
export const allKeywords = [
  ...basicKeywords,
  ...zx128Keywords,
  ...interface1Keywords,
  ...functions
];

// Built-in variables (some)
export const builtInVariables = [
  'PI'
];
