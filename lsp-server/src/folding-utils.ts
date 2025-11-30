export type ExampleSettings = {
  maxNumberOfProblems: number;
  model: string;
  strictMode: boolean;
  lineNumberIncrement: number;
  maxLineLength: number;
  uppercaseKeywords: boolean;
  trace: { server: string };
  logging: { level: 'off' | 'error' | 'warn' | 'info' | 'debug' };
};

export function getFoldingRanges(text: string, settings: ExampleSettings) {
  const lines = text.split('\n');
  const foldingRanges: { startLine: number; endLine: number; kind: string }[] = [];

  // simple debug logger guard
  const dbg = (msg: string) => {
    if (settings.logging.level === 'debug') {
      // use console so no dependency on LSP connection
      // eslint-disable-next-line no-console
      console.log(`Folding ranges debug: ${msg}`);
    }
  };

  dbg(`Analyzing ${lines.length} lines of text`);

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
          dbg(`Found GOSUB target line ${targetMatch[2]} on line ${i}`);
        }
      }
    }
  }

  dbg(`Found ${[...gosubTargets].length} GOSUB target lines: ${[...gosubTargets].join(', ')}`);

  // Second pass: identify folding ranges
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumMatch = line.match(/^(\d+)\s+/);
    const lineNum = lineNumMatch ? lineNumMatch[1] : null;
    const upperLine = line.toUpperCase();

    // FOR...NEXT folding
    if (/\bFOR\s+/i.test(upperLine)) {
      forStack.push({ keyword: 'FOR', startLine: i });
      dbg(`Found FOR statement on line ${i}`);
    } else if (/\bNEXT\b/i.test(upperLine)) {
      if (forStack.length > 0) {
        const forLoop = forStack.pop();
        if (forLoop) {
          foldingRanges.push({ startLine: forLoop.startLine, endLine: i, kind: 'region' });
          dbg(`Created FOR loop folding range: lines ${forLoop.startLine}-${i}`);
        }
      } else {
        dbg(`Found NEXT statement on line ${i} without matching FOR`);
      }
    }

    // GOSUB subroutine folding
    if (lineNum && gosubTargets.has(lineNum)) {
      subroutines.push({ startLine: i, lineNumber: lineNum });
      dbg(`Found subroutine target on line ${i} (line number ${lineNum})`);
    }
  }

  // Create folding ranges for subroutines (GOSUB target to RETURN)
  for (const subroutine of subroutines) {
    let endLine = subroutine.startLine;
    for (let i = subroutine.startLine + 1; i < lines.length; i++) {
      if (/\bRETURN\b/i.test(lines[i].toUpperCase())) {
        endLine = i;
        dbg(`Found RETURN statement for subroutine ${subroutine.lineNumber} on line ${i}`);
        break;
      }
      const nextLineMatch = lines[i].match(/^(\d+)\s+/);
      if (nextLineMatch && gosubTargets.has(nextLineMatch[1])) {
        endLine = i - 1;
        dbg(`Stopped subroutine ${subroutine.lineNumber} at next subroutine target on line ${i}`);
        break;
      }
    }

    if (endLine > subroutine.startLine) {
      foldingRanges.push({ startLine: subroutine.startLine, endLine, kind: 'region' });
      dbg(`Created subroutine folding range: lines ${subroutine.startLine}-${endLine} (subroutine ${subroutine.lineNumber})`);
    } else {
      dbg(`No RETURN found for subroutine ${subroutine.lineNumber}, skipping folding range`);
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
        dbg(`Started DATA block on line ${i}`);
      }
      lastDataLine = i;
    } else if (dataStart !== null && i > lastDataLine) {
      if (lastDataLine > dataStart) {
        foldingRanges.push({ startLine: dataStart, endLine: lastDataLine, kind: 'region' });
        dbg(`Created DATA block folding range: lines ${dataStart}-${lastDataLine}`);
      }
      dataStart = null;
    }
  }

  if (dataStart !== null && lastDataLine > dataStart) {
    foldingRanges.push({ startLine: dataStart, endLine: lastDataLine, kind: 'region' });
  }

  return foldingRanges;
}
