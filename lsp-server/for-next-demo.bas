REM Demonstration of FOR/NEXT diagnostics
REM This file shows warnings for unbalanced loops

10 REM Valid FOR/NEXT loop
20 FOR I = 1 TO 10
30 PRINT I
40 NEXT I

50 REM Multiple NEXT for one FOR (allowed in ZX BASIC)
60 FOR J = 1 TO 5
70 PRINT J
80 NEXT J
90 NEXT J

100 REM ERROR: FOR without NEXT
110 FOR K = 1 TO 3
120 PRINT K
REM Missing NEXT - LSP will warn

200 REM ERROR: NEXT without FOR
210 PRINT "Test"
220 NEXT X
REM No matching FOR - LSP will warn

300 REM Valid: No loops
310 PRINT "Done"
320 STOP
