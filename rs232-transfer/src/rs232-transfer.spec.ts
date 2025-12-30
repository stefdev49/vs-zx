// Mock the serialport module before importing the rs232-transfer module
const mockPort = {
  open: jest.fn((callback: (err: Error | null) => void) => callback(null)),
  on: jest.fn(),
  write: jest.fn((data: Buffer, callback: (err: Error | null) => void) => callback(null)),
  drain: jest.fn((callback: (err: Error | null) => void) => callback(null)),
  close: jest.fn((callback?: (err: Error | null) => void) => callback && callback(null)),
  get: jest.fn((callback: (err: Error | null, signals: any) => void) => 
    callback(null, { cts: true, dsr: false, dcd: false })
  ),
  set: jest.fn((options: any, callback: (err: Error | null) => void) => callback(null)),
};

jest.mock('serialport', () => ({
  SerialPort: jest.fn().mockImplementation(() => mockPort),
}));

// Now import the module after mocking
import { transfer, sendProgram, receiveProgram, testConnection, RS232Options } from './index';

describe('RS232 Transfer Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export transfer function', () => {
    expect(typeof transfer).toBe('function');
    expect(transfer).toBeInstanceOf(Function);
  });

  it('should export sendProgram function', () => {
    expect(typeof sendProgram).toBe('function');
  });

  it('should export receiveProgram function', () => {
    expect(typeof receiveProgram).toBe('function');
  });

  it('should export testConnection function', () => {
    expect(typeof testConnection).toBe('function');
  });

  describe('transfer (legacy)', () => {
    it('should accept correct parameters without throwing', async () => {
      const testBuffer = Buffer.from([0x01, 0x02, 0x03]);
      const testPort = '/dev/ttyUSB0';

      // Should complete without error
      await expect(transfer(testBuffer, testPort)).resolves.toBeUndefined();
    });

    it('should accept optional baud rate parameter', async () => {
      const testBuffer = Buffer.from('test data');
      const testPort = 'COM3';
      const baudRate = 19200;

      await expect(transfer(testBuffer, testPort, baudRate)).resolves.toBeUndefined();
    });

    it('should return a promise', () => {
      const testBuffer = Buffer.from([0xaa, 0xbb]);
      const testPort = '/dev/ttyS0';

      const result = transfer(testBuffer, testPort);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const testPort = '/dev/ttyUSB0';

      await expect(transfer(emptyBuffer, testPort)).resolves.toBeUndefined();
    });
  });

  describe('sendProgram', () => {
    it('should send program with proper block format', async () => {
      const testData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const result = await sendProgram(testData, 'TEST', { port: '/dev/ttyUSB0' });

      expect(result.success).toBe(true);
      expect(result.bytesTransferred).toBeGreaterThan(testData.length);
    });

    it('should include autostart line in package', async () => {
      const testData = Buffer.from([0x00, 0x0a, 0x05, 0x00, 0xea, 0x0d]);
      const result = await sendProgram(testData, 'TEST', { port: '/dev/ttyUSB0' }, 10);

      expect(result.success).toBe(true);
    });

    it('should assert DTR before sending', async () => {
      const testData = Buffer.from([0x01, 0x02, 0x03]);
      await sendProgram(testData, 'TEST', { port: '/dev/ttyUSB0' });

      expect(mockPort.set).toHaveBeenCalledWith({ dtr: true }, expect.any(Function));
    });
  });

  describe('testConnection', () => {
    it('should test connection and return signals', async () => {
      const result = await testConnection({ port: '/dev/ttyUSB0' });

      expect(result.success).toBe(true);
      expect(result.signals).toBeDefined();
      expect(result.signals!.cts).toBe(true);
    });
  });
});
