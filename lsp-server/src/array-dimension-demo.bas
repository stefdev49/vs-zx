10 REM Array dimension validation demo
20 DIM scores(10)
30 DIM matrix(5, 5)
40 DIM cube(3, 3, 3)
45 DIM invalid(1,2,3,4)

50 REM Valid uses:
60 LET scores(1) = 100
70 LET matrix(2, 3) = 5
80 LET cube(1, 2, 3) = 1

90 REM Invalid uses (will generate warnings/errors):
100 REM scores is 1D, not 2D:
110 LET scores(1, 2) = 100

120 REM matrix is 2D, not 1D:
130 LET matrix(1) = 5

140 REM Undeclared array:
150 LET undeclared(1) = 10

160 REM Too many dimensions (max 3):
170 LET toomany(1,2,3,4) = 1

180 END
