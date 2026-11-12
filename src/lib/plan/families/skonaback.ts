import type { Family } from "./family";
import type { CustomPart, CustomStep, Vec3 } from "../../types";

/**
 * SKÖNABÄCK, from IKEA's manual (the 2-seat sofa-bed; the US sleeper sofa is the same product). The folding
 * armrest gets two castors; the fixed armrest and the seat board get two threaded rods each. The backrest is lowered
 * onto the board's rods and nutted from inside, the fixed armrest is pushed against its end, held by an angle
 * bracket and nutted on its rods. The storage base stands on four plastic feet with felt pads; its swing arm is
 * lifted out and bolted to the folding armrest. The seat cushion folds down onto its six tabs and the back
 * cushions go on last. The manual shows the folding armrest on the left; it can go on either side.
 */

const ROD = { kind: "stud" as const, name: "Threaded rod", len: 70, dia: 8 };
const NUT = { kind: "nut" as const, len: 6, dia: 8 };
const WASHER = { kind: "washer" as const, len: 1.5, dia: 16 };

function recipe() {
  const W = 1580, D = 750; // IKEA's sizes (some of our rows give the sofa-bed a 230 cm width)
  const AW = 150;
  const Wb = W - 2 * AW, xi = Wb / 2;
  const FOOT = 40, BY1 = 240; // storage base on its feet
  const BT = 150; // backrest
  const zb = -D / 2 + BT / 2;
  const SY = 390; // seat height
  const parts: CustomPart[] = [
    { id: "FA", name: "Folding armrest", size: [AW, 660 - FOOT, D], pos: [-W / 2 + AW / 2, (660 + FOOT) / 2, 0], material: "soft" },
    { id: "AR", name: "Fixed armrest", size: [AW, 660 - 20, D], pos: [W / 2 - AW / 2, (660 + 20) / 2, 0], material: "soft" },
    { id: "SB", name: "Seat board", size: [Wb, 20, D], pos: [0, BY1 + 10, 0], material: "board" },
    { id: "BK", name: "Backrest", size: [Wb, 660 - BY1 - 20, BT], pos: [0, (660 + BY1 + 20) / 2, zb], material: "soft" },
    { id: "BS", name: "Storage base", size: [Wb, BY1 - FOOT, D], pos: [0, (BY1 + FOOT) / 2, 0], material: "soft" },
    { id: "SW", name: "Swing arm", size: [30, 30, D - 120], pos: [-xi + 15, BY1 - 40, 0], material: "metal" },
    { id: "SC", name: "Seat cushion", size: [Wb, SY - BY1 - 20, D - BT], pos: [0, (SY + BY1 + 20) / 2, zb + BT / 2 + (D - BT) / 2], material: "soft" },
  ];
  for (const [i, z] of [-D / 2 + 70, D / 2 - 70].entries())
    parts.push({ id: `C${i}`, name: "Castor", size: [40, FOOT, 50], pos: [-W / 2 + AW / 2, FOOT / 2, z], material: "metal" });
  const feet: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  for (const [i, [fx, fz]] of feet.entries())
    parts.push({ id: `F${i}`, name: "Foot", size: [60, FOOT, 60], pos: [fx * (xi - 70), FOOT / 2, fz * (D / 2 - 70)], shape: "cyl", material: "board" });
  const cw = Wb / 2 - 10;
  for (const [i, sx] of [-1, 1].entries())
    parts.push({ id: `K${i}`, name: "Back cushion", size: [cw, 350, 170], pos: [sx * (cw / 2 + 5), SY + 175, zb + BT / 2 + 85], rot: [-0.12, 0, 0], material: "soft" });

  const armRods: Vec3[] = [-150, 0].map((z) => [xi, 480, z - D / 4] as Vec3);
  const boardRods: Vec3[] = [-0.3, 0.3].map((t) => [t * Wb, BY1 + 20, zb] as Vec3);
  const armNuts: Vec3[] = armRods.map((p) => [p[0] - 30, p[1], p[2]] as Vec3);
  const backNuts: Vec3[] = boardRods.map((p) => [p[0], p[1] + 30, p[2]] as Vec3);
  const steps: CustomStep[] = [
    {
      title: "Screw the castors under the folding armrest",
      detail: "Stand it upside down on a rug. Two screws through each castor's plate.",
      add: ["FA", "C0", "C1"],
      fix: [{ kind: "screw", count: 4, len: 30, dia: 4, dir: [0, 1, 0], at: [-D / 2 + 70, D / 2 - 70].flatMap((z) => [-15, 15].map((dz) => [-W / 2 + AW / 2, FOOT, z + dz] as Vec3)) }],
      tools: ["screwdriver"],
      warnings: ["floor"],
    },
    {
      title: "Screw two rods into the fixed armrest",
      detail: "By hand, into the holes on its inside face, until they stop.",
      add: ["AR"],
      fix: [{ ...ROD, count: 2, at: armRods, dir: [1, 0, 0] }],
      warnings: ["hand"],
    },
    {
      title: "Screw two rods into the seat board",
      detail: "Into the holes along its back edge.",
      add: ["SB"],
      fix: [{ ...ROD, count: 2, at: boardRods, dir: [0, -1, 0] }],
      warnings: ["hand"],
    },
    {
      title: "Lower the backrest onto the rods",
      detail: "Stand it on the back edge of the board, over both rods. A washer and a nut on each, tightened with the wrench.",
      add: ["BK"],
      fix: [
        { ...WASHER, count: 2, at: backNuts, dir: [0, -1, 0] },
        { ...NUT, count: 2, at: backNuts, dir: [0, -1, 0] },
      ],
      tools: ["wrench"],
    },
    {
      title: "Screw the feet under the storage base",
      detail: "Turn the base upside down. Screw in the four feet by hand and stick a felt pad under each.",
      add: ["BS", "F0", "F1", "F2", "F3"],
      fix: [{ kind: "glide", name: "Felt pad", count: 4, at: feet.map(([fx, fz]) => [fx * (xi - 70), 0, fz * (D / 2 - 70)] as Vec3), dir: [0, 1, 0] }],
      pose: "-y",
      warnings: ["hand", "floor"],
    },
    {
      title: "Push the fixed armrest against the backrest",
      detail: "Open the two cover flaps at the end first, so its rods go through the holes in the backrest's frame.",
      pose: "+y",
    },
    {
      title: "Fix the angle bracket under the joint",
      detail: "One bolt into the armrest and one into the seat board, with the Allen key.",
      fix: [
        { kind: "angle", count: 1, at: [[xi, BY1, 0]], dir: [0, 1, 0], on: "SB", mate: "AR" },
        { kind: "bolt", count: 1, len: 16, dia: 6, at: [[xi - 25, BY1, 0]], dir: [0, 1, 0], on: "SB" },
        { kind: "bolt", count: 1, len: 16, dia: 6, at: [[xi, BY1 - 25, 0]], dir: [1, 0, 0], on: "AR" },
      ],
      tools: ["allen"],
    },
    {
      title: "Nut the armrest's rods from inside",
      detail: "A washer and a nut on each rod, tightened with the wrench.",
      fix: [
        { ...WASHER, count: 2, at: armNuts, dir: [1, 0, 0] },
        { ...NUT, count: 2, at: armNuts, dir: [1, 0, 0] },
      ],
      tools: ["wrench"],
    },
    {
      title: "Lift the swing arm up out of the base",
      detail: "It's folded inside. Raise it until its plates stand upright at the end of the base.",
      add: ["SW"],
    },
    {
      title: "Bolt the folding armrest to the swing arm",
      detail: "Two bolts through each plate into the armrest, with the Allen key.",
      fix: [{ kind: "bolt", count: 4, len: 20, dia: 6, dir: [-1, 0, 0], on: "SW", mate: "FA", at: [-D / 2 + 100, D / 2 - 100].flatMap((z) => [BY1 - 55, BY1 - 25].map((y) => [-xi + 30, y, z] as Vec3)) }],
      tools: ["allen"],
    },
    {
      title: "Fold the seat cushion down",
      detail: "Two of you lift the back unit onto the base, then fold the cushion forward and press its six tabs into the slots.",
      add: ["SC"],
      people: 2,
    },
    { title: "Put the back cushions on", add: ["K0", "K1"] },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["SKÖNABÄCK", "SKONABACK"],
  recipe(s) {
    if (!/sofa-bed|sleeper|sofa bed/i.test(`${s.slug} ${s.variant}`)) return null;
    return recipe();
  },
};
export default family;
