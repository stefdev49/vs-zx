import * as path from 'path';
import {
  workspace,
  ExtensionContext,
  CodeLens,
  Uri,
  Position,
  Range,
  Location,
  TextDocument,
  FormattingOptions,
  CancellationToken,
  window,
} from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  Middleware,
  TransportKind,
} from 'vscode-languageclient/node';

// Import command modules
import * as transferCmd from './commands/transfer';
import * as saveAsTzxCmd from './commands/saveAsTzx';
import * as playToZxCmd from './commands/playToZx';
import * as recordFromZxCmd from './commands/recordFromZx';
import * as loadFromMdrCmd from './commands/loadFromMdr';
import * as saveToMdrCmd from './commands/saveToMdr';
import * as extractVariableCmd from './commands/refactor/extractVariable';
import * as renumberLinesCmd from './commands/refactor/renumberLines';
import * as extractSubroutineCmd from './commands/refactor/extractSubroutine';

let client: LanguageClient;

type SerializedPosition = { line: number; character: number };
type SerializedRange = { start: SerializedPosition; end: SerializedPosition };
type SerializedLocation = { uri: string; range: SerializedRange };

const SHOW_REFERENCES_COMMAND = 'zx-basic.showReferences';

function isSerializedPosition(value: unknown): value is SerializedPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SerializedPosition).line === 'number' &&
    typeof (value as SerializedPosition).character === 'number'
  );
}

function isSerializedRange(value: unknown): value is SerializedRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    isSerializedPosition((value as SerializedRange).start) &&
    isSerializedPosition((value as SerializedRange).end)
  );
}

function isSerializedLocation(value: unknown): value is SerializedLocation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SerializedLocation).uri === 'string' &&
    isSerializedRange((value as SerializedLocation).range)
  );
}

function revivePosition(data: SerializedPosition): Position {
  return new Position(data.line, data.character);
}

function reviveRange(data: SerializedRange): Range {
  return new Range(revivePosition(data.start), revivePosition(data.end));
}

function reviveLocation(data: SerializedLocation): Location {
  return new Location(Uri.parse(data.uri), reviveRange(data.range));
}

function transformShowReferencesLens(
  lens?: CodeLens | null,
): CodeLens | null | undefined {
  if (!lens?.command || lens.command.command !== SHOW_REFERENCES_COMMAND) {
    return lens;
  }

  const [uriString, positionData, locationsData] = lens.command.arguments ?? [];
  if (
    typeof uriString !== 'string' ||
    !isSerializedPosition(positionData) ||
    !Array.isArray(locationsData)
  ) {
    return lens;
  }

  try {
    const uri = Uri.parse(uriString);
    const position = revivePosition(positionData);
    const locations = locationsData
      .filter(isSerializedLocation)
      .map(reviveLocation);

    lens.command = {
      title: lens.command.title ?? 'Show References',
      command: 'editor.action.showReferences',
      arguments: [uri, position, locations],
    };
  } catch (error) {
    console.error('Failed to convert ZX BASIC CodeLens command', error);
  }

  return lens;
}

function transformShowReferencesLensArray(
  lenses: CodeLens[] | null | undefined,
): CodeLens[] | null | undefined {
  if (!Array.isArray(lenses)) {
    return lenses;
  }

  return lenses.map((lens) => transformShowReferencesLens(lens) ?? lens);
}

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('out', 'server', 'server.js'),
  );

  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const config = workspace.getConfiguration('zxBasic');
  const enableFormatOnType = config.get('enableFormatOnType', true);

  const serverOptions: any = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
    initializationOptions: {
      enableFormatOnType: enableFormatOnType,
    },
  };

  // Options to control the language client
  const middleware: Middleware = {
    provideCodeLenses: async (document, token, next) => {
      const lenses = await next(document, token);
      return transformShowReferencesLensArray(lenses);
    },
    resolveCodeLens: async (codeLens, token, next) => {
      const resolved = await next(codeLens, token);
      return transformShowReferencesLens(resolved);
    },
    provideDocumentFormattingEdits: async (
      document: TextDocument,
      options: FormattingOptions,
      token: CancellationToken,
      next,
    ) => {
      console.log(
        `[zx-basic] Sending format request for ${document.uri.toString()}`,
      );
      const edits = await next(document, options, token);
      const editCount = Array.isArray(edits) ? edits.length : 0;
      console.log(
        `[zx-basic] Received ${editCount} formatting edits for ${document.uri.toString()}`,
      );
      return edits;
    },
  };

  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'zx-basic' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
    middleware,
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'zxBasicServer',
    'ZX BASIC Server',
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();

  // Register notification handler for keyword uppercasing feedback
  client.onNotification(
    'zxBasic/keywordUppercased',
    (params: { line: number; start: number; end: number; keyword: string }) => {
      console.log(
        '[ZX BASIC] Received keywordUppercased notification:',
        JSON.stringify(params),
      );

      const editor = window.activeTextEditor;
      if (editor && editor.document.languageId === 'zx-basic') {
        console.log(
          `[ZX BASIC] Applying highlight to keyword '${params.keyword}' at line ${params.line}, chars ${params.start}-${params.end}`,
        );

        const range = new Range(
          params.line,
          params.start,
          params.line,
          params.end,
        );

        // Create a decoration type for brief highlight
        const highlightDecoration = window.createTextEditorDecorationType({
          backgroundColor: 'rgba(255, 255, 0, 0.3)',
          isWholeLine: false,
        });

        // Apply decoration briefly
        editor.setDecorations(highlightDecoration, [range]);

        // Remove decoration after 500ms
        setTimeout(() => {
          editor.setDecorations(highlightDecoration, []);
        }, 500);
      } else {
        console.log(
          '[ZX BASIC] No active editor or wrong language mode for keyword highlight',
        );
      }
    },
  );

  // Register command for transfer (use source so bundler can include it)
  context.subscriptions.push(transferCmd.register());

  // Register command for save as TZX
  context.subscriptions.push(saveAsTzxCmd.register());

  // Register command for play to ZX
  playToZxCmd.register(context);

  // Register command for record from ZX
  recordFromZxCmd.register(context);

  // Register MDR commands
  context.subscriptions.push(loadFromMdrCmd.register());
  context.subscriptions.push(saveToMdrCmd.register());

  // Register refactoring commands
  context.subscriptions.push(extractVariableCmd.register());
  context.subscriptions.push(renumberLinesCmd.register());
  context.subscriptions.push(extractSubroutineCmd.register());

  try {
    context.subscriptions.push(renumberLinesCmd.register());
  } catch (error: unknown) {
    const err = error as Error;
    console.warn(`Failed to register renumberLines command: ${err.message}`);
  }

  try {
    context.subscriptions.push(extractSubroutineCmd.register());
  } catch (error: unknown) {
    const err = error as Error;
    console.warn(
      `Failed to register extractSubroutine command: ${err.message}`,
    );
  }

  try {
    context.subscriptions.push(renumberLinesCmd.register());
  } catch (error: any) {
    console.warn(`Failed to register renumberLines command: ${error.message}`);
  }

  try {
    context.subscriptions.push(extractSubroutineCmd.register());
  } catch (error: any) {
    console.warn(
      `Failed to register extractSubroutine command: ${error.message}`,
    );
  }
}

export function deactivate(): Thenable<void> | undefined {
  // Clean up any active playback
  if (playToZxCmd.deactivate) {
    playToZxCmd.deactivate();
  }

  // Clean up any active recording
  if (recordFromZxCmd.deactivate) {
    recordFromZxCmd.deactivate();
  }

  if (!client) {
    return undefined;
  }
  return client.stop();
}
