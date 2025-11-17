// ZX Spectrum BASIC keywords and tokens

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
  'CAT*',
  'LOAD*',
  'SAVE*',
  'MERGE*',
  'VERIFY*',
  'FORMAT*'
];

// Functions
export const functions: string[] = [
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
