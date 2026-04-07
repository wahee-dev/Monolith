import type { LawResult } from './types';
import { parseAndTypeCheck } from '@lattice/expression';

export interface TypeCheckDiagnostic {
  readonly nodeId: string;
  readonly source: string;
  readonly isValid: boolean;
  readonly error: string;
}

export interface AllNodesTypeCheckResult {
  readonly diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>;
  readonly allValid: boolean;
  readonly invalidNodeIds: ReadonlyArray<string>;
}

export function typecheckExpression(
  nodeId: string,
  source: string,
): TypeCheckDiagnostic {
  if (source.trim().length === 0) {
    return {
      nodeId,
      source,
      isValid: true,
      error: '',
    };
  }

  const result = parseAndTypeCheck(source);

  if (result.ok) {
    return {
      nodeId,
      source,
      isValid: true,
      error: '',
    };
  }

  return {
    nodeId,
    source,
    isValid: false,
    error: result.error.message,
  };
}

export function typecheckAllExpressions(
  expressions: ReadonlyMap<string, string>,
): AllNodesTypeCheckResult {
  const diagnostics = new Map<string, TypeCheckDiagnostic>();
  const invalidNodeIds: string[] = [];

  for (const [nodeId, source] of expressions) {
    const diagnostic = typecheckExpression(nodeId, source);
    diagnostics.set(nodeId, diagnostic);
    if (!diagnostic.isValid) {
      invalidNodeIds.push(nodeId);
    }
  }

  return {
    diagnostics,
    allValid: invalidNodeIds.length === 0,
    invalidNodeIds,
  };
}

export function guardTypeCheck(
  expressions: ReadonlyMap<string, string>,
): LawResult<AllNodesTypeCheckResult> {
  const result = typecheckAllExpressions(expressions);

  if (!result.allValid) {
    const firstInvalid = result.invalidNodeIds[0];
    const firstDiagnostic = firstInvalid !== undefined
      ? result.diagnostics.get(firstInvalid)
      : undefined;

    return {
      ok: false,
      error: {
        code: 'TYPE_MISMATCH',
        message: firstDiagnostic !== undefined && firstDiagnostic.error.length > 0
          ? `Type check failed: ${firstDiagnostic.error}`
          : `Type check failed for ${result.invalidNodeIds.length} node(s)`,
      },
    };
  }

  return { ok: true, value: result };
}
