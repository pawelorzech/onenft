import { readdir } from "node:fs/promises";
import { inlineKnot } from "./knots.ts";

const src = new URL("./src/", import.meta.url).pathname;
const out = new URL("./build/", import.meta.url).pathname;

// Numery dób użyte w makietach — stałe, żeby każdy kierunek pokazywał
// ten sam obiekt i różnice były wyłącznie w oprawie.
const SLOTS: Record<string, bigint> = {
  A: 412n, B: 407n, C: 400n, D: 401n, E: 403n, F: 406n, G: 409n, H: 411n,
};

const files = (await readdir(src)).filter((f) => f.endsWith(".dc.html"));
for (const f of files) {
  let s = await Bun.file(src + f).text();
  for (const [key, epoch] of Object.entries(SLOTS)) {
    s = s.replaceAll(`<!--KNOT-${key}-->`, inlineKnot(epoch));
    s = s.replaceAll(`<!--KNOT4-${key}-->`, inlineKnot(epoch, 4));
  }
  if (s.includes("<!--KNOT")) throw new Error(`${f}: nieznany placeholder węzła`);
  await Bun.write(out + f, s);
  console.log(`${f}  ${(s.length / 1024).toFixed(1)} kB`);
}
