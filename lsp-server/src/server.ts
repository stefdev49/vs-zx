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
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ZXBasicLexer, ZXBasicParser, TokenType } from './zxbasic';

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
        triggerCharacters: [' ']
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['('],
        retriggerCharacters: [',']
      },
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false
      }
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
  });

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
  const text = document.getText({
    start: { line: Math.max(0, position.line - 5), character: 0 },
    end: position
  });

  // Get the current line and position
  const lineText = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: position.character }
  });

  // Find the current word being typed
  const wordMatch = lineText.match(/(\w+)$/);
  const currentWord = wordMatch ? wordMatch[1] : '';

  // Filter keywords based on what the user is typing
  const allKeywords = [
    'PRINT', 'LET', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
    'WHILE', 'WEND', 'REPEAT', 'UNTIL', 'READ', 'DATA', 'RESTORE',
    'DIM', 'DEF', 'FN', 'GOTO', 'GOSUB', 'RETURN', 'STOP', 'RANDOMIZE',
    'CONTINUE', 'CLEAR', 'CLS', 'INPUT', 'LOAD', 'SAVE', 'VERIFY', 'MERGE',
    'BEEP', 'INK', 'PAPER', 'FLASH', 'BRIGHT', 'INVERSE', 'OVER', 'BORDER',
    'PLOT', 'DRAW', 'CIRCLE', 'LPRINT', 'LLIST', 'COPY', 'SPECTRUM', 'PLAY',
    'ERASE', 'CAT', 'FORMAT', 'MOVE', 'AND', 'OR', 'NOT', 'USR', 'STR$',
    'CHR$', 'LEN', 'VAL', 'CODE', 'SIN', 'COS', 'TAN', 'ASN', 'ACS', 'ATN',
    'LN', 'EXP', 'INT', 'SQR', 'SGN', 'ABS', 'PI', 'TRUE', 'FALSE', 'VAL$',
    'SCREEN$', 'ATTR', 'POINT', 'PEEK', 'INKEY$', 'RND'
  ];

  const filteredKeywords = allKeywords.filter(keyword =>
    keyword.toLowerCase().startsWith(currentWord.toLowerCase())
  );

  // Create completion items
  const completionItems: CompletionItem[] = filteredKeywords.map(keyword => ({
    label: keyword,
    kind: isFunction(keyword) ? CompletionItemKind.Function : CompletionItemKind.Keyword,
    detail: getKeywordDetail(keyword),
    documentation: getKeywordDocumentation(keyword)
  }));

  // Add function completions with signature information
  if (currentWord.length >= 2) {
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
  const functions = [
    'USR', 'STR$', 'CHR$', 'LEN', 'VAL', 'CODE', 'SIN', 'COS', 'TAN', 'ASN', 'ACS', 'ATN',
    'LN', 'EXP', 'INT', 'SQR', 'SGN', 'ABS', 'VAL$', 'SCREEN$', 'ATTR', 'POINT', 'PEEK',
    'INKEY$', 'RND', 'PI', 'TRUE', 'FALSE'
  ];
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
    'PRINT': 'Print text or expressions to the screen',
    'LET': 'Assign a value to a variable',
    'IF': 'Conditional statement',
    'FOR': 'Start a FOR loop',
    'NEXT': 'End a FOR loop',
    'WHILE': 'Start a WHILE loop',
    'WEND': 'End a WHILE loop',
    'DEF': 'Define a user function',
    'FN': 'Call a user-defined function',
    'INPUT': 'Read keyboard input',
    'DIM': 'Dimension an array',
    'RANDOMIZE': 'Seed the random number generator',
    'CLS': 'Clear the screen',
    'PLOT': 'Draw a pixel',
    'DRAW': 'Draw a line',
    'CIRCLE': 'Draw a circle',
    // Add more as needed
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
    'PRINT': 'Print text, numbers, or expressions to the screen\n\n`PRINT expression [, expression]...`',
    'LET': 'Assign a value to a variable\n\n`LET variable = expression`',
    'IF': 'Conditional statement execution\n\n`IF condition THEN statement`',
    'FOR': 'Start a FOR loop\n\n`FOR variable = start TO end [STEP step]`',
    'SIN': 'Calculate the sine of an angle (in radians)\n\n`SIN(angle) -> number`',
    'COS': 'Calculate the cosine of an angle (in radians)\n\n`COS(angle) -> number`',
    'LEN': 'Return the length of a string\n\n`LEN(string) -> number`',
    'VAL': 'Convert a string to a numeric value\n\n`VAL(string) -> number`',
    'PEEK': 'Read a byte from memory\n\n`PEEK(address) -> number`',
    // Add more hover documentation as needed
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
    }
  };

  return functionSignatures[functionName.toUpperCase()];
}

documents.listen(connection);
connection.listen();
