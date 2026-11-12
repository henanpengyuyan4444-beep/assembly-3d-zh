import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TJÄRKIL, read from the extendable table's manual. Two legs are screwed to each end rail first. The two halves of
 * the top (their leaves already folded inside) are locked together upside down on a rug, two runners with brackets
 * are bolted and screwed to them, the leg ends go on with two long bolts each and are joined to the runners with two
 * threaded spacers at every corner, then everything is tightened, the table is turned over by two people and the
 * locks under the top are opened so it can be pulled out.
 */

/** A round leg from a (floor) to b (top) as a tilted cylinder. */
function rod(id: string, a: Vec3, b: Vec3, dia: number): CustomPart {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    id,
    name: "Leg",
    shape: "cyl",
    size: [dia, len, dia],
    pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
    material: "wood",
  };
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 180 closed (235 and 290 with one or two leaves), 100 wide, 75 high
  const L = s.size.w * 10 || 1800, D = s.size.d * 10 || 1000, H = s.size.h * 10 || 750;
  const T = 30, yT = H - T / 2, under = H - T;
  const half = L / 2, r = D / 2;
  // one half of the top: a straight part and a round end
  const halfPieces = (sx: number): PartPiece[] => [
    { shape: "box", size: [half - r, T, D], pos: [(-sx * r) / 2, 0, 0] },
    { shape: "halfcyl", size: [D, T, r], pos: [(sx * (half - r)) / 2, 0, 0], rot: [0, (sx * Math.PI) / 2, 0] },
  ];
  const topHalf = (id: string, sx: number): CustomPart => ({ id, name: "Table top half", size: [half, T, D], pos: [(sx * half) / 2, yT, 0], pieces: halfPieces(sx), material: "wood" });
  const rh = 40, yR = under - rh / 2;
  const xRail = half - r + 160, railL = 800, zRun = 300, runL = 2 * (xRail - 30);
  const rail = (id: string, sx: number): CustomPart => ({ id, name: "End rail", size: [60, rh, railL], pos: [sx * xRail, yR, 0], material: "metal" });
  const runner = (id: string, sz: number): CustomPart => ({ id, name: "Runner", size: [runL, rh, 60], pos: [0, yR, sz * zRun], material: "metal" });
  const legs = (sx: number, ids: [string, string]) =>
    ([-1, 1] as const).map((sz, i) => rod(ids[i], [sx * (xRail + 80), 0, sz * (railL / 2 + 40)], [sx * xRail, under - rh, sz * (railL / 2 - 30)], 40));
  const [L1, L2] = legs(-1, ["L1", "L2"]);
  const [L3, L4] = legs(1, ["L3", "L4"]);
  const legBolts = (sx: number, rid: string, lids: [string, string]): CustomFix[] =>
    ([-1, 1] as const).map((sz, i) => ({
      kind: "bolt",
      name: "Leg screw",
      count: 2,
      len: 12,
      dia: 6,
      at: [-15, 15].map((dx): Vec3 => [sx * xRail + dx, under - rh, sz * (railL / 2 - 30)]),
      dir: [0, 1, 0],
      on: lids[i],
      mate: rid,
    }));
  const xB = 450, zBr = zRun + 30 + 3;
  const brackets = (sz: number, uid: string): CustomFix[] => [
    { kind: "angle", name: "Bracket", count: 2, at: [-xB, xB].map((x): Vec3 => [x, under, sz * zBr]), dir: [0, 1, 0], on: uid, mate: "TL" },
    { kind: "screw", count: 4, len: 12, dia: 4, at: [-xB, xB].flatMap((x) => [x - 15, x + 15].map((xx): Vec3 => [xx, yR, sz * zBr])), dir: [0, 0, -sz], on: uid },
  ];
  const longBolt = { kind: "bolt" as const, name: "Long bolt", len: 70, dia: 6 };
  return {
    parts: [
      topHalf("TL", -1),
      topHalf("TR", 1),
      runner("U1", -1),
      runner("U2", 1),
      rail("R1", -1),
      L1,
      L2,
      rail("R2", 1),
      L3,
      L4,
    ],
    steps: [
      {
        title: "Screw two legs to an end rail",
        detail: "Lay them on a rug. Two screws hold each leg, turned in with the Allen key.",
        fix: legBolts(-1, "R1", ["L1", "L2"]),
        wait: ["R1", "L1", "L2"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Build the other leg end the same way", detail: "Four more screws.", fix: legBolts(1, "R2", ["L3", "L4"]), wait: ["R2", "L3", "L4"] },
      {
        title: "Lock the two top halves together",
        detail: "Lay both upside down on a rug, push them together and turn the two locks underneath until they click.",
        add: ["TL", "TR"],
        people: 2,
        warnings: ["floor"],
      },
      {
        title: "Screw the brackets onto the runners",
        detail: "Two brackets on each runner, two small screws in each.",
        fix: [...brackets(-1, "U1"), ...brackets(1, "U2")],
        wait: ["U1", "U2"],
      },
      { title: "Lay the runners on the top", detail: "The brackets go down onto the top, over their holes.", add: ["U1", "U2"] },
      {
        title: "Bolt the runners to the top",
        detail: "One long bolt through each runner into each half. Turn them in with the Allen key, not fully tight yet.",
        fix: [{ ...longBolt, count: 4, at: [-1, 1].flatMap((sz) => [-200, 200].map((x): Vec3 => [x, yR - rh / 2, sz * zRun])), dir: [0, 1, 0], mate: "TL" }],
      },
      {
        title: "Screw the brackets to the top",
        detail: "One screw through the foot of each bracket.",
        fix: [{ kind: "screw", count: 4, len: 14, dia: 5, at: [-1, 1].flatMap((sz) => [-xB, xB].map((x): Vec3 => [x, under, sz * (zBr + 12)])), dir: [0, 1, 0], mate: "TL" }],
      },
      {
        title: "Bolt the leg ends to the top",
        detail: "Set each end rail across the end of the runners and drop in two long bolts.",
        add: ["R1", "L1", "L2", "R2", "L3", "L4"],
        fix: [-1, 1].map((sx): CustomFix => ({ ...longBolt, count: 2, at: [-1, 1].map((sz): Vec3 => [sx * xRail, yR - rh / 2, sz * 150]), dir: [0, 1, 0], on: sx < 0 ? "R1" : "R2" })),
      },
      {
        title: "Join the leg ends to the runners",
        detail: "Two threaded spacers at each corner, through the rail into the end of the runner. Use the larger Allen key.",
        fix: [-1, 1].flatMap((sx) =>
          [-1, 1].map((sz): CustomFix => ({
            kind: "stud",
            name: "Threaded spacer",
            count: 2,
            len: 30,
            dia: 8,
            at: [-15, 15].map((dz): Vec3 => [sx * (xRail + 30), yR, sz * zRun + dz]),
            dir: [-sx, 0, 0],
            on: sx < 0 ? "R1" : "R2",
            mate: sz < 0 ? "U1" : "U2",
          })),
        ),
        tools: ["allen"],
      },
      { title: "Tighten all eight long bolts", detail: "Now that the frame sits square, tighten them firmly with the Allen key.", tools: ["allen"], check: "square" },
      { title: "Tighten the bracket screws", detail: "All four, firmly.", tools: ["screwdriver"] },
      {
        title: "Turn the table over",
        detail: "Lift it together by the top, not the legs. Then open the two locks underneath so the table can be pulled out.",
        pose: "+y",
        people: 2,
      },
      {
        title: "Pull it out to add a leaf",
        detail: "One person at each end pulls the halves apart. Unfold a leaf from inside, lay it in, push the ends together and close the locks until they click.",
        people: 2,
      },
    ],
  };
}

const family: Family = { names: ["TJÄRKIL", "TJARKIL"], recipe };
export default family;
