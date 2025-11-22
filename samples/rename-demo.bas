REM Rename Refactoring Demo
REM This file demonstrates VS Code rename refactoring capabilities

REM RENAME VARIABLES: Right-click on variable, select "Rename Symbol"
REM Example: Rename 'x' to 'counter' - all occurrences updated
10 LET x = 0
20 PRINT "Starting value: "; x
30 LET x = x + 1
40 PRINT "New value: "; x
50 IF x > 10 THEN PRINT "x is large"

REM RENAME STRING VARIABLES: Rename 'name$' to 'playerName$'
100 LET name$ = "Alice"
110 PRINT "Hello, "; name$
120 LET message$ = "Welcome, " + name$
130 PRINT message$

REM RENAME NUMERIC VARIABLES: Rename 'count%' to 'total%'
200 LET count% = 0
210 FOR i = 1 TO 10
220 LET count% = count% + i
230 NEXT i
240 PRINT "Sum: "; count%

REM RENAME ARRAYS: Rename 'data' to 'values'
REM Click on 'data' in the DIM statement or any usage to rename
300 DIM data(100)
310 LET data(1) = 10
320 LET data(2) = 20
330 PRINT "First value: "; data(1)
340 PRINT "Second value: "; data(2)

REM RENAME LINE NUMBERS: Rename '1000' to '1100'
REM This automatically updates all GOTO/GOSUB references
400 PRINT "Calling subroutine..."
410 GOSUB 1000
420 PRINT "Back from subroutine"
430 GOTO 500

REM RENAME GOTO TARGETS: Click on line number in GOSUB/GOTO
REM This updates the line definition and the statement together
500 PRINT "About to call another subroutine"
510 GOSUB 2000
520 END

REM SUBROUTINE 1: Change this line number from 1000
REM When you rename this line to (e.g.) 1100:
REM - The line number itself changes
REM - GOSUB 1000 becomes GOSUB 1100
1000 REM This is subroutine 1
1010 LET x = 42
1020 PRINT "Inside subroutine 1: "; x
1030 RETURN

REM SUBROUTINE 2: Change this line number from 2000
REM When you rename this line to (e.g.) 2100:
REM - The line number itself changes  
REM - GOSUB 2000 becomes GOSUB 2100
2000 REM This is subroutine 2
2010 LET y = 100
2020 PRINT "Inside subroutine 2: "; y
2030 RETURN

REM HOW TO USE RENAME REFACTORING:
REM 1. Right-click on any identifier (variable, line number)
REM 2. Select "Rename Symbol" (or press F2)
REM 3. Type the new name
REM 4. Press Enter or click elsewhere to apply
REM 5. All references are updated automatically

REM WHAT GETS RENAMED:
REM - Variables: All occurrences of that variable name
REM - String variables ($): Only same variable with $ suffix
REM - Numeric variables (%): Only same variable with % suffix
REM - Arrays: All references to that array name
REM - Line numbers: Both the line number definition AND all GOTO/GOSUB targets
REM - Functions: DEF FN definitions and FN calls

REM EXAMPLES OF RENAME SCENARIOS:

REM Scenario 1: Rename variable in loop
3000 LET loop_counter = 0
3010 FOR i = 1 TO 10
3020 LET loop_counter = loop_counter + i
3030 NEXT i
3040 PRINT "Final count: "; loop_counter
REM After rename 'loop_counter' to 'total_sum':
REM - Line 3000: LET total_sum = 0
REM - Line 3020: LET total_sum = total_sum + i
REM - Line 3040: PRINT "Final count: "; total_sum

REM Scenario 2: Rename string variable across multiple lines
4000 LET player_name$ = "Bob"
4010 LET greeting$ = "Hello, " + player_name$
4020 PRINT greeting$
4030 INPUT "New name: "; player_name$
4040 PRINT player_name$
REM After rename 'player_name$' to 'current_player$':
REM - All 4 occurrences of player_name$ are updated

REM Scenario 3: Rename line number with multiple targets
5000 PRINT "Menu"
5010 INPUT "Choose: "; choice
5020 IF choice = 1 THEN GOSUB 6000
5030 IF choice = 2 THEN GOSUB 7000
5040 GOTO 5000
REM After renaming line 6000 to 6100:
REM - Line 5020: GOSUB 6100
REM - Subroutine definition line: 6100 REM...

REM IMPORTANT NOTES:
REM - Rename is case-sensitive
REM - Partial name matches are NOT renamed (whole words only)
REM - Line numbers can be renamed with numeric values only
REM - String/numeric variable suffixes ($ / %) are preserved
