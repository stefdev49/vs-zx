2 PRINT "RS232 TEST: ";
5 REM The first part of the RS232 test checks the data send/receive, and the second part checks the DTR
6 REM function. If the RS232 function still does not work despite passing these two tests, the ULA must
7 REM be functioning and the voltage levels between the ULA and the RS232 Socket Should be checked.
10 OUT 239,255: OUT 247,1
20 IF IN 247<128 THEN GO TO 99
25 PRINT "PASS 0; ";
30 OUT 247, 0
40 IF IN 247>127 THEN GO TO 90
50 PRINT "PASS 1; ";
70 GO SUB 200
80 IF NOT d THEN GO TO 99
85 OUT 239,239: GO SUB 200
87 IF d THEN GO TO 99
90 PRINT "PASS 2 ": GO TO 100
99 PRINT "FAIL ": STOP
100 PRINT "NET TEST: ";
120 OUT 239,254: OUT 247,1
130 LET d=IN 247: IF INT (d/2)<>d/2 THEN GO TO 99
140 OUT 247, 0
150 LET d=IN 247: IF INT (d/2)=d/2 THEN GO TO 99
160 PRINT "PASS ": STOP
200 LET d=IN 239: FOR i=7 TO 4 STEP -1: IF d>=2^i THEN LET d=d-2^i
220 NEXT i: LET d=(d>7): RETURN