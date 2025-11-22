REM Call Hierarchy Demo
REM This file demonstrates VS Code call hierarchy for subroutine tracking

REM HOW TO USE CALL HIERARCHY:
REM 1. Right-click on a line number (subroutine target)
REM 2. Select "Go to Call Hierarchy" (or Ctrl+Shift+H)
REM 3. See incoming calls (who calls this subroutine)
REM 4. See outgoing calls (what does this subroutine call)

REM ===== SIMPLE SUBROUTINE CALL =====
10 REM Main program
20 PRINT "Starting..."
30 GOSUB 1000
40 PRINT "Done"
50 END

REM Click on line 1000 and select "Go to Call Hierarchy"
REM You'll see:
REM - Line 30 calls this subroutine
1000 REM Simple subroutine
1010 PRINT "Inside subroutine 1000"
1020 RETURN

REM ===== MULTIPLE CALLERS =====
REM This subroutine is called from multiple places

100 PRINT "Test 1"
110 GOSUB 2000

120 PRINT "Test 2"
130 GOSUB 2000

140 PRINT "Test 3"
150 GO SUB 2000

REM Click on line 2000 to see:
REM - Line 110 calls this subroutine
REM - Line 130 calls this subroutine
REM - Line 150 calls this subroutine (GO SUB variant)
2000 REM Multiple caller subroutine
2010 PRINT "Called from multiple places"
2020 RETURN

REM ===== NESTED GOSUB CALLS =====
REM Subroutines calling other subroutines

200 PRINT "Nested test"
210 GOSUB 3000

REM Click on line 3000:
REM - Incoming: Line 210
REM - Outgoing: Line 3020 calls GOSUB 4000
3000 REM Outer subroutine
3010 PRINT "In outer"
3020 GOSUB 4000
3030 PRINT "Back to outer"
3040 RETURN

REM Click on line 4000:
REM - Incoming: Line 3020
REM - Outgoing: none (or other GOSUBs if present)
4000 REM Inner subroutine
4010 PRINT "In inner"
4020 RETURN

REM ===== COMPLEX CALL GRAPH =====
REM More complex subroutine hierarchy

300 PRINT "Complex"
310 GOSUB 5000
320 GOSUB 6000
330 END

REM Central subroutine called from main
REM Also calls utility subroutines
5000 REM Central coordinator
5010 PRINT "Start processing"
5020 GOSUB 7000
5030 GOSUB 8000
5040 PRINT "End processing"
5050 RETURN

REM Another main-level subroutine
6000 REM Alternative path
6010 PRINT "Alternative"
6020 GOSUB 8000
6030 RETURN

REM Utility subroutine (called by multiple others)
7000 REM Utility 1
7010 PRINT "Utility 1"
7020 RETURN

REM Another utility (shared by multiple callers)
8000 REM Utility 2
8010 PRINT "Utility 2"
8020 RETURN

REM ===== CALL HIERARCHY VISUALIZATION =====
REM 
REM When you open call hierarchy for line 5000, you'll see:
REM
REM INCOMING CALLS (who calls line 5000):
REM ├─ Line 310 (in main program)
REM
REM Line 5000 (central coordinator):
REM └─ OUTGOING CALLS (what does line 5000 call):
REM    ├─ Line 7000 (utility 1)
REM    └─ Line 8000 (utility 2)

REM ===== INTERPRETING THE HIERARCHY =====
REM
REM Incoming calls show:
REM - Which lines call this subroutine
REM - Can see multiple callers for shared subroutines
REM - Useful for understanding who uses a subroutine
REM
REM Outgoing calls show:
REM - Which subroutines this one calls
REM - Can see call dependencies
REM - Useful for understanding what a subroutine does

REM ===== EXAMPLE ANALYSIS =====
REM
REM For line 8000 (Utility 2):
REM - Incoming: Line 5020 and Line 6020
REM   → Multiple subroutines depend on this utility
REM   → It's a shared/common subroutine
REM
REM For line 5000 (Central coordinator):
REM - Incoming: Line 310
REM   → Called from main program
REM - Outgoing: Line 7000 and Line 8000
REM   → Depends on utility subroutines

REM ===== BENEFITS OF CALL HIERARCHY =====
REM
REM 1. Understand program flow
REM    - See which subroutines call which others
REM    - Trace execution paths
REM
REM 2. Find dependencies
REM    - Identify shared utilities
REM    - See what depends on what
REM
REM 3. Refactoring
REM    - Know what to update when modifying a subroutine
REM    - Ensure all callers are compatible
REM
REM 4. Debugging
REM    - Trace calls to find where a bug might originate
REM    - Understand unexpected behavior
REM
REM 5. Documentation
REM    - See the call structure at a glance
REM    - Understand program architecture

REM ===== TECHNICAL NOTES =====
REM
REM - Call hierarchy works on line numbers (subroutines)
REM - Both GOSUB and GO SUB are recognized
REM - Subroutines are from line number to RETURN
REM - Multiple GOSUBs to same line show as separate calls
REM - Nested GOSUB calls are tracked correctly
