import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GILLERSBERG bedside table, read from its manual. A bamboo box built lying on its back: a side frame (with a bar
 * at shelf height) stands on edge and the back panel (a board between two bars, with a groove for the shelf) is
 * bolted to it, two bolts. Three front rails go in (three bolts), the shelf slides into its groove, and the other side
 * frame closes it (five bolts). Stood up whichever way you like (we stand it tall, like the photo), four glides go
 * under the corners, the two perforated steel panels hook into the sides above the shelf and the tray clicks on top.
 * IKEA: 38.5 x 38.5 x 56 cm.
 */

const BAR = 20;

function table(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 385, D = Math.round(s.size.d * 10) || 385, H = Math.round(s.size.h * 10) || 560;
  const HF = H - 15; // the frame; the tray sits in its top and stands a little proud
  const yMid = Math.round(HF * 0.4); // shelf bars
  const xIn = W / 2 - BAR, zF = D / 2 - BAR / 2, zB = -D / 2 + BAR / 2;
  const sideFrame: PartPiece[] = [
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [BAR, HF, BAR], pos: [0, 0, (sz * (D - BAR)) / 2] })),
    ...[BAR / 2, yMid, HF - BAR / 2].map((y): PartPiece => ({ shape: "box", size: [BAR, BAR, D - 2 * BAR], pos: [0, y - HF / 2, 0] })),
  ];
  const backPanel: PartPiece[] = [
    ...[BAR / 2, HF - BAR / 2].map((y): PartPiece => ({ shape: "box", size: [2 * xIn, BAR, BAR], pos: [0, y - HF / 2, 0] })),
    { shape: "box", size: [2 * xIn, BAR, 10], pos: [0, yMid - HF / 2, 5] },
    { shape: "box", size: [2 * xIn, HF - 2 * BAR, 8], pos: [0, 0, -4] },
  ];
  const parts: CustomPart[] = [
    { id: "SL", name: "Side frame", size: [BAR, HF, D], pos: [-W / 2 + BAR / 2, HF / 2, 0], pieces: sideFrame, material: "wood" },
    { id: "BP", name: "Back panel", size: [2 * xIn, HF, BAR], pos: [0, HF / 2, zB], pieces: backPanel, material: "wood" },
    ...[HF - BAR / 2, yMid, BAR / 2].map((y, i): CustomPart => ({ id: `R${i}`, name: "Rail", size: [2 * xIn, BAR, BAR], pos: [0, y, zF], material: "wood" })),
    { id: "SH", name: "Shelf", size: [2 * xIn, 10, D - 2 * BAR], pos: [0, yMid + BAR / 2 + 5, 0], material: "wood" },
    { id: "SR", name: "Side frame", size: [BAR, HF, D], pos: [W / 2 - BAR / 2, HF / 2, 0], pieces: sideFrame, material: "wood" },
    ...[-1, 1].map((sx, i): CustomPart => ({ id: `P${i}`, name: "Side panel", size: [2, HF - yMid - 2 * BAR, D - 2 * BAR], pos: [sx * (xIn - 2), (HF + yMid) / 2, 0], material: "metal" })),
    { id: "T", name: "Tray", size: [W - 10, 25, D - 10], pos: [0, H - 12.5, 0], material: "metal" },
  ];
  const rails = ["R0", "R1", "R2"];
  // bolts go through a side frame's outside face into the end of a bar
  const bolts = (sx: number, pts: [number, number][], on: string): CustomFix => ({
    kind: "bolt",
    count: pts.length,
    len: 50,
    dia: 6,
    on,
    at: pts.map(([y, z]): Vec3 => [sx * (W / 2), y, z]),
    dir: [-sx, 0, 0],
  });
  const backBars: [number, number][] = [BAR / 2, HF - BAR / 2].map((y) => [y, zB]);
  const railEnds: [number, number][] = [HF - BAR / 2, yMid, BAR / 2].map((y) => [y, zF]);
  return {
    parts,
    steps: [
      {
        title: "Bolt the back panel to a side frame",
        detail: "Build it lying on its back. Stand the side frame on edge and push the panel's bars against it, groove facing up, then two bolts.",
        add: ["SL", "BP"],
        fix: [{ ...bolts(-1, backBars, "SL"), mate: "BP" }],
        tools: ["allen"],
        pose: "+z",
        warnings: ["floor"],
      },
      {
        title: "Bolt on the three front rails",
        detail: "One at each end and one at the shelf bar, a bolt each. Snug, not tight yet.",
        add: rails,
        fix: [bolts(-1, railEnds, "SL")],
        tools: ["allen"],
      },
      {
        title: "Slide the shelf into its groove",
        detail: "The notched edge goes in first, all the way to the back panel.",
        add: ["SH"],
      },
      {
        title: "Bolt on the other side frame",
        detail: "Five bolts: three into the rails and two into the back panel's bars. Now tighten all of them.",
        add: ["SR"],
        fix: [bolts(1, [...railEnds, ...backBars], "SR")],
        tools: ["allen"],
      },
      {
        title: "Stand it up and stick on the glides",
        detail: "It can stand tall or lie long, with the shelf high or low. Choose, then press a glide under each bottom corner.",
        fix: [{ kind: "glide", count: 4, at: [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (W / 2 - BAR / 2), 0, sz * (D / 2 - BAR / 2)])), dir: [0, 1, 0] }],
        pose: "+y",
      },
      {
        title: "Hook in the side panels",
        detail: "Above the shelf, one each side. Slide each one down until both hooks catch on the frame.",
        add: ["P0", "P1"],
      },
      {
        title: "Press the tray onto the top",
        detail: "Lay it in the top of the frame and push down at the corners until it clicks.",
        add: ["T"],
      },
    ],
  };
}

const family: Family = {
  names: ["GILLERSBERG"],
  recipe(s) {
    if (/bedside-table/.test(s.slug ?? "")) return table(s);
    return null;
  },
};
export default family;
