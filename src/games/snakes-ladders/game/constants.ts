// Classic snakes and ladders positions.
// Ladders: go from bottom → top (smaller → larger).
// Snakes:  go from head → tail (larger → smaller).

export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

export const BOARD_SIZE = 10; // 10x10
export const FINAL_SQUARE = 100;

export type PlayerColor = {
  name: string;
  bg: string; // tailwind class for token fill
  ring: string; // tailwind class for ring
  text: string; // tailwind class for text
  hex: string; // raw hex for SVG strokes
  hexDark: string;
};

export const PLAYER_COLORS: PlayerColor[] = [
  {
    name: "Ruby",
    bg: "bg-rose-500",
    ring: "ring-rose-300",
    text: "text-rose-600",
    hex: "#f43f5e",
    hexDark: "#9f1239",
  },
  {
    name: "Azure",
    bg: "bg-sky-500",
    ring: "ring-sky-300",
    text: "text-sky-600",
    hex: "#0ea5e9",
    hexDark: "#075985",
  },
  {
    name: "Lime",
    bg: "bg-lime-500",
    ring: "ring-lime-300",
    text: "text-lime-600",
    hex: "#84cc16",
    hexDark: "#3f6212",
  },
  {
    name: "Amber",
    bg: "bg-amber-500",
    ring: "ring-amber-300",
    text: "text-amber-600",
    hex: "#f59e0b",
    hexDark: "#92400e",
  },
];

/**
 * Convert a square number (1-100) to a percentage position (0-100)
 * for the center of that square on the board.
 * Square 1 is bottom-left, 100 is top-left.
 * Rows alternate direction (boustrophedon).
 */
export function squareToPercent(square: number): { x: number; y: number } {
  if (square <= 0) {
    // off-board (starting position) — place just below square 1
    return { x: 5, y: 105 };
  }
  const n = square - 1;
  const rowFromBottom = Math.floor(n / BOARD_SIZE);
  const posInRow = n % BOARD_SIZE;
  const col = rowFromBottom % 2 === 0 ? posInRow : BOARD_SIZE - 1 - posInRow;
  const rowFromTop = BOARD_SIZE - 1 - rowFromBottom;
  return {
    x: (col + 0.5) * 10,
    y: (rowFromTop + 0.5) * 10,
  };
}

/** Returns the square number for a given grid row-from-top and col (0-indexed). */
export function cellSquare(rowFromTop: number, col: number): number {
  const rowFromBottom = BOARD_SIZE - 1 - rowFromTop;
  const posInRow = rowFromBottom % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  return rowFromBottom * BOARD_SIZE + posInRow + 1;
}
