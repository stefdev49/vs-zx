10 REM Type checking demo
20 LET x = 100
30 LET name$ = "Alice"
40 LET count% = 42

50 REM Valid operations:
60 LET result = ABS(x)
70 LET root = SQR(count%)
80 INPUT "Enter number: "; num_input
90 INPUT "Enter name: "; name_input$

100 REM Invalid type operations (will generate warnings):
110 REM Numeric function on string variable
120 LET bad1 = ABS(name$)
130 LET bad2 = SQR(name_input$)
140 LET bad3 = SIN(name$)

150 REM String concatenation with + (non-standard)
160 LET bad_concat = name$ + name_input$

999 END
