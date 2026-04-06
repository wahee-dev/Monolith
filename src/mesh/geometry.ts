import type { Point, Rect, BezierCurve, NodeView } from './types';

const ORIGIN: Point = { x: 0, y: 0 };

export function createPoint(x: number, y: number): Point {
  return { x, y };
}

export function createRect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

export function rectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function rectRightCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width,
    y: rect.y + rect.height / 2,
  };
}

export function rectLeftCenter(rect: Rect): Point {
  return {
    x: rect.x,
    y: rect.y + rect.height / 2,
  };
}

export function rectBottomCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height,
  };
}

export function rectTopCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y,
  };
}

export function computeBezierPath(from: Rect, to: Rect): BezierCurve {
  const start = rectRightCenter(from);
  const end = rectLeftCenter(to);
  const dx = Math.abs(end.x - start.x);
  const offset = Math.max(dx * 0.5, 50);

  return {
    start,
    control1: { x: start.x + offset, y: start.y },
    control2: { x: end.x - offset, y: end.y },
    end,
  };
}

export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function computeBounds(views: ReadonlyArray<NodeView>): Rect {
  if (views.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < views.length; i++) {
    const view = views[i]!;
    const r = view.rect;
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    const right = r.x + r.width;
    const bottom = r.y + r.height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  const padding = 40;

  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(maxX - minX + padding * 2, 200),
    height: Math.max(maxY - minY + padding * 2, 200),
  };
}

export { ORIGIN };
