# MDR (Microdrive) Format Technical Specification

## Overview
The MDR (Microdrive) format is a binary image format used to represent Sinclair ZX Microdrive cartridges. This specification describes the format in a language-agnostic manner, detailing the structure of sectors, how different types of data (BASIC, image, code) are stored, and how they should be read.

## Sector Types
The MDR format supports multiple types of sectors, each serving a specific purpose:

### 1. Header Sector
- **Purpose**: Contains metadata about the cartridge, such as the cartridge name and sector number.
- **Structure**:
  - `byHDFLAG` (1 byte): Always set to `1` to indicate a header block.
  - `byHDNUMB` (1 byte): Sector number (values range from 254 down to 1).
  - `UNUSED_BYTE` (2 bytes): Reserved and unused.
  - `sHDNAME` (10 bytes): Microdrive cartridge name (blank-padded).
  - `byHDCHK` (1 byte): Header checksum (calculated over the first 14 bytes).

### 2. Record Descriptor Sector
- **Purpose**: Describes the data block, including flags, sequence number, length, and filename.
- **Structure**:
  - `byRECFLG` (1 byte): Record flags.
    - Bit 0: Always `0` to indicate a record block.
    - Bit 1: Set to `1` for the EOF (End of File) block.
    - Bit 2: Reset to `0` for a PRINT file.
    - Bits 3-7: Unused (always `0`).
  - `byRECNUM` (1 byte): Data block sequence number (starts at `0`).
  - `wRECLEN` (2 bytes): Data block length (little-endian, <= 512 bytes).
  - `sRECNAM` (10 bytes): Filename (blank-padded).
  - `byDESCHK` (1 byte): Record descriptor checksum (calculated over the previous 14 bytes).

### 3. Data Block Sector
- **Purpose**: Contains the actual data (BASIC, image, or code).
- **Structure**:
  - `pbyDATA` (512 bytes): Data block.
  - `byDCHK` (1 byte): Data block checksum (calculated over all 512 bytes of data).

## Data Storage
The MDR format stores different types of data (BASIC, image, code) in the data block sector (`pbyDATA`). The type of data is determined by the record flags (`byRECFLG`) and the filename (`sRECNAM`).

### 1. BASIC Data
- **Storage**: BASIC programs are stored as raw tokenized BASIC code in the data block.
- **Reading**: The data block should be read as a sequence of bytes representing tokenized BASIC instructions. The sequence number (`byRECNUM`) indicates the order of the blocks in the file.

#### **Saving a BASIC Program to an MDR File**
1. **Tokenization**: Convert the BASIC program into tokenized form. This involves replacing BASIC keywords (e.g., `PRINT`, `FOR`, `NEXT`) with their corresponding token values. Tokenization reduces the size of the program and makes it easier to store and execute.
2. **Chunking**: Split the tokenized BASIC program into chunks of up to 512 bytes each. Each chunk will be stored in a separate data block sector.
3. **Sequence Numbering**: Assign a sequence number (`byRECNUM`) to each chunk to maintain the order of the program.
4. **Create Record Descriptors**: Set the record flags (`byRECFLG`) to indicate the type of data (BASIC program). For a BASIC program, the flags might be set to `0x00` (indicating a record block). Assign a filename (`sRECNAM`) to the program (e.g., `"PROGRAM"`). Set the length (`wRECLEN`) of each data block to the actual size of the chunk (up to 512 bytes).
5. **Calculate Checksums**: Calculate the checksum for the header sector (`byHDCHK`), record descriptor sector (`byDESCHK`), and data block sector (`byDCHK`).
6. **Write Sectors to the MDR File**: Write the header sector, record descriptor sector, and data block sector to the MDR file.
7. **Append Write Protection Byte**: Append a single byte (`0x00`) at the end of the file to indicate write protection.

#### **Reading a BASIC Program from an MDR File**
1. **Open the MDR File**: Open the MDR file in binary mode.
2. **Read Sectors**: Read the file in chunks of 543 bytes (one sector at a time).
3. **Parse Sectors**: For each sector, parse the header, record descriptor, and data block.
4. **Verify Checksums**: Verify the checksums for each part of the sector. If a checksum mismatch is detected, mark the sector as corrupted and apply recovery mechanisms if needed.
5. **Reconstruct the BASIC Program**:
   - **Collect Data Blocks**: Collect all data blocks with the same filename (`sRECNAM`) and sort them by their sequence number (`byRECNUM`).
   - **Concatenate Data Blocks**: Concatenate the data blocks in the order of their sequence numbers to reconstruct the tokenized BASIC program.
   - **Detokenize**: Convert the tokenized BASIC program back to its original text form by replacing token values with their corresponding BASIC keywords.
6. **Close the File**: Close the MDR file.

#### **Example Reading Process**
```plaintext
1. Open MDR file in binary mode.
2. Read 543 bytes (Sector 1).
   - Parse Header (14 bytes).
   - Parse Record Descriptor (14 bytes).
   - Parse Data Block (515 bytes).
   - Verify Checksums.
3. Repeat for all sectors.
4. Collect and sort data blocks by sequence number.
5. Concatenate data blocks to reconstruct the tokenized BASIC program.
6. Detokenize the program to get the original BASIC code.
7. Close the file.
```

### 2. Image Data
- **Storage**: Image data (e.g., SCREEN$) is stored as raw pixel data in the data block.
- **Reading**: The data block should be read as a sequence of bytes representing pixel values. The length (`wRECLEN`) indicates the size of the image data.

### 3. Code Data
- **Storage**: Machine code (e.g., Z80 assembly) is stored as raw binary data in the data block.
- **Reading**: The data block should be read as a sequence of bytes representing machine code instructions. The sequence number (`byRECNUM`) indicates the order of the blocks in the file.

## Checksum Calculation
Checksums are calculated using a specific algorithm that mimics the Z80 assembly code used in the Sinclair Microdrive ROM. The checksum is computed as follows:

1. Initialize a sum variable to `0`.
2. Iterate over each byte in the data block.
3. Add the byte value to the sum.
4. Take the sum modulo `255` to ensure it fits in a single byte.
5. The result is the checksum value.

### Example Checksum Calculation
```plaintext
Data Block: [0x01, 0x02, 0x03, 0x04]
Sum = 0
Sum = (0 + 0x01) % 255 = 1
Sum = (1 + 0x02) % 255 = 3
Sum = (3 + 0x03) % 255 = 6
Sum = (6 + 0x04) % 255 = 10
Checksum = 10
```

## Reading MDR Files
To read an MDR file:

1. **Open the File**: Open the MDR file in binary mode.
2. **Read Sectors**: Read the file in chunks of 543 bytes (one sector at a time).
3. **Parse Sectors**: For each sector, parse the header, record descriptor, and data block.
4. **Verify Checksums**: Verify the checksums for each part of the sector.
5. **Handle Errors**: If a checksum mismatch is detected, mark the sector as corrupted and apply recovery mechanisms if needed.

### Example Reading Process
```plaintext
1. Open MDR file in binary mode.
2. Read 543 bytes (Sector 1).
   - Parse Header (14 bytes).
   - Parse Record Descriptor (14 bytes).
   - Parse Data Block (515 bytes).
   - Verify Checksums.
3. Repeat for all sectors.
4. Close the file.
```

## Writing MDR Files
To write an MDR file:

1. **Create the File**: Create an empty file in binary mode.
2. **Write Sectors**: For each sector:
   - Write the Header (14 bytes).
   - Write the Record Descriptor (14 bytes).
   - Write the Data Block (515 bytes).
3. **Append Write Protection Byte**: Append a single byte (`0x00`) at the end of the file to indicate write protection.

### Example Writing Process
```plaintext
1. Create MDR file in binary mode.
2. For each sector:
   - Write Header (14 bytes).
   - Write Record Descriptor (14 bytes).
   - Write Data Block (515 bytes).
3. Append Write Protection Byte (0x00).
4. Close the file.
```

## Error Handling
The MDR format supports error handling through checksum verification. If a checksum mismatch is detected, the sector can be marked as corrupted, and recovery mechanisms (e.g., bitwise averaging) can be applied.

## References
- [mdv2img Documentation](Doc/Mdv2Img.txt)
- [BINTAP Documentation](Doc/BINTAP.TXT)
