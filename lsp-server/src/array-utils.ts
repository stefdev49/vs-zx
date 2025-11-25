export interface StringSliceDetectionContext {
  isStringVariable: boolean;
  hasToKeyword: boolean;
  usedDimensions: number;
  hasDeclaration: boolean;
}

// Determines whether a string identifier followed by parentheses is a scalar string slice (e.g. s$(n) or s$(n TO m))
// rather than an array access that should require DIM.
export function isImplicitStringSlice(context: StringSliceDetectionContext): boolean {
  if (!context.isStringVariable) {
    return false;
  }

  if (context.hasDeclaration) {
    // String arrays that were declared with DIM should still be validated as arrays.
    return false;
  }

  if (context.hasToKeyword) {
    return true;
  }

  // Scalar string slicing uses a single argument (start position) without commas.
  return context.usedDimensions === 1;
}
