'use client';

import { useCallback, useRef, useState } from 'react';
import type { TypeCheckDiagnostic } from '@law/typecheck';
import { typecheckExpression } from '@law/typecheck';

export function useTypeCheckStatus(): {
  readonly diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>;
  readonly checkExpression: (nodeId: string, source: string) => void;
  readonly checkAll: (expressions: ReadonlyMap<string, string>) => void;
  readonly isValid: (nodeId: string) => boolean;
} {
  const [diagnostics, setDiagnostics] = useState<ReadonlyMap<string, TypeCheckDiagnostic>>(new Map());
  const diagnosticsRef = useRef<ReadonlyMap<string, TypeCheckDiagnostic>>(diagnostics);
  diagnosticsRef.current = diagnostics;

  const checkExpression = useCallback((nodeId: string, source: string): void => {
    const result = typecheckExpression(source);
    if (result.ok) {
      const diag: TypeCheckDiagnostic = {
        ...result.value,
        nodeId,
      };
      setDiagnostics((prev) => {
        const next = new Map(prev);
        next.set(nodeId, diag);
        return next;
      });
    }
  }, []);

  const checkAll = useCallback((expressions: ReadonlyMap<string, string>): void => {
    const next = new Map<string, TypeCheckDiagnostic>();
    expressions.forEach((source, nodeId) => {
      const result = typecheckExpression(source);
      if (result.ok) {
        next.set(nodeId, { ...result.value, nodeId });
      }
    });
    setDiagnostics(next);
  }, []);

  const isValid = useCallback((nodeId: string): boolean => {
    const diag = diagnosticsRef.current.get(nodeId);
    return diag !== undefined && diag.isValid;
  }, []);

  return {
    diagnostics,
    checkExpression,
    checkAll,
    isValid,
  };
}
