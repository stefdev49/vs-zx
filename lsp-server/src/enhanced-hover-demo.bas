10 REM Enhanced hover information demo
15 REM Hover over variables to see their types

20 DIM scores(10), names$(20)
30 LET player = "Alice"
40 LET count = 0
50 LET score$ = "High"

60 FOR i = 1 TO 10
70 REM Hover over 'scores' to see it's an array
80 LET scores(i) = i * 10
90 REM Hover over 'names$' to see it's a string array
100 LET names$(i) = "Player" + STR$(i)
110 NEXT i

120 REM Hover over these line numbers:
130 GOSUB 200
140 REM This should show line 200 content on hover

150 PRINT player, score$, count

160 END

200 REM Subroutine - hover over line number 200 in GOSUB above
210 LET count = count + 1
220 RETURN
