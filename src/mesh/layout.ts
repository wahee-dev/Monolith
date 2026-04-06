import type { LatticeNode, LatticeConnection, LatticeNodeId } from '@lattice/types';
import type { Rect } from './types';

const NODE_WIDTH = 200;
const NODE_BASE_HEIGHT = 60;
const FIELD_HEIGHT = 24;
const LAYER_GAP_X = 300;
const LAYER_GAP_Y = 40;
const START_X = 80;
const START_Y = 60;

function computeFieldCount(node: LatticeNode): number {
  const inputKeys = Object.keys(node.schema.input);
  const outputKeys = Object.keys(node.schema.output);
  return inputKeys.length + outputKeys.length;
}

function computeNodeHeight(node: LatticeNode): number {
  const fieldCount = computeFieldCount(node);
  return NODE_BASE_HEIGHT + fieldCount * FIELD_HEIGHT;
}

type LayerIndex = number;

function buildAdjacencyLayers(
  nodes: ReadonlyArray<LatticeNode>,
  connections: ReadonlyArray<LatticeConnection>,
): ReadonlyMap<string, LayerIndex> {
  const nodeIds = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    nodeIds.add(nodes[i]!.id as string);
  }

  const incomingEdges = new Map<string, ReadonlyArray<string>>();
  const outgoingEdges = new Map<string, ReadonlyArray<string>>();

  for (const nodeId of nodeIds) {
    incomingEdges.set(nodeId, []);
    outgoingEdges.set(nodeId, []);
  }

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    const fromId = conn.from as string;
    const toId = conn.to as string;
    if (nodeIds.has(fromId) && nodeIds.has(toId)) {
      const existing = outgoingEdges.get(fromId);
      if (existing !== undefined) {
        outgoingEdges.set(fromId, [...existing, toId]);
      }
      const existingIncoming = incomingEdges.get(toId);
      if (existingIncoming !== undefined) {
        incomingEdges.set(toId, [...existingIncoming, fromId]);
      }
    }
  }

  const inDegree = new Map<string, number>();
  for (const nodeId of nodeIds) {
    const edges = incomingEdges.get(nodeId);
    inDegree.set(nodeId, edges !== undefined ? edges.length : 0);
  }

  let queueStart = 0;
  const currentQueue: string[] = [];

  for (const nodeId of nodeIds) {
    const deg = inDegree.get(nodeId);
    if (deg === 0) {
      currentQueue.push(nodeId);
    }
  }
  currentQueue.sort();

  const layers = new Map<string, LayerIndex>();
  let nodeCount = 0;

  while (queueStart < currentQueue.length) {
    const layerNodes: string[] = [];
    const endIdx = currentQueue.length;

    while (queueStart < endIdx) {
      layerNodes.push(currentQueue[queueStart]!);
      queueStart++;
    }

    layerNodes.sort();
    for (const nodeId of layerNodes) {
      layers.set(nodeId, nodeCount);
    }
    nodeCount++;

    for (const nodeId of layerNodes) {
      const outEdges = outgoingEdges.get(nodeId);
      if (outEdges !== undefined) {
        for (let j = 0; j < outEdges.length; j++) {
          const targetId = outEdges[j]!;
          const currentDeg = inDegree.get(targetId);
          if (currentDeg !== undefined) {
            const newDeg = currentDeg - 1;
            inDegree.set(targetId, newDeg);
            if (newDeg === 0) {
              currentQueue.push(targetId);
            }
          }
        }
      }
    }
  }

  for (const nodeId of nodeIds) {
    if (!layers.has(nodeId)) {
      layers.set(nodeId, nodeCount);
      nodeCount++;
    }
  }

  return layers;
}

export function computeLayout(
  nodes: ReadonlyArray<LatticeNode>,
  connections: ReadonlyArray<LatticeConnection>,
): ReadonlyMap<LatticeNodeId, Rect> {
  const result = new Map<LatticeNodeId, Rect>();

  if (nodes.length === 0) {
    return result;
  }

  const layers = buildAdjacencyLayers(nodes, connections);

  const layerGroups = new Map<LayerIndex, ReadonlyArray<LatticeNode>>();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const layerIdx = layers.get(node.id as string);
    const safeLayer = layerIdx !== undefined ? layerIdx : 0;
    const existing = layerGroups.get(safeLayer);
    if (existing !== undefined) {
      layerGroups.set(safeLayer, [...existing, node]);
    } else {
      layerGroups.set(safeLayer, [node]);
    }
  }

  const sortedLayers = Array.from(layerGroups.entries()).sort(
    (a, b) => a[0] - b[0],
  );

  const maxLayerHeight = new Map<LayerIndex, number>();
  for (const [layerIdx, layerNodes] of sortedLayers) {
    let totalHeight = 0;
    for (let i = 0; i < layerNodes.length; i++) {
      const node = layerNodes[i]!;
      totalHeight += computeNodeHeight(node) + LAYER_GAP_Y;
    }
    maxLayerHeight.set(layerIdx, totalHeight);
  }

  for (const [layerIdx, layerNodes] of sortedLayers) {
    const sortedNodes = [...layerNodes].sort((a, b) =>
      (a.id as string).localeCompare(b.id as string),
    );

    const layerHeight = maxLayerHeight.get(layerIdx) ?? 0;
    const maxH = Math.max(...Array.from(maxLayerHeight.values()));
    const yOffset = Math.max(0, (maxH - layerHeight) / 2);

    let currentY = START_Y + yOffset;

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i]!;
      const height = computeNodeHeight(node);
      result.set(node.id, {
        x: START_X + layerIdx * LAYER_GAP_X,
        y: currentY,
        width: NODE_WIDTH,
        height,
      });
      currentY += height + LAYER_GAP_Y;
    }
  }

  return result;
}

export { NODE_WIDTH, NODE_BASE_HEIGHT, FIELD_HEIGHT };
