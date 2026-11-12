import type { Family } from "./family";
import type { CustomParams, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LÄKTARE, read from the seat shell's manual. The steel underframe with its armrests comes in one piece. On a table,
 * upside down: lift the cover plate off the frame's seat mount, lay the shell upside down with its back over the
 * table's edge, set the frame on it and bolt it on with four bolts, then press the cover plate back on.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 55 wide, 50 deep, 83 high, seat 46 wide and 42 deep at 45 high
  const W = s.size.w * 10 || 550, D = s.size.d * 10 || 500, H = s.size.h * 10 || 830;
  const SH = 450, seatW = 460, seatD = 420, t = 12;
  const tube = 20;
  const yR = SH - t / 2 - tube / 2; // the frame's rails, right under the shell
  const xl = seatW / 2 - 30, zl = seatD / 2 - 20;
  const yArm = 650, xa = W / 2 - 25;
  const yc = yArm / 2;
  const P = (x: number, y: number, z: number): Vec3 => [x, y - yc, z];
  const frame: PartPiece[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) frame.push({ shape: "cyl", size: [tube, yR, tube], pos: P(sx * (xl + 8), yR / 2, sz * (zl + 8)), rot: [sz * 0.04, 0, -sx * 0.04] });
    frame.push({ shape: "box", size: [tube, tube, 2 * zl], pos: P(sx * xl, yR, 0) });
    // armrest: up from the back of the side rail, forward over the seat, a pad on top
    frame.push({ shape: "cyl", size: [tube, yArm - yR, tube], pos: P(sx * xa, (yR + yArm) / 2, -zl + 40) });
    frame.push({ shape: "box", size: [xa - xl, tube, tube], pos: P((sx * (xa + xl)) / 2, yR, -zl + 40) });
    frame.push({ shape: "cyl", size: [tube, 2 * zl - 40, tube], pos: P(sx * xa, yArm, 20), rot: [Math.PI / 2, 0, 0] });
    frame.push({ shape: "cyl", size: [30, 160, 30], pos: P(sx * xa, yArm + 5, 60), rot: [Math.PI / 2, 0, 0] });
  }
  for (const sz of [-1, 1]) frame.push({ shape: "box", size: [2 * xl, tube, tube], pos: P(0, yR, sz * (zl - 60)) });
  const backH = H - SH - 20, tilt = -0.18;
  const yShell = SH + backH / 2;
  const shell: PartPiece[] = [
    { shape: "box", size: [seatW, t, seatD], pos: [0, SH - yShell, 20] },
    { shape: "box", size: [seatW - 20, backH, t], pos: [0, 0, -seatD / 2 + 30], rot: [tilt, 0, 0] },
  ];
  const bolts: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * 80, yR - tube / 2, sz * 70]));
  return {
    parts: [
      { id: "S", name: "Seat shell", size: [seatW, backH + t, seatD], pos: [0, yShell, 0], material: "wood", pieces: shell },
      { id: "F", name: "Underframe with armrests", size: [2 * xa + 30, yArm + 20, D], pos: [0, yc, 0], material: "metal", pieces: frame },
      { id: "C", name: "Cover plate", size: [220, 6, 180], pos: [0, yR - tube / 2 - 3, 0], material: "metal" },
    ],
    steps: [
      {
        title: "Lift the cover plate off the frame",
        detail: "Stand the frame upside down on a table and lift the plate off its seat mount. Keep it for the last step.",
        wait: ["F"],
        pose: "-y",
      },
      { title: "Lay the seat shell upside down", detail: "On the table, with its back hanging over the edge so the seat lies flat.", add: ["S"] },
      {
        title: "Bolt the frame onto the shell",
        detail: "Set the frame on with its holes over the shell's inserts and tighten the four bolts.",
        add: ["F"],
        fix: [{ kind: "bolt", count: 4, len: 30, dia: 6, at: bolts, dir: [0, 1, 0], on: "F", mate: "S" }],
      },
      { title: "Press the cover plate back on", detail: "Over the bolts, until it clicks onto the mount. Then turn the chair over.", add: ["C"] },
      { title: "Stand the chair up", detail: "Chairs without a cover stack up to seven high.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["LÄKTARE"], recipe };
export default family;
