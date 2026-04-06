import type { LawResult } from '@law/types';
import type { Expression, ExpressionType, BinaryOperator } from './ast';

export interface EvalResult {
  readonly value: unknown;
  readonly type: ExpressionType;
}

export type Environment = ReadonlyMap<string, unknown>;

function evalError(message: string): LawResult<EvalResult> {
  return {
    ok: false,
    error: { code: 'TOKEN_INVALID', message },
  };
}

function lookupVariable(path: ReadonlyArray<string>, env: Environment): LawResult<EvalResult> {
  const fullPath = path.join('.');
  const value = env.get(fullPath);
  if (value === undefined) {
    return evalError(`Undefined variable '${fullPath}'`);
  }

  const inferredType = inferTypeFromValue(value);
  return { ok: true, value: { value, type: inferredType } };
}

function inferTypeFromValue(value: unknown): ExpressionType {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

function applyBinaryOp(
  operator: BinaryOperator,
  left: EvalResult,
  right: EvalResult,
): LawResult<EvalResult> {
  switch (operator) {
    case '+':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value + right.value, type: 'number' } };
      }
      return evalError(`Operator '+' requires numbers, got ${left.type} and ${right.type}`);

    case '-':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value - right.value, type: 'number' } };
      }
      return evalError(`Operator '-' requires numbers, got ${left.type} and ${right.type}`);

    case '*':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value * right.value, type: 'number' } };
      }
      return evalError(`Operator '*' requires numbers, got ${left.type} and ${right.type}`);

    case '/':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        if (right.value === 0) {
          return evalError('Division by zero');
        }
        return { ok: true, value: { value: left.value / right.value, type: 'number' } };
      }
      return evalError(`Operator '/' requires numbers, got ${left.type} and ${right.type}`);

    case '%':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        if (right.value === 0) {
          return evalError('Modulo by zero');
        }
        return { ok: true, value: { value: left.value % right.value, type: 'number' } };
      }
      return evalError(`Operator '%' requires numbers, got ${left.type} and ${right.type}`);

    case '==':
      return { ok: true, value: { value: left.value === right.value, type: 'boolean' } };

    case '!=':
      return { ok: true, value: { value: left.value !== right.value, type: 'boolean' } };

    case '>':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value > right.value, type: 'boolean' } };
      }
      return evalError(`Operator '>' requires numbers, got ${left.type} and ${right.type}`);

    case '<':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value < right.value, type: 'boolean' } };
      }
      return evalError(`Operator '<' requires numbers, got ${left.type} and ${right.type}`);

    case '>=':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value >= right.value, type: 'boolean' } };
      }
      return evalError(`Operator '>=' requires numbers, got ${left.type} and ${right.type}`);

    case '<=':
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return { ok: true, value: { value: left.value <= right.value, type: 'boolean' } };
      }
      return evalError(`Operator '<=' requires numbers, got ${left.type} and ${right.type}`);

    case '&&':
      if (typeof left.value === 'boolean' && typeof right.value === 'boolean') {
        return { ok: true, value: { value: left.value && right.value, type: 'boolean' } };
      }
      return evalError(`Operator '&&' requires booleans, got ${left.type} and ${right.type}`);

    case '||':
      if (typeof left.value === 'boolean' && typeof right.value === 'boolean') {
        return { ok: true, value: { value: left.value || right.value, type: 'boolean' } };
      }
      return evalError(`Operator '||' requires booleans, got ${left.type} and ${right.type}`);

    default:
      return evalError(`Unknown operator`);
  }
}

function applyBuiltin(name: string, args: ReadonlyArray<EvalResult>): LawResult<EvalResult> {
  switch (name) {
    case 'abs': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'number') return evalError('abs requires a number');
      return { ok: true, value: { value: Math.abs(a.value), type: 'number' } };
    }
    case 'min': {
      const a = args[0];
      const b = args[1];
      if (a === undefined || typeof a.value !== 'number') return evalError('min requires numbers');
      if (b === undefined || typeof b.value !== 'number') return evalError('min requires numbers');
      return { ok: true, value: { value: Math.min(a.value, b.value), type: 'number' } };
    }
    case 'max': {
      const a = args[0];
      const b = args[1];
      if (a === undefined || typeof a.value !== 'number') return evalError('max requires numbers');
      if (b === undefined || typeof b.value !== 'number') return evalError('max requires numbers');
      return { ok: true, value: { value: Math.max(a.value, b.value), type: 'number' } };
    }
    case 'floor': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'number') return evalError('floor requires a number');
      return { ok: true, value: { value: Math.floor(a.value), type: 'number' } };
    }
    case 'ceil': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'number') return evalError('ceil requires a number');
      return { ok: true, value: { value: Math.ceil(a.value), type: 'number' } };
    }
    case 'round': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'number') return evalError('round requires a number');
      return { ok: true, value: { value: Math.round(a.value), type: 'number' } };
    }
    case 'toString': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'number') return evalError('toString requires a number');
      return { ok: true, value: { value: String(a.value), type: 'string' } };
    }
    case 'toNumber': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'string') return evalError('toNumber requires a string');
      const num = Number(a.value);
      if (Number.isNaN(num)) return evalError(`Cannot convert '${a.value}' to number`);
      return { ok: true, value: { value: num, type: 'number' } };
    }
    case 'length': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'string') return evalError('length requires a string');
      return { ok: true, value: { value: a.value.length, type: 'number' } };
    }
    case 'concat': {
      const a = args[0];
      const b = args[1];
      if (a === undefined || typeof a.value !== 'string') return evalError('concat requires strings');
      if (b === undefined || typeof b.value !== 'string') return evalError('concat requires strings');
      return { ok: true, value: { value: a.value + b.value, type: 'string' } };
    }
    case 'contains': {
      const a = args[0];
      const b = args[1];
      if (a === undefined || typeof a.value !== 'string') return evalError('contains requires strings');
      if (b === undefined || typeof b.value !== 'string') return evalError('contains requires strings');
      return { ok: true, value: { value: a.value.includes(b.value), type: 'boolean' } };
    }
    case 'isEmpty': {
      const a = args[0];
      if (a === undefined || typeof a.value !== 'string') return evalError('isEmpty requires a string');
      return { ok: true, value: { value: a.value.length === 0, type: 'boolean' } };
    }
    default:
      return evalError(`Unknown function '${name}'`);
  }
}

export function evaluate(expr: Expression, env: Environment): LawResult<EvalResult> {
  switch (expr.kind) {
    case 'literal':
      return { ok: true, value: { value: expr.value, type: expr.type } };

    case 'variable':
      return lookupVariable(expr.path, env);

    case 'unary': {
      const operand = evaluate(expr.operand, env);
      if (!operand.ok) return operand;

      if (expr.operator === '!') {
        if (typeof operand.value.value !== 'boolean') {
          return evalError(`Operator '!' requires boolean, got ${operand.value.type}`);
        }
        return { ok: true, value: { value: !operand.value.value, type: 'boolean' } };
      }

      if (expr.operator === '-') {
        if (typeof operand.value.value !== 'number') {
          return evalError(`Operator '-' requires number, got ${operand.value.type}`);
        }
        return { ok: true, value: { value: -operand.value.value, type: 'number' } };
      }

      return evalError(`Unknown unary operator`);
    }

    case 'binary': {
      const left = evaluate(expr.left, env);
      if (!left.ok) return left;
      const right = evaluate(expr.right, env);
      if (!right.ok) return right;

      return applyBinaryOp(expr.operator, left.value, right.value);
    }

    case 'conditional': {
      const cond = evaluate(expr.condition, env);
      if (!cond.ok) return cond;

      if (typeof cond.value.value !== 'boolean') {
        return evalError(`Condition must be boolean, got ${cond.value.type}`);
      }

      if (cond.value.value) {
        return evaluate(expr.thenExpr, env);
      }
      return evaluate(expr.elseExpr, env);
    }

    case 'transition': {
      const guard = evaluate(expr.guard, env);
      if (!guard.ok) return guard;

      if (typeof guard.value.value !== 'boolean') {
        return evalError(`Transition guard must be boolean, got ${guard.value.type}`);
      }

      const targetPath = [...expr.target.nodePath, expr.target.port].join('.');
      return {
        ok: true,
        value: {
          value: guard.value.value ? targetPath : '',
          type: 'void',
        },
      };
    }

    case 'function_call': {
      const evaluatedArgs: EvalResult[] = [];
      for (const arg of expr.args) {
        const evaled = evaluate(arg, env);
        if (!evaled.ok) return evaled;
        evaluatedArgs.push(evaled.value);
      }
      return applyBuiltin(expr.name, evaluatedArgs);
    }

    default:
      return evalError('Unknown expression kind');
  }
}
