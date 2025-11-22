10 REM Demo of GO TO and GO SUB forms
20 PRINT "Testing single-word forms"
30 GOTO 100
40 GOSUB 1000

50 PRINT "Testing two-word forms"
60 GO TO 200
70 GO SUB 2000

80 REM GO can still be used as variable
90 LET GO = 42
95 PRINT "GO variable = "; GO
99 STOP

100 REM Single-word GOTO target
110 PRINT "Reached via GOTO"
120 GOTO 40

200 REM Two-word GO TO target
210 PRINT "Reached via GO TO"
220 GOTO 70

1000 REM Single-word GOSUB subroutine
1010 PRINT "In GOSUB subroutine"
1020 RETURN

2000 REM Two-word GO SUB subroutine
2010 PRINT "In GO SUB subroutine"
2020 RETURN
