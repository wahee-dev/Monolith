import type { LatticeNodeKind } from '@lattice/types';
import type { LawResult } from '@law/types';
import type { LatticeState } from '@lattice/types';
import type { PortType } from '@engine/types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BezierCurve {
  readonly start: Point;
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
}

export interface FieldView {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly value: string;
  readonly position: Point;
}

export type TypeStatus = 'unchecked' | 'valid' | 'invalid';

export interface CanvasState {
  readonly offset: Point;
  readonly zoom: number;
}

export const PORT_TYPE_COLORS: Record<PortType, string> = {
  string: '#4a9eff',
  number: '#22c55e',
  boolean: '#f59e0b',
  object: '#9f4aff',
  array: '#ff9f4a',
  any: '#888888',
  void: 'transparent',
} as const;

export function getPortTypeColor(portType: PortType): string {
  return PORT_TYPE_COLORS[portType] ?? '#888888';
}

export interface PortInfo {
  readonly name: string;
  readonly direction: 'input' | 'output';
}

export interface PortView {
  readonly name: string;
  readonly type: PortType;
  readonly direction: 'input' | 'output';
  readonly position: Point;
  readonly isConnected: boolean;
}

export interface NodeView {
  readonly id: string;
  readonly rect: Rect;
  readonly kind: LatticeNodeKind;
  readonly label: string;
  readonly fields: ReadonlyArray<FieldView>;
  readonly ports: ReadonlyArray<PortView>;
  readonly color: string;
  readonly expression: string;
  readonly typeStatus: TypeStatus;
  readonly typeError: string;
}

export interface ConnectionDragState {
  readonly sourceNodeId: string;
  readonly sourcePort: string;
  readonly sourcePortType: 'input' | 'output';
  readonly sourcePortDataType: PortType;
  readonly currentPoint: Point;
  readonly compatibleTargetPorts: ReadonlySet<string>;
}

export interface EdgeView {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly curve: BezierCurve;
  readonly label: string;
  readonly color: string;
  readonly portType: PortType;
}

export interface MeshView {
  readonly nodes: ReadonlyArray<NodeView>;
  readonly edges: ReadonlyArray<EdgeView>;
  readonly bounds: Rect;
}

export type MeshProjectionFn = (state: LatticeState) => LawResult<MeshView>;
