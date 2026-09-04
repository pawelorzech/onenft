import { readdir } from "node:fs/promises";
import { inlineKnot } from "./knots.ts";

const src = new URL("./src/", import.meta.url).pathname;
const out = new URL("./build/", import.meta.url).pathname;
const SLOTS: Record<string, bigint> = {
  A: 412n, B: 407n, C: 400n, D: 401n, E: 403n, F: 406n, G: 409n, H: 411n,
  I: 396n, J: 393n, K: 390n, L: 388n, M: 385n, N: 381n,
};

const files = (await readdir(src)).filter((f) => f.endsWith(".dc.html"));
for (const f of files) {
  let s = await Bun.file(src + f).text();
  for (const [k, e] of Object.entries(SLOTS)) {
    s = s.replaceAll(`<!--KNOT-${k}-->`, inlineKnot(e));
    s = s.replaceAll(`<!--KNOT4-${k}-->`, inlineKnot(e, 4));
    s = s.replaceAll(`<!--KNOT6-${k}-->`, inlineKnot(e, 6));
  }
  if (s.includes("<!--KNOT")) throw new Error(`${f}: nieznany placeholder`);
  await Bun.write(out + f, s);
  console.log(`${f}  ${(s.length / 1024).toFixed(1)} kB`);
}
