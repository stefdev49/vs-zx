"use strict";
// @ts-nocheck
// RS232 Transfer Module for ZX Spectrum via USB-RS232 adapter (DB9 to Interface 1)
Object.defineProperty(exports, "__esModule", { value: true });
exports.transfer = transfer;
const SerialPort = require('serialport').SerialPort;
// ZX Spectrum RS232 protocol over Interface 1
// The Interface 1 expects data in a format similar to tape blocks,
// but since RS232 is serial, we send the raw BASIC block bytes.
async function transfer(binary, portPath, baudRate = 9600) {
    return new Promise((resolve, reject) => {
        const port = new SerialPort(portPath, {
            baudRate: baudRate
        });
        port.on('open', () => {
            console.log(`Port ${portPath} opened at ${baudRate} baud`);
            // Send the binary data
            // For ZX Interface 1 loading a BASIC program, precede with command,
            // but since the transfer is initiated from VS Code, assume ZX is ready with LOAD ""
            // Simple send: stream the data
            port.write(binary, (err) => {
                if (err) {
                    reject(new Error(`Write error: ${err.message}`));
                    port.close();
                }
                else {
                    port.drain((drainErr) => {
                        if (drainErr) {
                            reject(new Error(`Drain error: ${drainErr.message}`));
                        }
                        else {
                            console.log('Data sent successfully');
                            port.close((closeErr) => {
                                if (closeErr)
                                    reject(new Error(`Close error: ${closeErr.message}`));
                                else
                                    resolve();
                            });
                        }
                    });
                }
            });
        });
        port.on('error', (err) => {
            reject(new Error(`Serial port error: ${err.message}`));
        });
    });
}
// In a full implementation, would need:
// - Handshaking with Interface 1
// - Proper block format (header + data blocks for tape compatibility)
// - Error correction
// - Interrupt handling to wait for ZX readiness
// - Conversion to true tape protocol if needed
//# sourceMappingURL=index.js.map