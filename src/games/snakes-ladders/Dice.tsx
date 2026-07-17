import { useEffect, useRef, useState, type CSSProperties } from "react";

type DiceProps = {
  value: number; // 1-6, the target face that should end up facing the viewer
  rollKey: number; // increments on each roll, triggers the tumble
};

// Rotation to apply to the cube so that the given face ends up pointing
// toward the viewer (i.e., aligned with +Z). The cube faces are placed
// using standard CSS 3D transforms.
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },      // front
  2: { x: -90, y: 0 },    // top → front
  3: { x: 0, y: -90 },    // right → front
  4: { x: 0, y: 90 },     // left → front
  5: { x: 90, y: 0 },     // bottom → front
  6: { x: 0, y: 180 },    // back → front
};

// Pip positions in a 3x3 grid (indices 0..8, row-major).
const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function PipFace({ value }: { value: number }) {
  const positions = PIP_POSITIONS[value] ?? [];
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-[14%]">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {positions.includes(i) && (
            <div className="aspect-square w-[72%] rounded-full bg-gradient-to-br from-slate-800 to-black shadow-[inset_0_2px_2px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.35)]" />
          )}
        </div>
      ))}
    </div>
  );
}

const SIZE = 128; // px
const HALF = SIZE / 2;

const faceBaseStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  background:
    "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #e2e8f0 100%)",
  borderRadius: "16px",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  boxShadow:
    "inset 0 0 14px rgba(15, 23, 42, 0.08), inset 0 -4px 10px rgba(15, 23, 42, 0.06)",
};

export default function Dice({ value, rollKey }: DiceProps) {
  // Start slightly tilted so the user sees 3 faces (1, 2, 3) at rest.
  const [rotation, setRotation] = useState({ x: -18, y: 22 });
  const [lifted, setLifted] = useState(false);
  const prevRollKey = useRef(rollKey);

  useEffect(() => {
    if (prevRollKey.current === rollKey) return;
    prevRollKey.current = rollKey;

    // Quick "lift" at the start of the roll for a pop-off-the-table feel.
    setLifted(true);
    const liftTimer = window.setTimeout(() => setLifted(false), 900);

    setRotation((prev) => {
      const base = FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1];
      // Normalize previous rotation into [0, 360).
      const normX = ((prev.x % 360) + 360) % 360;
      const normY = ((prev.y % 360) + 360) % 360;
      const targetX = ((base.x % 360) + 360) % 360;
      const targetY = ((base.y % 360) + 360) % 360;
      // Smallest positive delta to reach the target orientation.
      const diffX = ((targetX - normX) + 360) % 360;
      const diffY = ((targetY - normY) + 360) % 360;
      // Add 3–5 full spins on each axis for a satisfying tumble.
      const spinsX = 3 + Math.floor(Math.random() * 3);
      const spinsY = 3 + Math.floor(Math.random() * 3);
      return {
        x: prev.x + spinsX * 360 + diffX,
        y: prev.y + spinsY * 360 + diffY,
      };
    });

    return () => window.clearTimeout(liftTimer);
  }, [rollKey, value]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE + 40, height: SIZE + 60 }}
    >
      {/* Ground shadow — scales with the lift */}
      <div
        className="absolute bottom-0 left-1/2 h-4 w-24 -translate-x-1/2 rounded-[50%] bg-black/40 blur-md"
        style={{
          transform: `translateX(-50%) scale(${lifted ? 0.6 : 1})`,
          opacity: lifted ? 0.35 : 0.6,
          transition:
            "transform 1.3s cubic-bezier(.2,.8,.2,1), opacity 1.3s cubic-bezier(.2,.8,.2,1)",
        }}
      />

      {/* 3D scene */}
      <div
        style={{
          perspective: "900px",
          perspectiveOrigin: "50% 40%",
          width: SIZE,
          height: SIZE,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: `translateY(${lifted ? -24 : 0}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition:
              "transform 1.4s cubic-bezier(.18,.78,.28,1)",
          }}
        >
          {/* Front — 1 */}
          <div style={{ ...faceBaseStyle, transform: `translateZ(${HALF}px)` }}>
            <PipFace value={1} />
          </div>
          {/* Back — 6 (opposite 1) */}
          <div
            style={{
              ...faceBaseStyle,
              transform: `rotateY(180deg) translateZ(${HALF}px)`,
            }}
          >
            <PipFace value={6} />
          </div>
          {/* Right — 3 */}
          <div
            style={{
              ...faceBaseStyle,
              transform: `rotateY(90deg) translateZ(${HALF}px)`,
            }}
          >
            <PipFace value={3} />
          </div>
          {/* Left — 4 (opposite 3) */}
          <div
            style={{
              ...faceBaseStyle,
              transform: `rotateY(-90deg) translateZ(${HALF}px)`,
            }}
          >
            <PipFace value={4} />
          </div>
          {/* Top — 2 */}
          <div
            style={{
              ...faceBaseStyle,
              transform: `rotateX(90deg) translateZ(${HALF}px)`,
            }}
          >
            <PipFace value={2} />
          </div>
          {/* Bottom — 5 (opposite 2) */}
          <div
            style={{
              ...faceBaseStyle,
              transform: `rotateX(-90deg) translateZ(${HALF}px)`,
            }}
          >
            <PipFace value={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
