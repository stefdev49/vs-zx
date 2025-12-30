# RS232 Transfer Module for ZX Spectrum

Bidirectional RS232 serial transfer between VS Code and ZX Spectrum via Interface 1.

## Features

- **Send programs** to ZX Spectrum with proper tape-compatible block format
- **Receive programs** from ZX Spectrum with automatic parsing
- **Hardware handshaking** via DTR/CTS signals for reliable transfers
- **Connection testing** with signal state diagnostics
- **Serial port discovery** to find available USB-RS232 adapters

## Cable Wiring

This module is designed for a **Data RS232 cable** with the following pinout:

| ZX Interface 1 | Direction | PC DB9 | Function |
|----------------|-----------|--------|----------|
| Pin 2 (TX) | → | Pin 3 (RXD) | ZX transmits data to PC |
| Pin 3 (RX) | ← | Pin 2 (TXD) | PC transmits data to ZX |
| Pin 4 (DTR input) | ← | Pin 4 (DTR) | PC signals "ready" to ZX |
| Pin 5 (CTS output) | → | Pin 8 (CTS) | ZX signals "ready" to PC |
| Pin 7 (GND) | — | Pin 5 (GND) | Ground |
| Pin 9 (9V) | → | Pin 6 (DSR) | Typically unused |

### Signal Flow

```
┌─────────────────┐                    ┌─────────────────┐
│  ZX Spectrum    │                    │       PC        │
│  Interface 1    │                    │    (VS Code)    │
├─────────────────┤                    ├─────────────────┤
│ TX (pin 2)  ────┼──────────────────→─┼──── RXD (pin 3) │
│ RX (pin 3)  ←───┼──────────────────←─┼──── TXD (pin 2) │
│ DTR (pin 4) ←───┼──────────────────←─┼──── DTR (pin 4) │
│ CTS (pin 5) ────┼──────────────────→─┼──── CTS (pin 8) │
│ GND (pin 7) ────┼────────────────────┼──── GND (pin 5) │
└─────────────────┘                    └─────────────────┘
```

## ZX Spectrum Setup

### Binary Mode (8-bit) - Recommended for program transfer

```basic
FORMAT "b";9600
```

### Text Mode (7-bit with RTS/CTS handshaking)

```basic
FORMAT "p";9600
```

## Access in VS Code

There are multiple ways to access RS232 transfer commands:

### Command Palette

Press **Ctrl+Shift+P** (or **F1**) and type:
- **ZX BASIC: Send via RS232** - send current file to ZX Spectrum
- **ZX BASIC: Receive via RS232** - receive program from ZX Spectrum
- **ZX BASIC: Test RS232 Connection** - test serial connection
- **ZX BASIC: List Serial Ports** - show available ports

### Right-Click Context Menu

With a `.bas` file open, right-click in the editor to see:
- **Send via RS232** - send program to ZX Spectrum
- **Receive via RS232** - receive program from ZX Spectrum

### Editor Title Bar

The upload icon (↑) in the editor title bar sends the current file via RS232.

## Usage

### Sending a Program to ZX Spectrum

1. On the ZX Spectrum:
   ```basic
   FORMAT "b";9600
   LOAD *"b"
   ```

2. In VS Code, run **ZX BASIC: Send via RS232**

### Receiving a Program from ZX Spectrum

1. In VS Code, run **ZX BASIC: Receive via RS232**

2. On the ZX Spectrum:
   ```basic
   FORMAT "b";9600
   SAVE *"b" "PROGRAM"
   ```

## Protocol

### Block Format

The module uses ZX Spectrum tape-compatible block format:

**Header Block (19 bytes):**
| Offset | Size | Description |
|--------|------|-------------|
| 0 | 1 | Flag byte (0x00 = header) |
| 1 | 1 | Block type (0x00 = BASIC program) |
| 2-11 | 10 | Filename (space-padded) |
| 12-13 | 2 | Data length (little-endian) |
| 14-15 | 2 | Autostart line (≥32768 = none) |
| 16-17 | 2 | Variables offset |
| 18 | 1 | XOR checksum |

**Data Block:**
| Offset | Size | Description |
|--------|------|-------------|
| 0 | 1 | Flag byte (0xFF = data) |
| 1-N | N | Program data |
| N+1 | 1 | XOR checksum |

### Handshaking Sequence

**Sending to ZX:**
1. PC asserts DTR → ZX sees "PC ready to send"
2. PC optionally waits for CTS from ZX
3. PC sends header block
4. PC sends data block
5. PC clears DTR

**Receiving from ZX:**
1. PC asserts DTR → ZX sees "PC ready to receive"
2. PC waits for incoming data
3. PC parses header block
4. PC receives data block
5. PC clears DTR

## VS Code Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `zxBasic.rs232.port` | `/dev/ttyUSB0` | Serial port path |
| `zxBasic.rs232.baudRate` | `9600` | Baud rate (1200-19200) |
| `zxBasic.rs232.mode` | `binary` | Transfer mode (binary/text) |
| `zxBasic.rs232.timeout` | `30000` | Timeout in milliseconds |
| `zxBasic.rs232.handshaking` | `true` | Enable RTS/CTS flow control |

## API

```typescript
import { sendProgram, receiveProgram, testConnection, listPorts } from 'rs232-transfer';

// Send a BASIC program
const result = await sendProgram(basicData, 'MYPROG', {
  port: '/dev/ttyUSB0',
  baudRate: 9600,
}, 10); // autostart line 10

// Receive a BASIC program
const received = await receiveProgram({
  port: '/dev/ttyUSB0',
  baudRate: 9600,
});

// Test connection
const test = await testConnection({ port: '/dev/ttyUSB0' });
console.log('CTS:', test.signals?.cts);

// List available ports
const ports = await listPorts();
```

## Troubleshooting

### No CTS Signal

If CTS is always low, check:
- ZX Spectrum is powered on with Interface 1 attached
- Cable is properly connected
- Interface 1 RS232 circuitry is functional (see repair notes)

### DTR Not Working

Common failure points on Interface 1:
- Transistor stages Q5 (BC213C) and Q6 (BC184C)
- Bias resistors R14, R15, R16, R18, R20
- Pull network R24, R25, R28, R29
- Clamp diodes D6, D7 (BZX79C4V3)
- ±12V power rails

### Permission Denied on Linux

Add your user to the `dialout` group:
```bash
sudo usermod -a -G dialout $USER
```
Then log out and back in.

## References

- [ZX Interface 1 Service Manual](https://spectrumforeveryone.com/)
- [zxtrans - ZX Spectrum RS232 tools](https://github.com/ruyrybeyro/zxtrans)
- [serialport - Node.js serial port library](https://serialport.io/)
