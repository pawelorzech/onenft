/**
 * What the chain says about one wallet's days, as short sentences. Every fact
 * is a count or a day number read from ownership and claim logs; none of them
 * is worth anything, and there is nothing to unlock. A wallet with no days has
 * no facts.
 */
import { knotFor, PALETTES } from "./knot.ts";
import { dayByNumber, type Day } from "./chain.ts";
import type { ChainState } from "./contract.ts";
import { isAuthorDay } from "./autoclaim.ts";
import { odds } from "./odds.ts";
import type { Address } from "viem";

export type Fact = {
  kind: "first" | "run" | "source" | "fastest" | "palettes" | "rare" | "author-days";
  /** Plain text, no markup. */
  text: string;
  /** The days the fact points at, ascending. */
  days: number[];
};

/** A trait value this rare or rarer counts as rare. Palettes and grids are left out: every day has one. */
const RARE = 1 / 8;
const RARE_KEYS = ["weave", "symmetry", "accent", "style", "ground"];

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function afterMidnightShort(s: number): string {
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

function rareValues(): Map<string, Set<string>> {
  const o = odds();
  const m = new Map<string, Set<string>>();
  for (const key of RARE_KEYS) m.set(key, new Set(o[key].filter(([v, p]) => v !== "none" && p <= RARE).map(([v]) => v)));
  return m;
}

export function holderFacts(who: Address, today: Day, chain: ChainState): Fact[] {
  const me = who.toLowerCase();
  const mine = [...chain.owners].filter(([, o]) => o.toLowerCase() === me).map(([n]) => n).sort((a, b) => a - b);
  if (!mine.length) return [];
  const facts: Fact[] = [];
  const author = chain.author.toLowerCase() === me;

  if (mine.includes(1)) facts.push({ kind: "first", text: "Holds day 1, the first knot.", days: [1] });

  // Longest run of consecutive days.
  let best: [number, number] = [mine[0], mine[0]], cur: [number, number] = [mine[0], mine[0]];
  for (const n of mine.slice(1)) {
    cur = n === cur[1] + 1 ? [cur[0], n] : [n, n];
    if (cur[1] - cur[0] > best[1] - best[0]) best = cur;
  }
  const len = best[1] - best[0] + 1;
  if (len >= 2) facts.push({ kind: "run", text: `Longest run: ${len} days in a row, day ${best[0]} to ${best[1]}.`, days: Array.from({ length: len }, (_, i) => best[0] + i) });

  // Claimed at the source or came later. Only days the log scan has reached count.
  const known = mine.filter((n) => chain.claims.has(n));
  const claimed = known.filter((n) => chain.claims.get(n)!.to.toLowerCase() === me);
  const later = known.filter((n) => chain.claims.get(n)!.to.toLowerCase() !== me);
  if (known.length) {
    const parts = [claimed.length ? `Claimed ${claimed.length} ${plural(claimed.length, "day", "days")} at the source` : "", later.length ? `${claimed.length ? "" : "Took "}${later.length} ${plural(later.length, "day", "days")} ${claimed.length ? "came later" : "from earlier holders"}` : ""].filter(Boolean);
    facts.push({ kind: "source", text: `${parts.join(", ")}.`, days: known });
  }

  // The fastest claim after midnight, among the days this wallet claimed itself.
  if (claimed.length) {
    let fast = claimed[0], fastS = Infinity;
    for (const n of claimed) {
      const s = chain.claims.get(n)!.at - Number(dayByNumber(n)!.startsAt);
      if (s < fastS) { fastS = s; fast = n; }
    }
    facts.push({ kind: "fastest", text: `Fastest claim: ${afterMidnightShort(fastS)} after midnight UTC, day ${fast}.`, days: [fast] });
  }

  // Palettes covered.
  const knots = mine.map((n) => [n, knotFor(dayByNumber(n)!.epoch)] as const);
  const palettes = new Set(knots.map(([, k]) => k.traits.palette));
  if (mine.length >= 2) facts.push({ kind: "palettes", text: `${palettes.size} of ${PALETTES.length} palettes.`, days: mine });

  // Rare trait values, one line, at most four.
  const rare = rareValues();
  const hits: { n: number; text: string }[] = [];
  for (const [n, k] of knots) {
    for (const key of RARE_KEYS) {
      const v = String((k.traits as any)[key]);
      if (rare.get(key)!.has(v)) hits.push({ n, text: key === "accent" ? `an accent in ${v} on day ${n}` : `${v} ${key} on day ${n}` });
    }
  }
  if (hits.length) {
    const shown = hits.slice(0, 4);
    const rest = hits.length - shown.length;
    facts.push({ kind: "rare", text: `Rare traits: ${shown.map((h) => h.text).join(", ")}${rest ? ` and ${rest} more` : ""}.`, days: [...new Set(hits.map((h) => h.n))] });
  }

  // Author days held by someone other than the author.
  if (!author) {
    const ad = mine.filter(isAuthorDay);
    if (ad.length) facts.push({ kind: "author-days", text: `Holds ${ad.length === 1 ? `author day ${ad[0]}` : `${ad.length} author days`}, passed on by the author.`, days: ad });
  }

  return facts;
}
