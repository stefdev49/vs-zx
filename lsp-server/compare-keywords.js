// Compare TextMate grammar keywords with LSP lexer keywords

// TextMate keywords (from zx-basic.tmLanguage.json)
const tmKeywords = [
  // Control keywords
  'PRINT', 'LET', 'INPUT', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
  'GOTO', 'GO TO', 'GOSUB', 'GO SUB', 'RETURN', 'DIM', 'READ', 'DATA', 'RESTORE',
  'RUN', 'LIST', 'CLEAR', 'NEW', 'STOP', 'END', 'SAVE', 'LOAD', 'VERIFY', 'MERGE',
  'RANDOMIZE', 'CONTINUE', 'POKE', 'PLOT', 'DRAW', 'CIRCLE', 'INK', 'PAPER',
  'FLASH', 'BRIGHT', 'INVERSE', 'OVER', 'BORDER', 'CLS', 'BEEP', 'PAUSE',
  'DEF FN', 'DEF', 'CAT', 'ERASE', 'FORMAT', 'MOVE', 'OPEN', 'CLOSE', 'COPY',
  'LPRINT', 'LLIST', 'OUT', 'IN', 'NOT',
  'TRUE', 'FALSE', 'SPECTRUM', 'PLAY', 'AT',
  // Logical operators
  'AND', 'OR'
];

// TextMate functions (from functions pattern)
const tmFunctions = [
  'ABS', 'ACS', 'ASN', 'ATN', 'ATTR', 'CHR$', 'CODE', 'COS', 'EXP', 'FN',
  'IN', 'INKEY$', 'INT', 'LEN', 'LN', 'PEEK', 'PI', 'POINT', 'RND',
  'SCREEN$', 'SGN', 'SIN', 'SQR', 'STR$', 'TAB', 'TAN', 'USR', 'VAL', 'VAL$'
];

// LSP lexer keywords (from lsp-server/src/zxbasic.ts)
const lspKeywords = [
  'PRINT', 'LET', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
  'READ', 'DATA', 'RESTORE', 'DIM',
  'DEF', 'FN', 'DEFFN', 'GOTO', 'GOSUB', 'RETURN', 'STOP', 'RANDOMIZE', 'CONTINUE',
  'CLEAR', 'CLS', 'INPUT', 'LOAD', 'SAVE', 'VERIFY', 'MERGE', 'BEEP',
  'INK', 'PAPER', 'FLASH', 'BRIGHT', 'INVERSE', 'OVER', 'BORDER', 'PLOT',
  'DRAW', 'CIRCLE', 'LPRINT', 'LLIST', 'COPY', 'SPECTRUM', 'PLAY', 'ERASE',
  'CAT', 'FORMAT', 'MOVE', 'OUT', 'IN', 'OPEN', 'CLOSE', 'POKE', 'RUN', 'LIST', 'NEW', 'END', 'PAUSE',
  'VAL', 'LEN', 'STR$', 'CHR$', 'CODE', 'SIN',
  'COS', 'TAN', 'ASN', 'ACS', 'ATN', 'LN', 'EXP', 'INT', 'SQR', 'SGN',
  'ABS', 'PEEK', 'USR', 'INKEY$', 'PI', 'TRUE', 'FALSE', 'RND', 'ATTR',
  'SCREEN$', 'POINT', 'TAB', 'AND', 'OR', 'NOT', 'VAL$', 'AT'
];

// Normalize both lists (remove duplicates, handle multi-word keywords)
const normalizeTm = new Set(
  [...tmKeywords, ...tmFunctions]
    .map(k => k.replace(/ /g, ''))  // Normalize "GO TO" -> "GOTO"
    .map(k => k.toUpperCase())
);

const normalizeLsp = new Set(
  lspKeywords.map(k => k.toUpperCase())
);

// Find keywords in TextMate but missing in LSP
const missingInLsp = [...normalizeTm].filter(k => !normalizeLsp.has(k)).sort();

// Find keywords in LSP but missing in TextMate
const missingInTm = [...normalizeLsp].filter(k => !normalizeTm.has(k)).sort();

console.log('=== Keyword Comparison ===\n');

if (missingInLsp.length > 0) {
  console.log('⚠️  In TextMate but MISSING in LSP:');
  missingInLsp.forEach(k => console.log(`   - ${k}`));
  console.log();
}

if (missingInTm.length > 0) {
  console.log('⚠️  In LSP but MISSING in TextMate:');
  missingInTm.forEach(k => console.log(`   - ${k}`));
  console.log();
}

if (missingInLsp.length === 0 && missingInTm.length === 0) {
  console.log('✅ All keywords match between TextMate and LSP!');
} else {
  console.log(`Total: ${missingInLsp.length} missing in LSP, ${missingInTm.length} missing in TextMate`);
}
