import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, HwKind, PartPiece, Vec3 } from "../../types";

/**
 * TALLSKÄR, read from IKEA's manuals for the armchair, the chair with armrests and the 2-seat sofa (steel frames
 * with plastic rattan woven on). Each comes as a woven backrest, a woven seat and two side frames (a steel sled with
 * its armrest woven on). The backrest is bolted to the seat on a rug, the seat lying on its side; a side frame goes
 * on top and is bolted through into the seat, it is turned over for the other side frame, then stood up and every
 * bolt tightened again. Every bolt has a washer under it. The sofa adds a tube across the front between the two
 * side frames, fixed with two screws, and the chair puts its last two bolts in once it stands.
 */

const pt = (x: number, y: number, z: number): Vec3 => [x, y, z];
const fx = (kind: HwKind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const S = [-1, 1];
const TUBE = 22;
const BOLT = { len: 40, dia: 6 };
const WASHER = { len: 2, dia: 16 };

interface Dims {
  W: number;
  D: number;
  H: number;
  seatW: number;
  seatD: number;
  seatH: number;
  armH: number;
  backW: number; // backrest, across its top
  backBolts: number; // backrest to seat
  sideBolts: number; // each side frame, while it lies on its side
  laterBolts?: number; // each side, once it stands (the chair)
  tube?: boolean; // a tube across the front (the sofa)
}

/** A rod from a to b (world mm), as a piece about c. */
function rod(a: Vec3, b: Vec3, c: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const m: Vec3 = [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]];
  // a cylinder runs along y: turned about z towards x, then about x towards z (three.js XYZ order)
  const rz = -Math.asin(d[0] / len);
  const rx = Math.atan2(d[2], d[1]);
  return { shape: "cyl", size: [dia, len, dia], pos: m, rot: [rx, 0, rz] };
}

function recipe(o: Dims): CustomParams {
  const { W, D, H, seatW, seatD, seatH, armH, backW } = o;
  const ST = 70; // seat, thick
  const zs = D / 2 - 60 - seatD / 2; // seat centre, front to back
  const zSeatBack = zs - seatD / 2;
  const seatY = seatH - ST / 2;
  // backrest: from the back of the seat up and back to the top
  const b0: Vec3 = [0, seatH - ST, zSeatBack], b1: Vec3 = [0, H, -D / 2 + 20];
  const bLen = Math.hypot(b1[1] - b0[1], b1[2] - b0[2]);
  const tilt = Math.atan2(b0[2] - b1[2], b1[1] - b0[1]);
  const bc: Vec3 = [0, (b0[1] + b1[1]) / 2, (b0[2] + b1[2]) / 2];
  const back: CustomPart = {
    id: "B",
    name: "Backrest",
    size: [backW, bLen, 30],
    pos: bc,
    rot: [-tilt, 0, 0],
    material: "fiber",
    // it flares out towards the top, in slices
    pieces: Array.from({ length: 6 }, (_, k): PartPiece => ({
      shape: "box",
      size: [seatW + 20 + ((backW - seatW - 20) * k) / 5, bLen / 6, 30],
      pos: [0, -bLen / 2 + bLen / 12 + (k * bLen) / 6, 0],
    })),
  };
  const xt = W / 2 - 25; // the frame's tubes
  const aw = W / 2 - 10 - seatW / 2; // armrest, across
  const zr0 = -D / 2 + 40, zr1 = D / 2 - 30; // runner on the floor
  const zf = D / 2 - 40; // front leg
  const zbk = zSeatBack + 30; // top of the back leg
  const side = (g: number, i: number): CustomPart => {
    const c: Vec3 = [g * (seatW / 2 + (W / 2 - seatW / 2) / 2), (armH + 10) / 2, 0];
    const pieces: PartPiece[] = [
      { shape: "box", size: [aw, armH - (seatH - 40), seatD], pos: [g * (seatW / 2 + aw / 2) - c[0], (seatH - 40 + armH) / 2 - c[1], zs + 20 - c[2]], material: "fiber" },
      rod(pt(g * xt, armH, zbk), pt(g * xt, armH, zf), c),
      rod(pt(g * xt, 11, zf + 10), pt(g * xt, armH, zf), c),
      rod(pt(g * xt, 11, zr0), pt(g * xt, 11, zr1), c),
      rod(pt(g * xt, 11, zr0), pt(g * xt, armH, zbk), c),
    ];
    return { id: `F${i}`, name: "Side frame", size: [W / 2 - seatW / 2, armH + 20, D - 20], pos: c, material: "metal", pieces };
  };
  const parts: CustomPart[] = [
    back,
    { id: "S", name: "Seat", size: [seatW, ST, seatD], pos: [0, seatY, zs], material: "fiber" },
    side(-1, 0),
    side(1, 1),
  ];
  if (o.tube) parts.push({ id: "X", name: "Front tube", size: [2 * xt - TUBE, TUBE, TUBE], pos: [0, 11, zr1 - 30], shape: "cyl", material: "metal" });

  const spread = (n: number, a: number, b: number) => Array.from({ length: n }, (_, k) => (n === 1 ? (a + b) / 2 : a + ((b - a) * k) / (n - 1)));
  const boltSet = (at: Vec3[], dir: Vec3): CustomFix[] => [fx("washer", at, dir, WASHER), fx("bolt", at, dir, BOLT)];
  const backAt = spread(o.backBolts, -seatW / 2 + 80, seatW / 2 - 80).map((x) => pt(x, seatY, zSeatBack - 12));
  const sideAt = (g: number) => spread(o.sideBolts, zSeatBack + 40, zs + seatD / 2 - 50).map((z) => pt(g * (seatW / 2 + 4), seatY, z));
  const laterAt = (g: number) => spread(o.laterBolts ?? 0, 0, 0).map(() => pt(g * (W / 2 - 10), armH - 60, zf - 40));
  const all = o.backBolts + 2 * o.sideBolts + 2 * (o.laterBolts ?? 0);
  const steps: CustomStep[] = [
    {
      title: "Bolt the backrest to the seat",
      detail: `Lay them on a rug on their sides, the seat's back edge against the bottom of the backrest. ${o.backBolts === 1 ? "One bolt" : `${o.backBolts} bolts`} with a washer, just a few turns for now.`,
      add: ["B", "S"],
      fix: boltSet(backAt, [0, 0, 1]),
      tools: ["allen"],
      pose: "+x",
      warnings: ["floor"],
    },
    {
      title: "Bolt a side frame on",
      detail: `Lower it onto the upper side so its holes line up with the seat's. ${o.sideBolts} bolts with washers, loosely.`,
      add: ["F1"],
      fix: boltSet(sideAt(1), [-1, 0, 0]),
      tools: ["allen"],
      from: { F1: [400, 0, 0] },
    },
  ];
  if (o.tube)
    steps.push({
      title: "Turn it over and push in the front tube",
      detail: "Into the hole at the front of the side frame's runner, all the way down.",
      add: ["X"],
      pose: "-x",
      from: { X: [-900, 0, 0] },
    });
  steps.push({
    title: o.tube ? "Bolt on the other side frame" : "Turn it over and bolt on the other side frame",
    detail: `${o.tube ? "Its runner over the end of the front tube. " : ""}${o.sideBolts} bolts with washers, loosely.`,
    add: ["F0"],
    fix: boltSet(sideAt(-1), [1, 0, 0]),
    tools: ["allen"],
    pose: "-x",
    from: { F0: [-400, 0, 0] },
  });
  if (o.tube)
    steps.push({
      title: "Screw the front tube to the frames",
      detail: "One short screw through each runner into the end of the tube.",
      fix: S.map((g) => fx("screw", [pt(g * (xt + TUBE / 2), 11, zr1 - 30)], [-g, 0, 0], { len: 16, dia: 6 })),
      tools: ["allen"],
    });
  if (o.laterBolts)
    steps.push({
      title: "Stand it up and bolt the armrests at the front",
      detail: "One bolt with a washer through each side frame, from the outside.",
      fix: S.flatMap((g) => boltSet(laterAt(g), [-g, 0, 0])),
      tools: ["allen"],
      pose: "+y",
    });
  steps.push({
    title: o.laterBolts ? "Tighten every bolt" : "Stand it up and tighten every bolt",
    detail: `All ${all}, firmly, once it stands level on all its feet. Check them again after a few weeks.`,
    tools: ["allen"],
    pose: "+y",
    check: "square",
  });
  return { parts, steps };
}

const family: Family = {
  names: ["TALLSKÄR"],
  recipe(s) {
    switch (s.slug) {
      case "tallskar-armchair-outdoor":
        return recipe({ W: 830, D: 820, H: 1060, seatW: 500, seatD: 520, seatH: 360, armH: 600, backW: 720, backBolts: 1, sideBolts: 4 });
      case "tallskar-chair-armrests-outdoor":
        return recipe({ W: 610, D: 650, H: 920, seatW: 440, seatD: 440, seatH: 450, armH: 660, backW: 560, backBolts: 2, sideBolts: 2, laterBolts: 1 });
      case "tallskar-2-seat-sofa-outdoor":
        return recipe({ W: 1320, D: 820, H: 1060, seatW: 1000, seatD: 520, seatH: 360, armH: 600, backW: 1220, backBolts: 3, sideBolts: 4, tube: true });
    }
    return null;
  },
};
export default family;
