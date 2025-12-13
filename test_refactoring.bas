10 REM Test file for refactoring features
20 LET result = 10 + 20 * 30
30 PRINT result
40 GOTO 20
50 REM This is a test for line renumbering
60 PRINT "Hello World"
70 GOSUB 100
80 END
100 PRINT "Subroutine"
110 RETURN