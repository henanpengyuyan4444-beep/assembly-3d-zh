import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GULTARP stool, read from its manual. Two bent steel leg frames, each a pair of legs joined by a bar under the seat.
 * The padded seat lies upside down on a rug; the first frame goes across it corner to corner with two screws, the
 * second crosses it the other way with three, all only started, then all five are tightened. The cover comes off
 * for washing. IKEA: 41 wide, seat 33 across and 45 high, tested for 100 kg.
 */

const TUBE = 20;

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, c: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [TUBE, L, TUBE],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, -Math.asin(d[0] / L)],
  };
}

function stool(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 410, H = 450, SD = 330, ST = 50;
  const yBar = H - ST - TUBE / 2, yLow = yBar - TUBE; // the first frame's bar dips where the second crosses it
  const f = Math.round((W / 2) / Math.SQRT2), t = 105; // feet (41 cm apart across the diagonal) and leg tops, at the seat rim
  // frame A runs from the front left to the back right corner, frame B the other way
  const frame = (sz: number, dip: boolean) => {
    const c: Vec3 = [0, yBar / 2, 0];
    const top = (k: number): Vec3 => [k * t, yBar, k * sz * t];
    const pieces: PartPiece[] = [
      tube([-f, 0, -sz * f], top(-1), c),
      tube([f, 0, sz * f], top(1), c),
      ...(dip
        ? [tube(top(-1), [-25, yLow, -sz * 25], c), tube([-25, yLow, -sz * 25], [25, yLow, sz * 25], c), tube([25, yLow, sz * 25], top(1), c)]
        : [tube(top(-1), top(1), c)]),
    ];
    return { c, pieces };
  };
  const A = frame(-1, true), B = frame(1, false);
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", shape: "cyl", size: [SD, ST, SD], pos: [0, H - ST / 2, 0], material: "soft" },
    { id: "A", name: "Leg frame", size: [2 * f + TUBE, yBar + TUBE / 2, 2 * f + TUBE], pos: A.c, pieces: A.pieces, material: "metal" },
    { id: "B", name: "Leg frame", size: [2 * f + TUBE, yBar + TUBE / 2, 2 * f + TUBE], pos: B.c, pieces: B.pieces, material: "metal" },
  ];
  const ySc = yBar - TUBE / 2;
  return {
    parts,
    steps: [
      {
        title: "Screw the first leg frame to the seat",
        detail: "Lay the seat upside down on a rug. The frame's bar goes across from corner to corner. Two screws, only started.",
        add: ["S", "A"],
        fix: [{ kind: "screw", count: 2, len: 30, dia: 6, on: "A", mate: "S", at: [-1, 1].map((k): Vec3 => [k * (t - 10), ySc, -k * (t - 10)]), dir: [0, 1, 0] }],
        tools: ["allen"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw on the second frame across it",
        detail: "Its bar crosses over the dip in the first one. Three screws, only started.",
        add: ["B"],
        fix: [{ kind: "screw", count: 3, len: 30, dia: 6, on: "B", mate: "S", at: [-1, 0, 1].map((k): Vec3 => [k * (t - 10), ySc, k * (t - 10)]), dir: [0, 1, 0] }],
        tools: ["allen"],
      },
      {
        title: "Tighten all five screws",
        detail: "Now the frames sit straight, tighten them firmly. Turn the stool over; the cover pulls off to wash.",
        tools: ["allen"],
      },
    ],
  };
}

const family: Family = {
  names: ["GULTARP"],
  recipe(s) {
    if (/gultarp-stool/.test(s.slug ?? "")) return stool(s);
    return null;
  },
};
export default family;
