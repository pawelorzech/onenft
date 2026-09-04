import { renderKnot } from "./knot.ts";
import { currentBlock, dayOfBlock, dayByNumber, secondsToStart, setStartEpoch } from "./chain.ts";
import { chainState, contractEnabled, CONTRACT, CHAIN_ID } from "./contract.ts";
import { homePage, dayPage, howPage, notFound, beforeStart } from "./site.ts";

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
const redirect = (to: string) => new Response(null, { status: 301, headers: { location: to } });

/** Old Polish paths from the first hours of the site. */
const LEGACY: Record<string, string> = { "/format": "/how", "/dzis.svg": "/today.svg", "/zdrowie": "/health" };

if (contractEnabled()) {
  const st = await chainState();
  if (st) {
    setStartEpoch(st.startEpoch);
    console.log(`contract ${CONTRACT} on chain ${CHAIN_ID}, startEpoch ${st.startEpoch}, day ${st.day}`);
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

    const { block } = await currentBlock();
    let chain = null as Awaited<ReturnType<typeof chainState>>;
    try {
      chain = await chainState();
    } catch (e) {
      console.error("contract state unavailable:", (e as Error).message);
    }
    const today = chain ? (chain.day > 0 ? dayByNumber(chain.day) : null) : dayOfBlock(block);

    if (!today) {
      const dayOne = dayByNumber(1)!;
      if (path === "/health") return new Response(`ok, before day one, block ${block}`);
      if (path === "/how") return html(howPage(dayOne));
      if (path === "/today.svg") return svg(renderKnot(dayOne.firstBlock).svg, false);
      return html(beforeStart(secondsToStart(block), dayOne));
    }

    if (path === "/") return html(homePage(today, block, chain));
    if (path === "/how") return html(howPage(today));
    if (path === "/today.svg") return svg(renderKnot(today.firstBlock).svg, false);
    if (path === "/health") return new Response(`ok, day ${today.n}, block ${block}${chain ? `, contract ${chain.address}` : ""}`);

    const m = path.match(/^\/day\/(\d{1,6})(\.svg)?$/);
    if (m) {
      const n = Number(m[1]);
      const d = dayByNumber(n);
      if (!d || n > today.n) return html(notFound(today), 404);
      if (m[2]) return svg(renderKnot(d.firstBlock).svg, n < today.n);
      return html(dayPage(d, today, chain));
    }
    return html(notFound(today), 404);
  },
});

console.log(`onenft.click on :${PORT}`);
