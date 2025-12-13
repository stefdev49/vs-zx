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
  InsertTextFormat,
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
  DeclarationParams,
  Location,
  DefinitionParams,
  ReferenceParams,
  Range,
  Position,
  CodeAction,
  CodeActionParams,
  CodeActionKind,
  CodeLens,
  CodeLensParams,
  TextEdit,
  DocumentFormattingParams,
  SemanticTokensParams,
  SemanticTokens,
  SemanticTokensLegend,
  SemanticTokensRangeParams,
  PrepareRenameParams,
  RenameParams,
  WorkspaceEdit,
  FoldingRangeParams,
  FoldingRange,
  CallHierarchyPrepareParams,
  CallHierarchyItem,
  CallHierarchyIncomingCallsParams,
  CallHierarchyOutgoingCallsParams,
  CallHierarchyIncomingCall,
  CallHierarchyOutgoingCall,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  DocumentDiagnosticParams,
  TypeDefinitionParams,
  ImplementationParams,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ZXBasicLexer, ZXBasicParser, TokenType, Token } from './zxbasic';
import { basicKeywords, zx128Keywords, interface1Keywords, functions } from 'syntax-definitions';
import { createRenameEdits, getRenameContext } from './rename-utils';
import { findDeclarationRange } from './declaration-utils';
import { isImplicitStringSlice } from './array-utils';
import { isDrawingAttribute } from './color-utils';
import { findLineNumberDefinitionRange, findLineNumberDefinitionRangeFromTokens, findLineNumberReferenceRangeFromTokens, buildLineReferenceMap } from './line-number-utils';
import { findIdentifierReferenceRanges } from './identifier-utils';

// Snippet completions for common patterns
const snippets = [
  {
    label: 'for',
    detail: 'FOR loop snippet',
    insertText: 'FOR ${1:i} = ${2:1} TO ${3:10}${4:: code:: NEXT $1}',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'if',
    detail: 'IF/THEN snippet',
    insertText: 'IF ${1:condition} THEN ${2:statement}',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'gosub',
    detail: 'GOSUB subroutine snippet',
    insertText: 'GOSUB ${1:2000}${2:\n2000 REM subroutine\n${3:code}\nRETURN}',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'repeat',
    detail: 'DO/LOOP repeat snippet',
    insertText: '${1:10} REM repeat\n${2:code}\nGOTO $1',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'data',
    detail: 'DATA statement snippet',
    insertText: 'DATA ${1:value1}, ${2:value2}, ${3:value3}',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'dim',
    detail: 'DIM array snippet',
    insertText: 'DIM ${1:array}(${2:10})',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'input',
    detail: 'INPUT statement snippet',
    insertText: 'INPUT "${1:prompt}"; ${2:variable}',
    kind: CompletionItemKind.Snippet
  },
  {
    label: 'print',
    detail: 'PRINT statement snippet',
    insertText: 'PRINT ${1:expression}',
    kind: CompletionItemKind.Snippet
  }
];

interface ExampleSettings {
  maxNumberOfProblems: number;
  model: string;
  strictMode: boolean;
  lineNumberIncrement: number;
  maxLineLength: number;
  uppercaseKeywords: boolean;
  trace: { server: string };
  logging: {
    level: 'off' | 'error' | 'warn' | 'info' | 'debug';
  };
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: ExampleSettings = {
  maxNumberOfProblems: 1000,
  model: '48K',
  strictMode: false,
  lineNumberIncrement: 10,
  maxLineLength: 255,
  uppercaseKeywords: true,
  trace: { server: 'off' },
  logging: { level: 'off' }
};
let globalSettings: ExampleSettings = defaultSettings;

// The settings of all open documents.
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

// Semantic tokens legend for ZX BASIC
const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [
    'lineNumber',      // Line numbers at start of statements
    'variable',        // Variable names
    'stringVariable',  // String variables (with $)
    'numericVariable', // Numeric variables (with %)
    'array',           // Array names
    'function',        // Function names
    'keyword',         // Keywords
    'gotoTarget',      // GOTO/GOSUB line number targets
    'undefined',       // Undefined variables
    'comment'          // Comments
  ],
  tokenModifiers: [
    'declaration',     // Variable/function declaration
    'definition',      // Line number definition
    'readonly',        // Constants
    'deprecated',      // Deprecated keywords
    'unused'           // Unused variables
  ]
};

// Semantic token type indices - must match `semanticTokensLegend.tokenTypes` order
const SEMANTIC = {
  LINE_NUMBER: 0,
  VARIABLE: 1,
  STRING_VARIABLE: 2,
  NUMERIC_VARIABLE: 3,
  ARRAY: 4,
  FUNCTION: 5,
  KEYWORD: 6,
  GOTO_TARGET: 7,
  UNDEFINED: 8,
  COMMENT: 9
} as const;

// Semantic token modifier indices - must match `semanticTokensLegend.tokenModifiers` order
const SEMANTIC_MOD = {
  DECLARATION: 0,
  DEFINITION: 1,
  READONLY: 2,
  DEPRECATED: 3,
  UNUSED: 4
} as const;

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
      section: 'zxBasic'
    }).then(settings => ({
      maxNumberOfProblems: settings?.maxNumberOfProblems ?? defaultSettings.maxNumberOfProblems,
      model: settings?.model ?? defaultSettings.model,
      strictMode: settings?.strictMode ?? defaultSettings.strictMode,
      lineNumberIncrement: settings?.lineNumberIncrement ?? defaultSettings.lineNumberIncrement,
      maxLineLength: settings?.maxLineLength ?? defaultSettings.maxLineLength,
      uppercaseKeywords: settings?.uppercaseKeywords ?? defaultSettings.uppercaseKeywords,
      trace: { server: settings?.trace?.server ?? defaultSettings.trace.server },
      logging: { level: settings?.logging?.level ?? defaultSettings.logging.level }
    })));
  } return documentSettings.get(resource)!;
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
      declarationProvider: true,
      typeDefinitionProvider: true,
      implementationProvider: true,
      referencesProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.Refactor]
      },
      codeLensProvider: {
        resolveProvider: false
      },
      documentFormattingProvider: true,
      semanticTokensProvider: {
        legend: semanticTokensLegend,
        full: true,
        range: true
      },
      renameProvider: {
        prepareProvider: true
      },
      foldingRangeProvider: true,
      callHierarchyProvider: true
    }
  };
});

connection.onInitialized(() => {
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
  connection.window.showInformationMessage('ZX BASIC language server initialized and ready.');
});

// Settings changed notification
connection.onDidChangeConfiguration(change => {
  // Clear document settings cache
  documentSettings.clear();
  
  // Update global settings if available
  if (change.settings && change.settings.zxBasic) {
    globalSettings = <ExampleSettings>(
      change.settings.zxBasic || defaultSettings
    );

    connection.window.showInformationMessage(
      `ZX BASIC settings updated (strictMode=${globalSettings.strictMode ? 'on' : 'off'}, model=${globalSettings.model}).`
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
async function validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
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

  // Check for lines without line numbers (must start with line number or be empty/comment)
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      continue;
    }
    
    // Check if line starts with a digit (line number)
    if (!/^\d+/.test(trimmed)) {
      // This is an error - non-empty line without line number
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: Math.min(trimmed.length, 80) }
        },
        message: `Line must start with a line number (1-9999). ZX BASIC does not support multi-line statements.`,
        source: 'zx-basic-lsp'
      });
    }
  }

  // Check for FOR/NEXT matching with variable tracking
  const forStack: Array<{ line: number; start: number; end: number; variable: string; tokenIndex: number }> = [];
  const unmatchedNextStatements: Array<{ line: number; start: number; end: number; variable: string | null }> = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && token.value === 'FOR') {
      // Get the loop variable (next identifier token)
      let loopVar = '';
      for (let j = i + 1; j < tokens.length && j < i + 5; j++) {
        if (tokens[j].type === TokenType.IDENTIFIER) {
          loopVar = tokens[j].value.replace(/[$%]$/, '').toUpperCase();
          break;
        }
      }
      
      forStack.push({
        line: token.line,
        start: token.start,
        end: token.end,
        variable: loopVar,
        tokenIndex: i
      });
    } else if (token.type === TokenType.KEYWORD && token.value === 'NEXT') {
      // Get the NEXT variable if specified
      let nextVar: string | null = null;
      for (let j = i + 1; j < tokens.length && j < i + 5; j++) {
        if (tokens[j].type === TokenType.IDENTIFIER) {
          nextVar = tokens[j].value.replace(/[$%]$/, '').toUpperCase();
          break;
        }
        // Stop at statement separator or colon
        if (tokens[j].type === TokenType.STATEMENT_SEPARATOR || 
            (tokens[j].type === TokenType.PUNCTUATION && tokens[j].value === ':')) {
          break;
        }
      }
      
      if (forStack.length > 0) {
        const matchingFor = forStack.pop()!;
        
        // Check if NEXT has a variable specified
        if (nextVar !== null) {
          // Validate that NEXT variable matches FOR variable
          if (nextVar !== matchingFor.variable) {
            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: token.line, character: token.start },
                end: { line: token.line, character: token.end + (nextVar ? nextVar.length + 1 : 0) }
              },
              message: `NEXT ${nextVar} does not match FOR ${matchingFor.variable} at line ${matchingFor.line + 1}`,
              source: 'zx-basic-lsp'
            });
          }
        }
        // If NEXT has no variable, it matches the most recent FOR (which we already popped)
      } else {
        // NEXT without matching FOR
        unmatchedNextStatements.push({
          line: token.line,
          start: token.start,
          end: token.end,
          variable: nextVar
        });
      }
    }
  }

  // Report unmatched FOR loops (still on stack)
  forStack.forEach(forLoop => {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: forLoop.line, character: forLoop.start },
        end: { line: forLoop.line, character: forLoop.end }
      },
      message: `FOR ${forLoop.variable} has no matching NEXT statement`,
      source: 'zx-basic-lsp'
    });
  });

  // Report unmatched NEXT statements
  unmatchedNextStatements.forEach(next => {
    const varInfo = next.variable ? ` ${next.variable}` : '';
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: next.line, character: next.start },
        end: { line: next.line, character: next.end }
      },
      message: `NEXT${varInfo} has no matching FOR loop`,
      source: 'zx-basic-lsp'
    });
  });

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

  // Check for IF without THEN
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && token.value === 'IF') {
      // Look for THEN in the same logical line (until STATEMENT_SEPARATOR or end)
      let foundThen = false;
      let foundEOL = false;
      
      for (let j = i + 1; j < tokens.length; j++) {
        const nextToken = tokens[j];
        
        // Stop at statement separator or end of tokens
        if (nextToken.type === TokenType.STATEMENT_SEPARATOR) {
          foundEOL = true;
          break;
        }
        
        // Check if we've reached end (different line for multi-line programs)
        if (nextToken.line > token.line && nextToken.type === TokenType.LINE_NUMBER) {
          foundEOL = true;
          break;
        }
        
        if (nextToken.type === TokenType.KEYWORD && nextToken.value === 'THEN') {
          foundThen = true;
          break;
        }
      }
      
      if (!foundThen) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: token.line, character: token.start },
            end: { line: token.line, character: token.end }
          },
          message: `IF statement missing THEN keyword`,
          source: 'zx-basic-lsp'
        });
      }
    }
  }

  // Check for DIM with too many dimensions (max 3 in ZX BASIC)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && token.value === 'DIM') {
      // Look for array variable name and opening parenthesis
      let arrayName = '';
      let isStringArray = false;
      let parenStart = -1;
      let parenEnd = -1;
      
      for (let j = i + 1; j < tokens.length && j < i + 20; j++) {
        if (tokens[j].type === TokenType.IDENTIFIER) {
          arrayName = tokens[j].value;
          isStringArray = arrayName.endsWith('$');
        } else if (tokens[j].type === TokenType.PUNCTUATION && tokens[j].value === '(') {
          parenStart = j;
        } else if (tokens[j].type === TokenType.PUNCTUATION && tokens[j].value === ')') {
          parenEnd = j;
          break;
        } else if (tokens[j].type === TokenType.STATEMENT_SEPARATOR || 
                   tokens[j].type === TokenType.LINE_NUMBER) {
          break;
        }
      }
      
      if (parenStart !== -1 && parenEnd !== -1) {
        // Count commas between parentheses (parameters = commas + 1)
        let paramCount = 1;
        for (let j = parenStart + 1; j < parenEnd; j++) {
          if (tokens[j].type === TokenType.PUNCTUATION && tokens[j].value === ',') {
            paramCount++;
          }
        }
        
        // For string arrays, last parameter is string length, not a dimension
        // So max is 4 parameters (3 dimensions + string length)
        // For numeric arrays, max is 3 parameters (3 dimensions)
        const maxParams = isStringArray ? 4 : 3;
        const dimensionType = isStringArray ? 'dimensions + string length' : 'dimensions';
        
        if (paramCount > maxParams) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: token.line, character: token.start },
              end: { line: tokens[parenEnd].line, character: tokens[parenEnd].end }
            },
            message: `DIM ${arrayName} has too many parameters: found ${paramCount}, maximum is ${maxParams} ${dimensionType}`,
            source: 'zx-basic-lsp'
          });
        }
      }
    }
  }

  // Check for invalid color values (0-7 for INK, PAPER, BORDER)
  const colorKeywords = ['INK', 'PAPER', 'BORDER'];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && colorKeywords.includes(token.value)) {
      if ((token.value === 'INK' || token.value === 'PAPER') && isDrawingAttribute(tokens, i)) {
        continue;
      }
      // Look for the next number token as the color value
      for (let j = i + 1; j < tokens.length; j++) {
        const nextToken = tokens[j];
        
        // Stop at separators or keywords
        if (nextToken.type === TokenType.STATEMENT_SEPARATOR ||
            nextToken.type === TokenType.PUNCTUATION && nextToken.value === ')') {
          break;
        }
        
        if (nextToken.type === TokenType.NUMBER) {
          const colorValue = parseInt(nextToken.value, 10);
          let isValid = false;
          let validRange = '';
          
          if (token.value === 'BORDER') {
            // BORDER only accepts 0-7
            isValid = colorValue >= 0 && colorValue <= 7;
            validRange = '0-7';
          } else if (token.value === 'INK' || token.value === 'PAPER') {
            // INK and PAPER accept 0-7 (colors), 8 (no change), 9 (contrast)
            isValid = (colorValue >= 0 && colorValue <= 7) || colorValue === 8 || colorValue === 9;
            validRange = '0-7 (or 8=no change, 9=contrast)';
          }
          
          if (!isValid) {
            diagnostics.push({
              severity: DiagnosticSeverity.Warning,
              range: {
                start: { line: nextToken.line, character: nextToken.start },
                end: { line: nextToken.line, character: nextToken.end }
              },
              message: `Invalid color value for ${token.value}: ${colorValue}. Valid range: ${validRange}`,
              source: 'zx-basic-lsp'
            });
          }
          break;
        }
      }
    }
  }

  // Check for array dimension validation (DIM declares vs usage)
  const dimDeclarations = new Map<string, { line: number; dimensions: number; isString: boolean }>();
  const arrayUsages = new Map<string, Array<{ line: number; usedDimensions: number; isString: boolean }>>();
  
  // First pass: collect all DIM declarations
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.KEYWORD && token.value === 'DIM') {
      // Next token should be an identifier
      i++;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && 
             tokens[i].type !== TokenType.EOF) {
        const idToken = tokens[i];
        
        if (idToken.type === TokenType.IDENTIFIER) {
          const arrayName = idToken.value.replace(/[$%]$/, '');
          
          // Count dimensions (number of commas in parentheses)
          let dimensionCount = 0;
          let parenStart = -1;
          i++;
          if (i < tokens.length && tokens[i].value === '(') {
            parenStart = i;
            i++;
            let depth = 1;
            while (i < tokens.length && depth > 0) {
              if (tokens[i].value === '(') depth++;
              else if (tokens[i].value === ')') depth--;
              else if (tokens[i].value === ',' && depth === 1) dimensionCount++;
              i++;
            }
            dimensionCount++; // At least one dimension
            
            // Check if dimension count exceeds ZX BASIC limit (max 3 dimensions)
                // Determine if the declared identifier was a string array (had $ suffix)
                const rawName = idToken.value;
                const isStringArray = rawName.endsWith('$');

                // For string arrays, the last parameter is string length, not a dimension
                const declaredDimensions = isStringArray ? Math.max(0, dimensionCount - 1) : dimensionCount;

                // Check if declared dimensions exceeds ZX BASIC limit
                if (declaredDimensions > 3) {
                  diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                      start: { line: idToken.line, character: idToken.start },
                      end: { line: idToken.line, character: i }
                    },
                    message: `Array '${arrayName}' declares ${declaredDimensions} dimension(s), but ZX BASIC maximum is 3`,
                    source: 'zx-basic-lsp'
                  });
                }

                // Store the declaration (use base name without $/%)
                if (!dimDeclarations.has(arrayName)) {
                  dimDeclarations.set(arrayName, { line: idToken.line, dimensions: declaredDimensions, isString: isStringArray });
                }
          }
        } else {
          i++;
        }
      }
      i--;
    }
  }
  
  // Second pass: check array usage matches declarations
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.IDENTIFIER) {
      const arrayName = token.value.replace(/[$%]$/, '');
      const isStringVariable = token.value.endsWith('$');
      
      // Check if followed by parentheses (array usage or string slicing)
      if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
        // Count dimensions in this usage and detect TO keyword for string slicing
        let usedDimensions = 0;
        let hasToKeyword = false;
        let j = i + 2;
        let depth = 1;
        
        while (j < tokens.length && depth > 0) {
          if (tokens[j].value === '(') {
            depth++;
          } else if (tokens[j].value === ')') {
            depth--;
          } else if (tokens[j].value === ',' && depth === 1) {
            usedDimensions++;
          } else if (depth === 1 && tokens[j].type === TokenType.KEYWORD && tokens[j].value.toUpperCase() === 'TO') {
            hasToKeyword = true;
          }
          j++;
        }
        usedDimensions++; // At least one dimension/parameter
        
        const hasDeclaration = dimDeclarations.has(arrayName);

        if (isImplicitStringSlice({
          isStringVariable,
          hasToKeyword,
          usedDimensions,
          hasDeclaration
        })) {
          continue;
        }
        
        // Check if usage exceeds ZX BASIC limit
        if (usedDimensions > 3) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: token.line, character: token.start },
              end: { line: token.line, character: j }
            },
            message: `Array access uses ${usedDimensions} dimensions, but ZX BASIC maximum is 3`,
            source: 'zx-basic-lsp'
          });
        }
        
        // Track usage
        if (!arrayUsages.has(arrayName)) {
          arrayUsages.set(arrayName, []);
        }
        arrayUsages.get(arrayName)!.push({ line: token.line, usedDimensions, isString: isStringVariable });
      }
    }
  }
  
  // Check for mismatches between DIM and usage
  arrayUsages.forEach((usages, arrayName) => {
    const declaration = dimDeclarations.get(arrayName);
    
    if (!declaration) {
      // Array used but not declared with DIM
      usages.forEach(usage => {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: usage.line, character: 0 },
            end: { line: usage.line, character: arrayName.length }
          },
          message: `Array '${arrayName}' used but not declared with DIM`,
          source: 'zx-basic-lsp'
        });
      });
    } else {
      // Check dimension count
      usages.forEach(usage => {
        // For string arrays, the declaration.dimensions excludes the trailing length parameter
        const declaredDims = declaration.dimensions;
        const usedDims = usage.usedDimensions;

        // Special case: String arrays can have one extra parameter for character position access
        // e.g., DIM a$(10,20) declares 1D array, a$(5,10) accesses element 5, character 10
        const isValidStringSlicing = declaration.isString && usage.isString && usedDims === declaredDims + 1;

        if (usedDims !== declaredDims && !isValidStringSlicing) {
          let message = `Array '${arrayName}' declared with ${declaredDims} dimension(s) but used with ${usedDims}`;
          
          if (declaration.isString && usedDims === declaredDims + 1) {
            // This shouldn't happen due to isValidStringSlicing check, but kept for safety
            message += ' (extra parameter may be character position for string slicing)';
          } else if (declaration.isString) {
            message += ' (string length parameter not counted as dimension)';
          }
          
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: {
              start: { line: usage.line, character: 0 },
              end: { line: usage.line, character: arrayName.length }
            },
            message: message,
            source: 'zx-basic-lsp'
          });
        }
      });
    }
  });

  // Type checking: validate string vs numeric operations
  // Build a map of known variable types from assignments
  const variableTypes = new Map<string, 'string' | 'numeric' | 'unknown'>();
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // LET assignments: LET var = expression
    if (token.type === TokenType.KEYWORD && token.value === 'LET' && i + 1 < tokens.length) {
      const varToken = tokens[i + 1];
      if (varToken.type === TokenType.IDENTIFIER) {
        const varName = varToken.value.replace(/[$%]$/, '');
        // Infer type from suffix
        if (varToken.value.endsWith('$')) {
          variableTypes.set(varName, 'string');
        } else if (varToken.value.endsWith('%')) {
          variableTypes.set(varName, 'numeric');
        } else {
          variableTypes.set(varName, 'numeric'); // Default to numeric without suffix
        }
      }
    }
    
    // INPUT statements: INPUT var [, var]...
    if (token.type === TokenType.KEYWORD && token.value === 'INPUT') {
      i++;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && tokens[i].type !== TokenType.EOF) {
        if (tokens[i].type === TokenType.IDENTIFIER) {
          const varName = tokens[i].value.replace(/[$%]$/, '');
          if (tokens[i].value.endsWith('$')) {
            variableTypes.set(varName, 'string');
          } else {
            variableTypes.set(varName, 'numeric');
          }
        }
        i++;
      }
      i--;
    }
    
    // FOR loops: FOR var = ...
    if (token.type === TokenType.KEYWORD && token.value === 'FOR' && i + 1 < tokens.length) {
      const varToken = tokens[i + 1];
      if (varToken.type === TokenType.IDENTIFIER) {
        const varName = varToken.value.replace(/[$%]$/, '');
        variableTypes.set(varName, 'numeric'); // FOR loop variables are always numeric
      }
    }
  }
  
  // Check for type mismatches in common operations
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Check for string concatenation with + (should be invalid in ZX BASIC, use &)
    if (token.type === TokenType.IDENTIFIER && i + 1 < tokens.length && tokens[i + 1].value === '+') {
      const varName = token.value.replace(/[$%]$/, '');
      const varType = variableTypes.get(varName);
      
      if (varType === 'string' && token.value.endsWith('$')) {
        // Look ahead to check what's being added
        if (i + 2 < tokens.length) {
          const nextToken = tokens[i + 2];
          if (nextToken.type === TokenType.IDENTIFIER && nextToken.value.endsWith('$')) {
            diagnostics.push({
              severity: DiagnosticSeverity.Warning,
              range: {
                start: { line: token.line, character: token.start },
                end: { line: token.line, character: token.end }
              },
              message: `String concatenation with + is not standard in ZX BASIC (use & or space)`,
              source: 'zx-basic-lsp'
            });
          }
        }
      }
    }
    
    // Check for numeric operations on string variables
    if (token.type === TokenType.KEYWORD && (token.value === 'ABS' || token.value === 'SQR' || token.value === 'SIN' || token.value === 'COS') && i + 1 < tokens.length && tokens[i + 1].value === '(') {
      // These functions require numeric arguments
      if (i + 2 < tokens.length && tokens[i + 2].type === TokenType.IDENTIFIER) {
        const varName = tokens[i + 2].value.replace(/[$%]$/, '');
        const varType = variableTypes.get(varName);
        
        if (varType === 'string') {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: {
              start: { line: token.line, character: token.start },
              end: { line: tokens[i + 2].line, character: tokens[i + 2].end }
            },
            message: `${token.value}() requires numeric argument, but ${varName}$ is a string variable`,
            source: 'zx-basic-lsp'
          });
        }
      }
    }
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

  // Send diagnostics via push
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: limitedDiagnostics });
  
  // Return diagnostics for pull requests
  return limitedDiagnostics;
}

// Pull diagnostics handler
connection.languages.diagnostics.on(async (params: DocumentDiagnosticParams): Promise<DocumentDiagnosticReport> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: []
    };
  }

  const diagnostics = await validateTextDocument(document);
  
  return {
    kind: DocumentDiagnosticReportKind.Full,
    items: diagnostics
  };
});

// Context detection for intelligent completion filtering
interface CompletionContext {
  isAtStatementStart: boolean;
  isInExpression: boolean;
  isAfterLineNumberKeyword: boolean;
  previousKeyword: string | null;
  linePrefix: string;
}

function detectCompletionContext(lineText: string, position: number): CompletionContext {
  const linePrefix = lineText.substring(0, position);
  
  // Check if we're at statement start (after line number or colon)
  const afterLineNumber = /^\s*\d+\s*$/.test(linePrefix);
  const afterColon = /:\s*$/.test(linePrefix);
  const atLineStart = linePrefix.trim() === '';
  const isAtStatementStart = afterLineNumber || afterColon || atLineStart;
  
  // Extract the last keyword (statement keyword, not operators)
  const keywordPattern = /\b(IF|FOR|PRINT|INPUT|LET|DIM|GOTO|GOSUB|READ|DATA|RETURN|NEXT|ELSE)\b/gi;
  let previousKeyword: string | null = null;
  let match;
  while ((match = keywordPattern.exec(linePrefix)) !== null) {
    previousKeyword = match[1].toUpperCase();
  }
  
  // Check if we're after a line number context keyword
  const lineNumberContextKeywords = ['GOTO', 'GOSUB', 'RUN', 'LIST'];
  let isAfterLineNumberKeyword = false;
  for (const keyword of lineNumberContextKeywords) {
    const keywordIndex = linePrefix.toUpperCase().lastIndexOf(keyword);
    if (keywordIndex !== -1) {
      const afterKeyword = linePrefix.substring(keywordIndex + keyword.length);
      if (/^\s*\d*$/.test(afterKeyword)) {
        isAfterLineNumberKeyword = true;
        break;
      }
    }
  }
  
  // Check if we're in an expression context
  // We're in expression if we're after operators, inside parentheses, or after keywords like PRINT
  const expressionContextKeywords = ['PRINT', 'INPUT', 'IF', 'LET', 'READ', 'RETURN', '(', '=', ',', ';'];
  let isInExpression = false;
  
  for (const keyword of expressionContextKeywords) {
    if (linePrefix.toUpperCase().includes(keyword)) {
      // Check if there's a statement separator after (which would end expression context)
      const afterKeywordText = linePrefix.substring(linePrefix.toUpperCase().lastIndexOf(keyword) + keyword.length);
      if (!afterKeywordText.includes(':') || /:\s*$/.test(afterKeywordText)) {
        isInExpression = true;
      }
    }
  }
  
  return {
    isAtStatementStart,
    isInExpression,
    isAfterLineNumberKeyword,
    previousKeyword,
    linePrefix
  };
}

// Completion provider
connection.onCompletion(async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const position = params.position;
  const text = document.getText();
  
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

  const completionItems: CompletionItem[] = [];

  // Detect completion context
  const context = detectCompletionContext(lineText, position.character);

  // Handle line number completion
  if (context.isAfterLineNumberKeyword && /^\d*$/.test(currentWord)) {
    // Extract all line numbers from the document
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(text);
    const lineNumbers = new Set<string>();
    
    for (const token of tokens) {
      if (token.type === TokenType.LINE_NUMBER) {
        lineNumbers.add(token.value);
      }
    }

    // Add line numbers as completion items
    const sortedLineNumbers = Array.from(lineNumbers).sort((a, b) => parseInt(a) - parseInt(b));
    for (const lineNum of sortedLineNumbers) {
      if (lineNum.startsWith(currentWord)) {
        completionItems.push({
          label: lineNum,
          kind: CompletionItemKind.Constant,
          detail: 'Line number',
          sortText: lineNum.padStart(4, '0') // Sort numerically
        });
      }
    }
    
    return completionItems;
  }

  // Get document settings for model-specific filtering
  const settings = await getDocumentSettings(params.textDocument.uri);

  // Filter keywords based on what the user is typing with context awareness
  // Build keyword list based on target model
  let allKeywords = [...basicKeywords, ...functions];
  
  // Add model-specific keywords based on settings
  if (settings.model === '128K') {
    allKeywords = [...allKeywords, ...zx128Keywords];
  } else if (settings.model === 'Interface1') {
    allKeywords = [...allKeywords, ...interface1Keywords];
  }
  // For '48K', only include basicKeywords and functions (already done above)

  // Define statement keywords (only appear at statement start)
  const statementKeywords = new Set([
    'LET', 'PRINT', 'INPUT', 'IF', 'FOR', 'DIM', 'GOTO', 'GOSUB', 'READ', 'DATA',
    'RETURN', 'NEXT', 'STOP', 'CLS', 'BEEP', 'BORDER', 'INK', 'PAPER', 'FLASH',
    'BRIGHT', 'INVERSE', 'OVER', 'PLOT', 'DRAW', 'CIRCLE', 'REM', 'RANDOMIZE',
    'CLEAR', 'RESTORE', 'CONTINUE', 'LOAD', 'SAVE', 'VERIFY', 'MERGE', 'LPRINT',
    'LLIST', 'COPY', 'CAT', 'FORMAT', 'MOVE', 'ERASE', 'SPECTRUM', 'PLAY', 'NET'
  ]);

  // Define expression-only keywords (only appear in expressions)
  const expressionKeywords = new Set([
    'AND', 'OR', 'NOT', 'TO', 'STEP', 'THEN', 'ELSE'
  ]);

  // Filter keywords based on context
  let filteredKeywords = allKeywords.filter(keyword =>
    keyword.toLowerCase().startsWith(currentWord.toLowerCase())
  );

  // Apply context-aware filtering
  if (context.isAtStatementStart) {
    // Only show statement keywords at statement start
    filteredKeywords = filteredKeywords.filter(kw => 
      statementKeywords.has(kw.toUpperCase()) || isFunction(kw)
    );
  } else if (context.isInExpression) {
    // In expressions, show functions and expression operators but exclude statement keywords
    filteredKeywords = filteredKeywords.filter(kw => {
      const upper = kw.toUpperCase();
      return isFunction(kw) || expressionKeywords.has(upper) || !statementKeywords.has(upper);
    });
  }

  // Add snippet completions for matching prefixes (only at statement start)
  if (context.isAtStatementStart || currentWord === '') {
    snippets.forEach(snippet => {
      if (snippet.label.toLowerCase().startsWith(currentWord.toLowerCase())) {
        completionItems.push({
          label: snippet.label,
          kind: CompletionItemKind.Snippet,
          insertText: snippet.insertText,
          insertTextFormat: InsertTextFormat.Snippet,
          detail: snippet.detail,
          sortText: `a_${snippet.label}` // Sort snippets first (before keywords)
        });
      }
    });
  }

  // Create completion items
  filteredKeywords.forEach(keyword => {
    completionItems.push({
      label: keyword,
      kind: isFunction(keyword) ? CompletionItemKind.Function : CompletionItemKind.Keyword,
      detail: getKeywordDetail(keyword),
      documentation: getKeywordDocumentation(keyword),
      sortText: `b_${keyword}` // Sort keywords after snippets
    });
  });

  // Add function completions with signature information
  if (currentWord.length >= 1) {
    const functionCompletions = getFunctionCompletions(currentWord);
    completionItems.push(...functionCompletions);
  }

  // Add variable and array names from the document (if not in keyword context)
  if (!context.isAfterLineNumberKeyword && currentWord.length >= 1) {
    const lexer = new ZXBasicLexer();
    const tokens = lexer.tokenize(text);
    const variableNames = new Set<string>();
    const arrayNames = new Set<string>();
    
    // Track variables and array declarations
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DIM' && i + 1 < tokens.length) {
        // Extract array names from DIM declaration
        i++;
        while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && tokens[i].type !== TokenType.EOF) {
          if (tokens[i].type === TokenType.IDENTIFIER) {
            const arrayName = tokens[i].value.replace(/[$%]$/, '');
            // Arrays are followed by parentheses
            if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
              if (arrayName.toUpperCase().startsWith(currentWord)) {
                arrayNames.add(arrayName);
              }
            }
          }
          i++;
        }
      } else if (token.type === TokenType.IDENTIFIER) {
        // Extract the variable name (remove $ and % suffixes for tracking)
        const varName = token.value.replace(/[$%]$/, '');
        
        if (varName.toUpperCase().startsWith(currentWord)) {
          // Check if it's an array (followed by parentheses)
          if (i + 1 < tokens.length && tokens[i + 1].value === '(') {
            arrayNames.add(varName);
          } else {
            variableNames.add(varName);
          }
        }
      }
      i++;
    }
    
    // Add array names first (as completion items)
    const sortedArrays = Array.from(arrayNames).sort();
    for (const arrayName of sortedArrays) {
      completionItems.push({
        label: arrayName,
        kind: CompletionItemKind.Variable,
        detail: 'Array',
        sortText: `y_${arrayName}` // Sort after keywords but before scalar variables
      });
    }
    
    // Add variables as completion items (sorted alphabetically)
    const sortedVariables = Array.from(variableNames).sort();
    for (const varName of sortedVariables) {
      // Don't add if already in arrays
      if (arrayNames.has(varName)) {
        continue;
      }
      
      // Determine if it's a string or numeric variable
      const hasStringSuffix = new RegExp(`${varName}\\$\\b`, 'i').test(text);
      const hasIntegerSuffix = new RegExp(`${varName}%\\b`, 'i').test(text);
      
      let detail = 'Variable';
      if (hasStringSuffix) {
        detail = 'String variable ($)';
      } else if (hasIntegerSuffix) {
        detail = 'Integer variable (%)';
      }
      
      completionItems.push({
        label: varName,
        kind: CompletionItemKind.Variable,
        detail,
        sortText: `z_${varName}` // Sort after keywords and arrays
      });
    }
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
  
  // Get the full line text
  const fullLineText = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 }
  }).replace(/\n$/, '');

  // Extract word at cursor position - search both backward and forward
  let startChar = position.character;
  let endChar = position.character;
  
  // Move start backward to find word boundary
  while (startChar > 0 && /[A-Za-z0-9_$%]/.test(fullLineText[startChar - 1])) {
    startChar--;
  }
  
  // Move end forward to find word boundary
  while (endChar < fullLineText.length && /[A-Za-z0-9_$%]/.test(fullLineText[endChar])) {
    endChar++;
  }
  
  const word = fullLineText.substring(startChar, endChar).toUpperCase();
  
  // Debug logging
  connection.console.log(`Hover debug: position=${position.line}:${position.character}, word="${word}", startChar=${startChar}, endChar=${endChar}`);
  
  if (!word) {
    return { contents: [] };
  }

  // Check if it's a keyword first
  const hoverText = getHoverDocumentation(word);
  if (hoverText) {
    return {
      contents: {
        kind: 'markdown',
        value: `**${word}**\n\n${hoverText}`
      }
    };
  }

  // Check if it's a line number (hover over GOTO/GOSUB target)
  // Only show line info if preceded by GOTO, GOSUB, RUN, LIST, RESTORE, etc.
  if (/^\d+$/.test(word)) {
    const lineNum = word;
    
    // Check if this number is preceded by a target keyword
    const beforeWord = fullLineText.substring(0, startChar).trimEnd();
    const isTargetNumber = /\b(GOTO|GO TO|GOSUB|GO SUB|RUN|LIST|RESTORE|THEN|ELSE)\s*$/.test(beforeWord);
    
    if (isTargetNumber) {
      const lexer = new ZXBasicLexer();
      const allTokens = lexer.tokenize(document.getText());
      
      // Find the line content using original source text
      let foundLine = false;
      let lineStartIdx = -1;
      let lineEndIdx = -1;
      
      for (let i = 0; i < allTokens.length; i++) {
        if (allTokens[i].type === TokenType.LINE_NUMBER && allTokens[i].value === lineNum) {
          foundLine = true;
          lineStartIdx = i;
          
          // Find the end of line (next line number or EOF)
          i++;
          while (i < allTokens.length) {
            if (allTokens[i].type === TokenType.LINE_NUMBER || allTokens[i].type === TokenType.EOF) {
              lineEndIdx = i;
              break;
            }
            i++;
          }
          if (lineEndIdx === -1) {
            lineEndIdx = allTokens.length;
          }
          break;
        }
      }
      
      // Extract text from original source using token positions
      if (foundLine && lineStartIdx >= 0) {
        const startToken = allTokens[lineStartIdx];
        
        // Find where this line ends - look for next line number or end of document
        let endLine = startToken.line;
        let endChar = 500; // Default to far end of line
        
        // Search for the next line number token on a different line
        for (let j = lineStartIdx + 1; j < allTokens.length; j++) {
          if (allTokens[j].type === TokenType.LINE_NUMBER && allTokens[j].line > startToken.line) {
            endLine = allTokens[j].line;
            endChar = 0; // Start of next line
            break;
          }
          if (allTokens[j].type === TokenType.EOF) {
            endLine = allTokens[j].line;
            endChar = allTokens[j].start;
            break;
          }
        }
        
        // Get full line text from line number to end of line
        const lineContent = document.getText({
          start: { line: startToken.line, character: 0 },
          end: { line: endLine, character: endChar }
        });
        
        return {
          contents: {
            kind: 'markdown',
            value: `**Line ${lineNum}**\n\`\`\`zx-basic\n${lineContent.trim()}\n\`\`\``
          }
        };
      }
    }
  }

  // Check if it's a variable (show type based on suffix)
  const fullLine = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: 500 }
  });
  
  // Look for variable type indicators
  const varPattern = new RegExp(`\\b${word.replace(/[$%]$/, '')}[$%]?\\b`, 'g');
  let isStringVar = false;
  let isIntegerVar = false;
  let isArray = false;
  
  const allMatches = fullLine.matchAll(varPattern);
  for (const match of allMatches) {
    if (match[0].endsWith('$')) {
      isStringVar = true;
    } else if (match[0].endsWith('%')) {
      isIntegerVar = true;
    }
  }
  
  // Check if it's an array (followed by parentheses)
  const arrayPattern = new RegExp(`\\b${word.replace(/[$%]$/, '')}\\s*\\(`, 'g');
  isArray = arrayPattern.test(fullLine);
  
  if (isStringVar || isIntegerVar || isArray) {
    let type = 'Variable';
    if (isArray) {
      type = 'Array';
    } else if (isStringVar) {
      type = 'String variable ($)';
    } else if (isIntegerVar) {
      type = 'Integer variable (%)';
    } else {
      type = 'Numeric variable';
    }
    
    return {
      contents: {
        kind: 'markdown',
        value: `**${word}**\n\nType: ${type}`
      }
    };
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

  // Check for command signatures (PRINT, INPUT, FOR, DIM, etc.)
  const commandMatch = text.match(/^\s*(\d+\s+)?(\w+)(?:\s+|$)/);
  if (commandMatch) {
    const commandName = commandMatch[2].toUpperCase();
    const commandSignature = getCommandSignatureInfo(commandName);
    if (commandSignature) {
      return {
        signatures: [commandSignature],
        activeSignature: 0,
        activeParameter: 0
      };
    }
  }

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
    // Control flow
    'PRINT': 'Print text, numbers, or expressions to the screen\n\n**Syntax:**\n```\nPRINT [TAB(x);] expression [; expression]...\n```\n\n**Examples:**\n```\nPRINT \"HELLO\"\nPRINT A; B; C\nPRINT TAB(10); \"Column 10\"\n```',
    'LET': 'Assign a value to a variable\n\n**Syntax:**\n```\n[LET] variable = expression\n```\n\nThe LET keyword is optional. Variables can be:\n- Numeric: A, X1, MY_VAR\n- String: A$, STR$, NAME$\n- Integer: I%, J%, COUNTER%',
    'IF': 'Conditional statement execution\n\n**Syntax:**\n```\nIF condition THEN statement [ELSE statement]\n```\n\n**Example:**\n```\nIF X > 10 THEN PRINT \"Large\"\nIF X > 10 THEN PRINT \"Large\" ELSE PRINT \"Small\"\n```',
    'THEN': 'Used with IF to specify the action when condition is true\n\n**Example:**\n```\nIF A = 5 THEN PRINT \"Five\"\n```',
    'ELSE': 'Specifies alternative action when IF condition is false\n\n**Example:**\n```\nIF A > 0 THEN PRINT \"Positive\" ELSE PRINT \"Not positive\"\n```',
    'FOR': 'Start a FOR loop\n\n**Syntax:**\n```\nFOR variable = start TO end [STEP step]\n...\nNEXT [variable]\n```\n\n**Example:**\n```\nFOR I = 1 TO 10\n  PRINT I\nNEXT I\n```',
    'TO': 'Specifies the end value in a FOR loop\n\n**Syntax:**\n```\nFOR variable = start TO end\n```',
    'STEP': 'Specifies the increment in a FOR loop\n\n**Syntax:**\n```\nFOR I = 1 TO 10 STEP 2\n```\n\nDefault STEP is 1. Can be negative.',
    'NEXT': 'End of a FOR loop\n\n**Syntax:**\n```\nNEXT [variable]\n```\n\n**Example:**\n```\nFOR I = 1 TO 10\n  PRINT I\nNEXT I\n```',
    'GOTO': 'Jump to a specific line number\n\n**Syntax:**\n```\nGOTO line_number\n```\n\n**Example:**\n```\nGOTO 100\n```\n\nAlso written as GO TO.',
    'GO TO': 'Jump to a specific line number\n\n**Syntax:**\n```\nGO TO line_number\n```',
    'GOSUB': 'Call a subroutine at a line number\n\n**Syntax:**\n```\nGOSUB line_number\n```\n\nUse RETURN to return from the subroutine.',
    'GO SUB': 'Call a subroutine at a line number\n\n**Syntax:**\n```\nGO SUB line_number\n```',
    'RETURN': 'Return from a GOSUB subroutine\n\n**Syntax:**\n```\nRETURN\n```',
    'STOP': 'Stop program execution\n\n**Syntax:**\n```\nSTOP\n```\n\nCan be resumed with CONTINUE.',
    'END': 'End program execution\n\n**Syntax:**\n```\nEND\n```',
    'CONTINUE': 'Continue execution after STOP\n\n**Syntax:**\n```\nCONTINUE\n```',
    'RUN': 'Run a program\n\n**Syntax:**\n```\nRUN [line_number]\n```\n\nStarts from beginning or specified line.',
    
    // Input/Output
    'INPUT': 'Read input from keyboard\n\n**Syntax:**\n```\nINPUT [\"prompt\"; ] variable\n```\n\n**Example:**\n```\nINPUT \"Enter name: \"; name$\nINPUT \"Age: \"; age\n```',
    'REM': 'Comment/remark - ignored during execution\n\n**Syntax:**\n```\nREM comment text\n```\n\n**Example:**\n```\nREM This is a comment\n```',
    
    // Data handling
    'READ': 'Read values from DATA statements\n\n**Syntax:**\n```\nREAD variable [, variable]...\n```\n\n**Example:**\n```\nREAD a, b, c$\n```',
    'DATA': 'Define data to be read by READ statements\n\n**Syntax:**\n```\nDATA value [, value]...\n```\n\n**Example:**\n```\nDATA 10, 20, \"Hello\"\n```',
    'RESTORE': 'Reset DATA pointer to beginning\n\n**Syntax:**\n```\nRESTORE [line_number]\n```',
    'DIM': 'Declare array dimensions\n\n**Syntax:**\n```\nDIM array(size [, size]...)\n```\n\n**Example:**\n```\nDIM a(10)\nDIM matrix(5, 5)\nDIM names$(100)\n```',
    
    // Screen control
    'CLS': 'Clear the screen\n\n**Syntax:**\n```\nCLS\n```',
    'PLOT': 'Plot a pixel at coordinates\n\n**Syntax:**\n```\nPLOT x, y\n```\n\n**Example:**\n```\nPLOT 128, 96\n```\n\nCoordinates: X: 0-255, Y: 0-175',
    'DRAW': 'Draw a line from current position\n\n**Syntax:**\n```\nDRAW x, y [, angle]\n```\n\n**Example:**\n```\nDRAW 50, 50\n```\n\nCoordinates are relative to current position.',
    'CIRCLE': 'Draw a circle\n\n**Syntax:**\n```\nCIRCLE x, y, radius\n```\n\n**Example:**\n```\nCIRCLE 128, 88, 50\n```',
    'INK': 'Set foreground (text) color\n\n**Syntax:**\n```\nINK color\n```\n\n**Colors:** 0=black, 1=blue, 2=red, 3=magenta, 4=green, 5=cyan, 6=yellow, 7=white',
    'PAPER': 'Set background color\n\n**Syntax:**\n```\nPAPER color\n```\n\n**Colors:** 0=black, 1=blue, 2=red, 3=magenta, 4=green, 5=cyan, 6=yellow, 7=white',
    'BORDER': 'Set border color\n\n**Syntax:**\n```\nBORDER color\n```\n\n**Colors:** 0-7',
    'FLASH': 'Set flashing attribute\n\n**Syntax:**\n```\nFLASH 0 or FLASH 1\n```\n\n0 = off, 1 = on',
    'BRIGHT': 'Set bright attribute\n\n**Syntax:**\n```\nBRIGHT 0 or BRIGHT 1\n```\n\n0 = normal, 1 = bright',
    'INVERSE': 'Set inverse video attribute\n\n**Syntax:**\n```\nINVERSE 0 or INVERSE 1\n```\n\n0 = normal, 1 = inverse',
    'OVER': 'Set overprint mode\n\n**Syntax:**\n```\nOVER 0 or OVER 1\n```\n\n0 = normal, 1 = XOR with existing',
    
    // Memory and system
    'POKE': 'Write a byte to memory address\n\n**Syntax:**\n```\nPOKE address, value\n```\n\n**Example:**\n```\nPOKE 23296, 0\n```',
    'PEEK': 'Read a byte from memory\n\n**Syntax:**\n```\nPEEK(address) -> number\n```\n\n**Example:**\n```\nLET ATTR = PEEK(22528)\nREM Read screen attributes\n```',
    'CLEAR': 'Clear variables and set memory limit\n\n**Syntax:**\n```\nCLEAR [address]\n```',
    'NEW': 'Delete program and clear all variables\n\n**Syntax:**\n```\nNEW\n```',
    'RANDOMIZE': 'Seed random number generator\n\n**Syntax:**\n```\nRANDOMIZE [seed]\n```\n\nWith no seed, uses timer.',
    'USR': 'Call machine code routine\n\n**Syntax:**\n```\nUSR address\n```',
    
    // Sound
    'BEEP': 'Make a beep sound\n\n**Syntax:**\n```\nBEEP duration, pitch\n```\n\n**Example:**\n```\nBEEP 0.5, 0\n```\n\nDuration in seconds, pitch in semitones from middle C.',
    'PLAY': 'Play music (128K only)\n\n**Syntax:**\n```\nPLAY string\n```\n\n**Example:**\n```\nPLAY \"cdefgab\"\n```',
    
    // File operations
    'SAVE': 'Save program or data to tape\n\n**Syntax:**\n```\nSAVE \"filename\"\nSAVE \"filename\" LINE start\nSAVE \"filename\" CODE start, length\nSAVE \"filename\" SCREEN$\n```',
    'LOAD': 'Load program or data from tape\n\n**Syntax:**\n```\nLOAD \"filename\"\nLOAD \"\" CODE\nLOAD \"\" SCREEN$\n```',
    'VERIFY': 'Verify saved data\n\n**Syntax:**\n```\nVERIFY \"filename\"\n```',
    'MERGE': 'Merge program from tape\n\n**Syntax:**\n```\nMERGE \"filename\"\n```',
    'LIST': 'List program lines\n\n**Syntax:**\n```\nLIST [start] [, end]\n```',
    'LLIST': 'List to printer (128K)\n\n**Syntax:**\n```\nLLIST [start] [, end]\n```',
    'LPRINT': 'Print to printer (128K)\n\n**Syntax:**\n```\nLPRINT expression\n```',
    'COPY': 'Copy screen to printer\n\n**Syntax:**\n```\nCOPY\n```',
    
    // Other
    'PAUSE': 'Pause execution\n\n**Syntax:**\n```\nPAUSE frames\n```\n\n**Example:**\n```\nPAUSE 50  REM Pause for 1 second\nPAUSE 0   REM Wait for key press\n```',
    'OUT': 'Output to I/O port\n\n**Syntax:**\n```\nOUT port, value\n```',
    
    // Math functions
    'SIN': 'Calculate the sine of an angle (in radians)\n\n**Syntax:**\n```\nSIN(angle) -> number\n```\n\n**Example:**\n```\nLET Y = SIN(3.14159 / 2)\nREM Y will be approximately 1\n```',
    'COS': 'Calculate the cosine of an angle (in radians)\n\n**Syntax:**\n```\nCOS(angle) -> number\n```',
    'TAN': 'Calculate the tangent of an angle (in radians)\n\n**Syntax:**\n```\nTAN(angle) -> number\n```',
    'ASN': 'Arc sine (inverse sine)\n\n**Syntax:**\n```\nASN(x) -> number\n```\n\nReturns angle in radians. x must be -1 to 1.',
    'ACS': 'Arc cosine (inverse cosine)\n\n**Syntax:**\n```\nACS(x) -> number\n```\n\nReturns angle in radians. x must be -1 to 1.',
    'ATN': 'Arc tangent (inverse tangent)\n\n**Syntax:**\n```\nATN(x) -> number\n```\n\nReturns angle in radians.',
    'ABS': 'Return the absolute value (remove sign)\n\n**Syntax:**\n```\nABS(number) -> number\n```',
    'INT': 'Return the integer part (floor function)\n\n**Syntax:**\n```\nINT(number) -> number\n```',
    'SQR': 'Return the square root\n\n**Syntax:**\n```\nSQR(number) -> number\n```',
    'SGN': 'Return the sign of a number\n\n**Syntax:**\n```\nSGN(number) -> number\n```\n\nReturns -1 for negative, 0 for zero, 1 for positive.',
    'EXP': 'Return e raised to a power\n\n**Syntax:**\n```\nEXP(x) -> number\n```',
    'LN': 'Return natural logarithm\n\n**Syntax:**\n```\nLN(x) -> number\n```',
    'RND': 'Return a random number between 0 and 1\n\n**Syntax:**\n```\nRND -> number\n```\n\nUse with RANDOMIZE to seed.',
    'PI': 'Return the value of π (pi)\n\n**Syntax:**\n```\nPI -> number\n```\n\nReturns approximately 3.14159265.',
    
    // String functions
    'LEN': 'Return the length of a string\n\n**Syntax:**\n```\nLEN(string) -> number\n```\n\n**Example:**\n```\nLET L = LEN(\"HELLO\")\nREM L is 5\n```',
    'VAL': 'Convert a string to a numeric value\n\n**Syntax:**\n```\nVAL(string) -> number\n```\n\n**Example:**\n```\nLET N = VAL(\"123.45\")\nREM N is 123.45\n```',
    'VAL$': 'Convert string to number (128K)\n\n**Syntax:**\n```\nVAL$(string) -> number\n```',
    'STR$': 'Convert a number to a string\n\n**Syntax:**\n```\nSTR$(number) -> string\n```',
    'CHR$': 'Return the character for an ASCII code\n\n**Syntax:**\n```\nCHR$(code) -> string\n```',
    'CODE': 'Return the ASCII code of the first character\n\n**Syntax:**\n```\nCODE(string) -> number\n```',
    'INKEY$': 'Read the last key pressed\n\n**Syntax:**\n```\nINKEY$ -> string\n```\n\nReturns empty string if no key was pressed.',
    'SCREEN$': 'Return character at screen position\n\n**Syntax:**\n```\nSCREEN$(line, column) -> string\n```',
    
    // Screen functions
    'ATTR': 'Return attribute at screen position\n\n**Syntax:**\n```\nATTR(line, column) -> number\n```',
    'POINT': 'Test if pixel is set\n\n**Syntax:**\n```\nPOINT(x, y) -> number\n```\n\nReturns 1 if pixel is set, 0 otherwise.',
    
    // Logical operators
    'AND': 'Logical AND operator\n\n```\ncondition1 AND condition2\n```\n\nTrue only if both conditions are true.',
    'OR': 'Logical OR operator\n\n```\ncondition1 OR condition2\n```\n\nTrue if either condition is true.',
    'NOT': 'Logical NOT operator\n\n```\nNOT condition\n```\n\nReverses the truth value.',
    
    // 128K specific
    'SPECTRUM': 'Switch 128K ROM mode\n\n**Syntax:**\n```\nSPECTRUM\n```',
    'CAT': 'Catalog disk directory (128K)\n\n**Syntax:**\n```\nCAT\n```',
    'ERASE': 'Delete file (128K)\n\n**Syntax:**\n```\nERASE \"filename\"\n```',
    'FORMAT': 'Format disk (128K/Interface 1)\n\n**Syntax:**\n```\nFORMAT \"name\"\n```',
    'MOVE': 'Move file (128K)\n\n**Syntax:**\n```\nMOVE \"from\" TO \"to\"\n```',
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

// Get signature help for commands (PRINT, INPUT, FOR, etc.)
function getCommandSignatureInfo(commandName: string): SignatureInformation | undefined {
  const commandSignatures: { [key: string]: SignatureInformation } = {
    'PRINT': {
      label: 'PRINT [AT line,col;] expression [; expression]...',
      documentation: 'Print text or expressions to the screen. Use ; for no spacing, , for spacing',
      parameters: [
        { label: 'expression', documentation: 'String or numeric expression to print' }
      ]
    },
    'INPUT': {
      label: 'INPUT ["prompt";] variable [, variable]...',
      documentation: 'Read keyboard input into variables',
      parameters: [
        { label: 'variable', documentation: 'Variable to receive input' }
      ]
    },
    'FOR': {
      label: 'FOR variable = start TO end [STEP step]',
      documentation: 'Begin a FOR loop. Must end with NEXT variable',
      parameters: [
        { label: 'variable', documentation: 'Loop control variable' },
        { label: 'start', documentation: 'Starting value' },
        { label: 'end', documentation: 'Ending value' }
      ]
    },
    'DIM': {
      label: 'DIM array(size [, size [, size]])',
      documentation: 'Dimension an array (max 3 dimensions in ZX BASIC)',
      parameters: [
        { label: 'array', documentation: 'Array name' },
        { label: 'size', documentation: 'Dimension size (can be 1, 2, or 3 dimensions)' }
      ]
    },
    'IF': {
      label: 'IF condition THEN statement',
      documentation: 'Conditional execution (single statement only)',
      parameters: [
        { label: 'condition', documentation: 'Boolean expression' },
        { label: 'statement', documentation: 'Statement to execute if true' }
      ]
    },
    'PLOT': {
      label: 'PLOT x, y',
      documentation: 'Plot a pixel at screen coordinates',
      parameters: [
        { label: 'x', documentation: 'X coordinate (0-255)' },
        { label: 'y', documentation: 'Y coordinate (0-175)' }
      ]
    },
    'DRAW': {
      label: 'DRAW x [, y]',
      documentation: 'Draw a line from current position',
      parameters: [
        { label: 'x', documentation: 'Relative X distance' },
        { label: 'y', documentation: 'Relative Y distance (optional)' }
      ]
    },
    'BEEP': {
      label: 'BEEP duration, pitch',
      documentation: 'Make a beeping sound',
      parameters: [
        { label: 'duration', documentation: 'Duration in 1/50ths second' },
        { label: 'pitch', documentation: 'Pitch (frequency)' }
      ]
    },
    'CIRCLE': {
      label: 'CIRCLE x, y, radius',
      documentation: 'Draw a circle',
      parameters: [
        { label: 'x', documentation: 'Center X coordinate' },
        { label: 'y', documentation: 'Center Y coordinate' },
        { label: 'radius', documentation: 'Circle radius' }
      ]
    },
    'READ': {
      label: 'READ variable [, variable]...',
      documentation: 'Read values from DATA statements',
      parameters: [
        { label: 'variable', documentation: 'Variable to receive data' }
      ]
    },
    'DATA': {
      label: 'DATA constant [, constant]...',
      documentation: 'Define data values for READ statements',
      parameters: [
        { label: 'constant', documentation: 'Numeric or string constant' }
      ]
    },
    'GOSUB': {
      label: 'GOSUB line_number',
      documentation: 'Call a subroutine (must end with RETURN)',
      parameters: [
        { label: 'line_number', documentation: 'Subroutine line number' }
      ]
    },
    'GOTO': {
      label: 'GOTO line_number',
      documentation: 'Jump unconditionally to a line number',
      parameters: [
        { label: 'line_number', documentation: 'Target line number' }
      ]
    },
    'POKE': {
      label: 'POKE address, value',
      documentation: 'Write a byte to memory',
      parameters: [
        { label: 'address', documentation: 'Memory address (0-65535)' },
        { label: 'value', documentation: 'Byte value (0-255)' }
      ]
    },
    'LET': {
      label: 'LET variable = expression',
      documentation: 'Assign a value to a variable (LET can be omitted)',
      parameters: [
        { label: 'variable', documentation: 'Variable name' },
        { label: 'expression', documentation: 'Value to assign' }
      ]
    },
    'INK': {
      label: 'INK colour',
      documentation: 'Set text colour (0-7, or 8=no change, 9=inverse)',
      parameters: [
        { label: 'colour', documentation: 'Colour code' }
      ]
    },
    'PAPER': {
      label: 'PAPER colour',
      documentation: 'Set background colour (0-7, or 8=no change, 9=inverse)',
      parameters: [
        { label: 'colour', documentation: 'Colour code' }
      ]
    },
    'BORDER': {
      label: 'BORDER colour',
      documentation: 'Set border colour (0-7)',
      parameters: [
        { label: 'colour', documentation: 'Colour code' }
      ]
    },
  };

  return commandSignatures[commandName.toUpperCase()];
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
  const defFnFunctions = new Map<string, Token>();
  const variableDefinitions = new Map<string, Token>();

  // First pass: collect all line numbers, DEF FN functions, and variable assignments
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.LINE_NUMBER) {
      currentLineNumber = token.value;
      lineNumberToken = token;
      lineNumbers.set(currentLineNumber, { token, hasGosub: false });
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DEF FN') {
      // Next identifier is the function name
      if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.IDENTIFIER) {
        const fnName = tokens[i + 1].value;
        defFnFunctions.set(fnName, tokens[i + 1]);
      }
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'LET') {
      // Variable assignment: LET varname = ...
      if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.IDENTIFIER) {
        const varName = tokens[i + 1].value.replace(/[$%]$/, ''); // Remove type suffix
        if (!variableDefinitions.has(varName)) {
          variableDefinitions.set(varName, tokens[i + 1]);
        }
      }
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'GOSUB') {
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

  // Create symbols for line numbers
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

  // Create symbols for DEF FN functions
  defFnFunctions.forEach((token, fnName) => {
    const range: Range = {
      start: { line: token.line, character: token.start },
      end: { line: token.line, character: token.end }
    };

    symbols.push({
      name: `${fnName}() [DEF FN]`,
      kind: SymbolKind.Function,
      range: range,
      selectionRange: range
    });
  });

  // Create symbols for variables (optional - only show if enabled or limited)
  // Show only first 20 variables to avoid cluttering the outline
  const variablesToShow = Array.from(variableDefinitions.entries()).slice(0, 20);
  variablesToShow.forEach(([varName, token]) => {
    const range: Range = {
      start: { line: token.line, character: token.start },
      end: { line: token.line, character: token.end }
    };

    symbols.push({
      name: `${varName} [variable]`,
      kind: SymbolKind.Variable,
      range: range,
      selectionRange: range
    });
  });

  // Sort symbols: line numbers first, then DEF FN, then variables
  symbols.sort((a, b) => {
    // Extract sort priorities
    const aIsSub = a.name.includes('subroutine');
    const bIsSub = b.name.includes('subroutine');
    const aIsDefFn = a.name.includes('DEF FN');
    const bIsDefFn = b.name.includes('DEF FN');
    const aIsVar = a.name.includes('variable');
    const bIsVar = b.name.includes('variable');

    // Sort by: line numbers, subroutines, DEF FN, variables
    if (aIsVar && !bIsVar) return 1;
    if (!aIsVar && bIsVar) return -1;
    if (aIsDefFn && !bIsDefFn && !aIsSub && !bIsSub) return 1;
    if (!aIsDefFn && bIsDefFn && !aIsSub && !bIsSub) return -1;
    if (aIsSub && !bIsSub) return -1;
    if (!aIsSub && bIsSub) return 1;

    // Sort line numbers numerically
    const aNum = parseInt(a.name.split(' ')[0]);
    const bNum = parseInt(b.name.split(' ')[0]);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    // Alphabetically for others
    return a.name.localeCompare(b.name);
  });

  return symbols;
});

// Go to Declaration Provider - jump to variable declarations or line numbers
connection.onDeclaration((params: DeclarationParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const context = getRenameContext(text, params.position);
  if (!context) {
    return null;
  }
  if (context.isLineNumber) {
    const range = findLineNumberDefinitionRange(text, context.oldName);
    if (!range) {
      return null;
    }
    return Location.create(params.textDocument.uri, range);
  }

  const range = findDeclarationRange(text, context.oldName);
  if (!range) {
    return null;
  }

  return Location.create(params.textDocument.uri, range);
});

connection.onTypeDefinition((params: TypeDefinitionParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const context = getRenameContext(text, params.position);

  if (context && !context.isLineNumber) {
    const range = findDeclarationRange(text, context.oldName);
    if (range) {
      return Location.create(params.textDocument.uri, range);
    }
  }

  if (context?.isLineNumber) {
    const lineRange = findLineNumberDefinitionRange(text, context.oldName);
    if (lineRange) {
      return Location.create(params.textDocument.uri, lineRange);
    }
    return null;
  }

  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const referenceRange = findLineNumberReferenceRangeFromTokens(tokens, params.position);
  if (referenceRange) {
    return Location.create(params.textDocument.uri, referenceRange);
  }

  return null;
});

connection.onImplementation((params: ImplementationParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const context = getRenameContext(text, params.position);
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  if (context && !context.isLineNumber) {
    const range = findDeclarationRange(text, context.oldName);
    if (range) {
      return Location.create(params.textDocument.uri, range);
    }
  }

  if (context?.isLineNumber) {
    const definitionRange = findLineNumberDefinitionRangeFromTokens(tokens, context.oldName);
    if (definitionRange) {
      return Location.create(params.textDocument.uri, definitionRange);
    }
  }

  const referenceRange = findLineNumberReferenceRangeFromTokens(tokens, params.position);
  if (referenceRange) {
    return Location.create(params.textDocument.uri, referenceRange);
  }

  return null;
});

// Go to Definition Provider - jump to line numbers or variable declarations
connection.onDefinition((params: DefinitionParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const context = getRenameContext(text, params.position);

  if (context && !context.isLineNumber) {
    const range = findDeclarationRange(text, context.oldName);
    if (range) {
      return Location.create(params.textDocument.uri, range);
    }
  }

  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const lineRange = findLineNumberReferenceRangeFromTokens(tokens, params.position);
  if (lineRange) {
    return Location.create(params.textDocument.uri, lineRange);
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
  const referenceMap = buildLineReferenceMap(tokens);
  const seen = new Set<string>();
  const pushLocation = (range: Range | null | undefined) => {
    if (!range) {
      return;
    }
    const key = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    locations.push(Location.create(params.textDocument.uri, range));
  };

  const context = getRenameContext(text, params.position);

  if (context && !context.isLineNumber) {
    if (params.context.includeDeclaration) {
      const declarationRange = findDeclarationRange(text, context.oldName);
      pushLocation(declarationRange);
    }

    const identifierRanges = findIdentifierReferenceRanges(tokens, context.oldName);
    identifierRanges.forEach(pushLocation);
    return locations;
  }

  // Find the token at cursor
  const position = params.position;
  const adjustedCharacter = position.character + (position.line > 0 ? 1 : 0);
  let targetToken: Token | null = null;

  for (const token of tokens) {
    if (token.line === position.line &&
        adjustedCharacter >= token.start &&
        adjustedCharacter < token.end) {
      targetToken = token;
      break;
    }
  }

  if (!targetToken) {
    return [];
  }

  let targetLineNum: string | null = null;
  let includeDefinition = params.context.includeDeclaration;

  if (targetToken.type === TokenType.LINE_NUMBER) {
    targetLineNum = targetToken.value;
  } else if (targetToken.type === TokenType.NUMBER) {
    const referenceRange = findLineNumberReferenceRangeFromTokens(tokens, position);
    if (!referenceRange) {
      return [];
    }
    targetLineNum = targetToken.value;
    includeDefinition = true;
  } else {
    return [];
  }

  if (includeDefinition && targetLineNum) {
    const definitionRange = findLineNumberDefinitionRangeFromTokens(tokens, targetLineNum);
    pushLocation(definitionRange);
  }

  // Find all references to this line number
  const referencingTokens = targetLineNum ? referenceMap.get(targetLineNum) ?? [] : [];
  for (const refToken of referencingTokens) {
    const range: Range = {
      start: { line: refToken.line, character: refToken.start },
      end: { line: refToken.line, character: refToken.end }
    };
    pushLocation(range);
  }

  return locations;
});

connection.onCodeLens((params: CodeLensParams): CodeLens[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const referenceMap = buildLineReferenceMap(tokens);
  const lenses: CodeLens[] = [];

  for (const token of tokens) {
    if (token.type !== TokenType.LINE_NUMBER) {
      continue;
    }

    const references = referenceMap.get(token.value) ?? [];
    if (references.length === 0) {
      continue;
    }

    const definitionRange: Range = {
      start: { line: token.line, character: token.start },
      end: { line: token.line, character: token.end }
    };

    const locations = references.map(referenceToken => {
      const range: Range = {
        start: { line: referenceToken.line, character: referenceToken.start },
        end: { line: referenceToken.line, character: referenceToken.end }
      };
      return Location.create(params.textDocument.uri, range);
    });

    lenses.push({
      range: definitionRange,
      command: {
        title: references.length === 1 ? '1 reference' : `${references.length} references`,
        command: 'zx-basic.showReferences',
        arguments: [
          params.textDocument.uri,
          definitionRange.start,
          locations
        ]
      }
    });
  }

  return lenses;
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

  // Check for GOSUB without matching RETURN
  const gosubLines: Array<{ line: number; lineNum: string }> = [];
  const returnLines = new Set<number>();
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === TokenType.KEYWORD) {
      if (token.value === 'GOSUB') {
        // Get line number for context
        let lineNum = '';
        for (let j = i - 1; j >= 0; j--) {
          if (tokens[j].type === TokenType.LINE_NUMBER) {
            lineNum = tokens[j].value;
            break;
          }
        }
        gosubLines.push({ line: token.line, lineNum });
      } else if (token.value === 'RETURN') {
        returnLines.add(token.line);
      }
    }
  }

  // Offer to add RETURN at end of subroutine if GOSUB exists but no RETURN
  if (gosubLines.length > 0 && returnLines.size === 0) {
    const lastLine = lines.length - 1;
    actions.push({
      title: 'Add RETURN statement at end of subroutine',
      kind: CodeActionKind.QuickFix,
      edit: {
        changes: {
          [params.textDocument.uri]: [{
            range: {
              start: { line: lastLine, character: lines[lastLine].length },
              end: { line: lastLine, character: lines[lastLine].length }
            },
            newText: '\nRETURN'
          }]
        }
      }
    });
  }

  // Check for FOR without matching NEXT
  const forLines: Array<{ line: number; variable: string }> = [];
  const nextLines = new Set<number>();
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === TokenType.KEYWORD) {
      if (token.value === 'FOR' && i + 1 < tokens.length && tokens[i + 1].type === TokenType.IDENTIFIER) {
        forLines.push({ line: token.line, variable: tokens[i + 1].value });
      } else if (token.value === 'NEXT') {
        nextLines.add(token.line);
      }
    }
  }

  // Offer to add NEXT at end if FOR exists but no NEXT
  if (forLines.length > 0 && nextLines.size === 0 && forLines.length > 0) {
    const lastFor = forLines[forLines.length - 1];
    const lastLine = lines.length - 1;
    actions.push({
      title: `Add NEXT ${lastFor.variable} statement at end`,
      kind: CodeActionKind.QuickFix,
      edit: {
        changes: {
          [params.textDocument.uri]: [{
            range: {
              start: { line: lastLine, character: lines[lastLine].length },
              end: { line: lastLine, character: lines[lastLine].length }
            },
            newText: `\nNEXT ${lastFor.variable}`
          }]
        }
      }
    });
  }

  // Check for undeclared arrays (array usage without DIM)
  const declaredArrays = new Set<string>();
  const usedArrays = new Map<string, Token>();

  // First pass: collect declared arrays from DIM statements
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DIM') {
      // Extract array names from DIM declaration
      i++;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR && tokens[i].type !== TokenType.EOF) {
        if (tokens[i].type === TokenType.IDENTIFIER && i + 1 < tokens.length && tokens[i + 1].value === '(') {
          const arrayName = tokens[i].value.replace(/[$%]$/, '');
          declaredArrays.add(arrayName.toUpperCase());
        }
        i++;
      }
    }
  }

  // Second pass: find array usage
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === TokenType.IDENTIFIER && i + 1 < tokens.length && tokens[i + 1].value === '(') {
      const arrayName = token.value.replace(/[$%]$/, '');
      if (!declaredArrays.has(arrayName.toUpperCase())) {
        usedArrays.set(arrayName.toUpperCase(), token);
      }
    }
  }

  // Offer to add DIM for undeclared arrays
  if (usedArrays.size > 0) {
    const undeclaredArrayNames = Array.from(usedArrays.keys()).slice(0, 5); // Limit to first 5
    const dimStatement = undeclaredArrayNames.map(name => `${name}(10)`).join(', ');
    
    actions.push({
      title: `Add DIM statement for undeclared array${undeclaredArrayNames.length > 1 ? 's' : ''}: ${undeclaredArrayNames.join(', ')}`,
      kind: CodeActionKind.QuickFix,
      edit: {
        changes: {
          [params.textDocument.uri]: [{
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 }
            },
            newText: `10 DIM ${dimStatement}\n`
          }]
        }
      }
    });
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
    connection.console.log(`[format] No document found for ${params.textDocument.uri}`);
    return [];
  }

  connection.console.log(`[format] Received format request for ${params.textDocument.uri}`);
  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  const edits: TextEdit[] = [];

  // First pass: auto-renumber lines
  const { edits: renumberEdits, touchedLines } = autoRenumberLines(document);
  connection.console.log(`[format] autoRenumberLines produced ${renumberEdits.length} edits for ${params.textDocument.uri}`);
  edits.push(...renumberEdits);

  // Second pass: format each line (spacing, uppercase, etc.)
  let currentLine = -1;
  let lineTokens: Token[] = [];

  for (const token of tokens) {
    if (token.line !== currentLine && currentLine >= 0) {
      // Process previous line
      if (!touchedLines.has(currentLine)) {
        const formatted = formatLine(lineTokens, document);
        if (formatted) {
          edits.push(formatted);
        }
      }
      lineTokens = [];
    }
    currentLine = token.line;
    if (token.type !== TokenType.EOF) {
      lineTokens.push(token);
    }
  }

  // Process last line
  if (lineTokens.length > 0 && !touchedLines.has(currentLine)) {
    const formatted = formatLine(lineTokens, document);
    if (formatted) {
      edits.push(formatted);
    }
  }

  connection.console.log(`[format] Returning ${edits.length} total edits for ${params.textDocument.uri}`);
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

// Helper function to auto-renumber lines
type RenumberResult = {
  edits: TextEdit[];
  touchedLines: Set<number>;
};

function autoRenumberLines(document: TextDocument): RenumberResult {
  connection.console.log(`[renumber] Starting renumber pass for ${document.uri}`);
  const edits: TextEdit[] = [];
  const touchedLines = new Set<number>();
  const text = document.getText();
  const lines = text.split('\n');
  
  // Build a mapping of old line numbers to new line numbers
  const lineNumberMap = new Map<string, string>();
  let lineNum = 10;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Check if line already has a line number
    const match = line.match(/^(\d+)\s+/);
    if (match) {
      const oldLineNum = match[1];
      lineNumberMap.set(oldLineNum, lineNum.toString());
    }
    
    lineNum += 10;
  }

  connection.console.log(`[renumber] Mapped ${lineNumberMap.size} existing line numbers for ${document.uri}`);

  // Now apply the renumbering with GOTO/GOSUB target updates
  lineNum = 10;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Check if line already has a line number
    const match = line.match(/^(\d+)\s+/);
    let newLine = line;
    
    if (match) {
      const oldLineNum = match[1];
      
      // Only update if line number doesn't match expected
      if (oldLineNum !== lineNum.toString()) {
        // Replace line number
        newLine = line.replace(/^\d+\s+/, `${lineNum} `);
      }
    } else {
      // Add line number to lines without one
      newLine = `${lineNum} ${line}`;
    }

    // Now update GOTO/GOSUB targets in this line
    for (const [oldNum, newNum] of lineNumberMap.entries()) {
      // Match GOTO or GOSUB followed by the line number (with word boundaries and spaces)
      const goSubPattern = new RegExp(`\\b(GOTO|GO\\s+TO|GOSUB|GO\\s+SUB)\\s+${oldNum}\\b`, 'gi');
      newLine = newLine.replace(goSubPattern, (match, keyword) => {
        // Preserve the keyword format (GOTO vs GO TO)
        if (keyword.toUpperCase() === 'GOTO' || keyword.toUpperCase().replace(/\s+/g, '') === 'GOTO') {
          return `GOTO ${newNum}`;
        } else {
          return `GOSUB ${newNum}`;
        }
      });
    }
    
    // Only add edit if content changed
    if (newLine !== line) {
      touchedLines.add(i);
      edits.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length }
        },
        newText: newLine
      });
    }
    
    lineNum += 10;
  }

  connection.console.log(`[renumber] Produced ${edits.length} renumber edits for ${document.uri}`);
  return { edits, touchedLines };
}

// Semantic tokens provider for syntax highlighting
connection.languages.semanticTokens.on(async (params: SemanticTokensParams): Promise<SemanticTokens> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { data: [] };
  }

  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  
  const data: number[] = [];
  let lastLine = 0;
  let lastChar = 0;

  // Track variables and line numbers
  const definedVariables = new Set<string>();
  const definedLineNumbers = new Set<string>();
  const usedVariables = new Set<string>();
  const undefinedVariables = new Set<string>();
  
  // First pass: collect defined items
  for (const token of tokens) {
    if (token.type === TokenType.LINE_NUMBER) {
      definedLineNumbers.add(token.value);
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'LET') {
      // Next identifier after LET is a variable definition
      const idx = tokens.indexOf(token);
      if (idx + 1 < tokens.length && tokens[idx + 1].type === TokenType.IDENTIFIER) {
        const varName = tokens[idx + 1].value.replace(/[$%]$/, '');
        definedVariables.add(varName);
      }
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DIM') {
      // Identifiers after DIM are array declarations
      let i = tokens.indexOf(token) + 1;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR) {
        if (tokens[i].type === TokenType.IDENTIFIER) {
          const arrName = tokens[i].value.replace(/[$%]$/, '');
          definedVariables.add(arrName);
        }
        i++;
      }
    } else if (token.type === TokenType.KEYWORD && (token.value.toUpperCase() === 'INPUT' || token.value.toUpperCase() === 'READ')) {
      // Identifiers after INPUT/READ are variable assignments
      const idx = tokens.indexOf(token);
      let i = idx + 1;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR) {
        if (tokens[i].type === TokenType.IDENTIFIER) {
          const varName = tokens[i].value.replace(/[$%]$/, '');
          definedVariables.add(varName);
        }
        i++;
      }
    }
  }

  // Generate semantic tokens
  for (const token of tokens) {
    // Skip all NUMBER tokens - let TextMate grammar handle numeric literals consistently
    if (token.type === TokenType.NUMBER) {
      continue;
    }
    
    if (token.type === TokenType.LINE_NUMBER) {
      // Skip line numbers - let TextMate grammar handle them for consistent coloring
      continue;
    } else if (token.type === TokenType.IDENTIFIER) {
      const varName = token.value.replace(/[$%]$/, '');
      let tokenType = 1; // variable (default)
      let modifier = 0;

      // Determine variable type and modifiers
      if (token.value.endsWith('$')) {
        tokenType = SEMANTIC.STRING_VARIABLE; // stringVariable
      } else if (token.value.endsWith('%')) {
        tokenType = SEMANTIC.NUMERIC_VARIABLE; // numericVariable
      }

      // Check if it's an array (next token is parenthesis)
      const tokenIdx = tokens.indexOf(token);
      if (tokenIdx + 1 < tokens.length && tokens[tokenIdx + 1].value === '(') {
        tokenType = SEMANTIC.ARRAY; // array
      }

      // Check if it's defined or undefined
      if (!definedVariables.has(varName)) {
        tokenType = SEMANTIC.UNDEFINED; // undefined
      }

      const deltaLine = token.line - lastLine;
      const deltaChar = deltaLine === 0 ? token.start - lastChar : token.start;
      
      data.push(deltaLine, deltaChar, token.value.length, tokenType, modifier);
      lastLine = token.line;
      lastChar = token.start + token.value.length;
    } else if (token.type === TokenType.KEYWORD) {
      const tokenType = SEMANTIC.KEYWORD; // keyword
      const modifier = 0;

      const deltaLine = token.line - lastLine;
      const deltaChar = deltaLine === 0 ? token.start - lastChar : token.start;
      
      data.push(deltaLine, deltaChar, token.value.length, tokenType, modifier);
      lastLine = token.line;
      lastChar = token.start + token.value.length;
    } else if (token.type === TokenType.COMMENT) {
      const tokenType = SEMANTIC.COMMENT; // comment
      const modifier = 0;

      const deltaLine = token.line - lastLine;
      const deltaChar = deltaLine === 0 ? token.start - lastChar : token.start;
      
      data.push(deltaLine, deltaChar, token.value.length, tokenType, modifier);
      lastLine = token.line;
      lastChar = token.start + token.value.length;
    }
  }

  return { data };
});

// Semantic tokens range provider
connection.languages.semanticTokens.onRange(async (params: SemanticTokensRangeParams): Promise<SemanticTokens> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { data: [] };
  }

  const text = document.getText();
  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);
  
  const data: number[] = [];
  let lastLine = 0;
  let lastChar = 0;

  // Track variables and line numbers
  const definedVariables = new Set<string>();
  const definedLineNumbers = new Set<string>();
  
  // First pass: collect defined items (same as full handler)
  for (const token of tokens) {
    if (token.type === TokenType.LINE_NUMBER) {
      definedLineNumbers.add(token.value);
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'LET') {
      const idx = tokens.indexOf(token);
      if (idx + 1 < tokens.length && tokens[idx + 1].type === TokenType.IDENTIFIER) {
        const varName = tokens[idx + 1].value.replace(/[$%]$/, '');
        definedVariables.add(varName);
      }
    } else if (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'DIM') {
      let i = tokens.indexOf(token) + 1;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR) {
        if (tokens[i].type === TokenType.IDENTIFIER) {
          const arrName = tokens[i].value.replace(/[$%]$/, '');
          definedVariables.add(arrName);
        }
        i++;
      }
    } else if (token.type === TokenType.KEYWORD && (token.value.toUpperCase() === 'INPUT' || token.value.toUpperCase() === 'READ')) {
      const idx = tokens.indexOf(token);
      let i = idx + 1;
      while (i < tokens.length && tokens[i].type !== TokenType.STATEMENT_SEPARATOR) {
        if (tokens[i].type === TokenType.IDENTIFIER) {
          const varName = tokens[i].value.replace(/[$%]$/, '');
          definedVariables.add(varName);
        }
        i++;
      }
    }
  }

  // Filter tokens within the requested range
  const rangeStart = params.range.start.line;
  const rangeEnd = params.range.end.line;

  // Generate semantic tokens only for the requested range
  for (const token of tokens) {
    // Skip tokens outside the range
    if (token.line < rangeStart || token.line > rangeEnd) {
      continue;
    }

    // Skip all NUMBER tokens - let TextMate grammar handle numeric literals consistently
    if (token.type === TokenType.NUMBER) {
      continue;
    }
    
    if (token.type === TokenType.LINE_NUMBER) {
      // Skip line numbers - let TextMate grammar handle them for consistent coloring
      continue;
    } else if (token.type === TokenType.IDENTIFIER) {
      const varName = token.value.replace(/[$%]$/, '');
      let tokenType = 1; // variable (default)
      let modifier = 0;

      if (token.value.endsWith('$')) {
        tokenType = SEMANTIC.STRING_VARIABLE; // stringVariable
      } else if (token.value.endsWith('%')) {
        tokenType = SEMANTIC.NUMERIC_VARIABLE; // numericVariable
      }

      const tokenIdx = tokens.indexOf(token);
      if (tokenIdx + 1 < tokens.length && tokens[tokenIdx + 1].value === '(') {
        tokenType = SEMANTIC.ARRAY; // array
      }

      if (!definedVariables.has(varName)) {
        tokenType = SEMANTIC.UNDEFINED; // undefined
      }

      const deltaLine = token.line - lastLine;
      const deltaChar = deltaLine === 0 ? token.start - lastChar : token.start;
      
      data.push(deltaLine, deltaChar, token.value.length, tokenType, modifier);
      lastLine = token.line;
      lastChar = token.start + token.value.length;
    } else if (token.type === TokenType.KEYWORD) {
    const tokenType = SEMANTIC.KEYWORD; // keyword
      const modifier = 0;

      const deltaLine = token.line - lastLine;
      const deltaChar = deltaLine === 0 ? token.start - lastChar : token.start;
      
      data.push(deltaLine, deltaChar, token.value.length, tokenType, modifier);
      lastLine = token.line;
      lastChar = token.start + token.value.length;
    } else if (token.type === TokenType.COMMENT) {
      const tokenType = SEMANTIC.COMMENT; // comment
      const modifier = 0;

      const deltaLine = token.line - lastLine;
      const deltaChar = deltaLine === 0 ? token.start - lastChar : token.start;
      
      data.push(deltaLine, deltaChar, token.value.length, tokenType, modifier);
      lastLine = token.line;
      lastChar = token.start + token.value.length;
    }
  }

  return { data };
});

connection.onPrepareRename((params: PrepareRenameParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const context = getRenameContext(document.getText(), params.position);
  if (!context) {
    return null;
  }

  return {
    range: context.wordRange,
    placeholder: context.oldName
  };
});

// Rename provider for refactoring variables, line numbers, and functions
connection.onRenameRequest(async (params: RenameParams): Promise<WorkspaceEdit | null> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const newName = params.newName;
  const text = document.getText();
  const context = getRenameContext(text, params.position);

  if (!context) {
    return null;
  }

  const edits = createRenameEdits(text.split('\n'), context, newName);
  return {
    changes: {
      [params.textDocument.uri]: edits
    }
  };
});

// Folding ranges provider for FOR...NEXT, subroutines, and DATA blocks
export function getFoldingRanges(text: string, settings: ExampleSettings): FoldingRange[] {
  const lines = text.split('\n');
  const foldingRanges: FoldingRange[] = [];

  if (settings.logging.level === 'debug') {
    connection.console.log(`Folding ranges debug: Analyzing ${lines.length} lines of text`);
  }

  // Track FOR loops
  const forStack: { keyword: string; startLine: number }[] = [];

  // Track GOSUB subroutines
  const subroutines: { startLine: number; lineNumber: string }[] = [];
  const gosubTargets = new Set<string>();

  // First pass: collect GOSUB targets
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumMatch = line.match(/^(\d+)\s+/);
    if (lineNumMatch) {
      const lineNum = lineNumMatch[1];

      // Check for GOSUB/GO SUB calls
      if (/\b(GOSUB|GO\s+SUB)\s+(\d+)/i.test(line)) {
        const targetMatch = line.match(/\b(GOSUB|GO\s+SUB)\s+(\d+)/i);
        if (targetMatch) {
          gosubTargets.add(targetMatch[2]);
          if (settings.logging.level === 'debug') {
            connection.console.log(`Folding ranges debug: Found GOSUB target line ${targetMatch[2]} on line ${i}`);
          }
        }
      }
    }
  }

  if (settings.logging.level === 'debug') {
    connection.console.log(`Folding ranges debug: Found ${gosubTargets.size} GOSUB target lines: ${[...gosubTargets].join(', ')}`);
  }

  // Second pass: identify folding ranges
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumMatch = line.match(/^(\d+)\s+/);
    const lineNum = lineNumMatch ? lineNumMatch[1] : null;
    const upperLine = line.toUpperCase();

    // FOR...NEXT folding
    if (/\bFOR\s+/i.test(upperLine)) {
      forStack.push({ keyword: 'FOR', startLine: i });
      if (settings.logging.level === 'debug') {
        connection.console.log(`Folding ranges debug: Found FOR statement on line ${i}`);
      }
    } else if (/\bNEXT\b/i.test(upperLine)) {
      if (forStack.length > 0) {
        const forLoop = forStack.pop();
        if (forLoop) {
          foldingRanges.push({
            startLine: forLoop.startLine,
            endLine: i,
            kind: 'region'
          });
          if (settings.logging.level === 'debug') {
            connection.console.log(`Folding ranges debug: Created FOR loop folding range: lines ${forLoop.startLine}-${i}`);
          }
        }
      } else if (settings.logging.level === 'debug') {
        connection.console.log(`Folding ranges debug: Found NEXT statement on line ${i} without matching FOR`);
      }
    }

    // GOSUB subroutine folding
    if (lineNum && gosubTargets.has(lineNum)) {
      // This line number is a subroutine target
      subroutines.push({ startLine: i, lineNumber: lineNum });
      if (settings.logging.level === 'debug') {
        connection.console.log(`Folding ranges debug: Found subroutine target on line ${i} (line number ${lineNum})`);
      }
    }
  }

  // Create folding ranges for subroutines (GOSUB target to RETURN)
  for (const subroutine of subroutines) {
    // Find the next RETURN after this subroutine
    let endLine = subroutine.startLine;
    for (let i = subroutine.startLine + 1; i < lines.length; i++) {
      if (/\bRETURN\b/i.test(lines[i].toUpperCase())) {
        endLine = i;
        if (settings.logging.level === 'debug') {
          connection.console.log(`Folding ranges debug: Found RETURN statement for subroutine ${subroutine.lineNumber} on line ${i}`);
        }
        break;
      }

      // Stop at next subroutine target
      const nextLineMatch = lines[i].match(/^(\d+)\s+/);
      if (nextLineMatch && gosubTargets.has(nextLineMatch[1])) {
        endLine = i - 1;
        if (settings.logging.level === 'debug') {
          connection.console.log(`Folding ranges debug: Stopped subroutine ${subroutine.lineNumber} at next subroutine target on line ${i}`);
        }
        break;
      }
    }

    if (endLine > subroutine.startLine) {
      foldingRanges.push({
        startLine: subroutine.startLine,
        endLine: endLine,
        kind: 'region'
      });
      if (settings.logging.level === 'debug') {
        connection.console.log(`Folding ranges debug: Created subroutine folding range: lines ${subroutine.startLine}-${endLine} (subroutine ${subroutine.lineNumber})`);
      }
    } else if (settings.logging.level === 'debug') {
      connection.console.log(`Folding ranges debug: No RETURN found for subroutine ${subroutine.lineNumber}, skipping folding range`);
    }
  }

  // DATA block folding (consecutive DATA statements)
  let dataStart: number | null = null;
  let lastDataLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const upperLine = lines[i].toUpperCase();

    if (/\bDATA\b/i.test(upperLine)) {
      if (dataStart === null) {
        dataStart = i;
        if (settings.logging.level === 'debug') {
          connection.console.log(`Folding ranges debug: Started DATA block on line ${i}`);
        }
      }
      lastDataLine = i;
    } else if (dataStart !== null && i > lastDataLine) {
      // End of DATA block
      if (lastDataLine > dataStart) {
        foldingRanges.push({
          startLine: dataStart,
          endLine: lastDataLine,
          kind: 'region'
        });
        if (settings.logging.level === 'debug') {
          connection.console.log(`Folding ranges debug: Created DATA block folding range: lines ${dataStart}-${lastDataLine}`);
        }
      }
      dataStart = null;
    }
  }

  // Handle final DATA block if exists
  if (dataStart !== null && lastDataLine > dataStart) {
    foldingRanges.push({
      startLine: dataStart,
      endLine: lastDataLine,
      kind: 'region'
    });
    if (settings.logging.level === 'debug') {
      connection.console.log(`Folding ranges debug: Created final DATA block folding range: lines ${dataStart}-${lastDataLine}`);
    }
  }

  // Check for unmatched FOR loops
  if (forStack.length > 0 && settings.logging.level === 'debug') {
    connection.console.log(`Folding ranges debug: Warning: ${forStack.length} unmatched FOR statements remain in stack`);
    forStack.forEach((forLoop, index) => {
      connection.console.log(`Folding ranges debug: Unmatched FOR ${index + 1}: started on line ${forLoop.startLine}`);
    });
  }

  if (settings.logging.level === 'debug') {
    connection.console.log(`Folding ranges debug: Returning ${foldingRanges.length} folding ranges`);
    foldingRanges.forEach((range, index) => {
      connection.console.log(`Folding ranges debug: Range ${index + 1}: lines ${range.startLine}-${range.endLine}, kind: ${range.kind}`);
    });
  }

  return foldingRanges;
}

connection.onFoldingRanges(async (params: FoldingRangeParams): Promise<FoldingRange[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const settings = await getDocumentSettings(params.textDocument.uri);
  if (settings.logging.level === 'debug') {
    connection.console.log(`Folding ranges debug: Processing folding ranges request for ${params.textDocument.uri}`);
  }

  return getFoldingRanges(document.getText(), settings);
});

// Call hierarchy provider for GOSUB call graphs
connection.languages.callHierarchy.onPrepare(async (params: CallHierarchyPrepareParams): Promise<CallHierarchyItem[] | null> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const position = params.position;
  const text = document.getText();
  const lines = text.split('\n');
  const lineText = lines[position.line];

  // Get the word at cursor position
  let wordStart = position.character;
  let wordEnd = position.character;
  
  while (wordStart > 0 && /[A-Za-z0-9_$%]/.test(lineText[wordStart - 1])) {
    wordStart--;
  }
  while (wordEnd < lineText.length && /[A-Za-z0-9_$%]/.test(lineText[wordEnd])) {
    wordEnd++;
  }
  
  const word = lineText.substring(wordStart, wordEnd);
  
  // Only enable call hierarchy for line numbers (subroutines)
  if (!/^\d+$/.test(word)) {
    return null;
  }

  const lineNumber = word;
  const lineMatch = lineText.match(/^(\d+)\s+/);
  
  if (!lineMatch || lineMatch[1] !== lineNumber) {
    // Not at a line number position
    return null;
  }

  // Create call hierarchy item for this line number
  const item: CallHierarchyItem = {
    name: `Line ${lineNumber}`,
    kind: SymbolKind.Function,
    uri: params.textDocument.uri,
    range: {
      start: position,
      end: { line: position.line, character: position.character + lineNumber.length }
    },
    selectionRange: {
      start: position,
      end: { line: position.line, character: position.character + lineNumber.length }
    }
  };

  return [item];
});

// Incoming calls to a subroutine (who calls this line number?)
connection.languages.callHierarchy.onIncomingCalls(async (params: CallHierarchyIncomingCallsParams): Promise<CallHierarchyIncomingCall[] | null> => {
  const document = documents.get(params.item.uri);
  if (!document) {
    return null;
  }

  const itemRange = params.item.range;
  const text = document.getText();
  const lines = text.split('\n');
  
  // Extract the line number from "Line XXX"
  const lineNumMatch = params.item.name.match(/Line (\d+)/);
  if (!lineNumMatch) {
    return null;
  }

  const targetLineNum = lineNumMatch[1];
  const incomingCalls: CallHierarchyIncomingCall[] = [];

  // Find all GOSUB/GO SUB calls to this line number
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumAtStart = line.match(/^(\d+)\s+/);
    
    if (!lineNumAtStart) continue;

    const currentLineNum = lineNumAtStart[1];
    const gotoPattern = new RegExp(`\\b(GOSUB|GO\\s+SUB)\\s+${targetLineNum}\\b`, 'gi');
    let match;
    
    while ((match = gotoPattern.exec(line)) !== null) {
      // Create call hierarchy item for the calling line
      const callerItem: CallHierarchyItem = {
        name: `Line ${currentLineNum}`,
        kind: SymbolKind.Function,
        uri: params.item.uri,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length }
        },
        selectionRange: {
          start: { line: i, character: 0 },
          end: { line: i, character: currentLineNum.length }
        }
      };

      // Create incoming call entry
      incomingCalls.push({
        from: callerItem,
        fromRanges: [{
          start: { line: i, character: match.index },
          end: { line: i, character: match.index + match[0].length }
        }]
      });
    }
  }

  return incomingCalls;
});

// Outgoing calls from a subroutine (what does this line call?)
connection.languages.callHierarchy.onOutgoingCalls(async (params: CallHierarchyOutgoingCallsParams): Promise<CallHierarchyOutgoingCall[] | null> => {
  const document = documents.get(params.item.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const lines = text.split('\n');
  
  // Extract the line number from "Line XXX"
  const lineNumMatch = params.item.name.match(/Line (\d+)/);
  if (!lineNumMatch) {
    return null;
  }

  const currentLineNum = lineNumMatch[1];
  const outgoingCalls: CallHierarchyOutgoingCall[] = [];

  // Find the line range for this subroutine (from line number to RETURN)
  let subroutineStart: number | null = null;
  let subroutineEnd: number = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumAtStart = line.match(/^(\d+)\s+/);
    
    if (lineNumAtStart && lineNumAtStart[1] === currentLineNum) {
      subroutineStart = i;
    } else if (subroutineStart !== null && /\bRETURN\b/i.test(line)) {
      subroutineEnd = i + 1;
      break;
    } else if (subroutineStart !== null && lineNumAtStart) {
      // Stop at next subroutine if we haven't found RETURN
      subroutineEnd = i;
      break;
    }
  }

  if (subroutineStart === null) {
    return null;
  }

  // Collect all GOSUB calls within this subroutine
  for (let i = subroutineStart; i < subroutineEnd && i < lines.length; i++) {
    const line = lines[i];
    const gotoPattern = /\b(GOSUB|GO\s+SUB)\s+(\d+)\b/gi;
    let match;
    
    while ((match = gotoPattern.exec(line)) !== null) {
      const targetLineNum = match[2];
      
      // Create call hierarchy item for the called line
      const calleeItem: CallHierarchyItem = {
        name: `Line ${targetLineNum}`,
        kind: SymbolKind.Function,
        uri: params.item.uri,
        range: {
          start: { line: parseInt(targetLineNum) - 1 < 0 ? 0 : i, character: 0 },
          end: { line: i, character: line.length }
        },
        selectionRange: {
          start: { line: i, character: match.index },
          end: { line: i, character: match.index + targetLineNum.length }
        }
      };

      // Create outgoing call entry
      outgoingCalls.push({
        to: calleeItem,
        fromRanges: [{
          start: { line: i, character: match.index },
          end: { line: i, character: match.index + match[0].length }
        }]
      });
    }
  }

  return outgoingCalls;
});

if (process.env.NODE_ENV !== 'test') {
  documents.listen(connection);
  connection.listen();
} else {
  // During tests we avoid starting the LSP listeners to prevent createConnection
  // from attempting to use stdio/socket streams. Tests should import pure helpers
  // (or the utils modules) instead of importing the whole server that starts
  // runtime services.
}
