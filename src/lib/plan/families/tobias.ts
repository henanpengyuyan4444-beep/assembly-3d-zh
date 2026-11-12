import type { Family } from "./family";
import type { CustomParams, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TOBIAS, read from the chair's manual. The steel frame is one bent tube and the plastic shell is one piece. Four
 * bolts with washers are pushed up through the frame's top by hand and a plastic strip clips onto its back tube,
 * the shell is laid over the bolts and a cap goes onto each (the front pair differs from the back pair), then the
 * bolts are tightened from underneath with the Allen key.
 */

const TUBE = 22;

/** A straight tube from a to b along one axis, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, c: Vec3): PartPiece {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const rot: Vec3 = Math.abs(d[0]) > 1 ? [0, 0, Math.PI / 2] : Math.abs(d[2]) > 1 ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return { shape: "cyl", size: [TUBE, len + TUBE, TUBE], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot };
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 55 wide, 56 deep, 82 high; seat 48 x 46, 44 high
  const H = s.size.h * 10 || 820;
  const ySeat = 440, seatT = 10, seatW = 480, zBack = -200, zFront = 260;
  const fx = 210, yTop = ySeat - seatT - TUBE / 2, yFloor = TUBE / 2, zLeg = 200, zRear = 190, zFoot = -250;
  const fc: Vec3 = [0, (yTop + yFloor) / 2, (zLeg + zFoot) / 2];
  const frame: PartPiece[] = [
    ...[-1, 1].flatMap((sx) => [
      tube([sx * fx, yTop, -zRear], [sx * fx, yTop, zLeg], fc),
      tube([sx * fx, yFloor, zLeg], [sx * fx, yTop, zLeg], fc),
      tube([sx * fx, yFloor, zFoot], [sx * fx, yFloor, zLeg], fc),
    ]),
    tube([-fx, yTop, -zRear], [fx, yTop, -zRear], fc),
    tube([-fx, yFloor, zFoot], [fx, yFloor, zFoot], fc),
  ];
  // the shell: a seat and a back leaning back from its rear edge
  const lean = 0.18, backH = H - ySeat;
  const sc: Vec3 = [0, (ySeat + H) / 2, (zBack + zFront) / 2];
  const shell: PartPiece[] = [
    { shape: "box", size: [seatW, seatT, zFront - zBack], pos: [0, ySeat - seatT / 2 - sc[1], (zBack + zFront) / 2 - sc[2]] },
    {
      shape: "box",
      size: [seatW + 40, backH, 10],
      pos: [0, ySeat + (backH / 2) * Math.cos(lean) - sc[1], zBack - (backH / 2) * Math.sin(lean) - sc[2]],
      rot: [-lean, 0, 0],
    },
  ];
  const zB = -150, zF = 160;
  const holes = (y: number): Vec3[] => [-1, 1].flatMap((sx) => [zB, zF].map((z): Vec3 => [sx * fx, y, z]));
  const caps = (z: number): Vec3[] => [-1, 1].map((sx): Vec3 => [sx * fx, ySeat, z]);
  return {
    parts: [
      { id: "F", name: "Frame", size: [2 * fx + TUBE, yTop - yFloor + TUBE, zLeg - zFoot + TUBE], pos: fc, pieces: frame, material: "metal" },
      { id: "S", name: "Seat shell", size: [seatW + 40, H - ySeat + seatT, zFront - zBack + 70], pos: sc, pieces: shell, material: "glass" },
    ],
    steps: [
      {
        title: "Push the bolts up through the frame",
        detail: "Slip a washer onto each bolt and push it up through a hole in the frame's top from underneath, by hand. Clip the plastic strip onto the back tube.",
        add: ["F"],
        fix: [
          { kind: "stud", name: "Seat bolt", count: 4, len: 40, dia: 6, at: holes(yTop - TUBE / 2), dir: [0, 1, 0], on: "F", mate: "S" },
          { kind: "washer", count: 4, at: holes(yTop + TUBE / 2), dir: [0, -1, 0], on: "F" },
          { kind: "clip", name: "Plastic strip", count: 1, at: [[0, yTop + TUBE / 2, -zRear]], dir: [0, -1, 0], on: "F" },
        ],
      },
      {
        title: "Lay the shell on and fit the caps",
        detail: "Lower the shell so the four bolts come through its holes. Screw a cap onto each bolt by hand: the two front caps are not the same as the back ones.",
        add: ["S"],
        fix: [
          { kind: "cap", name: "Back cap", count: 2, at: caps(zB), on: "S" },
          { kind: "cap", name: "Front cap", count: 2, at: caps(zF), on: "S" },
        ],
        from: { S: [0, 250, 0] },
      },
      {
        title: "Tighten the bolts from underneath",
        detail: "Turn each bolt with the Allen key while the cap on top holds still. Check them again after a few weeks.",
        tools: ["allen"],
      },
    ],
  };
}

const family: Family = { names: ["TOBIAS"], recipe };
export default family;
