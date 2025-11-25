import { commands, Uri, Position, Range, Location, window } from 'vscode';

interface SerializedPosition {
  line: number;
  character: number;
}

interface SerializedRange {
  start: SerializedPosition;
  end: SerializedPosition;
}

interface SerializedLocation {
  uri: string;
  range: SerializedRange;
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

export function register() {
  return commands.registerCommand('zx-basic.showReferences', async (
    uriString: string,
    positionData: SerializedPosition,
    locationsData: SerializedLocation[]
  ) => {
    try {
      const uri = Uri.parse(uriString);
      const position = revivePosition(positionData);
      const locations = Array.isArray(locationsData)
        ? locationsData.map(reviveLocation)
        : [];

      await commands.executeCommand('editor.action.showReferences', uri, position, locations);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(`Unable to show references: ${message}`);
    }
  });
}
