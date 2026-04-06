export type LiteralValue = string | number | boolean;

export type ExpressionType = 'string' | 'number' | 'boolean' | 'void' | 'unknown';

export type BinaryOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | '&&'
  | '||'
  | '+'
  | '-'
  | '*'
  | '/'
  | '%';

export type UnaryOperator = '!' | '-';

export interface TransitionTarget {
  readonly nodePath: ReadonlyArray<string>;
  readonly port: string;
}

export type Expression =
  | { readonly kind: 'literal'; readonly value: LiteralValue; readonly type: ExpressionType }
  | { readonly kind: 'variable'; readonly path: ReadonlyArray<string>; readonly resolvedType: ExpressionType }
  | { readonly kind: 'binary'; readonly operator: BinaryOperator; readonly left: Expression; readonly right: Expression; readonly resultType: ExpressionType }
  | { readonly kind: 'unary'; readonly operator: UnaryOperator; readonly operand: Expression; readonly resultType: ExpressionType }
  | { readonly kind: 'conditional'; readonly condition: Expression; readonly thenExpr: Expression; readonly elseExpr: Expression; readonly resultType: ExpressionType }
  | { readonly kind: 'transition'; readonly guard: Expression; readonly target: TransitionTarget }
  | { readonly kind: 'function_call'; readonly name: string; readonly args: ReadonlyArray<Expression>; readonly resultType: ExpressionType };
