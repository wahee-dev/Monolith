import type { LawResult } from '@law/types';
import type { Expression, TransitionTarget } from './ast';
import type { Token, TokenKind } from './lexer';
import { tokenize } from './lexer';

interface ParseState {
  readonly tokens: ReadonlyArray<Token>;
  readonly pos: number;
}

interface ParseResult {
  readonly expr: Expression;
  readonly state: ParseState;
}

function peek(state: ParseState): Token {
  const token = state.tokens[state.pos];
  if (token === undefined) {
    return state.tokens[state.tokens.length - 1]!;
  }
  return token;
}

function advance(state: ParseState): { readonly token: Token; readonly state: ParseState } {
  const token = peek(state);
  return { token, state: { tokens: state.tokens, pos: state.pos + 1 } };
}

function match(state: ParseState, kind: TokenKind): { readonly matched: boolean; readonly state: ParseState } {
  if (peek(state).kind === kind) {
    return { matched: true, state: { tokens: state.tokens, pos: state.pos + 1 } };
  }
  return { matched: false, state };
}

function makeError<T>(message: string, token: Token): LawResult<T> {
  return {
    ok: false,
    error: {
      code: 'TOKEN_INVALID',
      message: `${message} at position ${token.position}`,
    },
  };
}

function parsePrimary(state: ParseState): LawResult<ParseResult> {
  const token = peek(state);

  if (token.kind === 'NumberLiteral') {
    const num = parseFloat(token.value);
    const adv = advance(state);
    return {
      ok: true,
      value: {
        expr: { kind: 'literal', value: num, type: 'number' },
        state: adv.state,
      },
    };
  }

  if (token.kind === 'StringLiteral') {
    const adv = advance(state);
    return {
      ok: true,
      value: {
        expr: { kind: 'literal', value: token.value, type: 'string' },
        state: adv.state,
      },
    };
  }

  if (token.kind === 'BooleanLiteral') {
    const adv = advance(state);
    return {
      ok: true,
      value: {
        expr: { kind: 'literal', value: token.value === 'true', type: 'boolean' },
        state: adv.state,
      },
    };
  }

  if (token.kind === 'LParen') {
    const adv = advance(state);
    const inner = parseExpression(adv.state);
    if (!inner.ok) return inner;
    const closeParen = match(inner.value.state, 'RParen');
    if (!closeParen.matched) {
      return makeError('Expected closing parenthesis', peek(inner.value.state));
    }
    return { ok: true, value: { expr: inner.value.expr, state: closeParen.state } };
  }

  if (token.kind === 'Operator' && (token.value === '!' || token.value === '-')) {
    return parseUnary(state);
  }

  if (token.kind === 'Identifier') {
    return parseIdentifierOrCall(state);
  }

  return makeError(`Unexpected token '${token.value}' (${token.kind})`, token);
}

function parseIdentifierOrCall(state: ParseState): LawResult<ParseResult> {
  const adv = advance(state);
  const name = adv.token.value;
  const pathParts: string[] = [name];
  let currentState = adv.state;

  let dotCheck = match(currentState, 'Dot');
  while (dotCheck.matched) {
    const nextToken = peek(dotCheck.state);
    if (nextToken.kind !== 'Identifier') {
      return makeError('Expected identifier after dot', nextToken);
    }
    const nextAdv = advance(dotCheck.state);
    pathParts.push(nextAdv.token.value);
    currentState = nextAdv.state;
    dotCheck = match(currentState, 'Dot');
  }

  const parenCheck = match(currentState, 'LParen');
  if (pathParts.length === 1 && parenCheck.matched) {
    return parseFunctionCall(name, parenCheck.state);
  }

  const expr: Expression = {
    kind: 'variable',
    path: pathParts,
    resolvedType: 'unknown',
  };
  return { ok: true, value: { expr, state: currentState } };
}

function parseFunctionCall(name: string, state: ParseState): LawResult<ParseResult> {
  const args: Expression[] = [];

  if (peek(state).kind === 'RParen') {
    const closeParen = advance(state);
    return {
      ok: true,
      value: {
        expr: { kind: 'function_call', name, args, resultType: 'unknown' },
        state: closeParen.state,
      },
    };
  }

  let currentState = state;
  const firstArg = parseExpression(currentState);
  if (!firstArg.ok) return firstArg;
  args.push(firstArg.value.expr);
  currentState = firstArg.value.state;

  let commaCheck = match(currentState, 'Comma');
  while (commaCheck.matched) {
    const nextArg = parseExpression(commaCheck.state);
    if (!nextArg.ok) return nextArg;
    args.push(nextArg.value.expr);
    currentState = nextArg.value.state;
    commaCheck = match(currentState, 'Comma');
  }

  const closeParen = match(currentState, 'RParen');
  if (!closeParen.matched) {
    return makeError('Expected closing parenthesis for function call', peek(currentState));
  }

  return {
    ok: true,
    value: {
      expr: { kind: 'function_call', name, args, resultType: 'unknown' },
      state: closeParen.state,
    },
  };
}

function parseUnary(state: ParseState): LawResult<ParseResult> {
  const adv = advance(state);
  const op = adv.token.value;
  if (op !== '!' && op !== '-') {
    return makeError(`Invalid unary operator '${op}'`, adv.token);
  }
  const operand = parsePrimary(adv.state);
  if (!operand.ok) return operand;
  return {
    ok: true,
    value: {
      expr: { kind: 'unary', operator: op, operand: operand.value.expr, resultType: 'unknown' },
      state: operand.value.state,
    },
  };
}

function parseMultiplicative(state: ParseState): LawResult<ParseResult> {
  const left = parsePrimary(state);
  if (!left.ok) return left;

  let currentState = left.value.state;
  let currentExpr = left.value.expr;

  while (
    peek(currentState).kind === 'Operator' &&
    (peek(currentState).value === '*' || peek(currentState).value === '/' || peek(currentState).value === '%')
  ) {
    const adv = advance(currentState);
    const right = parsePrimary(adv.state);
    if (!right.ok) return right;
    currentExpr = {
      kind: 'binary',
      operator: adv.token.value as '*' | '/' | '%',
      left: currentExpr,
      right: right.value.expr,
      resultType: 'unknown',
    };
    currentState = right.value.state;
  }

  return { ok: true, value: { expr: currentExpr, state: currentState } };
}

function parseAdditive(state: ParseState): LawResult<ParseResult> {
  const left = parseMultiplicative(state);
  if (!left.ok) return left;

  let currentState = left.value.state;
  let currentExpr = left.value.expr;

  while (
    peek(currentState).kind === 'Operator' &&
    (peek(currentState).value === '+' || peek(currentState).value === '-')
  ) {
    const adv = advance(currentState);
    const right = parseMultiplicative(adv.state);
    if (!right.ok) return right;
    currentExpr = {
      kind: 'binary',
      operator: adv.token.value as '+' | '-',
      left: currentExpr,
      right: right.value.expr,
      resultType: 'unknown',
    };
    currentState = right.value.state;
  }

  return { ok: true, value: { expr: currentExpr, state: currentState } };
}

function parseComparison(state: ParseState): LawResult<ParseResult> {
  const left = parseAdditive(state);
  if (!left.ok) return left;

  const COMPARISON_OPS = new Set<string>(['==', '!=', '>', '<', '>=', '<=']);
  let currentState = left.value.state;
  let currentExpr = left.value.expr;

  while (peek(currentState).kind === 'Operator' && COMPARISON_OPS.has(peek(currentState).value)) {
    const adv = advance(currentState);
    const right = parseAdditive(adv.state);
    if (!right.ok) return right;
    currentExpr = {
      kind: 'binary',
      operator: adv.token.value as '==' | '!=' | '>' | '<' | '>=' | '<=',
      left: currentExpr,
      right: right.value.expr,
      resultType: 'unknown',
    };
    currentState = right.value.state;
  }

  return { ok: true, value: { expr: currentExpr, state: currentState } };
}

function parseLogicalAnd(state: ParseState): LawResult<ParseResult> {
  const left = parseComparison(state);
  if (!left.ok) return left;

  let currentState = left.value.state;
  let currentExpr = left.value.expr;

  while (peek(currentState).kind === 'Operator' && peek(currentState).value === '&&') {
    const adv = advance(currentState);
    const right = parseComparison(adv.state);
    if (!right.ok) return right;
    currentExpr = {
      kind: 'binary',
      operator: '&&',
      left: currentExpr,
      right: right.value.expr,
      resultType: 'unknown',
    };
    currentState = right.value.state;
  }

  return { ok: true, value: { expr: currentExpr, state: currentState } };
}

function parseLogicalOr(state: ParseState): LawResult<ParseResult> {
  const left = parseLogicalAnd(state);
  if (!left.ok) return left;

  let currentState = left.value.state;
  let currentExpr = left.value.expr;

  while (peek(currentState).kind === 'Operator' && peek(currentState).value === '||') {
    const adv = advance(currentState);
    const right = parseLogicalAnd(adv.state);
    if (!right.ok) return right;
    currentExpr = {
      kind: 'binary',
      operator: '||',
      left: currentExpr,
      right: right.value.expr,
      resultType: 'unknown',
    };
    currentState = right.value.state;
  }

  return { ok: true, value: { expr: currentExpr, state: currentState } };
}

function parseTransitionTarget(state: ParseState): LawResult<{ readonly target: TransitionTarget; readonly state: ParseState }> {
  const firstToken = peek(state);
  if (firstToken.kind !== 'Identifier') {
    return makeError('Expected identifier for transition target', firstToken);
  }
  const firstAdv = advance(state);
  const pathParts: string[] = [firstAdv.token.value];
  let currentState = firstAdv.state;

  let dotCheck = match(currentState, 'Dot');
  while (dotCheck.matched) {
    const nextToken = peek(dotCheck.state);
    if (nextToken.kind !== 'Identifier') {
      return makeError('Expected identifier after dot in transition target', nextToken);
    }
    const nextAdv = advance(dotCheck.state);
    pathParts.push(nextAdv.token.value);
    currentState = nextAdv.state;
    dotCheck = match(currentState, 'Dot');
  }

  if (pathParts.length < 2) {
    return makeError('Transition target must be a dotted path (e.g. Node.Port)', firstToken);
  }

  const port = pathParts[pathParts.length - 1]!;
  const nodePath = pathParts.slice(0, pathParts.length - 1);

  return { ok: true, value: { target: { nodePath, port }, state: currentState } };
}

function parseTransitionOrArrow(
  guardExpr: Expression,
  state: ParseState,
): LawResult<ParseResult> {
  const arrowAdv = advance(state);

  const nextToken = peek(arrowAdv.state);

  if (nextToken.kind === 'EOF' || nextToken.kind === 'RParen' || nextToken.kind === 'Comma') {
    return makeError('Expected expression or target after ->', nextToken);
  }

  if (nextToken.kind === 'Identifier') {
    const targetResult = parseTransitionTarget(arrowAdv.state);
    if (targetResult.ok) {
      const elseToken = peek(targetResult.value.state);
      if (elseToken.kind !== 'Else') {
        return {
          ok: true,
          value: {
            expr: { kind: 'transition', guard: guardExpr, target: targetResult.value.target },
            state: targetResult.value.state,
          },
        };
      }
    }

    const afterArrowExpr = parseLogicalOr(arrowAdv.state);
    if (!afterArrowExpr.ok) return afterArrowExpr;

    const elseToken = peek(afterArrowExpr.value.state);
    if (elseToken.kind === 'Else') {
      const elseAdv = advance(afterArrowExpr.value.state);
      const elseExpr = parseLogicalOr(elseAdv.state);
      if (!elseExpr.ok) return elseExpr;
      return {
        ok: true,
        value: {
          expr: {
            kind: 'conditional',
            condition: guardExpr,
            thenExpr: afterArrowExpr.value.expr,
            elseExpr: elseExpr.value.expr,
            resultType: 'unknown',
          },
          state: elseExpr.value.state,
        },
      };
    }
  }

  const afterArrow = parseLogicalOr(arrowAdv.state);
  if (!afterArrow.ok) return afterArrow;

  const elseToken2 = peek(afterArrow.value.state);
  if (elseToken2.kind === 'Else') {
    const elseAdv = advance(afterArrow.value.state);
    const elseExpr = parseLogicalOr(elseAdv.state);
    if (!elseExpr.ok) return elseExpr;
    return {
      ok: true,
      value: {
        expr: {
          kind: 'conditional',
          condition: guardExpr,
          thenExpr: afterArrow.value.expr,
          elseExpr: elseExpr.value.expr,
          resultType: 'unknown',
        },
        state: elseExpr.value.state,
      },
    };
  }

  return {
    ok: true,
    value: {
      expr: {
        kind: 'conditional',
        condition: guardExpr,
        thenExpr: afterArrow.value.expr,
        elseExpr: { kind: 'literal', value: false, type: 'boolean' },
        resultType: 'unknown',
      },
      state: afterArrow.value.state,
    },
  };
}

function parseExpression(state: ParseState): LawResult<ParseResult> {
  if (peek(state).kind === 'If') {
    return parseIfExpression(state);
  }

  const left = parseLogicalOr(state);
  if (!left.ok) return left;

  if (peek(left.value.state).kind === 'Arrow') {
    return parseTransitionOrArrow(left.value.expr, left.value.state);
  }

  return left;
}

function parseIfExpression(state: ParseState): LawResult<ParseResult> {
  const ifAdv = advance(state);
  if (ifAdv.token.kind !== 'If') {
    return makeError('Expected if', ifAdv.token);
  }

  const condition = parseLogicalOr(ifAdv.state);
  if (!condition.ok) return condition;

  const arrowCheck = match(condition.value.state, 'Arrow');
  if (!arrowCheck.matched) {
    return makeError('Expected -> after if condition', peek(condition.value.state));
  }

  const nextToken = peek(arrowCheck.state);
  if (nextToken.kind === 'Identifier') {
    const targetResult = parseTransitionTarget(arrowCheck.state);
    if (targetResult.ok) {
      const elseCheck = peek(targetResult.value.state);
      if (elseCheck.kind === 'Else') {
        const elseAdv = advance(targetResult.value.state);
        const elseExpr = parseLogicalOr(elseAdv.state);
        if (!elseExpr.ok) return elseExpr;
        return {
          ok: true,
          value: {
            expr: {
              kind: 'conditional',
              condition: condition.value.expr,
              thenExpr: {
                kind: 'transition',
                guard: condition.value.expr,
                target: targetResult.value.target,
              },
              elseExpr: elseExpr.value.expr,
              resultType: 'unknown',
            },
            state: elseExpr.value.state,
          },
        };
      }
      return {
        ok: true,
        value: {
          expr: { kind: 'transition', guard: condition.value.expr, target: targetResult.value.target },
          state: targetResult.value.state,
        },
      };
    }
  }

  const thenExpr = parseLogicalOr(arrowCheck.state);
  if (!thenExpr.ok) return thenExpr;

  const elseCheck = peek(thenExpr.value.state);
  if (elseCheck.kind !== 'Else') {
    return makeError('Expected else in if expression', elseCheck);
  }

  const elseAdv = advance(thenExpr.value.state);
  const elseExpr = parseExpression(elseAdv.state);
  if (!elseExpr.ok) return elseExpr;

  return {
    ok: true,
    value: {
      expr: {
        kind: 'conditional',
        condition: condition.value.expr,
        thenExpr: thenExpr.value.expr,
        elseExpr: elseExpr.value.expr,
        resultType: 'unknown',
      },
      state: elseExpr.value.state,
    },
  };
}

function parseProgram(state: ParseState): LawResult<Expression> {
  if (peek(state).kind === 'EOF') {
    return makeError('Empty expression', peek(state));
  }

  const result = parseExpression(state);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const eofToken = peek(result.value.state);
  if (eofToken.kind !== 'EOF') {
    return makeError(`Unexpected token '${eofToken.value}' after expression`, eofToken);
  }

  return { ok: true, value: result.value.expr };
}

export function parse(tokens: ReadonlyArray<Token>): LawResult<Expression> {
  const state: ParseState = { tokens, pos: 0 };
  return parseProgram(state);
}

export function parseSource(source: string): LawResult<Expression> {
  const tokens = tokenize(source);
  return parse(tokens);
}
