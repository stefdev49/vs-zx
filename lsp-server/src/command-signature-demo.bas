10 REM Command signature help demo
20 REM Hover your cursor at the start of each command to see signature help

30 REM Type 'PRINT ' to see signature
40 PRINT "Hello, World!"; " Test"

50 REM Type 'INPUT ' to see signature
60 INPUT "Enter name: "; name$

70 REM Type 'FOR ' to see signature
80 FOR i = 1 TO 10 STEP 2

90 REM Type 'PLOT ' to see signature
100 PLOT 128, 88

110 REM Type 'BEEP ' to see signature
120 BEEP 50, 6

130 REM Type 'GOSUB ' to see signature
140 GOSUB 500

150 REM Type 'GOTO ' to see signature (usually BAD practice!)
160 GOTO 200

200 REM Type 'POKE ' to see signature
210 POKE 23296, 255

300 REM Type 'DIM ' to see signature
310 DIM arr(100)

400 REM Type 'IF ' to see signature
410 IF x > 0 THEN PRINT "positive"

500 REM Subroutine
510 LET result = i * 2
520 NEXT i
530 RETURN

999 END
