#!/bin/bash

# Test that TZX files can be reverted back to BASIC using listbasic

SAMPLES_DIR="samples-tzx-output"
OUTPUT_DIR="samples-reverted-basic"

mkdir -p "$OUTPUT_DIR"

echo "Testing TZX to BASIC conversion using listbasic..."
echo ""

success=0
fail=0

for tzxfile in "$SAMPLES_DIR"/*.tzx; do
    if [ ! -f "$tzxfile" ]; then
        continue
    fi
    
    basename=$(basename "$tzxfile" .tzx)
    basfile="$OUTPUT_DIR/${basename}.bas"
    
    echo -n "Converting $basename.tzx ... "
    
    # Try to convert TZX to BASIC using listbasic
    if /usr/bin/listbasic "$tzxfile" > "$basfile" 2>&1; then
        # Check if output file has content
        if [ -s "$basfile" ]; then
            lines=$(wc -l < "$basfile")
            echo "✓ ($lines lines)"
            ((success++))
        else
            echo "✗ (empty output)"
            ((fail++))
        fi
    else
        echo "✗ (listbasic failed)"
        ((fail++))
    fi
done

echo ""
echo "============================================================"
echo "Reversion complete: $success succeeded, $fail failed"
echo "Output directory: $OUTPUT_DIR"
