10 REM Graphics Character Picker Test
20 REM Right-click in this file and select "Insert ZX Graphics Character"
30 REM A 4x4 grid picker will appear showing all 16 graphics characters
40 REM Each character shows its position (Row, Col) and ZX byte code

100 REM Test line for inserting graphics characters:
110 PRINT "Position cursor here and use the graphics picker"

200 REM Expected characters in the 4x4 grid:
210 REM Row 1: Space (0x80), ▝ (0x81), ▘ (0x82), ▀ (0x83)
220 REM Row 2: ▗ (0x84), ▐ (0x85), ▚ (0x86), ▜ (0x87)
230 REM Row 3: ▖ (0x88), ▞ (0x89), ▌ (0x8A), ▛ (0x8B)
240 REM Row 4: ▄ (0x8C), ▟ (0x8D), ▙ (0x8E), █ (0x8F)

300 REM After inserting, characters like ▛ and ▜ will be properly preserved
310 REM when saving and loading the file, thanks to our bidirectional mapping fix
320 PRINT "Graphics characters inserted successfully.▐"