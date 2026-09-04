import { expect, test } from "bun:test";
import { homePage, dayPage, howPage, mix } from "./site.ts";
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
  for (let n = 1; n < 7; n++) expect(h).toContain(`href="/day/${n}"`);
  expect(h).not.toContain(`class="row" href="/day/7"`);
  expect(h).toContain("<title>Day 7 | onenft.click</title>");
});

test("paleta strony to paleta dzisiejszej doby", () => {
  const h = homePage(today, today.firstBlock);
  expect(h).toMatch(/--bg:#[0-9a-f]{6};--fg:#[0-9a-f]{6}/);
  const bg = h.match(/--bg:(#[0-9a-f]{6})/)![1];
  expect(h).toContain(`<meta name="theme-color" content="${bg}">`);
});

test("strona doby ma nawigację w obu kierunkach tylko gdy sąsiedzi istnieją", () => {
  const d3 = dayPage(dayByNumber(3)!, today);
  expect(d3).toContain('href="/day/2"');
  expect(d3).toContain('href="/day/4"');
  const d1 = dayPage(dayByNumber(1)!, today);
  expect(d1).not.toContain('href="/day/0"');
  const d7 = dayPage(today, today);
  expect(d7).not.toContain('href="/day/8"');
});

test("strona formatu nazywa wszystkie osiem palet", () => {
  const f = howPage(today);
  for (const p of ["ink", "copper", "moss", "ash", "ultramarine", "rust", "salt", "tar"]) expect(f).toContain(p);
});

test("pierwsza doba dostaje osobne zdanie zamiast pustej listy", () => {
  const d1 = dayByNumber(1)!;
  const h = homePage(d1, d1.firstBlock + EPOCH_BLOCKS / 2n);
  expect(h).toContain("This is day one");
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
  expect(h).toContain("still nobody's");
  expect(h).not.toContain("can't claim on-chain yet");
});

test("z kontraktem: dziury i właściciele w paskach", () => {
  const t = dayByNumber(5)!;
  const h = homePage(t, t.firstBlock, fakeChain(5, { 1: "0x2222222222222222222222222222222222222222", 3: "0xAAAA000000000000000000000000000000000001" }));
  expect(h).toContain("taken by 0x2222…2222");
  expect(h).toContain("the author's");
  expect((h.match(/class="row hole"/g) ?? []).length).toBe(2);
  expect(h).toMatch(/>2<\/span><br><span class="small">nobody came/);
});

test("z kontraktem: wzięta dziś doba wyłącza przycisk", () => {
  const t = dayByNumber(5)!;
  const h = homePage(t, t.firstBlock, fakeChain(5, { 5: "0x3333333333333333333333333333333333333333" }));
  expect(h).toContain("is taken");
  expect(h).not.toContain('id="mint"');
  expect(h).toContain("taken by 0x3333…3333");
});

test("z kontraktem: doba autora nie ma przycisku dla ludzi", () => {
  const t = dayByNumber(10)!;
  const h = homePage(t, t.firstBlock, fakeChain(10, {}));
  expect(h).toContain("goes to the author");
  expect(h).not.toContain('id="mint"');
});

test("strona doby pokazuje właściciela albo przerwę", () => {
  const t = dayByNumber(5)!;
  const c = fakeChain(5, { 2: "0x2222222222222222222222222222222222222222" });
  expect(dayPage(dayByNumber(2)!, t, c)).toContain("taken by");
  expect(dayPage(dayByNumber(3)!, t, c)).toContain("nobody came");
  expect(dayPage(t, t, c)).toContain("still nobody's");
});
