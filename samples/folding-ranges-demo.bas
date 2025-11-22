REM Folding Ranges Demo
REM This file demonstrates VS Code code folding capabilities

REM CODE FOLDING allows collapsing code sections to focus on specific parts
REM Click the - (minus) icon in the gutter to fold/unfold sections

REM ===== FOR LOOP FOLDING =====
REM FOR...NEXT loops are automatically foldable

10 REM Simple loop
20 FOR i = 1 TO 10
30   PRINT "Count: "; i
40   LET sum = sum + i
50 NEXT i

REM ===== NESTED FOR LOOPS =====
REM Nested loops create nested folding regions

100 REM Multiplication table
110 FOR row = 1 TO 10
120   FOR col = 1 TO 10
130     PRINT row * col; " ";
140   NEXT col
150   PRINT ""
160 NEXT row

REM ===== SUBROUTINE FOLDING =====
REM Subroutines (from line number to RETURN) are foldable

200 REM Main program
210 PRINT "Calling first subroutine..."
220 GOSUB 1000
230 PRINT "Back from first subroutine"
240 PRINT "Calling second subroutine..."
250 GOSUB 2000
260 PRINT "Back from second subroutine"
270 END

REM ===== FIRST SUBROUTINE =====
REM This entire block (from 1000 to RETURN) can be folded
REM All GOSUB calls to line 1000 reference this subroutine

1000 REM Subroutine 1: Calculate Factorial
1010 REM Parameter: x (input value)
1020 LET fact = 1
1030 FOR i = 1 TO x
1040   LET fact = fact * i
1050 NEXT i
1060 PRINT "Factorial of "; x; " is "; fact
1070 RETURN

REM ===== SECOND SUBROUTINE =====
REM Another foldable subroutine block

2000 REM Subroutine 2: Print Pattern
2010 REM Prints a simple pattern
2020 FOR row = 1 TO 5
2030   FOR col = 1 TO row
2040     PRINT "*";
2050   NEXT col
2060   PRINT ""
2070 NEXT row
2080 RETURN

REM ===== DATA BLOCK FOLDING =====
REM Consecutive DATA statements are grouped and foldable

3000 REM Data section
3010 DATA 10, 20, 30
3020 DATA 40, 50, 60
3030 DATA 70, 80, 90

REM ===== MORE SUBROUTINES =====
REM Additional examples of foldable code

5000 REM Initialize Arrays
5010 DIM values(10)
5020 DIM results(10)
5030 GOSUB 6000
5040 END

6000 REM Subroutine 3: Fill Array
6010 FOR i = 1 TO 10
6020   LET values(i) = i * 10
6030 NEXT i
6040 RETURN

REM ===== COMPLEX NESTED STRUCTURE =====
REM Shows multiple levels of folding

7000 REM Complex structure
7010 FOR i = 1 TO 3
7020   FOR j = 1 TO 3
7030     PRINT i; ", "; j
7040     GOSUB 8000
7050   NEXT j
7060 NEXT i
7070 END

8000 REM Inner subroutine
8010 REM Called from nested loops
8020 LET temp = i * j
8030 PRINT " = "; temp
8040 RETURN

REM ===== FOLDING REGIONS SUMMARY =====
REM 1. FOR...NEXT loops are automatically foldable
REM 2. Nested FOR loops create nested folding regions
REM 3. GOSUB target to RETURN is foldable
REM 4. Consecutive DATA statements are grouped
REM 5. Click the - icon in the line number gutter to fold/unfold

REM ===== HOW TO USE FOLDING =====
REM 1. Look for - icons in the left gutter (line number area)
REM 2. Click - to collapse a code block
REM 3. Click + to expand a collapsed block
REM 4. Ctrl+K Ctrl+0 (zero) to fold all regions
REM 5. Ctrl+K Ctrl+J to unfold all regions
REM 6. Ctrl+K Ctrl+1,2,3 to fold to specific depth

REM ===== BENEFITS OF CODE FOLDING =====
REM - Focus on specific sections of code
REM - Hide implementation details while reviewing structure
REM - Navigate large programs more easily
REM - Reduce visual clutter
REM - Find sections quickly by their folding structure

REM ===== FOLDABLE STRUCTURES =====
REM - FOR...NEXT blocks: Lines from FOR to corresponding NEXT
REM - Subroutines: Lines from subroutine start to RETURN
REM - DATA blocks: Consecutive DATA statements grouped together
