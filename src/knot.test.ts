import { expect, test } from "bun:test";
import { renderKnot, epochOf, EPOCH_BLOCKS } from "./knot.ts";

test("ten sam blok daje ten sam obraz", () => {
  expect(renderKnot(1_000_000n).svg).toBe(renderKnot(1_000_000n).svg);
});

test("bloki w tej samej epoce dają ten sam obraz", () => {
  const a = renderKnot(EPOCH_BLOCKS * 5n);
  const b = renderKnot(EPOCH_BLOCKS * 5n + 42n);
  expect(a.svg).toBe(b.svg);
  expect(a.epoch).toBe(5n);
});

test("kolejna epoka daje inny obraz", () => {
  expect(renderKnot(EPOCH_BLOCKS * 5n).svg).not.toBe(renderKnot(EPOCH_BLOCKS * 6n).svg);
});

test("1000 kolejnych epok: brak duplikatu obrazu", () => {
  const svgs = new Set<string>();
  for (let e = 0n; e < 1000n; e++) svgs.add(renderKnot(e * EPOCH_BLOCKS).svg);
  expect(svgs.size).toBe(1000);
});

test("palety rozkładają się równo, bez serii", () => {
  const counts = new Map<string, number>();
  let runs = 0;
  let prev = "";
  for (let e = 0n; e < 800n; e++) {
    const name = renderKnot(e * EPOCH_BLOCKS).palette.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (name === prev) runs++;
    prev = name;
  }
  // Wszystkie osiem palet w użyciu, każda w granicach ±60% od 1/8 z 800.
  expect(counts.size).toBe(8);
  for (const n of counts.values()) {
    expect(n).toBeGreaterThan(60);
    expect(n).toBeLessThan(160);
  }
  // Powtórzenie doba-po-dobie zdarza się losowo ~1/8; seria co drugą dobę to bug.
  expect(runs).toBeLessThan(160);
});

test("stany komórek rozkładają się na cztery warianty", () => {
  const counts = [0, 0, 0, 0];
  for (let e = 0n; e < 200n; e++) for (const c of renderKnot(e * EPOCH_BLOCKS).cells) counts[c]++;
  for (const n of counts) expect(n).toBeGreaterThan(2600);
});

test("epochOf tnie po granicy bloku", () => {
  expect(epochOf(EPOCH_BLOCKS - 1n)).toBe(0n);
  expect(epochOf(EPOCH_BLOCKS)).toBe(1n);
});

test("stany komórek mieszczą się w 2 bitach i pokrywają wszystkie cztery", () => {
  const k = renderKnot(7n * EPOCH_BLOCKS);
  expect(k.cells.length).toBe(64);
  expect(Math.max(...k.cells)).toBeLessThanOrEqual(3);
  expect(Math.min(...k.cells)).toBeGreaterThanOrEqual(0);
  expect(new Set(k.cells).size).toBe(4);
});
