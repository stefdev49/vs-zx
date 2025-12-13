import * as path from "path";
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
} from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  Middleware,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

type SerializedPosition = { line: number; character: number };
type SerializedRange = { start: SerializedPosition; end: SerializedPosition };
type SerializedLocation = { uri: string; range: SerializedRange };

const SHOW_REFERENCES_COMMAND = "zx-basic.showReferences";

function isSerializedPosition(value: unknown): value is SerializedPosition {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SerializedPosition).line === "number" &&
    typeof (value as SerializedPosition).character === "number"
  );
}

function isSerializedRange(value: unknown): value is SerializedRange {
  return (
    typeof value === "object" &&
    value !== null &&
    isSerializedPosition((value as SerializedRange).start) &&
    isSerializedPosition((value as SerializedRange).end)
  );
}

function isSerializedLocation(value: unknown): value is SerializedLocation {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SerializedLocation).uri === "string" &&
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
    typeof uriString !== "string" ||
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
      title: lens.command.title ?? "Show References",
      command: "editor.action.showReferences",
      arguments: [uri, position, locations],
    };
  } catch (error) {
    console.error("Failed to convert ZX BASIC CodeLens command", error);
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
    path.join("out", "server", "server.js"),
  );

  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
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
    documentSelector: [{ scheme: "file", language: "zx-basic" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
    middleware,
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "zxBasicServer",
    "ZX BASIC Server",
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();

  // Register command for transfer (use source so bundler can include it)
  const transferCmd = require("./commands/transfer");
  context.subscriptions.push(transferCmd.register());

  // Register command for save as TZX
  const saveAsTzxCmd = require("./commands/saveAsTzx");
  context.subscriptions.push(saveAsTzxCmd.register());

  // Register command for play to ZX
  const playToZxCmd = require("./commands/playToZx");
  playToZxCmd.register(context);

  // Register refactoring commands
  const extractVariableCmd = require("./commands/refactor/extractVariable");
  context.subscriptions.push(extractVariableCmd.register());

  const renumberLinesCmd = require("./commands/refactor/renumberLines");
  context.subscriptions.push(renumberLinesCmd.register());

  const extractSubroutineCmd = require("./commands/refactor/extractSubroutine");
  context.subscriptions.push(extractSubroutineCmd.register());
}

export function deactivate(): Thenable<void> | undefined {
  // Clean up any active playback
  const playToZxCmd = require("./commands/playToZx");
  if (playToZxCmd.deactivate) {
    playToZxCmd.deactivate();
  }

  if (!client) {
    return undefined;
  }
  return client.stop();
}
