import { renderKnot } from "./knot.ts";
import { nowSeconds, dayOfTime, dayByNumber, secondsToStart, setStartEpoch } from "./chain.ts";
import { chainState, contractEnabled, CONTRACT, CHAIN_ID } from "./contract.ts";
import { homePage, dayPage, howPage, notFound, beforeStart, feedXml } from "./site.ts";
import { dayPng } from "./image.ts";
import { ensNames } from "./ens.ts";
import { startAutoclaim } from "./autoclaim.ts";
import type { Hex } from "viem";

const PORT = Number(process.env.PORT ?? 3000);

const html = (s: string, status = 200) =>
  new Response(s, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const svg = (s: string, immutable: boolean) =>
  new Response(s, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=60",
    },
  });
const png = (b: Uint8Array, immutable: boolean) =>
  new Response(b, { headers: { "content-type": "image/png", "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=300" } });
const redirect = (to: string) => new Response(null, { status: 301, headers: { location: to } });

/** Old Polish paths from the first hours of the site. */
const LEGACY: Record<string, string> = { "/format": "/how", "/dzis.svg": "/today.svg", "/zdrowie": "/health" };

if (contractEnabled()) {
  const st = await chainState();
  if (st) {
    setStartEpoch(st.startEpoch);
    console.log(`contract ${CONTRACT} on chain ${CHAIN_ID}, startEpoch ${st.startEpoch}, day ${st.day}`);
  }
  if (process.env.DEPLOYER_KEY) startAutoclaim(process.env.DEPLOYER_KEY as Hex);
}

/** ENS names for every owner the page will show; empty map on any failure. */
async function namesFor(chain: Awaited<ReturnType<typeof chainState>>) {
  if (!chain) return new Map<string, string>();
  try {
    return await ensNames([...chain.owners.values()]);
  } catch {
    return new Map<string, string>();
  }
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (LEGACY[path]) return redirect(LEGACY[path]);
    const legacyDay = path.match(/^\/doba\/(\d{1,6})(\.svg)?$/);
    if (legacyDay) return redirect(`/day/${legacyDay[1]}${legacyDay[2] ?? ""}`);

    const now = nowSeconds();
    let chain = null as Awaited<ReturnType<typeof chainState>>;
    try {
      chain = await chainState();
    } catch (e) {
      console.error("contract state unavailable:", (e as Error).message);
    }
    const today = chain ? (chain.day > 0 ? dayByNumber(chain.day) : null) : dayOfTime(now);

    if (!today) {
      const dayOne = dayByNumber(1)!;
      if (path === "/health") return new Response(`ok, before day one, ${now}`);
      if (path === "/how") return html(howPage(dayOne));
      if (path === "/today.svg") return svg(renderKnot(dayOne.epoch).svg, false);
      if (path === "/today.png") return png(dayPng(dayOne, false), false);
      return html(beforeStart(secondsToStart(now), dayOne));
    }

    if (path === "/") return html(homePage(today, now, chain, await namesFor(chain)));
    if (path === "/feed.xml") return new Response(feedXml(today, chain), { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
    if (path === "/today.png") return png(dayPng(today, false), false);
    if (path === "/how") return html(howPage(today));
    if (path === "/today.svg") return svg(renderKnot(today.epoch).svg, false);
    if (path === "/health") return new Response(`ok, day ${today.n}, ${now}${chain ? `, contract ${chain.address}` : ""}`);

    const m = path.match(/^\/day\/(\d{1,6})(\.svg|\.png)?$/);
    if (m) {
      const n = Number(m[1]);
      const d = dayByNumber(n);
      if (!d || n > today.n) return html(notFound(today), 404);
      if (m[2] === ".svg") return svg(renderKnot(d.epoch).svg, n < today.n);
      if (m[2] === ".png") return png(dayPng(d, n < today.n), n < today.n);
      return html(dayPage(d, today, chain, await namesFor(chain)));
    }
    return html(notFound(today), 404);
  },
});

console.log(`onenft.click on :${PORT}`);
