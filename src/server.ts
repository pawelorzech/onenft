import { renderKnot } from "./knot.ts";
import { currentBlock, dayOfBlock, dayByNumber, secondsToStart } from "./chain.ts";
import { homePage, dayPage, formatPage, notFound, beforeStart } from "./site.ts";

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

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { block } = await currentBlock();
    const today = dayOfBlock(block);
    if (!today) {
      const dayOne = dayByNumber(1)!;
      if (url.pathname === "/zdrowie") return new Response(`ok przed startem, blok ${block}`);
      if (url.pathname === "/format") return html(formatPage(dayOne));
      if (url.pathname === "/dzis.svg") return svg(renderKnot(dayOne.firstBlock).svg, false);
      return html(beforeStart(secondsToStart(block), dayOne));
    }

    if (url.pathname === "/") return html(homePage(today, block));
    if (url.pathname === "/format") return html(formatPage(today));
    if (url.pathname === "/dzis.svg") return svg(renderKnot(today.firstBlock).svg, false);
    if (url.pathname === "/zdrowie") return new Response(`ok doba ${today.n} blok ${block}`);

    const m = url.pathname.match(/^\/doba\/(\d{1,6})(\.svg)?$/);
    if (m) {
      const n = Number(m[1]);
      const d = dayByNumber(n);
      if (!d || n > today.n) return html(notFound(today), 404);
      if (m[2]) return svg(renderKnot(d.firstBlock).svg, n < today.n);
      return html(dayPage(d, today));
    }
    return html(notFound(today), 404);
  },
});

console.log(`onenft.click na :${PORT}`);
