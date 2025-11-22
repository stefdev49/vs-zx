5 PRINT"Hello"
15let x=10+5
20 for i = 1 to 10
30 print i
40 next i
100gosub 500
200end
500 rem Subroutine
510 print "Sub"
520RETURN

REM After formatting/renumbering:
REM 10 PRINT "Hello"
REM 20 LET X = 10 + 5
REM 30 FOR I = 1 TO 10
REM 40 PRINT I
REM 50 NEXT I
REM 60 GOSUB 80
REM 70 END
REM 80 REM Subroutine
REM 90 PRINT "Sub"
REM 100 RETURN
REM Note: GOSUB 500 becomes GOSUB 80 when line 500 becomes line 80
