
import { autoRenumberLines } from '../formatting-utils';
import { TextDocument } from 'vscode-languageserver-textdocument';

function createDoc(content: string): TextDocument {
    return TextDocument.create('test://test.bas', 'zx-basic', 1, content);
}

describe('Auto Renumbering', () => {
    it('should renumber with default settings (10, 10)', () => {
        const content = '5 PRINT "a"\n15 PRINT "b"';
        const doc = createDoc(content);
        const result = autoRenumberLines(doc);

        // Apply edits to see result
        let newText = content;
        // Apply in reverse order to avoid offset issues
        for (const edit of result.edits.reverse()) {
            // simplified application for test
            newText = newText.replace(edit.newText.trim(), edit.newText.trim()); // wait, textEdit has range.
            // Easier: just check if logic produced expected edits
        }

        // Instead of applying edits, let's check the result structure
        // We know simple replacement: 5 -> 10, 15 -> 20
        const sortedEdits = result.edits.sort((a, b) => a.range.start.line - b.range.start.line);

        expect(sortedEdits.length).toBe(2);
        expect(sortedEdits[0].newText).toContain('10 ');
        expect(sortedEdits[1].newText).toContain('20 ');
    });

    it('should renumber with custom increment', () => {
        const content = '10 PRINT "a"\n20 PRINT "b"';
        const doc = createDoc(content);
        const result = autoRenumberLines(doc, 100, 100); // Start 100, Inc 100

        expect(result.edits[0].newText).toBe('100 PRINT "a"');
        expect(result.edits[1].newText).toBe('200 PRINT "b"');
    });

    it('should update GOTO targets', () => {
        const content = '10 GOTO 30\n20 PRINT "skip"\n30 PRINT "target"';
        const doc = createDoc(content);
        // Renumber 100, 10
        // 10 -> 100
        // 20 -> 110
        // 30 -> 120
        // GOTO 30 should become GOTO 120

        const result = autoRenumberLines(doc, 100, 10);

        // Line 1 edit: "10 GOTO 30" -> "100 GOTO 120"
        expect(result.edits[0].newText).toBe('100 GOTO 120');
        expect(result.edits[2].newText).toBe('120 PRINT "target"');
    });

    it('should update GOSUB targets', () => {
        const content = '10 GOSUB 100\n100 RETURN';
        const doc = createDoc(content);
        // Renumber 10, 10 -> 10, 20
        // 10 -> 10
        // 100 -> 20
        // GOSUB 100 -> GOSUB 20

        const result = autoRenumberLines(doc, 10, 10);

        expect(result.edits[0].newText).toBe('10 GOSUB 20');
        expect(result.edits[1].newText).toBe('20 RETURN');
    });
});
