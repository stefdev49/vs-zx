import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DiagnosticSeverity
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { ZXBasicLexer, ZXBasicParser, TokenType } from './zxbasic';

declare module 'syntax-definitions/keywords';

import { allKeywords } from 'syntax-definitions/keywords';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      }
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  // Validate the document
  validateDocument(change.document);
});

async function validateDocument(textDocument: TextDocument): Promise<void> {
  // Parse the document and find issues
  const text = textDocument.getText();
  const diagnostics: any[] = [];

  const lexer = new ZXBasicLexer();
  const tokens = lexer.tokenize(text);

  // Check for lexer errors (invalid characters)
  for (const token of tokens) {
    if (token.type === TokenType.INVALID) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: token.line, character: token.start },
          end: { line: token.line, character: token.end }
        },
        message: `Invalid character: ${token.value}`,
        source: 'zx-basic'
      });
    }
  }

  // Try to parse expressions for syntax errors
  const parser = new ZXBasicParser(tokens);
  const expr = parser.parseExpression();

  // Simple validation: check for missing line numbers or REM
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Check if line starts with a number or REM
    if (!/^\d/.test(line) && !line.toUpperCase().startsWith('REM')) {
      // Look for the first token on this line
      const tokensOnLine = tokens.filter(t => t.line === i && t.type !== TokenType.EOF);
      if (tokensOnLine.length > 0) {
        const firstToken = tokensOnLine[0];
        if (firstToken.type !== TokenType.NUMBER && firstToken.value.toUpperCase() !== 'REM') {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: {
              start: { line: i, character: 0 },
              end: { line: i, character: line.length }
            },
            message: 'Line should start with a line number or REM',
            source: 'zx-basic'
          });
        }
      }
    }
  }

  // Send the computed diagnostics to VS Code.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return allKeywords.map(keyword => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      data: keyword
    }));
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = 'TypeScript details';
      item.documentation = 'TypeScript documentation';
    } else if (item.data === 2) {
      item.detail = 'JavaScript details';
      item.documentation = 'JavaScript documentation';
    }
    return item;
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
