import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * STENSELE, read from the star base's manual, which covers the bistro and the bar table alike (only the column is
 * longer). The cross-shaped top plate is bolted onto the column with one long bolt and two washers, the frame turned
 * upside down for the four-legged base (four bolts and washers), then stood on the upturned top and screwed to it
 * with eight screws. The feet turn to level it.
 */

const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];
const fx = (kind: CustomFix["kind"], at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, ...o });
const arms = [1, 3, 5, 7].map((k) => (k * Math.PI) / 4);

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 70 across, 75 high (bistro) or 105 high (bar)
  const R = (s.size.w * 10) / 2 || 350, H = s.size.h * 10 || 750;
  const tt = 22, yt = H - tt;
  const hubH = 70, footH = 30; // base: hub height, feet under the arm ends
  const plateT = 12, plateY = yt - plateT; // the cross-shaped top plate under the top
  const col = 76;
  const reach = R - 30, plateReach = R * 0.62;

  const basePieces: PartPiece[] = [
    { shape: "cyl", size: [120, hubH, 120], pos: [0, footH + hubH / 2 - (footH + hubH) / 2, 0] },
    ...arms.map((a): PartPiece => {
      const r = (60 + reach) / 2;
      return { shape: "box", size: [reach - 60, 36, 50], pos: [Math.cos(a) * r, footH + 18 - (footH + hubH) / 2, -Math.sin(a) * r], rot: [0, a, 0] };
    }),
    ...arms.map((a): PartPiece => ({ shape: "cyl", size: [50, footH + 36, 50], pos: [Math.cos(a) * (reach - 25), (footH + 36) / 2 - (footH + hubH) / 2, -Math.sin(a) * (reach - 25)] })),
  ];
  const platePieces: PartPiece[] = [
    { shape: "cyl", size: [110, 50, 110], pos: [0, -14, 0] },
    ...arms.map((a): PartPiece => ({ shape: "box", size: [plateReach, plateT, 44], pos: [(Math.cos(a) * plateReach) / 2, 5, (-Math.sin(a) * plateReach) / 2], rot: [0, a, 0] })),
    // two bag hooks on the hub
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [10, 50, 10], pos: [sx * 62, -24, 0] })),
  ];
  const colBottom = footH + hubH, colTop = plateY - 38;
  const parts: CustomPart[] = [
    { id: "B", name: "Base", size: [2 * reach, footH + hubH, 2 * reach], pos: [0, (footH + hubH) / 2, 0], pieces: basePieces, material: "metal" },
    { id: "C", name: "Column", shape: "cyl", size: [col, colTop - colBottom, col], pos: [0, (colTop + colBottom) / 2, 0], material: "metal" },
    { id: "P", name: "Top plate", size: [2 * plateReach, 50, 2 * plateReach], pos: [0, plateY + plateT / 2 - 5, 0], pieces: platePieces, material: "metal" },
    { id: "T", name: "Table top", size: [2 * R, tt, 2 * R], pos: [0, yt + tt / 2, 0], pieces: [{ shape: "cyl", size: [2 * R, tt, 2 * R], pos: [0, 0, 0] }], material: "board" },
  ];
  const hub: Vec3 = [0, plateY + plateT, 0];
  const legBolts: Vec3[] = [0, 1, 2, 3].map((i): Vec3 => [Math.cos(i * Math.PI / 2) * 22, footH, Math.sin(i * Math.PI / 2) * 22]);
  const screws: Vec3[] = arms.flatMap((a) => [0.45, 0.9].map((f): Vec3 => [Math.cos(a) * plateReach * f, plateY, -Math.sin(a) * plateReach * f]));
  return {
    parts,
    steps: [
      {
        title: "Bolt the top plate onto the column",
        detail: "Use the one long bolt, with the small washer on top of the big one. Line the plate up with the slots in the column.",
        add: ["C", "P"],
        fix: [fx("bolt", [hub], { len: 100, dia: 8, dir: DOWN, on: "P", mate: "C" }), fx("washer", [hub, hub], { len: 2, dia: 20, dir: DOWN, on: "P" })],
        tools: ["allen"],
      },
      {
        title: "Turn it over and bolt on the base",
        detail: "Stand it on the top plate. Four short bolts, each with a small washer, go through the base into the column.",
        add: ["B"],
        fix: [fx("bolt", legBolts, { len: 40, dia: 8, dir: UP, on: "B", mate: "C" }), fx("washer", legBolts, { len: 2, dia: 16, dir: UP, on: "B" })],
        tools: ["allen"],
        pose: "-y",
      },
      {
        title: "Screw the top plate to the table top",
        detail: "Lay the top upside down on a rug, stand the frame on it in the middle and put two screws through each arm.",
        add: ["T"],
        fix: [fx("screw", screws, { len: 12, dia: 6, dir: UP, on: "P", mate: "T" })],
        tools: ["screwdriver"],
        warnings: ["floor"],
      },
      { title: "Stand the table up and level it", detail: "Turn a foot in or out until the table stops rocking.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["STENSELE"], recipe };
export default family;
