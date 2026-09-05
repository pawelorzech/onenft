/**
 * The inner pages: calendar, traits, holder, assets, embed. Same copy rules
 * as site.ts: plain words, active voice, no adverbs, no em dashes.
 */
import { knotFor, renderKnot, PALETTES, ACCENTS, GRIDS, WEAVES, SYMMETRIES, WEIGHTS, CAPS, STYLES, GROUNDS, type Knot } from "./knot.ts";
import { dayByNumber, dateOf, type Day } from "./chain.ts";
import type { ChainState, ChainStatus } from "./contract.ts";
import { SITE, PARENT, REPO, FILE_PREFIX, layout, topBar, label, shortAddr, isAuthor, explorer, opensea, openseaCollection, chainName, num, plural, stripSize, esc, afterMidnight, traitList, whoBlock, sizePicker, downloadBar, connectScript, downloadScript, nameHeading, staleNote, dayState, type Names, NO_NAMES } from "./site.ts";
import type { Address } from "viem";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Days after today that the calendar previews with the current renderer. */
export const PREVIEW_DAYS = 7;

function utcDate(epoch: bigint): Date {
  return new Date(Number(epoch) * 86400 * 1000);
}

/** One month as a 7-column grid. Days before day 1 and after the preview window are blank. */
function monthGrid(year: number, month: number, today: Day, chain: ChainState | null, dayOne: Day, status: ChainStatus | null): string {
  const first = new Date(Date.UTC(year, month, 1));
  const daysIn = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: string[] = DOW.map((d) => `<div class="dow">${d}</div>`);
  for (let i = 0; i < lead; i++) cells.push(`<div class="blank"></div>`);
  for (let dom = 1; dom <= daysIn; dom++) {
    const epoch = BigInt(Date.UTC(year, month, dom) / 1000 / 86400);
    const n = Number(epoch - dayOne.epoch) + 1;
    if (n < 1 || n > today.n + PREVIEW_DAYS) {
      cells.push(`<div class="blank"></div>`);
      continue;
    }
    if (n > today.n) {
      cells.push(`<div class="later"><span>${dom}</span></div>`);
      continue;
    }
    const gap = dayState(n, today.n, chain, status) === "gap";
    const title = gap ? `Day ${n}, unclaimed` : `Day ${n}`;
    cells.push(gap
      ? `<a class="hole" href="/day/${n}" title="${title}"><span>${dom}</span></a>`
      : `<a href="/day/${n}" title="${title}"><img src="/day/${n}.svg" alt="" loading="lazy"><span>${dom}</span></a>`);
  }
  while ((cells.length - 7) % 7 !== 0) cells.push(`<div class="blank"></div>`);
  return `<section><h3 class="syne">${MONTHS[month]} ${year}</h3><div class="cal">${cells.join("")}</div></section>`;
}

export function explorePage(today: Day, chain: ChainState | null = null, status: ChainStatus | null = null): string {
  const k = knotFor(today.epoch);
  const dayOne = dayByNumber(1)!;
  const start = utcDate(dayOne.epoch), end = utcDate(today.epoch + BigInt(PREVIEW_DAYS));
  const months: string[] = [];
  for (let y = end.getUTCFullYear(), m = end.getUTCMonth(); y > start.getUTCFullYear() || (y === start.getUTCFullYear() && m >= start.getUTCMonth()); m--) {
    if (m < 0) { m = 11; y--; }
    months.push(monthGrid(y, m, today, chain, dayOne, status));
  }
  const taken = chain ? chain.owners.size : 0;
  const gaps = chain ? Math.max(0, today.n - 1 - [...chain.owners.keys()].filter((n) => n < today.n).length) : 0;
  const preview: string[] = [];
  for (let n = today.n + 1; n <= today.n + PREVIEW_DAYS; n++) {
    const d = dayByNumber(n)!;
    const kk = renderKnot(d.epoch);
    preview.push(`<a href="/preview/${n}.svg"><img src="/preview/${n}.svg" alt="" loading="lazy"><div class="cap">day ${n}, ${kk.traits.palette}</div></a>`);
  }
  const body = `<main class="wide" id="main">
${topBar("Explore")}
${staleNote(status)}
<div><h2 class="syne">Every day so far</h2><p class="lead" style="margin-top:8px">${today.n} ${plural(today.n, "day", "days")} woven${chain ? `, ${taken} claimed, ${gaps} ${plural(gaps, "gap", "gaps")}` : ""}. Hatched days are gaps: the day ended without a claim, and it can no longer be minted. Dimmed days have not happened yet.</p></div>
${months.join("\n")}
<section><h3 class="syne">The next ${PREVIEW_DAYS} days</h3><p class="small" style="margin:6px 0 14px">The drawing exists before anyone sees it. One caveat: the drawing rules can still change for days nobody has claimed yet, so a preview is a promise only once its day arrives.</p><div class="strip">${preview.join("")}</div></section>
</main>`;
  return layout(`Explore | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/explore");
}

// ---- traits ----

type Count = Map<string, number>;

function odds(): Record<string, [string, number][]> {
  const tally = (xs: readonly (string | number)[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(String(x), (m.get(String(x)) ?? 0) + 1);
    return [...m].map(([k, v]) => [k, v / xs.length] as [string, number]);
  };
  return {
    palette: PALETTES.map((p) => [p.name, 1 / PALETTES.length]),
    grid: tally(GRIDS).map(([g, o]) => [`${g} by ${g}`, o]),
    weave: tally(WEAVES),
    symmetry: tally(SYMMETRIES),
    weight: tally(WEIGHTS),
    caps: tally(CAPS),
    accent: [["none", 15 / 16], ...ACCENTS.map((a) => [a.name, 1 / 64] as [string, number])],
    style: tally(STYLES),
    ground: tally(GROUNDS),
    inverted: [["no", 3 / 4], ["yes", 1 / 4]],
  };
}

const TRAIT_NOTES: Record<string, string> = {
  palette: "Sixteen palettes. Day 1 could only draw the first eight.",
  grid: "Cells per side. The image is always 512 pixels; a 12 by 12 day has a finer cord.",
  weave: "The shapes a cell may take. Arcs is classic Truchet. Passes adds straight runs. Loose leaves cells empty. Cross adds crossings.",
  symmetry: "Mirror copies the left half to the right. Quad copies one quarter four ways. Turn rotates one quarter around the center.",
  weight: "How thick the cord is.",
  caps: "Round or cut ends where a cord leaves the frame.",
  accent: "One day in sixteen paints a few cells in a third color.",
  style: "How the cord is drawn. Double splits it with a hairline. Dashed cuts it into dashes. Solid drops the cord for the oldest Truchet tile: a filled triangle in each cell.",
  ground: "What sits under the knot: nothing, a dot at every cell center, or a hairline lattice.",
  inverted: "One day in four swaps background and cord, so a dark palette turns light and a light one turns dark.",
};

export function traitsPage(today: Day, chain: ChainState | null = null): string {
  const k = knotFor(today.epoch);
  const seen: Record<string, Count> = {};
  const takenSeen: Record<string, Count> = {};
  const firstDay: Record<string, Map<string, number[]>> = {};
  for (let n = 1; n <= today.n; n++) {
    const kk = knotFor(dayByNumber(n)!.epoch);
    const taken = !chain || chain.owners.has(n);
    for (const [key, raw] of Object.entries(kk.traits)) {
      const v = key === "grid" ? `${raw} by ${raw}` : key === "inverted" ? (raw ? "yes" : "no") : String(raw);
      (seen[key] ??= new Map()).set(v, (seen[key].get(v) ?? 0) + 1);
      if (taken) (takenSeen[key] ??= new Map()).set(v, (takenSeen[key].get(v) ?? 0) + 1);
      const f = (firstDay[key] ??= new Map());
      const list = f.get(v) ?? [];
      if (list.length < 4) f.set(v, [...list, n]);
    }
  }
  const o = odds();
  const sections = Object.keys(o).map((key) => {
    const rows = o[key].map(([v, p]) => {
      const days = firstDay[key]?.get(v) ?? [];
      const links = days.map((n) => `<a href="/day/${n}">${n}</a>`).join(", ");
      return `<tr><td>${v}</td><td class="n">${Math.round(p * 1000) / 10}%</td><td class="n">${seen[key]?.get(v) ?? 0}</td>${chain ? `<td class="n">${takenSeen[key]?.get(v) ?? 0}</td>` : ""}<td class="small">${links}</td></tr>`;
    });
    return `<section id="${key}"><h3 class="syne">${key}</h3><p class="small" style="margin:6px 0 12px">${TRAIT_NOTES[key]}</p><div class="scroll"><table class="tr"><thead><tr><th>value</th><th style="text-align:right">odds</th><th style="text-align:right">so far</th>${chain ? `<th style="text-align:right">claimed</th>` : ""}<th>days</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></section>`;
  });
  const body = `<main class="wide" id="main">
${topBar("Traits")}
<div><h2 class="syne">Traits</h2><p class="lead" style="margin-top:8px">Ten traits, all drawn from the day number, all written into the token's metadata. Odds are the share of days each value gets in the long run. So far counts the ${today.n} ${plural(today.n, "day", "days")} woven to date${chain ? ", claimed counts only claimed days" : ""}. Day 1 came from a simpler machine and reads as 8 by 8, passes, no symmetry, cord, flat.</p></div>
${sections.join("\n")}
<p class="small">Tables from <a href="/spec.json">spec.json</a>. <a href="/how">How the machine works</a>.</p>
</main>`;
  return layout(`Traits | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/traits");
}

// ---- holder ----

/** The way in: connect a wallet or type an address, then land on that wallet's page. */
export function yoursPage(today: Day, chain: ChainState | null = null, status: ChainStatus | null = null, bad: string | null = null): string {
  const k = knotFor(today.epoch);
  const body = `<main class="wide" id="main">
${topBar("Your wallet")}
${staleNote(status)}
<div><h2 class="syne">Your days</h2><p class="lead" style="margin-top:8px">Connect a wallet or type an address, and this page lists every knot it holds, each one ready to save as SVG, PNG or JPEG.</p></div>
${bad !== null ? `<p class="note" role="alert">"${esc(bad)}" is not a wallet address or an ENS name. An address is 42 characters starting with 0x; a name ends in .eth.</p>` : ""}
${whoBlock(chain, status)}
<p class="small">Viewing a wallet needs no transaction and no signature. Its public address appears in the page URL and is sent to this site to load its tokens. The same list is on <a href="https://${PARENT}/wallet">${PARENT}</a> for every collection at once; each site connects on its own.</p>
</main>
${connectScript("/", true)}`;
  return layout(`Your days | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/yours");
}

export function holderPage(who: Address, handle: string, today: Day, chain: ChainState, names: Names = NO_NAMES, status: ChainStatus | null = null): string {
  const k = knotFor(today.epoch);
  const mine = [...chain.owners].filter(([, o]) => o.toLowerCase() === who.toLowerCase()).map(([n]) => n).sort((a, b) => b - a);
  const rawName = names.get(who.toLowerCase()) ?? shortAddr(who);
  const name = esc(rawName);
  const author = isAuthor(chain, who);
  const rows = mine.map((n) => {
    const d = dayByNumber(n)!;
    const kk = knotFor(d.epoch);
    const c = chain.claims.get(n);
    const since = c ? `${dateOf(d.epoch)}, ${afterMidnight(c.at, d.startsAt)}` : dateOf(d.epoch);
    const links = [c ? `<a href="${explorer(chain.chainId)}/tx/${c.tx}">Transaction</a>` : "", `<a href="${opensea(chain, n)}">OpenSea</a>`, `<a href="/day/${n}">Day page</a>`].filter(Boolean).join(", ");
    return `<div class="tok" id="day-${n}">
<a href="/day/${n}"><img src="/day/${n}.svg" width="256" height="256" alt="Day ${n}" loading="lazy"></a>
<div class="meta">
<div class="num syne">Day ${n}<span class="since">${since}</span></div>
${traitList(kk)}
<p class="small" style="margin:0">${links}.</p>
${downloadBar(n, kk.palette.bg)}
</div>
</div>`;
  });
  const body = `<main class="wide" id="main">
${topBar(rawName)}
${staleNote(status)}
<div><h2 class="syne">${nameHeading(rawName)}</h2><p class="lead" style="margin-top:8px">${author ? "The author. Every tenth day up to day 1000 lands here." : `${mine.length} ${plural(mine.length, "day", "days")} of ${today.n}.`}${handle.toLowerCase() !== who.toLowerCase() ? ` <span class="small">${shortAddr(who)}</span>` : ""}</p></div>
${whoBlock(chain)}
${rows.length ? `${sizePicker()}\n<div>${rows.join("\n")}</div>` : `<p>No days here yet. <a href="/">Today's knot</a> may still be available.</p>`}
<nav class="nav small" style="padding-top:20px;border-top:1px solid var(--line)" aria-label="Wallet links"><a href="${explorer(chain.chainId)}/address/${who}">Basescan</a><a href="${chain.chainId === 8453 ? `https://opensea.io/${who}` : `https://testnets.opensea.io/${who}`}">OpenSea</a><a href="/api/holder/${who}">JSON</a><a href="https://${PARENT}/wallet/${who}">This wallet on ${PARENT}</a></nav>
</main>
${connectScript("/")}
${rows.length ? downloadScript() : ""}`;
  return layout(`${rawName} | ${SITE}`, k.palette, body, `/day/${today.n}.png`, `/${handle}`);
}

// ---- assets ----

export function assetsPage(today: Day, chain: ChainState | null = null): string {
  const k = knotFor(today.epoch);
  const iframe = esc(`<iframe src="https://${SITE}/embed" width="320" height="380" style="border:0" title="Today's knot from knot.onenft.click" loading="lazy"></iframe>`);
  const img = esc(`<img src="https://${SITE}/today.svg" width="256" height="256" alt="Today's knot from knot.onenft.click">`);
  const body = `<main class="prose" id="main">
${topBar("Assets")}
<h2 class="syne">Take it. It is yours.</h2>
<p>Every knot, the generator, the contracts, the wordmark and the text of this site are <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>: no credit needed, no permission to ask. Print it, remix it, mint it elsewhere, put it on a shirt. Owning a day gives you the token; the image belongs to everyone. The site's code in the repository carries its own license file; the fonts Syne and Newsreader are under the SIL Open Font License; the libraries the site uses keep their own licenses.</p>
<h2 class="syne">Images</h2>
<p>Any day as SVG at <code>/day/N.svg</code>, as a 1024 pixel PNG at <code>/day/N-1024.png</code>, and as a 1200 by 630 link card at <code>/day/N.png</code>. Today: <a href="/today.svg" download="${FILE_PREFIX}-today.svg">SVG</a>, <a href="/today.png">card</a>. The SVG is the same file the contract holds.</p>
<h2 class="syne">Wordmark</h2>
<p>The domain is the wordmark, set in Syne 800. <a href="/wordmark.svg" download="onenft-wordmark.svg">wordmark.svg</a> in today's colors.</p>
<h2 class="syne">Put today's knot on your page</h2>
<p>An image that changes every midnight UTC:</p>
<pre class="snip">${img}</pre>
<p>Or a small frame with the day number and a link:</p>
<pre class="snip">${iframe}</pre>
<h2 class="syne">Data</h2>
<p><a href="/api/today">/api/today</a> and <code>/api/day/N</code> return one day: number, date, traits, owner, claim transaction, image links. <a href="/api/days">/api/days</a> lists every day so far; <a href="/api/summary">/api/summary</a> is the short form: today, the counts, the palette. <code>/api/holder/ADDRESS</code> lists one wallet's days. Every answer carries a <code>chain</code> block that says how old the ownership data is. All JSON, open to any origin.</p>
<p><a href="/spec.json">/spec.json</a> holds the trait tables and palettes, so you can port the generator. <a href="/feed.xml">RSS</a> carries one item a day. <a href="/calendar.ics">calendar.ics</a> is a daily event at midnight UTC you can subscribe to, so you never miss a day.</p>
<h2 class="syne">Code and contract</h2>
<p>The generator in TypeScript and Solidity, the site and the contracts: <a href="${REPO}">${REPO.replace("https://", "")}</a>.${chain ? ` Token contract <a href="${explorer(chain.chainId)}/address/${chain.address}">${chain.address}</a> on ${chainName(chain.chainId)}. <a href="${openseaCollection(chain)}">Collection on OpenSea</a>.` : ""}</p>
<p class="small"><a href="/">Back to the fabric</a></p>
</main>`;
  return layout(`Assets | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/assets");
}

/** A small page for iframes: today's knot, the day number, a link back. */
export function embedPage(today: Day, chain: ChainState | null = null, names: Names = NO_NAMES): string {
  const k = knotFor(today.epoch);
  const o = chain?.owners.get(today.n);
  const state = !chain ? "" : o ? (isAuthor(chain, o) ? "the author's" : `held by ${label(o, names)}`) : "available today";
  const body = `<main id="main" style="padding:12px;display:flex;flex-direction:column;gap:8px;max-width:320px">
<a href="https://${SITE}/day/${today.n}" target="_top" style="display:block;aspect-ratio:1;box-shadow:0 0 0 1px var(--line)">${stripSize(k.svg)}</a>
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span class="syne" style="font-weight:800;font-size:22px">Day ${today.n}</span><span class="small">${state}</span></div>
<a class="small" href="https://${SITE}/" target="_top">${SITE}, one knot a day</a>
</main>`;
  return layout(`Day ${today.n} | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/embed");
}

/** The domain as an SVG wordmark in a palette's colors. */
export function wordmarkSvg(k: Knot): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="160" viewBox="0 0 880 160"><rect width="880" height="160" fill="${k.palette.bg}"/><text x="40" y="104" font-family="Syne, system-ui, sans-serif" font-weight="800" font-size="72" letter-spacing="-2" fill="${k.palette.cord}">${SITE}</text></svg>`;
}

