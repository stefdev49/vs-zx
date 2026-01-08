/**
 * Line number utilities for ZX BASIC
 * Provides functions for parsing, generating, and updating line numbers
 */

/**
 * Parse line number from line text
 * @param line - The line of ZX BASIC code
 * @returns The parsed line number or null if no line number found
 */
export function parseLineNumber(line: string): number | null {
  const match = line.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generate valid line numbers to fit within a gap between two existing line numbers.
 * Distributes numbers evenly within the available space.
 *
 * @param above - Line number above the gap (null if at beginning)
 * @param below - Line number below the gap (null if at end)
 * @param count - Number of line numbers needed
 * @returns Array of line numbers, or empty array if not enough room
 */
export function generateLineNumbersInGap(
  above: number | null,
  below: number | null,
  count: number
): number[] {
  // Define boundaries
  const minLine = 1;
  const maxLine = 9999;

  const lowerBound = above !== null ? above : minLine - 1;
  const upperBound = below !== null ? below : maxLine + 1;

  // Available gap (exclusive on both ends)
  const gap = upperBound - lowerBound - 1;

  if (gap < count) {
    // Not enough room for all the lines
    return [];
  }

  // Distribute evenly within the gap
  const step = Math.floor(gap / (count + 1));
  const result: number[] = [];

  for (let i = 1; i <= count; i++) {
    const num = lowerBound + i * step;
    // Ensure we stay within bounds
    if (num <= lowerBound || (below !== null && num >= below)) {
      return []; // Safety check
    }
    result.push(num);
  }

  return result;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateLineNumbersInGap instead
 */
export function generateValidLineNumber(
  above: number | null,
  below: number | null,
  direction: "up" | "down"
): number | null {
  const nums = generateLineNumbersInGap(above, below, 1);
  return nums.length > 0 ? nums[0] : null;
}

/**
 * Find all GOTO/GOSUB/RESTORE/RUN references in text and update them
 * @param text - The full text content
 * @param oldLineNumber - The old line number to replace
 * @param newLineNumber - The new line number to use
 * @returns Updated text with replaced line number references
 */
export function updateLineReferences(
  text: string,
  oldLineNumber: number,
  newLineNumber: number
): string {
  // Pattern to match GOTO, GO TO, GOSUB, GO SUB, RESTORE, RUN followed by line number
  // Uses word boundary and captures the keyword and line number
  const pattern = new RegExp(
    `\\b(GOTO|GO\\s+TO|GOSUB|GO\\s+SUB|RESTORE|RUN)\\s+(${oldLineNumber})\\b`,
    "gi"
  );

  return text.replace(pattern, (match, keyword) => {
    return `${keyword} ${newLineNumber}`;
  });
}

/**
 * Check if line numbers are in valid ascending order
 * @param lines - Array of line texts
 * @returns true if line numbers are in valid order, false otherwise
 */
export function areLineNumbersValid(lines: string[]): boolean {
  let previousNumber: number | null = null;

  for (const line of lines) {
    const lineNumber = parseLineNumber(line);
    if (lineNumber === null) continue;

    if (previousNumber !== null && lineNumber <= previousNumber) {
      return false;
    }

    previousNumber = lineNumber;
  }

  return true;
}
