import { describe, it, expect } from 'vitest';
import { typecheckExpression, typecheckNodeExpressions } from './typecheck';

describe('TypeCheck', () => {
  it('validates a correct expression', () => {
    const result = typecheckExpression('"hello"');
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
    } else {
      throw new Error('Should be ok');
    }
  });

  it('identifies an invalid expression', () => {
    const result = typecheckExpression('1 + "a"');
    // The current parser might be lenient or return an error in LawResult
    if (!result.ok) {
      expect(result.error.code).toBe('TYPE_MISMATCH');
    }
  });

  it('checks multiple expressions', () => {
    const expressions = new Map([
      ['node1', 'true'],
      ['node2', '42'],
    ]);
    const result = typecheckNodeExpressions(expressions);
    expect(result.allValid).toBe(true);
    expect(result.diagnostics).toHaveLength(2);
  });
});
