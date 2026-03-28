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
export function allAnchors(el: BoardElement): { side: Side; x: number; y: number; anchorId?: string }[] {
  const r = elementRect(el);
  const base = (["top", "right", "bottom", "left"] as Side[]).map((side) => ({
    side,
    ...sideAnchor(r, side),
  }));

  // For checklist elements, add per-item connector points on the right side
  if (el.type === "checklist") {
    const itemAnchors = checklistItemAnchors(el);
    return [...base, ...itemAnchors];
  }

  return base;
}

/** Checklist item layout constants matching ChecklistRenderer CSS */
const CHECKLIST_PADDING = 16; // p-4
const CHECKLIST_ITEM_HEIGHT = 28; // min-h-[28px]
const CHECKLIST_ITEM_GAP = 4; // gap-1
const CHECKLIST_INSET = 12; // how far inside the right edge

/** Get per-item connector anchor points for a checklist element */
export function checklistItemAnchors(el: BoardElement): { side: Side; x: number; y: number; anchorId: string }[] {
  let items: { id: string }[] = [];
  try {
    const parsed = JSON.parse(el.content);
    if (Array.isArray(parsed)) items = parsed;
  } catch { /* */ }

  if (items.length === 0) return [];

  const r = elementRect(el);
  const anchors: { side: Side; x: number; y: number; anchorId: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemY = CHECKLIST_PADDING + i * (CHECKLIST_ITEM_HEIGHT + CHECKLIST_ITEM_GAP) + CHECKLIST_ITEM_HEIGHT / 2;
    anchors.push({
      side: "right" as Side,
      x: r.x + r.w - CHECKLIST_INSET,
      y: r.y + itemY,
      anchorId: items[i].id,
    });
  }

  return anchors;
}

/** Resolve an anchor point for an element, supporting checklist item anchors.
 *  If anchorId is provided and the element is a checklist, returns the item-specific anchor.
 *  Otherwise falls back to the standard side anchor. */
export function resolveAnchor(el: BoardElement, side: Side, anchorId?: string | null): { x: number; y: number } {
  if (anchorId && el.type === "checklist") {
    const itemAnchors = checklistItemAnchors(el);
    const found = itemAnchors.find((a) => a.anchorId === anchorId);
    if (found) return { x: found.x, y: found.y };
  }
  return sideAnchor(elementRect(el), side);
}

/** Inflate a rect by a margin on all sides */
function inflateRect(r: Rect, margin: number): Rect {
  return { x: r.x - margin, y: r.y - margin, w: r.w + margin * 2, h: r.h + margin * 2 };
}

/** Check if a point is inside a rect */
function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Check if an axis-aligned segment intersects a rect */
function segmentIntersectsRect(
  ax: number, ay: number, bx: number, by: number, r: Rect,
): boolean {
  // Horizontal segment
  if (Math.abs(ay - by) < 0.5) {
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    const y = ay;
    if (y < r.y || y > r.y + r.h) return false;
    return maxX > r.x && minX < r.x + r.w;
  }
  // Vertical segment
  if (Math.abs(ax - bx) < 0.5) {
    const minY = Math.min(ay, by);
    const maxY = Math.max(ay, by);
    const x = ax;
    if (x < r.x || x > r.x + r.w) return false;
    return maxY > r.y && minY < r.y + r.h;
  }
  return false;
}

/** Build an SVG path for a connector between two anchor points */
export function connectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  mode: ConnectorMode,
  obstacles?: Rect[],
): string {
  if (mode === "straight") {
    return `M${from.x},${from.y} L${to.x},${to.y}`;
  }

  if (mode === "curve") {
    return curvePath(from, to, fromSide, toSide, obstacles);
  }

  // Orthogonal (Manhattan / elbow) routing
  return orthogonalPath(from, to, fromSide, toSide, obstacles);
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

/** Curve connector that routes around obstacles using waypoint-based routing + smooth bezier */
function curvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  obstacles?: Rect[],
): string {
  // If no obstacles, use a simple cubic bezier
  if (!obstacles || obstacles.length === 0) {
    const dist = Math.max(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.4);
    const c1 = controlOffset(from, fromSide, dist);
    const c2 = controlOffset(to, toSide, dist);
    return `M${from.x},${from.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
  }

  // Use the same channel-based routing as orthogonal to find waypoints
  const MARGIN = 16;
  const MIN_STUB = 24;
  const inflated = obstacles.map((o) => inflateRect(o, MARGIN));

  const f = controlOffset(from, fromSide, MIN_STUB);
  const t = controlOffset(to, toSide, MIN_STUB);
  const isFromVertical = fromSide === "top" || fromSide === "bottom";
  const isToVertical = toSide === "top" || toSide === "bottom";

  // Check if simple bezier is unblocked
  const simpleDist = Math.max(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.4);
  const sc1 = controlOffset(from, fromSide, simpleDist);
  const sc2 = controlOffset(to, toSide, simpleDist);
  if (!bezierIntersectsAny(from, sc1, sc2, to, inflated)) {
    return `M${from.x},${from.y} C${sc1.x},${sc1.y} ${sc2.x},${sc2.y} ${to.x},${to.y}`;
  }

  // Find orthogonal waypoints that avoid obstacles
  const simplePath = buildSimpleOrthogonalWaypoints(from, f, t, to, isFromVertical, isToVertical);

  let bestWaypoints = simplePath;
  let bestScore = Infinity;

  if (!pathIntersectsAny(simplePath, inflated, true)) {
    bestWaypoints = simplePath;
    bestScore = pathLength(simplePath) + simplePath.length * 5;
  }

  // Collect routing channels from obstacle edges
  const xChannels = new Set<number>();
  const yChannels = new Set<number>();
  xChannels.add(f.x);
  xChannels.add(t.x);
  yChannels.add(f.y);
  yChannels.add(t.y);

  for (const obs of inflated) {
    xChannels.add(obs.x - 1);
    xChannels.add(obs.x + obs.w + 1);
    yChannels.add(obs.y - 1);
    yChannels.add(obs.y + obs.h + 1);
  }

  const xArr = [...xChannels].sort((a, b) => a - b);
  const yArr = [...yChannels].sort((a, b) => a - b);

  for (const mx of xArr) {
    for (const my of yArr) {
      const candidates = generateCandidateRoutes(from, f, t, to, isFromVertical, isToVertical, mx, my);
      for (const candidate of candidates) {
        if (!pathIntersectsAny(candidate, inflated, true)) {
          const score = pathLength(candidate) + candidate.length * 5;
          if (score < bestScore) {
            bestScore = score;
            bestWaypoints = candidate;
          }
        }
      }
    }
  }

  if (bestScore === Infinity) {
    for (const mx of xArr) {
      for (const my of yArr) {
        const twoChannelPaths = generateTwoChannelRoutes(from, f, t, to, isFromVertical, isToVertical, mx, my);
        for (const candidate of twoChannelPaths) {
          if (!pathIntersectsAny(candidate, inflated, true)) {
            const score = pathLength(candidate) + candidate.length * 5;
            if (score < bestScore) {
              bestScore = score;
              bestWaypoints = candidate;
            }
          }
        }
      }
    }
  }

  // Simplify waypoints and convert to smooth curve
  const waypoints = simplifyPath(bestWaypoints);
  return waypointsToSmoothCurve(waypoints, fromSide, toSide);
}

/** Check if a cubic bezier intersects any obstacle */
function bezierIntersectsAny(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  obstacles: Rect[],
): boolean {
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const px = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const py = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
    for (const obs of obstacles) {
      if (pointInRect(px, py, obs)) return true;
    }
  }
  return false;
}

/** Convert orthogonal waypoints to a smooth cubic bezier SVG path */
function waypointsToSmoothCurve(
  pts: { x: number; y: number }[],
  fromSide: Side,
  toSide: Side,
): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    const dist = Math.max(40, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) * 0.4);
    const c1 = controlOffset(pts[0], fromSide, dist);
    const c2 = controlOffset(pts[1], toSide, dist);
    return `M${pts[0].x},${pts[0].y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${pts[1].x},${pts[1].y}`;
  }

  // For 3+ waypoints, use Catmull-Rom style conversion to cubic beziers
  // with directional stubs at start and end
  let d = `M${pts[0].x},${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const tension = Math.min(segLen * 0.4, 60);

    let c1x: number, c1y: number, c2x: number, c2y: number;

    if (i === 0) {
      // First segment: use fromSide direction for first control point
      const c1off = controlOffset(p0, fromSide, tension);
      c1x = c1off.x;
      c1y = c1off.y;
    } else {
      // Use direction from previous point to next point
      const prev = pts[i - 1];
      const dx = p1.x - prev.x;
      const dy = p1.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      c1x = p0.x + (dx / len) * tension;
      c1y = p0.y + (dy / len) * tension;
    }

    if (i === pts.length - 2) {
      // Last segment: use toSide direction for second control point
      const c2off = controlOffset(p1, toSide, tension);
      c2x = c2off.x;
      c2y = c2off.y;
    } else {
      // Use direction from current point to the point after next
      const next2 = pts[i + 2];
      const dx = p0.x - next2.x;
      const dy = p0.y - next2.y;
      const len = Math.hypot(dx, dy) || 1;
      c2x = p1.x + (dx / len) * tension;
      c2y = p1.y + (dy / len) * tension;
    }

    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p1.x},${p1.y}`;
  }

  return d;
}

/** Check if any segment in a point array intersects any obstacle.
 *  When skipStubs is true, the first segment (from→stub) and last segment (stub→to) are
 *  excluded from intersection checks — these are fixed-direction stubs exiting anchor points
 *  and will naturally overlap their source/target elements. */
function pathIntersectsAny(
  points: { x: number; y: number }[],
  obstacles: Rect[],
  skipStubs = false,
): boolean {
  const start = skipStubs ? 1 : 0;
  const end = skipStubs ? points.length - 2 : points.length - 1;
  for (let i = start; i < end; i++) {
    for (const obs of obstacles) {
      if (segmentIntersectsRect(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, obs)) {
        return true;
      }
    }
  }
  return false;
}

function orthogonalPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  obstacles?: Rect[],
): string {
  const MARGIN = 16; // Clearance around obstacles
  const MIN_STUB = 24;

  const inflated = obstacles ? obstacles.map((o) => inflateRect(o, MARGIN)) : [];

  // Extend stubs outward from each anchor
  const f = controlOffset(from, fromSide, MIN_STUB);
  const t = controlOffset(to, toSide, MIN_STUB);

  const isFromVertical = fromSide === "top" || fromSide === "bottom";
  const isToVertical = toSide === "top" || toSide === "bottom";

  // Try the simple path first (no obstacle avoidance)
  const simplePath = buildSimpleOrthogonalWaypoints(from, f, t, to, isFromVertical, isToVertical);

  if (inflated.length === 0 || !pathIntersectsAny(simplePath, inflated, true)) {
    return buildRoundedPath(simplePath, 8);
  }

  // Generate candidate routes that go around obstacles
  // Collect all obstacle edges as potential routing channels
  const xChannels = new Set<number>();
  const yChannels = new Set<number>();
  xChannels.add(f.x);
  xChannels.add(t.x);
  yChannels.add(f.y);
  yChannels.add(t.y);

  for (const obs of inflated) {
    xChannels.add(obs.x - 1);       // left edge
    xChannels.add(obs.x + obs.w + 1); // right edge
    yChannels.add(obs.y - 1);       // top edge
    yChannels.add(obs.y + obs.h + 1); // bottom edge
  }

  const xArr = [...xChannels].sort((a, b) => a - b);
  const yArr = [...yChannels].sort((a, b) => a - b);

  // Try routing through each combination of x/y channels
  let bestPath = simplePath;
  let bestScore = Infinity;

  // Strategy 1: Route via a single midpoint channel (most common case)
  for (const mx of xArr) {
    for (const my of yArr) {
      const candidates = generateCandidateRoutes(from, f, t, to, isFromVertical, isToVertical, mx, my);
      for (const candidate of candidates) {
        if (!pathIntersectsAny(candidate, inflated, true)) {
          const score = pathLength(candidate) + candidate.length * 5; // Prefer fewer turns
          if (score < bestScore) {
            bestScore = score;
            bestPath = candidate;
          }
        }
      }
    }
  }

  // If still blocked, try two-channel routing
  if (bestScore === Infinity) {
    for (const mx of xArr) {
      for (const my of yArr) {
        // Route: from → f → (f.x or mx, my) → (mx, my) → (t.x or mx, t.y or my) → t → to
        const twoChannelPaths = generateTwoChannelRoutes(from, f, t, to, isFromVertical, isToVertical, mx, my);
        for (const candidate of twoChannelPaths) {
          if (!pathIntersectsAny(candidate, inflated, true)) {
            const score = pathLength(candidate) + candidate.length * 5;
            if (score < bestScore) {
              bestScore = score;
              bestPath = candidate;
            }
          }
        }
      }
    }
  }

  // Simplify the path by removing redundant collinear waypoints
  bestPath = simplifyPath(bestPath);

  return buildRoundedPath(bestPath, 8);
}

/** Build simple orthogonal waypoints (no obstacle avoidance) */
function buildSimpleOrthogonalWaypoints(
  from: { x: number; y: number },
  f: { x: number; y: number },
  t: { x: number; y: number },
  to: { x: number; y: number },
  isFromVertical: boolean,
  isToVertical: boolean,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [from, f];

  if (isFromVertical && isToVertical) {
    const midY = (f.y + t.y) / 2;
    points.push({ x: f.x, y: midY }, { x: t.x, y: midY });
  } else if (!isFromVertical && !isToVertical) {
    const midX = (f.x + t.x) / 2;
    points.push({ x: midX, y: f.y }, { x: midX, y: t.y });
  } else {
    if (isFromVertical) {
      points.push({ x: f.x, y: t.y });
    } else {
      points.push({ x: t.x, y: f.y });
    }
  }

  points.push(t, to);
  return points;
}

/** Generate candidate routes via a channel point (mx, my) */
function generateCandidateRoutes(
  from: { x: number; y: number },
  f: { x: number; y: number },
  t: { x: number; y: number },
  to: { x: number; y: number },
  isFromVertical: boolean,
  isToVertical: boolean,
  mx: number,
  my: number,
): { x: number; y: number }[][] {
  const routes: { x: number; y: number }[][] = [];

  if (isFromVertical && isToVertical) {
    // f exits vertically, route through my then mx
    routes.push([from, f, { x: f.x, y: my }, { x: t.x, y: my }, t, to]);
    routes.push([from, f, { x: f.x, y: my }, { x: mx, y: my }, { x: mx, y: t.y }, t, to]);
  } else if (!isFromVertical && !isToVertical) {
    // f exits horizontally, route through mx then my
    routes.push([from, f, { x: mx, y: f.y }, { x: mx, y: t.y }, t, to]);
    routes.push([from, f, { x: mx, y: f.y }, { x: mx, y: my }, { x: t.x, y: my }, t, to]);
  } else if (isFromVertical) {
    // f vertical, t horizontal
    routes.push([from, f, { x: f.x, y: my }, { x: mx, y: my }, { x: mx, y: t.y }, t, to]);
    routes.push([from, f, { x: f.x, y: t.y }, t, to]);
  } else {
    // f horizontal, t vertical
    routes.push([from, f, { x: mx, y: f.y }, { x: mx, y: my }, { x: t.x, y: my }, t, to]);
    routes.push([from, f, { x: t.x, y: f.y }, t, to]);
  }

  return routes;
}

/** Generate two-channel routing candidates */
function generateTwoChannelRoutes(
  from: { x: number; y: number },
  f: { x: number; y: number },
  t: { x: number; y: number },
  to: { x: number; y: number },
  isFromVertical: boolean,
  isToVertical: boolean,
  mx: number,
  my: number,
): { x: number; y: number }[][] {
  const routes: { x: number; y: number }[][] = [];

  // Various L-shaped and Z-shaped routes through the channel
  routes.push([from, f, { x: f.x, y: my }, { x: mx, y: my }, { x: mx, y: t.y }, t, to]);
  routes.push([from, f, { x: mx, y: f.y }, { x: mx, y: my }, { x: t.x, y: my }, t, to]);

  return routes;
}

/** Calculate total path length */
function pathLength(points: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return len;
}

/** Remove collinear intermediate points */
function simplifyPath(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  const result: { x: number; y: number }[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    // Skip if collinear (all on same X or same Y)
    const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (!sameX && !sameY) {
      result.push(curr);
    } else if (sameX || sameY) {
      // Collinear — skip this point
    } else {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
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
