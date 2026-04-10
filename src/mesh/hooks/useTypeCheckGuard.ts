'use client';

import { useCallback, useState } from 'react';
import { typecheckNodeExpressions } from '@law/typecheck';
import type { TypeCheckDiagnostic } from '@law/typecheck';

export interface TypeCheckRunResult {
  readonly diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>;
  readonly canExecute: boolean;
}

interface TypeCheckGuardResult {
  readonly diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>;
  readonly isBlocking: boolean;
  readonly runTypeCheck: (expressions: ReadonlyMap<string, string>) => TypeCheckRunResult;
  readonly clearBlock: () => void;
}

export function useTypeCheckGuard(): TypeCheckGuardResult {
  const [diagnostics, setDiagnostics] = useState<ReadonlyMap<string, TypeCheckDiagnostic>>(new Map());
  const [isBlocking, setIsBlocking] = useState(false);

  const runTypeCheck = useCallback(
    (expressions: ReadonlyMap<string, string>): TypeCheckRunResult => {
      const hasExpressions = Array.from(expressions.values()).some(
        (source) => source.trim().length > 0,
      );

      if (!hasExpressions) {
        const emptyResult: TypeCheckRunResult = {
          diagnostics: new Map(),
          canExecute: true,
        };
        setDiagnostics(new Map());
        setIsBlocking(false);
        return emptyResult;
      }

      const result = typecheckNodeExpressions(expressions);
      const canExecute = result.allValid;

      const diagnosticsMap = new Map<string, TypeCheckDiagnostic>();
      result.diagnostics.forEach((d) => {
        diagnosticsMap.set(d.nodeId, d);
      });

      setDiagnostics(diagnosticsMap);
      setIsBlocking(!canExecute);

      return {
        diagnostics: diagnosticsMap,
        canExecute,
      };
    },
    [],
  );

  const clearBlock = useCallback((): void => {
    setIsBlocking(false);
  }, []);

  return {
    diagnostics,
    isBlocking,
    runTypeCheck,
    clearBlock,
  };
}
