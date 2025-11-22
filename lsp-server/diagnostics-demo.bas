REM This file demonstrates line number diagnostics
REM It intentionally contains errors for testing

10 PRINT "Valid line number"
20 LET A = 5
10 PRINT "ERROR: Duplicate line number!"
30 GOTO 100

0 PRINT "ERROR: Line 0 is invalid"
10000 PRINT "ERROR: Line number too large"

100 PRINT "Target of GOTO"
9999 PRINT "Maximum valid line number"
1 PRINT "Minimum valid line number"

REM These would show errors in the LSP:
REM - Line 10 appears twice (duplicate)
REM - Line 0 is out of range (must be 1-9999)
REM - Line 10000 is out of range (must be 1-9999)
