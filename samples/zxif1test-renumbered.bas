20 PRINT "RS232 TEST: ";
40 REM The first part of the RS232 test checks the data send/receive, and the second part checks the DTR
60 REM function. If the RS232 function still does not work despite passing these two tests, the ULA must
80 REM be functioning and the voltage levels between the ULA and the RS232 Socket Should be checked.
100 OUT 239,255: OUT 247,1
120 IF IN 247<128 THEN GOTO 300
140 OUT 247, 0
160 IF IN 247>127 THEN GOTO 280
180 PRINT "PASS 1; ";
200 GOSUB 440
220 IF NOT d THEN GOTO 300
240 OUT 239,239: GOSUB 440
260 IF d THEN GOTO 300
280 PRINT "PASS 2 ": GOTO 320
300 PRINT "FAIL ": STOP
320 PRINT "NET TEST: ";
340 OUT 239,254: OUT 247,1
360 LET d=IN 247: IF INT (d/2)<>d/2 THEN GOTO 300
380 OUT 247, 0
400 LET d=IN 247: IF INT (d/2)=d/2 THEN GOTO 300
420 PRINT "PASS ": STOP
440 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i THEN LET d=d-2^i
460 NEXT i: LET d=(d>7): RETURN
480 LET RESULT = 2*3+5
500 print RESULT