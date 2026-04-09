import { preprocessImports, isJSHybrid } from './preprocessor';
import { getMonolithAPI } from './monolith-api';

export interface EvalResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export interface JSExecResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  isAsync?: boolean;
}

export function evaluateJS(code: string, context: Record<string, unknown>): JSExecResult {
  if (!isJSHybrid(code)) {
    return { ok: false, error: 'Not a hybrid JS expression' };
  }

  const processedCode = preprocessImports(code);
  const Monolith = getMonolithAPI();

  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);

  try {
    const fn = new Function(
      'Monolith',
      ...contextKeys,
      `
      "use strict";
      ${processedCode}
    `
    );

    const result = fn(Monolith, ...contextValues);

    if (result instanceof Promise) {
      return {
        ok: true,
        value: result,
        isAsync: true,
      };
    }

    return { ok: true, value: result };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message,
    };
  }
}

export function executeWithMonolith(
  code: string,
  context: Record<string, unknown>
): EvalResult {
  const result = evaluateJS(code, context);

  if (!result.ok) {
    return result;
  }

  if (result.isAsync) {
    return {
      ok: true,
      value: (result.value as Promise<unknown>).catch((err) => {
        return { error: (err as Error).message };
      }),
    };
  }

  return {
    ok: true,
    value: result.value,
  };
}
