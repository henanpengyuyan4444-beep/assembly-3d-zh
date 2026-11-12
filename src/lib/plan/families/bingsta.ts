import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * BINGSTA, read from the armchair's manual. The steel underframe is two bent tubes (a cross bar with two splayed
 * legs each) joined by two straight rails that push into them, built standing on a rug. Turned over onto the
 * upside-down seat, it takes four long bolts. Upright, the curved back is lowered onto the seat and held by two short
 * bolts; then, with the chair on its back, each armrest hooks into the back and onto the frame, and two bolts a side
 * hold it underneath. The back cushion drops in last.
 */

const TUBE = 22;
const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** A tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, c: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [TUBE, len, TUBE],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}

function armchair(): CustomParams {
  // IKEA: 70 wide, 58 deep, 76 high, seat 45 high and 48 deep, 33 free under it
  const W = 700, D = 580, H = 760;
  const yS0 = 330, yS1 = 450, yR = yS0 - TUBE / 2;
  const zF = 200, zB = -150, xb = 230, xr = 150;
  const legTube = (id: string, name: string, z: number, zFoot: number, xFoot: number): CustomPart => {
    const c: Vec3 = [0, yR / 2, (z + zFoot) / 2];
    return {
      id,
      name,
      size: [2 * xFoot + TUBE, yR + TUBE, Math.abs(zFoot - z) + TUBE],
      pos: c,
      material: "metal",
      pieces: [
        tube([-xb, yR, z], [xb, yR, z], c),
        ...[-1, 1].map((sx) => tube([sx * xb, yR, z], [sx * xFoot, 0, zFoot], c)),
      ],
    };
  };
  const zSeat0 = -D / 2 + 100, zSeat1 = D / 2;
  const parts: CustomPart[] = [
    legTube("LF", "Front leg tube", zF, D / 2 - 20, W / 2 - 50),
    ...[-1, 1].map((sx, i): CustomPart => ({ id: `R${i + 1}`, name: "Rail", shape: "cyl", size: [TUBE, TUBE, zF - zB], pos: [sx * xr, yR, (zF + zB) / 2], material: "metal" })),
    legTube("LB", "Back leg tube", zB, -D / 2 + 20, W / 2 - 60),
    { id: "S", name: "Seat", size: [560, yS1 - yS0, zSeat1 - zSeat0], pos: [0, (yS0 + yS1) / 2, (zSeat0 + zSeat1) / 2], material: "soft" },
    { id: "K", name: "Back", size: [W, H - yS0 + 20, 40], pos: [0, (H + yS0 - 20) / 2, -D / 2 + 20], material: "soft" },
    ...[-1, 1].map((sx, i): CustomPart => ({ id: `A${i + 1}`, name: "Armrest", size: [70, 310, D - 110], pos: [sx * (W / 2 - 70), yS0 + 155, -D / 2 + 40 + (D - 110) / 2], material: "soft" })),
    { id: "C", name: "Back cushion", size: [W - 280, 280, 110], pos: [0, yS1 + 140, zSeat0 + 55], material: "soft" },
  ];
  const seatBolts: Vec3[] = [-1, 1].flatMap((sx) => [zB + 70, zF - 70].map((z) => [sx * xr, yR - TUBE / 2, z] as Vec3));
  return {
    parts,
    steps: [
      {
        title: "Push the rails into a leg tube",
        detail: "Lay one bent leg tube flat on a rug and push both rails into it, with their holes lined up as shown.",
        add: ["LF", "R1", "R2"],
        pose: "-z",
        warnings: ["floor"],
      },
      { title: "Push the other leg tube on", detail: "Press it down onto the free ends of the rails until it stops.", add: ["LB"] },
      {
        title: "Bolt the frame to the seat",
        detail: "Lay the seat upside down on the rug, turn the frame over onto it and bolt it on with the four long bolts.",
        add: ["S"],
        fix: [at("bolt", seatBolts, [0, 1, 0], "R1", "S", { len: 60, dia: 6 })],
        tools: ["allen"],
        pose: "-y",
        from: { S: [0, -300, 0] },
      },
      {
        title: "Lower the back onto the seat",
        detail: "Stand the chair up and let the back down behind the seat so its pegs go into the holes.",
        add: ["K"],
        from: { K: [0, 300, 0] },
        pose: "+y",
      },
      {
        title: "Bolt the back on",
        detail: "One short bolt at each side, low down at the back of the seat.",
        fix: [-1, 1].map((sx) => at("bolt", [[sx * 280, yS0 + 30, zSeat0 + 20]], [-sx, 0, 0], "K", "S", { len: 16, dia: 6 })),
        tools: ["allen"],
      },
      {
        title: "Hook on the left armrest",
        detail: "Lay the chair on its back. Slide the armrest's top into the slot in the back, then push its bracket onto the frame.",
        add: ["A1"],
        pose: "+z",
        warnings: ["floor"],
      },
      { title: "Hook on the right armrest", detail: "The same on the other side.", add: ["A2"] },
      {
        title: "Bolt the armrests on",
        detail: "Two bolts through each armrest's bracket, under the seat.",
        fix: [-1, 1].map((sx) => at("bolt", [-60, 120].map((z) => [sx * 260, yS0, z] as Vec3), [0, 1, 0], sx < 0 ? "A1" : "A2", "S", { len: 30, dia: 6 })),
        tools: ["allen"],
      },
      { title: "Stand it up and add the back cushion", detail: "Turn the chair onto its legs and drop the cushion in against the back.", add: ["C"], pose: "+y", from: { C: [0, 300, 0] } },
    ],
  };
}

const family: Family = {
  names: ["BINGSTA"],
  recipe(s) {
    if (/armchair/i.test(s.variant) || /bingsta-armchair/.test(s.slug ?? "")) return armchair();
    return null;
  },
};
export default family;
