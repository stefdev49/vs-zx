10 REM Phase 1.3 - Statement Parser Demo
20 REM This file demonstrates full statement parsing

30 DIM A(10), B(5,10), C(3,4,5)
40 LET X = 100
50 LET Y = X + 50
60 LET S$ = "Hello World"

70 INPUT "Enter a number: "; N
80 INPUT X, Y, Z

90 PRINT "Values: "; X; Y; Z
100 PRINT "String: "; S$
110 PRINT "Array element: "; A(5)

120 IF X > 50 THEN LET Y = 1000
130 IF S$ = "test" THEN PRINT "Match!"
140 IF Y < 100 THEN GOTO 200

150 FOR I = 1 TO 10
160 FOR J = 1 TO 5 STEP 2
170 LET A(I) = I * J
180 NEXT J
190 NEXT I

200 READ N1, N2, N3
210 GOSUB 500
220 GOTO 600

300 DATA 10, 20, 30
310 DATA 40, 50, 60

500 REM Subroutine
510 PRINT "In subroutine with values: "; N1; N2; N3
520 RETURN

600 REM Program end
610 PRINT "Program complete"
620 STOP
