/** Generuje wzorce do testu zgodności bajt w bajt TS ↔ Solidity. */
import { renderKnot, EPOCH_BLOCKS } from "../src/knot.ts";
const epochs = [0n, 1n, 7n, 1177n, 1178n, 1179n, 1200n, 1500n, 4095n, 65535n, 1_000_003n, 18_446_744_073_709n];
const items = epochs.map((e) => {
  const k = renderKnot(e * EPOCH_BLOCKS);
  return { epoch: e.toString(), palette: k.palette.name, svg: k.svg };
});
await Bun.write(new URL("./test/fixtures/knots.json", import.meta.url).pathname, JSON.stringify(items, null, 1));
console.log(`${items.length} wzorców`);
