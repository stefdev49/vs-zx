#!/usr/bin/env python3
"""
RS232 echo server - receives characters from ZX Spectrum and echoes them back

Usage:
  rs232_echo.py --port /dev/ttyUSB0 --baud 9600 --rtscts

Listens on serial port, prints received characters to console and echoes back to sender.
Press Ctrl-C to exit.

Requires: pyserial (pip install pyserial)
"""
import argparse
import sys

try:
    import serial
except ImportError:
    print("Missing dependency: pyserial. Install with: pip install pyserial")
    sys.exit(1)


def main():
    p = argparse.ArgumentParser(description="RS232 echo server for ZX Spectrum")
    p.add_argument("--port", default="/dev/ttyUSB0", help="Serial port device")
    p.add_argument("--baud", type=int, default=9600, help="Baud rate")
    p.add_argument("--rtscts", action="store_true", help="Enable hardware RTS/CTS flow control")
    p.add_argument("--timeout", type=float, default=0.1, help="Read timeout (seconds)")
    args = p.parse_args()

    ser = serial.Serial(
        args.port,
        args.baud,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=args.timeout,
        rtscts=args.rtscts,
    )

    print(f"RS232 echo server listening on {args.port} at {args.baud} baud")
    print(f"Hardware flow control (RTS/CTS): {args.rtscts}")
    print("Press Ctrl-C to exit\n")

    try:
        while True:
            # Read one byte at a time
            data = ser.read(1)
            if data:
                # Print to console (handle non-printable chars)
                char = data[0]
                if 32 <= char <= 126:
                    print(f"Received: '{chr(char)}' (0x{char:02X})")
                else:
                    print(f"Received: 0x{char:02X}")
                
                # Echo back to sender
                ser.write(data)
                ser.flush()
                
    except KeyboardInterrupt:
        print("\n\nExiting...")
    finally:
        ser.close()
        print("Port closed")


if __name__ == '__main__':
    main()
