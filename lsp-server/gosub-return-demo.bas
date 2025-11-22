REM Demonstration of GOSUB/RETURN diagnostics
REM This file shows warnings for unbalanced subroutines

10 REM Valid GOSUB/RETURN
20 GOSUB 1000
30 PRINT "Back from subroutine"
40 STOP

1000 REM Subroutine 1
1010 PRINT "In subroutine"
1020 RETURN

2000 REM Multiple RETURN for one GOSUB (allowed)
2010 IF A = 1 THEN RETURN
2020 IF A = 2 THEN RETURN
2030 RETURN

100 REM ERROR: GOSUB without RETURN
110 GOSUB 3000
120 STOP

3000 REM Missing RETURN
3010 PRINT "Oops, no RETURN"
REM LSP will warn about GOSUB without RETURN

200 REM ERROR: RETURN without GOSUB
210 PRINT "No subroutine call"
220 RETURN
REM LSP will warn about RETURN without GOSUB

300 REM Valid: Multiple subroutines
310 GOSUB 4000
320 GOSUB 5000
330 STOP

4000 PRINT "Sub 1"
4010 RETURN

5000 PRINT "Sub 2"
5010 RETURN
