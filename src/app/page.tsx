'use client';

import { useMemo } from 'react';
import { createLatticeNodeId } from '@lattice/types';
import type { LatticeState, LatticeNode, LatticeNodeId } from '@lattice/types';
import { createLedger } from '@law/ledger';
import MeshPage from '@mesh/components/MeshPage';
import { ShadowAppPanel } from '@preview/index';

function createSampleLatticeState(): LatticeState {
  const sourceId = createLatticeNodeId('node-source-001');
  const transformId = createLatticeNodeId('node-transform-002');
  const sinkId = createLatticeNodeId('node-sink-003');
  const gateId = createLatticeNodeId('node-gate-004');

  const nodes = new Map<LatticeNodeId, LatticeNode>([
    [
      sourceId,
      {
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
      },
    ],
    [
      transformId,
      {
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
      },
    ],
    [
      sinkId,
      {
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
      },
    ],
    [
      gateId,
      {
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
      },
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
    status: 'idle' as const,
    version: 1,
  };
}

function createSampleExpressions(): ReadonlyMap<string, string> {
  return new Map([
    ['node-source-001', 'source("api")'],
    ['node-transform-002', 'map(x => x.toUpperCase())'],
    ['node-sink-003', 'sink("display")'],
    ['node-gate-004', 'guard(auth)'],
  ]);
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#888888',
  running: '#4aff9f',
  paused: '#ff9f4a',
  error: '#ff4444',
  committed: '#00bcd4',
  rolledback: '#ff9f4a',
};

export default function Home(): React.ReactElement {
  const ledger = createLedger();
  const latticeState = useMemo(() => createSampleLatticeState(), []);
  const expressions = useMemo(() => createSampleExpressions(), []);

  const statusColor = STATUS_COLORS[latticeState.status] ?? '#888888';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0a0a0f',
        color: '#e0e0e0',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid #1a1a2e',
          backgroundColor: '#0c0c14',
        }}
      >
        <h1 style={{ color: '#4a9eff', fontSize: '1rem', margin: 0 }}>
          Monolith Engine
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusColor,
            }}
          />
          <span style={{ fontSize: '11px', color: '#888888' }}>
            {latticeState.status.toUpperCase()} · v{latticeState.version}
          </span>
          <span style={{ fontSize: '11px', color: '#555555' }}>
            ledger: {ledger.entries.length} entries
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 7, overflow: 'hidden' }}>
          <MeshPage latticeState={latticeState} />
        </div>
        <ShadowAppPanel latticeState={latticeState} expressions={expressions} />
      </div>
    </div>
  );
}
