import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GRUNNARP 3-seat sofa-bed, read from its manual. A hinge bracket is bolted onto each end of the seat frame (two bolts
 * and washers each), then two plastic armrest connectors at each end (one bolt each). The backrest is bolted onto
 * the hinge brackets, two bolts a side. Each armrest gets two steel channels inside (three screws each). Two people
 * tip the sofa onto its back for the six legs, which take a felt pad each, and stand it up again. The armrests slide
 * down onto the connectors and one long bolt with a washer locks each from inside the frame. The back cushions go on
 * last. To make the bed, the underframe pulls out and the backrest folds down flat.
 * IKEA: 232 x 89 x 80 cm (87 with the back cushions), seat 46 high, armrests 62, bed 142 x 200.
 */

type Fx = Omit<CustomFix, "count" | "at"> & { at: Vec3[] };
const fx = (f: Fx): CustomFix => ({ ...f, count: f.at.length });
const SX = [-1, 1];

function sofa(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 2320, D = Math.round(s.size.d * 10) || 890;
  const AW = 160, SW = W - 2 * AW, xA = SW / 2;
  const yBase = 150, ySeat = 460, yArm = 620, yBack = 800, yCush = Math.round(s.size.h * 10) || 870;
  const zB = -D / 2, zF = D / 2;
  const BT = 170; // backrest thickness
  const zSeat0 = zB + BT;
  const armH = yArm - yBase, cap = armH; // the armrest's front is a half round
  const arm: PartPiece[] = [
    { shape: "box", size: [AW, armH, D - cap / 2], pos: [0, 0, -cap / 4] },
    { shape: "halfcyl", size: [armH, AW, cap / 2], pos: [0, 0, D / 2 - cap / 2 + cap / 4], rot: [0, 0, Math.PI / 2] },
  ];
  const legXs = [-(xA - 60), 0, xA - 60];
  const legZs = [zB + 60, zF - 80];
  const parts: CustomPart[] = [
    { id: "S", name: "Seat section", size: [SW, ySeat - yBase, zF - zSeat0], pos: [0, (yBase + ySeat) / 2, (zSeat0 + zF) / 2], material: "soft" },
    { id: "BK", name: "Backrest", size: [SW, yBack - yBase, BT], pos: [0, (yBase + yBack) / 2, zB + BT / 2], material: "soft" },
    ...SX.map((sx, i): CustomPart => ({ id: `A${i}`, name: "Armrest", size: [AW, armH, D], pos: [sx * (xA + AW / 2), (yBase + yArm) / 2, 0], pieces: arm, material: "soft" })),
    ...legXs.flatMap((x) => legZs.map((z, k): CustomPart => ({ id: `G${legXs.indexOf(x)}${k}`, name: "Leg", shape: "cyl", size: [45, yBase, 45], pos: [x, yBase / 2, z], material: "wood" }))),
    ...[-1, 0, 1].map((k, i): CustomPart => ({ id: `C${i}`, name: "Back cushion", size: [SW / 3 - 20, yCush - ySeat - 10, 170], pos: [k * (SW / 3), (ySeat + yCush) / 2 + 5, zSeat0 + 85], rot: [-0.12, 0, 0], material: "soft" })),
  ];
  const legs = parts.filter((p) => p.name === "Leg").map((p) => p.id);
  const side = (sx: number) => ({ dir: [-sx, 0, 0] as Vec3, x: sx * xA });
  const yHinge = 330, zHinge = zSeat0 + 30;
  const brackets = (sx: number) => [
    fx({ kind: "hinge", name: "Hinge bracket", len: 120, dia: 60, at: [[side(sx).x, yHinge, zHinge]], dir: side(sx).dir, on: "S" }),
    fx({ kind: "washer", at: [-40, 40].map((dz): Vec3 => [side(sx).x + sx * 4, yHinge - 40, zHinge + 40 + dz]), dir: side(sx).dir, on: "S" }),
    fx({ kind: "bolt", len: 25, dia: 6, at: [-40, 40].map((dz): Vec3 => [side(sx).x + sx * 5, yHinge - 40, zHinge + 40 + dz]), dir: side(sx).dir, on: "S" }),
  ];
  const zConn = [zSeat0 + 140, zF - 120], yConn = 360;
  const connectors = (sx: number) => [
    fx({ kind: "connector", name: "Armrest connector", len: 150, dia: 25, at: zConn.map((z): Vec3 => [side(sx).x, yConn, z]), dir: side(sx).dir, on: "S" }),
    fx({ kind: "bolt", len: 30, dia: 6, at: zConn.map((z): Vec3 => [side(sx).x + sx * 6, yConn, z]), dir: side(sx).dir, on: "S" }),
  ];
  const backBolts = (sx: number) => fx({ kind: "bolt", len: 16, dia: 6, at: [yHinge + 20, yHinge + 90].map((y): Vec3 => [side(sx).x, y, zB + BT / 2]), dir: side(sx).dir, on: "BK" });
  const channels = SX.map((sx, i) => fx({ kind: "clip", name: "Armrest channel", len: 150, dia: 30, at: zConn.map((z): Vec3 => [sx * xA, yConn, z]), dir: [sx, 0, 0], on: `A${i}` }));
  const channelScrews = SX.map((sx, i) => fx({ kind: "screw", len: 16, dia: 4, at: zConn.flatMap((z) => [-50, 0, 50].map((dy): Vec3 => [sx * xA, yConn + dy, z])), dir: [sx, 0, 0], on: `A${i}` }));
  const lock = SX.map((sx, i): Vec3 => [sx * (xA - 40), yBase + 60, 60 + i]);
  return {
    parts,
    steps: [
      { title: "Bolt a hinge bracket onto one end", detail: "Seat section right side up. At the back of its end, two bolts with washers.", add: ["S"], fix: brackets(-1), tools: ["allen"] },
      { title: "Bolt the other hinge bracket on", detail: "The same at the other end.", fix: brackets(1), tools: ["allen"] },
      { title: "Bolt the armrest connectors onto one end", detail: "Two plastic connectors, one bolt each, teeth upwards.", fix: connectors(-1), tools: ["allen"] },
      { title: "Bolt the connectors onto the other end", fix: connectors(1), tools: ["allen"] },
      { title: "Bolt the backrest onto a hinge bracket", detail: "Stand it behind the seat, holes against the bracket. Two bolts.", add: ["BK"], fix: [backBolts(-1)], tools: ["allen"] },
      { title: "Bolt the other side of the backrest", fix: [backBolts(1)], tools: ["allen"] },
      {
        title: "Screw the channels inside the armrests",
        detail: "Lay each armrest on its outer side. Two channels on the inside face, three screws in each.",
        fix: [...channels, ...channelScrews],
        wait: ["A0", "A1"],
        tools: ["screwdriver"],
        warnings: ["floor"],
      },
      { title: "Tip the sofa onto its back", detail: "Fold the backrest up first, then tip the whole sofa back together.", pose: "+z", people: 2, warnings: ["two"] },
      {
        title: "Screw in the legs",
        detail: "By hand until tight, then press a felt pad onto each foot. Tip the sofa back onto its legs together.",
        add: legs,
        fix: [fx({ kind: "glide", len: 4, dia: 40, at: parts.filter((p) => p.name === "Leg").map((p): Vec3 => [p.pos[0], 0, p.pos[2]]), dir: [0, 1, 0] })],
        people: 2,
        warnings: ["two"],
      },
      { title: "Slide the armrests on", detail: "Line the channels up over the connectors and push each armrest down until it sits.", add: ["A0", "A1"], from: { A0: [0, 300, 0], A1: [0, 300, 0] }, pose: "+y" },
      {
        title: "Lock the armrests with the long bolts",
        detail: "Pull the underframe out to reach in. One long bolt with a washer through the frame into each armrest.",
        fix: [
          ...SX.map((sx, i) => fx({ kind: "washer", at: [lock[i]], dir: [sx, 0, 0], on: "S" })),
          ...SX.map((sx, i) => fx({ kind: "bolt", len: 70, dia: 8, at: [lock[i]], dir: [sx, 0, 0], on: "S", mate: `A${i}` })),
        ],
        tools: ["allen"],
      },
      { title: "Put the back cushions on", detail: "Three against the backrest. For the bed, take them off, pull the underframe out and fold the backrest down.", add: ["C0", "C1", "C2"] },
    ],
  };
}

const family: Family = {
  names: ["GRUNNARP"],
  recipe(s) {
    if (/sofa-bed/.test(s.slug ?? "")) return sofa(s);
    return null;
  },
};
export default family;
