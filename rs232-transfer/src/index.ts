/**
 * RS232 Transfer Module for ZX Spectrum via Interface 1
 *
 * Provides bidirectional transfer capabilities between VS Code and ZX Spectrum
 * using RS232 serial communication through a USB-RS232 adapter.
 *
 * Cable wiring (ZX Interface 1 to PC DB9):
 *   ZX TX (pin 2) → PC RXD (pin 3)
 *   ZX RX (pin 3) ← PC TXD (pin 2)
 *   ZX DTR input (pin 4) ← PC DTR (pin 4) - signals Spectrum that PC is ready
 *   ZX CTS output (pin 5) → PC CTS (pin 8) - signals PC that Spectrum wants to send
 *   ZX GND (pin 7) → PC GND (pin 5)
 */

import {
  createProgramPackage,
  validateProgramPackage,
  HeaderBlock,
  BlockType,
} from './blockFormat';

// SerialPort is lazily loaded to keep it optional
let SerialPortClass: any = null;

/**
 * RS232 transfer options
 */
export interface RS232Options {
  port: string;
  baudRate: number;
  mode: 'binary' | 'text';
  timeout: number;
  handshaking: boolean;
}

/**
 * Default RS232 options matching Interface 1 defaults
 */
export const defaultOptions: RS232Options = {
  port: '/dev/ttyUSB0',
  baudRate: 9600,
  mode: 'binary',
  timeout: 30000,
  handshaking: true,
};

/**
 * Transfer result with status and optional error
 */
export interface TransferResult {
  success: boolean;
  bytesTransferred: number;
  error?: string;
}

/**
 * Receive result with parsed data
 */
export interface ReceiveResult {
  success: boolean;
  header?: HeaderBlock;
  data?: Buffer;
  bytesReceived: number;
  error?: string;
}

/**
 * Signal state for debugging
 */
export interface SignalState {
  cts: boolean;
  dsr: boolean;
  dcd: boolean;
  dtr: boolean;
  rts: boolean;
}

/**
 * Lazily load the serialport module
 */
function getSerialPort(): any {
  if (!SerialPortClass) {
    try {
      SerialPortClass = require('serialport').SerialPort;
    } catch {
      throw new Error(
        'serialport module not installed. Run: npm install serialport'
      );
    }
  }
  return SerialPortClass;
}

/**
 * List available serial ports
 */
export async function listPorts(): Promise<
  Array<{ path: string; manufacturer?: string }>
> {
  const SP = getSerialPort();
  const ports = await SP.list();
  return ports.map((p: any) => ({
    path: p.path,
    manufacturer: p.manufacturer,
  }));
}

/**
 * Open a serial port with the specified options
 */
function openPort(options: RS232Options): Promise<any> {
  const SP = getSerialPort();

  return new Promise((resolve, reject) => {
    const port = new SP({
      path: options.port,
      baudRate: options.baudRate,
      dataBits: options.mode === 'binary' ? 8 : 7,
      parity: 'none',
      stopBits: 1,
      rtscts: options.handshaking,
      autoOpen: false,
    });

    port.open((err: Error | null) => {
      if (err) {
        reject(new Error(`Failed to open ${options.port}: ${err.message}`));
      } else {
        resolve(port);
      }
    });
  });
}

/**
 * Get current signal states from the port
 */
export async function getSignals(
  options: Partial<RS232Options> = {}
): Promise<SignalState> {
  const opts = { ...defaultOptions, ...options };
  const port = await openPort(opts);

  return new Promise((resolve, reject) => {
    port.get((err: Error | null, signals: any) => {
      port.close();
      if (err) {
        reject(new Error(`Failed to read signals: ${err.message}`));
      } else {
        resolve({
          cts: signals.cts || false,
          dsr: signals.dsr || false,
          dcd: signals.dcd || false,
          dtr: false, // DTR is output, not readable
          rts: false, // RTS is output, not readable
        });
      }
    });
  });
}

/**
 * Wait for CTS signal indicating ZX Spectrum is ready
 *
 * Cable: ZX CTS output (pin 5) → PC CTS (pin 8)
 * When ZX asserts CTS, it indicates the Spectrum is ready for communication.
 * For sending: ZX has acknowledged our DTR and is ready to receive.
 * For receiving: ZX is ready to transmit data.
 *
 * @param port - Open serial port
 * @param timeout - Maximum time to wait in ms
 */
async function waitForCTS(port: any, timeout: number): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkCTS = () => {
      port.get((err: Error | null, signals: any) => {
        if (err) {
          reject(new Error(`Signal check failed: ${err.message}`));
          return;
        }

        if (signals.cts) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for ZX Spectrum CTS signal'));
          return;
        }

        // Check again in 100ms
        setTimeout(checkCTS, 100);
      });
    };

    checkCTS();
  });
}

/**
 * Assert DTR to signal ZX Spectrum that PC is ready
 *
 * Cable: PC DTR (pin 4) → ZX DTR input (pin 4)
 * When PC asserts DTR, the Spectrum sees "remote station wishes to send data"
 * This must be asserted before the ZX will accept incoming data.
 */
async function assertDTR(port: any): Promise<void> {
  return new Promise((resolve, reject) => {
    port.set({ dtr: true }, (err: Error | null) => {
      if (err) {
        reject(new Error(`Failed to assert DTR: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Clear DTR signal
 */
async function clearDTR(port: any): Promise<void> {
  return new Promise((resolve, reject) => {
    port.set({ dtr: false }, (err: Error | null) => {
      if (err) {
        reject(new Error(`Failed to clear DTR: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Send a BASIC program to ZX Spectrum via RS232
 *
 * The ZX Spectrum should be waiting with:
 *   FORMAT "b";9600
 *   LOAD *"b"
 *
 * @param basicData - Tokenized BASIC program binary
 * @param filename - Program name (max 10 chars)
 * @param options - RS232 options
 * @param autostartLine - Optional autostart line number
 */
export async function sendProgram(
  basicData: Buffer,
  filename: string,
  options: Partial<RS232Options> = {},
  autostartLine: number = 0
): Promise<TransferResult> {
  const opts = { ...defaultOptions, ...options };
  let port: any = null;

  try {
    port = await openPort(opts);

    // Assert DTR to indicate we're ready
    await assertDTR(port);

    // Wait for CTS from ZX if handshaking enabled
    if (opts.handshaking) {
      try {
        await waitForCTS(port, opts.timeout);
      } catch {
        // Continue anyway - some cables don't support CTS
        console.warn('CTS not detected, proceeding without handshaking');
      }
    }

    // Create the program package with header and data blocks
    const programPackage = createProgramPackage(filename, basicData, autostartLine);

    // Send the data
    await new Promise<void>((resolve, reject) => {
      port.write(programPackage, (err: Error | null) => {
        if (err) {
          reject(new Error(`Write failed: ${err.message}`));
        } else {
          port.drain((drainErr: Error | null) => {
            if (drainErr) {
              reject(new Error(`Drain failed: ${drainErr.message}`));
            } else {
              resolve();
            }
          });
        }
      });
    });

    // Clear DTR and close
    await clearDTR(port);
    await new Promise<void>((resolve) => port.close(() => resolve()));

    return {
      success: true,
      bytesTransferred: programPackage.length,
    };
  } catch (error: any) {
    if (port) {
      try {
        await clearDTR(port);
        port.close();
      } catch {
        // Ignore close errors
      }
    }
    return {
      success: false,
      bytesTransferred: 0,
      error: error.message,
    };
  }
}

/**
 * Send raw binary data to ZX Spectrum (legacy function for compatibility)
 */
export async function transfer(
  binary: Buffer,
  portPath: string,
  baudRate: number = 9600
): Promise<void> {
  const result = await sendProgram(binary, 'PROGRAM', {
    port: portPath,
    baudRate,
  });

  if (!result.success) {
    throw new Error(result.error);
  }
}

/**
 * Receive a BASIC program from ZX Spectrum via RS232
 *
 * The ZX Spectrum should be sending with:
 *   FORMAT "b";9600
 *   SAVE *"b" "PROGRAM"
 *
 * @param options - RS232 options
 */
export async function receiveProgram(
  options: Partial<RS232Options> = {}
): Promise<ReceiveResult> {
  const opts = { ...defaultOptions, ...options };
  let port: any = null;
  const receivedData: Buffer[] = [];
  let totalBytes = 0;

  try {
    port = await openPort(opts);

    // Assert DTR to indicate we're ready to receive
    await assertDTR(port);

    // Set up data reception
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Receive timeout - no data received from ZX Spectrum'));
      }, opts.timeout);

      let lastDataTime = Date.now();
      let headerReceived = false;
      let expectedLength = 0;

      port.on('data', (chunk: Buffer) => {
        receivedData.push(chunk);
        totalBytes += chunk.length;
        lastDataTime = Date.now();

        // Check if we have the header (19 bytes)
        if (!headerReceived && totalBytes >= 19) {
          headerReceived = true;
          const headerBuf = Buffer.concat(receivedData);
          const dataLength = headerBuf.readUInt16LE(12);
          expectedLength = 19 + dataLength + 2; // header + data + checksum
        }

        // Check if we have all expected data
        if (headerReceived && totalBytes >= expectedLength) {
          clearTimeout(timeoutId);
          resolve();
        }
      });

      port.on('error', (err: Error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Port error: ${err.message}`));
      });

      // Also check for idle timeout (no more data coming)
      const idleCheck = setInterval(() => {
        if (totalBytes > 0 && Date.now() - lastDataTime > 2000) {
          clearInterval(idleCheck);
          clearTimeout(timeoutId);
          resolve(); // Resolve with what we have
        }
      }, 500);
    });

    // Clear DTR and close
    await clearDTR(port);
    await new Promise<void>((resolve) => port.close(() => resolve()));

    if (totalBytes === 0) {
      return {
        success: false,
        bytesReceived: 0,
        error: 'No data received',
      };
    }

    // Parse the received data
    const fullData = Buffer.concat(receivedData);
    const parsed = validateProgramPackage(fullData);

    if (!parsed.valid) {
      return {
        success: false,
        bytesReceived: totalBytes,
        data: fullData, // Return raw data for debugging
        error: parsed.error,
      };
    }

    return {
      success: true,
      header: parsed.header!,
      data: parsed.programData!,
      bytesReceived: totalBytes,
    };
  } catch (error: any) {
    if (port) {
      try {
        await clearDTR(port);
        port.close();
      } catch {
        // Ignore close errors
      }
    }
    return {
      success: false,
      bytesReceived: totalBytes,
      data: receivedData.length > 0 ? Buffer.concat(receivedData) : undefined,
      error: error.message,
    };
  }
}

/**
 * Test serial port connectivity
 *
 * @param options - RS232 options
 */
export async function testConnection(
  options: Partial<RS232Options> = {}
): Promise<{
  success: boolean;
  signals?: SignalState;
  error?: string;
}> {
  const opts = { ...defaultOptions, ...options };

  try {
    const port = await openPort(opts);

    // Read signals
    const signals = await new Promise<SignalState>((resolve, reject) => {
      port.get((err: Error | null, sigs: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            cts: sigs.cts || false,
            dsr: sigs.dsr || false,
            dcd: sigs.dcd || false,
            dtr: false,
            rts: false,
          });
        }
      });
    });

    // Toggle DTR to test output
    await assertDTR(port);
    await new Promise((r) => setTimeout(r, 100));
    await clearDTR(port);

    await new Promise<void>((resolve) => port.close(() => resolve()));

    return { success: true, signals };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Re-export block format utilities
export {
  createProgramPackage,
  validateProgramPackage,
  HeaderBlock,
  BlockType,
} from './blockFormat';
