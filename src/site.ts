/**
 * HTML strony. Jedna zasada rządzi kolorem: strona nie ma własnej palety,
 * bierze paletę dzisiejszej doby z rendererka, więc wygląda inaczej
 * w każdej z ośmiu epok. Nie ma trybu jasnego i ciemnego.
 */
import { renderKnot, type Palette, PALETTES } from "./knot.ts";
import { dayByNumber, secondsLeft, type Day } from "./chain.ts";
import type { ChainState } from "./contract.ts";

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function explorer(chainId: number): string {
  return chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
}
function chainName(chainId: number): string {
  return chainId === 8453 ? "Base" : "Base Sepolia";
}

export const SITE = "onenft.click";
export const AUTHOR = "Paweł Orzech";

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
/** Kolor pośredni: t=0 daje a, t=1 daje b. */
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
h1{font-weight:800;font-size:52px;line-height:.9;letter-spacing:-.035em;margin:0}
.lead{color:var(--muted);margin:0}
hr{border:0;border-top:1px solid var(--line);margin:0;width:100%}
.big{font-weight:700;font-size:40px;line-height:1}
.small{font-size:15px;color:var(--muted)}
.cta{display:flex;align-items:center;justify-content:center;height:58px;background:var(--fg);color:var(--bg);text-decoration:none;font-weight:700;font-size:18px}
.cta.ghost{background:transparent;color:var(--fg);border:1px solid var(--fg)}
.today{padding:38px 34px 34px;border-bottom:1px solid var(--line);display:flex;gap:32px;align-items:flex-start}
.today .knot{width:396px;height:396px;flex-shrink:0;box-shadow:0 0 0 1px var(--line)}
.today .knot svg{display:block;width:100%;height:100%}
.num{font-weight:800;font-size:62px;line-height:.95;letter-spacing:-.03em}
.row{display:flex;align-items:center;gap:22px;padding:0 34px;height:128px;border-bottom:1px solid var(--line);text-decoration:none}
.row:hover{background:var(--soft)}
.row.hole{background:repeating-linear-gradient(90deg,transparent 0 20px,var(--soft) 20px 40px);color:var(--muted)}
.row.hole:hover{background:repeating-linear-gradient(90deg,transparent 0 20px,var(--soft) 20px 40px)}
.row .ph{width:92px;height:92px;flex-shrink:0}
button.cta{border:0;cursor:pointer;width:100%;font-family:"Syne",system-ui,sans-serif}
button.cta[disabled]{opacity:.55;cursor:default}
.msg{font-size:15px;color:var(--muted);min-height:1.5em}
.testnet{display:inline-block;padding:3px 8px;border:1px solid var(--line);font-size:13px;color:var(--muted)}
.row img{width:92px;height:92px;display:block;flex-shrink:0}
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

function layout(title: string, p: Palette, body: string, extraHead = ""): string {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="Jeden splot Truchet na dobę, liczony z numeru bloku Base. Rysunek istnieje, zanim ktokolwiek go zobaczy.">
<meta name="theme-color" content="${p.bg}">
<link rel="icon" href="/dzis.svg" type="image/svg+xml">
${FONTS}${extraHead}
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
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

function slowo(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const r10 = n % 10, r100 = n % 100;
  if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return few;
  return many;
}

function stripSize(svg: string): string {
  return svg.replace(/ width="\d+" height="\d+"/, "");
}

export function homePage(today: Day, block: bigint, chain: ChainState | null = null): string {
  const k = renderKnot(today.firstBlock);
  const left = chain ? chain.blocksLeft * 2 : secondsLeft(block);
  const rows: string[] = [];
  for (let n = today.n - 1; n >= Math.max(1, today.n - 60); n--) {
    const d = dayByNumber(n)!;
    const kn = renderKnot(d.firstBlock);
    if (chain && !chain.owners.has(n)) {
      rows.push(`<a class="row hole" href="/doba/${n}"><span class="ph"></span><span><span class="n syne">${n}</span><br><span class="small">nikt nie przyszedł, przerwa zostaje</span></span></a>`);
      continue;
    }
    const owner = chain?.owners.get(n);
    const who = owner ? (owner.toLowerCase() === chain!.author.toLowerCase() ? "u autora" : `wzięta przez ${shortAddr(owner)}`) : `paleta ${kn.palette.name}`;
    rows.push(`<a class="row" href="/doba/${n}"><img src="/doba/${n}.svg" alt="" loading="lazy" width="92" height="92"><span><span class="n syne">${n}</span><br><span class="small">${who}</span></span></a>`);
  }
  const taken = chain ? chain.owners.size : 0;
  const holes = chain ? Math.max(0, today.n - 1 - [...chain.owners.keys()].filter((n) => n < today.n).length) : 0;
  const todayOwner = chain?.owners.get(today.n);
  const authorDay = today.n % 10 === 0 && today.n <= 1000;
  let todayState = "";
  let cta = `<a class="cta syne" href="/doba/${today.n}.svg" download="onenft-doba-${today.n}.svg">Pobierz dzisiejszy splot</a>
<a class="cta ghost syne" href="/format">Jak to działa</a>
<p class="small">Odbieranie na łańcuchu jeszcze nie działa. Najpierw dziewięćdziesiąt dób, żeby było co odbierać.</p>`;
  if (chain) {
    if (todayOwner) {
      todayState = todayOwner.toLowerCase() === chain.author.toLowerCase() ? "dzisiaj, u autora" : `dzisiaj, wzięta przez ${shortAddr(todayOwner)}`;
      cta = `<button class="cta syne" disabled>Doba ${today.n} jest już wzięta</button>
<a class="cta ghost syne" href="/format">Jak to działa</a>
<p class="small">Jutro zawiąże się następna. Zostało ${fmtLeft(left)}.</p>`;
    } else if (authorDay) {
      todayState = "dzisiaj, doba autora";
      cta = `<button class="cta syne" disabled>Co dziesiąta doba należy do autora</button>
<a class="cta ghost syne" href="/format">Jak to działa</a>
<p class="small">Zapisane w kontrakcie od pierwszego dnia, do doby 1000. Jutro znów jest dla ciebie.</p>`;
    } else {
      todayState = "dzisiaj, jeszcze niczyja";
      cta = `<button class="cta syne" id="mint">Weź dzisiejszą dobę</button>
<p class="msg" id="msg" aria-live="polite"></p>
<a class="cta ghost syne" href="/format">Jak to działa</a>
<p class="small">Bez ceny, płacisz tylko gaz. Zostało ${fmtLeft(left)}.${chain.chainId === 8453 ? "" : ` <span class="testnet">sieć testowa ${chainName(chain.chainId)}</span>`}</p>`;
    }
  }
  const older = today.n - 61 > 0 ? `<a class="row" href="/doba/${today.n - 61}"><span class="small">wcześniejsze doby</span></a>` : "";
  const first = today.n === 1
    ? `<p class="small">To pierwsza doba. Jutro pod nią pojawi się druga i tak dalej, bez końca.</p>`
    : "";

  const body = `<div class="page">
<aside><div class="stick">
<a class="mark syne" href="/">${SITE}</a>
<h1 class="syne">Jedna<br>ciągła<br>tkanina</h1>
<p class="lead">Co dobę powstaje jeden splot Truchet, wyliczony z numeru bloku Base. Nikt go nie rysuje i nikt nie może go opóźnić. Wszystkie wychodzą z tej samej maszyny, więc materiał biegnie bez szwu.</p>
<hr>
<div><div class="big syne">${today.n}</div><div class="small">${slowo(today.n, "doba utkana", "doby utkane", "dób utkanych")}</div></div>
${chain ? `<div style="display:flex;gap:34px"><div><div class="syne" style="font-weight:700;font-size:26px;line-height:1">${taken}</div><div class="small">${slowo(taken, "wzięta", "wzięte", "wziętych")}</div></div><div><div class="syne" style="font-weight:700;font-size:26px;line-height:1">${holes}</div><div class="small">${slowo(holes, "przerwa", "przerwy", "przerw")}</div></div></div>` : ""}
<div style="display:flex;flex-direction:column;gap:12px">
${cta}
</div>
</div></aside>
<main>
<section class="today">
<div class="knot">${stripSize(k.svg)}</div>
<div style="display:flex;flex-direction:column;gap:18px;padding-top:6px">
<div><div class="num syne">${today.n}</div><div class="lead" style="margin-top:8px;font-size:19px">${todayState || "dzisiaj"}</div></div>
<p class="lead" style="max-width:330px">Ten splot powstał na bloku ${today.firstBlock.toLocaleString("pl-PL")}. Następny zawiąże się za <span data-left="${left}">${fmtLeft(left)}</span>.</p>
<hr>
<p class="small" style="line-height:1.7">paleta ${k.palette.name}, ${paletteIndex(k.palette)} z ${PALETTES.length}<br>${k.svg.length.toLocaleString("pl-PL")} bajtów SVG<br>epoka ${today.epoch}${chain ? `<br>kontrakt <a href="${explorer(chain.chainId)}/address/${chain.address}">${shortAddr(chain.address)}</a>, renderer ${chain.rendererLocked ? "zamrożony" : "wymienny dla przyszłych dób"}` : ""}</p>
${first}
</div>
</section>
<section class="format">${TILES}<p style="max-width:520px;margin:0">Cały splot składa się z tych czterech kształtów, po dwa bity na komórkę. Format jest opisany i wolno go zaimplementować u siebie. <a href="/format">Zobacz, jak działa maszyna</a></p></section>
${rows.join("\n")}
${older}
<footer><span>${AUTHOR}, Warszawa.</span><span>To nie jest inwestycja i nigdy nie będzie.</span></footer>
</main>
</div>
${chain && !todayOwner && !authorDay ? mintScript(chain) : ""}
<script>
(function(){var el=document.querySelector('[data-left]');if(!el)return;var s=+el.getAttribute('data-left');var t0=Date.now();function f(x){var h=Math.floor(x/3600),m=Math.floor(x%3600/60);return h?h+' h '+m+' min':m+' min'}setInterval(function(){var r=s-Math.floor((Date.now()-t0)/1000);if(r<0){location.reload();return}el.textContent=f(r)},15000)})();
</script>`;
  return layout(`${SITE} — doba ${today.n}`, k.palette, body);
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
  if(!eth){say('Potrzebny portfel w przeglądarce, na przykład Rabby, MetaMask albo Coinbase Wallet.');return}
  btn.disabled=true;
  try{
    var accs=await eth.request({method:'eth_requestAccounts'});var from=accs[0];
    try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:CFG.chainHex}]})}
    catch(e){if(e&&e.code===4902){await eth.request({method:'wallet_addEthereumChain',params:[{chainId:CFG.chainHex,chainName:CFG.name,rpcUrls:[CFG.rpc],nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},blockExplorerUrls:[CFG.explorer]}]})}else{throw e}}
    say('Potwierdź w portfelu. Płacisz tylko gaz.');
    var hash=await eth.request({method:'eth_sendTransaction',params:[{from:from,to:CFG.address,data:'0x4e71d92d'}]});
    say('Wysłane. Czekam na potwierdzenie.');
    for(var i=0;i<90;i++){await sleep(2000);var r=await eth.request({method:'eth_getTransactionReceipt',params:[hash]});
      if(r){if(r.status==='0x1'){say('Doba jest twoja.');await sleep(1200);location.reload()}else{say('Sieć odrzuciła transakcję. Możliwe, że ktoś był szybszy.');btn.disabled=false}return}}
    say('Potwierdzenie się przeciąga. Odśwież stronę za chwilę.');
  }catch(e){say(e&&e.code===4001?'Anulowane w portfelu.':'Nie udało się: '+((e&&e.message)||e));btn.disabled=false}
});
})();
</script>`;
}

export function dayPage(d: Day, today: Day, chain: ChainState | null = null): string {
  const k = renderKnot(d.firstBlock);
  const prev = d.n > 1 ? `<a href="/doba/${d.n - 1}">poprzednia</a>` : "";
  const next = d.n < today.n ? `<a href="/doba/${d.n + 1}">następna</a>` : "";
  const body = `<main class="single">
<a class="mark syne" href="/">${SITE}</a>
<div class="knot">${stripSize(k.svg)}</div>
<div><div class="num syne">${d.n}</div><p class="lead">${d.n === today.n ? "dzisiaj" : `doba ${d.n} z ${today.n}`}${chain ? (chain.owners.has(d.n) ? (chain.owners.get(d.n)!.toLowerCase() === chain.author.toLowerCase() ? ", u autora" : `, wzięta przez <a href="${explorer(chain.chainId)}/address/${chain.owners.get(d.n)}">${shortAddr(chain.owners.get(d.n)!)}</a>`) : (d.n < today.n ? ", nikt nie przyszedł" : ", jeszcze niczyja")) : ""}</p></div>
<p class="small" style="line-height:1.7">paleta ${k.palette.name}, ${paletteIndex(k.palette)} z ${PALETTES.length}<br>pierwszy blok ${d.firstBlock.toLocaleString("pl-PL")}<br>epoka ${d.epoch}<br>${k.svg.length.toLocaleString("pl-PL")} bajtów SVG</p>
<nav class="nav">${prev}<a href="/doba/${d.n}.svg" download="onenft-doba-${d.n}.svg">pobierz SVG</a>${next}<a href="/">cała tkanina</a></nav>
</main>`;
  return layout(`${SITE} — doba ${d.n}`, k.palette, body);
}

export function formatPage(today: Day): string {
  const k = renderKnot(today.firstBlock);
  const body = `<main class="prose">
<a class="mark syne" href="/">${SITE}</a>
<h2 class="syne">Z jednej liczby do jednego splotu</h2>
<p>Jedynym wejściem jest numer bloku Base. Nikt go nie ustawia i nikt nie może go cofnąć.</p>
<p><strong>Doba</strong> to numer bloku podzielony całkowicie przez 43 200. Przy dwóch sekundach na blok wychodzi mniej więcej dzień, ale granica doby wędruje względem zegara ściennego, bo zegarem jest łańcuch.</p>
<p><strong>Ziarno</strong> to doba przepuszczona przez splitmix64. Z niego ciągnie się strumień bitów: najpierw osiem bitów na wybór palety, potem po dwa bity na każdą z 64 komórek siatki 8 na 8.</p>
${TILES}
<p><strong>Cztery stany komórki:</strong> dwa ćwierćłuki w jednej z dwóch orientacji, przelot pionowy, przelot poziomy. Klasyczny Truchet zna tylko łuki; przeloty rozbijają go na dłuższe ciągi.</p>
<p><strong>Rysunek</strong> to jedna ścieżka SVG narysowana dwa razy: grubszym cieniem i cieńszym sznurem. Cały plik ma około pięciu kilobajtów i w docelowej wersji będzie zwracany prosto z kontraktu jako <code>data:</code> URI, bez żadnego serwera pośrodku.</p>
<p><strong>Paleta</strong> jest jedną z ośmiu: atrament, miedź, mech, popiół, ultramaryna, rdza, sól, smoła. Ta strona bierze kolory z palety dzisiejszej doby, więc wygląda inaczej w każdej z ośmiu epok. Dziś: ${k.palette.name}.</p>
<h2 class="syne">Odtwórz to u siebie</h2>
<p>Ten sam numer bloku zawsze da ten sam splot, także za dziesięć lat i przy wyłączonej tej stronie. Kod generatora jest w repozytorium, a poniżej jest cały strumień losowy, żeby dało się go przepisać w dowolnym języku.</p>
<pre><code>u64 next(u64 x):
  x += 0x9e3779b97f4a7c15
  x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9
  x = (x ^ (x >> 27)) * 0x94d049bb133111eb
  return x ^ (x >> 31)

counter = next(epoch)
paleta  = top8(next(++counter)) mod 8
komórka[i] = top2(next(++counter))   dla i w 0..63</code></pre>
<p>Jeśli to zaimplementujesz, napisz do mnie. To jedyna rzecz, na którą tu czekam.</p>
<p class="small">${AUTHOR}, Warszawa. <a href="/">Wróć do tkaniny</a></p>
</main>`;
  return layout(`${SITE} — jak to działa`, k.palette, body);
}

export function beforeStart(seconds: number, dayOne: Day): string {
  const k = renderKnot(dayOne.firstBlock);
  const body = `<main class="single">
<a class="mark syne" href="/">${SITE}</a>
<h2 class="syne" style="font-size:52px;line-height:.9;letter-spacing:-.035em;margin:0">Pierwsza doba<br>zawiąże się za <span data-left="${seconds}">${fmtLeft(seconds)}</span></h2>
<p class="lead" style="max-width:520px">Na bloku ${dayOne.firstBlock.toLocaleString("pl-PL")} sieci Base łańcuch przekroczy epokę ${dayOne.epoch} i powstanie pierwszy splot. Ta strona ma już jego kolory, bo paleta jest wyliczona z góry.</p>
<p class="small">Od tego dnia jeden splot na dobę, bez końca. <a href="/format">Jak to działa</a></p>
</main>
<script>
(function(){var el=document.querySelector('[data-left]');var s=+el.getAttribute('data-left');var t0=Date.now();function f(x){var h=Math.floor(x/3600),m=Math.floor(x%3600/60);return h?h+' h '+m+' min':m+' min'}setInterval(function(){var r=s-Math.floor((Date.now()-t0)/1000);if(r<=0){location.reload();return}el.textContent=f(r)},15000)})();
</script>`;
  return layout(`${SITE} — przed pierwszą dobą`, k.palette, body);
}

export function notFound(today: Day): string {
  const k = renderKnot(today.firstBlock);
  return layout(`${SITE} — nie ma takiej doby`, k.palette, `<main class="single"><a class="mark syne" href="/">${SITE}</a><h2 class="syne" style="font-size:34px;margin:0">Nie ma takiej doby</h2><p class="lead">Dziś jest doba ${today.n}. Wcześniejsze mają numery od 1 do ${today.n}, późniejsze jeszcze nie powstały.</p><a href="/">Wróć do tkaniny</a></main>`);
}
