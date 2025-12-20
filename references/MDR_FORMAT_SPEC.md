# MDR (Microdrive) Format Specification

## Overview
The MDR (Microdrive) format is a binary image format used to represent Sinclair ZX Microdrive cartridges. It is primarily used by emulators like WinZ80 to simulate Microdrive operations. This document provides a detailed specification of the MDR format, including its structure, reading, and writing processes.

## Sector Structure
Each sector in the MDR format is **543 bytes** long and consists of three parts:
1. **Header (14 bytes)**
2. **Record Descriptor (14 bytes)**
3. **Data Block (515 bytes)**

### Header Structure
```cpp
struct tMDV_HDR {
    BYTE byHDFLAG;      // Value 1, to indicate header block
    BYTE byHDNUMB;      // Sector number (values 254 down to 1)
    UNUSED_BYTE by[2];  // Not used (and of undetermined value)
    char sHDNAME[10];   // Microdrive cartridge name (blank padded)
    BYTE byHDCHK;       // Header checksum (of first 14 bytes)
};
```

### Record Descriptor Structure
```cpp
struct tMDV_REC {
    BYTE byRECFLG;      // Record flags (bit 0: always 0 to indicate record block, bit 1: set for EOF block, bit 2: reset for PRINT file)
    BYTE byRECNUM;      // Data block sequence number (starts at 0)
    WORD wRECLEN;       // Data block length (<=512, LSB first)
    char sRECNAM[10];   // Filename (blank padded)
    BYTE byDESCHK;      // Record descriptor checksum (of previous 14 bytes)
};
```

### Data Block Structure
```cpp
struct tMDV_DATA {
    BYTE pbyDATA[512];  // Data block
    BYTE byDCHK;        // Data block checksum (of all 512 bytes of data)
};
```

## Checksum Calculation
Checksums are calculated using a specific algorithm that mimics the Z80 assembly code used in the Sinclair Microdrive ROM. The checksum is computed as follows:

```cpp
static BYTE const CHK(const BYTE* pvStart, WORD wLen) {
    const BYTE* p;
    int i, s = 0;
    for (p = pvStart, i = 0; i < wLen; ++i, ++p) {
        s = (s + *p) % 255;
    }
    return (BYTE)s;
}
```

## MDR File Structure
An MDR file consists of:
1. **Sectors**: A sequence of sectors (each 543 bytes long). The number of sectors can vary, but the maximum is 254.
2. **Write Protection Byte**: A single byte (`0x00`) appended at the end of the file to indicate write protection.

## Reading MDR Files
To read an MDR file:
1. Open the file in binary mode.
2. Read the file in chunks of 543 bytes (one sector at a time).
3. For each sector, parse the header, record descriptor, and data block.
4. Verify checksums for each part of the sector.
5. Handle errors (e.g., checksum mismatches) as needed.

## Writing MDR Files
To write an MDR file:
1. Create an empty file in binary mode.
2. For each sector:
   - Write the header (14 bytes).
   - Write the record descriptor (14 bytes).
   - Write the data block (515 bytes).
3. Append a write protection byte (`0x00`) at the end of the file.

## Error Handling
The MDR format supports error handling through checksum verification. If a checksum mismatch is detected, the sector can be marked as corrupted, and recovery mechanisms (e.g., bitwise averaging) can be applied.

## Example Usage
To create an MDR file from a raw Microdrive image:
1. Use `mdv2img.exe -i <inputfile> -r <outputfile.mdr>` to repair and convert the raw image to MDR format.
2. The output file will be a valid MDR file that can be loaded into emulators like WinZ80.

## References
- [mdv2img Documentation](Doc/Mdv2Img.txt)
- [BINTAP Documentation](Doc/BINTAP.TXT)
