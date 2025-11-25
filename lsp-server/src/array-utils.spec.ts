import { describe, expect, it } from '@jest/globals';
import { isImplicitStringSlice, StringSliceDetectionContext } from './array-utils';

function createContext(overrides: Partial<StringSliceDetectionContext>): StringSliceDetectionContext {
  return {
    isStringVariable: true,
    hasToKeyword: false,
    usedDimensions: 1,
    hasDeclaration: false,
    ...overrides
  };
}

describe('String slicing detection helpers', () => {
  it('treats s$(b) access as string slice', () => {
    const result = isImplicitStringSlice(createContext({ isStringVariable: true, usedDimensions: 1 }));
    expect(result).toBe(true);
  });

  it('treats s$(TO b) access as string slice even with TO keyword', () => {
    const result = isImplicitStringSlice(createContext({ hasToKeyword: true }));
    expect(result).toBe(true);
  });

  it('requires DIM for declared string arrays', () => {
    const result = isImplicitStringSlice(createContext({ hasDeclaration: true }));
    expect(result).toBe(false);
  });

  it('does not treat numeric arrays as string slices', () => {
    const result = isImplicitStringSlice(createContext({ isStringVariable: false }));
    expect(result).toBe(false);
  });

  it('does not treat multi-dimensional references as string slices', () => {
    const result = isImplicitStringSlice(createContext({ usedDimensions: 2 }));
    expect(result).toBe(false);
  });
});
