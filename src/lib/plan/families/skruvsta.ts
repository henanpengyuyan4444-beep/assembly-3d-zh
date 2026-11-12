import type { Family } from "./family";
import type { CustomParams, CustomPart, Vec3 } from "../../types";

/*
 * SKRUVSTA swivel chair, read from IKEA's manual. The box has five castors and five plastic feet; the manual
 * gives both, and the chair is shown on its castors. Upside down on a rug, the castors are pushed straight into the
 * star base. Turned over, the gas lift (cap off) stands in the base, and the seat, with its plate already fitted,
 * is pressed down onto it. No tools.
 * IKEA's sizes: 69 x 69 cm, 79 to 86 high, seat 47 to 55 high, 48 wide and 45 deep.
 */

function chair(): CustomParams {
  const R = 300, AY0 = 60, AY1 = 95; // the base's arms, castors under their ends
  const SY = 470, PY = 380; // top of the seat cushion, underside of the shell's plate
  const angles = [0, 1, 2, 3, 4].map((i) => (i * 2 * Math.PI) / 5);
  const base: CustomPart = {
    id: "A",
    name: "Star base",
    size: [2 * R, AY1 - AY0 + 30, 2 * R],
    pos: [0, (AY0 + AY1 + 30) / 2, 0],
    material: "metal",
    pieces: [
      { shape: "cyl", size: [80, AY1 - AY0 + 30, 80], pos: [0, 0, 0] },
      ...angles.map((a) => ({ shape: "box" as const, size: [45, AY1 - AY0, R - 30] as Vec3, pos: [Math.sin(a) * (R + 30) / 2, -15, Math.cos(a) * (R + 30) / 2] as Vec3, rot: [0, a, 0] as Vec3 })),
    ],
  };
  const sc: Vec3 = [0, 570, -20];
  const seat: CustomPart = {
    id: "S",
    name: "Seat shell",
    size: [640, 790 - PY, 600],
    pos: sc,
    material: "soft",
    pieces: [
      { shape: "box", size: [140, 20, 140], pos: [0, PY + 10 - sc[1], 20 - sc[2]], material: "metal" },
      { shape: "cyl", size: [620, 60, 620], pos: [0, PY + 50 - sc[1], 0 - sc[2]] },
      { shape: "cyl", size: [520, 50, 520], pos: [0, SY - sc[1], 30 - sc[2]] },
      // the shell wraps round into low arms at each side
      ...[-1, 1].map((g) => ({ shape: "box" as const, size: [60, 170, 340] as Vec3, pos: [g * 270, 545 - sc[1], -110 - sc[2]] as Vec3, rot: [0, g * 0.45, 0] as Vec3 })),
      { shape: "halfcyl", size: [640, 120, 320], pos: [0, 590 - sc[1], -260 - sc[2]], rot: [-Math.PI / 2 - 0.12, 0, 0] },
    ],
  };
  const ends = angles.map((a): Vec3 => [Math.sin(a) * (R - 20), AY0, Math.cos(a) * (R - 20)]);
  return {
    parts: [base, { id: "G", name: "Gas lift", shape: "cyl", material: "metal", size: [50, PY - 110, 50], pos: [0, (PY + 110) / 2, 0] }, seat],
    steps: [
      {
        title: "Push the castors into the base",
        detail: "Base upside down on a rug. Push each castor straight in until it stops; don't tip it in at an angle. Use the plastic feet the same way if you want the chair to stay put.",
        add: ["A"],
        fix: [{ kind: "castor", count: 5, at: ends, dir: [0, 1, 0], len: 60, dia: 50 }],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Stand the gas lift in the base",
        detail: "Turn the base onto its castors, pull the cap off the gas lift and set it in the hole, narrow end up.",
        add: ["G"],
        pose: "+y",
        from: { G: [0, 300, 0] },
      },
      {
        title: "Press the seat onto the gas lift",
        detail: "Set the plate under the seat over the top of the gas lift and push down hard. The lever on the right raises and lowers it.",
        add: ["S"],
        from: { S: [0, 300, 0] },
      },
    ],
  };
}

const family: Family = {
  names: ["SKRUVSTA"],
  recipe(s) {
    if (/swivel chair/i.test(`${s.variant} ${s.slug ?? ""}`.replace(/-/g, " "))) return chair();
    return null;
  },
};
export default family;
