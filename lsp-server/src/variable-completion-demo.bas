10 DIM scores(10), names$(20)
20 LET player = "Alice"
30 LET count = 0
40 LET score$ = "High"
50 FOR i = 1 TO 10
60 INPUT "Enter score: ", s
70 LET scores(i) = s
80 LET names$(i) = "Player"
90 NEXT i
100 LET count = count + 1
110 PRINT player, score$
120 READ x, y, z
130 DATA 1, 2, 3
140 GOSUB 200
150 END
200 LET result = x + y + z
210 RETURN
