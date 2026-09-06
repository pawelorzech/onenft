/**
 * The long-run share of days each trait value gets, straight from the tables
 * in knot.ts. Used by the traits page and by the holder facts.
 */
import { PALETTES, ACCENTS, GRIDS, WEAVES, SYMMETRIES, WEIGHTS, CAPS, STYLES, GROUNDS } from "./knot.ts";

export function odds(): Record<string, [string, number][]> {
  const tally = (xs: readonly (string | number)[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(String(x), (m.get(String(x)) ?? 0) + 1);
    return [...m].map(([k, v]) => [k, v / xs.length] as [string, number]);
  };
  return {
    palette: PALETTES.map((p) => [p.name, 1 / PALETTES.length]),
    grid: tally(GRIDS).map(([g, o]) => [`${g} by ${g}`, o]),
    weave: tally(WEAVES),
    symmetry: tally(SYMMETRIES),
    weight: tally(WEIGHTS),
    caps: tally(CAPS),
    accent: [["none", 15 / 16], ...ACCENTS.map((a) => [a.name, 1 / 64] as [string, number])],
    style: tally(STYLES),
    ground: tally(GROUNDS),
    inverted: [["no", 3 / 4], ["yes", 1 / 4]],
  };
}
