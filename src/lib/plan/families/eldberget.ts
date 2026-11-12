import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * ELDBERGET / MALSKÄR, read from the MALSKÄR swivel frame's manual. The hub lies upside down on a rug, the five
 * legs slide into it and each is held with one bolt, the castors are pushed in and the base is turned over. The
 * hub cover goes on, the gas lift (cap off) drops into the hub, the seat plate is bolted under the ELDBERGET shell
 * with four bolts, and the shell is lowered onto the gas lift. Fourteen bolts in all, one Allen key.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];
const H_MAX = 900; // IKEA: 90 cm with the seat at its highest

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10;
  const R = W / 2 - 25; // castor centres
  const yLeg = 62, LH = 34; // legs, from the floor
  const hubD = 84, yHub0 = 50, yHub1 = 108;
  const yPlate = 440; // seat plate, on top of the gas lift
  const yPan = yPlate + 22;
  const angles = [0, 1, 2, 3, 4].map((i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
  const parts: CustomPart[] = [
    { id: "HB", name: "Hub", size: [hubD, yHub1 - yHub0, hubD], pos: [0, (yHub0 + yHub1) / 2, 0], material: "metal", pieces: [{ shape: "cyl", size: [hubD, yHub1 - yHub0, hubD], pos: [0, 0, 0] }] },
  ];
  angles.forEach((a, i) => {
    const r0 = hubD / 2 - 4, r1 = R + 20;
    const rm = (r0 + r1) / 2;
    parts.push({ id: `L${i}`, name: "Leg", size: [r1 - r0, LH, 40], pos: [rm * Math.cos(a), yLeg + LH / 2, rm * Math.sin(a)], rot: [0, -a, 0], material: "metal" });
  });
  parts.push({ id: "CV", name: "Hub cover", size: [100, 26, 100], pos: [0, yHub1 + 13, 0], material: "metal", pieces: [{ shape: "cyl", size: [100, 14, 100], pos: [0, -6, 0] }, { shape: "cyl", size: [66, 12, 66], pos: [0, 7, 0] }] });
  const plate: PartPiece[] = [
    { shape: "box", size: [200, 22, 200], pos: [0, 0, 0] },
    { shape: "box", size: [150, 8, 14], pos: [170, -6, 60] }, // the height lever, out to the right
  ];
  parts.push({ id: "PL", name: "Seat plate", size: [200, 22, 200], pos: [0, yPlate + 11, 0], material: "metal", pieces: plate });
  // the shell: a round moulded bowl, its wall rising from the sides to the top of the back, with an opening across
  // the back just above the seat
  const cy = (yPan + H_MAX) / 2;
  const SR = 250, sz0 = -10; // the bowl's radius and centre
  const shell: PartPiece[] = [
    { shape: "cyl", size: [2 * SR - 20, 36, 2 * SR - 20], pos: [0, yPan + 18 - cy, sz0] },
    { shape: "cyl", size: [400, 22, 400], pos: [0, yPan + 47 - cy, sz0 + 20], material: "soft" },
  ];
  const N = 22, a0 = -0.35, a1 = Math.PI + 0.35, lean = 0.18;
  for (let i = 0; i < N; i++) {
    const t = a0 + ((a1 - a0) * (i + 0.5)) / N;
    const back = Math.sin(t); // 1 at the middle of the back, 0 at the sides
    const top = yPan + 150 + (H_MAX - yPan - 150) * Math.max(0, back) ** 0.6;
    const bottom = back > 0.75 ? yPan + 190 : yPan + 30; // the opening
    const w = (SR * (a1 - a0)) / N + 8;
    const h = top - bottom;
    const r = SR + (h / 2) * Math.sin(lean); // each strip leans out, so the bowl opens upwards
    shell.push({ shape: "box", size: [22, h, w], pos: [r * Math.cos(t), (top + bottom) / 2 - cy, sz0 - r * Math.sin(t)], rot: [0, t + Math.PI, lean] });
  }
  parts.push({ id: "SH", name: "Seat shell", size: [2 * SR + 24, H_MAX - yPan, 2 * SR + 24], pos: [0, cy, 0], material: "board", pieces: shell });

  const legIds = angles.map((_, i) => `L${i}`);
  const steps: CustomStep[] = [
    {
      title: "Slide the legs into the hub",
      detail: "Lay the hub upside down on a rug and push the five legs into it, holes facing up.",
      add: ["HB", ...legIds],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Bolt each leg to the hub",
      detail: "One bolt per leg, through the hub into the leg's end. Tighten them with the Allen key.",
      fix: angles.map((a, i) => fx("bolt", [[30 * Math.cos(a), yHub0, 30 * Math.sin(a)]], UP, "HB", { len: 16, dia: 6, mate: `L${i}` })),
      tools: ["allen"],
    },
    {
      title: "Push in the castors",
      detail: "One in the end of each leg, pushed straight in until it can't go further. Then turn the base over.",
      fix: angles.map((a, i) => fx("castor", [[R * Math.cos(a), yLeg, R * Math.sin(a)]], UP, `L${i}`)),
    },
    { title: "Press the cover onto the hub", detail: "Stand the base on its castors first.", add: ["CV"], pose: "+y" },
    { title: "Take the cap off the gas lift", detail: "Pull the plastic cap off its top end and throw it away." },
    { title: "Drop the gas lift into the hub", detail: "Narrow end down, straight into the hole in the middle.", fix: [fx("gasLift", [[0, yHub1, 0]], DOWN, "HB", { len: yPlate - yHub1, dia: 50 })] },
    {
      title: "Bolt the seat plate under the shell",
      detail: "Lay the shell upside down on a rug. Four bolts through the plate into the shell, lever to the right.",
      fix: [fx("bolt", [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * 75, yPlate, sz * 75])), UP, "PL", { len: 16, dia: 6, mate: "SH" })],
      tools: ["allen"],
      wait: ["PL", "SH"],
      warnings: ["floor"],
    },
    { title: "Lower the seat onto the gas lift", detail: "Its top end goes into the socket under the plate. Sit on it once and it's pressed home.", add: ["PL", "SH"], from: { PL: [0, 300, 0], SH: [0, 300, 0] } },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["ELDBERGET"],
  recipe(s) {
    if (!/swivel/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
