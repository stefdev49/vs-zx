import { TOKEN_MAP, TokenInfo } from './token-map';

const REM_TOKEN = 0xea;
const DEFFN_TOKEN = 0xce;
const THEN_TOKEN = 0xcb;
const COLON_TOKEN = ':'.charCodeAt(0);
const BIN_TOKEN = 0xc4;
const MAX_BASIC_LINE = 10000;
const MAX_TAP_SIZE = 41500;
const EOL = 0x0d;
const TAB_CHAR = 0x06;

export interface Bas2TapOptions {
  programName?: string;
  autostart?: number;
  quiet?: boolean;
  suppressWarnings?: boolean;
  caseInsensitive?: boolean;
  checkSyntax?: boolean;
}

export interface ConvertArtifacts {
  raw: Buffer;
  tap: Buffer;
  warnings: string[];
}

export interface ObjectInfo {
  lineNumber: number;
  offset: number;
  length: number;
}

interface PreparedLine {
  lineNumber: number;
  prepared: string;
}

interface LineBuildResult {
  lineNumber: number;
  bytes: number[];
}

interface ConversionState {
  previousLineNumber: number;
  warnings: string[];
  caseInsensitive: boolean;
  suppressWarnings: boolean;
}

export function convertBasicSource(
  source: string,
  options: Bas2TapOptions = {}
): ConvertArtifacts {
  const state: ConversionState = {
    previousLineNumber: -1,
    warnings: [],
    caseInsensitive:
      options.caseInsensitive === undefined ? true : options.caseInsensitive,
    suppressWarnings: Boolean(options.suppressWarnings)
  };

  const rawLines: number[][] = [];
  const physicalLines = source.replace(/\r\n?/g, '\n').split('\n');

  physicalLines.forEach((line, index) => {
    const prepared = prepareLine(line, index + 1, state);
    if (!prepared) {
      return;
    }

    const built = buildLine(prepared, state);
    if (built) {
      rawLines.push(built.bytes);
    }
  });

  // Build raw buffer and collect per-object offsets/lengths
  const objects: ObjectInfo[] = [];
  const parts: Buffer[] = [];
  let currentOffset = 0;
  rawLines.forEach(bytes => {
    const buf = Buffer.from(bytes);
    parts.push(buf);
    const ln = (buf[0] << 8) | buf[1];
    objects.push({ lineNumber: ln, offset: currentOffset, length: buf.length });
    currentOffset += buf.length;
  });
  const rawBuffer = Buffer.concat(parts);

  if (rawBuffer.length > MAX_TAP_SIZE) {
    throw new Error('ERROR - Object file too large');
  }

  const programName = (options.programName ?? '').slice(0, 10);
  const tapBuffer = buildTap(rawBuffer, programName, options.autostart ?? 0x8000);

  return {
    raw: rawBuffer,
    tap: tapBuffer,
    warnings: state.warnings
  };
}

export function convertBasicWithObjects(source: string, options: Bas2TapOptions = {}): { artifacts: ConvertArtifacts; objects: ObjectInfo[] } {
  const artifacts = convertBasicSource(source, options);
  const objects: ObjectInfo[] = [];
  const state: ConversionState = {
    previousLineNumber: -1,
    warnings: [],
    caseInsensitive: options.caseInsensitive === undefined ? true : options.caseInsensitive,
    suppressWarnings: Boolean(options.suppressWarnings)
  };
  const physicalLines = source.replace(/\r\n?/g, '\n').split('\n');
  let currentOffset = 0;
  physicalLines.forEach((line, index) => {
    const prepared = prepareLine(line, index + 1, state);
    if (!prepared) return;
    const built = buildLine(prepared, state);
    if (built) {
      objects.push({ lineNumber: built.lineNumber, offset: currentOffset, length: built.bytes.length });
      currentOffset += built.bytes.length;
    }
  });
  return { artifacts, objects };
}

function prepareLine(line: string, fileLineNo: number, state: ConversionState): PreparedLine | null {
  let inString = false;
  let doingRem = false;
  let singleSeparator = false;
  const output: string[] = [];

  for (let idx = 0; idx < line.length; idx++) {
    const ch = line[idx];
    const code = ch.charCodeAt(0);

    if (ch === '\t') {
      output.push(String.fromCharCode(TAB_CHAR));
      continue;
    }

    if (code < 32 || code > 126) {
      if (code === 0x0d || code === 0x0a) {
        continue;
      }
      throw new Error(
        `ERROR - ASCII line ${fileLineNo} contains a bad character (code ${code.toString(16)}h)`
      );
    }

    if (!doingRem) {
      const upperAhead = line.slice(idx).toUpperCase();
      if (upperAhead.startsWith(' REM ') || upperAhead.startsWith(':REM ')) {
        doingRem = true;
      }
    }

    if (inString || doingRem) {
      output.push(ch);
    } else if (ch === ' ') {
      if (!singleSeparator) {
        output.push(ch);
        singleSeparator = true;
      }
    } else {
      singleSeparator = false;
      output.push(ch);
    }

    if (ch === '"' && !doingRem) {
      inString = !inString;
    }
  }

  const prepared = output.join('');
  const lineNumberMatch = prepared.match(/^(\s*)(\d+)/);

  if (!lineNumberMatch) {
    if (prepared.trim().length === 0) {
      if (!state.suppressWarnings) {
        state.warnings.push(`WARNING - Skipping empty ASCII line ${fileLineNo}`);
      }
      return null;
    }
    throw new Error(`ERROR - Missing line number in ASCII line ${fileLineNo}`);
  }

  const lineNumber = parseInt(lineNumberMatch[2], 10);
  if (Number.isNaN(lineNumber)) {
    throw new Error(`ERROR - Missing line number in ASCII line ${fileLineNo}`);
  }

  if (lineNumber >= MAX_BASIC_LINE) {
    throw new Error(`ERROR - Line number ${lineNumber} is larger than the maximum allowed`);
  }

  if (state.previousLineNumber >= 0) {
    if (lineNumber < state.previousLineNumber) {
      throw new Error(
        `ERROR - Line number ${lineNumber} is smaller than previous line number ${state.previousLineNumber}`
      );
    } else if (lineNumber === state.previousLineNumber && !state.suppressWarnings) {
      state.warnings.push(`WARNING - Duplicate use of line number ${lineNumber}`);
    }
  }

  state.previousLineNumber = lineNumber;
  const rest = prepared.slice(lineNumberMatch[0].length).trimStart();
  if (!rest.length) {
    throw new Error(`ERROR - Line ${lineNumber} contains no statements!`);
  }

  return { lineNumber, prepared: rest + '\r' };
}

function buildLine(prepped: PreparedLine, state: ConversionState): LineBuildResult | null {
  const content = prepped.prepared;
  const bytes: number[] = new Array(4).fill(0);
  let resultIndex = 4;
  let idx = 0;
  let inString = false;
  let expectKeyword = true;
  let handlingDefFn = false;
  let insideDefFn = false;
  let bracketCount = 0;

  const appendByte = (value: number) => {
    bytes[resultIndex++] = value & 0xff;
  };

  const appendChar = (ch: string) => {
    appendByte(ch.charCodeAt(0));
  };

  while (idx < content.length) {
    const ch = content[idx];
    if (ch === '\r') {
      break;
    }

    if (inString) {
      if (ch === '"') {
        inString = false;
        appendChar(ch);
        idx++;
        while (content[idx] === ' ') idx++;
        continue;
      }

      const expanded = expandSequence(content, idx, appendByte, true);
      if (expanded.consumed > 0) {
        idx += expanded.consumed;
        continue;
      }

      appendChar(ch);
      idx++;
      continue;
    }

    if (ch === '"') {
      if (expectKeyword) {
        throw new Error(
          `ERROR in line ${prepped.lineNumber} - Expected keyword but got quote`
        );
      }
      inString = true;
      appendChar(ch);
      idx++;
      continue;
    }

    if (expectKeyword) {
      const match = matchToken(content, idx, true, state.caseInsensitive);
      if (!match) {
        throw new Error(
          `ERROR in line ${prepped.lineNumber} - Expected keyword but got "${content[idx] ?? ''}"`
        );
      }
      appendByte(match.code);
      idx = match.nextIndex;
      if (match.code !== COLON_TOKEN) {
        expectKeyword = false;
      }
      if (match.code === REM_TOKEN) {
        while (idx < content.length && content[idx] !== '\r') {
          const expanded = expandSequence(content, idx, appendByte, false);
          if (expanded.consumed > 0) {
            idx += expanded.consumed;
            continue;
          }
          appendChar(content[idx++]);
        }
        break;
      }
      if (match.code === DEFFN_TOKEN) {
        handlingDefFn = true;
        insideDefFn = false;
      }
      continue;
    }

    if (ch === '(') {
      bracketCount++;
      appendChar(ch);
      idx++;
      if (handlingDefFn && !insideDefFn) {
        insideDefFn = true;
      }
      continue;
    }

    if (ch === ')') {
      bracketCount--;
      appendChar(ch);
      idx++;
      if (handlingDefFn && insideDefFn) {
        for (let fill = 0; fill < 6; fill++) {
          appendByte(fill === 0 ? 0x0e : 0x00);
        }
        handlingDefFn = false;
        insideDefFn = false;
      }
      continue;
    }

    const nonKeywordMatch = matchToken(content, idx, false, state.caseInsensitive);
    if (nonKeywordMatch) {
      appendByte(nonKeywordMatch.code);
      idx = nonKeywordMatch.nextIndex;
      if (nonKeywordMatch.code === THEN_TOKEN || nonKeywordMatch.code === COLON_TOKEN) {
        expectKeyword = true;
        handlingDefFn = false;
      }
      if (nonKeywordMatch.code === BIN_TOKEN) {
        const binResult = handleBinaryLiteral(
          content,
          idx,
          appendByte,
          prepped.lineNumber
        );
        idx += binResult.consumed;
      }
      continue;
    }

    const numberBytes = handleNumberLiteral(content, idx, appendByte);
    if (numberBytes.consumed > 0) {
      idx += numberBytes.consumed;
      continue;
    }

    const expanded = expandSequence(content, idx, appendByte, true);
    if (expanded.consumed > 0) {
      idx += expanded.consumed;
      continue;
    }

    if (ch === ' ') {
      appendByte(0x20);
      while (idx < content.length && content[idx] === ' ') {
        idx++;
      }
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      while (idx < content.length && /[A-Za-z0-9\$]/.test(content[idx])) {
        appendChar(content[idx++]);
      }
      continue;
    }

    appendChar(ch);
    idx++;
  }

  appendByte(EOL);

  const totalLen = resultIndex;
  const logicalLen = totalLen - 4;
  bytes[0] = (prepped.lineNumber >> 8) & 0xff;
  bytes[1] = prepped.lineNumber & 0xff;
  bytes[2] = logicalLen & 0xff;
  bytes[3] = (logicalLen >> 8) & 0xff;

  return { lineNumber: prepped.lineNumber, bytes: bytes.slice(0, totalLen) };
}

function matchToken(
  line: string,
  start: number,
  wantKeyword: boolean,
  caseInsensitive: boolean
): { code: number; nextIndex: number } | null {
  if (line[start] === ':') {
    return { code: COLON_TOKEN, nextIndex: skipSpaces(line, start + 1) };
  }

  let bestMatch: { code: number; length: number; nextIndex: number } | null = null;

  for (let code = 0xa3; code < TOKEN_MAP.length; code++) {
    const entry = TOKEN_MAP[code];
    if (!entry.token) {
      continue;
    }
    const token = entry.token;
    if (token.length === 0) {
      continue;
    }

    const matchEnd = matchTokenAt(line, start, token, caseInsensitive);
    if (matchEnd === null) {
      continue;
    }

    const trimmedToken = token.trimEnd();
    const lastChar = trimmedToken[trimmedToken.length - 1];
    const nextChar = line[matchEnd];
    if (isAlpha(lastChar) && isAlpha(nextChar)) {
      continue;
    }

    if (!bestMatch || token.length > bestMatch.length) {
      bestMatch = {
        code,
        length: token.length,
        nextIndex: skipSpaces(line, matchEnd)
      };
    }
  }

  if (!bestMatch) {
    return null;
  }

  const entry = TOKEN_MAP[bestMatch.code];
  if (wantKeyword && entry.type === 0) {
    return null;
  }
  if (!wantKeyword && entry.type === 1) {
    return null;
  }

  return {
    code: bestMatch.code,
    nextIndex: bestMatch.nextIndex
  };
}

function matchTokenAt(
  line: string,
  start: number,
  token: string,
  caseInsensitive: boolean
): number | null {
  if (!token.includes(' ')) {
    const segment = line.slice(start, start + token.length);
    const matches = caseInsensitive
      ? segment.toUpperCase() === token.toUpperCase()
      : segment === token;
    return matches ? start + token.length : null;
  }

  let lineIdx = start;
  let tokenIdx = 0;

  while (tokenIdx < token.length) {
    const tokenChar = token[tokenIdx];
    if (tokenChar === ' ') {
      while (tokenIdx < token.length && token[tokenIdx] === ' ') {
        tokenIdx++;
      }
      while (lineIdx < line.length && line[lineIdx] === ' ') {
        lineIdx++;
      }
      continue;
    }

    if (lineIdx >= line.length) {
      return null;
    }

    let lineChar = line[lineIdx];
    let expectedChar = tokenChar;
    if (caseInsensitive) {
      lineChar = lineChar.toUpperCase();
      expectedChar = expectedChar.toUpperCase();
    }

    if (lineChar !== expectedChar) {
      return null;
    }

    lineIdx++;
    tokenIdx++;
  }

  return lineIdx;
}

function skipSpaces(line: string, index: number): number {
  while (index < line.length && line[index] === ' ') index++;
  return index;
}

function isAlpha(ch: string | undefined): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function handleBinaryLiteral(
  line: string,
  start: number,
  appendByte: (value: number) => void,
  lineNumber: number
): { consumed: number } {
  let idx = start;
  let value = 0;
  let consumed = 0;

  while (idx < line.length) {
    const ch = line[idx];
    if (ch !== '0' && ch !== '1') {
      break;
    }
    const nextValue = value * 2 + (ch === '1' ? 1 : 0);
    if (nextValue > 0xffff) {
      throw new Error(`ERROR - Number too big in line ${lineNumber}`);
    }
    appendByte(ch.charCodeAt(0));
    value = nextValue;
    idx++;
    consumed++;
  }

  if (consumed === 0) {
    throw new Error(`ERROR in line ${lineNumber} - Expected binary literal after BIN`);
  }

  appendByte(0x0e);
  appendByte(0x00);
  appendByte(0x00);
  appendByte(value & 0xff);
  appendByte((value >> 8) & 0xff);
  appendByte(0x00);

  return { consumed };
}

function handleNumberLiteral(
  line: string,
  start: number,
  appendByte: (value: number) => void
): { consumed: number } {
  let idx = start;
  let sawDigit = false;
  while (idx < line.length && /[0-9]/.test(line[idx])) {
    appendByte(line.charCodeAt(idx));
    idx++;
    sawDigit = true;
  }
  if (line[idx] === '.') {
    appendByte(line.charCodeAt(idx++));
    while (idx < line.length && /[0-9]/.test(line[idx])) {
      appendByte(line.charCodeAt(idx));
      idx++;
      sawDigit = true;
    }
  }
  if (!sawDigit) {
    return { consumed: 0 };
  }

  const asciiLiteral = line.slice(start, idx);
  const numericValue = Number(asciiLiteral);
  if (Number.isNaN(numericValue)) {
    throw new Error('ERROR - Invalid numeric literal');
  }

  const encoded = encodeNumber(numericValue);
  encoded.forEach(appendByte);
  return { consumed: idx - start };
}

function encodeNumber(value: number): number[] {
  const result = [0x0e, 0x00, 0x00, 0x00, 0x00, 0x00];
  const intValue = value | 0;
  if (Number.isFinite(value) && value === intValue && value >= -65536 && value < 65536) {
    result[1] = 0x00;
    if (intValue >= 0) {
      result[2] = 0x00;
    } else {
      result[2] = 0xff;
    }
    let adjusted = intValue;
    if (intValue < 0) {
      adjusted = (intValue + 65536) & 0xffff;
    }
    result[3] = adjusted & 0xff;
    result[4] = (adjusted >> 8) & 0xff;
    result[5] = 0x00;
    return result;
  }

  const sign = value < 0 ? 0x80 : 0x00;
  const absValue = Math.abs(value);
  if (!Number.isFinite(absValue) || absValue === 0) {
    return result;
  }
  const exponent = Math.floor(Math.log2(absValue));
  if (exponent < -129 || exponent > 126) {
    throw new Error('ERROR - Number too big');
  }
  const mantissa = Math.floor(((absValue / Math.pow(2, exponent)) - 1) * Math.pow(2, 31) + 0.5);
  result[1] = (exponent + 0x81) & 0xff;
  result[2] = ((mantissa >>> 24) & 0x7f) | sign;
  result[3] = (mantissa >>> 16) & 0xff;
  result[4] = (mantissa >>> 8) & 0xff;
  result[5] = mantissa & 0xff;
  return result;
}

function expandSequence(
  line: string,
  start: number,
  appendByte: (value: number) => void,
  stripSpaces: boolean
): { consumed: number } {
  if (line[start] !== '{') {
    return { consumed: 0 };
  }
  const rest = line.slice(start + 1);
  if (rest.startsWith('(C)}')) {
    appendByte(0x7f);
    return { consumed: 5 };
  }
  return { consumed: 0 };
}

function buildTap(raw: Buffer, name: string, autostart: number): Buffer {
  // Build header block as struct TapeHeader_s (24 bytes) to match bas2tap.c
  const header = Buffer.alloc(24, 0);
  header[0] = 19; // LenLo1 (dummy length of header part)
  header[1] = 0; // LenHi1
  header[2] = 0x00; // Flag1
  header[3] = 0x00; // HType (file type BASIC)
  for (let i = 0; i < 10; i++) {
    header[4 + i] = (name.charCodeAt(i) || 0x20) & 0xff;
  }

  // Follow bas2tap.c: BlockSize is the total size of all resulting BASIC objects
  // (i.e. the raw program data length). The data block length (Len2) is
  // BlockSize + 2 (flag + checksum). HLen and HBasLen must be set to BlockSize.
  const blockSize = raw.length & 0xffff;

  // HLen (offsets 14-15)
  header[14] = blockSize & 0xff;
  header[15] = (blockSize >> 8) & 0xff;

  // HStart (autostart) (offsets 16-17)
  header[16] = autostart & 0xff;
  header[17] = (autostart >> 8) & 0xff;

  // HBasLen (offsets 18-19)
  header[18] = blockSize & 0xff;
  header[19] = (blockSize >> 8) & 0xff;

  // Parity1 is XOR of header bytes 2..19 (inclusive)
  let parity1 = 0;
  for (let i = 2; i < 20; i++) {
    parity1 ^= header[i];
  }
  header[20] = parity1;

  // Len2 (offsets 21-22) = BlockSize + 2
  const len2 = (blockSize + 2) & 0xffff;
  header[21] = len2 & 0xff;
  header[22] = (len2 >> 8) & 0xff;

  // Flag2 (offset 23) - bas2tap uses 255
  header[23] = 0xff;

  // Data parity: start with Flag2 and XOR all program data bytes (same as bas2tap.c)
  let dataParity = header[23];
  for (let i = 0; i < raw.length; i++) dataParity ^= raw[i];

  return Buffer.concat([header, raw, Buffer.from([dataParity])]);
}
