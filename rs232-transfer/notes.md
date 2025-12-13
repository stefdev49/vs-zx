# VARIOUS NOTES

##  USE CTS/RTS

```bas
 100 REM ** Receive Test **
 110 REM ** Use RTS/CTS **
 120 CLS
 130 FORMAT "p";9600
 140 OPEN #4,"p"
 150 PRINT INKEY$#4;
 160 GO TO 150
```

On 48k with interface 1 FORMAT "b";9600 Then , the spectrum works in 8bit data at 9600 bauds.

https://github.com/ruyrybeyro/zxtrans/tree/main

 A Data RS232 cable uses RTS/CTS handshaking to ensure reliable data transfers and so removes the necessity for a PC application to explicitly control the DTR line. This configuration is therefore more appropriate if the cable is also to be used for connecting to standard PC applications and guaranteed data transfers are required (if the PC application is capable of buffering as much data as is sent to it then the Serial Printer cable will be equally suitable).


For the Spectrum 128 RS232 and Keypad sockets, pin 6 is at the side with the clip. Further details can be found in the topic describing the Spectrum 128 Keypad.

Serial Printer Cable
	

A Serial Printer RS232 cable is primarily intended to allow the Spectrum to control a printer fitted with a serial interface, but can also be used to transmit data to a PC. The ZX Tape Player utility has been written to control the DTR signal line such that reliable data transfers from the Spectrum are achieved using a Serial Printer cable.



1.1.5 RS232 Serial Link
The same pin on IC1, pin 33, is used for the network transmit data and for the RS232 transmit data. In
order to select the required function IC1 uses its COMMS OUT signal, borrowed from the microdrive
control when the microdrive is not being used. This signal is routed from pin 30 to the emitter of transistor
Q3 and, via resistor R4, to the base of transistor Q1. When COMMS OUT is high Q3 is enabled thus
selecting RS232, and when it is low Q1 is enabled selecting the network.
The RS232 link provides a signal of +12V. This is obtained directly from the Spectrum via pin 22B on the
expansion connector and the -12V is derived from the output of a charge pump, formed by diodes D1 and
D2 and capacitors C1 and C2. The output may in fact fall as low as -7V but since the RS232 interface
specifies -3V, this is adequate.
The RS232 serial data interface can be sent 2 types of data, 8-bit binary code and 7-bit text-only
information. Refer to the interface 1 manual for details. The RS232 employs 4 data and control lines as
set out in the table below:
Line Function IC1 Pin
Rx DATA (Receive Data) Transmitted data. 33
Tx DATA (Transmit Data) Received data 4
CTS (Clear to Send) Tells remote station that Spectrum wishes to send data. 34
DTR (Data Terminal Ready) Tells Spectrum that remote station wishes to send data. 1
Sinclair ZX Interface 1, Interface 2 and Microdrive Service Manual
Spectrum For Everyone https://spectrumforeveryone.com/
7
In operation, serial data prepared in the Spectrum is transmitted to line via transistors Q3 and Q4. These
form an amplifier which produces a large voltage swing. The same circuit is used for the transmission of
the CTS signal using transistors Q6 and Q5. The Tx DATA and DTR signals received from the line are fed
into a terminating and camping circuit formed by resistors R24 and R25, R28 and R29 and diodes D6 and
D7. Negative excursions of signals are prevented and the signals input to IC1 are limited to +5V.
The RS232 interface is output on a 9-pin connector SK1 which provides a ground signal and a pull-up
signal. This allows for a high-level signal to be fed back into DTR, when the remote device does not provide
a DTR signal.


cable in use :
ZX TX (pin 2) → PC DB9 pin 3 (RXD)
ZX RX (pin 3) ← PC DB9 pin 2 (TXD)
ZX DTR input (pin 4) ← PC DB9 pin 4 (DTR) ⟵ gives Spectrum the “ready” signal
ZX CTS output (pin 5) → PC DB9 pin 8 (CTS) ⟵ lets PC see Spectrum’s CTS
ZX GND (pin 7) → PC DB9 pin 5 (GND)
ZX 9V (pin 9) → PC DB9 pin 6 (DSR) — typically unused by the PC side

## REPAIR

```log
Likely failure points on the DTR drive/sense chain (net labeled DTR_ feeding the DB9):

Transistor stages that level-shift DTR: the PNP/NPN pair near the connector (Q5 BC213C and Q6 BC184C) and their bias resistors (R14 1k, R15 12k, R16 3k9, R18 680R, R20 2k7, C7 330p). If either transistor is open/short or any of those resistors are cracked, the line will stay low and IN returns 30.
The pull network on DTR input side: R28 6k8, R29 6k8, R25 10k, R24 4k7—if these are open/short, the interface might never see a high.
Clamp diodes on the low-voltage side (D6, D7 BZX79C4V3): if shorted, they’ll pin the signal; if open, they’re less likely to kill it but could allow overvoltage damage upstream.
Edge/connectors: continuity from the Spectrum edge to the DTR_ net and then to the DB9 pin; oxidized edge fingers or cracked traces will mimic a stuck-low DTR.
Rails: the stage needs +12 V/-12 V present; missing ±12 or +5 at this section will keep the output inactive. Verify supply at R14/R16 nodes (+12) and at the emitter of Q5 (+12) and Q4/Q3 path for -12.
```