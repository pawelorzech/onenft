import { expect, test } from "bun:test";
import { renderKnot, epochOf, EPOCH_SECONDS } from "./knot.ts";

test("ten sam dzień daje ten sam obraz", () => {
  expect(renderKnot(20701n).svg).toBe(renderKnot(20701n).svg);
});

test("sekundy w tym samym dniu dają tę samą epokę", () => {
  expect(epochOf(EPOCH_SECONDS * 5n)).toBe(5n);
  expect(epochOf(EPOCH_SECONDS * 5n + 42n)).toBe(5n);
});

test("kolejna epoka daje inny obraz", () => {
  expect(renderKnot(5n).svg).not.toBe(renderKnot(6n).svg);
});

test("1000 kolejnych epok: brak duplikatu obrazu", () => {
  const svgs = new Set<string>();
  for (let e = 0n; e < 1000n; e++) svgs.add(renderKnot(e).svg);
  expect(svgs.size).toBe(1000);
});

test("palety rozkładają się równo, bez serii", () => {
  const counts = new Map<string, number>();
  let runs = 0;
  let prev = "";
  for (let e = 0n; e < 800n; e++) {
    const name = renderKnot(e).palette.name;
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
  for (let e = 0n; e < 200n; e++) for (const c of renderKnot(e).cells) counts[c]++;
  for (const n of counts) expect(n).toBeGreaterThan(2600);
});

test("epochOf tnie o północy UTC", () => {
  expect(epochOf(EPOCH_SECONDS - 1n)).toBe(0n);
  expect(epochOf(EPOCH_SECONDS)).toBe(1n);
});

test("stany komórek mieszczą się w 2 bitach i pokrywają wszystkie cztery", () => {
  const k = renderKnot(7n);
  expect(k.cells.length).toBe(64);
  expect(Math.max(...k.cells)).toBeLessThanOrEqual(3);
  expect(Math.min(...k.cells)).toBeGreaterThanOrEqual(0);
  expect(new Set(k.cells).size).toBe(4);
});
