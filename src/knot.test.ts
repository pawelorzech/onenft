import { expect, test } from "bun:test";
import { renderKnot, knotFor, epochOf, EPOCH_SECONDS, PALETTES, V3_FROM_EPOCH } from "./knot.ts";
import { renderKnotV2 } from "./knot_v2.ts";

test("the same day gives the same image", () => {
  expect(renderKnot(20702n).svg).toBe(renderKnot(20702n).svg);
});

test("seconds within one day map to one epoch", () => {
  expect(epochOf(EPOCH_SECONDS * 5n)).toBe(5n);
  expect(epochOf(EPOCH_SECONDS * 5n + 42n)).toBe(5n);
});

test("the next epoch gives a different image", () => {
  expect(renderKnot(5n).svg).not.toBe(renderKnot(6n).svg);
});

test("1000 consecutive epochs: no duplicate image", () => {
  const svgs = new Set<string>();
  for (let e = 0n; e < 1000n; e++) svgs.add(renderKnot(e).svg);
  expect(svgs.size).toBe(1000);
});

test("palettes are evenly spread, no runs", () => {
  const counts = new Map<string, number>();
  let runs = 0;
  let prev = "";
  for (let e = 0n; e < 1600n; e++) {
    const name = renderKnot(e).palette.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (name === prev) runs++;
    prev = name;
  }
  // All sixteen palettes in use, each within ±60% of 1/16 of 1600.
  expect(counts.size).toBe(16);
  for (const n of counts.values()) {
    expect(n).toBeGreaterThan(60);
    expect(n).toBeLessThan(160);
  }
  // A day-to-day repeat happens by chance about 1/16 of the time; a run every other day is a bug.
  expect(runs).toBeLessThan(200);
});

test("every trait value shows up within a year", () => {
  const seen: Record<string, Set<string | number>> = {};
  for (let e = 20702n; e < 20702n + 365n; e++) {
    for (const [k, v] of Object.entries(renderKnot(e).traits)) (seen[k] ??= new Set()).add(v);
  }
  expect([...seen.grid].sort()).toEqual([10, 12, 6, 8]);
  expect([...seen.weave].sort()).toEqual(["arcs", "cross", "loose", "passes"]);
  expect([...seen.symmetry].sort()).toEqual(["mirror", "none", "quad", "turn"]);
  expect([...seen.weight].sort()).toEqual(["heavy", "regular", "thin"]);
  expect([...seen.caps].sort()).toEqual(["butt", "round"]);
  expect(seen.accent.has("none")).toBe(true);
  expect(seen.accent.size).toBeGreaterThan(1);
  expect(seen.palette.size).toBe(PALETTES.length);
});

test("cells match the grid and the weave", () => {
  for (let e = 0n; e < 300n; e++) {
    const k = renderKnot(e);
    expect(k.cells.length).toBe(k.traits.grid * k.traits.grid);
    const max = Math.max(...k.cells);
    if (k.traits.weave === "arcs") expect(max).toBeLessThanOrEqual(1);
    if (k.traits.weave === "passes") expect(max).toBeLessThanOrEqual(3);
    if (k.traits.weave === "loose") expect(max).toBeLessThanOrEqual(4);
    expect(max).toBeLessThanOrEqual(5);
  }
});

test("mirror symmetry: the right half is the left half flipped", () => {
  let checked = 0;
  for (let e = 0n; e < 400n && checked < 5; e++) {
    const k = renderKnot(e);
    if (k.traits.symmetry !== "mirror") continue;
    const g = k.traits.grid;
    for (let y = 0; y < g; y++) for (let x = 0; x < g / 2; x++) {
      const a = k.cells[y * g + x], b = k.cells[y * g + (g - 1 - x)];
      expect(b).toBe(a < 2 ? a ^ 1 : a);
    }
    checked++;
  }
  expect(checked).toBe(5);
});

test("accent days carry a third color, others do not", () => {
  let withAccent = 0;
  for (let e = 0n; e < 400n; e++) {
    const k = renderKnot(e);
    const paths = (k.svg.match(/<path /g) ?? []).length;
    if (k.traits.accent === "none") expect(paths).toBe(2);
    else { expect(paths).toBeLessThanOrEqual(3); withAccent++; }
  }
  expect(withAccent).toBeGreaterThan(10);
});

test("the SVG scales to 512 whatever the grid", () => {
  for (const e of [20702n, 20705n, 20711n]) expect(renderKnot(e).svg).toContain('width="512" height="512"');
});

test("epochOf cuts at midnight UTC", () => {
  expect(epochOf(EPOCH_SECONDS - 1n)).toBe(0n);
  expect(epochOf(EPOCH_SECONDS)).toBe(1n);
});

test("v2 stays frozen: day 1 as the chain rendered it", () => {
  const k = renderKnotV2(20701n);
  expect(k.palette.name).toBe("ultramarine");
  expect(k.cells.length).toBe(64);
  expect(k.svg.length).toBe(4081);
});

test("knotFor picks v2 before the switch and v3 from it", () => {
  expect(V3_FROM_EPOCH).toBe(20702n);
  expect(knotFor(20701n).version).toBe(1);
  expect(knotFor(20701n).svg).toBe(renderKnotV2(20701n).svg);
  expect(knotFor(20702n).version).toBe(3);
  expect(knotFor(20702n).svg).toBe(renderKnot(20702n).svg);
});
