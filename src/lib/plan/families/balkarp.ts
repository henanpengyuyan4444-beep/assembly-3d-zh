import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BALKARP, read from the sleeper sofa's manual. The sofa comes in one upholstered piece, folded out flat as a bed:
 * it is laid face down, and two leg frames (two legs joined by a bar) are bolted under it, two bolts with washers
 * each. Turned over by two people, the back is lifted at its front edge and pushed up until it clicks. No armrests.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function sofa(): CustomParams {
  // IKEA: 190 wide, 84 deep and 80 high as a sofa, seat 38 high; the bed is 100 x 190
  const W = 1900, D = 840;
  const yLeg = 180, ySeat = 380;
  const z0 = -260, z1 = D / 2; // the seat part, back to front
  const xl = W / 2 - 260, L = 40;
  const zf = z1 - 60, zb = z0 + 70;
  const legFrame = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * xl, yLeg / 2, (zf + zb) / 2];
    const box = (size: Vec3, p: Vec3): PartPiece => ({ shape: "box", size, pos: [p[0] - c[0], p[1] - c[1], p[2] - c[2]] });
    return {
      id,
      name: "Leg frame",
      size: [L, yLeg, zf - zb + L],
      pos: c,
      material: "wood",
      pieces: [
        box([L, yLeg - L, L], [sx * xl, (yLeg - L) / 2, zf]),
        box([L, yLeg - L, L], [sx * xl, (yLeg - L) / 2, zb]),
        box([L, L, zf - zb + L], [sx * xl, yLeg - L / 2, (zf + zb) / 2]),
      ],
    };
  };
  // the back, lifted to lean back from the rear of the seat
  const bA: Vec3 = [0, 300, -230], bB: Vec3 = [0, 760, -340];
  const parts: CustomPart[] = [
    { id: "S", name: "Sofa bed seat", size: [W, ySeat - yLeg, z1 - z0], pos: [0, (yLeg + ySeat) / 2, (z0 + z1) / 2], material: "soft" },
    {
      id: "K",
      name: "Backrest",
      size: [W, Math.hypot(bB[1] - bA[1], bB[2] - bA[2]) + 40, 160],
      pos: [0, (bA[1] + bB[1]) / 2, (bA[2] + bB[2]) / 2],
      rot: [Math.atan2(bB[2] - bA[2], bB[1] - bA[1]), 0, 0],
      material: "soft",
    },
    legFrame("U1", -1),
    legFrame("U2", 1),
  ];
  const holes = [-1, 1].flatMap((sx) => [zb + 120, zf - 120].map((z) => [sx * xl, yLeg, z] as Vec3));
  return {
    parts,
    steps: [
      {
        title: "Lay the sofa bed face down",
        detail: "Fold it out flat and lay it upside down on a rug or the flattened box. It is heavy: lift it together.",
        add: ["S"],
        pose: "-y",
        people: 2,
        warnings: ["two", "floor"],
      },
      {
        title: "Bolt the two leg frames on",
        detail: "Set each frame over its holes with the legs pointing up. Put a washer on every bolt and tighten them with the Allen key.",
        add: ["U1", "U2"],
        fix: [
          at("washer", holes, [0, 1, 0], "U1", undefined, { len: 1.5, dia: 18 }),
          at("bolt", holes, [0, 1, 0], "U1", "S", { len: 60, dia: 8 }),
        ],
        tools: ["allen"],
      },
      { title: "Turn the sofa over", detail: "Lift it together and stand it on its legs.", pose: "+y", people: 2, warnings: ["two"] },
      {
        title: "Lift the back until it clicks",
        detail: "Lift the front edge of the back first, then push it up and back until it clicks into the sitting position.",
        add: ["K"],
        from: { K: [0, -250, 450] },
        warnings: ["hand"],
      },
    ],
  };
}

const family: Family = {
  names: ["BALKARP"],
  recipe(s: ProductSpec) {
    if (/sleeper sofa|sofa-bed/i.test(s.variant) || /balkarp-sleeper-sofa/.test(s.slug ?? "")) return sofa();
    return null;
  },
};
export default family;
