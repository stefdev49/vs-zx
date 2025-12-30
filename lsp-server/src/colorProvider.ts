/**
 * Document Color Provider for ZX Spectrum BASIC
 *
 * Provides visual color swatches for INK, PAPER, BORDER, and BRIGHT statements
 * in the VS Code editor.
 */

import { Color, ColorInformation, ColorPresentation, Range } from 'vscode-languageserver/node';
import { Token, TokenType } from './zxbasic';
import { isDrawingAttribute } from './color-utils';

/**
 * ZX Spectrum color palette (RGB values)
 * Colors 0-7 are standard colors, 8-15 are bright versions
 */
const ZX_COLORS: { [key: number]: { r: number; g: number; b: number; name: string } } = {
  // Normal colors
  0: { r: 0, g: 0, b: 0, name: 'Black' },
  1: { r: 0, g: 0, b: 0.803, name: 'Blue' },
  2: { r: 0.803, g: 0, b: 0, name: 'Red' },
  3: { r: 0.803, g: 0, b: 0.803, name: 'Magenta' },
  4: { r: 0, g: 0.803, b: 0, name: 'Green' },
  5: { r: 0, g: 0.803, b: 0.803, name: 'Cyan' },
  6: { r: 0.803, g: 0.803, b: 0, name: 'Yellow' },
  7: { r: 0.803, g: 0.803, b: 0.803, name: 'White' },
  // Bright colors (when BRIGHT 1 is set)
  8: { r: 0, g: 0, b: 0, name: 'Bright Black' },
  9: { r: 0, g: 0, b: 1, name: 'Bright Blue' },
  10: { r: 1, g: 0, b: 0, name: 'Bright Red' },
  11: { r: 1, g: 0, b: 1, name: 'Bright Magenta' },
  12: { r: 0, g: 1, b: 0, name: 'Bright Green' },
  13: { r: 0, g: 1, b: 1, name: 'Bright Cyan' },
  14: { r: 1, g: 1, b: 0, name: 'Bright Yellow' },
  15: { r: 1, g: 1, b: 1, name: 'Bright White' },
};

/**
 * Color commands that take a color value as argument
 */
const COLOR_KEYWORDS = new Set(['INK', 'PAPER', 'BORDER']);

/**
 * Special color values for INK and PAPER (not actual colors)
 * 8 = transparent (keep previous), 9 = contrast
 */
const SPECIAL_COLOR_VALUES = new Set([8, 9]);

export interface ColorLocation {
  keyword: string;
  colorValue: number;
  range: Range;
  line: number;
}

/**
 * Find all color statements in the tokenized BASIC code
 */
export function findColorStatements(tokens: Token[]): ColorLocation[] {
  const colorLocations: ColorLocation[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for INK, PAPER, BORDER keywords
    if (token.type === TokenType.KEYWORD && COLOR_KEYWORDS.has(token.value.toUpperCase())) {
      const keyword = token.value.toUpperCase();

      // Skip INK/PAPER if they're drawing attributes (e.g., PLOT INK 1; x, y)
      if ((keyword === 'INK' || keyword === 'PAPER') && isDrawingAttribute(tokens, i)) {
        continue;
      }

      // Look for the number following the color keyword
      for (let j = i + 1; j < tokens.length; j++) {
        const nextToken = tokens[j];

        // Stop at statement separators
        if (
          nextToken.type === TokenType.STATEMENT_SEPARATOR ||
          nextToken.type === TokenType.LINE_NUMBER ||
          nextToken.type === TokenType.EOF ||
          (nextToken.type === TokenType.PUNCTUATION && nextToken.value === ')')
        ) {
          break;
        }

        // Found a number - this is the color value
        if (nextToken.type === TokenType.NUMBER) {
          const colorValue = parseInt(nextToken.value, 10);

          // Only include valid color values (0-7)
          // Skip special values 8 (transparent) and 9 (contrast) as they're not actual colors
          if (colorValue >= 0 && colorValue <= 7) {
            colorLocations.push({
              keyword,
              colorValue,
              range: {
                start: { line: nextToken.line, character: nextToken.start },
                end: { line: nextToken.line, character: nextToken.end },
              },
              line: nextToken.line,
            });
          }
          break;
        }

        // Skip other keywords (like BRIGHT)
        if (nextToken.type === TokenType.KEYWORD) {
          continue;
        }
      }
    }
  }

  return colorLocations;
}

/**
 * Convert ColorLocation array to ColorInformation array for LSP
 */
export function getDocumentColors(tokens: Token[]): ColorInformation[] {
  const colorLocations = findColorStatements(tokens);

  return colorLocations.map((loc) => {
    const zxColor = ZX_COLORS[loc.colorValue];
    return {
      range: loc.range,
      color: {
        red: zxColor.r,
        green: zxColor.g,
        blue: zxColor.b,
        alpha: 1,
      },
    };
  });
}

/**
 * Find the nearest ZX Spectrum color for a given RGB value
 */
export function findNearestZXColor(color: Color): number {
  let nearestColor = 0;
  let minDistance = Infinity;

  // Only consider base colors 0-7 (not bright variants)
  for (let i = 0; i <= 7; i++) {
    const zxColor = ZX_COLORS[i];
    const distance = Math.sqrt(
      Math.pow(color.red - zxColor.r, 2) +
      Math.pow(color.green - zxColor.g, 2) +
      Math.pow(color.blue - zxColor.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = i;
    }
  }

  return nearestColor;
}

/**
 * Get color presentations (what to show in the color picker dropdown)
 */
export function getColorPresentations(color: Color, range: Range): ColorPresentation[] {
  const nearestColor = findNearestZXColor(color);
  const zxColor = ZX_COLORS[nearestColor];

  return [
    {
      label: `${nearestColor} (${zxColor.name})`,
      textEdit: {
        range,
        newText: nearestColor.toString(),
      },
    },
  ];
}

/**
 * Get the ZX Spectrum color name for a given color value
 */
export function getColorName(colorValue: number): string | undefined {
  return ZX_COLORS[colorValue]?.name;
}

/**
 * Get the ZX Spectrum RGB values for a given color value
 */
export function getColorRGB(colorValue: number): { r: number; g: number; b: number } | undefined {
  const color = ZX_COLORS[colorValue];
  return color ? { r: color.r, g: color.g, b: color.b } : undefined;
}
