import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/**
 * SUNDBRON, from IKEA's manuals (the loveseat and the sofa build the same way, only wider). Four threaded rods go
 * into the seat base and the backrest frame is lowered onto them, held by wing nuts from inside. Each armrest gets
 * four rods with a spacer disc on each; two people push the armrests onto the ends and they are held by wing nuts
 * from inside. Laid on its back, the four round legs are bolted under the armrests and get felt pads; stood up,
 * the seat cushions and back cushions go on.
 */

const ROD = { kind: "stud" as const, name: "Threaded rod", len: 90, dia: 8 };
const WING = { kind: "nut" as const, name: "Wing nut", len: 14, dia: 30 };
const WASHER = { kind: "washer" as const, len: 1.5, dia: 16 };

function recipe(s: ProductSpec) {
  const W = s.size.w * 10, D = 1100;
  const AW = 285; // armrests: IKEA's width less the seat width, halved
  const Wb = W - 2 * AW, xi = Wb / 2;
  const LEG = 40, BY1 = 330, BT = 220, BH = 800, AH = 650;
  const zb = -D / 2 + BT / 2;
  const sides = [-1, 1];
  const parts: CustomPart[] = [
    { id: "BS", name: "Seat base", size: [Wb, BY1 - LEG, D], pos: [0, (BY1 + LEG) / 2, 0], material: "soft" },
    { id: "BK", name: "Backrest", size: [Wb, BH - BY1, BT], pos: [0, (BH + BY1) / 2, zb], material: "soft" },
  ];
  for (const [i, sx] of sides.entries()) parts.push({ id: `A${i}`, name: "Armrest", size: [AW, AH - LEG, D], pos: [sx * (W / 2 - AW / 2), (AH + LEG) / 2, 0], material: "soft" });
  const legs: Vec3[] = sides.flatMap((sx) => [-1, 1].map((sz) => [sx * (W / 2 - AW / 2), LEG / 2, sz * (D / 2 - 130)] as Vec3));
  legs.forEach((p, i) => parts.push({ id: `L${i}`, name: "Leg", size: [120, LEG, 120], pos: p, shape: "cyl", material: "wood" }));
  const cw = Wb / 2 - 5;
  const cz0 = zb + BT / 2, cd = D / 2 - cz0;
  for (const [i, sx] of sides.entries()) {
    parts.push({ id: `S${i}`, name: "Seat cushion", size: [cw, 510 - BY1, cd], pos: [sx * (cw / 2 + 2.5), (510 + BY1) / 2, cz0 + cd / 2], material: "soft" });
    parts.push({ id: `K${i}`, name: "Back cushion", size: [cw, 450, 220], pos: [sx * (cw / 2 + 2.5), 510 + 225, cz0 + 110], rot: [-0.12, 0, 0], material: "soft" });
  }

  const baseRods: Vec3[] = [-0.38, -0.13, 0.13, 0.38].map((t) => [t * Wb, BY1, zb] as Vec3);
  const baseNuts: Vec3[] = baseRods.map((p) => [p[0], BY1 - 40, p[2]] as Vec3);
  // two rods into the seat base's end and two into the backrest's end, on each side
  const armRods = (sx: number): Vec3[] => [
    [sx * xi, 180, -100],
    [sx * xi, 180, 300],
    [sx * xi, 450, zb],
    [sx * xi, 650, zb],
  ];
  const nutsIn = (sx: number): Vec3[] => armRods(sx).map((p) => [p[0] - sx * 40, p[1], p[2]] as Vec3);
  const perSide = (f: (sx: number) => CustomFix) => sides.map(f);

  const steps: CustomStep[] = [
    {
      title: "Screw four rods into the seat base",
      detail: "By hand, into the holes along the back of the top.",
      add: ["BS"],
      fix: [{ ...ROD, count: 4, at: baseRods, dir: [0, -1, 0] }],
      warnings: ["hand"],
    },
    { title: "Lower the backrest onto the rods", detail: "Along the back of the base, every rod through its hole.", add: ["BK"] },
    {
      title: "Hold the backrest with wing nuts",
      detail: "From inside the base: a washer and a wing nut on each rod, turned by hand until they're tight.",
      fix: [
        { ...WASHER, count: 4, at: baseNuts, dir: [0, 1, 0] },
        { ...WING, count: 4, at: baseNuts, dir: [0, 1, 0] },
      ],
      warnings: ["hand"],
    },
    {
      title: "Screw four rods into each armrest",
      detail: "Into the holes on the inside face.",
      add: ["A0", "A1"],
      fix: perSide((sx) => ({ ...ROD, count: 4, at: armRods(sx), dir: [sx, 0, 0] })),
      warnings: ["hand"],
    },
    {
      title: "Push a spacer disc onto each rod",
      detail: "All the way down to the armrest.",
      fix: perSide((sx) => ({ kind: "spacer", name: "Spacer disc", len: 6, dia: 40, count: 4, at: armRods(sx).map((p) => [p[0] - sx * 3, p[1], p[2]] as Vec3), dir: [sx, 0, 0] })),
      warnings: ["hand"],
    },
    {
      title: "Push the armrests onto the ends",
      detail: "One of you at each end, rods through the holes in the base and backrest.",
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Hold the armrests with wing nuts",
      detail: "From inside: a washer and a wing nut on each of the eight rods.",
      fix: [
        ...perSide((sx) => ({ ...WASHER, count: 4, at: nutsIn(sx), dir: [sx, 0, 0] as Vec3 })),
        ...perSide((sx) => ({ ...WING, count: 4, at: nutsIn(sx), dir: [sx, 0, 0] as Vec3 })),
      ],
      warnings: ["hand"],
    },
    {
      title: "Lay it on its back and bolt on the legs",
      detail: "Two of you tip it over onto a rug. One bolt through the middle of each leg, with the Allen key.",
      add: ["L0", "L1", "L2", "L3"],
      fix: [{ kind: "bolt", count: 4, len: 70, dia: 8, at: legs.map((p) => [p[0], 0, p[2]] as Vec3), dir: [0, 1, 0] }],
      pose: "+z",
      people: 2,
      tools: ["allen"],
      warnings: ["two", "floor"],
    },
    {
      title: "Stick a felt pad under each leg",
      fix: [{ kind: "glide", name: "Felt pad", count: 4, at: legs.map((p) => [p[0], 0, p[2]] as Vec3), dir: [0, 1, 0] }],
    },
    {
      title: "Stand it up and lay the seat cushions in",
      detail: "Two of you tip it back onto its legs.",
      add: ["S0", "S1"],
      pose: "+y",
      people: 2,
      warnings: ["two"],
    },
    { title: "Put the back cushions on", add: ["K0", "K1"] },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["SUNDBRON"],
  recipe(s) {
    if (!/loveseat|sofa/i.test(`${s.slug} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
