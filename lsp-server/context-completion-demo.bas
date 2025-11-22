REM Context-aware line number completion demo
REM When typing GOTO, GOSUB, RUN, or LIST, the LSP shows available line numbers

10 REM Main program
20 PRINT "What is your name?"
30 INPUT A$

40 IF A$ = "STOP" THEN GOTO 200

50 GOSUB 1000
REM After GOSUB, press space and start typing - LSP will suggest line numbers

60 GOTO 40
REM After GOTO, type 1, 2, 3... - LSP will filter and show matching line numbers

100 REM Some target line
110 PRINT "Line 100"
120 STOP

200 REM Exit section
210 PRINT "Goodbye"
220 END

1000 REM Main subroutine
1010 PRINT "Subroutine processing for: "; A$
1020 LET COUNT = COUNT + 1
1030 RETURN

2000 REM Backup routine
2010 PRINT "Backup routine"
2020 RETURN

REM Try these completions:
REM - Type "30 GOTO " and press Ctrl+Space to see line number suggestions
REM - Type "40 GOSUB 1" and see it filter to line 1000
REM - Type "50 RUN " and see all available lines
REM - Type "60 LIST 2" and see it filter to line 2000
