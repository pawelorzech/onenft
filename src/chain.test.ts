import { expect, test } from "bun:test";
import { dayByNumber, dayOfBlock, secondsLeft, START_EPOCH, estimateBlock } from "./chain.ts";
import { EPOCH_BLOCKS } from "./knot.ts";

test("doba 1 zaczyna się na START_EPOCH", () => {
  const d = dayOfBlock(START_EPOCH * EPOCH_BLOCKS);
  expect(d?.n).toBe(1);
  expect(dayOfBlock(START_EPOCH * EPOCH_BLOCKS - 1n)).toBeNull();
});

test("dayByNumber i dayOfBlock są odwrotne", () => {
  for (const n of [1, 2, 90, 1000]) {
    const d = dayByNumber(n)!;
    expect(dayOfBlock(d.firstBlock)?.n).toBe(n);
    expect(dayOfBlock(d.firstBlock + EPOCH_BLOCKS - 1n)?.n).toBe(n);
  }
  expect(dayByNumber(0)).toBeNull();
  expect(dayByNumber(1.5)).toBeNull();
});

test("secondsLeft maleje do zera na granicy doby", () => {
  const first = START_EPOCH * EPOCH_BLOCKS;
  expect(secondsLeft(first)).toBe(Number(EPOCH_BLOCKS) * 2);
  expect(secondsLeft(first + EPOCH_BLOCKS - 1n)).toBe(2);
});

test("estymacja bloku rośnie 1 blok na 2 s od kotwicy", () => {
  const a = estimateBlock(1_788_563_065);
  expect(estimateBlock(1_788_563_065 + 20)).toBe(a + 10n);
});

test("secondsToStart liczy do pierwszego bloku doby 1 i zeruje się po nim", async () => {
  const { secondsToStart } = await import("./chain.ts");
  const first = START_EPOCH * EPOCH_BLOCKS;
  expect(secondsToStart(first - 30n)).toBe(60);
  expect(secondsToStart(first)).toBe(0);
  expect(secondsToStart(first + 5n)).toBe(0);
});
