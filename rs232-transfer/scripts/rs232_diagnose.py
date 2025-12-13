#!/usr/bin/env python3
"""
RS232 diagnostic tool - checks port status, signals, and captures raw data

Usage:
  rs232_diagnose.py --port /dev/ttyUSB0 --baud 9600

Shows port configuration, control signal status, and any data received.
"""
import argparse
import sys
import time

try:
    import serial
except ImportError:
    print("Missing dependency: pyserial. Install with: pip install pyserial")
    sys.exit(1)


def main():
    p = argparse.ArgumentParser(description="RS232 diagnostic tool")
    p.add_argument("--port", default="/dev/ttyUSB0")
    p.add_argument("--baud", type=int, default=9600)
    args = p.parse_args()

    print(f"=== RS232 Diagnostics for {args.port} ===\n")

    # Try opening with minimal settings first
    try:
        ser = serial.Serial(
            args.port,
            args.baud,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=0.1,
            rtscts=False,
            xonxoff=False,
            dsrdtr=False,
        )
    except Exception as e:
        print(f"ERROR: Cannot open port: {e}")
        print("\nTroubleshooting:")
        print("  1. Check permissions: sudo usermod -aG dialout $USER (then logout/login)")
        print("  2. Verify device exists: ls -l /dev/ttyUSB*")
        print("  3. Check if another program is using it: lsof /dev/ttyUSB0")
        sys.exit(1)

    print("✓ Port opened successfully")
    print(f"  Baud rate: {ser.baudrate}")
    print(f"  Byte size: {ser.bytesize}")
    print(f"  Parity: {ser.parity}")
    print(f"  Stop bits: {ser.stopbits}")
    print(f"  Timeout: {ser.timeout}s")
    print()

    # Check control signals
    print("Control signal status:")
    try:
        cts = ser.cts
        dsr = ser.dsr
        ri = ser.ri
        cd = ser.cd
        print(f"  CTS (Clear To Send):    {cts}")
        print(f"  DSR (Data Set Ready):   {dsr}")
        print(f"  RI  (Ring Indicator):   {ri}")
        print(f"  CD  (Carrier Detect):   {cd}")
    except Exception as e:
        print(f"  Cannot read signals: {e}")
    print()

    # Set RTS and DTR high
    print("Setting RTS and DTR high...")
    try:
        ser.rts = True
        ser.dtr = True
        time.sleep(0.1)
        print(f"  RTS: {ser.rts}")
        print(f"  DTR: {ser.dtr}")
    except Exception as e:
        print(f"  Error: {e}")
    print()

    # Listen for data
    print("Listening for incoming data (10 seconds)...")
    print("Send data from Spectrum now...")
    print("Press Ctrl-C to stop early\n")

    bytes_received = 0
    try:
        end_time = time.time() + 10
        while time.time() < end_time:
            data = ser.read(1024)
            if data:
                bytes_received += len(data)
                print(f"Received {len(data)} bytes:")
                # Show hex dump
                for i, b in enumerate(data):
                    if i % 16 == 0:
                        print(f"  {i:04X}: ", end="")
                    print(f"{b:02X} ", end="")
                    if (i + 1) % 16 == 0:
                        print()
                if len(data) % 16 != 0:
                    print()
                # Show ASCII
                printable = "".join(chr(b) if 32 <= b <= 126 else "." for b in data)
                print(f"  ASCII: {printable}\n")
    except KeyboardInterrupt:
        print("\nStopped by user")

    print(f"\nTotal bytes received: {bytes_received}")

    if bytes_received == 0:
        print("\n=== TROUBLESHOOTING ===")
        print("No data received. Check:")
        print("  1. Cable wiring:")
        print("     - Spectrum TX (pin 2) → Adapter RX (pin 3)")
        print("     - Spectrum RX (pin 3) → Adapter TX (pin 2)")
        print("     - GND (pin 1 or 7) → GND (pin 5)")
        print("  2. On Spectrum, run:")
        print("     FORMAT \"b\";9600")
        print("     OPEN #4,\"b\"")
        print("     PRINT#4;\"HELLO\"")
        print("  3. Check Spectrum Interface 1 is working (microdrive test)")
        print("  4. Try loopback test on adapter (short pins 2-3)")
        print("  5. Measure voltages on Spectrum connector:")
        print("     - Pin 1: 0V (ground)")
        print("     - Pin 6: +9-12V")
        print("     - Pin 2: should swing ±7V when transmitting")
    else:
        print("\n✓ Data received successfully!")
        print("Communication is working. Try the echo script again.")

    ser.close()


if __name__ == '__main__':
    main()
