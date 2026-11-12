import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * VISKAFORS, read from its manuals. The armchair and the 2-seat sofa come as one upholstered body: it is laid on its
 * back on a rug, the four turned legs are screwed into the corners of the base, felt pads go under them, and two people
 * stand it up. The 3-seat sofa comes in two halves, each with one rolled arm: on their backs, a guide pin goes into one
 * half and they are pushed together, then five threaded rods with wing nuts (two through the front rail, two through
 * the back rail, each with two washers, and one through the bracket of the middle leg) hold them. The four corner legs
 * go on last, before it is turned over.
 */

type Kind = CustomFix["kind"];
const fx = (kind: Kind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const r = (n: number) => Math.round(n);

const LEG = 110; // free height under the base
const BASE = 200; // top of the plinth
const SEAT = 460;
const AW = 220;
const BT = 230; // backrest, back to front
const RAIL = 80; // base rails

const ROD = { len: 180, dia: 8, name: "Threaded rod" };
const WING = { len: 14, dia: 34, name: "Wing nut" };
const WASHER = { len: 2, dia: 20 };
const PAD = { len: 4, dia: 40, name: "Felt pad" };

const legPieces: PartPiece[] = [
  { shape: "cyl", size: [62, 26, 62], pos: [0, LEG / 2 - 13, 0] },
  { shape: "cyl", size: [80, 40, 80], pos: [0, 10, 0] },
  { shape: "cyl", size: [48, 18, 48], pos: [0, -19, 0] },
  { shape: "cyl", size: [60, 26, 60], pos: [0, -LEG / 2 + 13, 0] },
];
const leg = (id: string, x: number, z: number): CustomPart => ({ id, name: "Leg", size: [80, LEG, 80], pos: [r(x), LEG / 2, r(z)], material: "wood", pieces: legPieces });

/**
 * One upholstered body from x0 to x1, with a rolled arm on the left and/or right end: plinth, seat, the channelled
 * backrest and the arms, drawn as pieces of one part.
 */
function body(id: string, name: string, x0: number, x1: number, H: number, D: number, armL: boolean, armR: boolean, seats: number): CustomPart {
  const W = x1 - x0, xc = (x0 + x1) / 2, yc = (H + LEG) / 2;
  const at = (x: number, y: number, z: number): Vec3 => [r(x - xc), r(y - yc), r(z)];
  const xa = x0 + (armL ? AW : 0), xb = x1 - (armR ? AW : 0);
  const z0 = -D / 2, zB = z0 + BT;
  const pieces: PartPiece[] = [
    // the base is an open frame of rails, so the joining rods show from underneath
    { shape: "box", size: [W - 10, BASE - LEG, RAIL], pos: at(xc, (LEG + BASE) / 2, -D / 2 + 5 + RAIL / 2) },
    { shape: "box", size: [W - 10, BASE - LEG, RAIL], pos: at(xc, (LEG + BASE) / 2, D / 2 - 5 - RAIL / 2) },
    { shape: "box", size: [RAIL, BASE - LEG, D - 10], pos: at(x0 + (armL ? 5 : 0) + RAIL / 2, (LEG + BASE) / 2, 0) },
    { shape: "box", size: [RAIL, BASE - LEG, D - 10], pos: at(x1 - (armR ? 5 : 0) - RAIL / 2, (LEG + BASE) / 2, 0) },
    { shape: "box", size: [W - 10, 20, D - 10], pos: at(xc, BASE - 10, 0) },
    { shape: "box", size: [xb - xa, H - 60 - BASE, BT], pos: at((xa + xb) / 2, (BASE + H - 60) / 2, z0 + BT / 2) },
    { shape: "cyl", size: [120, xb - xa, 120], pos: at((xa + xb) / 2, H - 60, z0 + 120), rot: [0, 0, Math.PI / 2] },
  ];
  const sw = (xb - xa) / seats;
  for (let i = 0; i < seats; i++) pieces.push({ shape: "box", size: [sw - 8, SEAT - BASE, D - BT], pos: at(xa + sw * (i + 0.5), (BASE + SEAT) / 2, (zB + D / 2) / 2) });
  const armTop = H - 40, roll = AW + 20;
  const arm = (xm: number, sx: number) => {
    pieces.push({ shape: "box", size: [AW, armTop - roll / 2 - BASE, D], pos: at(xm, (BASE + armTop - roll / 2) / 2, 0) });
    pieces.push({ shape: "cyl", size: [roll, D, roll], pos: at(xm + sx * 10, armTop - roll / 2, 0), rot: [Math.PI / 2, 0, 0] });
  };
  if (armL) arm(x0 + AW / 2, -1);
  if (armR) arm(x1 - AW / 2, 1);
  return { id, name, size: [W, H - LEG, D], pos: [r(xc), r(yc), 0], material: "soft", pieces };
}

const cornerLegs = (W: number, D: number) => [
  leg("G1", -W / 2 + 90, -D / 2 + 90),
  leg("G2", W / 2 - 90, -D / 2 + 90),
  leg("G3", -W / 2 + 90, D / 2 - 90),
  leg("G4", W / 2 - 90, D / 2 - 90),
];

const legStep = (legs: CustomPart[], three: boolean): CustomStep => ({
  title: three ? "Screw in the four corner legs" : "Screw in the legs",
  detail: "Turn each one clockwise by hand into the corner of the base until it is tight, then press a felt pad under it.",
  add: legs.map((l) => l.id),
  fix: [fx("glide", legs.map((l) => [l.pos[0], 0, l.pos[2]] as Vec3), [0, 1, 0], { ...PAD })],
  warnings: ["hand"],
});
const standUp: CustomStep = { title: "Stand it up together", detail: "Tip it forwards onto its legs, lifting by the frame and never by the legs.", pose: "+y", people: 2, warnings: ["two"] };

function single(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const seats = W > 1600 ? 2 : 1;
  const frame = body("A", "Sofa", -W / 2, W / 2, H, D, true, true, seats);
  if (seats === 1) frame.name = "Armchair";
  const legs = cornerLegs(W, D);
  const steps: CustomStep[] = [
    { title: "Lay it on its back", detail: "On a rug or the flattened box, the underside facing you. Keep it off a hard floor so the fabric doesn't mark.", add: ["A"], pose: "+z", people: 2, warnings: ["two", "floor"] },
    legStep(legs, false),
    standUp,
  ];
  return { parts: [frame, ...legs], steps };
}

function threeSeat(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const left = body("L", "Left half", -W / 2, 0, H, D, true, false, 1);
  const right = body("R", "Right half", 0, W / 2, H, D, false, true, 1);
  const mid: CustomPart = { id: "M", name: "Middle leg", size: [60, LEG, 60], pos: [0, LEG / 2, 0], shape: "cyl", material: "wood" };
  const legs = cornerLegs(W, D);
  // the rods cross the joint through both halves' end rails; the wing nut on the rod is its head
  const yR = BASE - 50;
  const front: Vec3[] = [D / 2 - 140, D / 2 - 230].map((z) => [-RAIL - 4, yR, r(z)]);
  const back: Vec3[] = [-D / 2 + 150, -D / 2 + 240].map((z) => [-RAIL - 4, yR, r(z)]);
  const rodFix = (pts: Vec3[], washers: boolean): CustomFix[] => [
    fx("stud", pts, [1, 0, 0], { ...ROD, on: "L", mate: "R" }),
    ...(washers ? [fx("washer", pts.map((p) => [p[0] + 2, p[1], p[2]] as Vec3), [1, 0, 0], { ...WASHER, on: "L" }), fx("washer", pts.map((p) => [-p[0] - 2, p[1], p[2]] as Vec3), [-1, 0, 0], { ...WASHER, on: "R" })] : []),
    fx("nut", pts.map((p) => [-p[0], p[1], p[2]] as Vec3), [-1, 0, 0], { ...WING, on: "R", mate: "L" }),
  ];
  const steps: CustomStep[] = [
    {
      title: "Push the halves together on their backs",
      detail: "Lay both halves on their backs on a rug. Push the guide pin into the hole in one end, then slide the other half onto it.",
      add: ["L", "R"],
      fix: [fx("dowel", [[0, BASE + 150, 0]], [1, 0, 0], { name: "Guide pin", len: 60, dia: 10, on: "L", mate: "R" })],
      pose: "+z",
      people: 2,
      warnings: ["two", "floor"],
    },
    {
      title: "Turn a wing nut onto each threaded rod",
      detail: "One on the end of each of the five rods, a few turns by hand: it becomes the rod's head.",
      fix: [fx("nut", [...front, ...back, [-RAIL - 4, yR, 0] as Vec3].map((p) => [p[0] - 4, p[1], p[2]] as Vec3), [1, 0, 0], { ...WING, on: "L" })],
    },
    {
      title: "Join the front rails with two rods",
      detail: "A washer on each rod, through both rails, then a washer and a wing nut on the other side. Tighten by hand.",
      fix: rodFix(front, true),
      warnings: ["hand"],
    },
    {
      title: "Join the back rails with two rods",
      detail: "The same as the front: a washer on each side and a wing nut, tightened by hand.",
      fix: rodFix(back, true),
      warnings: ["hand"],
    },
    {
      title: "Screw the middle leg into its bracket",
      detail: "Turn it onto the bracket's stud by hand until it is tight.",
      add: ["M"],
      fix: [fx("plate", [[0, LEG + 2, 0]], [0, 1, 0], { name: "Leg bracket", len: 60, dia: 70, on: "M" })],
      from: { M: [0, -300, 0] },
    },
    {
      title: "Fit the middle leg under the joint",
      detail: "Its bracket goes over the rails in the middle of the base; the last rod goes through it and gets a wing nut.",
      fix: rodFix([[-RAIL - 4, yR, 0]], false),
      warnings: ["hand"],
    },
    legStep(legs, true),
    standUp,
  ];
  return { parts: [left, right, mid, ...legs], steps };
}

const family: Family = {
  names: ["VISKAFORS"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/3-seat/.test(slug)) return threeSeat(s);
    if (/2-seat|armchair/.test(slug)) return single(s);
    return null;
  },
};
export default family;
