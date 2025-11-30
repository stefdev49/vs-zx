import { getFoldingRanges } from './folding-utils';

type ExampleSettings = Parameters<typeof getFoldingRanges>[1];

const baseSettings: ExampleSettings = {
  maxNumberOfProblems: 200,
  model: '48K',
  strictMode: false,
  lineNumberIncrement: 10,
  maxLineLength: 255,
  uppercaseKeywords: true,
  trace: { server: 'off' },
  logging: { level: 'off' },
};

describe('Folding range regression', () => {
  it('does not create a subroutine folding range when RETURN is missing', () => {
    const program = [
      '10 GOSUB 200',
      '20 PRINT "MAIN"',
      '30 END',
      '200 PRINT "SUB"',
      '210 PRINT "STILL SUB"'
    ].join('\n');

    const ranges = getFoldingRanges(program, baseSettings);
    const hasOrphanSubroutineFold = ranges.some(range => range.startLine === 3);

    expect(hasOrphanSubroutineFold).toBe(false);
  });
});
