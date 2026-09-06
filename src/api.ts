/**
 * JSON for other people's code, the spec, and the calendar feed.
 * Everything here is derived; nothing is stored.
 */
import { knotFor, PALETTES, ACCENTS, GRIDS, WEAVES, SYMMETRIES, WEIGHTS, CAPS, STYLES, GROUNDS, V4_FROM_EPOCH } from "./knot.ts";
import { dayByNumber, dateOf, type Day } from "./chain.ts";
import type { ChainState, ChainStatus } from "./contract.ts";
import { SITE, isAuthor, opensea, explorer, dayState, type Names, NO_NAMES } from "./site.ts";
import type { Address } from "viem";
import { holderFacts } from "./facts.ts";

/**
 * How old the ownership data in an answer is. `known` false means no chain
 * read ever succeeded, so every state below reads "unknown", never "gap".
 */
export function chainBlock(status: ChainStatus | null) {
  if (!status?.configured) return { configured: false, known: false, stale: false, readAt: null, ageSeconds: null, error: null };
  return { configured: true, known: status.known, stale: status.stale, readAt: status.readAt === null ? null : new Date(status.readAt).toISOString(), ageSeconds: status.ageSeconds, error: status.error };
}

export function dayJson(d: Day, today: Day, chain: ChainState | null, names: Names = NO_NAMES, status: ChainStatus | null = null) {
  const k = knotFor(d.epoch);
  const owner = chain?.owners.get(d.n);
  const claim = chain?.claims.get(d.n);
  return {
    day: d.n,
    epoch: Number(d.epoch),
    date: new Date(Number(d.startsAt) * 1000).toISOString().slice(0, 10),
    startsAt: Number(d.startsAt),
    isToday: d.n === today.n,
    authorDay: d.n % 10 === 0 && d.n <= 1000,
    renderer: k.version,
    palette: k.palette,
    traits: k.traits,
    state: stateWord(d.n, today.n, chain, status),
    owner: owner ?? null,
    ownerName: owner ? names.get(owner.toLowerCase()) ?? null : null,
    claim: claim ? { tx: claim.tx, block: Number(claim.block), at: claim.at, secondsAfterMidnight: claim.at - Number(d.startsAt), explorer: `${explorer(chain!.chainId)}/tx/${claim.tx}` } : null,
    image: `https://${SITE}/day/${d.n}.svg`,
    card: `https://${SITE}/day/${d.n}.png`,
    url: `https://${SITE}/day/${d.n}`,
    opensea: chain && owner ? opensea(chain, d.n) : null,
    bytes: k.svg.length,
    chain: chainBlock(status),
  };
}

/** The API's word for a day's state. "taken" and "free" stay for readers of the first version; "unknown" is new and means the chain did not answer. */
export function stateWord(n: number, today: number, chain: ChainState | null, status: ChainStatus | null): "author" | "taken" | "gap" | "free" | "unknown" | null {
  if (!chain && !status?.configured) return null;
  const s = dayState(n, today, chain, status);
  return s === "claimed" ? "taken" : s === "available" ? "free" : s;
}

export function daysJson(today: Day, chain: ChainState | null, names: Names = NO_NAMES, status: ChainStatus | null = null) {
  const days = [];
  for (let n = 1; n <= today.n; n++) {
    const j = dayJson(dayByNumber(n)!, today, chain, names, status);
    days.push({ day: j.day, date: j.date, renderer: j.renderer, traits: j.traits, state: j.state, owner: j.owner, ownerName: j.ownerName, tx: j.claim?.tx ?? null, image: j.image });
  }
  return { site: SITE, today: today.n, contract: chain ? { address: chain.address, chainId: chain.chainId, renderer: chain.renderer } : null, chain: chainBlock(status), days };
}

/** Counts over every day before today. Null when the chain never answered: an unknown count is not zero. */
export function tallyOf(today: Day, chain: ChainState | null): { taken: number; gaps: number; author: number } | null {
  if (!chain) return null;
  let taken = 0, gaps = 0, author = 0;
  for (let n = 1; n <= today.n; n++) {
    const o = chain.owners.get(n);
    if (o) { taken++; if (isAuthor(chain, o)) author++; }
    else if (n < today.n) gaps++;
  }
  return { taken, gaps, author };
}

/** The short form for the hub: today, the counts and the palette in one small answer, instead of every day. */
export function summaryJson(today: Day, chain: ChainState | null, status: ChainStatus | null = null) {
  const k = knotFor(today.epoch);
  return {
    site: SITE,
    kind: "daily",
    today: dayJson(today, today, chain, NO_NAMES, status),
    tally: tallyOf(today, chain),
    palette: k.palette,
    contract: chain ? { address: chain.address, chainId: chain.chainId, renderer: chain.renderer } : null,
    chain: chainBlock(status),
  };
}

export function holderJson(who: Address, today: Day, chain: ChainState, names: Names = NO_NAMES, status: ChainStatus | null = null) {
  const mine = [...chain.owners].filter(([, o]) => o.toLowerCase() === who.toLowerCase()).map(([n]) => n).sort((a, b) => a - b);
  return { address: who, name: names.get(who.toLowerCase()) ?? null, author: isAuthor(chain, who), chain: chainBlock(status), facts: holderFacts(who, today, chain), days: mine.map((n) => dayJson(dayByNumber(n)!, today, chain, names, status)) };
}

export function specJson() {
  return {
    site: SITE,
    version: 4,
    v4FromEpoch: Number(V4_FROM_EPOCH),
    license: "CC0-1.0",
    clock: "epoch = block.timestamp / 86400; day = epoch - startEpoch + 1; startEpoch = 20701 (2026-09-05 UTC)",
    random: "splitmix64: x += 0x9e3779b97f4a7c15; x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9; x = (x ^ (x >> 27)) * 0x94d049bb133111eb; return x ^ (x >> 31). Counter starts at mix(epoch); each draw increments the counter and takes the top bits.",
    draws: ["palette: 8 bits mod 16", "grid: 4 bits into GRIDS", "weave: 3 bits into WEAVES", "symmetry: 3 bits into SYMMETRIES", "weight: 2 bits into WEIGHTS", "caps: 2 bits, 0 is butt", "accent: 4 bits, 0 means an accent, then 2 bits into ACCENTS", "style: 3 bits into STYLES", "ground: 3 bits into GROUNDS", "inverted: 2 bits, 0 swaps bg and cord", "cells: 3 bits per free cell in row order, then 4 bits per non-empty cell on accent days (0 marks the cell)"],
    cell: 64,
    states: { 0: "arcs, left to top and bottom to right", 1: "arcs, top to right and left to bottom", 2: "vertical pass", 3: "horizontal pass", 4: "empty", 5: "crossing" },
    stateOf: { arcs: "v & 1", passes: "v & 3", loose: "v < 4 ? v : v < 6 ? v - 4 : 4", cross: "v < 4 ? v : v < 6 ? v - 4 : 5" },
    symmetry: { mirror: "right half copies the left, arcs flip", quad: "three quarters copy the top left, arcs flip when exactly one axis is mirrored", turn: "three quarters are the top left turned 90, 180 and 270 degrees; arcs and passes flip on 90 and 270" },
    widths: { thin: [5, 13], regular: [9, 21], heavy: [15, 30] },
    styles: { cord: "shadow under cord", double: "cord with a bg hairline of width floor(cord/3) on top", dashed: "cord with stroke-dasharray 2w 2w", solid: "no strokes; each non-empty cell is a filled triangle, orientation state & 3" },
    grounds: { flat: "nothing", dots: "a circle r=3 in shade at every cell center", lattice: "1px shade lines between cells" },
    tables: { GRIDS, WEAVES, SYMMETRIES, WEIGHTS, CAPS, STYLES, GROUNDS, PALETTES, ACCENTS },
    v2: { note: "day 1 only: 8 palettes (the first eight), grid 8, weave passes (2 bits per cell), no symmetry, regular, round", source: "src/knot_v2.ts" },
  };
}

/** One daily event at midnight UTC, forever. Subscribe once. */
export function calendarIcs(dayOne: Day): string {
  const stamp = new Date(Number(dayOne.startsAt) * 1000).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE}//one knot a day//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${SITE}`,
    "X-WR-CALDESC:One Truchet knot a day. Claim it before midnight UTC.",
    "BEGIN:VEVENT",
    `UID:daily@${SITE}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    "DURATION:PT15M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:A new knot at knot.onenft.click",
    `DESCRIPTION:A new day, a new knot. Claim it before midnight UTC. 0 ETH mint fee, network gas only: https://${SITE}/`,
    `URL:https://${SITE}/`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

