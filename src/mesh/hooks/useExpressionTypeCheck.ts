'use client';

import { useCallback } from 'react';
import { parseAndTypeCheck } from '@lattice/expression';
import type { ExpressionType } from '@lattice/expression';

function isJSHybrid(source: string): boolean {
  return source.includes('import [') || source.includes('Monolith.');
}

export interface TypeCheckResult {
  readonly isValid: boolean;
  readonly error: string;
  readonly inferredType: ExpressionType | null;
}

export function useExpressionTypeCheck(): {
  readonly checkExpression: (source: string) => TypeCheckResult;
} {
  const checkExpression = useCallback((source: string): TypeCheckResult => {
    if (source.trim().length === 0) {
      return { isValid: true, error: '', inferredType: null };
    }

    // Skip type check for hybrid JS - uses real JavaScript
    if (isJSHybrid(source)) {
      return { isValid: true, error: '', inferredType: 'unknown' };
    }

    const result = parseAndTypeCheck(source);
    if (result.ok) {
      return {
        isValid: true,
        error: '',
        inferredType: result.value.expressionType,
      };
    }

    return {
      isValid: false,
      error: result.error.message,
      inferredType: null,
    };
  }, []);

  return { checkExpression };
}
