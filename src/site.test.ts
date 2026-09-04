import { expect, test } from "bun:test";
import { homePage, dayPage, formatPage, mix } from "./site.ts";
import { dayByNumber } from "./chain.ts";
import { EPOCH_BLOCKS } from "./knot.ts";

const today = dayByNumber(7)!;

test("mix interpoluje kolory", () => {
  expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
  expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
  expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
});

test("strona główna listuje wszystkie wcześniejsze doby, bez dzisiejszej w rzędach", () => {
  const h = homePage(today, today.firstBlock + 100n);
  for (let n = 1; n < 7; n++) expect(h).toContain(`href="/doba/${n}"`);
  expect(h).not.toContain(`class="row" href="/doba/7"`);
  expect(h).toContain("<title>onenft.click — doba 7</title>");
});

test("paleta strony to paleta dzisiejszej doby", () => {
  const h = homePage(today, today.firstBlock);
  expect(h).toMatch(/--bg:#[0-9a-f]{6};--fg:#[0-9a-f]{6}/);
  const bg = h.match(/--bg:(#[0-9a-f]{6})/)![1];
  expect(h).toContain(`<meta name="theme-color" content="${bg}">`);
});

test("strona doby ma nawigację w obu kierunkach tylko gdy sąsiedzi istnieją", () => {
  const d3 = dayPage(dayByNumber(3)!, today);
  expect(d3).toContain('href="/doba/2"');
  expect(d3).toContain('href="/doba/4"');
  const d1 = dayPage(dayByNumber(1)!, today);
  expect(d1).not.toContain('href="/doba/0"');
  const d7 = dayPage(today, today);
  expect(d7).not.toContain('href="/doba/8"');
});

test("strona formatu nazywa wszystkie osiem palet", () => {
  const f = formatPage(today);
  for (const p of ["atrament", "miedź", "mech", "popiół", "ultramaryna", "rdza", "sól", "smoła"]) expect(f).toContain(p);
});

test("pierwsza doba dostaje osobne zdanie zamiast pustej listy", () => {
  const d1 = dayByNumber(1)!;
  const h = homePage(d1, d1.firstBlock + EPOCH_BLOCKS / 2n);
  expect(h).toContain("To pierwsza doba");
  expect(h).not.toContain('class="row"');
});

import type { ChainState } from "./contract.ts";

function fakeChain(day: number, owners: Record<number, string>, extra: Partial<ChainState> = {}): ChainState {
  return {
    address: "0x1111111111111111111111111111111111111111",
    chainId: 84532,
    day,
    startEpoch: 1178n,
    author: "0xAAAA000000000000000000000000000000000001",
    rendererLocked: false,
    blocksLeft: 1000,
    owners: new Map(Object.entries(owners).map(([k, v]) => [Number(k), v as `0x${string}`])),
    ...extra,
  };
}

test("z kontraktem: wolna doba ma przycisk mintu i skrypt", () => {
  const t = dayByNumber(5)!;
  const h = homePage(t, t.firstBlock, fakeChain(5, { 1: "0x2222222222222222222222222222222222222222", 3: "0xAAAA000000000000000000000000000000000001" }));
  expect(h).toContain('id="mint"');
  expect(h).toContain("0x4e71d92d");
  expect(h).toContain("wallet_switchEthereumChain");
  expect(h).toContain("jeszcze niczyja");
  expect(h).not.toContain("Odbieranie na łańcuchu jeszcze nie działa");
});

test("z kontraktem: dziury i właściciele w paskach", () => {
  const t = dayByNumber(5)!;
  const h = homePage(t, t.firstBlock, fakeChain(5, { 1: "0x2222222222222222222222222222222222222222", 3: "0xAAAA000000000000000000000000000000000001" }));
  expect(h).toContain("wzięta przez 0x2222…2222");
  expect(h).toContain("u autora");
  expect((h.match(/class="row hole"/g) ?? []).length).toBe(2);
  expect(h).toMatch(/>2<\/span><br><span class="small">nikt nie przyszedł/);
});

test("z kontraktem: wzięta dziś doba wyłącza przycisk", () => {
  const t = dayByNumber(5)!;
  const h = homePage(t, t.firstBlock, fakeChain(5, { 5: "0x3333333333333333333333333333333333333333" }));
  expect(h).toContain("jest już wzięta");
  expect(h).not.toContain('id="mint"');
  expect(h).toContain("wzięta przez 0x3333…3333");
});

test("z kontraktem: doba autora nie ma przycisku dla ludzi", () => {
  const t = dayByNumber(10)!;
  const h = homePage(t, t.firstBlock, fakeChain(10, {}));
  expect(h).toContain("należy do autora");
  expect(h).not.toContain('id="mint"');
});

test("strona doby pokazuje właściciela albo przerwę", () => {
  const t = dayByNumber(5)!;
  const c = fakeChain(5, { 2: "0x2222222222222222222222222222222222222222" });
  expect(dayPage(dayByNumber(2)!, t, c)).toContain("wzięta przez");
  expect(dayPage(dayByNumber(3)!, t, c)).toContain("nikt nie przyszedł");
  expect(dayPage(t, t, c)).toContain("jeszcze niczyja");
});
