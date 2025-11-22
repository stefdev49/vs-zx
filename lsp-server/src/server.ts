import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Hover,
  HoverParams,
  SignatureHelp,
  SignatureHelpParams,
  SignatureInformation,
  ParameterInformation,
  DocumentSymbol,
  DocumentSymbolParams,
  SymbolKind,
  Location,
  DefinitionParams,
  ReferenceParams,
  Range,
  Position,
  CodeAction,
  CodeActionParams,
  CodeActionKind,
  TextEdit,
  DocumentFormattingParams,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ZXBasicLexer, ZXBasicParser, TokenType, Token } from './zxbasic';
import { basicKeywords, zx128Keywords, interface1Keywords, functions } from 'syntax-definitions';

interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// The settings of all open documents.
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// Cache the settings of all open documents
function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!documentSettings.has(resource)) {
    documentSettings.set(resource, connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'zxBasicLanguageServer'
    }).then(settings => ({
      maxNumberOfProblems: settings?.maxNumberOfProblems ?? defaultSettings.maxNumberOfProblems,
    })));
  }
  return documentSettings.get(resource)!;
}

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  return {
    capabilities: {
      textDocumentSync: 1, // Incremental updates
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['', ' ', '.']
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['('],
        retriggerCharacters: [',']
      },
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false
      },
      documentSymbolProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.Refactor]
      },
      documentFormattingProvider: true
    }
  };
});

connection.onInitialized(() => {
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

// Settings changed notification
connection.onDidChangeConfiguration(change => {
  if (change.settings.zxBasicLanguageServer) {
    globalSettings = <ExampleSettings>(
      change.settings.zxBasicLanguageServer || defaultSettings
    );
  }
  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

// Cache settings and revalidate all documents
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

// Validate document and report diagnostics
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const text = textDocument.getText();

  // Basic syntax validation using our tokenizer and parser
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  const diagnostics: Diagnostic[] = [];

  // Track line numbers for duplicate detection
  const lineNumbers = new Map<string, number[]>(); // lineNumber -> [line positions]

  // Check for invalid characters and basic syntax issues
  tokens.forEach(token => {
    if (token.type === TokenType.INVALID) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: token.line, character: token.start },
          end: { line: token.line, character: token.end }
        },
        message: `Invalid character '${token.value}' in ZX BASIC code`,
        source: 'zx-basic-lsp'
      });
    }

    // Validate line numbers (1-9999, integer only)
    if (token.type === TokenType.LINE_NUMBER) {
      const lineNum = parseInt(token.value, 10);
      
      // Check if it's a valid integer
      if (!Number.isInteger(lineNum) || token.value.includes('.')) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: token.line, character: token.start },
            end: { line: token.line, character: token.end }
          },
          message: `Line number must be an integer (no decimal point)`,
          source: 'zx-basic-lsp'
        });
      }
      // Check if it's in valid range
      else if (lineNum < 1 || lineNum > 9999) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: token.line, character: token.start },
            end: { line: token.line, character: token.end }
          },
          message: `Line number must be between 1 and 9999 (got ${lineNum})`,
          source: 'zx-basic-lsp'
        });
      }
      
      // Track for duplicate detection
      if (!lineNumbers.has(token.value)) {
        lineNumbers.set(token.value, []);
      }
      lineNumbers.get(token.value)!.push(token.line);
    }
  });

  // Check for duplicate line numbers
  lineNumbers.forEach((positions, lineNum) => {
    if (positions.length > 1) {
      positions.forEach(line => {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line, character: 0 },
            end: { line, character: lineNum.length }
          },
          message: `Duplicate line number ${lineNum} (appears ${positions.length} times)`,
          source: 'zx-basic-lsp'
        });
      });
    }
  });

  // Check for FOR/NEXT balance (loose check)
  const forLoops: Array<{ line: number; start: number; end: number }> = [];
  const nextStatements: Array<{ line: number; start: number; end: number }> = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && token.value === 'FOR') {
      forLoops.push({
        line: token.line,
        start: token.start,
        end: token.end
      });
    } else if (token.type === TokenType.KEYWORD && token.value === 'NEXT') {
      nextStatements.push({
        line: token.line,
        start: token.start,
        end: token.end
      });
    }
  }

  // Warn if there are FOR loops but no NEXT statements
  if (forLoops.length > 0 && nextStatements.length === 0) {
    forLoops.forEach(forLoop => {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: forLoop.line, character: forLoop.start },
          end: { line: forLoop.line, character: forLoop.end }
        },
        message: `FOR loop has no matching NEXT statement in the program`,
        source: 'zx-basic-lsp'
      });
    });
  }

  // Warn if there are NEXT statements but no FOR loops
  if (nextStatements.length > 0 && forLoops.length === 0) {
    nextStatements.forEach(next => {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: next.line, character: next.start },
          end: { line: next.line, character: next.end }
        },
        message: `NEXT statement has no matching FOR loop in the program`,
        source: 'zx-basic-lsp'
      });
    });
  }

  // Check for GOSUB/RETURN balance (loose check)
  const gosubStatements: Array<{ line: number; start: number; end: number }> = [];
  const returnStatements: Array<{ line: number; start: number; end: number }> = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && token.value === 'GOSUB') {
      gosubStatements.push({
        line: token.line,
        start: token.start,
        end: token.end
      });
    } else if (token.type === TokenType.KEYWORD && token.value === 'RETURN') {
      returnStatements.push({
        line: token.line,
        start: token.start,
        end: token.end
      });
    }
  }

  // Warn if there are GOSUB calls but no RETURN statements
  if (gosubStatements.length > 0 && returnStatements.length === 0) {
    gosubStatements.forEach(gosub => {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: gosub.line, character: gosub.start },
          end: { line: gosub.line, character: gosub.end }
        },
        message: `GOSUB has no matching RETURN statement in the program`,
        source: 'zx-basic-lsp'
      });
    });
  }

  // Warn if there are RETURN statements but no GOSUB calls
  if (returnStatements.length > 0 && gosubStatements.length === 0) {
    returnStatements.forEach(ret => {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: ret.line, character: ret.start },
          end: { line: ret.line, character: ret.end }
        },
        message: `RETURN statement has no matching GOSUB in the program`,
        source: 'zx-basic-lsp'
      });
    });
  }

  // Try to parse as an expression (for simple cases)
  if (tokens.length > 1 && !tokens.some(t => t.type === TokenType.EOF)) {
    const parser = new ZXBasicParser(tokens);
    try {
      const ast = parser.parseExpression();
      if (!ast) {
        // Add a general syntax error diagnostic
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: Math.min(10, text.length) }
          },
          message: 'Syntax error in ZX BASIC expression',
          source: 'zx-basic-lsp'
        });
      }
    } catch (error) {
      // Parser error
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: Math.min(10, text.length) }
        },
        message: 'Parse error in ZX BASIC code',
        source: 'zx-basic-lsp'
      });
    }
  }

  // Limit number of diagnostics
  const limitedDiagnostics = diagnostics.slice(0, settings.maxNumberOfProblems);

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: limitedDiagnostics });
}

// Completion provider
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const position = params.position;
  
  // Get the current line and position
  const lineText = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: position.character }
  });

  // Find the current word being typed - extract from the last word boundary
  let currentWord = '';
  let startChar = position.character - 1;
  
  // Walk backwards to find word boundary
  while (startChar >= 0 && /[A-Za-z0-9_$%]/.test(lineText[startChar])) {
    startChar--;
  }
  
  currentWord = lineText.substring(startChar + 1).toUpperCase();

  // Filter keywords based on what the user is typing
  // Combine all keywords from syntax-definitions module
  const allKeywords = [
    ...basicKeywords,
    ...zx128Keywords,
    ...interface1Keywords,
    ...functions
  ];

  const filteredKeywords = allKeywords.filter(keyword =>
    keyword.toLowerCase().startsWith(currentWord.toLowerCase())
  );

  // Create completion items
  const completionItems: CompletionItem[] = filteredKeywords.map(keyword => ({
    label: keyword,
    kind: isFunction(keyword) ? CompletionItemKind.Function : CompletionItemKind.Keyword,
    detail: getKeywordDetail(keyword),
    documentation: getKeywordDocumentation(keyword),
    sortText: keyword
  }));

  // Add function completions with signature information
  if (currentWord.length >= 1) {
    const functionCompletions = getFunctionCompletions(currentWord);
    completionItems.push(...functionCompletions);
  }

  return completionItems;
});

// Resolve additional information for a completion item
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  // Add more detailed documentation if needed
  if (item.kind === CompletionItemKind.Function) {
    item.detail = getFunctionSignature(item.label);
  }
  return item;
});

// Hover provider
connection.onHover((params: HoverParams): Hover => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { contents: [] };
  }

  const position = params.position;
  const text = document.getText({
    start: { line: position.line, character: Math.max(0, position.character - 20) },
    end: { line: position.line, character: position.character + 20 }
  });

  // Simple hover for keywords and functions
  const wordMatch = text.match(/(\w+)\s*\(?/);
  if (wordMatch) {
    const word = wordMatch[1].toUpperCase();
    const hoverText = getHoverDocumentation(word);
    if (hoverText) {
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}**\n\n${hoverText}`
        }
      };
    }
  }

  return { contents: [] };
});

// Signature help provider
connection.onSignatureHelp((params: SignatureHelpParams): SignatureHelp => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { signatures: [], activeSignature: 0, activeParameter: 0 };
  }

  const position = params.position;
  const text = document.getText({
    start: { line: Math.max(0, position.line - 1), character: 0 },
    end: { line: position.line, character: position.character }
  });

  // Find function calls that haven't been closed yet
  const openFunctionMatch = text.match(/(\w+)\s*\(([^)]*)$/);
  if (openFunctionMatch) {
    const functionName = openFunctionMatch[1].toUpperCase();
    const parameters = openFunctionMatch[2];

    // Count commas to determine active parameter
    const commaCount = (parameters.match(/,/g) || []).length;

    const signatureInfo = getFunctionSignatureInfo(functionName);
    if (signatureInfo) {
      return {
        signatures: [signatureInfo],
        activeSignature: 0,
        activeParameter: commaCount
      };
    }
  }

  return { signatures: [], activeSignature: 0, activeParameter: 0 };
});

// Helper functions for completion

function isFunction(keyword: string): boolean {
  // Use the imported functions list from syntax-definitions
  return functions.includes(keyword.toUpperCase());
}

function getKeywordDetail(keyword: string): string {
  if (isFunction(keyword)) {
    return `${keyword}()`;
  }
  return keyword;
}

function getKeywordDocumentation(keyword: string): string {
  const keywordDocs: { [key: string]: string } = {
    'PRINT': 'Output text or values to the screen\n\n```\nPRINT expression [, expression]...\n```\n\nSeparate values with commas for spacing or semicolons for no spacing.',
    'LET': 'Assign a value to a variable\n\n```\nLET variable = expression\n```\n\nThe LET keyword can be omitted in most contexts.',
    'IF': 'Conditional statement execution\n\n```\nIF condition THEN statement [ELSE statement]\n```',
    'FOR': 'Start a FOR loop\n\n```\nFOR variable = start TO end [STEP step]\n```\n\nThe loop variable is incremented from start to end.',
    'NEXT': 'End a FOR loop - must match a FOR statement',
    'WHILE': 'Start a WHILE loop - continue while condition is true',
    'WEND': 'End a WHILE loop',
    'GOSUB': 'Call a subroutine - must RETURN',
    'RETURN': 'Return from a subroutine called with GOSUB',
    'GOTO': 'Jump to a line number',
    'INPUT': 'Read keyboard input into variables\n\n```\nINPUT variable [, variable]...\n```',
    'DIM': 'Dimension an array\n\n```\nDIM array(size [, size]...)\n```',
    'REM': 'Comment - rest of line is ignored',
    'CLS': 'Clear the screen',
    'PLOT': 'Plot a pixel at coordinates\n\n```\nPLOT x, y\n```',
    'DRAW': 'Draw a line\n\n```\nDRAW [x,] y\n```',
    'CIRCLE': 'Draw a circle',
    'INK': 'Set text color (0-7)',
    'PAPER': 'Set background color (0-7)',
    'FLASH': 'Flash text on/off (0 or 1)',
    'BRIGHT': 'Bright text (0 or 1)',
    'INVERSE': 'Inverse video (0 or 1)',
    'BORDER': 'Set border color (0-7)',
    'BEEP': 'Make a sound\n\n```\nBEEP duration, pitch\n```',
    'SIN': 'Sine function\n\n```\nSIN(angle) -> number\n```\n\nAngle in radians.',
    'COS': 'Cosine function\n\n```\nCOS(angle) -> number\n```\n\nAngle in radians.',
    'TAN': 'Tangent function\n\n```\nTAN(angle) -> number\n```\n\nAngle in radians.',
    'LEN': 'Return the length of a string\n\n```\nLEN(string) -> number\n```',
    'VAL': 'Convert a string to a number\n\n```\nVAL(string) -> number\n```',
    'STR$': 'Convert a number to a string\n\n```\nSTR$(number) -> string\n```',
    'CHR$': 'Return the character for an ASCII code\n\n```\nCHR$(code) -> string\n```',
    'CODE': 'Return the ASCII code of a character\n\n```\nCODE(string) -> number\n```',
    'PEEK': 'Read a byte from memory\n\n```\nPEEK(address) -> number\n```',
    'POKE': 'Write a byte to memory\n\n```\nPOKE address, value\n```',
    'ABS': 'Absolute value\n\n```\nABS(number) -> number\n```',
    'INT': 'Floor function (greatest integer ≤ x)\n\n```\nINT(number) -> number\n```',
    'SQR': 'Square root\n\n```\nSQR(number) -> number\n```',
    'RND': 'Random number between 0 and 1\n\n```\nRND -> number\n```',
    'RANDOMIZE': 'Seed the random number generator',
    'AND': 'Logical AND operator\n\n```\ncondition1 AND condition2\n```',
    'OR': 'Logical OR operator\n\n```\ncondition1 OR condition2\n```',
    'NOT': 'Logical NOT operator\n\n```\nNOT condition\n```',
    'INKEY$': 'Read the last key pressed\n\n```\nINKEY$ -> string\n```\n\nReturns empty string if no key pressed.',
    'SCREEN$': 'Read character from screen\n\n```\nSCREEN$(line, column) -> string\n```',
    // Missing functions from syntax-definitions
    'ACS': 'Arc cosine function\n\n```\nACS(x) -> number\n```\n\nReturns angle in radians. x must be between -1 and 1.',
    'ASN': 'Arc sine function\n\n```\nASN(x) -> number\n```\n\nReturns angle in radians. x must be between -1 and 1.',
    'ATN': 'Arc tangent function\n\n```\nATN(x) -> number\n```\n\nReturns angle in radians.',
    'SGN': 'Sign function\n\n```\nSGN(number) -> number\n```\n\nReturns -1 for negative, 0 for zero, 1 for positive.',
    'PI': 'PI constant\n\n```\nPI -> number\n```\n\nReturns 3.14159265...',
    'EXP': 'Exponential function\n\n```\nEXP(x) -> number\n```\n\nReturns e^x.',
    'LN': 'Natural logarithm\n\n```\nLN(x) -> number\n```\n\nReturns ln(x). x must be positive.',
    'VAL$': 'Convert number to string (alternative to STR$)\n\n```\nVAL$(number) -> string\n```',
    'USR': 'Call machine code routine\n\n```\nUSR address -> number\n```\n\nCalls machine code at specified address.',
    'IN': 'Read from I/O port\n\n```\nIN port -> number\n```\n\nReads byte from specified port.',
    'OUT': 'Write to I/O port\n\n```\nOUT port, value\n```',
    'TAB': 'Tab to column position in PRINT\n\n```\nPRINT TAB column; expression\n```',
    'AT': 'Position cursor in PRINT\n\n```\nPRINT AT line, column; expression\n```',
    'ATTR': 'Get screen attribute\n\n```\nATTR(line, column) -> number\n```',
    'POINT': 'Test if pixel is set\n\n```\nPOINT(x, y) -> number\n```\n\nReturns 1 if pixel is set, 0 if not.',
    'FN': 'User-defined function\n\n```\nDEF FN name(params) = expression\nFN name(args)\n```',
    // ZX 128K keywords
    'SPECTRUM': 'Switch to 48K mode (ZX Spectrum 128K)',
    'PLAY': 'Play music (ZX Spectrum 128K)\n\n```\nPLAY string_expression\n```',
    'LPRINT': 'Print to printer\n\n```\nLPRINT expression [, expression]...\n```',
    'LLIST': 'List program to printer\n\n```\nLLIST [line] [TO line]\n```',
    'COPY': 'Copy screen to printer',
    'CAT': 'Catalog disk (ZX Spectrum +3)',
    'ERASE': 'Erase file from disk',
    'MOVE': 'Move file on disk',
    'FORMAT': 'Format disk',
    // Interface 1 keywords
    'NET': 'Network command (ZX Interface 1)',
    // Additional keywords
    'LINE': 'Draw line (graphics command)\n\n```\nLINE x1, y1, x2, y2\n```',
    'CONTINUE': 'Continue program execution after STOP',
    'PAUSE': 'Pause execution\n\n```\nPAUSE duration\n```\n\n0 = wait for key press.',
    'VERIFY': 'Verify saved data\n\n```\nVERIFY "filename"\n```',
    'MERGE': 'Merge program from tape/disk\n\n```\nMERGE "filename"\n```',
    'COLOR': 'Set color attributes',
    'NEW': 'Clear program and variables',
    'RUN': 'Run program\n\n```\nRUN [line_number]\n```',
    'LIST': 'List program\n\n```\nLIST [line] [TO line]\n```',
    'DEF': 'Define function\n\n```\nDEF FN name(params) = expression\n```',
    'OVER': 'Set OVER mode for graphics\n\n```\nOVER 0|1\n```\n\n1 = XOR mode.',
    'STROKE': 'Set stroke color for graphics',
  };
  return keywordDocs[keyword.toUpperCase()] || 'ZX BASIC keyword';
}

function getFunctionCompletions(prefix: string): CompletionItem[] {
  const functions = [
    { name: 'SIN', signature: 'SIN(angle)', detail: 'Sine function' },
    { name: 'COS', signature: 'COS(angle)', detail: 'Cosine function' },
    { name: 'TAN', signature: 'TAN(angle)', detail: 'Tangent function' },
    { name: 'LEN', signature: 'LEN(string)', detail: 'Length of a string' },
    { name: 'VAL', signature: 'VAL(string)', detail: 'Convert string to number' },
    { name: 'STR$', signature: 'STR$(number)', detail: 'Convert number to string' },
    { name: 'CHR$', signature: 'CHR$(code)', detail: 'ASCII character from code' },
    { name: 'CODE', signature: 'CODE(string)', detail: 'ASCII code of first character' },
    { name: 'ABS', signature: 'ABS(number)', detail: 'Absolute value' },
    { name: 'INT', signature: 'INT(number)', detail: 'Floor function' },
    { name: 'SQR', signature: 'SQR(number)', detail: 'Square root' },
    { name: 'PEEK', signature: 'PEEK(address)', detail: 'Read memory location' },
    // Add more functions as needed
  ];

  return functions
    .filter(func => func.name.toLowerCase().startsWith(prefix.toLowerCase()))
    .map(func => ({
      label: func.name,
      kind: CompletionItemKind.Function,
      detail: func.signature,
      documentation: func.detail
    }));
}

function getFunctionSignature(functionName: string): string {
  const signatures: { [key: string]: string } = {
    'SIN': 'SIN(number) -> number',
    'COS': 'COS(number) -> number',
    'TAN': 'TAN(number) -> number',
    'LEN': 'LEN(string) -> number',
    'VAL': 'VAL(string) -> number',
    'STR$': 'STR$(number) -> string',
    'CHR$': 'CHR$(number) -> string',
    'CODE': 'CODE(string) -> number',
    'ABS': 'ABS(number) -> number',
    'INT': 'INT(number) -> number',
    'SQR': 'SQR(number) -> number',
    'PEEK': 'PEEK(address) -> number'
  };
  return signatures[functionName.toUpperCase()] || `${functionName}()`;
}

function getHoverDocumentation(keyword: string): string {
  const hoverDocs: { [key: string]: string } = {
    'PRINT': 'Print text, numbers, or expressions to the screen\n\n**Syntax:**\n```\nPRINT [TAB(x);] expression [; expression]...\n```\n\n**Examples:**\n```\nPRINT \"HELLO\"\nPRINT A; B; C\nPRINT TAB(10); \"Column 10\"\n```',
    'LET': 'Assign a value to a variable\n\n**Syntax:**\n```\n[LET] variable = expression\n```\n\nThe LET keyword is optional. Variables can be:\n- Numeric: A, X1, MY_VAR\n- String: A$, STR$, NAME$\n- Integer: I%, J%, COUNTER%',
    'IF': 'Conditional statement execution\n\n**Syntax:**\n```\nIF condition THEN statement [ELSE statement]\n```\n\n**Example:**\n```\nIF X > 10 THEN PRINT \"Large\"\nIF X > 10 THEN PRINT \"Large\" ELSE PRINT \"Small\"\n```',
    'FOR': 'Start a FOR loop\n\n**Syntax:**\n```\nFOR variable = start TO end [STEP step]\n...\nNEXT [variable]\n```\n\n**Example:**\n```\nFOR I = 1 TO 10\n  PRINT I\nNEXT I\n```',
    'SIN': 'Calculate the sine of an angle (in radians)\n\n**Syntax:**\n```\nSIN(angle) -> number\n```\n\n**Example:**\n```\nLET Y = SIN(3.14159 / 2)\nREM Y will be approximately 1\n```',
    'COS': 'Calculate the cosine of an angle (in radians)\n\n**Syntax:**\n```\nCOS(angle) -> number\n```',
    'LEN': 'Return the length of a string\n\n**Syntax:**\n```\nLEN(string) -> number\n```\n\n**Example:**\n```\nLET L = LEN(\"HELLO\")\nREM L is 5\n```',
    'VAL': 'Convert a string to a numeric value\n\n**Syntax:**\n```\nVAL(string) -> number\n```\n\n**Example:**\n```\nLET N = VAL(\"123.45\")\nREM N is 123.45\n```',
    'PEEK': 'Read a byte from memory\n\n**Syntax:**\n```\nPEEK(address) -> number\n```\n\n**Example:**\n```\nLET ATTR = PEEK(22528)\nREM Read screen attributes\n```',
    'STR$': 'Convert a number to a string\n\n**Syntax:**\n```\nSTR$(number) -> string\n```',
    'CHR$': 'Return the character for an ASCII code\n\n**Syntax:**\n```\nCHR$(code) -> string\n```',
    'CODE': 'Return the ASCII code of the first character\n\n**Syntax:**\n```\nCODE(string) -> number\n```',
    'ABS': 'Return the absolute value (remove sign)\n\n**Syntax:**\n```\nABS(number) -> number\n```',
    'INT': 'Return the integer part (floor function)\n\n**Syntax:**\n```\nINT(number) -> number\n```',
    'SQR': 'Return the square root\n\n**Syntax:**\n```\nSQR(number) -> number\n```',
    'RND': 'Return a random number between 0 and 1\n\n**Syntax:**\n```\nRND -> number\n```\n\nUse with RANDOMIZE to seed.',
    'AND': 'Logical AND operator\n\n```\ncondition1 AND condition2\n```\n\nTrue only if both conditions are true.',
    'OR': 'Logical OR operator\n\n```\ncondition1 OR condition2\n```\n\nTrue if either condition is true.',
    'NOT': 'Logical NOT operator\n\n```\nNOT condition\n```\n\nReverses the truth value.',
    'INKEY$': 'Read the last key pressed\n\n**Syntax:**\n```\nINKEY$ -> string\n```\n\nReturns empty string if no key was pressed.',
  };
  return hoverDocs[keyword] || '';
}

function getFunctionSignatureInfo(functionName: string): SignatureInformation | undefined {
  const functionSignatures: { [key: string]: SignatureInformation } = {
    'SIN': {
      label: 'SIN(angle: number): number',
      documentation: 'Calculate the sine of an angle in radians',
      parameters: [
        { label: 'angle', documentation: 'Angle in radians' }
      ]
    },
    'COS': {
      label: 'COS(angle: number): number',
      documentation: 'Calculate the cosine of an angle in radians',
      parameters: [
        { label: 'angle', documentation: 'Angle in radians' }
      ]
    },
    'TAN': {
      label: 'TAN(angle: number): number',
      documentation: 'Calculate the tangent of an angle in radians',
      parameters: [
        { label: 'angle', documentation: 'Angle in radians' }
      ]
    },
    'LEN': {
      label: 'LEN(str: string): number',
      documentation: 'Return the length of a string',
      parameters: [
        { label: 'str', documentation: 'The input string' }
      ]
    },
    'VAL': {
      label: 'VAL(str: string): number',
      documentation: 'Convert a string representation of a number to a numeric value',
      parameters: [
        { label: 'str', documentation: 'String representation of a number' }
      ]
    },
    'STR$': {
      label: 'STR$(num: number): string',
      documentation: 'Convert a number to its string representation',
      parameters: [
        { label: 'num', documentation: 'The number to convert' }
      ]
    },
    'CHR$': {
      label: 'CHR$(code: number): string',
      documentation: 'Return the character represented by an ASCII code',
      parameters: [
        { label: 'code', documentation: 'ASCII code (0-255)' }
      ]
    },
    'CODE': {
      label: 'CODE(str: string): number',
      documentation: 'Return the ASCII code of the first character of a string',
      parameters: [
        { label: 'str', documentation: 'The input string' }
      ]
    },
    'PEEK': {
      label: 'PEEK(addr: number): number',
      documentation: 'Read a byte from a memory address',
      parameters: [
        { label: 'addr', documentation: 'Memory address (0-65535)' }
      ]
    },
    'POKE': {
      label: 'POKE addr: number, value: number',
      documentation: 'Write a byte to a memory address',
      parameters: [
        { label: 'addr', documentation: 'Memory address (0-65535)' },
        { label: 'value', documentation: 'Byte value (0-255)' }
      ]
    },
    'PLOT': {
      label: 'PLOT x: number, y: number',
      documentation: 'Plot a pixel at coordinates (x, y)',
      parameters: [
        { label: 'x', documentation: 'X coordinate (0-255)' },
        { label: 'y', documentation: 'Y coordinate (0-191)' }
      ]
    },
    'DRAW': {
      label: 'DRAW x: number, y: number',
      documentation: 'Draw a line to coordinates relative to current position',
      parameters: [
        { label: 'x', documentation: 'Relative X coordinate' },
        { label: 'y', documentation: 'Relative Y coordinate' }
      ]
    },
    'BEEP': {
      label: 'BEEP duration: number, pitch: number',
      documentation: 'Make a beep sound',
      parameters: [
        { label: 'duration', documentation: 'Duration in 1/50ths of a second' },
        { label: 'pitch', documentation: 'Pitch (0-15)' }
      ]
    },
    'INK': {
      label: 'INK colour: number',
      documentation: 'Set text color (0-7)',
      parameters: [
        { label: 'colour', documentation: 'Color code 0=black, 1=blue, 2=red, 3=magenta, 4=green, 5=cyan, 6=yellow, 7=white' }
      ]
    },
    'PAPER': {
      label: 'PAPER colour: number',
      documentation: 'Set background color (0-7)',
      parameters: [
        { label: 'colour', documentation: 'Color code 0=black, 1=blue, 2=red, 3=magenta, 4=green, 5=cyan, 6=yellow, 7=white' }
      ]
    },
    'BORDER': {
      label: 'BORDER colour: number',
      documentation: 'Set border color (0-7)',
      parameters: [
        { label: 'colour', documentation: 'Color code' }
      ]
    },
    'PRINT': {
      label: 'PRINT [TAB(x);] expression [; expression]...',
      documentation: 'Print text or expressions to the screen',
      parameters: [
        { label: 'expression', documentation: 'String or numeric expression to print' }
      ]
    },
    'INPUT': {
      label: 'INPUT variable [, variable]...',
      documentation: 'Read keyboard input into variables',
      parameters: [
        { label: 'variable', documentation: 'Variable to receive input' }
      ]
    },
    'FOR': {
      label: 'FOR variable = start TO end [STEP step]',
      documentation: 'Begin a FOR loop',
      parameters: [
        { label: 'variable', documentation: 'Loop control variable' },
        { label: 'start', documentation: 'Starting value' },
        { label: 'end', documentation: 'Ending value' }
      ]
    },
    'ABS': {
      label: 'ABS(num: number): number',
      documentation: 'Return absolute value',
      parameters: [
        { label: 'num', documentation: 'The number' }
      ]
    },
    'INT': {
      label: 'INT(num: number): number',
      documentation: 'Return the integer part (floor)',
      parameters: [
        { label: 'num', documentation: 'The number' }
      ]
    },
    'SQR': {
      label: 'SQR(num: number): number',
      documentation: 'Return the square root',
      parameters: [
        { label: 'num', documentation: 'The number' }
      ]
    },
    'CIRCLE': {
      label: 'CIRCLE x: number, y: number, radius: number',
      documentation: 'Draw a circle',
      parameters: [
        { label: 'x', documentation: 'Center X coordinate' },
        { label: 'y', documentation: 'Center Y coordinate' },
        { label: 'radius', documentation: 'Circle radius' }
      ]
    },
    'DIM': {
      label: 'DIM array(size [, size]...)',
      documentation: 'Dimension an array',
      parameters: [
        { label: 'array', documentation: 'Array name' },
        { label: 'size', documentation: 'Dimension size(s)' }
      ]
    },
    'READ': {
      label: 'READ variable [, variable]...',
      documentation: 'Read data from DATA statements',
      parameters: [
        { label: 'variable', documentation: 'Variable to receive data' }
      ]
    },
    'DATA': {
      label: 'DATA constant [, constant]...',
      documentation: 'Define data for READ statements',
      parameters: [
        { label: 'constant', documentation: 'Data value' }
      ]
    },
    'GOTO': {
      label: 'GOTO line_number',
      documentation: 'Jump to a line number',
      parameters: [
        { label: 'line_number', documentation: 'Target line number' }
      ]
    },
    'GOSUB': {
      label: 'GOSUB line_number',
      documentation: 'Call subroutine at line number',
      parameters: [
        { label: 'line_number', documentation: 'Subroutine line number' }
      ]
    },
    'IF': {
      label: 'IF condition THEN statement',
      documentation: 'Conditional execution',
      parameters: [
        { label: 'condition', documentation: 'Boolean expression' },
        { label: 'statement', documentation: 'Statement to execute if true' }
      ]
    },
    'LET': {
      label: 'LET variable = expression',
      documentation: 'Assign value to variable',
      parameters: [
        { label: 'variable', documentation: 'Variable name' },
        { label: 'expression', documentation: 'Value to assign' }
      ]
    },
    'RND': {
      label: 'RND: number',
      documentation: 'Random number between 0 and 1',
      parameters: []
    },
    'ASN': {
      label: 'ASN(x: number): number',
      documentation: 'Arc sine function (returns radians)',
      parameters: [
        { label: 'x', documentation: 'Value between -1 and 1' }
      ]
    },
    'ACS': {
      label: 'ACS(x: number): number',
      documentation: 'Arc cosine function (returns radians)',
      parameters: [
        { label: 'x', documentation: 'Value between -1 and 1' }
      ]
    },
    'ATN': {
      label: 'ATN(x: number): number',
      documentation: 'Arc tangent function (returns radians)',
      parameters: [
        { label: 'x', documentation: 'Any number' }
      ]
    },
    'SGN': {
      label: 'SGN(x: number): number',
      documentation: 'Sign function (-1, 0, or 1)',
      parameters: [
        { label: 'x', documentation: 'Any number' }
      ]
    },
    'EXP': {
      label: 'EXP(x: number): number',
      documentation: 'Exponential function (e^x)',
      parameters: [
        { label: 'x', documentation: 'Exponent' }
      ]
    },
    'LN': {
      label: 'LN(x: number): number',
      documentation: 'Natural logarithm',
      parameters: [
        { label: 'x', documentation: 'Positive number' }
      ]
    },
    'INKEY$': {
      label: 'INKEY$: string',
      documentation: 'Read last key pressed',
      parameters: []
    },
    'SCREEN$': {
      label: 'SCREEN$(line: number, column: number): string',
      documentation: 'Read character from screen',
      parameters: [
        { label: 'line', documentation: 'Screen line (0-21)' },
        { label: 'column', documentation: 'Screen column (0-31)' }
      ]
    },
    'ATTR': {
      label: 'ATTR(line: number, column: number): number',
      documentation: 'Get screen attribute',
      parameters: [
        { label: 'line', documentation: 'Screen line (0-21)' },
        { label: 'column', documentation: 'Screen column (0-31)' }
      ]
    },
    'POINT': {
      label: 'POINT(x: number, y: number): number',
      documentation: 'Test if pixel is set',
      parameters: [
        { label: 'x', documentation: 'X coordinate' },
        { label: 'y', documentation: 'Y coordinate' }
      ]
    },
    'USR': {
      label: 'USR(address: number): number',
      documentation: 'Call machine code routine',
      parameters: [
        { label: 'address', documentation: 'Memory address of routine' }
      ]
    },
    'IN': {
      label: 'IN(port: number): number',
      documentation: 'Read from I/O port',
      parameters: [
        { label: 'port', documentation: 'Port number (0-65535)' }
      ]
    },
    'OUT': {
      label: 'OUT port: number, value: number',
      documentation: 'Write to I/O port',
      parameters: [
        { label: 'port', documentation: 'Port number (0-65535)' },
        { label: 'value', documentation: 'Byte value (0-255)' }
      ]
    },
    'PAUSE': {
      label: 'PAUSE duration: number',
      documentation: 'Pause execution',
      parameters: [
        { label: 'duration', documentation: 'Duration in 1/50ths second (0=wait for key)' }
      ]
    },
    'RANDOMIZE': {
      label: 'RANDOMIZE [seed: number]',
      documentation: 'Seed random number generator',
      parameters: [
        { label: 'seed', documentation: 'Random seed (optional)' }
      ]
    },
    'RESTORE': {
      label: 'RESTORE [line_number]',
      documentation: 'Reset DATA pointer',
      parameters: [
        { label: 'line_number', documentation: 'Line to restore from (optional)' }
      ]
    },
    'SAVE': {
      label: 'SAVE "filename"',
      documentation: 'Save program to tape/disk',
      parameters: [
        { label: 'filename', documentation: 'File name' }
      ]
    },
    'LOAD': {
      label: 'LOAD "filename"',
      documentation: 'Load program from tape/disk',
      parameters: [
        { label: 'filename', documentation: 'File name' }
      ]
    },
    'VERIFY': {
      label: 'VERIFY "filename"',
      documentation: 'Verify saved program',
      parameters: [
        { label: 'filename', documentation: 'File name' }
      ]
    },
    'MERGE': {
      label: 'MERGE "filename"',
      documentation: 'Merge program from tape/disk',
      parameters: [
        { label: 'filename', documentation: 'File name' }
      ]
    },
  };

  return functionSignatures[functionName.toUpperCase()];
}

// Document Symbols Provider - show outline of line numbers and subroutines
connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const symbols: DocumentSymbol[] = [];
  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  let currentLineNumber: string | null = null;
  let lineNumberToken: Token | null = null;
  const lineNumbers = new Map<string, { token: Token; hasGosub: boolean }>();

  // First pass: collect all line numbers and check for GOSUB targets
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.LINE_NUMBER) {
      currentLineNumber = token.value;
      lineNumberToken = token;
      lineNumbers.set(currentLineNumber, { token, hasGosub: false });
    } else if (token.type === TokenType.KEYWORD && token.value === 'GOSUB') {
      // Next number token is a GOSUB target
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === TokenType.NUMBER || tokens[j].type === TokenType.LINE_NUMBER) {
          const targetLine = tokens[j].value;
          const existing = lineNumbers.get(targetLine);
          if (existing) {
            existing.hasGosub = true;
          } else {
            // Mark as potential subroutine even if not defined yet
            lineNumbers.set(targetLine, { token: tokens[j], hasGosub: true });
          }
          break;
        }
        if (tokens[j].type === TokenType.STATEMENT_SEPARATOR || tokens[j].type === TokenType.EOF) {
          break;
        }
      }
    }
  }

  // Second pass: create symbols for line numbers
  lineNumbers.forEach((info, lineNum) => {
    const token = info.token;
    const range: Range = {
      start: { line: token.line, character: token.start },
      end: { line: token.line, character: token.end }
    };

    const symbolKind = info.hasGosub ? SymbolKind.Function : SymbolKind.Number;
    const symbolName = info.hasGosub ? `${lineNum} (subroutine)` : lineNum;

    symbols.push({
      name: symbolName,
      kind: symbolKind,
      range: range,
      selectionRange: range
    });
  });

  // Sort by line number
  symbols.sort((a, b) => {
    const aNum = parseInt(a.name.split(' ')[0]);
    const bNum = parseInt(b.name.split(' ')[0]);
    return aNum - bNum;
  });

  return symbols;
});

// Go to Definition Provider - jump to line numbers from GOTO/GOSUB
connection.onDefinition((params: DefinitionParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  // Find the token at the cursor position
  const position = params.position;
  let targetToken: Token | null = null;

  for (const token of tokens) {
    if (token.line === position.line && 
        position.character >= token.start && 
        position.character <= token.end) {
      targetToken = token;
      break;
    }
  }

  if (!targetToken) {
    return null;
  }

  // Check if we're on a number after GOTO/GOSUB/RUN/LIST
  let isLineNumberReference = false;
  if (targetToken.type === TokenType.NUMBER || targetToken.type === TokenType.LINE_NUMBER) {
    // Look backwards for GOTO/GOSUB/RUN/LIST keywords
    for (let i = tokens.indexOf(targetToken) - 1; i >= 0; i--) {
      const prevToken = tokens[i];
      if (prevToken.type === TokenType.STATEMENT_SEPARATOR || 
          prevToken.line !== targetToken.line) {
        break;
      }
      if (prevToken.type === TokenType.KEYWORD && 
          ['GOTO', 'GOSUB', 'RUN', 'LIST', 'RESTORE'].includes(prevToken.value)) {
        isLineNumberReference = true;
        break;
      }
    }
  }

  if (!isLineNumberReference) {
    return null;
  }

  // Find the line number definition
  const targetLineNum = targetToken.value;
  for (const token of tokens) {
    if (token.type === TokenType.LINE_NUMBER && token.value === targetLineNum) {
      const range: Range = {
        start: { line: token.line, character: token.start },
        end: { line: token.line, character: token.end }
      };
      return Location.create(params.textDocument.uri, range);
    }
  }

  return null;
});

// Find References Provider - find all GOTO/GOSUB to a line number
connection.onReferences((params: ReferenceParams): Location[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const locations: Location[] = [];

  // Find the token at cursor
  const position = params.position;
  let targetToken: Token | null = null;

  for (const token of tokens) {
    if (token.line === position.line && 
        position.character >= token.start && 
        position.character <= token.end) {
      targetToken = token;
      break;
    }
  }

  if (!targetToken || targetToken.type !== TokenType.LINE_NUMBER) {
    return [];
  }

  const targetLineNum = targetToken.value;

  // Find all references to this line number
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Include the definition itself if includeDeclaration is true
    if (params.context.includeDeclaration && 
        token.type === TokenType.LINE_NUMBER && 
        token.value === targetLineNum) {
      const range: Range = {
        start: { line: token.line, character: token.start },
        end: { line: token.line, character: token.end }
      };
      locations.push(Location.create(params.textDocument.uri, range));
      continue;
    }

    // Find GOTO/GOSUB/RUN/LIST followed by this line number
    if (token.type === TokenType.KEYWORD && 
        ['GOTO', 'GOSUB', 'RUN', 'LIST', 'RESTORE'].includes(token.value)) {
      // Look for the next number token
      for (let j = i + 1; j < tokens.length; j++) {
        const nextToken = tokens[j];
        if (nextToken.type === TokenType.STATEMENT_SEPARATOR || 
            nextToken.type === TokenType.EOF) {
          break;
        }
        if ((nextToken.type === TokenType.NUMBER || 
             nextToken.type === TokenType.LINE_NUMBER) && 
            nextToken.value === targetLineNum) {
          const range: Range = {
            start: { line: nextToken.line, character: nextToken.start },
            end: { line: nextToken.line, character: nextToken.end }
          };
          locations.push(Location.create(params.textDocument.uri, range));
          break;
        }
      }
    }
  }

  return locations;
});

// Code Actions Provider - quick fixes and refactorings
connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const actions: CodeAction[] = [];
  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  // Check for missing line numbers
  const lines = text.split('\n');
  if (lines.length > 0 && lines[0].trim() && !lines[0].trim().match(/^\d+/)) {
    actions.push({
      title: 'Add line numbers',
      kind: CodeActionKind.QuickFix,
      edit: {
        changes: {
          [params.textDocument.uri]: addLineNumbers(lines, params.textDocument.uri)
        }
      }
    });
  }

  // Check for GOSUB without matching RETURN (simplified check)
  const gosubLines = new Set<number>();
  const returnLines = new Set<number>();
  
  for (const token of tokens) {
    if (token.type === TokenType.KEYWORD) {
      if (token.value === 'GOSUB') {
        gosubLines.add(token.line);
      } else if (token.value === 'RETURN') {
        returnLines.add(token.line);
      }
    }
  }

  // Offer to uppercase all keywords
  let hasLowercaseKeywords = false;
  for (const token of tokens) {
    if (token.type === TokenType.KEYWORD && token.value !== token.value.toUpperCase()) {
      hasLowercaseKeywords = true;
      break;
    }
  }

  if (hasLowercaseKeywords) {
    actions.push({
      title: 'Uppercase all keywords',
      kind: CodeActionKind.Refactor,
      edit: {
        changes: {
          [params.textDocument.uri]: uppercaseKeywords(tokens, document)
        }
      }
    });
  }

  return actions;
});

// Helper function to add line numbers
function addLineNumbers(lines: string[], uri: string): TextEdit[] {
  const edits: TextEdit[] = [];
  let lineNum = 10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() && !line.trim().match(/^\d+/)) {
      edits.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: 0 }
        },
        newText: `${lineNum} `
      });
      lineNum += 10;
    } else if (line.trim().match(/^\d+/)) {
      lineNum = parseInt(line.trim().split(/\s+/)[0]) + 10;
    }
  }

  return edits;
}

// Helper function to uppercase keywords
function uppercaseKeywords(tokens: Token[], document: TextDocument): TextEdit[] {
  const edits: TextEdit[] = [];

  for (const token of tokens) {
    if (token.type === TokenType.KEYWORD && token.value !== token.value.toUpperCase()) {
      const range: Range = {
        start: { line: token.line, character: token.start },
        end: { line: token.line, character: token.end }
      };
      edits.push({
        range,
        newText: token.value.toUpperCase()
      });
    }
  }

  return edits;
}

// Document Formatting Provider
connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const edits: TextEdit[] = [];

  // Format each line
  let currentLine = -1;
  let lineTokens: Token[] = [];

  for (const token of tokens) {
    if (token.line !== currentLine && currentLine >= 0) {
      // Process previous line
      const formatted = formatLine(lineTokens, document);
      if (formatted) {
        edits.push(formatted);
      }
      lineTokens = [];
    }
    currentLine = token.line;
    if (token.type !== TokenType.EOF) {
      lineTokens.push(token);
    }
  }

  // Process last line
  if (lineTokens.length > 0) {
    const formatted = formatLine(lineTokens, document);
    if (formatted) {
      edits.push(formatted);
    }
  }

  return edits;
});

// Helper function to format a single line
function formatLine(tokens: Token[], document: TextDocument): TextEdit | null {
  if (tokens.length === 0) {
    return null;
  }

  const line = tokens[0].line;
  const lineText = document.getText({
    start: { line, character: 0 },
    end: { line: line + 1, character: 0 }
  }).replace(/\n$/, '');

  let formatted = '';
  let prevToken: Token | null = null;

  for (const token of tokens) {
    // Add space before token if needed
    if (prevToken) {
      // Space after line number
      if (prevToken.type === TokenType.LINE_NUMBER) {
        formatted += ' ';
      }
      // Space around operators (except unary minus)
      else if (token.type === TokenType.OPERATOR || prevToken.type === TokenType.OPERATOR) {
        if (!(token.type === TokenType.OPERATOR && token.value === '-' && 
              (prevToken.type === TokenType.OPERATOR || prevToken.type === TokenType.PUNCTUATION))) {
          formatted += ' ';
        }
      }
      // Space after keywords
      else if (prevToken.type === TokenType.KEYWORD) {
        formatted += ' ';
      }
      // Space after commas
      else if (prevToken.type === TokenType.PUNCTUATION && prevToken.value === ',') {
        formatted += ' ';
      }
      // Space before and after statement separator
      else if (token.type === TokenType.STATEMENT_SEPARATOR || 
               prevToken.type === TokenType.STATEMENT_SEPARATOR) {
        formatted += ' ';
      }
    }

    // Uppercase keywords
    if (token.type === TokenType.KEYWORD) {
      formatted += token.value.toUpperCase();
    } else {
      formatted += token.value;
    }

    prevToken = token;
  }

  // Only return edit if formatting changed the line
  if (formatted !== lineText.trim()) {
    return {
      range: {
        start: { line, character: 0 },
        end: { line, character: lineText.length }
      },
      newText: formatted
    };
  }

  return null;
}

documents.listen(connection);
connection.listen();
