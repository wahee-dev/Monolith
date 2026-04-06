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

export interface NodeView {
  readonly id: string;
  readonly rect: Rect;
  readonly kind: LatticeNodeKind;
  readonly label: string;
  readonly fields: ReadonlyArray<FieldView>;
  readonly color: string;
}

export interface EdgeView {
  readonly id: string;
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
