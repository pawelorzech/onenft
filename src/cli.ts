import { renderKnot, toDataUri } from "./knot.ts";

const from = BigInt(process.argv[2] ?? "0");
const count = Number(process.argv[3] ?? 1);

for (let i = 0; i < count; i++) {
  const knot = renderKnot(from + BigInt(i));
  const file = `out/knot-${knot.epoch}.svg`;
  await Bun.write(file, knot.svg);
  console.log(`${file}  epoka ${knot.epoch}  paleta ${knot.palette.name}  ${knot.svg.length} B  dataURI ${toDataUri(knot.svg).length} B`);
}
