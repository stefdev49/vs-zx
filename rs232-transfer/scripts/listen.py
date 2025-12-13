#!/usr/bin/env python3
"""
listen.py

Capture raw bytes from a serial device and save to a timestamped file.
Default settings: /dev/ttyUSB0, 9600, 8N2, RTS/CTS enabled

Usage:
  python3 listen.py [device] [baud]

Examples:
  python3 listen.py /dev/ttyUSB0 9600
  python3 listen.py
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


def open_serial(device='/dev/ttyUSB1', baud=9600, rtscts=True):
    # stopbits=1 -> STOPBITS_ONE
    ser = serial.Serial(
        port=device,
        baudrate=baud,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=1,
        rtscts=rtscts
    )
    return ser


def get_cts(ser):
    # support both property and method APIs
    try:
        if hasattr(ser, 'getCTS'):
            return bool(ser.getCTS())
    except Exception:
        pass
    return bool(getattr(ser, 'cts', False))


def get_dsr(ser):
    try:
        if hasattr(ser, 'getDSR'):
            return bool(ser.getDSR())
    except Exception:
        pass
    return bool(getattr(ser, 'dsr', False))


def hexdump_line(data, base_offset=0):
    # produce a single-line hex + ascii representation
    hexpart = ' '.join(f'{b:02X}' for b in data)
    asciipart = ''.join((chr(b) if 32 <= b < 127 else '.') for b in data)
    return f'{base_offset:08X}: {hexpart:<48}  |{asciipart}|'


def main(argv):
    import argparse

    parser = argparse.ArgumentParser(description='Listen on a serial port and save incoming bytes')
    parser.add_argument('device', nargs='?', default='/dev/ttyUSB0')
    parser.add_argument('baud', nargs='?', type=int, default=9600)
    parser.add_argument('--log', action='store_true', help='Write hex/ascii log alongside binary capture')
    parser.add_argument('--dtr', choices=['on', 'off', 'toggle'], default=None, help='Set DTR before listening')
    parser.add_argument('--dtr-pulse', type=int, default=0, help='Pulse DTR for N milliseconds before listening (0 = no pulse)')
    parser.add_argument('--assert-line', choices=['rts', 'dtr', 'none'], default=None, help='Control which host output line to assert (rts/dtr)')
    parser.add_argument('--monitor-line', choices=['cts', 'dsr', 'none'], default=None, help='Monitor which incoming control line (cts/dsr)')
    parser.add_argument('--sevenbit', action='store_true', help='Strip high bit from incoming bytes (7-bit text mode)')
    parser.add_argument('--no-wait-cts', action='store_true', help='Do not wait for CTS to be asserted')
    parser.add_argument('--rtscts', action='store_true', help='Enable RTS/CTS hardware flow control')
    args = parser.parse_args(argv[1:])

    device = args.device
    baud = args.baud
    do_log = args.log

    if not os.path.exists(device):
        print(f'Device {device} not found')
        sys.exit(2)

    ser = open_serial(device, baud, rtscts=args.rtscts)

    # Determine which line to assert and which to monitor
    assert_line = args.assert_line
    monitor_line = args.monitor_line

    # Backward-compatibility: if --assert-line not provided but --dtr is, use that
    if assert_line is None and args.dtr is not None:
        assert_line = 'dtr'

    # If monitor-line not provided but rtscts enabled, default to cts
    if monitor_line is None and args.rtscts:
        monitor_line = 'cts'

    # Apply initial assertion if requested via assert_line
    if assert_line and assert_line != 'none':
        try:
            if assert_line == 'dtr':
                # If --dtr provided, respect its on/off/toggle value
                if args.dtr:
                    if args.dtr == 'on':
                        ser.setDTR(True)
                    elif args.dtr == 'off':
                        ser.setDTR(False)
                    elif args.dtr == 'toggle':
                        ser.setDTR(not getattr(ser, 'dtr', False))
                else:
                    ser.setDTR(True)
                print(f'Host DTR asserted')
            elif assert_line == 'rts':
                ser.setRTS(True)
                print(f'Host RTS asserted')
        except Exception as e:
            print(f'Failed to set {assert_line.upper()}: {e}')

    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    outname = f'llist-{ts}.bin'
    logname = f'llist-{ts}.log' if do_log else None
    print(f'Listening on {device} @ {baud} 8N1 rtscts={args.rtscts} -> {outname}')
    if logname:
        print(f'Logging hex/ASCII to {logname}')

    # If monitoring a control line, poll until asserted (or timeout) unless disabled
    def read_monitor(ser, line):
        if line == 'cts':
            return get_cts(ser)
        if line == 'dsr':
            return get_dsr(ser)
        return False

    if monitor_line and monitor_line != 'none' and not args.no_wait_cts:
        print(f'Waiting for {monitor_line.upper()} to be asserted by the remote device...')
        wait_start = time.time()
        while True:
            state = read_monitor(ser, monitor_line)
            print(f'{monitor_line.upper()}={state}', end='\r')
            if state:
                print(f'\n{monitor_line.upper()} asserted, starting capture')
                break
            if time.time() - wait_start > 30:
                print(f'\nTimeout waiting for {monitor_line.upper()} (30s). Proceeding to capture.')
                break
            time.sleep(0.1)

    start = time.time()
    try:
        with open(outname, 'wb') as f, (open(logname, 'w') if logname else open(os.devnull, 'w')) as lf:
            offset = 0
            last_monitor = read_monitor(ser, monitor_line) if monitor_line and monitor_line != 'none' else None
            if do_log:
                lf.write(f'# start {datetime.now().isoformat()}\n')
                lf.write(f'# monitor_line: {monitor_line}\n')
                lf.write(f'# monitor initial: {last_monitor}\n')

            # Optionally pulse asserted line (DTR or RTS) — pulse respects assert_line
            if args.dtr_pulse and args.dtr_pulse > 0 and assert_line and assert_line != 'none':
                try:
                    if assert_line == 'dtr':
                        ser.setDTR(True)
                        time.sleep(args.dtr_pulse / 1000.0)
                        ser.setDTR(False)
                    elif assert_line == 'rts':
                        ser.setRTS(True)
                        time.sleep(args.dtr_pulse / 1000.0)
                        ser.setRTS(False)
                    if do_log:
                        lf.write(f'# {assert_line.upper()} pulsed for {args.dtr_pulse}ms\n')
                        lf.flush()
                except Exception as e:
                    print(f'Failed to pulse {assert_line.upper()}: {e}')
            while True:
                # monitor control line changes
                if monitor_line and monitor_line != 'none':
                    try:
                        cur = read_monitor(ser, monitor_line)
                    except Exception:
                        cur = False
                    if cur != last_monitor and do_log:
                        lf.write(f'# {monitor_line.upper()} changed: {cur} at {time.time():.3f}\n')
                        lf.flush()
                        last_monitor = cur
                    last_cts = cts

                data = ser.read(1024)
                if data:
                    f.write(data)
                    f.flush()
                    if args.sevenbit:
                        # strip high bit for 7-bit text mode
                        data = bytes([b & 0x7F for b in data])
                        # overwrite written data with 7-bit-stripped data
                        f.seek(-len(data), os.SEEK_CUR)
                        f.write(data)
                        f.flush()
                    if logname:
                        # write hex/ascii in 16-byte lines
                        for i in range(0, len(data), 16):
                            chunk = data[i:i+16]
                            lf.write(hexdump_line(chunk, offset + i) + '\n')
                        lf.flush()
                    offset += len(data)
                else:
                    # no data this iteration; sleep briefly
                    time.sleep(0.05)
    except KeyboardInterrupt:
        elapsed = time.time() - start
        print('\nInterrupted — closing')
        print(f'Wrote file: {outname}, elapsed {elapsed:.1f}s')
    finally:
        try:
            ser.close()
        except Exception:
            pass


if __name__ == '__main__':
    main(sys.argv)
