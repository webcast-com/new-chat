import {
  LADDERS,
  SNAKES,
  PLAYER_COLORS,
  BOARD_SIZE,
  FINAL_SQUARE,
  squareToPercent,
  cellSquare,
} from "./game/constants";
import Snake3D from "./Snake3D";
import Ladder3D from "./Ladder3D";

type BoardProps = {
  positions: number[]; // length = num players, 0 = off-board
  currentPlayer: number;
  winner: number | null;
};

export default function Board({ positions, currentPlayer, winner }: BoardProps) {
  // Build grid rows from top to bottom.
  const rows: number[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(cellSquare(r, c));
    }
    rows.push(row);
  }

  return (
    <div className="relative aspect-square w-full max-w-[640px] select-none overflow-hidden rounded-2xl">
      {/* Board grid */}
      <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-emerald-900/30">
        {rows.map((row, r) =>
          row.map((sq, c) => {
            const isLight = (r + c) % 2 === 0;
            const isFinal = sq === FINAL_SQUARE;
            return (
              <div
                key={sq}
                className={[
                  "relative flex items-start justify-start p-1 text-[10px] font-bold sm:text-xs",
                  isLight
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-emerald-200/70 text-emerald-900",
                  isFinal
                    ? "bg-gradient-to-br from-yellow-300 to-amber-400 text-amber-900"
                    : "",
                ].join(" ")}
              >
                <span className="drop-shadow-sm">{sq}</span>
                {isFinal && (
                  <span className="absolute bottom-0.5 right-0.5 text-sm">
                    🏁
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Subtle inner depth shadow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-emerald-900/40" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.25)]" />

      {/* SVG overlay for 3D snakes & ladders (viewBox uses 0..100 coords) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Ladders first (slightly underneath). */}
        {Object.entries(LADDERS).map(([startStr, end]) => {
          const start = Number(startStr);
          const a = squareToPercent(start);
          const b = squareToPercent(end);
          return (
            <Ladder3D
              key={`ladder-${start}`}
              start={{ x: a.x, y: a.y }}
              end={{ x: b.x, y: b.y }}
            />
          );
        })}

        {/* Snakes */}
        {Object.entries(SNAKES).map(([startStr, end], i) => {
          const start = Number(startStr);
          const a = squareToPercent(start);
          const b = squareToPercent(end);
          return (
            <Snake3D
              key={`snake-${start}`}
              start={{ x: a.x, y: a.y }}
              end={{ x: b.x, y: b.y }}
              seed={i + start}
            />
          );
        })}
      </svg>

      {/* Player tokens */}
      {positions.map((sq, idx) => {
        const sameSquare = positions
          .map((p, j) => ({ p, j }))
          .filter((x) => x.p === sq && x.j !== idx);
        const totalHere = sameSquare.length + 1;
        const myIndex = positions
          .slice(0, idx + 1)
          .filter((p) => p === sq).length - 1;

        const { x, y } = squareToPercent(sq);
        const angle = totalHere === 1 ? 0 : (myIndex / totalHere) * Math.PI * 2;
        const radius = totalHere === 1 ? 0 : 2.2;
        const offX = Math.cos(angle) * radius;
        const offY = Math.sin(angle) * radius;

        const color = PLAYER_COLORS[idx];
        const isActive = idx === currentPlayer && winner === null;

        return (
          <div
            key={idx}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x + offX}%`,
              top: `${y + offY}%`,
              transition:
                "left 260ms cubic-bezier(.4,1.6,.6,1), top 260ms cubic-bezier(.4,1.6,.6,1)",
            }}
          >
            {/* Token drop shadow */}
            <div
              className="absolute left-1/2 top-full -translate-x-1/2 rounded-[50%] bg-black/40 blur-[1px]"
              style={{ width: 22, height: 6, transform: "translate(-50%, 2px)" }}
            />
            <div
              className={[
                "relative flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 sm:h-7 sm:w-7 sm:text-xs",
                color.bg,
                color.ring,
                isActive ? "animate-token-pulse" : "",
              ].join(" ")}
              style={{
                boxShadow: `0 4px 10px -2px ${color.hexDark}aa, inset 0 -2px 3px rgba(0,0,0,0.25), inset 0 2px 2px rgba(255,255,255,0.4)`,
              }}
              title={`${color.name} — square ${sq}`}
            >
              {/* Specular highlight */}
              <span
                className="absolute left-1 top-0.5 h-1.5 w-2 rounded-full bg-white/70 blur-[0.3px]"
                aria-hidden
              />
              <span className="relative">{idx + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
