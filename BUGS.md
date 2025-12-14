# BUGS

- LSP allow "_" in varaible name which isn't allowed in ZX BASIC
- 3020 PRINT '' INK 5;"    Biorhythms are calculated   from the date of birth"  => char "`" is one empty line
- 1040 DIM n(12): DIM m(12) : 1050 DIM m$(12,9): DATA "january","february","march","april","may","june","july","august","september","october","november","december": FOR n=1 TO 12: READ m$(n): NEXT n => Array 'M' declared with 1 dimension(s) but used with 2 : lsp is messing m and m$ variable