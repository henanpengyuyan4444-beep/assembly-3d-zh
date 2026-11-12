import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * ENSHOLM garden chair, read from its manual. Ten countersunk Allen screws, all left loose until the end: the U
 * tube onto the upside-down seat (2), the two side frames onto it (4), the crossbar between the front legs (2),
 * then the chair is stood up and the backrest's tube frame goes onto the back legs (2), and everything is tightened.
 * IKEA: 48 x 58 x 85 cm, seat 45 x 36 cm at 45 cm.
 */

const TUBE = 20;

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, c: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [dia, L, dia],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, -Math.asin(d[0] / L)],
  };
}

function chair(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 480, D = Math.round(s.size.d * 10) || 580, H = Math.round(s.size.h * 10) || 850;
  const seatY = 450, xr = 190; // seat top, rail lines
  const yU = seatY - 30 - TUBE / 2, yR = yU - TUBE; // U tube, side frame rail
  const zF = 160, zB = -170; // rail ends
  const fx = W / 2 - TUBE / 2, fz = D / 2 - TUBE / 2; // feet
  const legTop = 600; // where the back legs stop and the backrest's tube takes over
  const zTop = -fz + 10; // back leg top leans back over its foot
  const yX = 300; // crossbar

  const parts: CustomPart[] = [];
  parts.push({ id: "S", name: "Seat", size: [450, 25, 380], pos: [0, seatY - 12, 0], material: "soft" });
  {
    const c: Vec3 = [0, yU, (zF + zB) / 2];
    parts.push({
      id: "U",
      name: "Seat tube",
      size: [2 * xr + TUBE, TUBE, zF - zB + TUBE],
      pos: c,
      material: "metal",
      pieces: [tube([-xr, yU, zB], [-xr, yU, zF], c), tube([xr, yU, zB], [xr, yU, zF], c), tube([-xr, yU, zF], [xr, yU, zF], c)],
    });
  }
  for (const [id, sx] of [["FL", -1], ["FR", 1]] as const) {
    const c: Vec3 = [sx * (xr + fx) / 2, legTop / 2, 0];
    parts.push({
      id,
      name: "Side frame",
      size: [fx - xr + TUBE, legTop, D],
      pos: c,
      material: "metal",
      pieces: [
        tube([sx * fx, 0, fz], [sx * xr, yR, zF], c),
        tube([sx * xr, yR, zF], [sx * xr, yR, zB], c),
        tube([sx * fx, 0, -fz], [sx * xr, legTop, zTop], c),
      ],
    });
  }
  // front legs at the crossbar's height
  const t = yX / yR;
  const xX = fx + (xr - fx) * t, zX = fz + (zF - fz) * t;
  parts.push({ id: "X", name: "Crossbar", shape: "cyl", size: [TUBE, 2 * xX - TUBE, TUBE], pos: [0, yX, zX], rot: [0, 0, Math.PI / 2], material: "metal" });
  {
    const top = H - TUBE / 2, zb = zTop - 35, c: Vec3 = [0, (legTop + H) / 2, zb];
    const xb = xr - 5;
    parts.push({
      id: "B",
      name: "Backrest",
      size: [2 * xb + TUBE, H - legTop + 40, 60],
      pos: c,
      material: "soft",
      pieces: [
        { ...tube([-xr, legTop - 40, zTop], [-xb, top - 30, zb], c), material: "metal" },
        { ...tube([xr, legTop - 40, zTop], [xb, top - 30, zb], c), material: "metal" },
        { ...tube([-xb, top - 30, zb], [-xb + 30, top, zb], c), material: "metal" },
        { ...tube([xb, top - 30, zb], [xb - 30, top, zb], c), material: "metal" },
        { ...tube([-xb + 30, top, zb], [xb - 30, top, zb], c), material: "metal" },
        { shape: "box", size: [400, 190, 16], pos: [0, 715 - c[1], zb + 14 - c[2]], rot: [-0.1, 0, 0] },
      ],
    });
  }

  const bolt = (on: string, mate: string, at: Vec3[], dir: Vec3): CustomFix => ({ kind: "bolt", name: "Allen screw", count: at.length, len: 35, dia: 6, at, dir, on, mate });
  return {
    parts,
    steps: [
      {
        title: "Screw the U tube onto the seat",
        detail: "Lay the seat face down on a rug. Two screws, turned in but not tight yet.",
        add: ["S", "U"],
        fix: [bolt("U", "S", [[-xr + 40, yU - TUBE / 2, zF], [xr - 40, yU - TUBE / 2, zF]], [0, 1, 0])],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw on the two side frames",
        detail: "Their rails lie along the U tube with the legs pointing up. Two screws in each, still loose.",
        add: ["FL", "FR"],
        fix: (["FL", "FR"] as const).map((id, i) => bolt(id, "U", [-1, 1].map((k): Vec3 => [(i ? 1 : -1) * xr, yR - TUBE / 2, (zF + zB) / 2 + k * 100]), [0, 1, 0])),
      },
      {
        title: "Fit the crossbar between the front legs",
        detail: "Push it down between the legs until its holes line up, then put a screw in through each leg.",
        add: ["X"],
        fix: [bolt("FL", "X", [[-xX - TUBE / 2, yX, zX]], [1, 0, 0]), bolt("FR", "X", [[xX + TUBE / 2, yX, zX]], [-1, 0, 0])],
      },
      {
        title: "Fit the backrest onto the back legs",
        detail: "Stand the chair up. Push the backrest's tubes onto the tops of the back legs and put a screw in through each side.",
        add: ["B"],
        fix: [bolt("FL", "B", [[-xr - TUBE / 2, legTop - 20, zTop]], [1, 0, 0]), bolt("FR", "B", [[xr + TUBE / 2, legTop - 20, zTop]], [-1, 0, 0])],
        pose: "+y",
        from: { B: [0, 250, 0] },
      },
      { title: "Tighten all ten screws", detail: "Only now turn every screw tight, with the chair standing on a flat floor so all four feet touch.", tools: ["allen"] },
    ],
  };
}

const family: Family = {
  names: ["ENSHOLM"],
  recipe(s) {
    if (/^ensholm-chair/.test(s.slug ?? "")) return chair(s);
    return null;
  },
};
export default family;
