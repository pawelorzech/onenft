import { renderKnot } from "../src/knot.ts";

/** SVG without width/height so it scales to the artboard container. */
export function inlineKnot(epoch: bigint, grid = 8): string {
  const k = renderKnot(epoch, { grid });
  return k.svg.replace(/ width="\d+" height="\d+"/, ' style="width:100%;height:100%;display:block"');
}
