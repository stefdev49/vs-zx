/**
 * ZX Spectrum Character Set Mapping
 * Maps between ZX Spectrum bytes (0x00-0xFF) and Unicode characters
 *
 * Based on Wikipedia: https://en.wikipedia.org/wiki/ZX_Spectrum_character_set
 * Unicode mappings from: https://www.unicode.org/charts/PDF/U2580.pdf (Block Elements)
 */

export const ZX_REPLACEMENT_BYTE = 0x3f; // '?' character for unmapped bytes

/**
 * Maps ZX Spectrum byte to Unicode character
 * Returns null for unmapped bytes (like BASIC tokens)
 */
export function zxByteToUnicode(byte: number): string | null {
  // Handle standard ASCII range (0x20-0x7E) with ZX Spectrum specific mappings
  if (byte >= 0x20 && byte <= 0x7e) {
    // ZX Spectrum specific character mappings
    if (byte === 0x5e) return "↑"; // Up-arrow (exponentiation operator)
    if (byte === 0x60) return "£"; // Pound sign
    if (byte === 0x7f) return "©"; // Copyright sign

    // Standard ASCII characters
    return String.fromCharCode(byte);
  }

  // Handle extended ZX Spectrum characters
  if (byte >= 0x80 && byte <= 0x8f) {
    // 2×2 Block Graphics characters - ZX Spectrum specific patterns
    // Based on official ZX Spectrum documentation: "patterns of black and white blobs"
    // Mappings to Unicode Block Elements (U+2580-U+259F) representing actual ZX patterns
    const blockGraphicsMap: Record<number, string> = {
      0x80: " ", // space - No quadrants filled
      0x81: "▝", // U+259D QUADRANT UPPER LEFT
      0x82: "▘", // U+2598 QUADRANT UPPER RIGHT
      0x83: "▀", // U+2580 UPPER HALF BLOCK
      0x84: "▗", // U+2597 QUADRANT LOWER RIGHT
      0x85: "▐", // U+2590 RIGHT HALF BLOCK
      0x86: "▚", // U+259A QUADRANT LOWER LEFT
      0x87: "▜", // U+259C QUADRANT UPPER LEFT AND LOWER RIGHT AND LOWER LEFT
      0x88: "▖", // U+2596 QUADRANT LOWER LEFT
      0x89: "▞", // U+259E QUADRANT UPPER RIGHT AND LOWER LEFT AND LOWER RIGHT
      0x8a: "▌", // U+258C LEFT HALF BLOCK
      0x8b: "▛", // U+259B QUADRANT UPPER LEFT AND LOWER RIGHT AND LOWER LEFT
      0x8c: "▄", // U+2584 LOWER HALF BLOCK
      0x8d: "▟", // U+259F QUADRANT LOWER RIGHT AND LOWER LEFT AND UPPER RIGHT
      0x8e: "▙", // U+2599 QUADRANT LOWER LEFT AND UPPER LEFT AND LOWER RIGHT
      0x8f: "█", // U+2588 FULL BLOCK
    };

    return blockGraphicsMap[byte] || null;
  }

  // User-Defined Graphics (UDG) range - return placeholder for now
  if (byte >= 0x90 && byte <= 0xa2) {
    const udgIndex = byte - 0x90;
    return `{UDG:${udgIndex.toString().padStart(2, "0")}}`;
  }

  // BASIC tokens (0xA3-0xFF) - return null as they should be handled by token map
  if (byte >= 0xa3 && byte <= 0xff) {
    return null;
  }

  // Control codes and undefined ranges
  if (byte < 0x20 || (byte >= 0x00 && byte <= 0x1f)) {
    // Return null for control codes (they should be handled separately)
    return null;
  }

  // Fallback for any other unmapped bytes
  return null;
}

/**
 * Maps Unicode character to ZX Spectrum byte
 * Returns null for unmapped characters
 */
export function unicodeToZxByte(char: string): number | null {
  if (char.length !== 1) return null;

  const code = char.charCodeAt(0);

  // Handle ZX Spectrum specific Unicode characters
  if (char === "↑") return 0x5e; // Up-arrow
  if (char === "£") return 0x60; // Pound sign
  if (char === "©") return 0x7f; // Copyright sign

  // Handle block graphics characters - ZX Spectrum specific patterns
  const unicodeBlockGraphicsMap: Record<string, number> = {
    " ": 0x80, // space - No quadrants filled
    "▝": 0x81, // U+259D QUADRANT UPPER LEFT
    "▘": 0x82, // U+2598 QUADRANT UPPER RIGHT
    "▀": 0x83, // U+2580 UPPER HALF BLOCK
    "▗": 0x84, // U+2597 QUADRANT LOWER RIGHT
    "▐": 0x85, // U+2590 RIGHT HALF BLOCK
    "▚": 0x86, // U+259A QUADRANT LOWER LEFT
    "▜": 0x87, // U+259C QUADRANT UPPER LEFT AND LOWER RIGHT AND LOWER LEFT
    "▖": 0x88, // U+2596 QUADRANT LOWER LEFT
    "▞": 0x89, // U+259E QUADRANT UPPER RIGHT AND LOWER LEFT AND LOWER RIGHT
    "▌": 0x8a, // U+258C LEFT HALF BLOCK
    "▛": 0x8b, // U+259B QUADRANT UPPER LEFT AND LOWER RIGHT AND LOWER LEFT
    "▄": 0x8c, // U+2584 LOWER HALF BLOCK
    "▟": 0x8d, // U+259F QUADRANT LOWER RIGHT AND LOWER LEFT AND UPPER RIGHT
    "▙": 0x8e, // U+2599 QUADRANT LOWER LEFT AND UPPER LEFT AND LOWER RIGHT
    "█": 0x8f, // U+2588 FULL BLOCK
  };

  if (unicodeBlockGraphicsMap[char]) {
    return unicodeBlockGraphicsMap[char];
  }

  // Handle UDG notation (e.g., "{UDG:01}")
  if (char === "{") return null; // UDG notation handled separately

  // Handle standard ASCII range
  if (code >= 0x20 && code <= 0x7e) {
    return code;
  }

  // All other characters are unmapped
  return null;
}

/**
 * Check if a character is a ZX Spectrum block graphics character
 */
export function isZxBlockGraphics(char: string): boolean {
  const byte = unicodeToZxByte(char);
  return byte !== null && byte >= 0x80 && byte <= 0x8f;
}

/**
 * Check if a byte is a ZX Spectrum block graphics byte
 */
export function isZxBlockGraphicsByte(byte: number): boolean {
  return byte >= 0x80 && byte <= 0x8f;
}

/**
 * Get all supported ZX Spectrum block graphics characters
 */
export function getZxBlockGraphicsChars(): string[] {
  const chars: string[] = [];
  for (let byte = 0x80; byte <= 0x8f; byte++) {
    const char = zxByteToUnicode(byte);
    if (char) {
      chars.push(char);
    }
  }
  return chars;
}
