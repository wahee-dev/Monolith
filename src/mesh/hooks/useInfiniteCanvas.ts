'use client';

import { useCallback, useRef, useState } from 'react';
import type { CanvasState, Point } from '../types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_SENSITIVITY = 0.001;

interface UseInfiniteCanvasResult {
  readonly canvasState: CanvasState;
  readonly svgProps: {
    readonly viewBox: string;
    readonly onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
    readonly onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
    readonly onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;
    readonly onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
    readonly style: React.CSSProperties;
    readonly ref: React.RefCallback<SVGSVGElement>;
  };
  readonly screenToWorld: (screenX: number, screenY: number) => Point;
  readonly panTo: (offset: Point) => void;
  readonly zoomTo: (zoom: number, center?: Point) => void;
  readonly isPanning: boolean;
}

interface SvgDimensions {
  readonly width: number;
  readonly height: number;
}

export function useInfiniteCanvas(
  svgWidth: number,
  svgHeight: number,
): UseInfiniteCanvasResult {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    offset: { x: 0, y: 0 },
    zoom: 1.0,
  });
  const [isPanning, setIsPanning] = useState(false);

  const panningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const offsetStartRef = useRef<Point>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgDimsRef = useRef<SvgDimensions>({ width: svgWidth, height: svgHeight });

  const refCallback = useCallback((node: SVGSVGElement | null): void => {
    svgRef.current = node;
    if (node !== null) {
      const rect = node.getBoundingClientRect();
      svgDimsRef.current = { width: rect.width, height: rect.height };
    }
  }, []);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const dims = svgDimsRef.current;
      const worldX = (screenX / canvasState.zoom) + canvasState.offset.x - (dims.width / 2 / canvasState.zoom);
      const worldY = (screenY / canvasState.zoom) + canvasState.offset.y - (dims.height / 2 / canvasState.zoom);
      return { x: worldX, y: worldY };
    },
    [canvasState],
  );

  const panTo = useCallback((offset: Point): void => {
    setCanvasState((prev) => ({ ...prev, offset }));
  }, []);

  const zoomTo = useCallback((zoom: number, center?: Point): void => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    if (center !== undefined) {
      setCanvasState((prev) => {
        const zoomRatio = clamped / prev.zoom;
        const newOffset = {
          x: center.x - (center.x - prev.offset.x) * zoomRatio,
          y: center.y - (center.y - prev.offset.y) * zoomRatio,
        };
        return { offset: newOffset, zoom: clamped };
      });
    } else {
      setCanvasState((prev) => ({ ...prev, zoom: clamped }));
    }
  }, []);

  const viewBox = useCallback((): string => {
    const dims = svgDimsRef.current;
    const z = canvasState.zoom;
    const vw = dims.width / z;
    const vh = dims.height / z;
    const vx = canvasState.offset.x - vw / 2;
    const vy = canvasState.offset.y - vh / 2;
    return `${vx} ${vy} ${vw} ${vh}`;
  }, [canvasState]);

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>): void => {
    const isMiddle = e.button === 1;
    const isShiftLeft = e.button === 0 && e.shiftKey;
    if (isMiddle || isShiftLeft) {
      e.preventDefault();
      panningRef.current = true;
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      offsetStartRef.current = { ...canvasState.offset };
    }
  }, [canvasState.offset]);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>): void => {
    if (!panningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const z = canvasState.zoom;
    setCanvasState((prev) => ({
      ...prev,
      offset: {
        x: offsetStartRef.current.x - dx / z,
        y: offsetStartRef.current.y - dy / z,
      },
    }));
  }, [canvasState.zoom]);

  const onMouseUp = useCallback((): void => {
    panningRef.current = false;
    setIsPanning(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>): void => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dims = svgDimsRef.current;

    const worldBeforeX = (mouseX / canvasState.zoom) + canvasState.offset.x - (dims.width / 2 / canvasState.zoom);
    const worldBeforeY = (mouseY / canvasState.zoom) + canvasState.offset.y - (dims.height / 2 / canvasState.zoom);

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, canvasState.zoom * (1 + delta)));

    const worldAfterX = (mouseX / newZoom) + canvasState.offset.x - (dims.width / 2 / newZoom);
    const worldAfterY = (mouseY / newZoom) + canvasState.offset.y - (dims.height / 2 / newZoom);

    setCanvasState((prev) => ({
      offset: {
        x: prev.offset.x + (worldBeforeX - worldAfterX),
        y: prev.offset.y + (worldBeforeY - worldAfterY),
      },
      zoom: newZoom,
    }));
  }, [canvasState.zoom, canvasState.offset]);

  const svgProps = {
    viewBox: viewBox(),
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    style: {
      width: '100%',
      height: '100%',
      cursor: isPanning ? 'grabbing' : 'default',
      userSelect: 'none' as const,
    },
    ref: refCallback,
  };

  return {
    canvasState,
    svgProps,
    screenToWorld,
    panTo,
    zoomTo,
    isPanning,
  };
}
