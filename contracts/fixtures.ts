/** Generates fixtures for the TS ↔ Solidity byte-equality tests. TypeScript is the source of truth. */
import { renderKnot } from "../src/knot.ts";
import { renderKnotV2 } from "../src/knot_v2.ts";
const epochs = [0n, 1n, 7n, 20700n, 20701n, 20702n, 20730n, 21000n, 4095n, 65535n, 1_000_003n, 18_446_744_073_709n];
const v2 = epochs.map((e) => { const k = renderKnotV2(e); return { epoch: e.toString(), palette: k.palette.name, svg: k.svg }; });
await Bun.write(new URL("./test/fixtures/knots.json", import.meta.url).pathname, JSON.stringify(v2, null, 1));
// v3: the same epochs plus a run of days, so every weave, symmetry and grid shows up at least once.
const more = [...epochs, ...Array.from({ length: 48 }, (_, i) => 20702n + BigInt(i))];
const v3 = more.map((e) => { const k = renderKnot(e); return { epoch: e.toString(), palette: k.palette.name, svg: k.svg, traits: k.traits }; });
await Bun.write(new URL("./test/fixtures/knots_v3.json", import.meta.url).pathname, JSON.stringify(v3, null, 1));
console.log(`${v2.length} v2 fixtures, ${v3.length} v3 fixtures`);
