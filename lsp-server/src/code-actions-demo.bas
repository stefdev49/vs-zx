10 REM Code actions demo - try the lightbulb (Ctrl+.) to see quick fixes
15 REM Missing RETURN and NEXT demonstrations

20 GOSUB 100
30 PRINT "Back from subroutine"

40 FOR i = 1 TO 5
50 PRINT i
60 LET squared = i * i

70 REM This program is missing:
80 REM - NEXT i (after line 60)
90 REM - RETURN (after line 105)

100 REM Subroutine
110 PRINT "In subroutine"
120 LET sub_result = 10

999 END
