10 REM Test Program for Document Symbols
20 PRINT "Starting..."
30 LET score = 0
40 GOSUB 1000
50 PRINT "Score: "; score
60 GOTO 100
100 REM Main Loop
110 INPUT "Enter number: "; n
120 IF n = 0 THEN GOTO 200
130 LET score = score + n
140 GOTO 110
200 REM End Program
210 PRINT "Final score: "; score
220 END
1000 REM Initialize Subroutine
1010 LET score = 0
1020 PRINT "Initialized"
1030 RETURN
2000 REM Another Subroutine
2010 GOSUB 3000
2020 RETURN
3000 REM Nested Subroutine
3010 PRINT "Nested"
3020 RETURN
