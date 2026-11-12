import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/*
 * SKOGSÖN easy chair, read from IKEA's manual. The whole chair is built lying on its side on a rug. The perforated
 * seat and back panels stand on edge in a V and are joined at the crease with four screws, washers and lock nuts.
 * One side frame (a bent tube loop) goes under them with six screws, put in by hand and then tightened; the cross
 * tube stands in it, the other side frame comes down on top, two screws hold the cross tube and six more the panels.
 * IKEA's sizes: 62 wide, 88 deep, 71 high, seat 51 deep.
 */

const TUBE = 25;
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

/** A rod from a to b, as a piece of a part centred at c. */
function rod(a: Vec3, b: Vec3, c: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [dia, len, dia],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}
type YZ = [number, number];
const lerp = (a: YZ, b: YZ, t: number): YZ => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function chair(): CustomParams {
  const FX = 310 - TUBE / 2, PX = FX - TUBE / 2; // side frames, panel edges
  const y0 = TUBE / 2;
  // the side loop, seen from the side: front foot, back foot, top of the back, the crease, the seat's front edge
  const A: YZ = [y0, 400], B: YZ = [y0, -420], C: YZ = [700, -420], D: YZ = [250, -150], E: YZ = [370, 330];
  const loop: YZ[] = [A, B, C, D, E, A];
  const side = (id: string, g: number): CustomPart => {
    const c: Vec3 = [g * FX, 355, -10];
    const p = (q: YZ): Vec3 => [g * FX, q[0], q[1]];
    return {
      id,
      name: "Side frame",
      size: [TUBE, 700 + TUBE / 2, 820 + TUBE],
      pos: c,
      material: "metal",
      pieces: loop.slice(1).map((q, i) => rod(p(loop[i]), p(q), c)),
    };
  };
  const panel = (id: string, name: string, a: YZ, b: YZ): CustomPart => {
    const c: Vec3 = [0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return {
      id,
      name,
      size: [2 * PX, Math.abs(b[0] - a[0]) + 4, Math.abs(b[1] - a[1]) + 4],
      pos: c,
      material: "metal",
      pieces: [{ shape: "box", size: [2 * PX, 4, Math.hypot(b[0] - a[0], b[1] - a[1])], pos: [0, 0, 0], rot: [-Math.atan2(b[0] - a[0], b[1] - a[1]), 0, 0] }],
    };
  };
  const SEAT_BACK: YZ = [D[0] + 8, D[1] + 30];
  const parts: CustomPart[] = [
    panel("S", "Seat panel", SEAT_BACK, [E[0] + 8, E[1] - 20]),
    panel("K", "Back panel", [D[0] + 8, D[1] - 10], [C[0] - 20, C[1] + 20]),
    side("L", -1),
    { id: "X", name: "Cross tube", shape: "cyl", size: [TUBE, 2 * FX - TUBE, TUBE], pos: [0, y0, -10], rot: [0, 0, Math.PI / 2], material: "metal" },
    side("R", 1),
  ];
  const crease: Vec3[] = [-210, -70, 70, 210].map((x): Vec3 => [x, D[0] + 8, D[1] + 10]);
  // three screws along the seat's edge, three along the back's
  const edge: YZ[] = [0.2, 0.5, 0.8].map((t) => lerp(SEAT_BACK, [E[0] + 8, E[1] - 20], t)).concat([0.25, 0.55, 0.85].map((t) => lerp([D[0] + 8, D[1] - 10], [C[0] - 20, C[1] + 20], t)));
  const frameScrews = (g: number): CustomFix[] => [
    fix("screw", edge.slice(0, 3).map(([y, z]): Vec3 => [g * FX, y, z]), [-g, 0, 0], { on: g < 0 ? "L" : "R", mate: "S", len: 12, dia: 6 }),
    fix("screw", edge.slice(3).map(([y, z]): Vec3 => [g * FX, y, z]), [-g, 0, 0], { on: g < 0 ? "L" : "R", mate: "K", len: 12, dia: 6 }),
  ];
  return {
    parts,
    steps: [
      {
        title: "Join the seat and back panels",
        detail: "On a rug, stand both panels on edge in a V. Four screws through the crease, each with a washer and a lock nut held by the box spanner.",
        add: ["S", "K"],
        fix: [
          fix("screw", crease, [0, 1, 0], { on: "S", mate: "K", len: 12, dia: 6 }),
          fix("washer", crease.map(([x, y, z]): Vec3 => [x, y + 8, z]), [0, -1, 0], { on: "K" }),
          fix("nut", crease.map(([x, y, z]): Vec3 => [x, y + 8, z]), [0, -1, 0], { on: "K", name: "Lock nut" }),
        ],
        tools: ["allen", "wrench"],
        pose: "+x",
        warnings: ["floor"],
      },
      {
        title: "Screw a side frame under the panels",
        detail: "Lay one side frame flat and set the panels' edges on it. Turn the six screws in by hand first.",
        add: ["L"],
        fix: frameScrews(-1),
        from: { L: [-300, 0, 0] },
      },
      { title: "Tighten the six screws", detail: "Now tighten them with the Allen key.", tools: ["allen"] },
      {
        title: "Stand the cross tube in the frame",
        detail: "Push its end into the hole in the side frame's runner, the screw hole facing out.",
        add: ["X"],
        from: { X: [300, 0, 0] },
      },
      { title: "Lay the other side frame on top", detail: "Line it up with the panels' edges and the top of the cross tube.", add: ["R"], from: { R: [400, 0, 0] } },
      {
        title: "Screw the cross tube in place",
        detail: "One countersunk screw through each side frame into the cross tube.",
        fix: [-1, 1].map((g) => fix("screw", [[g * (FX + TUBE / 2), y0, -10]], [-g, 0, 0], { on: g < 0 ? "L" : "R", mate: "X", len: 16, dia: 6 })),
        tools: ["allen"],
      },
      { title: "Screw the top frame to the panels", detail: "Six screws, turned in by hand first.", fix: frameScrews(1) },
      { title: "Tighten all the screws", detail: "Go round all six with the Allen key.", tools: ["allen"] },
      { title: "Stand the chair up", detail: "Check the plastic feet are on the runners before you use it outdoors.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["SKOGSÖN", "SKOGSON"],
  recipe(s) {
    if (/chair/i.test(`${s.variant} ${s.slug ?? ""}`)) return chair();
    return null;
  },
};
export default family;
