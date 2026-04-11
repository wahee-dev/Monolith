import type { LawResult, TypeCheckDiagnostic, PermissionToken, GovernanceLedger } from './types';
import { parseAndTypeCheck } from '@lattice/expression';
import { guard } from './guard';

export type { TypeCheckDiagnostic };

export interface NodeTypeCheckResult {
  readonly diagnostics: ReadonlyArray<TypeCheckDiagnostic>;
  readonly allValid: boolean;
  readonly checkedAt: number;
}

export function typecheckExpression(source: string): LawResult<TypeCheckDiagnostic> {
  const result = parseAndTypeCheck(source);

  if (result.ok) {
    return {
      ok: true,
      value: {
        nodeId: '',
        expression: source,
        source,
        isValid: true,
        inferredType: result.value.expressionType,
        error: '',
      },
    };
  }

  return {
    ok: false,
    error: {
      code: 'TYPE_MISMATCH',
      message: result.error.message,
    },
  };
}

export function typecheckExpressionWrapper(nodeId: string, source: string): TypeCheckDiagnostic {
  const trimmed = source.trim();
  if (trimmed === '') {
    return {
      nodeId,
      expression: source,
      source,
      isValid: true,
      error: '',
    };
  }

  const result = parseAndTypeCheck(source);

  if (result.ok) {
    return {
      nodeId,
      expression: source,
      source,
      isValid: true,
      inferredType: result.value.expressionType,
      error: '',
    };
  }

  return {
    nodeId,
    expression: source,
    source,
    isValid: false,
    error: result.error.message,
  };
}

export function typecheckNodeExpressions(
  expressions: ReadonlyMap<string, string>,
): NodeTypeCheckResult {
  const diagnostics: Array<TypeCheckDiagnostic> = [];

  expressions.forEach((expression, nodeId) => {
    const diagnostic = typecheckExpressionWrapper(nodeId, expression);
    diagnostics.push(diagnostic);
  });

  const allValid = diagnostics.every((d) => d.isValid);

  return {
    diagnostics,
    allValid,
    checkedAt: Date.now(),
  };
}

export function typecheckAllExpressions(expressions: Map<string, string>): {
  readonly allValid: boolean;
  readonly diagnostics: Map<string, TypeCheckDiagnostic>;
  readonly invalidNodeIds: readonly string[];
} {
  const result = typecheckNodeExpressions(expressions);
  const diagnosticsMap = new Map<string, TypeCheckDiagnostic>();
  const invalidNodeIds: string[] = [];

  for (const d of result.diagnostics) {
    diagnosticsMap.set(d.nodeId, d);
    if (!d.isValid) invalidNodeIds.push(d.nodeId);
  }

  return { allValid: result.allValid, diagnostics: diagnosticsMap, invalidNodeIds };
}

export function guardTypeCheck(
  expressions: ReadonlyMap<string, string>,
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): LawResult<NodeTypeCheckResult> {
  const authResult = guard('lattice:typecheck:validate', token, ledger);
  if (!authResult.ok) {
    return authResult;
  }

  const result = typecheckNodeExpressions(expressions);

  if (result.allValid) {
    return { ok: true, value: result };
  }

  const invalidDiagnostics = result.diagnostics.filter((d) => !d.isValid);

  return {
    ok: false,
    error: {
      code: 'TYPE_MISMATCH',
      message: `Type check failed for ${invalidDiagnostics.length} expression(s)`,
      capability: 'lattice:typecheck:validate',
      diagnostics: invalidDiagnostics,
    },
  };
}

export function guardTypeCheckWrapper(
  expressions: ReadonlyMap<string, string>,
): LawResult<NodeTypeCheckResult> {
  const result = typecheckNodeExpressions(expressions);

  if (result.allValid) {
    return { ok: true, value: result };
  }

  const invalidDiagnostics = result.diagnostics.filter((d) => !d.isValid);

  return {
    ok: false,
    error: {
      code: 'TYPE_MISMATCH',
      message: `Type check failed for ${invalidDiagnostics.length} expression(s)`,
      capability: 'lattice:typecheck:validate',
      diagnostics: invalidDiagnostics,
    },
  };
}