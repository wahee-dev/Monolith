'use client';

import { useCallback, useState } from 'react';
import { typecheckAllExpressions, guardTypeCheck } from '@law/typecheck';
import type { TypeCheckDiagnostic } from '@law/typecheck';

interface TypeCheckGuardResult {
  readonly diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>;
  readonly canExecute: boolean;
  readonly isBlocking: boolean;
  readonly runTypeCheck: (expressions: ReadonlyMap<string, string>) => void;
  readonly clearBlock: () => void;
}

export function useTypeCheckGuard(): TypeCheckGuardResult {
  const [diagnostics, setDiagnostics] = useState<ReadonlyMap<string, TypeCheckDiagnostic>>(new Map());
  const [canExecute, setCanExecute] = useState(true);
  const [isBlocking, setIsBlocking] = useState(false);

  const runTypeCheck = useCallback(
    (expressions: ReadonlyMap<string, string>): void => {
      const hasExpressions = Array.from(expressions.values()).some(
        (source) => source.trim().length > 0,
      );

      if (!hasExpressions) {
        setDiagnostics(new Map());
        setCanExecute(true);
        setIsBlocking(false);
        return;
      }

      const allResult = typecheckAllExpressions(expressions);
      setDiagnostics(allResult.diagnostics);

      const guardResult = guardTypeCheck(expressions);

      if (guardResult.ok) {
        setCanExecute(true);
        setIsBlocking(false);
      } else {
        setCanExecute(false);
        setIsBlocking(true);
      }
    },
    [],
  );

  const clearBlock = useCallback((): void => {
    setIsBlocking(false);
    setCanExecute(true);
  }, []);

  return {
    diagnostics,
    canExecute,
    isBlocking,
    runTypeCheck,
    clearBlock,
  };
}
