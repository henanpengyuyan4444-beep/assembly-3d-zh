import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * DANDERYD, read from its manuals. Every table is built upside down on its opened box. The dining table gets its two
 * long rails screwed straight to the top, a corner bracket slid onto each rail end, the short rails slid into the
 * brackets and screwed down, and each leg bolted into its bracket with a washer and a spring washer, tightened with
 * the spanner. The drop-leaf table starts with the middle top and both leaves: stop plates and rubber stops on the
 * leaves, four hinges, two slide bars held by a guide bracket, then the cross rails over the bars, corner brackets,
 * side rails and legs the same way.
 */

type Kind = CustomFix["kind"];
const fx = (kind: Kind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const G = [-1, 1] as const;
const r = (n: number) => Math.round(n);

const TT = 30; // top
const RH = 80, RT = 22; // rails
const LEG = 62; // legs, square at the top
const IN = 80; // leg centres in from the top's edges
const UP: Vec3 = [0, 1, 0];

const SCREW = { len: 60, dia: 6, name: "Allen screw" };
const BOLT = { len: 70, dia: 8, name: "Hex bolt" };
const WASHER = { len: 2, dia: 18 };
const SPRING = { len: 2, dia: 14, name: "Spring washer" };
const BRACKET = { len: 90, dia: 40, name: "Corner bracket" };
const SMALL = { len: 16, dia: 4 };

const legPieces = (h: number): PartPiece[] => [
  { shape: "box", size: [LEG, 150, LEG], pos: [0, h / 2 - 75, 0] },
  { shape: "cyl", size: [LEG - 6, h - 290, LEG - 6], pos: [0, (h - 290) / 2 - h / 2 + 140, 0] },
  { shape: "cyl", size: [LEG - 10, 40, LEG - 10], pos: [0, -h / 2 + 120, 0] },
  { shape: "cyl", size: [LEG - 22, 100, LEG - 22], pos: [0, -h / 2 + 50, 0] },
];

interface Frame {
  W: number; // the fixed top the frame sits under
  D: number;
  H: number;
}

/** Rails, legs and the fittings that hold them, for a top W x D. Rails along x are "long", along z "short". */
function frame({ W, D, H }: Frame) {
  const yTop = H - TT;
  const xl = W / 2 - IN, zl = D / 2 - IN; // leg centres
  const xo = W / 2 - IN + LEG / 2 - RT / 2, zo = D / 2 - IN + LEG / 2 - RT / 2; // rails flush with the legs' outer faces
  const lenX = 2 * xl - LEG, lenZ = 2 * zl - LEG;
  const yR = yTop - RH / 2;
  const railX = (id: string, sz: number): CustomPart => ({ id, name: "Long rail", size: [r(lenX), RH, RT], pos: [0, yR, r(sz * zo)], material: "board" });
  const railZ = (id: string, sx: number, pieces?: PartPiece[]): CustomPart => ({ id, name: "Short rail", size: [RT, RH, r(lenZ)], pos: [r(sx * xo), yR, 0], material: "board", ...(pieces ? { pieces } : {}) });
  const legs: CustomPart[] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([sx, sz], i) => ({ id: `G${i + 1}`, name: "Leg", size: [LEG, yTop, LEG], pos: [r(sx * xl), yTop / 2, r(sz * zl)], material: "board", pieces: legPieces(yTop) }));
  // fittings
  const corner = (sx: number, sz: number): Vec3 => [r(sx * (xl - LEG / 2 - 30)), yR, r(sz * (zl - LEG / 2 - 30))];
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  const brackets = corners.map(([sx, sz]) => fx("angle", [corner(sx, sz)], [sx, 0, 0], { ...BRACKET, on: sz < 0 ? "X1" : "X2", mate: sx < 0 ? "Z1" : "Z2" }));
  const legBolts = corners.flatMap(([sx, sz], i) => {
    const d: Vec3 = [sx * 0.71, 0, sz * 0.71];
    const p = corner(sx, sz);
    return [
      fx("washer", [p], d, { ...SPRING }),
      fx("washer", [p], d, { ...WASHER }),
      fx("bolt", [p], d, { ...BOLT, mate: `G${i + 1}` }),
    ];
  });
  const screwsX = (n: number) =>
    G.map((sz, i) => fx("screw", Array.from({ length: n }, (_, k) => [r(-lenX / 2 + 90 + ((lenX - 180) * k) / Math.max(1, n - 1)), yR, r(sz * zo)] as Vec3), UP, { ...SCREW, on: `X${i + 1}`, mate: "T" }));
  const screwsZ = (n: number) =>
    G.map((sx, i) => fx("screw", Array.from({ length: n }, (_, k) => [r(sx * xo), yR, r(-lenZ / 2 + 90 + ((lenZ - 180) * k) / Math.max(1, n - 1))] as Vec3), UP, { ...SCREW, on: `Z${i + 1}`, mate: "T" }));
  return { yTop, railX, railZ, legs, brackets, legBolts, screwsX, screwsZ, zo, xo, lenZ };
}

const legSteps = (f: ReturnType<typeof frame>): CustomStep[] => [
  {
    title: "Bolt on the legs at one end",
    detail: "Stand each leg in its corner. A spring washer and a washer go on each bolt, through the bracket into the leg, hand tight for now.",
    add: ["G1", "G3"],
    fix: f.legBolts.filter((_, i) => [0, 2].includes(Math.floor(i / 3))),
    tools: ["wrench"],
  },
  {
    title: "Bolt on the other two legs",
    detail: "The same way, hand tight.",
    add: ["G2", "G4"],
    fix: f.legBolts.filter((_, i) => [1, 3].includes(Math.floor(i / 3))),
    tools: ["wrench"],
  },
  {
    title: "Tighten the leg bolts",
    detail: "With the spanner, until the spring washer is pressed flat. Stop there, or the bracket bends.",
    tools: ["wrench"],
  },
  { title: "Turn the table over", detail: "Together, lifting it by the top, never by the legs.", pose: "+y", people: 2, warnings: ["two"] },
];

function dining(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const f = frame({ W, D, H });
  const parts: CustomPart[] = [
    { id: "T", name: "Table top", size: [W, TT, D], pos: [0, H - TT / 2, 0], material: "board" },
    f.railX("X1", -1),
    f.railX("X2", 1),
    f.railZ("Z1", -1),
    f.railZ("Z2", 1),
    ...f.legs,
  ];
  const n = W > 1500 ? 4 : 3;
  const steps: CustomStep[] = [
    { title: "Lay the top upside down", detail: "Flat on the opened box, so the surface stays free of scratches.", add: ["T"], pose: "-y", warnings: ["floor"] },
    {
      title: "Screw the long rails to the top",
      detail: `${n} screws through each rail, turned with the Allen key. The open ends face the corners.`,
      add: ["X1", "X2"],
      fix: f.screwsX(n),
      tools: ["allen"],
    },
    { title: "Slide a corner bracket onto each rail end", detail: "Its tabs go into the open ends of the rails.", fix: f.brackets },
    { title: "Slide in the short rails", detail: "Push each one onto the free tabs of two brackets.", add: ["Z1", "Z2"] },
    { title: "Screw the short rails to the top", detail: "Two screws through each, with the Allen key.", fix: f.screwsZ(2), tools: ["allen"] },
    ...legSteps(f),
  ];
  return { parts, steps };
}

function dropLeaf(s: ProductSpec): CustomParams {
  const D = s.size.d * 10, H = s.size.h * 10;
  const Wmax = s.size.w * 10;
  const M = 740; // the fixed middle, the shortest the table gets
  const LW = (Wmax - M) / 2;
  const f = frame({ W: M, D, H });
  const yU = f.yTop; // underside of the top
  const BH = 20, BW = 30, BL = 360; // slide bars
  // the cross rails have a notch in the middle for the slide bars
  const notch: PartPiece[] = [
    { shape: "box", size: [RT, RH - BH - 4, f.lenZ], pos: [0, -(BH + 4) / 2, 0] },
    ...G.map((sz): PartPiece => ({ shape: "box", size: [RT, BH + 4, f.lenZ / 2 - 25], pos: [0, (RH - BH - 4) / 2, sz * (f.lenZ / 4 + 12.5)] })),
  ];
  const parts: CustomPart[] = [
    { id: "T", name: "Table top", size: [M, TT, D], pos: [0, H - TT / 2, 0], material: "board" },
    ...G.map((sx, i): CustomPart => ({ id: `L${i + 1}`, name: "Leaf", size: [r(LW), TT, D], pos: [r(sx * (M / 2 + LW / 2)), H - TT / 2, 0], material: "board" })),
    ...G.map((sx, i): CustomPart => ({ id: `B${i + 1}`, name: "Slide bar", size: [BL, BH, BW], pos: [r(sx * (BL / 2 + 10)), yU - BH / 2, 0], material: "board" })),
    f.railZ("Z1", -1, notch),
    f.railZ("Z2", 1, notch),
    f.railX("X1", -1),
    f.railX("X2", 1),
    ...f.legs,
  ];
  const leafX = (sx: number) => r(sx * (M / 2 + LW / 2));
  const hingeAt: Vec3[] = G.flatMap((sx) => G.map((sz): Vec3 => [sx * (M / 2), yU, r(sz * (D / 2 - 150))]));
  const hingeScrews: Vec3[] = hingeAt.flatMap(([x, y, z]) => [-50, -22, 22, 50].flatMap((dx) => [-22, 22].map((dz): Vec3 => [x + dx, y, z + dz])));
  const stops: Vec3[] = G.flatMap((sx) => G.map((sz): Vec3 => [leafX(sx), yU, r(sz * (D / 2 - 120))]));
  const steps: CustomStep[] = [
    {
      title: "Press a stop plate into each leaf",
      detail: "Lay the top and the two leaves upside down on a rug, edges together. The plate's pegs go into the holes near the middle of each leaf.",
      add: ["T", "L1", "L2"],
      fix: [fx("clip", G.map((sx): Vec3 => [r(sx * (M / 2 + LW - 60)), yU, 0]), UP, { name: "Stop plate", len: 12, dia: 40 })],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Screw a rubber stop onto each leaf",
      detail: "Two on each leaf, one small screw through each stop.",
      fix: [fx("glide", stops, UP, { name: "Rubber stop", len: 12, dia: 24 }), fx("screw", stops, UP, { len: 20, dia: 3.5 })],
      tools: ["screwdriver"],
    },
    {
      title: "Screw on the hinges",
      detail: "Two hinges across each joint, eight screws in each. Keep the edges tight together while you screw.",
      fix: [fx("hinge", hingeAt, UP, { len: 90, dia: 50 }), fx("screw", hingeScrews, UP, { ...SMALL })],
      tools: ["screwdriver"],
    },
    {
      title: "Lay the slide bars along the middle",
      detail: "End to end down the centre line, each capped end facing out towards a leaf.",
      add: ["B1", "B2"],
    },
    {
      title: "Screw the guide bracket over the bars",
      detail: "It straddles the inner ends of both bars. Three screws hold it, and the bars must still slide.",
      fix: [fx("clamp", [[0, yU - BH / 2, 0]], UP, { name: "Guide bracket", len: 30, dia: 160, on: "T" }), fx("screw", [[-60, yU, 0], [0, yU, 0], [60, yU, 0]], UP, { ...SMALL, on: "T" })],
      tools: ["screwdriver"],
    },
    {
      title: "Lay the cross rails over the bars",
      detail: "Clip a guide into the notch of each rail first. The notch goes down over the bars.",
      add: ["Z1", "Z2"],
      fix: [fx("clip", G.map((sx): Vec3 => [r(sx * f.xo), yU - BH / 2, 0]), [0, -1, 0], { name: "Guide", len: 24, dia: 34 })],
    },
    { title: "Screw the cross rails to the top", detail: "Two screws through each, with the Allen key.", fix: f.screwsZ(2), tools: ["allen"] },
    { title: "Slide a corner bracket onto each rail end", detail: "Its tabs go into the open ends of the cross rails.", fix: f.brackets.map((b) => ({ ...b, dir: [0, 0, Math.sign(b.at![0][2])] as Vec3, on: (b.at![0][0] < 0 ? "Z1" : "Z2"), mate: (b.at![0][2] < 0 ? "X1" : "X2") })) },
    { title: "Slide in the side rails", detail: "Push each one onto the free tabs of two brackets.", add: ["X1", "X2"] },
    { title: "Screw the side rails to the top", detail: "Two screws through each, with the Allen key.", fix: f.screwsX(2), tools: ["allen"] },
    ...legSteps(f),
    { title: "Try the leaves", detail: "Lift a leaf and pull its slide bar out under it to hold it up. Push the bar back in to let it down." },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["DANDERYD"],
  recipe(s) {
    const v = `${s.variant} ${s.slug ?? ""}`.toLowerCase();
    if (/drop-leaf|dropleaf/.test(v)) return dropLeaf(s);
    if (/dining table/.test(v)) return dining(s);
    return null;
  },
};
export default family;
