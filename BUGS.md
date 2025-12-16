# BUGS

- variables of different type but with the same name are not handled correctly :
  1040 DIM n(12): DIM m(12) 
  1050 DIM m$(12,9): DATA "january","february","march","april","may","june","july","august","september","october","november","december": FOR n=1 TO 12: READ m$(n): NEXT n 
  => Array 'M' declared with 1 dimension(s) but used with 2 : lsp is messing m and m$ variable
- DEF FN not recognized : 1070 DEF FN a(y,m)=(m=2)*((y/4=INT (y/4))-(y/100=INT (y/100))+(y/400=INT (y/400)))

## FIXED

- quotes outside of double quoted strings are not handled correctly
- incorrect formatting of for loop with ctrl-shift-i
  50 FOR I = 1TO 255  => space missing
- "_" shouldn't be allowed in variable name
- fix variable naming
