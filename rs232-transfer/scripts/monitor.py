#!/usr/bin/env python3
"""
monitor.py

Monitor RS232 modem/control lines (CTS, DSR, RI, CD) and log any changes.
"""
import sys
import time
import os
from datetime import datetime

try:
    import serial
except Exception:
    print('pyserial required: pip install pyserial')
    raise


def read_lines(ser):
    # Attempt multiple APIs
    status = {}
    try:
        if hasattr(ser, 'getCTS'):
            status['cts'] = bool(ser.getCTS())
        else:
            status['cts'] = bool(getattr(ser, 'cts', False))
    except Exception:
        status['cts'] = False
    try:
        if hasattr(ser, 'getDSR'):
            status['dsr'] = bool(ser.getDSR())
        else:
            status['dsr'] = bool(getattr(ser, 'dsr', False))
    except Exception:
        status['dsr'] = False
    try:
        if hasattr(ser, 'getRI'):
            status['ri'] = bool(ser.getRI())
        else:
            status['ri'] = bool(getattr(ser, 'ri', False))
    except Exception:
        status['ri'] = False
    try:
        if hasattr(ser, 'getCD'):
            status['cd'] = bool(ser.getCD())
        else:
            status['cd'] = bool(getattr(ser, 'cd', False))
    except Exception:
        status['cd'] = False
    return status


def main(argv):
    import argparse

    parser = argparse.ArgumentParser(description='Monitor RS232 control lines and log changes')
    parser.add_argument('device', nargs='?', default='/dev/ttyUSB0')
    parser.add_argument('baud', nargs='?', type=int, default=9600)
    parser.add_argument('--interval', type=float, default=0.05, help='Polling interval in seconds')
    parser.add_argument('--out', type=str, default=None, help='Log file path (default: console)')
    args = parser.parse_args(argv[1:])

    device = args.device
    if not os.path.exists(device):
        print(f'Device {device} not found')
        sys.exit(2)

    ser = serial.Serial(port=device, baudrate=args.baud, timeout=1)

    last = read_lines(ser)
    header = 'time,cts,dsr,ri,cd'
    if args.out:
        f = open(args.out, 'a')
        if os.stat(args.out).st_size == 0:
            f.write(header + '\n')
    else:
        f = None
        print(header)

    try:
        while True:
            cur = read_lines(ser)
            if cur != last:
                ts = datetime.now().isoformat()
                line = f"{ts},{int(cur['cts'])},{int(cur['dsr'])},{int(cur['ri'])},{int(cur['cd'])}"
                if f:
                    f.write(line + '\n')
                    f.flush()
                else:
                    print(line)
                last = cur
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            ser.close()
        except Exception:
            pass


if __name__ == '__main__':
    main(sys.argv)
