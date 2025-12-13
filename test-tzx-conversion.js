#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const converter = require('./converter');

// Test TZX conversion on all BASIC files in samples/
async function testTzxConversion() {
  const samplesDir = path.join(__dirname, 'samples');
  const outputDir = path.join(__dirname, 'samples-tzx-output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  // Get all .bas files
  const basFiles = fs.readdirSync(samplesDir)
    .filter(file => file.endsWith('.bas'));
  
  console.log(`Found ${basFiles.length} BASIC files to convert\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const basFile of basFiles) {
    const basPath = path.join(samplesDir, basFile);
    const tzxPath = path.join(outputDir, basFile.replace('.bas', '.tzx'));
    
    try {
      // Read BASIC source
      const basicSource = fs.readFileSync(basPath, 'utf-8');
      
      // Extract program name from filename (max 10 chars)
      const programName = path.basename(basFile, '.bas').substring(0, 10);
      
      // Convert to TZX
      const tzxBuffer = converter.convertBasicToTzx(
        basicSource,
        programName,
        undefined,
        `Converted from ${basFile}`
      );
      
      // Write TZX file
      fs.writeFileSync(tzxPath, tzxBuffer);
      
      // Get metadata
      const metadata = converter.getTzxMetadata(tzxBuffer);
      
      console.log(`✓ ${basFile}`);
      console.log(`  → ${path.basename(tzxPath)} (${tzxBuffer.length} bytes)`);
      console.log(`  → Version: ${metadata.version}, Blocks: ${metadata.blockCount}`);
      if (metadata.hasTextDescription) {
        console.log(`  → Description: ${metadata.hasTextDescription}`);
      }
      console.log();
      
      successCount++;
    } catch (error) {
      console.error(`✗ ${basFile}: ${error.message}`);
      console.log();
      failCount++;
    }
  }
  
  console.log('='.repeat(60));
  console.log(`Conversion complete: ${successCount} succeeded, ${failCount} failed`);
  console.log(`Output directory: ${outputDir}`);
  
  // Test round-trip conversion
  if (successCount > 0) {
    console.log('\nTesting round-trip conversion (TZX → TAP → TZX)...');
    // Find first successfully converted file
    const successfulBasFiles = basFiles.filter(file => {
      const tzxPath = path.join(outputDir, file.replace('.bas', '.tzx'));
      return fs.existsSync(tzxPath);
    });
    const firstTzx = path.join(outputDir, successfulBasFiles[0].replace('.bas', '.tzx'));
    const tzxBuffer = fs.readFileSync(firstTzx);
    
    const tapBuffer = converter.convertTzxToTap(tzxBuffer);
    const tzxBuffer2 = converter.convertTapToTzx(tapBuffer);
    
    console.log(`✓ Round-trip successful`);
    console.log(`  Original TZX: ${tzxBuffer.length} bytes`);
    console.log(`  TAP: ${tapBuffer.length} bytes`);
    console.log(`  Re-converted TZX: ${tzxBuffer2.length} bytes`);
  }
}

testTzxConversion().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
