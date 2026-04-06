import type { LawResult } from '@law/types';
import type { LatticeNode, SchemaField } from './types';

function validateSchemaField(value: unknown, field: SchemaField): boolean {
  switch (field.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return false;
  }
}

function validateInput(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const keys = Object.keys(node.schema.input);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const field = node.schema.input[key]!;
    const value = input[key];
    if (value === undefined) {
      return {
        ok: false,
        error: {
          code: 'TOKEN_INVALID',
          message: `Missing required input field '${field.name}' of type '${field.type}' for node '${node.id as string}'`,
        },
      };
    }
    if (!validateSchemaField(value, field)) {
      return {
        ok: false,
        error: {
          code: 'TOKEN_INVALID',
          message: `Input field '${field.name}' expected type '${field.type}' but received '${typeof value}' for node '${node.id as string}'`,
        },
      };
    }
  }
  return { ok: true, value: input };
}

export function executeSourceNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const validated = validateInput(node, input);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true, value: { ...validated.value } };
}

export function executeTransformNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const validated = validateInput(node, input);
  if (!validated.ok) {
    return validated;
  }
  const output: Record<string, unknown> = {};
  const outputKeys = Object.keys(node.schema.output);
  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    const sourceValue = validated.value[key];
    output[key] = sourceValue === undefined ? '' : sourceValue;
  }
  return { ok: true, value: output };
}

export function executeSinkNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const validated = validateInput(node, input);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true, value: { ...validated.value } };
}

export function executeGateNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const validated = validateInput(node, input);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true, value: { ...validated.value } };
}

export function executeMergeNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const validated = validateInput(node, input);
  if (!validated.ok) {
    return validated;
  }
  const output: Record<string, unknown> = {};
  const outputKeys = Object.keys(node.schema.output);
  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    const sourceValue = validated.value[key];
    output[key] = sourceValue === undefined ? '' : sourceValue;
  }
  return { ok: true, value: output };
}

export function executeSplitNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  const validated = validateInput(node, input);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true, value: { ...validated.value } };
}

export function executeNode(
  node: LatticeNode,
  input: Record<string, unknown>,
): LawResult<Record<string, unknown>> {
  switch (node.kind) {
    case 'source':
      return executeSourceNode(node, input);
    case 'transform':
      return executeTransformNode(node, input);
    case 'sink':
      return executeSinkNode(node, input);
    case 'gate':
      return executeGateNode(node, input);
    case 'merge':
      return executeMergeNode(node, input);
    case 'split':
      return executeSplitNode(node, input);
    default:
      return {
        ok: false,
        error: {
          code: 'TOKEN_INVALID',
          message: `Unknown node kind '${node.kind}' for node '${node.id as string}'`,
        },
      };
  }
}
