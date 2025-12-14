  100 GO SUB 5000: GO SUB 1000: GO TO 3000
 1010 DIM p$(185): FOR n=0 TO 184: LET p$(n+1)=CHR$ ((16*SIN (PI*n/92))+144): NEXT n
 1020 DIM e$(225): FOR n=0 TO 224: LET e$(n+1)=CHR$ ((16*SIN (PI*n/112))+104): NEXT n
 1030 DIM i$(265): FOR n=0 TO 264: LET i$(n+1)=CHR$ ((16*SIN (PI*n/132))+64): NEXT n
 1040 DIM n(12): DIM m(12): DATA 31,28,31,30,31,30,31,31,30,31,30,31: RESTORE 1040: LET m=0: FOR n=1 TO 12: LET m(n)=m: READ m1: LET n(n)=m1: LET m=m+m1: NEXT n
 1050 DIM m$(12,9): DATA "january","february","march","april","may","june","july","august","september","october","november","december": FOR n=1 TO 12: READ m$(n): NEXT n
 1060 DIM d$(7,2): DATA "su","mo","tu","we","th","fr","sa": FOR n=1 TO 7: READ d$(n): NEXT n
 1070 DEF FN a(y,m)=(m=2)*((y/4=INT (y/4))-(y/100=INT (y/100))+(y/400=INT (y/400)))
 1080 RETURN 
 1200 LET dn=365*y+INT (y/4)+INT (y/400)-INT (y/100)-(m<3)*((y/4=INT (y/4))-(y/100=INT (y/100))+(y/400=INT (y/400)))+m(m)+d-1
 1210 RETURN 
 1400 LET dnep=1+ne-184*INT (ne/184): LET dnee=1+ne-224*INT (ne/224): LET dnei=1+ne-264*INT (ne/264): INK 6: PLOT n,CODE p$(dnep): DRAW 0,1: INK 4: PLOT n,CODE e$(dnee): DRAW 0,1: INK 3: PLOT n,CODE i$(dnei): DRAW 0,1: INK 7
 1410 RETURN 
 1600 OVER 1: PRINT AT 0,9; PAPER 1;"  BIORHYTHMS  "; PAPER 0; INK 6;AT 1,0;"Physical"; INK 4;AT 6,0;"Emotional"; INK 3;AT 11,0;"Intellectual"
 1610 INK 6: PLOT 0,144: DRAW 254,0: INK 4: PLOT 0,104: DRAW 254,0: INK 3: PLOT 0,64: DRAW 254,0: OVER 0: INK 7
 1620 RETURN 
 2010 LET y=ye: LET m=me: LET d=7*(we-1)+1: GO SUB 1200: REM dn=0=sun
 2020 LET dne=dn-7*INT (dn/7): LET de=7*(we-1)+1: IF dne<>0 THEN LET dn=dn+7-dne: LET de=de+7-dne
 2030 FOR n=0 TO 2: FOR d=0 TO 6*(n<2) STEP 2: PRINT AT 19,14*n+2*d; PAPER 1+(d=0);d$(d+1): PRINT INK 5;AT 20,14*n+d*2;de+7*n+d-n(m)*(de+7*n+d+1>n(m)): NEXT d: NEXT n
 2040 INK 6: PRINT AT 21,0;ye;TAB 6;m$(me): IF de>n(me)-13 THEN PRINT AT 21,22;m$(me+1-12*(me=12)): INK 7
 2050 FOR n=0 TO 255: LET ne=8*(dn-dn1)+n/2: GO SUB 1400: NEXT n
 2060 GO SUB 1600
 2070 RETURN 
 2510 LET m=me: LET y=ye: LET d=1: GO SUB 1200
 2520 LET dne=dn-7*INT (dn/7): IF dne<>0 THEN LET d=7-dne+1
 2530 LET m1=n(me): LET m2=n(1+me-12*INT (me/12)): FOR n=0 TO 9: LET l=28*n+4*d: IF (l<=254) THEN FOR m=0 TO 1: PLOT INK 2;l+m,24: DRAW INK 2;0,6: NEXT m: NEXT n
 2540 FOR n=1 TO m1+m2: IF (n-d)/7=INT ((n-d)/7) THEN PRINT AT 19,n/2-1; PAPER 2;"su";AT 20,n/2-1; PAPER 0; INK 5;n-m1*(n>m1)
 2550 NEXT n
 2570 FOR n=0 TO 255: LET ne=8*(dn-dn1)+2*n: GO SUB 1400: NEXT n
 2580 GO SUB 1600
 2590 RETURN 
 3010 CLS : PRINT AT 0,9; PAPER 1;"  BIORHYTHMS  "
 3020 PRINT '' INK 5;"    Biorhythms are calculated   from the date of birth"
 3030 GO SUB 4000: LET dn1=dn: PRINT 
 3040 PRINT AT 0,9; PAPER 1;"  BIORHYTHMS  ": PRINT INK 4;AT 8,0;"Biorhythms may be displayed for any date"
 3050 GO SUB 4000
 3060 LET ye=y: LET me=m: LET we=1+INT (d/7)-(d>=28)
 3070 PRINT INK 6''"Biorhythms may be displayed for a choice of period"'"A=2 weeks"'"B=2 months"
 3080 INPUT INK 6;"Type in your choice of period   A or B followed by enter "; LINE a$: IF a$="a" OR a$="A" THEN CLS : GO SUB 2000: GO TO 3100
 3090 CLS : GO SUB 2500
 3100 INPUT "PRESS ENTER"; LINE a$: CLS : INPUT AT 0,0;"1=another display date 2=anotherbirth date followed by enter "; LINE a$
 3110 IF a$="1" THEN CLS : GO TO 3040
 3120 CLS : GO TO 3000
 4030 INPUT INK 5;AT 0,0;"Type in the year as 4 digits    followed by enter "; LINE a$: IF a$<>"" AND LEN a$=4 THEN FOR n=1 TO 4: IF a$(n)>="0" AND a$(n)<="9" THEN NEXT n: LET y=VAL a$: GO TO 4050
 4040 GO TO 4030
 4050 INPUT INK 5;AT 0,0;"Type the month as a number 1-12 followed by enter "; LINE a$: IF a$<>"" THEN FOR n=1 TO LEN a$: IF a$(n)>="0" AND a$(n)<="9" THEN NEXT n: LET m=VAL a$: IF m>=1 AND m<=12 THEN GO TO 4070
 4060 GO TO 4050
 4070 INPUT INK 5;AT 0,0;("Type the day of the month 1-";n(m)+FN a(y,m);"  followed by enter "); LINE a$
 4080 IF a$<>"" THEN FOR n=1 TO LEN a$: IF a$(n)>="0" AND a$(n)<="9" THEN NEXT n: LET d=VAL a$: IF d>=1 AND d<=n(m)+FN a(y,m) THEN GO TO 4100
 4090 GO TO 4070
 4100 GO SUB 1200: LET d1=dn-7*INT (dn/7): PRINT PAPER 2;d$(d1+1);TAB 4;m$(m);TAB 18;d;TAB 24;y
 4110 RETURN 
 5100 BORDER 0: INK 7: PAPER 0: BRIGHT 1: CLS 
 5110 PRINT AT 0,9; PAPER 1;"  BIORHYTHMS  "
 5120 PRINT INK 5''"Biorhythms are the cyclic       variations in our performance   and abilities physically,       emotionally and intellectually"
 5130 PRINT INK 6''"These cycles have periods of    23 days, 28 days and 33 days    respectively"
 5140 PRINT INK 5''"The cycles start at birth and   continue to death, and our      abilities in the three fields   of human behavious rise and fallsinusoidally"
 5150 RETURN 
