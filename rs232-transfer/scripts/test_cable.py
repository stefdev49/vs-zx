#!/usr/bin/env python3
"""
test_cable.py

Quick cable tester using pyserial.

Usage:
  python3 test_cable.py /dev/ttyUSB0 9600

What it does:
- Verifies the device node exists and can be opened
- Prints current modem-control line states (CTS, DSR, RI, CD)
- Performs a simple TX->RX loopback write/read
- Toggles RTS and prints CTS after each toggle

Notes:
- For loopback you should wire TX->RX and RTS->CTS on the cable under test.
"""

import sys
import time
import os
try:
    import serial
except Exception as e:
    print('pyserial required. Install with: pip install pyserial')
    raise


def open_port(path, baud, rtscts=False, dsrdtr=False, timeout=1):
    if not os.path.exists(path):
        print(f'Device {path} not found')
        sys.exit(2)
    try:
        s = serial.Serial(path, baud, timeout=timeout, rtscts=rtscts, dsrdtr=dsrdtr)
        return s
    except Exception as e:
        print('Failed to open serial port:', e)
        sys.exit(3)


def print_lines(s):
    print('CTS:', s.cts, 'DSR:', s.dsr, 'RI:', s.ri, 'CD:', s.cd)


def loopback_test(s):
    msg = b'TEST-LOOPBACK-123\r\n'
    s.reset_input_buffer()
    s.reset_output_buffer()
    n = s.write(msg)
    s.flush()
    time.sleep(0.15)
    received = s.read(n)
    ok = received == msg
    print('Wrote bytes:', n)
    print('Received:', received)
    print('Loopback OK:' , ok)
    return ok


def rts_cts_test(s):
    print('Toggling RTS and reading CTS (if wired RTS->CTS should mirror)')
    states = []
    for value in (True, False, True):
        s.rts = value
        time.sleep(0.1)
        states.append((value, bool(s.cts)))
        print('Set RTS=', value, '-> CTS reads', s.cts)
    return states


def main():
    # basic arg parsing with minimal deps
    if len(sys.argv) < 2:
        print('Usage: test_cable.py /dev/ttyUSB0 [baud] [--rtscts] [--dsrdtr] [--verbose]')
        sys.exit(1)
    args = sys.argv[1:]
    path = args[0]
    baud = 9600
    rtscts = False
    dsrdtr = False
    verbose = False
    # parse optional args
    for a in args[1:]:
        if a.isdigit():
            baud = int(a)
        elif a == '--rtscts':
            rtscts = True
        elif a == '--dsrdtr':
            dsrdtr = True
        elif a == '--verbose':
            verbose = True

    s = open_port(path, baud, rtscts=rtscts, dsrdtr=dsrdtr)
    time.sleep(0.05)
    print('Port opened:', s)
    try:
        settings = s.get_settings()
    except Exception:
        settings = None
    print('pyserial settings:', settings)
    print('rtscts flag in object:', getattr(s, 'rtscts', None))
    print_lines(s)

    if verbose:
        print('\nVerbose diagnostics: toggling RTS slowly and sampling CTS...')
        for i in range(2):
            s.rts = True
            time.sleep(0.25)
            print('After set RTS True -> CTS:', s.cts)
            s.rts = False
            time.sleep(0.25)
            print('After set RTS False -> CTS:', s.cts)

    print('\nRunning loopback test (TX->RX)')
    loopback_test(s)

    print('\nRunning RTS/CTS test')
    rts_cts_test(s)

    s.close()
    print('\nDone')


if __name__ == '__main__':
    main()
