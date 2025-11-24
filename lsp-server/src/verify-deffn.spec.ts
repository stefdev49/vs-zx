import { ZXBasicLexer, TokenType } from './zxbasic';
import * as fs from 'fs';

describe('Verify DEF FN handling in deffn-demo.bas', () => {
  const content = fs.readFileSync('deffn-demo.bas', 'utf-8');
  const lexer = new ZXBasicLexer();

  const lines = content.split('\n').filter(line => line.trim());

  const deffnLines = lines.filter(line => (line.includes('DEF FN') || line.includes('DEFFN')) && !line.trim().match(/^\d+\s+REM/));

  test('all DEF FN occurrences are properly normalized to DEFFN', () => {
    deffnLines.forEach((line, index) => {
      const tokens = lexer.tokenize(line).filter(t => t.type !== TokenType.EOF);
      console.log(`Line ${index + 1}: "${line.trim()}"`);
      console.log('Tokens:', tokens.map(t => `${t.type}: "${t.value}"`));
      const deffnToken = tokens.find(t => t.value === 'DEFFN');

      expect(deffnToken).toBeDefined();
      expect(deffnToken!.value).toBe('DEFFN');
    });

    expect(deffnLines.length).toBeGreaterThan(0); // Ensure there are lines to test
  });
});
