# Code Duplication Fix - v1.0.100

## Summary

Fixed architectural issue where utility functions were duplicated in `server.ts` instead of being imported from utility modules. This duplication caused the renumbering bug to persist even after the correct fix was applied to the source file.

## Problem

The LSP server (`lsp-server/src/server.ts`) contained duplicate implementations of three utility functions:

1. **`formatLine()`** - Token-based line formatting
2. **`RenumberResult`** - Type definition for renumbering results  
3. **`autoRenumberLines()`** - Automatic line renumbering with GOTO/GOSUB target updates

These functions were already properly implemented and exported from `formatting-utils.ts`, but `server.ts` had its own copies that weren't being maintained.

## Root Cause

When the chain replacement bug was fixed in `formatting-utils.ts` (commit for v1.0.97), the fix didn't take effect because `server.ts` was using its own local implementation instead of importing from the utility file.

## Solution

### 1. Added Import Statement

Added import from `formatting-utils.ts` to `server.ts` line 66:

```typescript
import { autoRenumberLines, formatLine } from './formatting-utils';
```

### 2. Removed Duplicate Implementations

Removed all three duplicate implementations from `server.ts`:

- Removed `formatLine()` function (was ~64 lines at line 3045)
- Removed `RenumberResult` type (was 4 lines at line 3113)
- Removed `autoRenumberLines()` function (was ~90 lines at line 3118)

### 3. Verified No Other Duplicates

Audited all utility modules to ensure no other functions were duplicated:

**Utility Modules Checked:**
- `array-utils.ts` - No duplicates found
- `color-utils.ts` - No duplicates found
- `declaration-utils.ts` - No duplicates found
- `folding-utils.ts` - No duplicates found
- `formatting-utils.ts` - Now properly imported
- `identifier-utils.ts` - No duplicates found
- `line-number-utils.ts` - No duplicates found
- `rename-utils.ts` - No duplicates found

All 20 exported functions/types from utility modules are now confirmed to be used correctly (imported, not duplicated).

## Testing

- All 336 tests pass
- Build successful
- Extension packaged as v1.0.100

## Benefits

1. **Maintainability** - Single source of truth for utility functions
2. **Bug Prevention** - Fixes will now apply immediately
3. **Code Consistency** - No divergent implementations
4. **Reduced Code Size** - Removed ~160 lines of duplicate code from server.ts

## Files Modified

- `lsp-server/src/server.ts` - Added import, removed duplicates
- `vscode-extension/package.json` - Bumped to v1.0.100

## Prevention

Going forward, always check if functionality exists in utility modules before implementing it in `server.ts`. If utility functions need to be added, create them in appropriate utility modules and import them rather than implementing them inline in the server.
