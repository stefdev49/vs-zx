10 REM Phase 3.1 - Enhanced Document Symbols Demo
20 REM This demonstrates DEF FN functions and variable tracking

30 DIM PRICES(100)
40 DIM NAMES$(100)

50 LET COUNT = 0
60 LET TOTAL = 0
70 LET AVERAGE = 0

100 DEF FN SQUARE(X) = X * X
110 DEF FN CUBE(X) = X * X * X
120 DEF FN AVERAGE(SUM, N) = SUM / N

200 REM Main program
210 INPUT "Enter number of items: "; COUNT
220 LET TOTAL = 0

230 FOR I = 1 TO COUNT
240 INPUT "Item name: "; NAMES$(I)
250 INPUT "Item price: "; PRICES(I)
260 LET TOTAL = TOTAL + PRICES(I)
270 NEXT I

280 LET AVERAGE = FN AVERAGE(TOTAL, COUNT)

290 PRINT "Total items: "; COUNT
300 PRINT "Total cost: "; TOTAL
310 PRINT "Average price: "; AVERAGE

320 GOSUB 500

330 END

500 REM Display report subroutine
510 PRINT "=== REPORT ==="
520 PRINT "Item count: "; COUNT
530 PRINT "Sum: "; TOTAL
540 PRINT "Average: "; AVERAGE
550 RETURN
