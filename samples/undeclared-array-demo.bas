10 REM Phase 3.3 - Undeclared Array Suggestion Demo
20 REM This file demonstrates the DIM suggestion code action

30 REM Using arrays without DIM declarations
40 LET PRICES(1) = 99.99
50 LET PRICES(2) = 149.99
60 LET PRICES(3) = 199.99

70 LET NAMES$(1) = "Item A"
80 LET NAMES$(2) = "Item B"
90 LET NAMES$(3) = "Item C"

100 LET INVENTORY(1) = 50
110 LET INVENTORY(2) = 30
120 LET INVENTORY(3) = 75

130 FOR I = 1 TO 3
140 PRINT NAMES$(I); " - "; PRICES(I); " units: "; INVENTORY(I)
150 NEXT I

160 REM Note: The LSP will suggest adding:
170 REM DIM PRICES(10), NAMES$(50), INVENTORY(10)
180 REM at the beginning of the program
