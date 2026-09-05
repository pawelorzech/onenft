/** Generates fixtures for the TS ↔ Solidity byte-equality test. */
import { renderKnot } from "../src/knot.ts";
const epochs = [0n, 1n, 7n, 20700n, 20701n, 20702n, 20730n, 21000n, 4095n, 65535n, 1_000_003n, 18_446_744_073_709n];
const items = epochs.map((e) => {
  const k = renderKnot(e);
  return { epoch: e.toString(), palette: k.palette.name, svg: k.svg };
});
await Bun.write(new URL("./test/fixtures/knots.json", import.meta.url).pathname, JSON.stringify(items, null, 1));
console.log(`${items.length} fixtures`);
