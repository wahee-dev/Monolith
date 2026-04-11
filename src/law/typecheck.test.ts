import { describe, it, expect } from 'vitest';
import { typecheckExpressionWrapper as typecheckExpression, typecheckAllExpressions, guardTypeCheckWrapper as guardTypeCheck } from './typecheck';

describe('typecheckExpression', () => {
  it('returns valid for empty source', () => {
    const result = typecheckExpression('node-1', '');
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
    expect(result.nodeId).toBe('node-1');
  });

  it('returns valid for whitespace-only source', () => {
    const result = typecheckExpression('node-1', '   ');
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('returns valid for a well-typed expression', () => {
    const result = typecheckExpression('node-1', '1 + 2');
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('returns valid for string literal', () => {
    const result = typecheckExpression('node-2', '"hello"');
    expect(result.isValid).toBe(true);
  });

  it('returns valid for boolean literal', () => {
    const result = typecheckExpression('node-3', 'true');
    expect(result.isValid).toBe(true);
  });

  it('returns valid for comparison expression', () => {
    const result = typecheckExpression('node-4', '1 == 2');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for type mismatch in arithmetic', () => {
    const result = typecheckExpression('node-5', '"hello" + 2');
    expect(result.isValid).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('returns invalid for type mismatch in logical op', () => {
    const result = typecheckExpression('node-6', '1 && 2');
    expect(result.isValid).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('returns invalid for syntax error', () => {
    const result = typecheckExpression('node-7', '+++');
    expect(result.isValid).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('returns invalid for unknown function', () => {
    const result = typecheckExpression('node-8', 'unknownFunc(1)');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unknown function');
  });

  it('returns valid for builtin function with correct types', () => {
    const result = typecheckExpression('node-9', 'abs(-5)');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for builtin function with wrong argument type', () => {
    const result = typecheckExpression('node-10', 'abs("hello")');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('abs');
  });

  it('preserves nodeId and source in result', () => {
    const result = typecheckExpression('my-node', '1 + 2');
    expect(result.nodeId).toBe('my-node');
    expect(result.source).toBe('1 + 2');
  });
});

describe('typecheckAllExpressions', () => {
  it('returns allValid=true for empty map', () => {
    const result = typecheckAllExpressions(new Map());
    expect(result.allValid).toBe(true);
    expect(result.diagnostics.size).toBe(0);
    expect(result.invalidNodeIds.length).toBe(0);
  });

  it('returns allValid=true when all expressions are valid', () => {
    const expressions = new Map<string, string>([
      ['node-1', '1 + 2'],
      ['node-2', '"hello"'],
      ['node-3', ''],
    ]);
    const result = typecheckAllExpressions(expressions);
    expect(result.allValid).toBe(true);
    expect(result.invalidNodeIds.length).toBe(0);
    expect(result.diagnostics.size).toBe(3);
  });

  it('returns allValid=false when some expressions are invalid', () => {
    const expressions = new Map<string, string>([
      ['node-1', '1 + 2'],
      ['node-2', '"hello" + 3'],
    ]);
    const result = typecheckAllExpressions(expressions);
    expect(result.allValid).toBe(false);
    expect(result.invalidNodeIds).toContain('node-2');
    expect(result.invalidNodeIds.length).toBe(1);
  });

  it('returns allValid=false when all expressions are invalid', () => {
    const expressions = new Map<string, string>([
      ['node-1', '"a" + 1'],
      ['node-2', '"b" * 2'],
    ]);
    const result = typecheckAllExpressions(expressions);
    expect(result.allValid).toBe(false);
    expect(result.invalidNodeIds.length).toBe(2);
  });

  it('includes diagnostics for every node', () => {
    const expressions = new Map<string, string>([
      ['n1', '1 + 1'],
      ['n2', '"x" - 1'],
      ['n3', 'true'],
    ]);
    const result = typecheckAllExpressions(expressions);
    expect(result.diagnostics.has('n1')).toBe(true);
    expect(result.diagnostics.has('n2')).toBe(true);
    expect(result.diagnostics.has('n3')).toBe(true);
    expect(result.diagnostics.get('n1')?.isValid).toBe(true);
    expect(result.diagnostics.get('n2')?.isValid).toBe(false);
    expect(result.diagnostics.get('n3')?.isValid).toBe(true);
  });
});

describe('guardTypeCheck', () => {
  it('returns ok=true for empty map', () => {
    const result = guardTypeCheck(new Map());
    expect(result.ok).toBe(true);
  });

  it('returns ok=true when all expressions pass', () => {
    const expressions = new Map<string, string>([
      ['node-1', '1 + 2'],
      ['node-2', 'true && false'],
    ]);
    const result = guardTypeCheck(expressions);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allValid).toBe(true);
    }
  });

  it('returns ok=false with TYPE_MISMATCH code when expressions fail', () => {
    const expressions = new Map<string, string>([
      ['node-1', '"hello" + 1'],
    ]);
    const result = guardTypeCheck(expressions);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TYPE_MISMATCH');
      expect(result.error.message).toContain('Type check failed');
    }
  });

  it('includes first error message in guard failure', () => {
    const expressions = new Map<string, string>([
      ['node-a', '"x" * 2'],
    ]);
    const result = guardTypeCheck(expressions);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it('returns ok=false for multiple invalid expressions', () => {
    const expressions = new Map<string, string>([
      ['n1', '1 + 2'],
      ['n2', '"a" - 1'],
      ['n3', 'true + false'],
    ]);
    const result = guardTypeCheck(expressions);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TYPE_MISMATCH');
    }
  });

  it('returns ok=true for all empty expressions', () => {
    const expressions = new Map<string, string>([
      ['n1', ''],
      ['n2', '   '],
    ]);
    const result = guardTypeCheck(expressions);
    expect(result.ok).toBe(true);
  });
});
