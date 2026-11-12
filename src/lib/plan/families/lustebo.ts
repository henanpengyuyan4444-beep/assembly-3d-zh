import type { Family } from "./family";
import type { CustomParams, CustomPart, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LUSTEBO, read from the dining chair's manual. One step: the padded shell lies upside down on a table, its back hanging
 * over the edge, and the one-piece steel cantilever frame is set on it upside down and fixed with four Allen screws
 * through the seat rails (the spacers are already on the shell). The cover's straps round the frame are only for
 * taking the cover off.
 */

function tube(a: Vec3, b: Vec3, dia: number): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))] };
}

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: PartMaterial): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

function chair(s: ProductSpec): CustomParams {
  // IKEA: 55 wide, 56 deep, 85 high; the seat 46 high, 48 wide and 41 deep
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const seatTop = 460, seatT = 70, seatW = 480, seatD = 420, tb = 22;
  const yRail = seatTop - seatT - tb / 2;
  const zF = D / 2 - 40, zB = -D / 2 + 140; // seat front and back
  const xs = seatW / 2 - 50, xr = W / 2 - tb / 2; // rails under the seat, runners on the floor
  const yR = tb / 2;
  const frameAbs: PartPiece[] = [-1, 1].flatMap((sx) => [
    tube([sx * xs, yRail, zB + 40], [sx * xs, yRail, zF - 30], tb),
    tube([sx * xs, yRail, zF - 30], [sx * xr, yR, D / 2 - tb / 2], tb),
    tube([sx * xr, yR, D / 2 - tb / 2], [sx * xr, yR, -D / 2 + 40], tb),
    tube([sx * xr, yR, -D / 2 + 40], [sx * xr, yR + 40, -D / 2 + tb / 2], tb),
  ]);
  frameAbs.push(tube([-xs, yRail, zB + 40], [xs, yRail, zB + 40], tb));
  // the shell: the seat and the back rising and leaning back from its rear edge
  const lean = 90, backT = 60;
  const backLen = Math.hypot(H - seatTop + 20, lean), ang = Math.atan2(lean, H - seatTop + 20);
  const zBack = zF - seatD - 10;
  const shellAbs: PartPiece[] = [
    { shape: "box", size: [seatW, seatT, seatD], pos: [0, seatTop - seatT / 2, zF - seatD / 2] },
    { shape: "box", size: [seatW - 30, backLen, backT], pos: [0, (seatTop - 20 + H) / 2, zBack - lean / 2], rot: [-ang, 0, 0] },
  ];
  const parts: CustomPart[] = [
    part("SHELL", "Seat shell", shellAbs, [-seatW / 2, seatTop - seatT, zBack - lean - backT], [seatW / 2, H, zF], "soft"),
    part("FRAME", "Chair frame", frameAbs, [-W / 2, 0, -D / 2], [W / 2, yRail + tb / 2, D / 2], "metal"),
  ];
  const screws: Vec3[] = [-1, 1].flatMap((sx) => [zB + 70, zF - 80].map((z): Vec3 => [sx * xs, yRail - tb / 2, z]));
  return {
    parts,
    steps: [
      {
        title: "Lay the seat upside down on a table",
        detail: "Seat on the table top, the back hanging over the edge. A cloth under it keeps the fabric clean.",
        add: ["SHELL"],
        pose: "-y",
      },
      {
        title: "Screw the frame to the seat",
        detail: "Set the frame upside down on the seat so its holes meet the spacers. Four screws with the Allen key, tightened firmly.",
        add: ["FRAME"],
        fix: [{ kind: "bolt", count: 4, at: screws, dir: [0, 1, 0], on: "FRAME", mate: "SHELL", name: "Allen screw", len: 45, dia: 6 }],
        tools: ["allen"],
      },
      { title: "Stand the chair up", detail: "The cover's four straps hook round the frame under the seat. Unhook them only to take the cover off for washing.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["LUSTEBO"],
  recipe: (s) => (/chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair(s) : null),
};
export default family;
