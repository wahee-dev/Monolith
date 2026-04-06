'use client';

import { useMemo } from 'react';
import { createLatticeNodeId } from '@lattice/types';
import type { LatticeState, LatticeNode, LatticeNodeId } from '@lattice/types';
import { MeshCanvas, useMeshProjection } from '@mesh/index';

function makeNode(node: LatticeNode): LatticeNode {
  return node;
}

function createSampleLatticeState(): LatticeState {
  const sourceId = createLatticeNodeId('node-source-001');
  const transformId = createLatticeNodeId('node-transform-002');
  const sinkId = createLatticeNodeId('node-sink-003');
  const gateId = createLatticeNodeId('node-gate-004');

  const nodes = new Map<LatticeNodeId, LatticeNode>([
    [
      sourceId,
      makeNode({
        id: sourceId,
        kind: 'source',
        schema: {
          input: {
            data: { name: 'data', type: 'string', required: true },
          },
          output: {
            result: { name: 'result', type: 'string', required: true },
          },
        },
      }),
    ],
    [
      transformId,
      makeNode({
        id: transformId,
        kind: 'transform',
        schema: {
          input: {
            input: { name: 'input', type: 'string', required: true },
            factor: { name: 'factor', type: 'number', required: true },
          },
          output: {
            output: { name: 'output', type: 'string', required: true },
          },
        },
      }),
    ],
    [
      sinkId,
      makeNode({
        id: sinkId,
        kind: 'sink',
        schema: {
          input: {
            value: { name: 'value', type: 'string', required: true },
          },
          output: {
            confirmed: { name: 'confirmed', type: 'boolean', required: true },
          },
        },
      }),
    ],
    [
      gateId,
      makeNode({
        id: gateId,
        kind: 'gate',
        schema: {
          input: {
            payload: { name: 'payload', type: 'object', required: true },
            active: { name: 'active', type: 'boolean', required: true },
          },
          output: {
            items: { name: 'items', type: 'array', required: true },
          },
        },
      }),
    ],
  ]);

  const connections = [
    {
      id: 'conn-001',
      from: sourceId,
      to: transformId,
      fromPort: 'result',
      toPort: 'input',
    },
    {
      id: 'conn-002',
      from: transformId,
      to: sinkId,
      fromPort: 'output',
      toPort: 'value',
    },
    {
      id: 'conn-003',
      from: transformId,
      to: gateId,
      fromPort: 'output',
      toPort: 'payload',
    },
  ];

  const values = new Map([
    [sourceId, { data: 'hello-world', result: 'HELLO-WORLD' }],
    [transformId, { input: 'HELLO-WORLD', factor: 2, output: 'transformed' }],
    [sinkId, { value: 'transformed', confirmed: true }],
    [gateId, { payload: { key: 'value' }, active: true, items: [1, 2, 3] }],
  ]);

  return {
    nodes,
    connections,
    values,
    status: 'idle',
    version: 1,
  };
}

export default function MeshPage(): React.ReactElement {
  const state = useMemo(() => createSampleLatticeState(), []);
  const view = useMeshProjection(state);

  return <MeshCanvas view={view} />;
}
