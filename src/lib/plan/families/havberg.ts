import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * HAVBERG, read from the swivel chair's and the ottoman's manuals, which are the same two pictures: the five-star
 * base (one piece, on glides, no castors) stands on the floor, the swivel post drops into its hub and the
 * upholstered seat is lowered straight onto the post. There are no screws or tools at all.
 */

/** The five-star base: a hub and five low arms ending in glides, as one piece. */
function starBase(R: number): CustomPart {
  const arms = Array.from({ length: 5 }, (_, i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
  const pieces: PartPiece[] = [
    { shape: "cyl", size: [80, 60, 80], pos: [0, 5, 0] },
    ...arms.map((a): PartPiece => {
      const r = (40 + R) / 2;
      return { shape: "box", size: [R - 40, 26, 40], pos: [Math.cos(a) * r, 0, -Math.sin(a) * r], rot: [0, a, 0] };
    }),
    ...arms.map((a): PartPiece => ({ shape: "cyl", size: [36, 16, 36], pos: [Math.cos(a) * (R - 18), -18, -Math.sin(a) * (R - 18)] })),
  ];
  return { id: "BASE", name: "Star base", size: [2 * R, 60, 2 * R], pos: [0, 30, 0], pieces, material: "metal" };
}

function recipe(s: ProductSpec): CustomParams | null {
  const t = `${s.slug ?? ""} ${s.variant}`.toLowerCase();
  if (!/havberg/i.test(s.slug ?? s.name)) return null;
  const ottoman = /ottoman|footstool|pouffe/.test(t);
  const chair = /swivel|chair/.test(t) && !ottoman;
  if (!ottoman && !chair) return null;

  const parts: CustomPart[] = [];
  if (ottoman) {
    // IKEA's measures: 64 x 64, 44 high
    const W = 640, H = 440, postTop = 220;
    parts.push(starBase(300));
    parts.push({ id: "POST", name: "Swivel post", size: [40, postTop - 40, 40], pos: [0, (postTop + 40) / 2, 0], shape: "cyl", material: "metal" });
    const shellY = postTop, cushY = postTop + 50;
    parts.push({
      id: "SEAT",
      name: "Footstool cushion",
      size: [W, H - shellY, W],
      pos: [0, (H + shellY) / 2, 0],
      pieces: [
        { shape: "box", size: [W - 80, 50, W - 80], pos: [0, shellY + 25 - (H + shellY) / 2, 0] },
        { shape: "box", size: [W, H - cushY, W], pos: [0, (H + cushY) / 2 - (H + shellY) / 2, 0] },
      ],
      material: "soft",
    });
  } else {
    // IKEA's measures: 66 wide, 92 high, 99 deep, seat 41 high and 54 deep
    const W = 660, H = 920, seatH = 410, postTop = 230;
    parts.push(starBase(330));
    parts.push({ id: "POST", name: "Swivel post", size: [40, postTop - 40, 40], pos: [0, (postTop + 40) / 2, 0], shape: "cyl", material: "metal" });
    const zf = 420, zb = zf - 540; // seat cushion front and back
    const cy = (postTop + H) / 2;
    // the back leans from behind the seat (360 up, 140 back) to the top of the chair (900 up, 420 back)
    const b0: Vec3 = [0, 360, zb - 20], b1: Vec3 = [0, H - 20, -420];
    const tilt = -Math.atan2(b0[2] - b1[2], b1[1] - b0[1]);
    const backLen = Math.hypot(b1[1] - b0[1], b1[2] - b0[2]) + 40, backT = 150;
    const backC: Vec3 = [0, (b0[1] + b1[1]) / 2, (b0[2] + b1[2]) / 2];
    const rel = (p: Vec3): Vec3 => [p[0], p[1] - cy, p[2]];
    const pieces: PartPiece[] = [
      { shape: "box", size: [W - 100, 70, zf - zb + 40], pos: rel([0, postTop + 35, (zf + zb) / 2 - 20]) },
      { shape: "box", size: [W - 20, seatH - postTop - 70, zf - zb], pos: rel([0, (seatH + postTop + 70) / 2, (zf + zb) / 2]) },
      { shape: "box", size: [W, backLen, backT], pos: rel(backC), rot: [tilt, 0, 0] },
    ];
    parts.push({ id: "SEAT", name: "Seat with back", size: [W, H - postTop, 990], pos: [0, cy, 0], pieces, material: "soft" });
  }

  return {
    parts,
    steps: [
      {
        title: "Push the swivel post into the base",
        detail: "Stand the base on its glides on the floor and press the post straight down into the hole in the middle.",
        add: ["BASE", "POST"],
        from: { POST: [0, 300, 0] },
      },
      {
        title: `Lower the ${ottoman ? "cushion" : "seat"} onto the post`,
        detail: `Line the hole under the ${ottoman ? "cushion" : "seat"} up with the post and press it straight down until it sits firmly. It turns freely once it is on.`,
        add: ["SEAT"],
        from: { SEAT: [0, 400, 0] },
      },
    ],
  };
}

const family: Family = { names: ["HAVBERG"], recipe };
export default family;
