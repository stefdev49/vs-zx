10 REM User-defined functions with DEF FN
20 REM Single-word and two-word forms
30 PRINT "Defining functions..."

100 REM Define square function using two-word form
110 DEF FN s(x) = x * x

200 REM Define double function (could use DEFFN too)
210 DEFFN d(y) = y * 2

300 REM Define max function with multiple parameters
310 DEF FN m(a,b) = (a + b + ABS(a - b)) / 2

400 REM Test the functions
410 PRINT "FN s(5) = "; FN s(5)
420 PRINT "FN d(10) = "; FN d(10)
430 PRINT "FN m(7,3) = "; FN m(7,3)

500 REM Using functions in expressions
510 LET result = FN s(3) + FN d(4)
520 PRINT "s(3) + d(4) = "; result

600 REM Nested function calls
610 PRINT "d(s(3)) = "; FN d(FN s(3))

999 STOP
