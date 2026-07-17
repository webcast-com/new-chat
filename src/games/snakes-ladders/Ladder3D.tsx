import { useMemo } from "react";
import type { Point } from "./game/snakes";

type Props = {
  start: Point;
  end: Point;
};

/**
 * Draw a 3D ladder with two wooden rails (cylindrical look with gradient)
 * and evenly spaced rungs, plus a soft shadow.
 */
export default function Ladder3D({ start, end }: Props) {
  const geom = useMemo(() => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const half = 2.0;
    const rungs = Math.max(4, Math.round(len / 6));

    // Rail centerlines (two rails, offset perpendicular from the centerline)
    const railA1 = { x: start.x + px * half, y: start.y + py * half };
    const railA2 = { x: end.x + px * half, y: end.y + py * half };
    const railB1 = { x: start.x - px * half, y: start.y - py * half };
    const railB2 = { x: end.x - px * half, y: end.y - py * half };

    const rungList: { a: Point; b: Point; t: number }[] = [];
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1);
      const cx = start.x + dx * t;
      const cy = start.y + dy * t;
      rungList.push({
        a: { x: cx + px * half * 1.1, y: cy + py * half * 1.1 },
        b: { x: cx - px * half * 1.1, y: cy - py * half * 1.1 },
        t,
      });
    }

    return { railA1, railA2, railB1, railB2, rungs: rungList, ux, uy, px, py };
  }, [start.x, start.y, end.x, end.y]);

  const railColor = "#7c2d12"; // wood
  const railLight = "#b45309";
  const railShadow = "#431407";
  const rungColor = "#92400e";
  const shadow = "rgba(0,0,0,0.28)";

  return (
    <g>
      {/* Drop shadow offset down/right */}
      <g transform="translate(0.5 0.9)" opacity={0.65}>
        <line
          x1={geom.railA1.x}
          y1={geom.railA1.y}
          x2={geom.railA2.x}
          y2={geom.railA2.y}
          stroke={shadow}
          strokeWidth={2.0}
          strokeLinecap="round"
        />
        <line
          x1={geom.railB1.x}
          y1={geom.railB1.y}
          x2={geom.railB2.x}
          y2={geom.railB2.y}
          stroke={shadow}
          strokeWidth={2.0}
          strokeLinecap="round"
        />
        {geom.rungs.map((r, i) => (
          <line
            key={`sr-${i}`}
            x1={r.a.x}
            y1={r.a.y}
            x2={r.b.x}
            y2={r.b.y}
            stroke={shadow}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Rungs (drawn first so rails overlap their ends) */}
      {geom.rungs.map((r, i) => (
        <g key={`rung-${i}`}>
          {/* Rung body — slightly darker under */}
          <line
            x1={r.a.x}
            y1={r.a.y + 0.15}
            x2={r.b.x}
            y2={r.b.y + 0.15}
            stroke={railShadow}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <line
            x1={r.a.x}
            y1={r.a.y - 0.15}
            x2={r.b.x}
            y2={r.b.y - 0.15}
            stroke={rungColor}
            strokeWidth={1.0}
            strokeLinecap="round"
          />
          {/* rung highlight */}
          <line
            x1={r.a.x}
            y1={r.a.y - 0.4}
            x2={r.b.x}
            y2={r.b.y - 0.4}
            stroke={railLight}
            strokeWidth={0.3}
            strokeLinecap="round"
            opacity={0.8}
          />
        </g>
      ))}

      {/* Rails — built from two parallel stroked lines with a highlight line
          between them to simulate a rounded wooden dowel. */}
      <Rail p1={geom.railA1} p2={geom.railA2} dark={railShadow} mid={railColor} light={railLight} />
      <Rail p1={geom.railB1} p2={geom.railB2} dark={railShadow} mid={railColor} light={railLight} />

      {/* Subtle "feet" at bottom (where the ladder rests on the starting square) */}
      <circle cx={geom.railB1.x} cy={geom.railB1.y} r={0.8} fill={railShadow} />
      <circle cx={geom.railA1.x} cy={geom.railA1.y} r={0.8} fill={railShadow} />
      <circle cx={geom.railB2.x} cy={geom.railB2.y} r={0.8} fill={railShadow} />
      <circle cx={geom.railA2.x} cy={geom.railA2.y} r={0.8} fill={railShadow} />
    </g>
  );
}

function Rail({
  p1,
  p2,
  dark,
  mid,
  light,
}: {
  p1: Point;
  p2: Point;
  dark: string;
  mid: string;
  light: string;
}) {
  return (
    <g>
      <line
        x1={p1.x}
        y1={p1.y + 0.5}
        x2={p2.x}
        y2={p2.y + 0.5}
        stroke={dark}
        strokeWidth={2.1}
        strokeLinecap="round"
      />
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={mid}
        strokeWidth={2.0}
        strokeLinecap="round"
      />
      <line
        x1={p1.x}
        y1={p1.y - 0.55}
        x2={p2.x}
        y2={p2.y - 0.55}
        stroke={light}
        strokeWidth={0.6}
        strokeLinecap="round"
        opacity={0.9}
      />
    </g>
  );
}
