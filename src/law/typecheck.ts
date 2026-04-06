import type { LawResult } from './types';
import type { ExpressionType } from '@lattice/expression/ast';
import { parseAndTypeCheck } from '@lattice/expression';

export interface TypeCheckDiagnostic {
  readonly nodeId: string;
  readonly expression: string;
  readonly isValid: boolean;
  readonly error?: string;
  readonly inferredType?: ExpressionType;
}

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
): LawResult<NodeTypeCheckResult> {
  const result = typecheckNodeExpressions(expressions);

  if (result.allValid) {
    return { ok: true, value: result };
  }

  const invalidDiagnostics = result.diagnostics.filter((d) => !d.isValid);

  return {
    ok: false,
    error: {
      code: 'TOKEN_INVALID',
      message: `Type-check failed for ${invalidDiagnostics.length} expression(s)`,
      diagnostics: invalidDiagnostics,
    },
  };
}
