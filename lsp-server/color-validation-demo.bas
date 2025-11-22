REM Demonstration of color value validation
REM ZX Spectrum colors: 0=black, 1=blue, 2=red, 3=magenta, 4=green, 5=cyan, 6=yellow, 7=white

10 REM Valid INK colors (0-7)
20 INK 0: REM Black
30 INK 1: REM Blue
40 INK 7: REM White

50 REM Special INK values
60 INK 8: REM No change
70 INK 9: REM Contrast

80 REM Valid PAPER colors
90 PAPER 0: REM Black background
100 PAPER 5: REM Cyan background
110 PAPER 9: REM Contrast

120 REM Valid BORDER color (0-7 only)
130 BORDER 0
140 BORDER 7

150 REM ERROR: Invalid color values
160 INK 10: REM LSP will warn: out of range
170 BORDER 8: REM LSP will warn: BORDER doesn't support 8 or 9

180 REM Mixed with other statements
190 INK 3: PAPER 7: BORDER 2: PRINT "Magenta text on white"

200 REM FLUX attribute colors
210 FLASH 1: BRIGHT 1: INVERSE 0

220 STOP
