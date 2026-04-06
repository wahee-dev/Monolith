export type { Expression, ExpressionType, LiteralValue, BinaryOperator, UnaryOperator, TransitionTarget } from './ast';
export { tokenize } from './lexer';
export type { Token, TokenKind } from './lexer';
export { parse, parseSource } from './parser';
export { typecheck } from './typechecker';
export { evaluate } from './evaluator';
export type { EvalResult, Environment } from './evaluator';

import type { LawResult } from '@law/types';
import type { Expression, ExpressionType } from './ast';
import { parseSource } from './parser';
import { typecheck } from './typechecker';

export function parseAndTypeCheck(
  source: string,
): LawResult<{ readonly expression: Expression; readonly expressionType: ExpressionType }> {
  const parsed = parseSource(source);
  if (!parsed.ok) return parsed;

  const checked = typecheck(parsed.value);
  if (!checked.ok) return checked;

  return {
    ok: true,
    value: { expression: parsed.value, expressionType: checked.value },
  };
}
