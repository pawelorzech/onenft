import { expect, test } from "bun:test";
import { holderFacts } from "./facts.ts";
import { dayByNumber } from "./chain.ts";
import { knotFor } from "./knot.ts";
import type { ChainState, Claim } from "./contract.ts";

const A = "0x2222222222222222222222222222222222222222" as const;
const B = "0x4444444444444444444444444444444444444444" as const;
const AUTHOR = "0xAAAA000000000000000000000000000000000001" as const;
function chain(day: number, owners: Record<number, string>, claims: Partial<Claim>[] = []): ChainState {
  return {
    address: "0x1111111111111111111111111111111111111111", chainId: 84532, day, startEpoch: 20701n, author: AUTHOR,
    renderer: "0x3333333333333333333333333333333333333333", rendererLocked: false, secondsLeft: 2000, readAt: Date.now(),
    owners: new Map(Object.entries(owners).map(([k, v]) => [Number(k), v as `0x${string}`])),
    claims: new Map(claims.map((c) => [c.day!, { tx: "0xabc", block: 1n, renderer: "0x3333333333333333333333333333333333333333", at: Number(dayByNumber(c.day!)!.startsAt) + 60, ...c } as Claim])),
  };
}

test("no days, no facts", () => {
  expect(holderFacts(A, dayByNumber(9)!, chain(9, { 2: B }))).toEqual([]);
});

test("day 1, the longest run, palettes, and claims at the source", () => {
  const f = holderFacts(A, dayByNumber(9)!, chain(9, { 1: A, 3: A, 4: A, 5: A, 7: B, 8: A }, [
    { day: 1, to: A, at: Number(dayByNumber(1)!.startsAt) + 1087 },
    { day: 3, to: B },
    { day: 4, to: A, at: Number(dayByNumber(4)!.startsAt) + 42 },
  ]));
  const kinds = f.map((x) => x.kind);
  expect(kinds.slice(0, 6)).toEqual(["first", "run", "claimed", "later", "fastest", "palettes"]);
  expect(f[1].text).toBe("Longest run: 3 days in a row, day 3 to 5.");
  expect(f[1].days).toEqual([3, 4, 5]);
  expect(f[2].text).toBe("Claimed 2 days at the source.");
  expect(f[3].text).toBe("Took 1 day from earlier holders.");
  expect(f[4].figure).toBe("42 s");
  expect(f[4].text).toBe("Fastest claim: 42 s after midnight UTC, day 4.");
  expect(f[5].figure).toMatch(/^\d+ of 16$/);
});

test("only days from earlier holders, and an author day passed on", () => {
  const f = holderFacts(A, dayByNumber(25)!, chain(25, { 10: A, 20: A }, [{ day: 10, to: AUTHOR }, { day: 20, to: AUTHOR }]));
  expect(f.find((x) => x.kind === "later")!.text).toBe("Took 2 days from earlier holders.");
  expect(f.find((x) => x.kind === "claimed")).toBeUndefined();
  expect(f.find((x) => x.kind === "fastest")).toBeUndefined();
  expect(f.find((x) => x.kind === "author-days")!.text).toBe("Holds 2 author days, passed on by the author.");
  // The author's own page never says the author passed days to the author.
  expect(holderFacts(AUTHOR, dayByNumber(25)!, chain(25, { 10: AUTHOR })).find((x) => x.kind === "author-days")).toBeUndefined();
});

test("a single day gets no run and no palette count", () => {
  const f = holderFacts(A, dayByNumber(9)!, chain(9, { 5: A }));
  expect(f.map((x) => x.kind)).not.toContain("run");
  expect(f.map((x) => x.kind)).not.toContain("palettes");
});

test("rare traits name the value and the day, and stop at four", () => {
  // Find days in the first 400 whose symmetry is quad or turn; the fact must name them.
  const rareDays: number[] = [];
  for (let n = 2; n <= 400 && rareDays.length < 6; n++) {
    const t = knotFor(dayByNumber(n)!.epoch).traits;
    if (t.symmetry === "quad" || t.symmetry === "turn") rareDays.push(n);
  }
  expect(rareDays.length).toBe(6);
  const f = holderFacts(A, dayByNumber(400)!, chain(400, Object.fromEntries(rareDays.map((n) => [n, A]))));
  const rare = f.find((x) => x.kind === "rare")!;
  expect(rare.text).toMatch(/^Rare traits: /);
  expect(rare.text).toContain(`on day ${rareDays[0]}`);
  expect(rare.text).toMatch(/ and \d+ more\.$/);
  expect(rare.days).toEqual(expect.arrayContaining(rareDays));
});
