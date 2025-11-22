REM Semantic Tokens Highlighting Demo
REM This file demonstrates VS Code semantic highlighting with ZX BASIC

REM LINE NUMBERS are highlighted in special color (lineNumber token type)
10 REM This line demonstrates semantic highlighting
20 PRINT "Semantic tokens provide rich syntax highlighting"
30 LET name$ = "ZX Spectrum"
40 LET count% = 42

REM KEYWORDS are highlighted (keyword token type)
50 IF count% > 10 THEN PRINT "Count is large"
60 FOR i = 1 TO 10
70 PRINT i
80 NEXT i

REM STRING VARIABLES (ending with $) get special color (stringVariable type)
100 LET name$ = "Alice"
110 LET message$ = "Hello, " + name$
120 PRINT message$

REM NUMERIC VARIABLES (ending with %) get special color (numericVariable type)
150 LET x% = 10
160 LET y% = 20
170 PRINT x% + y%

REM ARRAYS are highlighted differently (array token type)
REM This is detected when identifier is followed by (
200 DIM data(100)
210 DIM matrix(10, 10)
220 LET data(1) = 99
230 PRINT data(1)

REM COMMENTS (REM lines) are highlighted (comment token type)
300 REM This entire line is a comment
310 PRINT "Not a comment"
320 REM Another comment line

REM UNDEFINED VARIABLES are highlighted differently (undefined type)
400 LET result = undefined_var + 10
410 PRINT undefined_var

REM DEFINED VARIABLES maintain normal highlighting
500 LET temp = 0
510 LET temp = 100
520 PRINT temp

REM GOSUB TARGETS are highlighted (gotoTarget type when targeted)
600 GOSUB 2000
610 GOTO 700

REM Functions within expressions get function type highlighting
700 PRINT SIN(3.14159)
710 PRINT COS(0)
720 PRINT ABS(-42)
730 PRINT LEN("hello")

REM Subroutines have semantic highlighting
2000 REM This is a subroutine
2010 LET sub_result = 42
2020 RETURN

REM Multiple statements on one line (colon separator)
3000 LET a = 1 : LET b = 2 : PRINT a + b

REM Variable usage tracking
REM - First assignment creates the variable
REM - Subsequent uses reference it
REM - Undefined uses are highlighted differently
5000 LET first_var = 10
5010 LET first_var = first_var + 1
5020 LET second_var = first_var + unknown_var

REM Token highlighting summary:
REM - lineNumber: cyan/blue (line 10, 20, 30, etc.)
REM - keyword: orange/magenta (LET, IF, FOR, PRINT, etc.)
REM - stringVariable: green ($-suffix variables)
REM - numericVariable: purple (%-suffix variables)
REM - array: teal (array names)
REM - variable: default (regular variables)
REM - undefined: red/error color (undefined variables)
REM - comment: gray/muted (REM lines)
REM - function: yellow (SIN, COS, ABS, LEN, etc.)
REM - gotoTarget: underline or special highlight (GOTO/GOSUB targets)
