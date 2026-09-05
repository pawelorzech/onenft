/**
 * Deterministic Truchet knot generator, version 3. Source of truth for
 * contracts/src/KnotRendererV3.sol.
 *
 * All arithmetic is integer and fits in uint64 so the exact same run can be
 * ported to Solidity. No floats, no Math.random. The SVG is a string meant to
 * be returned from `tokenURI` as `data:image/svg+xml;base64,...`, never as a
 * link to a server (see what happened to Blitmap).
 *
 * Version 2 (day 1) lives frozen in `knot_v2.ts`. `knotFor` picks the version
 * a day was, or will be, rendered with.
 */
import { renderKnotV2, PALETTES_V2 } from "./knot_v2.ts";

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
 * The sixteen palettes. The first eight are the v2 palettes, unchanged.
 * The palette follows the day number, so the image changes on its own.
 */
export const PALETTES: Palette[] = [
  ...PALETTES_V2,
  { name: "plum",  bg: "#1c1020", cord: "#e6c8f0", shade: "#6a3c7a" },
  { name: "bone",  bg: "#efe9dc", cord: "#4a3a2a", shade: "#c2b49c" },
  { name: "pine",  bg: "#0c1a1a", cord: "#b8e0d0", shade: "#2a5a52" },
  { name: "brick", bg: "#2a1412", cord: "#f0b8a8", shade: "#8a3a2c" },
  { name: "fog",   bg: "#d8dde2", cord: "#2a3038", shade: "#9aa4ae" },
  { name: "ochre", bg: "#1c1806", cord: "#f0d060", shade: "#7a6420" },
  { name: "wine",  bg: "#f2e4e6", cord: "#5a1a2c", shade: "#c89aa4" },
  { name: "slate", bg: "#242a32", cord: "#e0e6ec", shade: "#6a7684" },
];

/** One day in sixteen carries a few cells in a third, loud color. */
export const ACCENTS: { name: string; color: string }[] = [
  { name: "flame", color: "#e04040" },
  { name: "gold",  color: "#f0c040" },
  { name: "sky",   color: "#40c0e0" },
  { name: "rose",  color: "#e060b0" },
];

/** Trait tables. Index by the drawn value; repeats set the odds. */
export const GRIDS = [6, 8, 8, 8, 8, 10, 10, 12, 8, 8, 6, 10, 8, 12, 8, 10];
export const WEAVES = ["arcs", "arcs", "passes", "passes", "passes", "loose", "cross", "passes"] as const;
export const SYMMETRIES = ["none", "none", "none", "none", "mirror", "mirror", "quad", "turn"] as const;
export const WEIGHTS = ["thin", "regular", "regular", "heavy"] as const;
export const CAPS = ["butt", "round", "round", "round"] as const;

export type Weave = (typeof WEAVES)[number];
export type Symmetry = (typeof SYMMETRIES)[number];
export type Weight = (typeof WEIGHTS)[number];
export type Cap = (typeof CAPS)[number];

export type Traits = {
  palette: string;
  grid: number;
  weave: Weave;
  symmetry: Symmetry;
  weight: Weight;
  caps: Cap;
  /** Accent name, or "none". */
  accent: string;
};

/** One epoch is one calendar day in UTC: unix seconds / 86400. Same on every chain. */
export const EPOCH_SECONDS = 86400n;

export function epochOf(unixSeconds: bigint): bigint {
  return unixSeconds / EPOCH_SECONDS;
}

export type Knot = {
  svg: string;
  palette: Palette;
  epoch: bigint;
  seed: bigint;
  /** Cell states: the full description of the image. See `cellPath`. */
  cells: number[];
  /** Renderer version that produced this knot: 2 or 3. */
  version: number;
  traits: Traits;
};

/**
 * Cell states:
 *   0, 1: a pair of quarter-arcs in one of two orientations
 *   2: vertical pass
 *   3: horizontal pass
 *   4: empty (weave "loose" only)
 *   5: crossing, both passes (weave "cross" only)
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
    case 3:
      return `M${x} ${y + h}L${x + s} ${y + h}`;
    case 4:
      return "";
    default:
      return `M${x + h} ${y}L${x + h} ${y + s}M${x} ${y + h}L${x + s} ${y + h}`;
  }
}

/** Three drawn bits to a cell state, by weave. */
function stateOf(weave: Weave, v: number): number {
  if (weave === "arcs") return v & 1;
  if (weave === "passes") return v & 3;
  if (v < 4) return v;
  if (v < 6) return v - 4;
  return weave === "loose" ? 4 : 5;
}

/** Arcs swap orientation under a mirror or a quarter turn; passes swap under a quarter turn. */
function mirrored(state: number): number {
  return state < 2 ? state ^ 1 : state;
}
function turned(state: number): number {
  return state < 4 ? state ^ 1 : state;
}

const CELL = 64;

export function renderKnot(epoch: bigint): Knot {
  // The seed is the day number alone: the same day gives the same image,
  // years later and with the server switched off.
  // The stream counter starts at the mixed day number so neighbouring days
  // do not share the beginning of the stream.
  let state = nextRandom(epoch & U64);
  let r: { state: bigint; value: number };

  r = draw(state, 8); state = r.state; const palette = PALETTES[r.value % PALETTES.length];
  r = draw(state, 4); state = r.state; const grid = GRIDS[r.value];
  r = draw(state, 3); state = r.state; const weave = WEAVES[r.value];
  r = draw(state, 3); state = r.state; const symmetry = SYMMETRIES[r.value];
  r = draw(state, 2); state = r.state; const weight = WEIGHTS[r.value];
  r = draw(state, 2); state = r.state; const caps = CAPS[r.value];
  r = draw(state, 4); state = r.state;
  let accent = -1;
  if (r.value === 0) { r = draw(state, 2); state = r.state; accent = r.value; }

  const half = grid / 2;
  const n = grid * grid;
  const cells: number[] = new Array(n).fill(0);
  const marks: boolean[] = new Array(n).fill(false);
  const free = (x: number, y: number) =>
    symmetry === "none" || (x < half && (symmetry === "mirror" || y < half));

  // First pass: draw the free cells in row order. Second pass: copy the rest
  // from their source cell, so the source is always already drawn.
  for (let i = 0; i < n; i++) {
    const x = i % grid, y = Math.floor(i / grid);
    if (!free(x, y)) continue;
    r = draw(state, 3); state = r.state;
    cells[i] = stateOf(weave, r.value);
    if (accent >= 0 && cells[i] !== 4) { r = draw(state, 4); state = r.state; marks[i] = r.value === 0; }
  }
  for (let i = 0; i < n; i++) {
    const x = i % grid, y = Math.floor(i / grid);
    if (free(x, y)) continue;
    let sx: number, sy: number, s: number;
    if (symmetry === "mirror") {
      sx = grid - 1 - x; sy = y;
      s = mirrored(cells[sy * grid + sx]);
    } else if (symmetry === "quad") {
      sx = x < half ? x : grid - 1 - x; sy = y < half ? y : grid - 1 - y;
      s = cells[sy * grid + sx];
      if ((x >= half) !== (y >= half)) s = mirrored(s);
    } else {
      if (x >= half && y < half) { sx = y; sy = grid - 1 - x; }
      else if (x >= half) { sx = grid - 1 - x; sy = grid - 1 - y; }
      else { sx = grid - 1 - y; sy = x; }
      s = cells[sy * grid + sx];
      if (!(x >= half && y >= half)) s = turned(s);
    }
    cells[i] = s;
    marks[i] = marks[sy * grid + sx];
  }

  let all = "", cord = "", loud = "";
  for (let i = 0; i < n; i++) {
    const p = cellPath(cells[i], (i % grid) * CELL, Math.floor(i / grid) * CELL, CELL);
    all += p;
    if (marks[i]) loud += p; else cord += p;
  }

  const size = grid * CELL;
  const wCord = weight === "thin" ? 5 : weight === "regular" ? 9 : 15;
  const wShade = weight === "thin" ? 13 : weight === "regular" ? 21 : 30;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="512" height="512">` +
    `<rect width="${size}" height="${size}" fill="${palette.bg}"/>` +
    `<g fill="none" stroke-linecap="${caps}">` +
    `<path d="${all}" stroke="${palette.shade}" stroke-width="${wShade}"/>` +
    `<path d="${cord}" stroke="${palette.cord}" stroke-width="${wCord}"/>` +
    (loud ? `<path d="${loud}" stroke="${ACCENTS[accent].color}" stroke-width="${wCord}"/>` : "") +
    `</g></svg>`;

  const traits: Traits = { palette: palette.name, grid, weave, symmetry, weight, caps, accent: accent >= 0 ? ACCENTS[accent].name : "none" };
  return { svg, palette, epoch, seed: epoch, cells, version: 3, traits };
}

/** First epoch rendered with v3 on the chain. Day 1 (20701) stays v2. */
export const V3_FROM_EPOCH = BigInt(process.env.V3_FROM_EPOCH ?? "20702");

/** The knot as the chain shows it: v2 before the switch, v3 from then on. */
export function knotFor(epoch: bigint): Knot {
  if (epoch >= V3_FROM_EPOCH) return renderKnot(epoch);
  const k = renderKnotV2(epoch);
  return { ...k, version: 2, traits: { palette: k.palette.name, grid: 8, weave: "passes", symmetry: "none", weight: "regular", caps: "round", accent: "none" } };
}

/** The form in which the image leaves the contract. */
export function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
