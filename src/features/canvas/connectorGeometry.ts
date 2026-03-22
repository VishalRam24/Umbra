import type { BoardElement } from "@/types/elements";
import type { ConnectorMode } from "@/types/elements";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = "top" | "right" | "bottom" | "left";

export function elementRect(el: BoardElement): Rect {
  return {
    x: el.position.x,
    y: el.position.y,
    w: el.width,
    h: el.height,
  };
}

/** Get the anchor point on a specific side of an element */
export function sideAnchor(r: Rect, side: Side): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: r.x + r.w / 2, y: r.y };
    case "bottom":
      return { x: r.x + r.w / 2, y: r.y + r.h };
    case "left":
      return { x: r.x, y: r.y + r.h / 2 };
    case "right":
      return { x: r.x + r.w, y: r.y + r.h / 2 };
  }
}

/** Get all four anchor points for an element */
export function allAnchors(el: BoardElement): { side: Side; x: number; y: number }[] {
  const r = elementRect(el);
  return (["top", "right", "bottom", "left"] as Side[]).map((side) => ({
    side,
    ...sideAnchor(r, side),
  }));
}

/** Build an SVG path for a connector between two anchor points */
export function connectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  mode: ConnectorMode,
): string {
  if (mode === "straight") {
    return `M${from.x},${from.y} L${to.x},${to.y}`;
  }

  if (mode === "curve") {
    // S-curve using cubic bezier — control points extend from the anchor direction
    const dist = Math.max(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.4);
    const c1 = controlOffset(from, fromSide, dist);
    const c2 = controlOffset(to, toSide, dist);
    return `M${from.x},${from.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
  }

  // Orthogonal (Manhattan / elbow) routing
  return orthogonalPath(from, to, fromSide, toSide);
}

function controlOffset(
  pt: { x: number; y: number },
  side: Side,
  dist: number,
): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: pt.x, y: pt.y - dist };
    case "bottom":
      return { x: pt.x, y: pt.y + dist };
    case "left":
      return { x: pt.x - dist, y: pt.y };
    case "right":
      return { x: pt.x + dist, y: pt.y };
  }
}

function orthogonalPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
): string {
  const MIN_STUB = 20;

  // Extend stubs outward from each anchor
  const f = controlOffset(from, fromSide, MIN_STUB);
  const t = controlOffset(to, toSide, MIN_STUB);

  const isFromVertical = fromSide === "top" || fromSide === "bottom";
  const isToVertical = toSide === "top" || toSide === "bottom";

  // Build waypoints for the orthogonal route
  const points: { x: number; y: number }[] = [from, f];

  if (isFromVertical && isToVertical) {
    // Both vertical — connect with a horizontal mid-segment
    const midY = (f.y + t.y) / 2;
    points.push({ x: f.x, y: midY }, { x: t.x, y: midY });
  } else if (!isFromVertical && !isToVertical) {
    // Both horizontal — connect with a vertical mid-segment
    const midX = (f.x + t.x) / 2;
    points.push({ x: midX, y: f.y }, { x: midX, y: t.y });
  } else {
    // One vertical, one horizontal — single corner
    if (isFromVertical) {
      points.push({ x: f.x, y: t.y });
    } else {
      points.push({ x: t.x, y: f.y });
    }
  }

  points.push(t, to);

  // Build path with rounded corners
  return buildRoundedPath(points, 8);
}

function buildRoundedPath(points: { x: number; y: number }[], radius: number): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const toPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const toNext = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, toPrev / 2, toNext / 2);

    if (r < 1) {
      d += ` L${curr.x},${curr.y}`;
      continue;
    }

    // Point before corner
    const ratioIn = r / toPrev;
    const bx = curr.x + (prev.x - curr.x) * ratioIn;
    const by = curr.y + (prev.y - curr.y) * ratioIn;

    // Point after corner
    const ratioOut = r / toNext;
    const ax = curr.x + (next.x - curr.x) * ratioOut;
    const ay = curr.y + (next.y - curr.y) * ratioOut;

    d += ` L${bx},${by} Q${curr.x},${curr.y} ${ax},${ay}`;
  }

  d += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

/** Legacy: simple straight line between element centers */
export function connectorLine(
  from: BoardElement,
  to: BoardElement,
): { x1: number; y1: number; x2: number; y2: number } {
  const a = { x: from.position.x + from.width / 2, y: from.position.y + from.height / 2 };
  const b = { x: to.position.x + to.width / 2, y: to.position.y + to.height / 2 };
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
