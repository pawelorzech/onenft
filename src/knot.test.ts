import { expect, test } from "bun:test";
import { renderKnot, epochOf, EPOCH_SECONDS } from "./knot.ts";

test("the same day gives the same image", () => {
  expect(renderKnot(20701n).svg).toBe(renderKnot(20701n).svg);
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
  for (let e = 0n; e < 800n; e++) {
    const name = renderKnot(e).palette.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (name === prev) runs++;
    prev = name;
  }
  // All eight palettes in use, each within ±60% of 1/8 of 800.
  expect(counts.size).toBe(8);
  for (const n of counts.values()) {
    expect(n).toBeGreaterThan(60);
    expect(n).toBeLessThan(160);
  }
  // A day-to-day repeat happens by chance about 1/8 of the time; a run every other day is a bug.
  expect(runs).toBeLessThan(160);
});

test("cell states cover all four variants", () => {
  const counts = [0, 0, 0, 0];
  for (let e = 0n; e < 200n; e++) for (const c of renderKnot(e).cells) counts[c]++;
  for (const n of counts) expect(n).toBeGreaterThan(2600);
});

test("epochOf cuts at midnight UTC", () => {
  expect(epochOf(EPOCH_SECONDS - 1n)).toBe(0n);
  expect(epochOf(EPOCH_SECONDS)).toBe(1n);
});

test("cell states fit in 2 bits and cover all four", () => {
  const k = renderKnot(7n);
  expect(k.cells.length).toBe(64);
  expect(Math.max(...k.cells)).toBeLessThanOrEqual(3);
  expect(Math.min(...k.cells)).toBeGreaterThanOrEqual(0);
  expect(new Set(k.cells).size).toBe(4);
});
