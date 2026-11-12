import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * GRÖNFJÄLL office chair with armrests, read from IKEA's manuals (the chair's, and the headrest's for the chair
 * sold with one). The base is laid upside down for the five castors and stood up, and the gas lift (cap off) goes in.
 * The seat lies upside down: the mechanism is bolted on with four bolts (the key goes in its long handle), its
 * cover clicks over it, and with the seat on a table edge the backrest's bracket slides into the mechanism and is
 * held with four more bolts. Both armrests slide into the sides of the seat and are held by two long bolts each.
 * Two people lift the seat onto the gas lift and sitting on it locks it. The headrest: the cap at the top of the
 * backrest comes off, the headrest is bolted in with three bolts and the cap clicks back on over them.
 * IKEA's sizes: 71 x 71 cm, 113 high at the lowest seat (133 with the headrest), seat 52 x 46 from 46 cm up,
 * armrests 29 to 37 cm above the seat.
 */

/** One part drawn as boxes given in finished-product mm. */
function boxes(id: string, name: string, list: [Vec3, Vec3, PartMaterial?][], material: PartMaterial): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...list.map((b) => b[0][k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...list.map((b) => b[1][k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  const pieces: PartPiece[] = list.map(([a, b, m]) => ({
    shape: "box",
    size: [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    pos: [(a[0] + b[0]) / 2 - pos[0], (a[1] + b[1]) / 2 - pos[1], (a[2] + b[2]) / 2 - pos[2]],
    ...(m ? { material: m } : {}),
  }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos, material, pieces };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
// x between distances a and b from the middle, on side g
const xs = (g: number, a: number, b: number): [number, number] => [Math.min(g * a, g * b), Math.max(g * a, g * b)];

function chair(s: ProductSpec): CustomParams {
  const head = /head/i.test(`${s.variant} ${s.slug ?? ""}`);
  const R = 330, AY0 = 70, AY1 = 110;
  const SY = 460, MY = 350;
  const angles = [0, 1, 2, 3, 4].map((i) => (i * 2 * Math.PI) / 5);
  // the star base comes in one piece
  const hub = 50;
  const base: CustomPart = {
    id: "A",
    name: "Star base",
    material: "metal",
    size: [2 * R, 80, 2 * R],
    pos: [0, 100, 0],
    pieces: [
      { shape: "cyl", size: [90, 60, 90], pos: [0, -5, 0] },
      ...angles.map((a): PartPiece => ({ shape: "box", size: [50, AY1 - AY0, R - hub], pos: [Math.sin(a) * (R + hub) / 2, (AY0 + AY1) / 2 - 100, Math.cos(a) * (R + hub) / 2], rot: [0, a, 0] })),
    ],
  };
  const parts: CustomPart[] = [
    base,
    { id: "G", name: "Gas lift", shape: "cyl", material: "metal", size: [50, MY - 120, 50], pos: [0, (MY + 120) / 2, 0] },
    boxes("S", "Seat", [[[-260, MY + 40, -210], [260, SY, 250]]], "soft"),
    boxes("M", "Mechanism", [[[-90, MY, -130], [90, MY + 40, 100]], [[90, MY + 10, 40], [230, MY + 22, 52]]], "metal"),
    boxes("C", "Mechanism cover", [[[-110, MY - 30, -150], [110, MY, 120]]], "board"),
  ];
  // the upholstered back, narrower at the waist, on its J-shaped bracket from under the seat
  const bz = -290;
  parts.push(
    boxes("B", "Backrest", [
      [[-40, MY - 20, -260], [40, MY, -150], "metal"],
      [[-40, MY - 20, bz + 35], [40, 520, bz + 55], "metal"],
      [[-215, 520, bz - 35], [215, 780, bz + 35]],
      [[-240, 780, bz - 35], [240, 1130, bz + 35]],
    ], "soft"),
  );
  parts.push(
    ...[-1, 1].map((g, i) =>
      boxes(`R${i}`, "Armrest", [
        [[xs(g, 150, 285)[0], MY + 10, -80], [xs(g, 150, 285)[1], MY + 30, 0]],
        [[xs(g, 260, 290)[0], MY + 10, -60], [xs(g, 260, 290)[1], 730, -20]],
        [[xs(g, 240, 310)[0], 730, -160], [xs(g, 240, 310)[1], 755, 100], "soft"],
      ], "board"),
    ),
  );
  if (head) parts.push(boxes("H", "Headrest", [[[-30, 1060, bz - 50], [30, 1150, bz - 35], "metal"], [[-210, 1150, bz - 40], [210, 1330, bz + 40]]], "soft"));

  const ends = angles.map((a): Vec3 => [Math.sin(a) * (R - 20), AY0, Math.cos(a) * (R - 20)]);
  const steps: CustomStep[] = [
    {
      title: "Push the castors into the base",
      detail: "Lay the base upside down on a rug and press each castor in until it snaps home.",
      add: ["A"],
      fix: [fix("castor", ends, [0, 1, 0], { len: 60, dia: 50, on: "A" })],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Take the cap off the gas lift", detail: "Stand the base on its castors and throw the cap away.", pose: "+y" },
    { title: "Stand the gas lift in the base", detail: "Narrow end up. It just sits in the hole for now.", add: ["G"], from: { G: [0, 300, 0] } },
    {
      title: "Bolt the mechanism under the seat",
      detail: "Lay the seat upside down on a soft surface. Slide the Allen key into its long handle and turn in the four bolts.",
      add: ["S", "M"],
      fix: [fix("bolt", [-1, 1].flatMap((g) => [-110, 80].map((z): Vec3 => [g * 75, MY, z])), [0, 1, 0], { len: 20, dia: 8, on: "M" })],
      tools: ["allen"],
      from: { S: [0, 300, 0], M: [0, -300, 0] },
    },
    { title: "Click the cover over the mechanism", detail: "Press it on until all three catches click.", add: ["C"], from: { C: [0, -250, 0] } },
    {
      title: "Bolt the backrest to the mechanism",
      detail: "Rest the seat upside down on a table edge so the backrest can hang down. Slide its bracket into the mechanism and turn in four bolts.",
      add: ["B"],
      fix: [fix("bolt", [-1, 1].flatMap((g) => [-240, -170].map((z): Vec3 => [g * 22, MY - 20, z])), [0, 1, 0], { len: 16, dia: 8, on: "B" })],
      tools: ["allen"],
      from: { B: [0, 0, -400] },
    },
    { title: "Slide the armrests into the seat", detail: "Each arm goes into the slot in the side of the seat, from the outside.", add: ["R0", "R1"], from: { R0: [-300, 0, 0], R1: [300, 0, 0] } },
    {
      title: "Bolt the armrests on",
      detail: "Two long bolts through each arm into the mechanism.",
      fix: [-1, 1].map((g) => fix("bolt", [-60, -20].map((z): Vec3 => [g * 285, MY + 20, z]), [-g, 0, 0], { len: 50, dia: 8, on: `R${g < 0 ? 0 : 1}` })),
      tools: ["allen"],
    },
    {
      title: "Lift the seat onto the gas lift",
      detail: "One person each side, set the mechanism over the top of the gas lift.",
      people: 2,
      warnings: ["two"],
    },
    { title: "Sit down to lock it", detail: "Your weight pushes the gas lift home for good." },
  ];
  if (head)
    steps.push(
      { title: "Take the cap off the top of the backrest", detail: "Prise it out at the back. You'll put it on again over the headrest bolts." },
      {
        title: "Bolt the headrest in",
        detail: "Slide its stem into the top of the backrest and fix it with three bolts.",
        add: ["H"],
        fix: [fix("bolt", [1080, 1105, 1130].map((y): Vec3 => [0, y, bz - 50]), [0, 0, 1], { len: 16, dia: 6, on: "H" })],
        tools: ["allen"],
        from: { H: [0, 300, 0] },
      },
      { title: "Click the cap back on", detail: "It covers the bolts. Slide the headrest up or down to suit you." },
    );
  return { parts, steps };
}

const family: Family = {
  names: ["GRÖNFJÄLL", "GRONFJALL"],
  recipe(s) {
    if (!/office chair/i.test(`${s.variant} ${s.slug ?? ""}`.replace(/-/g, " "))) return null;
    return chair(s);
  },
};
export default family;
