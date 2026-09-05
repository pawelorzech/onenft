/**
 * Renderer v2, frozen. Source of truth for contracts/src/KnotRenderer.sol,
 * which is pinned to every token claimed before the switch to v3 (day 1).
 * Do not change: the fixtures in contracts/test/fixtures/knots.json come
 * from this file and the Solidity test compares them byte for byte.
 */

const U64 = (1n << 64n) - 1n;

/**
 * splitmix64: one step of the stream plus the finalizer.
 *
 * A bare LCG is not enough. With small consecutive seeds (day numbers) its top
 * bits move slowly and the palette sticks for several days in a row. The
 * finalizer breaks that correlation. The Solidity renderer uses the same steps.
 */
export function nextRandom(state: bigint): bigint {
  let z = (state + 0x9e3779b97f4a7c15n) & U64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & U64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & U64;
  return (z ^ (z >> 31n)) & U64;
}

/**
 * Draws `bits` bits. `state` is a stream counter, incremented rather than
 * replaced by the output, because splitmix64 mixes a counter, not itself.
 */
function draw(state: bigint, bits: number): { state: bigint; value: number } {
  const next = (state + 1n) & U64;
  const mixed = nextRandom(next);
  const value = Number((mixed >> BigInt(64 - bits)) & ((1n << BigInt(bits)) - 1n));
  return { state: next, value };
}

export type Palette = {
  name: string;
  bg: string;
  cord: string;
  shade: string;
};

/**
 * The eight palettes. The palette follows the day number, so the image changes
 * on its own, with no action from the author.
 */
export const PALETTES_V2: Palette[] = [
  { name: "ink",  bg: "#12131a", cord: "#e8e4d9", shade: "#5b6478" },
  { name: "copper",     bg: "#1a1210", cord: "#e0a060", shade: "#7a4426" },
  { name: "moss",      bg: "#101a14", cord: "#9fd8a8", shade: "#2f5c3f" },
  { name: "ash",    bg: "#e8e6e1", cord: "#22242c", shade: "#9a9891" },
  { name: "ultramarine", bg: "#0e1430", cord: "#d8dcf0", shade: "#3a4a8c" },
  { name: "rust",      bg: "#f0e8dc", cord: "#8c3a20", shade: "#c8a882" },
  { name: "salt",       bg: "#f4f4f2", cord: "#3a4450", shade: "#b8bcc4" },
  { name: "tar",     bg: "#08080a", cord: "#c8c4bc", shade: "#3a3a40" },
];

/** One epoch is one calendar day in UTC: unix seconds / 86400. Same on every chain. */
export const EPOCH_SECONDS = 86400n;

export function epochOf(unixSeconds: bigint): bigint {
  return unixSeconds / EPOCH_SECONDS;
}

export type KnotOptions = {
  /** Cells per side. */
  grid?: number;
  /** Cell side in SVG units. */
  cell?: number;
};

export type Knot = {
  svg: string;
  palette: Palette;
  epoch: bigint;
  seed: bigint;
  /** Cell states, 2 bits each: the full description of the image. */
  cells: number[];
};

/**
 * Four cell states (2 bits):
 *   0, 1: a pair of quarter-arcs in one of two orientations
 *   2: vertical pass
 *   3: horizontal pass
 * Arcs alone give classic Truchet; the passes break it into longer runs.
 */
function cellPath(state: number, x: number, y: number, s: number): string {
  const h = s / 2;
  switch (state) {
    case 0:
      return `M${x} ${y + h}A${h} ${h} 0 0 1 ${x + h} ${y}M${x + h} ${y + s}A${h} ${h} 0 0 0 ${x + s} ${y + h}`;
    case 1:
      return `M${x + h} ${y}A${h} ${h} 0 0 1 ${x + s} ${y + h}M${x} ${y + h}A${h} ${h} 0 0 0 ${x + h} ${y + s}`;
    case 2:
      return `M${x + h} ${y}L${x + h} ${y + s}`;
    default:
      return `M${x} ${y + h}L${x + s} ${y + h}`;
  }
}

export function renderKnotV2(epoch: bigint, opts: KnotOptions = {}): Knot {
  const grid = opts.grid ?? 8;
  const cell = opts.cell ?? 64;
  const size = grid * cell;

  // The seed is the day number alone: the same day gives the same image,
  // years later and with the server switched off.
  // The stream counter starts at the mixed day number so neighbouring days
  // do not share the beginning of the stream.
  let state = nextRandom(epoch & U64);

  const pick = draw(state, 8);
  state = pick.state;
  const palette = PALETTES_V2[pick.value % PALETTES_V2.length];

  const cells: number[] = [];
  let path = "";
  for (let i = 0; i < grid * grid; i++) {
    const r = draw(state, 2);
    state = r.state;
    cells.push(r.value);
    path += cellPath(r.value, (i % grid) * cell, Math.floor(i / grid) * cell, cell);
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${palette.bg}"/>` +
    `<g fill="none" stroke-linecap="round">` +
    `<path d="${path}" stroke="${palette.shade}" stroke-width="${Math.floor(cell / 3)}"/>` +
    `<path d="${path}" stroke="${palette.cord}" stroke-width="${Math.floor(cell / 7)}"/>` +
    `</g></svg>`;

  return { svg, palette, epoch, seed: epoch, cells };
}

/** The form in which the image leaves the contract. */
export function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
