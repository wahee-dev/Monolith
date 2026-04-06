import type { LawResult, TypeCheckDiagnostic, NodeTypeCheckResult } from './types';
import { parseAndTypeCheck } from '@lattice/expression';

export function typecheckExpression(source: string): TypeCheckDiagnostic {
  const result = parseAndTypeCheck(source);

  if (result.ok) {
    return {
      nodeId: '',
      expression: source,
      isValid: true,
      inferredType: result.value.expressionType,
    };
  }

  return {
    nodeId: '',
    expression: source,
    isValid: false,
    error: result.error.message,
  };
}

export function typecheckNodeExpressions(
  expressions: ReadonlyMap<string, string>,
): NodeTypeCheckResult {
  const diagnostics: Array<TypeCheckDiagnostic> = [];

  expressions.forEach((expression, nodeId) => {
    const diagnostic = typecheckExpression(expression);
    if (diagnostic.isValid) {
      diagnostics.push({
        nodeId,
        expression,
        isValid: true,
        ...(diagnostic.inferredType !== undefined ? { inferredType: diagnostic.inferredType } : {}),
      });
    } else {
      diagnostics.push({
        nodeId,
        expression,
        isValid: false,
        ...(diagnostic.error !== undefined ? { error: diagnostic.error } : {}),
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
      code: 'TYPE_MISMATCH',
      message: `Type-check failed for ${invalidDiagnostics.length} expression(s)`,
      diagnostics: invalidDiagnostics,
    },
  };
}
