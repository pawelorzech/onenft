import { renderKnot } from "../src/knot.ts";
import { EPOCH_BLOCKS } from "../src/knot.ts";

/** SVG bez width/height, żeby skalowało się do kontenera artboardu. */
export function inlineKnot(epoch: bigint, grid = 8): string {
  const k = renderKnot(epoch * EPOCH_BLOCKS, { grid });
  return k.svg.replace(/ width="\d+" height="\d+"/, ' style="width:100%;height:100%;display:block"');
}
