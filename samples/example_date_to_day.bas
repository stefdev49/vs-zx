10 REM convert date to day




































20 REM constants
30 LET CENTURY_START = 1901
40 LET CENTURY_END = 2000
50 LET DAYS_IN_WEEK = 7
60 LET MONTHS_IN_YEAR = 12
70 LET FEBRUARY = 2
80 LET LEAP_YEAR_DIVISOR = 4
90 LET LEAP_YEAR_REMAINDER = 0
100 REM initialize arrays
110 DIM d$(DAYS_IN_WEEK, 6): REM days of week
120 FOR n=1 TO DAYS_IN_WEEK: READ d$(n): NEXT n
130 DIM m(MONTHS_IN_YEAR): REM lengths of months
140 FOR n=1 TO MONTHS_IN_YEAR: READ m(n): NEXT n
200 REM input date
210 INPUT "day?";day
220 INPUT "month?";month
230 INPUT "year (20th century only)?";year
240 REM validate input
250 IF year < CENTURY_START THEN PRINT "20th century starts at "; CENTURY_START: GO TO 500
260 IF year > CENTURY_END THEN PRINT "20th century ends at "; CENTURY_END: GO TO 500
270 IF month < 1 OR month > MONTHS_IN_YEAR THEN PRINT "Month must be between 1 and "; MONTHS_IN_YEAR: GO TO 500
280 REM check for leap year
290 IF year / LEAP_YEAR_DIVISOR - INT(year / LEAP_YEAR_DIVISOR) = LEAP_YEAR_REMAINDER THEN LET m(FEBRUARY) = 29: REM leap year
300 IF day < 1 OR day > m(month) THEN PRINT "This month has only "; m(month); " days.": GO TO 500
400 REM convert date to number of days since start of century
410 LET y = year - CENTURY_START
420 LET b = 365 * y + INT(y / LEAP_YEAR_DIVISOR): REM number of days to start of year
430 FOR n=1 TO month-1: REM add on previous months
440 LET b = b + m(n): NEXT n
450 LET b = b + day
500 REM convert to day of week
510 LET b = b - DAYS_IN_WEEK * INT(b / DAYS_IN_WEEK) + 1
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

