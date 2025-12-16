# BUGS

## FIXED

- quotes outside of double quoted strings are not handled correctly
- incorrect formatting of for loop with ctrl-shift-i
  50 FOR I = 1TO 255  => space missing
- "_" shouldn't be allowed in variable name
- fix variable naming
- lsp is messing varaible of same name but different type
- DEF FN not recognized : 1070 DEF FN a(y,m)=(m=2)*((y/4=INT (y/4))-(y/100=INT (y/100))+(y/400=INT (y/400)))