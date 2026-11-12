import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * FRÖSET, read from the easy chair's manual. The bent veneer seat lies upside down on a covered table: the two front
 * legs and the two short back brackets are screwed to its underside, four screws each pair. The two long back legs,
 * which rise to carry the backrest, are bolted to the brackets from the outside, two bolts each. The chair is stood
 * up and pressed down on its seat, the backrest bolted between the long legs (two bolts a side), and the four lower
 * bolts tightened last.
 */

const BAR = 28;

/** A wooden bar from a to b (same x), as a box piece of the part centred at c. */
function bar(a: Vec3, b: Vec3, c: Vec3, w = BAR, t = 40): PartPiece {
  const dy = b[1] - a[1], dz = b[2] - a[2];
  return { shape: "box", size: [w, Math.hypot(dy, dz), t], pos: [a[0] - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(dz, dy), 0, 0] };
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 59 wide, 57 deep, 74 high, seat 59 x 46 at 38
  const W = Math.round(s.size.w * 10) || 590, D = Math.round(s.size.d * 10) || 570, H = Math.round(s.size.h * 10) || 740;
  const seatY = 380, sT = 14, under = seatY - sT; // underside of the seat
  const pT = 22; // the flat ends that screw to the seat
  const zFoot = D / 2 - 30, zBack = -D / 2 + 20;
  const xF = W / 2 - 50, xB = 175; // front legs, back brackets
  const xL = xB + BAR / 2 + BAR / 2 + 6; // long back legs, just outside the brackets
  const knee: Vec3 = [0, 330, -185], top: Vec3 = [0, H - 30, -300];

  const parts: CustomPart[] = [];
  // the seat: wide at the front, narrower at the back where the long legs pass it
  const sc: Vec3 = [0, seatY - sT / 2, 30];
  parts.push({
    id: "S",
    name: "Seat",
    size: [W, sT, 500],
    pos: sc,
    pieces: [
      { shape: "box", size: [W, sT, 300], pos: [0, 0, 100] },
      { shape: "box", size: [2 * xL - BAR - 12, sT, 200], pos: [0, 0, -150] },
    ],
    material: "wood",
  });
  // a front leg: an upright with a flat end under the seat
  const front = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * xF, under / 2, 200];
    return {
      id,
      name: "Front leg",
      size: [BAR, under, 170],
      pos: c,
      pieces: [bar([sx * xF, 0, zFoot - 25], [sx * xF, under - pT, 230], c), { shape: "box", size: [BAR, pT, 170], pos: [0, under - pT / 2 - c[1], 0] }],
      material: "wood",
    };
  };
  // a back bracket: a flat bar under the seat with a tab hanging down at its back end
  const bracket = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * xB, under - 40, -130];
    return {
      id,
      name: "Back bracket",
      size: [BAR, 80, 160],
      pos: c,
      pieces: [{ shape: "box", size: [BAR, pT, 160], pos: [0, 40 - pT / 2, 0] }, { shape: "box", size: [BAR, 70, 50], pos: [0, -5, -55] }],
      material: "wood",
    };
  };
  // a long back leg: from the floor up past the seat to the top of the backrest
  const long = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * xL, H / 2, -240];
    const x = sx * xL;
    return {
      id,
      name: "Back leg",
      size: [BAR, H, 160],
      pos: c,
      pieces: [bar([x, 0, zBack], [x, knee[1], knee[2]], c), bar([x, knee[1], knee[2]], [x, top[1], top[2]], c)],
      material: "wood",
    };
  };
  // the backrest leans with the upper part of the long legs
  const lean = Math.atan2(knee[2] - top[2], top[1] - knee[1]);
  const backY = 560, backZ = knee[2] - ((backY - knee[1]) / (top[1] - knee[1])) * (knee[2] - top[2]);
  const dia = 2 * xL - BAR - 16;
  parts.push(front("F1", -1), front("F2", 1), bracket("R1", -1), bracket("R2", 1), long("L1", -1), long("L2", 1));
  parts.push({ id: "B", name: "Backrest", shape: "cyl", size: [dia, 14, dia], pos: [0, backY, backZ], rot: [Math.PI / 2 - lean, 0, 0], material: "wood" });

  const screws = (ids: string[], z: number[]): CustomFix => ({
    kind: "screw",
    count: 4,
    len: 16,
    dia: 6,
    at: ids.flatMap((id) => z.map((zz): Vec3 => [(id.endsWith("1") ? -1 : 1) * (id.startsWith("F") ? xF : xB), under - pT, zz])),
    dir: [0, 1, 0],
    mate: "S",
  });
  const legBolts = (id: string, sx: number): CustomFix => ({
    kind: "bolt",
    count: 2,
    len: 30,
    dia: 6,
    at: [290, 325].map((y): Vec3 => [sx * (xL + BAR / 2), y, -190]),
    dir: [-sx, 0, 0],
    on: id,
    mate: sx < 0 ? "R1" : "R2",
  });
  const zAt = (y: number) => knee[2] - ((y - knee[1]) / (top[1] - knee[1])) * (knee[2] - top[2]);
  const backBolts = (id: string, sx: number): CustomFix => ({
    kind: "bolt",
    count: 2,
    len: 30,
    dia: 6,
    at: [backY - 70, backY + 70].map((y): Vec3 => [sx * (xL + BAR / 2), y, zAt(y)]),
    dir: [-sx, 0, 0],
    on: id,
    mate: "B",
  });
  return {
    parts,
    steps: [
      {
        title: "Screw the front legs to the seat",
        detail: "Lay the seat upside down on a table covered with a blanket. Flat ends on the seat, legs angled the way the picture shows. Two screws in each.",
        add: ["S", "F1", "F2"],
        fix: [screws(["F1", "F2"], [150, 250])],
        tools: ["allen"],
        pose: "-y",
      },
      {
        title: "Screw the back brackets to the seat",
        detail: "Their tabs point down at the back edge. Two screws in each.",
        add: ["R1", "R2"],
        fix: [screws(["R1", "R2"], [-180, -80])],
        tools: ["allen"],
      },
      {
        title: "Bolt a back leg to the left bracket",
        detail: "Hold it against the outside of the tab and turn two bolts in, not fully tight yet.",
        add: ["L1"],
        fix: [legBolts("L1", -1)],
      },
      {
        title: "Bolt the other back leg on",
        detail: "Same on the right, two bolts left a little loose.",
        add: ["L2"],
        fix: [legBolts("L2", 1)],
      },
      {
        title: "Turn the chair over and press on the seat",
        detail: "Stand it on its feet and push the seat down with both hands so all four legs settle.",
        pose: "+y",
      },
      {
        title: "Bolt the backrest to one back leg",
        detail: "Hold the backrest between the long legs with its bolt holes level with theirs. Two bolts from the outside.",
        add: ["B"],
        fix: [backBolts("L1", -1)],
      },
      {
        title: "Bolt it to the other back leg",
        detail: "Two bolts from the outside on the other side.",
        fix: [backBolts("L2", 1)],
      },
      {
        title: "Tighten the four lower bolts",
        detail: "Now the backrest is on, tighten the bolts at the back brackets until the heads sit flat.",
        tools: ["allen"],
      },
    ],
  };
}

const family: Family = {
  names: ["FRÖSET", "FROSET"],
  recipe(s) {
    return /easy-chair|easy chair/i.test(`${s.slug ?? ""} ${s.variant}`) ? recipe(s) : null;
  },
};
export default family;
