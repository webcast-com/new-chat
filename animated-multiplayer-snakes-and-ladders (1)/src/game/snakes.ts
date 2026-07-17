// Build a smooth wavy path between two points for a snake body, plus a
// perpendicular offset direction used to draw the belly / dorsal highlights
// and to orient the head. Returns an array of {x,y} points at regular
// intervals along the curve, plus a smoothed SVG path `d`.

export type Point = { x: number; y: number };

/** Catmull-Rom to Bezier smoothing over an array of points. */
function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Generate a meandering set of points between two board positions,
 * used to build the snake's body. The points move roughly from (x1,y1) to
 * (x2,y2) with lateral wobble.
 */
export function buildSnakePoints(
  a: Point,
  b: Point,
  segments = 14,
  amplitude = 3.2,
): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular unit vector
  const px = -uy;
  const py = ux;

  const points: Point[] = [];
  // a little start bias so the head sits nicely in its square
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    // double sine wave for a natural slither
    const wobble = Math.sin(t * Math.PI * 2.6 + (a.x + a.y) * 0.1) * amplitude;
    // taper wobble at head and tail slightly
    const taper = Math.sin(t * Math.PI);
    points.push({
      x: cx + px * wobble * taper,
      y: cy + py * wobble * taper,
    });
  }
  // Ensure exact endpoints
  points[0] = { x: a.x, y: a.y };
  points[points.length - 1] = { x: b.x, y: b.y };
  return points;
}

/**
 * Sample points along a polyline at roughly equal arc-length using
 * linear interpolation between the input points.
 */
export function sampleAlong(points: Point[], count: number): Point[] {
  if (points.length < 2) return points.slice();
  // Compute cumulative distance
  const dists: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    dists.push(dists[i - 1] + d);
  }
  const total = dists[dists.length - 1];
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const td = (i / (count - 1)) * total;
    // find segment
    let seg = 0;
    while (seg < dists.length - 2 && dists[seg + 1] < td) seg++;
    const segLen = dists[seg + 1] - dists[seg] || 1;
    const localT = (td - dists[seg]) / segLen;
    out.push({
      x: points[seg].x + (points[seg + 1].x - points[seg].x) * localT,
      y: points[seg].y + (points[seg + 1].y - points[seg].y) * localT,
    });
  }
  return out;
}

/** For each point, return a perpendicular direction (normalized). */
export function perpendiculars(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[i - 1] ?? points[i];
    const next = points[i + 1] ?? points[i];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    out.push({ x: -ty / len, y: tx / len });
  }
  return out;
}

export function snakePath(points: Point[]): string {
  return smoothPath(points);
}
