/**
 * Page HTML. One rule governs color: the page has no palette of its own.
 * It takes today's palette from the renderer, so it looks different in each
 * of the eight epochs. There is no light or dark mode.
 *
 * Copy rules: plain words, active voice, no adverbs, no em dashes, nothing
 * a reader could misunderstand. Facts (numbers, addresses, paths) stay exact.
 */
import { renderKnot, type Palette, PALETTES } from "./knot.ts";
import { dayByNumber, secondsLeft, type Day } from "./chain.ts";
import type { ChainState } from "./contract.ts";

export const SITE = "onenft.click";
const REPO = "https://github.com/pawelorzech/onenft";

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function explorer(chainId: number): string {
  return chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
}
function chainName(chainId: number): string {
  return chainId === 8453 ? "Base" : "Base Sepolia";
}
const num = (n: number | bigint) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
/** Color between a and b: t=0 gives a, t=1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a), [br, bg, bb] = hex(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}
export function paletteIndex(p: Palette): number {
  return PALETTES.findIndex((q) => q.name === p.name) + 1;
}

function css(p: Palette): string {
  const fg = p.cord, bg = p.bg;
  return `
:root{--bg:${bg};--fg:${fg};--muted:${mix(fg, bg, 0.38)};--line:${mix(fg, bg, 0.82)};--soft:${mix(fg, bg, 0.955)}}
*{box-sizing:border-box}
html{background:var(--bg);color:var(--fg);font-family:"Newsreader",Georgia,serif;font-size:17px;line-height:1.5}
body{margin:0;min-height:100vh}
a{color:inherit}
a:focus-visible,button:focus-visible{outline:3px solid var(--fg);outline-offset:3px}
.syne{font-family:"Syne",system-ui,sans-serif}
.page{display:grid;grid-template-columns:344px minmax(0,1fr);min-height:100vh}
aside{border-right:1px solid var(--line);padding:38px 32px}
aside .stick{position:sticky;top:38px;display:flex;flex-direction:column;gap:28px}
.mark{font-weight:800;font-size:20px;letter-spacing:-.01em;text-decoration:none}
h1{font-weight:800;font-size:37px;line-height:.94;letter-spacing:-.045em;margin:0}
.lead{color:var(--muted);margin:0}
hr{border:0;border-top:1px solid var(--line);margin:0;width:100%}
.big{font-weight:700;font-size:40px;line-height:1}
.small{font-size:15px;color:var(--muted)}
.cta{display:flex;align-items:center;justify-content:center;height:58px;background:var(--fg);color:var(--bg);text-decoration:none;font-weight:700;font-size:18px}
.cta.ghost{background:transparent;color:var(--fg);border:1px solid var(--fg)}
button.cta{border:0;cursor:pointer;width:100%;font-family:"Syne",system-ui,sans-serif}
button.cta[disabled]{opacity:.55;cursor:default}
.msg{font-size:15px;color:var(--muted);min-height:1.5em;margin:0}
.testnet{display:inline-block;padding:3px 8px;border:1px solid var(--line);font-size:13px;color:var(--muted)}
.today{padding:38px 34px 34px;border-bottom:1px solid var(--line);display:flex;gap:32px;align-items:flex-start}
.today .knot{width:396px;height:396px;flex-shrink:0;box-shadow:0 0 0 1px var(--line)}
.today .knot svg{display:block;width:100%;height:100%}
.num{font-weight:800;font-size:62px;line-height:.95;letter-spacing:-.03em}
.row{display:flex;align-items:center;gap:22px;padding:0 34px;height:128px;border-bottom:1px solid var(--line);text-decoration:none}
.row:hover{background:var(--soft)}
.row.hole{background:repeating-linear-gradient(90deg,transparent 0 20px,var(--soft) 20px 40px);color:var(--muted)}
.row img,.row .ph{width:92px;height:92px;display:block;flex-shrink:0}
.row .n{font-weight:700;font-size:23px}
.format{padding:30px 34px;border-bottom:1px solid var(--line);background:var(--soft);display:flex;gap:26px;align-items:center}
.tiles{display:flex;gap:8px;flex-shrink:0}
.tiles svg{width:56px;height:56px;background:var(--bg);box-shadow:0 0 0 1px var(--line)}
footer{padding:26px 34px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;color:var(--muted);font-size:16px}
.prose{max-width:640px;padding:38px 34px;display:flex;flex-direction:column;gap:22px}
.prose h2{font-weight:800;font-size:34px;line-height:1;letter-spacing:-.03em;margin:22px 0 0}
.prose p{margin:0}
.prose code{font-family:ui-monospace,Menlo,monospace;font-size:.92em}
.prose pre{margin:0;padding:18px;background:var(--soft);overflow-x:auto;font-size:14px;line-height:1.5}
.single{padding:38px 34px;display:flex;flex-direction:column;gap:22px;max-width:760px}
.single .knot{width:100%;max-width:640px;aspect-ratio:1;box-shadow:0 0 0 1px var(--line)}
.single .knot svg{display:block;width:100%;height:100%}
.nav{display:flex;gap:22px;flex-wrap:wrap}
@media (max-width:900px){
 .page{grid-template-columns:1fr}
 aside{border-right:0;border-bottom:1px solid var(--line);padding:18px 20px}
 aside .stick{position:static;gap:18px}
 h1{font-size:40px}
 .today{padding:20px;flex-direction:column;gap:16px}
 .today .knot{width:100%;height:auto;aspect-ratio:1}
 .num{font-size:44px}
 .row{height:auto;min-height:64px;padding:14px 20px;gap:16px}
 .row img,.row .ph{width:56px;height:56px}
 .format{flex-direction:column;align-items:flex-start;padding:20px}
 footer,.prose,.single{padding:20px}
}
@media (prefers-reduced-motion:no-preference){.row{transition:background .15s}}
`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Newsreader:opsz,wght@6..72,400&display=swap">`;

function layout(title: string, p: Palette, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="One Truchet knot a day, computed from the Base block number. The drawing exists before anyone sees it.">
<meta name="theme-color" content="${p.bg}">
<link rel="icon" href="/today.svg" type="image/svg+xml">
${FONTS}
<style>${css(p)}</style>
</head>
<body>${body}</body>
</html>`;
}

const TILES = `<div class="tiles" aria-hidden="true">
<svg viewBox="0 0 64 64"><path d="M0 32A32 32 0 0 1 32 0M32 64A32 32 0 0 0 64 32" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>
<svg viewBox="0 0 64 64"><path d="M32 0A32 32 0 0 1 64 32M0 32A32 32 0 0 0 32 64" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>
<svg viewBox="0 0 64 64"><path d="M32 0L32 64" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>
<svg viewBox="0 0 64 64"><path d="M0 32L64 32" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>
</div>`;

function fmtLeft(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h === 0 ? `${m} min` : `${h} h ${m} min`;
}
function stripSize(svg: string): string {
  return svg.replace(/ width="\d+" height="\d+"/, "");
}
const COUNTDOWN = `<script>
(function(){var el=document.querySelector('[data-left]');if(!el)return;var s=+el.getAttribute('data-left');var t0=Date.now();function f(x){var h=Math.floor(x/3600),m=Math.floor(x%3600/60);return h?h+' h '+m+' min':m+' min'}setInterval(function(){var r=s-Math.floor((Date.now()-t0)/1000);if(r<0){location.reload();return}el.textContent=f(r)},15000)})();
</script>`;

function isAuthor(chain: ChainState, a?: string): boolean {
  return Boolean(a) && a!.toLowerCase() === chain.author.toLowerCase();
}

function mintScript(chain: ChainState): string {
  const cfg = JSON.stringify({
    address: chain.address,
    chainHex: "0x" + chain.chainId.toString(16),
    name: chainName(chain.chainId),
    rpc: chain.chainId === 8453 ? "https://mainnet.base.org" : "https://sepolia.base.org",
    explorer: explorer(chain.chainId),
  });
  return `<script>
(function(){
var CFG=${cfg};var btn=document.getElementById('mint');var out=document.getElementById('msg');
function say(t){out.textContent=t}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
btn.addEventListener('click',async function(){
  var eth=window.ethereum;
  if(!eth){say('You need a wallet in your browser, like Rabby, MetaMask or Coinbase Wallet.');return}
  btn.disabled=true;
  try{
    var accs=await eth.request({method:'eth_requestAccounts'});var from=accs[0];
    try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:CFG.chainHex}]})}
    catch(e){if(e&&e.code===4902){await eth.request({method:'wallet_addEthereumChain',params:[{chainId:CFG.chainHex,chainName:CFG.name,rpcUrls:[CFG.rpc],nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},blockExplorerUrls:[CFG.explorer]}]})}else{throw e}}
    say('Confirm in your wallet. You pay gas, nothing else.');
    var hash=await eth.request({method:'eth_sendTransaction',params:[{from:from,to:CFG.address,data:'0x4e71d92d'}]});
    say('Sent. Waiting for the network.');
    for(var i=0;i<90;i++){await sleep(2000);var r=await eth.request({method:'eth_getTransactionReceipt',params:[hash]});
      if(r){if(r.status==='0x1'){say('The day is yours.');await sleep(1200);location.reload()}else{say('The network rejected it. Someone may have been faster.');btn.disabled=false}return}}
    say('Still waiting. Refresh the page in a moment.');
  }catch(e){say(e&&e.code===4001?'Cancelled in the wallet.':'Failed: '+((e&&e.message)||e));btn.disabled=false}
});
})();
</script>`;
}

export function homePage(today: Day, block: bigint, chain: ChainState | null = null): string {
  const k = renderKnot(today.firstBlock);
  const left = chain ? chain.blocksLeft * 2 : secondsLeft(block);

  const rows: string[] = [];
  for (let n = today.n - 1; n >= Math.max(1, today.n - 60); n--) {
    const d = dayByNumber(n)!;
    if (chain && !chain.owners.has(n)) {
      rows.push(`<a class="row hole" href="/day/${n}"><span class="ph"></span><span><span class="n syne">${n}</span><br><span class="small">nobody came, the gap stays</span></span></a>`);
      continue;
    }
    const owner = chain?.owners.get(n);
    const who = owner ? (isAuthor(chain!, owner) ? "the author's" : `taken by ${shortAddr(owner)}`) : `palette ${renderKnot(d.firstBlock).palette.name}`;
    rows.push(`<a class="row" href="/day/${n}"><img src="/day/${n}.svg" alt="" loading="lazy" width="92" height="92"><span><span class="n syne">${n}</span><br><span class="small">${who}</span></span></a>`);
  }
  const older = today.n - 61 > 0 ? `<a class="row" href="/day/${today.n - 61}"><span class="small">earlier days</span></a>` : "";

  const taken = chain ? chain.owners.size : 0;
  const gaps = chain ? Math.max(0, today.n - 1 - [...chain.owners.keys()].filter((n) => n < today.n).length) : 0;
  const todayOwner = chain?.owners.get(today.n);
  const authorDay = today.n % 10 === 0 && today.n <= 1000;

  let todayState = "today";
  let cta = `<a class="cta syne" href="/day/${today.n}.svg" download="onenft-day-${today.n}.svg">Download today's knot</a>
<a class="cta ghost syne" href="/how">How it works</a>
<p class="small">You can't claim on-chain yet. That opens after day 90, so there is something worth claiming.</p>`;
  if (chain) {
    const badge = chain.chainId === 8453 ? "" : ` <span class="testnet">${chainName(chain.chainId)} testnet</span>`;
    if (todayOwner) {
      todayState = isAuthor(chain, todayOwner) ? "today, the author's" : `today, taken by ${shortAddr(todayOwner)}`;
      cta = `<button class="cta syne" disabled>Day ${today.n} is taken</button>
<a class="cta ghost syne" href="/how">How it works</a>
<p class="small">The next one ties tomorrow. ${fmtLeft(left)} left.${badge}</p>`;
    } else if (authorDay) {
      todayState = "today, the author's day";
      cta = `<button class="cta syne" disabled>Every tenth day goes to the author</button>
<a class="cta ghost syne" href="/how">How it works</a>
<p class="small">Written into the contract from day one, up to day 1000. Tomorrow is yours again.${badge}</p>`;
    } else {
      todayState = "today, still nobody's";
      cta = `<button class="cta syne" id="mint">Claim today's knot</button>
<p class="msg" id="msg" aria-live="polite"></p>
<a class="cta ghost syne" href="/how">How it works</a>
<p class="small">Free. You pay gas, nothing else. ${fmtLeft(left)} left.${badge}</p>`;
    }
  }

  const body = `<div class="page">
<aside><div class="stick">
<a class="mark syne" href="/">${SITE}</a>
<h1 class="syne">One<br>continuous<br>fabric</h1>
<p class="lead">Every day the contract ties one Truchet knot from the Base block number. Nobody draws it and nobody can delay it. Every knot comes out of the same machine, so the fabric runs without a seam.</p>
<hr>
<div><div class="big syne">${today.n}</div><div class="small">${plural(today.n, "day woven", "days woven")}</div></div>
${chain ? `<div style="display:flex;gap:34px"><div><div class="syne" style="font-weight:700;font-size:26px;line-height:1">${taken}</div><div class="small">taken</div></div><div><div class="syne" style="font-weight:700;font-size:26px;line-height:1">${gaps}</div><div class="small">${plural(gaps, "gap", "gaps")}</div></div></div>` : ""}
<div style="display:flex;flex-direction:column;gap:12px">
${cta}
</div>
</div></aside>
<main>
<section class="today">
<div class="knot">${stripSize(k.svg)}</div>
<div style="display:flex;flex-direction:column;gap:18px;padding-top:6px">
<div><div class="num syne">${today.n}</div><div class="lead" style="margin-top:8px;font-size:19px">${todayState}</div></div>
<p class="lead" style="max-width:330px">The contract tied this knot at block ${num(today.firstBlock)}. It ties the next one in <span data-left="${left}">${fmtLeft(left)}</span>.</p>
<hr>
<p class="small" style="line-height:1.7">palette ${k.palette.name}, ${paletteIndex(k.palette)} of ${PALETTES.length}<br>${num(k.svg.length)} bytes of SVG<br>epoch ${today.epoch}${chain ? `<br>contract <a href="${explorer(chain.chainId)}/address/${chain.address}">${shortAddr(chain.address)}</a>, renderer ${chain.rendererLocked ? "frozen for good" : "can still change for future days"}` : ""}</p>
${today.n === 1 ? `<p class="small">This is day one. Tomorrow a second row appears under it, and so on, with no end.</p>` : ""}
</div>
</section>
<section class="format">${TILES}<p style="max-width:520px;margin:0">The whole knot is these four shapes, two bits per cell. The format is public. You can build it yourself. <a href="/how">See how the machine works</a></p></section>
${rows.join("\n")}
${older}
<footer><span>This is not an investment and never will be.</span></footer>
</main>
</div>
${chain && !todayOwner && !authorDay ? mintScript(chain) : ""}
${COUNTDOWN}`;
  return layout(`Day ${today.n} | ${SITE}`, k.palette, body);
}

export function dayPage(d: Day, today: Day, chain: ChainState | null = null): string {
  const k = renderKnot(d.firstBlock);
  const prev = d.n > 1 ? `<a href="/day/${d.n - 1}">previous</a>` : "";
  const next = d.n < today.n ? `<a href="/day/${d.n + 1}">next</a>` : "";
  let state = d.n === today.n ? "today" : `day ${d.n} of ${today.n}`;
  if (chain) {
    const o = chain.owners.get(d.n);
    if (o) state += isAuthor(chain, o) ? ", the author's" : `, taken by <a href="${explorer(chain.chainId)}/address/${o}">${shortAddr(o)}</a>`;
    else state += d.n < today.n ? ", nobody came" : ", still nobody's";
  }
  const body = `<main class="single">
<a class="mark syne" href="/">${SITE}</a>
<div class="knot">${stripSize(k.svg)}</div>
<div><div class="num syne">${d.n}</div><p class="lead">${state}</p></div>
<p class="small" style="line-height:1.7">palette ${k.palette.name}, ${paletteIndex(k.palette)} of ${PALETTES.length}<br>first block ${num(d.firstBlock)}<br>epoch ${d.epoch}<br>${num(k.svg.length)} bytes of SVG</p>
<nav class="nav">${prev}<a href="/day/${d.n}.svg" download="onenft-day-${d.n}.svg">download SVG</a>${next}<a href="/">whole fabric</a></nav>
</main>`;
  return layout(`Day ${d.n} | ${SITE}`, k.palette, body);
}

export function howPage(today: Day): string {
  const k = renderKnot(today.firstBlock);
  const body = `<main class="prose">
<a class="mark syne" href="/">${SITE}</a>
<h2 class="syne">From one number to one knot</h2>
<p>The only input is the Base block number. Nobody sets it and nobody can roll it back.</p>
<p><strong>A day</strong> is the block number divided by 43,200, rounded down. At two seconds per block that is about a day. The boundary drifts against wall-clock time, because the chain is the clock.</p>
<p><strong>The seed</strong> is the day run through splitmix64. From it you pull a stream of bits: eight bits pick the palette, then two bits for each of the 64 cells in an 8 by 8 grid.</p>
${TILES}
<p><strong>Four cell states:</strong> two quarter-arcs in one of two orientations, a vertical pass, a horizontal pass. Classic Truchet has arcs and nothing else. The passes break it into longer runs.</p>
<p><strong>The drawing</strong> is one SVG path drawn twice: a thicker shadow and a thinner cord. The whole file is about five kilobytes. The contract returns it as a <code>data:</code> URI, with no server in between.</p>
<p><strong>The palette</strong> is one of eight: ink, copper, moss, ash, ultramarine, rust, salt, tar. This page takes its colors from today's palette, so it looks different in each of the eight epochs. Today: ${k.palette.name}.</p>
<h2 class="syne">Build it yourself</h2>
<p>The same block number gives the same knot every time, ten years from now and with this page switched off. The generator is in <a href="${REPO}">the repository</a>. The full random stream is below, so you can port it to any language.</p>
<pre><code>u64 next(u64 x):
  x += 0x9e3779b97f4a7c15
  x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9
  x = (x ^ (x >> 27)) * 0x94d049bb133111eb
  return x ^ (x >> 31)

counter = next(epoch)
palette = top8(next(++counter)) mod 8
cell[i] = top2(next(++counter))   for i in 0..63</code></pre>
<p>If you build it, write to me. That is the one thing I am waiting for here.</p>
<p class="small"><a href="/">Back to the fabric</a></p>
</main>`;
  return layout(`How it works | ${SITE}`, k.palette, body);
}

export function beforeStart(seconds: number, dayOne: Day): string {
  const k = renderKnot(dayOne.firstBlock);
  const body = `<main class="single">
<a class="mark syne" href="/">${SITE}</a>
<h2 class="syne" style="font-size:52px;line-height:.9;letter-spacing:-.035em;margin:0">The first day<br>ties in <span data-left="${seconds}">${fmtLeft(seconds)}</span></h2>
<p class="lead" style="max-width:520px">At Base block ${num(dayOne.firstBlock)} the chain crosses epoch ${dayOne.epoch} and the first knot appears. This page already wears its colors, because you can compute the palette ahead of time.</p>
<p class="small">From that day on, one knot a day, with no end. <a href="/how">How it works</a></p>
</main>
${COUNTDOWN}`;
  return layout(`Before day one | ${SITE}`, k.palette, body);
}

export function notFound(today: Day): string {
  const k = renderKnot(today.firstBlock);
  return layout(`No such day | ${SITE}`, k.palette, `<main class="single"><a class="mark syne" href="/">${SITE}</a><h2 class="syne" style="font-size:34px;margin:0">No such day</h2><p class="lead">Today is day ${today.n}. Earlier days run from 1 to ${today.n}. Later ones do not exist yet.</p><a href="/">Back to the fabric</a></main>`);
}
