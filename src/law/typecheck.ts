import type { LawResult, TypeCheckDiagnostic, PermissionToken, GovernanceLedger } from './types';
import { parseAndTypeCheck } from '@lattice/expression';
import { guard } from './guard';

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
        isValid: true,
        inferredType: result.value.expressionType,
      },
    };
  }

  return {
    ok: true,
    value: {
      nodeId: '',
      expression: source,
      isValid: false,
      error: result.error.message,
    },
  };
}

export function typecheckNodeExpressions(
  expressions: ReadonlyMap<string, string>,
): NodeTypeCheckResult {
  const diagnostics: Array<TypeCheckDiagnostic> = [];

  expressions.forEach((expression, nodeId) => {
    const result = typecheckExpression(expression);
    if (!result.ok) return;
    if (result.value.isValid) {
      diagnostics.push({
        nodeId,
        expression,
        isValid: true,
        ...(result.value.inferredType !== undefined ? { inferredType: result.value.inferredType } : {}),
      });
    } else {
      diagnostics.push({
        nodeId,
        expression,
        isValid: false,
        ...(result.value.error !== undefined ? { error: result.value.error } : {}),
      });
    }
  });

  const allValid = diagnostics.every((d) => d.isValid);

  return {
    diagnostics,
    allValid,
    checkedAt: Date.now(),
  };
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
      message: `Type-check failed for ${invalidDiagnostics.length} expression(s)`,
      capability: 'lattice:typecheck:validate',
      diagnostics: invalidDiagnostics,
    },
  };
}
