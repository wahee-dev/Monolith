import type { LawResult } from '@law/types';
import type { LatticeState, LatticeNode, LatticeConnection, LatticeNodeId, SceneState } from './types';
import { createLatticeNodeId } from './types';

interface SerializedNode {
  readonly id: string;
  readonly kind: LatticeNode['kind'];
  readonly schema: LatticeNode['schema'];
}

interface SerializedConnection {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly fromPort: string;
  readonly toPort: string;
}

interface SerializedScene {
  readonly id: string;
  readonly name: string;
  readonly nodes: ReadonlyArray<SerializedNode>;
  readonly connections: ReadonlyArray<SerializedConnection>;
}

interface SerializedValue {
  readonly nodeId: string;
  readonly value: unknown;
}

interface SerializedState {
  readonly scenes: ReadonlyArray<SerializedScene>;
  readonly activeSceneId: string;
  readonly values: ReadonlyArray<SerializedValue>;
  readonly status: LatticeState['status'];
  readonly version: number;
}

function deterministicStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
    case 'boolean':
      return String(value);
    case 'object':
      break;
    default:
      return 'null';
  }
  if (Array.isArray(value)) {
    const items = value.map(deterministicStringify);
    return '[' + items.join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + deterministicStringify(obj[k]));
  return '{' + pairs.join(',') + '}';
}

function toSerializable(state: LatticeState): SerializedState {
  const scenes: SerializedScene[] = [];
  for (const scene of state.scenes.values()) {
    const nodes: SerializedNode[] = [];
    for (const [id, node] of scene.nodes) {
      nodes.push({
        id: id as string,
        kind: node.kind,
        schema: node.schema,
      });
    }

    const connections: SerializedConnection[] = scene.connections.map((conn: any) => ({
      id: conn.id,
      from: conn.from as string,
      to: conn.to as string,
      fromPort: conn.fromPort,
      toPort: conn.toPort,
    }));

    scenes.push({
      id: scene.id,
      name: scene.name,
      nodes,
      connections,
    });
  }

  const values: SerializedValue[] = [];
  for (const [id, val] of state.values) {
    values.push({ nodeId: id as string, value: val });
  }

  return {
    scenes,
    activeSceneId: state.activeSceneId,
    values,
    status: state.status,
    version: state.version,
  };
}

function fromDeserialized(
  serialized: SerializedState,
): LawResult<LatticeState> {
  const scenes = new Map<string, SceneState>();
  for (const ss of serialized.scenes) {
    const nodes = new Map<LatticeNodeId, LatticeNode>();
    for (const sn of ss.nodes) {
      const nodeId = createLatticeNodeId(sn.id);
      nodes.set(nodeId, {
        id: nodeId,
        kind: sn.kind,
        schema: sn.schema,
      });
    }

    const connections: LatticeConnection[] = ss.connections.map((sc) => ({
      id: sc.id,
      from: createLatticeNodeId(sc.from),
      to: createLatticeNodeId(sc.to),
      fromPort: sc.fromPort,
      toPort: sc.toPort,
    }));

    scenes.set(ss.id, {
      id: ss.id,
      name: ss.name,
      nodes,
      connections,
    });
  }

  const values = new Map<LatticeNodeId, unknown>();
  for (const sv of serialized.values) {
    values.set(createLatticeNodeId(sv.nodeId), sv.value);
  }

  return {
    ok: true,
    value: {
      scenes,
      activeSceneId: serialized.activeSceneId,
      values,
      status: serialized.status,
      version: serialized.version,
    },
  };
}

export function serializeState(state: LatticeState): string {
  const serializable = toSerializable(state);
  return deterministicStringify(serializable);
}

export function deserializeState(json: string): LawResult<LatticeState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Failed to parse JSON',
      },
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid state: expected an object',
      },
    };
  }

  const obj = parsed as Record<string, unknown>;
  return fromDeserialized(obj as unknown as SerializedState);
}

export async function computeStateHash(state: LatticeState): Promise<string> {
  const serialized = serializeState(state);
  const encoded = new TextEncoder().encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const array = new Uint8Array(hashBuffer);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
