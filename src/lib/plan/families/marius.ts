import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * MARIUS, read from the stool's manual. The steel frame is two bent tubes, each a pair of legs with a bar between
 * them, crossing under the seat. Standing up, a round-headed bolt goes down through the crossing and a nut goes on
 * by hand. Upside down on the seat, a plastic spacer sits on the top of each leg and a screw goes through the tube
 * into the seat, in turn round the stool. Last the nut is tightened with the spanner from the box (and again later
 * if the legs ever loosen).
 */

const TUBE = 20;

/** A round tube from a to b, in the x-y plane (along x) or the z-y plane (along z), as a piece centred on c. */
function tube(a: Vec3, b: Vec3, c: Vec3): PartPiece {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const rot: Vec3 = Math.abs(dx) > Math.abs(dz) ? [0, 0, -Math.atan2(dx, dy)] : [Math.atan2(dz, dy), 0, 0];
  return { shape: "cyl", size: [TUBE, len, TUBE], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot };
}

function stool(s: ProductSpec): CustomParams {
  // IKEA: seat 32 across, 45 high, 40 wide at the feet
  const H = Math.round(s.size.h * 10) || 450;
  const seatD = 320, seatT = 30, under = H - seatT; // underside of the seat
  const gap = 15; // the spacers' height
  const yTop = under - gap - TUBE / 2; // centre of the tube at the top of each leg
  const rTop = 130, rFoot = 190; // leg centres from the middle, at the top and at the floor
  const frame = (id: string, alongX: boolean, drop: number): CustomPart => {
    const p = (r: number, y: number): Vec3 => (alongX ? [r, y, 0] : [0, y, r]);
    const yBar = yTop - drop;
    const lo = p(-rFoot - TUBE / 2, 0), hi = p(rFoot + TUBE / 2, yTop + TUBE / 2);
    const size: Vec3 = [Math.abs(hi[0] - lo[0]) || TUBE, yTop + TUBE / 2, Math.abs(hi[2] - lo[2]) || TUBE];
    const c: Vec3 = [0, size[1] / 2, 0];
    const pieces: PartPiece[] = [
      tube(p(-rFoot, TUBE / 2), p(-rTop, yTop), c),
      tube(p(rFoot, TUBE / 2), p(rTop, yTop), c),
      tube(p(-rTop, yTop), p(-rTop + 40, yBar), c),
      tube(p(rTop, yTop), p(rTop - 40, yBar), c),
      tube(p(-rTop + 40, yBar), p(rTop - 40, yBar), c),
    ];
    return { id, name: "Leg frame", size, pos: c, pieces, material: "metal" };
  };
  const parts: CustomPart[] = [
    frame("FA", true, 0),
    frame("FB", false, TUBE),
    { id: "SEAT", name: "Seat", size: [seatD, seatT, seatD], pos: [0, under + seatT / 2, 0], shape: "cyl", material: "board" },
  ];
  const yLow = yTop - TUBE; // the lower bar's centre, where the nut goes on
  const tops: Vec3[] = [[rTop, yTop, 0], [-rTop, yTop, 0], [0, yTop, rTop], [0, yTop, -rTop]];
  return {
    parts,
    steps: [
      {
        title: "Bolt the two leg frames together",
        detail: "Cross the frames so their holes line up. The bolt goes down through both, square neck in the square hole, and the nut goes on underneath by hand.",
        add: ["FA", "FB"],
        fix: [
          { kind: "bolt", count: 1, at: [[0, yTop + TUBE / 2, 0]], dir: [0, -1, 0], on: "FA", mate: "FB", name: "Round-head bolt", len: 50, dia: 8 },
          { kind: "nut", count: 1, at: [[0, yLow - TUBE / 2, 0]], dir: [0, 1, 0], on: "FB", name: "Nut", dia: 8 },
        ],
        tools: [],
        warnings: ["hand"],
      },
      {
        title: "Screw the frame to the seat",
        detail: "Lay the seat upside down and the frame on it. Put a spacer on top of each leg, then drive the four screws by hand in turn round the stool, not with a drill.",
        add: ["SEAT"],
        fix: [
          { kind: "spacer", count: 4, at: tops.map((t): Vec3 => [t[0], under - gap / 2, t[2]]), dir: [0, 1, 0], on: "SEAT", name: "Spacer" },
          { kind: "screw", count: 4, at: tops.map((t): Vec3 => [t[0], t[1] - TUBE / 2, t[2]]), dir: [0, 1, 0], on: "FA", mate: "SEAT", len: 30, dia: 4 },
        ],
        pose: "-y",
        from: { SEAT: [0, -200, 0] },
        tools: ["screwdriver"],
        warnings: ["floor"],
      },
      {
        title: "Tighten the nut with the spanner",
        detail: "Turn it until the frame is firm. If the legs ever feel loose, tighten it again.",
        tools: ["wrench"],
        kind: "bolts",
      },
    ],
  };
}

const recipe = (s: ProductSpec) => (/marius-stool/.test(s.slug ?? "") ? stool(s) : null);

/** The recipe, with each step's tools as the manual shows them (the bolt and nut go on by hand first). */
function build(b: PlanBuilder, s: ProductSpec): boolean {
  const r = recipe(s);
  if (!r) return false;
  const start = b.steps.length;
  buildCustom(b, { ...s, custom: r });
  r.steps.forEach((st, i) => {
    const bs = b.steps[start + i];
    if (bs && st.tools && bs.title === st.title) bs.tools = [...st.tools];
  });
  return true;
}

const family: Family = { names: ["MARIUS"], recipe, build };
export default family;
