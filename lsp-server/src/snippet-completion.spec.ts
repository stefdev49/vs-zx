import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

describe('Snippet Completions', () => {
  const testSnippets = [
    {
      label: 'for',
      detail: 'FOR loop snippet',
      insertText: 'FOR ${1:i} = ${2:1} TO ${3:10}${4:: code:: NEXT $1}',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'if',
      detail: 'IF/THEN snippet',
      insertText: 'IF ${1:condition} THEN ${2:statement}',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'gosub',
      detail: 'GOSUB subroutine snippet',
      insertText: 'GOSUB ${1:2000}${2:\n2000 REM subroutine\n${3:code}\nRETURN}',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'repeat',
      detail: 'DO/LOOP repeat snippet',
      insertText: '${1:10} REM repeat\n${2:code}\nGOTO $1',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'data',
      detail: 'DATA statement snippet',
      insertText: 'DATA ${1:value1}, ${2:value2}, ${3:value3}',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'dim',
      detail: 'DIM array snippet',
      insertText: 'DIM ${1:array}(${2:10})',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'input',
      detail: 'INPUT statement snippet',
      insertText: 'INPUT "${1:prompt}"; ${2:variable}',
      kind: CompletionItemKind.Snippet
    },
    {
      label: 'print',
      detail: 'PRINT statement snippet',
      insertText: 'PRINT ${1:expression}',
      kind: CompletionItemKind.Snippet
    }
  ];

  describe('Filtering snippets by prefix', () => {
    const testPrefixes = ['f', 'i', 'g', 'd', 'r', 'p'];

    testPrefixes.forEach(prefix => {
      it(`filters snippets starting with '${prefix}'`, () => {
        const filtered = testSnippets.filter(s => s.label.toLowerCase().startsWith(prefix.toLowerCase()));
        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach(snippet => {
          expect(snippet.label.toLowerCase().startsWith(prefix.toLowerCase())).toBe(true);
        });
      });
    });
  });

  describe('Snippet properties', () => {
    testSnippets.forEach(snippet => {
      it(`has correct properties for ${snippet.label.toUpperCase()}`, () => {
        expect(snippet.detail).toBeTruthy();
        expect(snippet.insertText).toBeTruthy();
        expect(snippet.kind).toBe(CompletionItemKind.Snippet);
      });
    });
  });
});
