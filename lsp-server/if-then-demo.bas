REM Demonstration of IF/THEN validation
REM This file shows errors for missing THEN

10 REM Valid IF/THEN statements
20 IF A = 5 THEN PRINT "A equals 5"
30 IF B < 10 THEN GOTO 100
40 IF C > 0 THEN LET X = 1: PRINT X

50 REM ERROR: IF without THEN
60 IF A = 5 PRINT "Missing THEN!"
70 REM LSP will error: IF statement missing THEN keyword

80 REM ERROR: IF without THEN (GOSUB)
90 IF X < 10 GOSUB 2000
REM LSP will error: IF statement missing THEN keyword

100 REM Valid: Complex THEN conditions
110 IF (A > 5 AND B < 10) OR C = 0 THEN PRINT "Complex"
120 IF A$ = "YES" THEN LET FLAG = 1

200 REM ERROR: Multiple errors
210 IF X = 1 PRINT "Missing THEN"
220 IF Y = 2 PRINT "Also missing"

1000 STOP

2000 REM Subroutine
2010 PRINT "In subroutine"
2020 RETURN
