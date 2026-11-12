import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * ÄLVSTA, read from the manual of its SEFAST underframe. Each side of the frame is one bent tube, a front and a back
 * leg joined by a rail under the seat; two cross tubes push into sleeves in the side rails, one joint first, then the
 * other three. The rattan seat lies upside down on a table edge, the frame goes on it and four Allen bolts go
 * through its plates into the seat, by hand first and then tightened. Last, four stacking clips snap onto the frame.
 */

const TUBE = 20;
const BOLT = { name: "Allen bolt", len: 30, dia: 6 };

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: CustomPart["material"]): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

/** A round tube from a to b. */
function tube(a: Vec3, b: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [TUBE, len, TUBE], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))] };
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string | undefined, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function chair(s: ProductSpec): CustomParams {
  // IKEA: 52 wide, 50 deep, 83 high, seat 46 high, 49 wide and 40 deep
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const seatTop = 460, seatT = 28, railY = seatTop - seatT - TUBE / 2 - 4;
  const xt = 185, zt0 = -130, zt1 = 150; // where the legs bend in under the seat
  const xf = W / 2 - TUBE / 2, zF = D / 2 - TUBE / 2, zB = -D / 2 + TUBE / 2;
  const side = (id: string, sx: number): CustomPart =>
    part(
      id,
      "Side frame",
      [tube([sx * xf, 0, zF], [sx * xt, railY, zt1]), tube([sx * xf, 0, zB], [sx * xt, railY, zt0]), tube([sx * xt, railY, zt0 - 4], [sx * xt, railY, zt1 + 4])],
      [Math.min(sx * xf, sx * xt) - TUBE / 2, 0, -D / 2],
      [Math.max(sx * xf, sx * xt) + TUBE / 2, railY + TUBE / 2, D / 2],
      "metal",
    );
  const zc0 = -90, zc1 = 110; // cross tubes
  const cross = (id: string, z: number): CustomPart => ({ id, name: "Cross tube", size: [TUBE, 2 * xt - TUBE, TUBE], pos: [0, railY, z], shape: "cyl", rot: [0, 0, Math.PI / 2], material: "metal" });

  // the shell: a rounded seat, a narrow waist rising from its back and a wide rounded back
  const sz0 = -D / 2 + 70, sz1 = D / 2 - 20, seatY = seatTop - seatT / 2;
  const lean = 0.2;
  const upY = H - 140;
  const shellAbs: PartPiece[] = [
    { shape: "cyl", size: [490, seatT, sz1 - sz0], pos: [0, seatY, (sz0 + sz1) / 2] },
    { shape: "box", size: [250, 250, 22], pos: [0, seatTop + 100, sz0 + 30], rot: [-lean, 0, 0] },
    { shape: "cyl", size: [420, 22, 280], pos: [0, upY, sz0 + 30 - Math.tan(lean) * (upY - seatTop - 100)], rot: [Math.PI / 2 - lean, 0, 0] },
  ];
  const zTop = sz0 + 30 - Math.tan(lean) * (upY - seatTop - 100) - 40;
  const parts: CustomPart[] = [
    side("SIDE_L", -1),
    cross("CROSS_F", zc1),
    cross("CROSS_B", zc0),
    side("SIDE_R", 1),
    part("SEAT", "Seat shell", shellAbs, [-245, seatTop - seatT, zTop], [245, H, sz1], "wood"),
  ];
  const bolts: Vec3[] = [-1, 1].flatMap((sx) => [zc0 - 40, zc1 + 40].map((z): Vec3 => [sx * xt, railY - TUBE / 2, z]));
  return {
    parts,
    steps: [
      {
        title: "Push a cross tube into one side",
        detail: "Lay the side upside down on a rug. The two tubes look alike, so match the marks on the ends before you push one home.",
        add: ["SIDE_L", "CROSS_F"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Join the second tube and the other side",
        detail: "Push the other cross tube into the first side, then press the second side onto both tube ends.",
        add: ["CROSS_B", "SIDE_R"],
        from: { SIDE_R: [260, 0, 0] },
      },
      {
        title: "Bolt the frame to the seat by hand",
        detail: "Lay the seat upside down on a table, the back hanging over the edge. Set the frame on it and turn the four bolts in with your fingers.",
        add: ["SEAT"],
        fix: [-1, 1].map((sx) => fx("bolt", bolts.filter((p) => Math.sign(p[0]) === sx), [0, 1, 0], sx < 0 ? "SIDE_L" : "SIDE_R", { ...BOLT, mate: "SEAT" })),
        warnings: ["loose"],
      },
      { title: "Tighten the four bolts", detail: "Firmly, with the Allen key. Not with a drill, it can strip the threads in the seat.", tools: ["allen"] },
      {
        title: "Snap on the stacking clips",
        detail: "One over the frame beside each bolt, so stacked chairs don't scratch each other. Then stand the chair up.",
        fix: [-1, 1].map((sx) => fx("clip", bolts.filter((p) => Math.sign(p[0]) === sx).map((p): Vec3 => [p[0], p[1], p[2] + (p[2] > 0 ? 30 : -30)]), [0, 1, 0], sx < 0 ? "SIDE_L" : "SIDE_R", { name: "Stacking clip", len: 18, dia: 26 })),
      },
    ],
  };
}

const family: Family = {
  names: ["ÄLVSTA", "ALVSTA"],
  recipe: (s) => (/chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair(s) : null),
};
export default family;
