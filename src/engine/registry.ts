import type { LawResult } from '@law/types';
import type { NodeTypeDefinition, NodeCategory, PortDefinition } from './types';
import { ALL_NODE_DEFINITIONS } from './nodes';

const SOURCE_DEFINITION: NodeTypeDefinition = {
  kind: 'source',
  label: 'Source',
  category: 'data',
  description: 'Produces data as a starting point in the graph. Outputs are defined by the user.',
  inputs: [],
  outputs: [
    { name: 'output', type: 'any', label: 'Output', required: true },
  ] as ReadonlyArray<PortDefinition>,
  editableSchema: true,
};

const TRANSFORM_DEFINITION: NodeTypeDefinition = {
  kind: 'transform',
  label: 'Transform',
  category: 'transform',
  description: 'Transforms input data into a different shape or format. Schema is user-defined.',
  inputs: [
    { name: 'input', type: 'any', label: 'Input', required: true },
  ] as ReadonlyArray<PortDefinition>,
  outputs: [
    { name: 'output', type: 'any', label: 'Output', required: true },
  ] as ReadonlyArray<PortDefinition>,
  editableSchema: true,
};

const SINK_DEFINITION: NodeTypeDefinition = {
  kind: 'sink',
  label: 'Sink',
  category: 'io',
  description: 'Consumes data and produces no further output. The end of a data pipeline.',
  inputs: [
    { name: 'input', type: 'any', label: 'Input', required: true },
  ] as ReadonlyArray<PortDefinition>,
  outputs: [],
  editableSchema: true,
};

const GATE_DEFINITION: NodeTypeDefinition = {
  kind: 'gate',
  label: 'Gate',
  category: 'logic',
  description: 'Conditionally passes data through based on a boolean gate signal.',
  inputs: [
    { name: 'data', type: 'any', label: 'Data', required: true },
    { name: 'enable', type: 'boolean', label: 'Enable', required: true },
  ] as ReadonlyArray<PortDefinition>,
  outputs: [
    { name: 'output', type: 'any', label: 'Output', required: true },
  ] as ReadonlyArray<PortDefinition>,
  editableSchema: false,
};

const MERGE_DEFINITION: NodeTypeDefinition = {
  kind: 'merge',
  label: 'Merge',
  category: 'logic',
  description: 'Merges two data streams into a single combined output.',
  inputs: [
    { name: 'a', type: 'any', label: 'Input A', required: true },
    { name: 'b', type: 'any', label: 'Input B', required: true },
  ] as ReadonlyArray<PortDefinition>,
  outputs: [
    { name: 'output', type: 'object', label: 'Merged Output', required: true },
  ] as ReadonlyArray<PortDefinition>,
  editableSchema: false,
};

const SPLIT_DEFINITION: NodeTypeDefinition = {
  kind: 'split',
  label: 'Split',
  category: 'logic',
  description: 'Splits a single data stream into two separate outputs.',
  inputs: [
    { name: 'input', type: 'any', label: 'Input', required: true },
  ] as ReadonlyArray<PortDefinition>,
  outputs: [
    { name: 'a', type: 'any', label: 'Output A', required: true },
    { name: 'b', type: 'any', label: 'Output B', required: true },
  ] as ReadonlyArray<PortDefinition>,
  editableSchema: false,
};

const ORIGINAL_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  SOURCE_DEFINITION,
  TRANSFORM_DEFINITION,
  SINK_DEFINITION,
  GATE_DEFINITION,
  MERGE_DEFINITION,
  SPLIT_DEFINITION,
];

const ALL_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  ...ORIGINAL_DEFINITIONS,
  ...ALL_NODE_DEFINITIONS,
];

function buildRegistry(
  definitions: ReadonlyArray<NodeTypeDefinition>,
): ReadonlyMap<string, NodeTypeDefinition> {
  const map = new Map<string, NodeTypeDefinition>();
  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i]!;
    map.set(def.kind, def);
  }
  return map;
}

export const NODE_REGISTRY: ReadonlyMap<string, NodeTypeDefinition> =
  buildRegistry(ALL_DEFINITIONS);

export function getNodeTypeDefinition(kind: string): LawResult<NodeTypeDefinition> {
  const definition = NODE_REGISTRY.get(kind);
  if (definition === undefined) {
    return {
      ok: false,
      error: {
        code: 'TYPE_MISMATCH',
        message: `Unknown node kind '${kind}'`,
      },
    };
  }
  return { ok: true, value: definition };
}

export function getAllCategories(): ReadonlyArray<NodeCategory> {
  const categories = new Set<NodeCategory>();
  for (const def of NODE_REGISTRY.values()) {
    categories.add(def.category);
  }
  return Array.from(categories);
}

export function getNodesByCategory(category: NodeCategory): ReadonlyArray<NodeTypeDefinition> {
  const result: NodeTypeDefinition[] = [];
  for (const def of NODE_REGISTRY.values()) {
    if (def.category === category) {
      result.push(def);
    }
  }
  return result;
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[-\s]+/g, ' ').trim();
}

function scoreMatch(definition: NodeTypeDefinition, normalizedQuery: string): number {
  const fields = [
    definition.kind,
    definition.label,
    definition.description,
    definition.category,
  ];
  let bestScore = 0;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!.toLowerCase();
    if (field === normalizedQuery) {
      return 100;
    }
    if (field.startsWith(normalizedQuery)) {
      const score = 80 - i * 5;
      if (score > bestScore) {
        bestScore = score;
      }
    }
    if (field.includes(normalizedQuery)) {
      const score = 60 - i * 5;
      if (score > bestScore) {
        bestScore = score;
      }
    }
  }
  const queryWords = normalizedQuery.split(' ');
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!.toLowerCase();
    for (let j = 0; j < queryWords.length; j++) {
      const word = queryWords[j]!;
      if (word.length > 0 && field.includes(word)) {
        const score = 40 - i * 3;
        if (score > bestScore) {
          bestScore = score;
        }
      }
    }
  }
  return bestScore;
}

export function searchNodes(query: string): ReadonlyArray<NodeTypeDefinition> {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length === 0) {
    return Array.from(NODE_REGISTRY.values());
  }
  const scored: ReadonlyArray<{ readonly definition: NodeTypeDefinition; readonly score: number }> =
    ALL_DEFINITIONS.map((def) => ({
      definition: def,
      score: scoreMatch(def, normalizedQuery),
    }));
  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.definition);
}
