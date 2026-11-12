import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * FRANKLIN, read from the folding bar stool's manual. The stool comes folded and assembled apart from its backrest:
 * with the stool lying down, the backrest's two tubes push over the tops of the back legs and one screw at each side
 * holds them. Then it is unfolded and the seat pressed down until the safety catch clicks; lifting the seat folds it.
 */

const TUBE = 22;

/** A round tube from a to b (same x), as a piece of the part centred at c. */
function tube(a: Vec3, b: Vec3, c: Vec3, dia = TUBE): PartPiece {
  const dy = b[1] - a[1], dz = b[2] - a[2];
  return { shape: "cyl", size: [dia, Math.hypot(dy, dz), dia], pos: [a[0] - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(dz, dy), 0, 0] };
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 50 wide, 44 deep, 95 high, seat 34 x 34 at 63
  const W = Math.round(s.size.w * 10) || 500, D = Math.round(s.size.d * 10) || 440, H = Math.round(s.size.h * 10) || 950;
  const seatY = 630, sw = 340, st = 28;
  const xf = W / 2 - TUBE / 2, xr = xf - TUBE - 4;
  const zf = D / 2 - TUBE / 2, zr = -D / 2 + TUBE / 2;
  const topR = 700; // the back legs end here, the backrest tubes carry on up
  const rTop: Vec3 = [0, topR, zr + 70];
  const fc: Vec3 = [0, topR / 2, 0];
  const frame: PartPiece[] = [
    ...[-1, 1].flatMap((sx) => [
      tube([sx * xr, 0, zr], [sx * xr, topR, rTop[2]], fc),
      tube([sx * xf, 0, zf], [sx * xf, seatY - st, -sw / 2 + 30], fc),
    ]),
    // the footrest across the front legs and the seat on top
    { shape: "cyl", size: [TUBE, 2 * xf, TUBE], pos: [0, 300 - fc[1], zf - (300 / (seatY - st)) * (zf + sw / 2 - 30) - fc[2]], rot: [0, 0, Math.PI / 2] },
    { shape: "box", size: [sw, st, sw], pos: [0, seatY - st / 2 - fc[1], -10 - fc[2]], material: "wood" },
  ];
  const bc: Vec3 = [0, (topR + H) / 2, rTop[2] - 20];
  const back: PartPiece[] = [
    ...[-1, 1].map((sx) => tube([sx * xr, topR - 60, rTop[2]], [sx * xr, H - 30, rTop[2] - 40], bc, TUBE + 4)),
    { shape: "box", size: [2 * xr + 40, 150, 22], pos: [0, H - 90 - bc[1], rTop[2] - 40 - bc[2]], rot: [-0.1, 0, 0], material: "wood" },
  ];
  const parts: CustomPart[] = [
    { id: "F", name: "Folding stool", size: [W, topR, D], pos: fc, pieces: frame, material: "metal" },
    { id: "K", name: "Backrest", size: [2 * xr + 40, H - topR + 60, 80], pos: bc, pieces: back, material: "metal" },
  ];
  return {
    parts,
    steps: [
      {
        title: "Push the backrest onto the back legs",
        detail: "Leave the stool folded and lay it down. Slide both backrest tubes over the tops of the back legs until the holes line up, then put in one screw at each side.",
        add: ["F", "K"],
        fix: [{ kind: "screw", count: 2, len: 16, dia: 4, at: [-1, 1].map((sx): Vec3 => [sx * xr, topR - 30, rTop[2] - TUBE / 2 - 2]), dir: [0, 0, 1], on: "K", mate: "F" }],
        tools: ["screwdriver"],
        pose: "+z",
        warnings: ["floor"],
      },
      {
        title: "Unfold it and press the seat down",
        detail: "Stand it up, pull the legs apart and push the front of the seat down until the catch clicks. Keep your fingers out of the joints.",
        pose: "+y",
        warnings: ["hand"],
      },
      {
        title: "To fold it, lift the seat",
        detail: "Pull the back of the seat up: the catch lets go and the legs close together.",
        warnings: ["hand"],
      },
    ],
  };
}

const family: Family = {
  names: ["FRANKLIN"],
  recipe(s) {
    return /bar-stool|bar stool/i.test(`${s.slug ?? ""} ${s.variant}`) ? recipe(s) : null;
  },
};
export default family;
