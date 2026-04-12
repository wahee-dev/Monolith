import type { LatticeState, LatticeStatus, LatticeNode, LatticeConnection, LatticeNodeId, SceneState } from './types';
import type { SnapshotState } from './context';

export function getActiveScene(state: LatticeState): SceneState {
  return state.scenes.get(state.activeSceneId)!;
}

function updateActiveScene(state: LatticeState, updater: (scene: SceneState) => SceneState): LatticeState {
  const activeScene = getActiveScene(state);
  const updatedScene = updater(activeScene);
  const newScenes = new Map(state.scenes);
  newScenes.set(state.activeSceneId, updatedScene);
  return {
    ...state,
    scenes: newScenes,
    version: state.version + 1,
  };
}

export function updateStatus(state: LatticeState, status: LatticeStatus): LatticeState {
  return {
    ...state,
    status,
    version: state.version + 1,
  };
}

export function addNode(state: LatticeState, node: LatticeNode): LatticeState {
  return updateActiveScene(state, (scene) => {
    const newNodes = new Map(scene.nodes);
    newNodes.set(node.id, node);
    return { ...scene, nodes: newNodes };
  });
}

export function removeNode(state: LatticeState, nodeId: LatticeNodeId): LatticeState {
  const newState = updateActiveScene(state, (scene) => {
    const newNodes = new Map(scene.nodes);
    newNodes.delete(nodeId);
    const newConnections = scene.connections.filter(
      (conn) => conn.from !== nodeId && conn.to !== nodeId,
    );
    return { ...scene, nodes: newNodes, connections: newConnections };
  });

  const newValues = new Map(newState.values);
  newValues.delete(nodeId);
  return { ...newState, values: newValues };
}

export function addConnection(state: LatticeState, connection: LatticeConnection): LatticeState {
  return updateActiveScene(state, (scene) => ({
    ...scene,
    connections: [...scene.connections, connection],
  }));
}

export function removeConnection(state: LatticeState, connectionId: string): LatticeState {
  return updateActiveScene(state, (scene) => ({
    ...scene,
    connections: scene.connections.filter((conn) => conn.id !== connectionId),
  }));
}

export function setNodeValue(
  state: LatticeState,
  nodeId: LatticeNodeId,
  value: unknown,
): LatticeState {
  const newValues = new Map(state.values);
  newValues.set(nodeId, value);
  return {
    ...state,
    values: newValues,
    version: state.version + 1,
  };
}

export function addScene(state: LatticeState, id: string, name: string): LatticeState {
  const newScenes = new Map(state.scenes);
  newScenes.set(id, { id, name, nodes: new Map(), connections: [] });
  return {
    ...state,
    scenes: newScenes,
    version: state.version + 1,
  };
}

export function setActiveScene(state: LatticeState, sceneId: string): LatticeState {
  if (!state.scenes.has(sceneId)) return state;
  return {
    ...state,
    activeSceneId: sceneId,
    version: state.version + 1,
  };
}

export function captureSnapshot(state: LatticeState): SnapshotState {
  return { status: 'captured', state };
}

export function clearSnapshot(): SnapshotState {
  return { status: 'empty' };
}

export function resetState(): LatticeState {
  const mainScene: SceneState = { id: 'main', name: 'Main', nodes: new Map(), connections: [] };
  return {
    scenes: new Map([['main', mainScene]]),
    activeSceneId: 'main',
    values: new Map(),
    status: 'idle',
    version: 0,
  };
}

export function validateState(state: LatticeState): { readonly ok: true; readonly value: LatticeState } | { readonly ok: false; readonly reason: string } {
  for (const scene of state.scenes.values()) {
    for (const connection of scene.connections) {
      if (!scene.nodes.has(connection.from)) {
        return {
          ok: false,
          reason: `Connection '${connection.id}' in scene '${scene.name}' references unknown source node '${connection.from as string}'`,
        };
      }
      if (!scene.nodes.has(connection.to)) {
        return {
          ok: false,
          reason: `Connection '${connection.id}' in scene '${scene.name}' references unknown target node '${connection.to as string}'`,
        };
      }
    }
  }
  return { ok: true, value: state };
}
