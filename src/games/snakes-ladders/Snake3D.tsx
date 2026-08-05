import { useMemo } from "react";
import {
  buildSnakePoints,
  perpendiculars,
  sampleAlong,
  snakePath,
  type Point,
} from "./game/snakes";

type Props = {
  start: Point;
  end: Point;
  seed?: number;
};

/**
 * Draw a 3D-looking snake as a series of overlapping shaded circles
 * (scales/body segments) following a wavy path, plus a detailed head
 * with eyes, fangs and tongue, and a tapering tail.
 */
export default function Snake3D({ start, end, seed = 0 }: Props) {
  const geometry = useMemo(() => {
    const amp = 3.4 + ((seed * 13) % 9) * 0.08;
    const raw = buildSnakePoints(start, end, 22, amp);
    // sample enough points that we can draw a dense string of "scales"
    const sampled = sampleAlong(raw, 38);
    const perps = perpendiculars(sampled);
    return { raw, sampled, perps, d: snakePath(raw) };
  }, [start.x, start.y, end.x, end.y, seed]);

  const { sampled, perps } = geometry;
  const headCount = 4;
  const tailCount = 6;

  // Snake palette
  const scaleColor = "#16a34a"; // green-600
  const scaleDark = "#14532d"; // green-900
  const scaleLight = "#86efac"; // green-300
  const belly = "#fef3c7"; // amber-100
  const bellyShadow = "#b45309";

  return (
    <g>
      {/* Drop shadow on the board — a soft offset dark copy of the body */}
      {sampled.map((p, i) => {
        const baseR = 3.0;
        const headTaper = i < headCount ? 0.6 + 0.4 * (i / headCount) : 1;
        const tailTaper =
          i > sampled.length - tailCount
            ? 0.3 + 0.7 * ((sampled.length - i) / tailCount)
            : 1;
        const r = baseR * headTaper * tailTaper;
        return (
          <circle
            key={`shadow-${i}`}
            cx={p.x + 0.45}
            cy={p.y + 0.7}
            r={r}
            fill="rgba(0,0,0,0.35)"
          />
        );
      })}

      {/* Belly (underside) — offset slightly "down-right" to fake lighting */}
      {sampled.map((p, i) => {
        const n = perps[i];
        const headTaper = i < headCount ? 0.6 + 0.4 * (i / headCount) : 1;
        const tailTaper =
          i > sampled.length - tailCount
            ? 0.3 + 0.7 * ((sampled.length - i) / tailCount)
            : 1;
        const r = 2.3 * headTaper * tailTaper;
        // belly sits slightly below the centerline of the body
        const bx = p.x + n.x * 0.3 + 0.2;
        const by = p.y + n.y * 0.3 + 0.35;
        return (
          <circle
            key={`belly-${i}`}
            cx={bx}
            cy={by}
            r={r}
            fill={belly}
            stroke={bellyShadow}
            strokeWidth={0.15}
            strokeOpacity={0.5}
          />
        );
      })}

      {/* Body segments — drawn tail-to-head so head segments overlap */}
      {[...sampled]
        .map((p, i) => ({ p, i }))
        .reverse()
        .map(({ p, i }) => {
          const headTaper =
            i < headCount ? 0.6 + 0.4 * (i / headCount) : 1;
          const tailTaper =
            i > sampled.length - tailCount
              ? 0.3 + 0.7 * ((sampled.length - i) / tailCount)
              : 1;
          const r = 3.0 * headTaper * tailTaper;

          // radial gradient per segment would be heavy; instead we draw a
          // highlight circle + dark crescent stroke for a 3D look.
          return (
            <g key={`body-${i}`}>
              {/* dark "scale" outline crescent */}
              <circle cx={p.x} cy={p.y} r={r} fill={scaleDark} />
              {/* main colored body */}
              <circle
                cx={p.x - 0.25}
                cy={p.y - 0.3}
                r={r * 0.92}
                fill={scaleColor}
              />
              {/* diamond scale pattern */}
              {i % 2 === 0 && i > headCount && i < sampled.length - tailCount && (
                <path
                  d={`M ${p.x} ${p.y - r * 0.55} L ${p.x + r * 0.4} ${p.y} L ${p.x} ${p.y + r * 0.55} L ${p.x - r * 0.4} ${p.y} Z`}
                  fill={scaleDark}
                  opacity={0.55}
                />
              )}
              {/* highlight (upper-left light source) */}
              <ellipse
                cx={p.x - r * 0.32}
                cy={p.y - r * 0.4}
                rx={r * 0.45}
                ry={r * 0.28}
                fill={scaleLight}
                opacity={0.85}
              />
            </g>
          );
        })}

      {/* Head — bigger, oriented along the direction of travel */}
      <Head
        p={sampled[0]}
        prev={sampled[1] ?? start}
        color={scaleColor}
        dark={scaleDark}
        light={scaleLight}
        belly={belly}
      />

      {/* Rattle/tail tip — a little tapered triangle */}
      <TailTip
        p={sampled[sampled.length - 1]}
        prev={sampled[sampled.length - 2] ?? end}
        color={scaleDark}
      />
    </g>
  );
}

function Head({
  p,
  prev,
  color,
  dark,
  light,
  belly,
}: {
  p: Point;
  prev: Point;
  color: string;
  dark: string;
  light: string;
  belly: string;
}) {
  // direction the head is facing (from prev → p; but head is the first point
  // so actually we want to point FROM head along the first segment)
  const dx = p.x - prev.x;
  const dy = p.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;

  // Head is ~ 2.4x the body width. Build it as a rotated diamond/ellipse.
  const w = 6.2;
  const h = 4.4;

  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${angleDeg})`}>
      {/* shadow under head */}
      <ellipse
        cx={0.4}
        cy={0.9}
        rx={w * 0.55}
        ry={h * 0.55}
        fill="rgba(0,0,0,0.4)"
      />
      {/* jaw / belly underside */}
      <ellipse cx={0} cy={0.6} rx={w * 0.5} ry={h * 0.45} fill={belly} />
      {/* main head (dark) */}
      <ellipse cx={0} cy={0} rx={w * 0.55} ry={h * 0.55} fill={dark} />
      {/* top head (colored) */}
      <ellipse cx={-0.3} cy={-0.4} rx={w * 0.5} ry={h * 0.48} fill={color} />
      {/* highlight on top */}
      <ellipse
        cx={-0.9}
        cy={-1.2}
        rx={w * 0.28}
        ry={h * 0.18}
        fill={light}
        opacity={0.85}
      />
      {/* nostrils */}
      <circle cx={w * 0.42} cy={-0.3} r={0.25} fill={dark} />
      <circle cx={w * 0.42} cy={0.3} r={0.25} fill={dark} />
      {/* eyes (on top of head, left/right perpendicular) */}
      <g>
        <ellipse
          cx={-0.2}
          cy={-h * 0.42}
          rx={0.8}
          ry={0.55}
          fill="#fef9c3"
          stroke={dark}
          strokeWidth={0.15}
        />
        <ellipse cx={0.0} cy={-h * 0.42} rx={0.35} ry={0.5} fill="#0f172a" />
        <ellipse cx={-0.1} cy={-h * 0.55} rx={0.2} ry={0.12} fill="#fff" />

        <ellipse
          cx={-0.2}
          cy={h * 0.42}
          rx={0.8}
          ry={0.55}
          fill="#fef9c3"
          stroke={dark}
          strokeWidth={0.15}
        />
        <ellipse cx={0.0} cy={h * 0.42} rx={0.35} ry={0.5} fill="#0f172a" />
        <ellipse cx={-0.1} cy={h * 0.29} rx={0.2} ry={0.12} fill="#fff" />
      </g>
      {/* fangs */}
      <path
        d={`M ${w * 0.5} ${-0.8} L ${w * 0.65} ${-0.1} L ${w * 0.45} ${-0.2} Z`}
        fill="#f8fafc"
        stroke={dark}
        strokeWidth={0.1}
      />
      <path
        d={`M ${w * 0.5} ${0.8} L ${w * 0.65} ${0.1} L ${w * 0.45} ${0.2} Z`}
        fill="#f8fafc"
        stroke={dark}
        strokeWidth={0.1}
      />
      {/* forked tongue */}
      <path
        d={`M ${w * 0.5} 0 L ${w * 0.95} 0 M ${w * 0.85} -0.4 L ${w * 1.05} -0.5 M ${w * 0.85} 0.4 L ${w * 1.05} 0.5`}
        stroke="#dc2626"
        strokeWidth={0.4}
        strokeLinecap="round"
        fill="none"
      />
      {/* scale pattern on top of head */}
      <path
        d={`M ${-w * 0.1} ${-h * 0.3} Q 0 ${-h * 0.15} ${w * 0.15} ${-h * 0.25}`}
        stroke={dark}
        strokeWidth={0.2}
        fill="none"
        opacity={0.4}
      />
    </g>
  );
}

function TailTip({
  p,
  prev,
  color,
}: {
  p: Point;
  prev: Point;
  color: string;
}) {
  const dx = p.x - prev.x;
  const dy = p.y - prev.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${angleDeg})`}>
      <path
        d="M 0 0 L 1.8 -0.9 L 2.6 0 L 1.8 0.9 Z"
        fill={color}
      />
    </g>
  );
}
