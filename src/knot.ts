/**
 * Deterministyczny generator węzła Truchet.
 *
 * Cała arytmetyka jest całkowitoliczbowa i mieści się w uint64, żeby ten sam
 * przebieg dał się przepisać 1:1 na Solidity. Żadnych floatów, żadnego Math.random.
 * SVG powstaje jako string i jest przeznaczony do zwrócenia z `tokenURI` jako
 * `data:image/svg+xml;base64,...` — nigdy jako link do serwera (patrz Blitmap).
 */

const U64 = (1n << 64n) - 1n;

/**
 * splitmix64 — jeden krok strumienia plus finalizer.
 *
 * Sam LCG nie wystarcza: przy małych, kolejnych ziarnach (a epoki to 0,1,2,...)
 * jego górne bity zmieniają się leniwie i paleta trzyma się blokami po kilka dób.
 * Finalizer rozbija te korelacje. W Solidity odpowiednikiem jest
 * `uint256(keccak256(abi.encodePacked(state)))` — tam mieszanie dostajesz za darmo.
 */
export function nextRandom(state: bigint): bigint {
  let z = (state + 0x9e3779b97f4a7c15n) & U64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & U64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & U64;
  return (z ^ (z >> 31n)) & U64;
}

/**
 * Pobiera `bits` bitów. `state` jest licznikiem strumienia — inkrementowanym,
 * nie nadpisywanym wynikiem — bo splitmix64 miesza licznik, a nie sam siebie.
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
 * Palety epok. Epoka wynika z numeru bloku, więc obraz zmienia się sam,
 * bez żadnej akcji autora — to jedyny mechanizm nawyku, który wykonuje się sam.
 */
export const PALETTES: Palette[] = [
  { name: "ink",  bg: "#12131a", cord: "#e8e4d9", shade: "#5b6478" },
  { name: "copper",     bg: "#1a1210", cord: "#e0a060", shade: "#7a4426" },
  { name: "moss",      bg: "#101a14", cord: "#9fd8a8", shade: "#2f5c3f" },
  { name: "ash",    bg: "#e8e6e1", cord: "#22242c", shade: "#9a9891" },
  { name: "ultramarine", bg: "#0e1430", cord: "#d8dcf0", shade: "#3a4a8c" },
  { name: "rust",      bg: "#f0e8dc", cord: "#8c3a20", shade: "#c8a882" },
  { name: "salt",       bg: "#f4f4f2", cord: "#3a4450", shade: "#b8bcc4" },
  { name: "tar",     bg: "#08080a", cord: "#c8c4bc", shade: "#3a3a40" },
];

/** Długość epoki w blokach. Base ~2 s/blok → 43200 bloków ≈ doba. */
export const EPOCH_BLOCKS = 43200n;

export function epochOf(blockNumber: bigint): bigint {
  return blockNumber / EPOCH_BLOCKS;
}

export type KnotOptions = {
  /** Liczba komórek na bok. */
  grid?: number;
  /** Bok komórki w jednostkach SVG. */
  cell?: number;
};

export type Knot = {
  svg: string;
  palette: Palette;
  epoch: bigint;
  seed: bigint;
  /** Stany komórek, 2 bity każdy — pełny opis obrazu. */
  cells: number[];
};

/**
 * Cztery stany komórki (2 bity):
 *   0,1 — para ćwierćłuków w dwóch orientacjach (splot)
 *   2   — pionowy przelot
 *   3   — poziomy przelot
 * Same łuki dają klasyczny Truchet; przeloty rozbijają go na dłuższe ciągi.
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

export function renderKnot(blockNumber: bigint, opts: KnotOptions = {}): Knot {
  const grid = opts.grid ?? 8;
  const cell = opts.cell ?? 64;
  const size = grid * cell;
  const epoch = epochOf(blockNumber);

  // Ziarno wyprowadzone z epoki, nie z zegara systemowego — ten sam blok
  // zawsze daje ten sam obraz, także po latach i przy wyłączonym serwerze.
  // Licznik strumienia startuje od zmieszanej epoki, żeby sąsiednie doby
  // nie dzieliły początkowego odcinka strumienia.
  let state = nextRandom(epoch & U64);

  const pick = draw(state, 8);
  state = pick.state;
  const palette = PALETTES[pick.value % PALETTES.length];

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

/** Postać, w jakiej obraz opuszcza kontrakt. */
export function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
