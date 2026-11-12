import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * SALTMYRAN, from IKEA's manual (the 2-seat and 3-seat sofas build the same way). The backrest comes packed inside
 * the armrests. Each armrest gets two legs, bolted to its inside face and up into its underside, and two threaded
 * rods. The seat frame lies on its front: three rods with big washers take the front rail, held by wing nuts. The
 * armrests are pushed onto the seat's ends and held by wing nuts from inside. Stood up, the backrest frame is lowered
 * in between the armrests on rods at its lower ends, then its cover is pulled over (two people) and two more rods
 * and wing nuts hold its top. The covers close with hook-and-loop, and the back cushion is filled and laid on.
 */

const ROD = { kind: "stud" as const, name: "Threaded rod", len: 90, dia: 8 };
const WING = { kind: "nut" as const, name: "Wing nut", len: 14, dia: 30 };
const WASHER = { kind: "washer" as const, len: 1.5, dia: 16 };

function recipe(s: ProductSpec) {
  const W = s.size.w * 10, D = 790;
  const AW = 120, AY0 = 110, AH = 470; // armrests
  const xa = W / 2 - AW / 2, xi = W / 2 - AW;
  const BT = 150, BH = 660; // backrest frame
  const SY0 = 180, SY1 = 430; // seat
  const zb = -D / 2 + BT / 2;
  const sz0 = -D / 2 + BT, sd = D / 2 - sz0;
  const sides = [-1, 1];
  const legZ = [-D / 2 + 90, D / 2 - 90];
  const legH = 270;

  const arm: PartPiece[] = [
    { shape: "box", size: [AW, AH - AY0 - AW / 2, D], pos: [0, -AW / 4, 0] },
    { shape: "cyl", size: [AW, D, AW], pos: [0, (AH - AY0) / 2 - AW / 2, 0], rot: [Math.PI / 2, 0, 0] },
  ];
  const leg = (sx: number): PartPiece[] => [
    { shape: "cyl", size: [25, legH, 25], pos: [0, 0, 0] },
    { shape: "box", size: [90, 4, 60], pos: [sx * 50, legH / 2 - 2, 0] },
    { shape: "box", size: [4, 60, 50], pos: [sx * 14, legH / 2 - 40, 0] },
  ];
  const parts: CustomPart[] = [];
  for (const [i, sx] of sides.entries()) {
    parts.push({ id: `A${i}`, name: "Armrest", size: [AW, AH - AY0, D], pos: [sx * xa, (AY0 + AH) / 2, 0], pieces: arm, material: "soft" });
    for (const [j, z] of legZ.entries())
      parts.push({ id: `L${i}${j}`, name: "Leg", size: [25, legH, 25], pos: [sx * (xi - 13), legH / 2, z], pieces: leg(sx), material: "metal" });
  }
  parts.push({ id: "S", name: "Seat", size: [2 * xi, SY1 - SY0, sd], pos: [0, (SY0 + SY1) / 2, sz0 + sd / 2], material: "soft" });
  parts.push({ id: "F", name: "Front rail", size: [2 * xi, 60, 30], pos: [0, SY0 - 30, D / 2 - 15], material: "soft" });
  const back: PartPiece[] = [
    { shape: "box", size: [2 * xi, BH - SY0 - BT / 2, BT], pos: [0, -BT / 4, 0] },
    { shape: "cyl", size: [BT, 2 * xi, BT], pos: [0, (BH - SY0) / 2 - BT / 2, 0], rot: [0, 0, Math.PI / 2] },
  ];
  parts.push({ id: "B", name: "Backrest", size: [2 * xi, BH - SY0, BT], pos: [0, (SY0 + BH) / 2, zb], pieces: back, material: "soft" });
  parts.push({ id: "K", name: "Back cushion", size: [2 * xi - 20, 340, 130], pos: [0, 770 - 170, sz0 + 65], rot: [-0.12, 0, 0], material: "soft" });

  const armRods = (sx: number) => [-120, 220].map((z) => [sx * xi, 300, z] as Vec3);
  const frontRods = [-0.35, 0, 0.35].map((t) => [t * 2 * xi, SY0 - 30, D / 2 - 30] as Vec3);
  const lowRod = (sx: number): Vec3 => [sx * xi, 330, zb];
  const topRod = (sx: number): Vec3 => [sx * xi, BH - 120, zb];
  const nutIn = (p: Vec3, sx: number): Vec3 => [p[0] - sx * 40, p[1], p[2]];
  const legBolts = (i: number, sx: number): CustomFix[] => [
    { kind: "bolt", count: 2, len: 30, dia: 6, mate: `A${i}`, dir: [sx, 0, 0], at: legZ.map((z) => [sx * (xi - 26), AY0 + 60, z] as Vec3) },
    { kind: "bolt", count: 4, len: 20, dia: 6, mate: `A${i}`, dir: [0, 1, 0], at: legZ.flatMap((z) => [-15, 15].map((dz) => [sx * (xi + 40), AY0 - 4, z + dz] as Vec3)) },
  ];

  const steps: CustomStep[] = [
    {
      title: "Take the backrest out of the armrests",
      detail: "It's packed inside them. Slide the two armrests apart and lift it out.",
      add: ["A0", "A1"],
      people: 2,
    },
    {
      title: "Open the cover flaps under the armrests",
      detail: "Peel back the hook-and-loop strips at the bottom, so the holes inside are free.",
      warnings: ["hand"],
    },
    {
      title: "Bolt the legs to the armrests",
      detail: "One bolt through each leg's bracket into the armrest's inside face. Leave them a little loose.",
      add: ["L00", "L01", "L10", "L11"],
      fix: [legBolts(0, -1)[0], legBolts(1, 1)[0]],
      tools: ["allen"],
    },
    {
      title: "Bolt up through the leg plates",
      detail: "Two bolts in each plate, into the armrest's underside. Now tighten all the leg bolts.",
      fix: [legBolts(0, -1)[1], legBolts(1, 1)[1]],
      tools: ["allen"],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Screw two rods into each armrest",
      detail: "By hand, into the holes on the inside face, until half of each rod sticks out.",
      fix: sides.map((sx): CustomFix => ({ ...ROD, count: 2, at: armRods(sx), dir: [sx, 0, 0] })),
      pose: "+y",
      warnings: ["hand"],
    },
    {
      title: "Screw three rods into the seat",
      detail: "Lay the seat on its front. A big washer on each rod first.",
      add: ["S"],
      fix: [
        { kind: "washer", name: "Big washer", count: 3, len: 5, dia: 40, at: frontRods.map((p) => [p[0], p[1], D / 2 - 30] as Vec3), dir: [0, 0, -1] },
        { ...ROD, count: 3, at: frontRods, dir: [0, 0, -1] },
      ],
      pose: "-z",
      warnings: ["hand", "floor"],
    },
    { title: "Fit the front rail onto the rods", add: ["F"] },
    {
      title: "Hold the rail on with wing nuts",
      detail: "A washer and a wing nut on each rod, turned by hand.",
      fix: [
        { ...WASHER, count: 3, at: frontRods.map((p) => [p[0], p[1], D / 2 - 30] as Vec3), dir: [0, 0, 1] },
        { ...WING, count: 3, at: frontRods.map((p) => [p[0], p[1], D / 2 - 30] as Vec3), dir: [0, 0, 1] },
      ],
      warnings: ["hand"],
    },
  ];
  for (const [i, sx] of sides.entries()) {
    const nuts = armRods(sx).map((p) => nutIn(p, sx));
    steps.push({
      title: i === 0 ? "Push an armrest onto the end of the seat" : "Do the same with the other armrest",
      detail: i === 0 ? "Its rods go through the holes in the seat's end. A washer and a wing nut on each, from inside the seat." : "Two washers and two wing nuts, from inside the seat.",
      fix: [
        { ...WASHER, count: 2, at: nuts, dir: [sx, 0, 0] },
        { ...WING, count: 2, at: nuts, dir: [sx, 0, 0] },
      ],
      warnings: ["hand"],
    });
  }
  steps.push(
    {
      title: "Stand it up and screw a rod into the right armrest",
      detail: "Low down near the back, on the inside face.",
      fix: [{ ...ROD, count: 1, at: [lowRod(1)], dir: [1, 0, 0] }],
      pose: "+y",
      people: 2,
      warnings: ["two", "hand"],
    },
    {
      title: "Lower the backrest in behind the seat",
      detail: "Tilt it in between the armrests, onto the rod.",
      add: ["B"],
    },
    { title: "Screw a rod into the left armrest", detail: "Through the backrest's end, into the armrest.", fix: [{ ...ROD, count: 1, at: [lowRod(-1)], dir: [-1, 0, 0] }], warnings: ["hand"] },
    {
      title: "Hold the backrest with wing nuts",
      detail: "A washer and a wing nut on each rod, from inside the backrest. Hand tight for now.",
      fix: sides.flatMap((sx): CustomFix[] => [
        { ...WASHER, count: 1, at: [nutIn(lowRod(sx), sx)], dir: [sx, 0, 0] },
        { ...WING, count: 1, at: [nutIn(lowRod(sx), sx)], dir: [sx, 0, 0] },
      ]),
      warnings: ["hand"],
    },
    {
      title: "Pull the cover over the backrest",
      detail: "One of you each end. Start at the top and work it down over the frame.",
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Screw two rods in at the top of the backrest",
      detail: "One at each end, through the backrest into the armrests.",
      fix: sides.map((sx): CustomFix => ({ ...ROD, count: 1, at: [topRod(sx)], dir: [sx, 0, 0] })),
      warnings: ["hand"],
    },
    {
      title: "Put a washer and a wing nut on each",
      fix: sides.flatMap((sx): CustomFix[] => [
        { ...WASHER, count: 1, at: [nutIn(topRod(sx), sx)], dir: [sx, 0, 0] },
        { ...WING, count: 1, at: [nutIn(topRod(sx), sx)], dir: [sx, 0, 0] },
      ]),
      warnings: ["hand"],
    },
    { title: "Tighten the four backrest wing nuts", detail: "By hand, with the wings standing upright so the cover lies flat over them.", warnings: ["hand"] },
    { title: "Close the covers", detail: "Pull the backrest cover down at the back and press the hook-and-loop strips closed underneath." },
    {
      title: "Fill the back cushion and lay it on",
      detail: "Push the foam pieces into the cover side by side, corners first, and zip it closed.",
      add: ["K"],
    },
  );
  return { parts, steps };
}

const family: Family = {
  names: ["SALTMYRAN"],
  recipe(s) {
    if (!/seat-sofa|seat sofa/i.test(`${s.slug} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
