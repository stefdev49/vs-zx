REM Model-Specific Keyword Completion Demo
REM This file demonstrates how completion filters keywords based on ZX model setting

REM In 48K mode (default):
REM - Available: Standard ZX Spectrum BASIC keywords (LET, PRINT, FOR, etc.)
REM - Available: All functions (SIN, COS, ABS, etc.)
REM - NOT available: 128K-specific keywords (SPECTRUM, PLAY, LLIST, LPRINT, COPY, MOVE, ERASE, FORMAT)
REM - NOT available: Interface1 keywords (NET, CAT*, LOAD*, SAVE*, MERGE*, VERIFY*, FORMAT*)

REM Example 48K mode completion:
10 LET x = 10
20 PRINT "Value: "; x
30 FOR i = 1 TO 10
40 PRINT SIN(i)
50 NEXT i

REM In 128K mode (when zxBasic.model = "128K"):
REM - Available: All 48K keywords + functions
REM - Available: SPECTRUM, PLAY, LLIST, LPRINT, COPY, MOVE, ERASE, FORMAT
REM - NOT available: Interface1 keywords

REM Example 128K mode completion:
REM When you type "SPE" at statement start, completion will suggest SPECTRUM
REM When you type "PLI" at statement start, completion will suggest LLIST
REM When you type "PLA" at statement start, completion will suggest PLAY

100 REM In 128K mode, try completing:
110 REM - SPE -> SPECTRUM
120 REM - PLA -> PLAY
130 REM - LL -> LLIST, LPRINT
140 REM - COP -> COPY
150 REM - MOV -> MOVE

REM In Interface1 mode (when zxBasic.model = "Interface1"):
REM - Available: All 48K keywords + functions
REM - NOT available: 128K-specific keywords (SPECTRUM, PLAY, LLIST, LPRINT, COPY, MOVE, ERASE, FORMAT)
REM - Available: Interface1 keywords (NET, CAT*, LOAD*, SAVE*, MERGE*, VERIFY*, FORMAT*)

REM Example Interface1 mode completion:
200 REM In Interface1 mode, try completing:
210 REM - NET -> NET (Interface1 keyword for network operations)
220 REM - CAT -> CAT* (Interface1 keyword for catalog)
230 REM - LOAD -> LOAD* (Interface1 keyword for network load)

REM How to test:
REM 1. Open VS Code settings (Ctrl+,)
REM 2. Search for "zxBasic.model"
REM 3. Set to "48K", "128K", or "Interface1"
REM 4. In a ZX BASIC file, type a partial keyword at the start of a line
REM 5. Press Ctrl+Space to trigger completion
REM 6. Notice different keywords appear based on the selected model

REM Model configuration:
REM - Default: 48K (standard Spectrum keyboard version)
REM - 128K: ZX Spectrum 128K with extra keywords and extended features
REM - Interface1: ZX Spectrum with Interface 1 network module

REM Tip: The settings.json entry would look like:
REM "zxBasic.model": "128K"  (or "48K" or "Interface1")

REM Common scenarios:
REM - Use 48K mode for classic, portable BASIC programs
REM - Use 128K mode for programs targeting 128K Spectrum
REM - Use Interface1 mode for programs using network features
