#!/usr/bin/env python3
"""
Simple RS232 receiver for ZX Spectrum Interface 1

Usage:
    rs232_receive.py --port /dev/ttyUSB0 --baud 19200 --outfile capture.tap --duration 10

Reads raw bytes from serial, echoes them to the console, and writes to an output file
until duration seconds elapse or Ctrl-C is pressed.

Requires: pyserial (pip install pyserial)
"""
import argparse
import time
import sys

try:
    import serial
except Exception as e:
    print("Missing dependency: pyserial. Install with: pip install pyserial")
    raise


def main():
    p = argparse.ArgumentParser(description="RS232 receiver for ZX Spectrum Interface 1")
    p.add_argument("--port", default="/dev/ttyUSB0")
    p.add_argument("--baud", type=int, default=19200)
    p.add_argument("--outfile", default="capture.bin")
    p.add_argument("--duration", type=int, default=0, help="Seconds to capture (0 means until Ctrl-C)")
    p.add_argument("--rtscts", action="store_true", help="Enable hardware RTS/CTS flow control (default off for straight DTR/CTS wiring)")
    p.add_argument("--no-dtr", action="store_true", help="Do not assert DTR (defaults to asserted)")
    p.add_argument("--no-rts", action="store_true", help="Do not assert RTS (defaults to asserted)")
    p.add_argument("--timeout", type=float, default=0.5, help="Read timeout (seconds)")
    args = p.parse_args()

    ser = serial.Serial(
        args.port,
        args.baud,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=args.timeout,
        rtscts=args.rtscts,
        xonxoff=False,
        dsrdtr=False,
    )

    # Assert RTS/DTR by default so Spectrum sees DTR high and can transmit.
    # For the current cable (ZX DTR->PC DTR, ZX CTS->PC CTS, no RTS wire), RTS will be local only.
    ser.rts = not args.no_rts
    ser.dtr = not args.no_dtr

    print(f"Opened {args.port} at {args.baud} baud. rtscts={args.rtscts}")
    print(f"RTS={'high' if ser.rts else 'low'}, DTR={'high' if ser.dtr else 'low'}")
    try:
        print(
            "Signals: CTS={} DSR={} CD={} RI={}".format(
                ser.cts, ser.dsr, ser.cd, ser.ri
            )
        )
    except Exception:
        print("Signals: unavailable on this adapter")
    end_time = time.time() + args.duration if args.duration > 0 else None

    with open(args.outfile, "wb") as f:
        try:
            while True:
                if end_time and time.time() > end_time:
                    print("Duration elapsed, exiting")
                    break
                data = ser.read(1024)
                if data:
                    f.write(data)
                    f.flush()

                    # Echo to console in a readable way
                    printable = "".join(chr(b) if 32 <= b <= 126 else "." for b in data)
                    hex_dump = " ".join(f"{b:02X}" for b in data)
                    print(f"+{len(data)} bytes | ASCII: {printable} | HEX: {hex_dump}")
        except KeyboardInterrupt:
            print("Interrupted by user, exiting")
        finally:
            ser.close()
            print(f"Capture saved to {args.outfile}")


if __name__ == '__main__':
    main()
