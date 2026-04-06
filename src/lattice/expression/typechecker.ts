import type { LawResult } from '@law/types';
import type { Expression, ExpressionType, BinaryOperator } from './ast';

interface FunctionSignature {
  readonly name: string;
  readonly paramTypes: ReadonlyArray<ExpressionType>;
  readonly returnType: ExpressionType;
}

const BUILTINS: ReadonlyArray<FunctionSignature> = [
  { name: 'abs', paramTypes: ['number'], returnType: 'number' },
  { name: 'min', paramTypes: ['number', 'number'], returnType: 'number' },
  { name: 'max', paramTypes: ['number', 'number'], returnType: 'number' },
  { name: 'floor', paramTypes: ['number'], returnType: 'number' },
  { name: 'ceil', paramTypes: ['number'], returnType: 'number' },
  { name: 'round', paramTypes: ['number'], returnType: 'number' },
  { name: 'toString', paramTypes: ['number'], returnType: 'string' },
  { name: 'toNumber', paramTypes: ['string'], returnType: 'number' },
  { name: 'length', paramTypes: ['string'], returnType: 'number' },
  { name: 'concat', paramTypes: ['string', 'string'], returnType: 'string' },
  { name: 'contains', paramTypes: ['string', 'string'], returnType: 'boolean' },
  { name: 'isEmpty', paramTypes: ['string'], returnType: 'boolean' },
];

const FUNCTION_REGISTRY: ReadonlyMap<string, FunctionSignature> = new Map(
  BUILTINS.map((fn) => [fn.name, fn]),
);

const COMPARISON_OPS: ReadonlySet<string> = new Set(['==', '!=', '>', '<', '>=', '<=']);
const ARITHMETIC_OPS: ReadonlySet<string> = new Set(['+', '-', '*', '/', '%']);
const LOGICAL_OPS: ReadonlySet<string> = new Set(['&&', '||']);

function typeError(message: string): LawResult<ExpressionType> {
  return {
    ok: false,
    error: { code: 'TOKEN_INVALID', message },
  };
}

function inferExpressionType(expr: Expression): LawResult<ExpressionType> {
  switch (expr.kind) {
    case 'literal':
      return { ok: true, value: expr.type };

    case 'variable':
      return { ok: true, value: expr.resolvedType };

    case 'unary': {
      const operandType = inferExpressionType(expr.operand);
      if (!operandType.ok) return operandType;

      if (expr.operator === '!') {
        if (operandType.value !== 'boolean') {
          return typeError(`Operator '!' requires boolean operand, got ${operandType.value}`);
        }
        return { ok: true, value: 'boolean' };
      }

      if (expr.operator === '-') {
        if (operandType.value !== 'number') {
          return typeError(`Operator '-' requires number operand, got ${operandType.value}`);
        }
        return { ok: true, value: 'number' };
      }

      return typeError(`Unknown unary operator '${String(expr.operator)}'`);
    }

    case 'binary': {
      const leftType = inferExpressionType(expr.left);
      if (!leftType.ok) return leftType;
      const rightType = inferExpressionType(expr.right);
      if (!rightType.ok) return rightType;

      return checkBinaryOp(expr.operator, leftType.value, rightType.value);
    }

    case 'conditional': {
      const condType = inferExpressionType(expr.condition);
      if (!condType.ok) return condType;

      if (condType.value !== 'boolean') {
        return typeError(`Condition must be boolean, got ${condType.value}`);
      }

      const thenType = inferExpressionType(expr.thenExpr);
      if (!thenType.ok) return thenType;
      const elseType = inferExpressionType(expr.elseExpr);
      if (!elseType.ok) return elseType;

      if (thenType.value === elseType.value) {
        return { ok: true, value: thenType.value };
      }

      return { ok: true, value: 'unknown' };
    }

    case 'transition': {
      const guardType = inferExpressionType(expr.guard);
      if (!guardType.ok) return guardType;

      if (guardType.value !== 'boolean' && guardType.value !== 'unknown') {
        return typeError(`Transition guard must be boolean, got ${guardType.value}`);
      }

      return { ok: true, value: 'void' };
    }

    case 'function_call': {
      const sig = FUNCTION_REGISTRY.get(expr.name);
      if (sig === undefined) {
        return typeError(`Unknown function '${expr.name}'`);
      }

      if (expr.args.length !== sig.paramTypes.length) {
        return typeError(
          `Function '${expr.name}' expects ${sig.paramTypes.length} argument(s), got ${expr.args.length}`,
        );
      }

      for (let i = 0; i < expr.args.length; i++) {
        const arg = expr.args[i];
        if (arg === undefined) {
          return typeError(`Missing argument ${i + 1} for function '${expr.name}'`);
        }
        const argType = inferExpressionType(arg);
        if (!argType.ok) return argType;
        const expected = sig.paramTypes[i];
        if (expected === undefined) {
          return typeError(`Internal error: missing param type for argument ${i + 1}`);
        }
        if (argType.value !== expected && argType.value !== 'unknown') {
          return typeError(
            `Function '${expr.name}' argument ${i + 1} expects ${expected}, got ${argType.value}`,
          );
        }
      }

      return { ok: true, value: sig.returnType };
    }

    default:
      return typeError(`Unknown expression kind`);
  }
}

function checkBinaryOp(
  operator: BinaryOperator,
  leftType: ExpressionType,
  rightType: ExpressionType,
): LawResult<ExpressionType> {
  if (COMPARISON_OPS.has(operator)) {
    if (leftType !== rightType && leftType !== 'unknown' && rightType !== 'unknown') {
      return typeError(`Comparison '${operator}' requires same types, got ${leftType} and ${rightType}`);
    }
    return { ok: true, value: 'boolean' };
  }

  if (ARITHMETIC_OPS.has(operator)) {
    if (leftType !== 'number' && leftType !== 'unknown') {
      return typeError(`Arithmetic '${operator}' requires number, got ${leftType}`);
    }
    if (rightType !== 'number' && rightType !== 'unknown') {
      return typeError(`Arithmetic '${operator}' requires number, got ${rightType}`);
    }
    return { ok: true, value: 'number' };
  }

  if (LOGICAL_OPS.has(operator)) {
    if (leftType !== 'boolean' && leftType !== 'unknown') {
      return typeError(`Logical '${operator}' requires boolean, got ${leftType}`);
    }
    if (rightType !== 'boolean' && rightType !== 'unknown') {
      return typeError(`Logical '${operator}' requires boolean, got ${rightType}`);
    }
    return { ok: true, value: 'boolean' };
  }

  return typeError(`Unknown binary operator '${operator}'`);
}

export function typecheck(expr: Expression): LawResult<ExpressionType> {
  return inferExpressionType(expr);
}

export function getFunctionRegistry(): ReadonlyMap<string, FunctionSignature> {
  return FUNCTION_REGISTRY;
}
