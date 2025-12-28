// Mock the serialport module before importing the rs232-transfer module
jest.mock("serialport", () => ({
  SerialPort: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    write: jest.fn(),
    drain: jest.fn(),
    close: jest.fn(),
  })),
}));

// Now import the module after mocking
import { transfer } from "./index";

describe("RS232 Transfer Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export transfer function", () => {
    expect(typeof transfer).toBe("function");
    expect(transfer).toBeInstanceOf(Function);
  });

  it("should accept correct parameters without throwing", () => {
    const testBuffer = Buffer.from([0x01, 0x02, 0x03]);
    const testPort = "/dev/ttyUSB0";

    // Test that calling the function doesn't throw immediately
    // The actual serial communication will be mocked
    expect(() => {
      transfer(testBuffer, testPort);
    }).not.toThrow();
  });

  it("should accept optional baud rate parameter", () => {
    const testBuffer = Buffer.from("test data");
    const testPort = "COM3";
    const baudRate = 19200;

    expect(() => {
      transfer(testBuffer, testPort, baudRate);
    }).not.toThrow();
  });

  it("should return a promise", () => {
    const testBuffer = Buffer.from([0xaa, 0xbb]);
    const testPort = "/dev/ttyS0";

    const result = transfer(testBuffer, testPort);
    expect(result).toBeInstanceOf(Promise);
  });

  it("should handle empty buffer", () => {
    const emptyBuffer = Buffer.alloc(0);
    const testPort = "/dev/ttyUSB0";

    expect(() => {
      transfer(emptyBuffer, testPort);
    }).not.toThrow();
  });
});
