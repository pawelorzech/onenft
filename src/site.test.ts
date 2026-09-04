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
