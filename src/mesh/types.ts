import type { LatticeNodeKind } from '@lattice/types';
import type { LawResult } from '@law/types';
import type { LatticeState } from '@lattice/types';

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

export interface PortInfo {
  readonly name: string;
  readonly direction: 'input' | 'output';
}

export interface NodeView {
  readonly id: string;
  readonly rect: Rect;
  readonly kind: LatticeNodeKind;
  readonly label: string;
  readonly fields: ReadonlyArray<FieldView>;
  readonly ports: ReadonlyArray<PortInfo>;
  readonly color: string;
  readonly expression: string;
  readonly typeStatus: TypeStatus;
  readonly typeError: string;
}

export interface ConnectionDragState {
  readonly sourceNodeId: string;
  readonly sourcePort: string;
  readonly sourcePortType: 'input' | 'output';
  readonly currentPoint: Point;
}

export interface EdgeView {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly curve: BezierCurve;
  readonly label: string;
  readonly color: string;
}

export interface MeshView {
  readonly nodes: ReadonlyArray<NodeView>;
  readonly edges: ReadonlyArray<EdgeView>;
  readonly bounds: Rect;
}

export type MeshProjectionFn = (state: LatticeState) => LawResult<MeshView>;
