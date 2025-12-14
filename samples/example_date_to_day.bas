10 REM convert date to day
20 REM constants
30 LET CENTURYSTART = 1901
40 LET CENTURYEND = 2000
50 LET DAYSINWEEK = 7
60 LET MONTHSINYEAR = 12
70 LET FEBRUARY = 2
80 LET LEAPYEARDIVISOR = 4
90 LET LEAPYEARREMAINDER = 0
100 REM initialize arrays
110 DIM d$(DAYSINWEEK, 6): REM days of week
120 FOR n=1 TO DAYSINWEEK: READ d$(n): NEXT n
130 DIM m(MONTHSINYEAR): REM lengths of months
140 FOR n=1 TO MONTHSINYEAR: READ m(n): NEXT n
200 REM input date
210 INPUT "day?";day
220 INPUT "month?";month
230 INPUT "year (20th century only)?";year
240 REM validate input
250 IF year < CENTURYSTART THEN PRINT "20th century starts at "; CENTURYSTART: GO TO 200
260 IF year > CENTURYEND THEN PRINT "20th century ends at "; CENTURYEND: GO TO 200
270 IF month < 1 OR month > MONTHSINYEAR THEN PRINT "Month must be between 1 and "; MONTHSINYEAR: GO TO 200
280 REM check for leap year
290 IF year / LEAPYEARDIVISOR - INT(year / LEAPYEARDIVISOR) = LEAPYEARREMAINDER THEN LET m(FEBRUARY) = 29: REM leap year
300 IF day < 1 OR day > m(month) THEN PRINT "This month has only "; m(month); " days.": GO TO 500
400 REM convert date to number of days since start of century
410 LET y = year - CENTURYSTART
420 LET b = 365 * y + INT(y / LEAPYEARDIVISOR): REM number of days to start of year
430 FOR n=1 TO month-1: REM add on previous months
440 LET b = b + m(n): NEXT n
450 LET b = b + day
500 REM convert to day of week
510 LET b = b - DAYSINWEEK * INT(b / DAYSINWEEK) + 1
520 PRINT day;"/";month;"/";year
530 FOR n=6 TO 3 STEP -1: REM remove trailing spaces
540 IF d$(b, n) <> " " THEN GO TO 560
550 NEXT n
560 LET e$ = d$(b, TO n)
570 PRINT " is a "; e$; " day"
600 REM restore February
610 LET m(FEBRUARY) = 28
620 REM ask to continue
630 INPUT "again?";a$
640 IF a$ = "n" OR a$ = "N" THEN GO TO 660
650 GO TO 200
660 STOP
1000 REM days of week
1010 DATA "Monday", "Tuesday", "Wednesday"
1020 DATA "Thursday", "Friday", "Saturday", "Sunday"
1100 REM lengths of months
1110 DATA 31, 28, 31, 30, 31, 30
1120 DATA 31, 31, 30, 31, 30, 31

