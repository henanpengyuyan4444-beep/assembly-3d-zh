import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * MILLBERGET, read from the swivel chair's manual. The gas lift, armrests and base arms are packed inside the back's
 * zipped cover. Upside down on a rug, the five arms slide into the hub and each takes a screw, and the five castors
 * click in. Turned over, the gas lift drops into the hub. The tilt mechanism is screwed under the seat (four), the seat
 * is pressed onto the lift, each armrest is screwed to the seat (two each), then the back to the armrests (four),
 * all by hand before the eight are tightened. The cover is zipped shut over the back with the Allen key in its pocket.
 * IKEA: 70 x 70, seat 45 to 58 high, 123 high at the top (drawn at its highest).
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const H = 1230, SH = 580;
  const R = 330, yArm = 85, yHub = 110; // base: arm tips over the castors, centre of the hub
  const angles = [0, 1, 2, 3, 4].map((i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
  const seatT = 100, ySeat = SH - seatT / 2, zSeat = 40;
  const yMech = SH - seatT - 30;
  const armL = R - 30;
  const parts: CustomPart[] = [
    { id: "HB", name: "Hub", shape: "cyl", size: [70, 60, 70], pos: [0, yHub - 10, 0], material: "metal" },
    ...angles.map((a, i): CustomPart => ({
      id: `L${i + 1}`,
      name: "Base arm",
      size: [armL, 35, 45],
      pos: [Math.cos(a) * (35 + armL / 2), yArm + 8, Math.sin(a) * (35 + armL / 2)],
      rot: [0, -a, 0.08],
      material: "metal",
    })),
    { id: "GL", name: "Gas lift", shape: "cyl", size: [50, yMech - 30 - yHub + 30, 50], pos: [0, (yHub - 30 + yMech - 30) / 2 + 15, 0], material: "metal" },
    { id: "ME", name: "Tilt mechanism", size: [220, 60, 240], pos: [0, yMech, zSeat - 20], material: "metal" },
    { id: "SE", name: "Seat", size: [500, seatT, 470], pos: [0, ySeat, zSeat], material: "soft" },
  ];
  // the armrests: a loop from the side of the seat up to the pad, its back upright reaching down to the back
  const xA = 265, yPad = SH + 220, zF = zSeat + 120, zR = -230;
  const arm = (sx: number): CustomPart => {
    const c: Vec3 = [sx * xA, (SH - 80 + yPad + 15) / 2, (zF + 40 + zR - 15) / 2];
    const p = (y: number, z: number): Vec3 => [0, y - c[1], z - c[2]];
    const pieces: PartPiece[] = [
      { shape: "box", size: [70, 30, zF + 40 - zR + 15], pos: p(yPad, (zF + 40 + zR - 15) / 2) },
      { shape: "box", size: [30, yPad - (SH - 80), 30], pos: p((yPad + SH - 80) / 2, zF) },
      { shape: "box", size: [30, yPad - (SH - 80), 30], pos: p((yPad + SH - 80) / 2, zR) },
      { shape: "box", size: [30, 30, zF - zR], pos: p(SH - 80, (zF + zR) / 2) },
    ];
    return { id: sx < 0 ? "A1" : "A2", name: "Armrest", size: [70, yPad + 15 - (SH - 80), zF + 40 - zR + 15], pos: c, material: "metal", pieces };
  };
  const backH = H - (SH - 60), tilt = 0.1;
  parts.push(arm(-1), arm(1), {
    id: "BK",
    name: "Backrest",
    size: [480, backH, 90],
    pos: [0, SH - 60 + backH / 2, zR - 60 - Math.sin(tilt) * (backH / 2) + 20],
    rot: [-tilt, 0, 0],
    material: "soft",
  });
  const BOLT = { len: 20, dia: 6 };
  const sides = [-1, 1];
  const steps: CustomStep[] = [
    { title: "Take the parts out of the back cover", detail: "Unzip the cover at the bottom of the back. The gas lift, armrests and base arms are packed inside; throw the packing away, then zip it shut again.", wait: ["BK"] },
    {
      title: "Slide the base arms into the hub",
      detail: "Upside down on a rug. Push each arm all the way into its socket.",
      add: ["HB", "L1", "L2", "L3", "L4", "L5"],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Screw each arm to the hub",
      detail: "One screw through each arm into the hub, tightened with the Allen key.",
      fix: angles.map((a, i) => fx("screw", [[Math.cos(a) * 55, yHub - 40, Math.sin(a) * 55]], [0, 1, 0], `L${i + 1}`, { mate: "HB", len: 16, dia: 6 })),
      tools: ["allen"],
    },
    {
      title: "Click the castors in",
      detail: "Push each castor's pin straight into the end of an arm until it clicks.",
      fix: [fx("castor", angles.map((a): Vec3 => [Math.cos(a) * (R - 20), yArm - 12, Math.sin(a) * (R - 20)]), [0, 1, 0], "L1")],
    },
    { title: "Turn the base over and fit the gas lift", detail: "Stand it on its castors and drop the lift into the hub.", add: ["GL"], pose: "+y", from: { GL: [0, 300, 0] } },
    {
      title: "Screw the tilt mechanism under the seat",
      detail: "Lay the seat upside down, lever towards the right. Four screws, tightened with the Allen key.",
      wait: ["SE", "ME"],
      fix: [fx("bolt", sides.flatMap((sx) => [-70, 70].map((dz): Vec3 => [sx * 80, yMech - 30, zSeat - 20 + dz])), [0, 1, 0], "ME", { mate: "SE", ...BOLT })],
      tools: ["allen"],
    },
    { title: "Press the seat onto the gas lift", detail: "Turn it over and push it straight down onto the top of the lift.", add: ["ME", "SE"], from: { ME: [0, 300, 0], SE: [0, 300, 0] } },
    {
      title: "Screw on the armrests",
      detail: "Two screws through the bottom of each one into the side of the seat. By hand only for now.",
      add: ["A1", "A2"],
      fix: sides.map((sx) => fx("bolt", [zSeat - 120, zSeat + 60].map((z): Vec3 => [sx * (xA + 15), SH - 80, z]), [-sx, 0, 0], sx < 0 ? "A1" : "A2", { mate: "SE", ...BOLT })),
      warnings: ["hand"],
    },
    {
      title: "Screw the back to the armrests",
      detail: "Fit it between the back uprights and turn in the top screw on each side, by hand.",
      add: ["BK"],
      fix: sides.map((sx) => fx("bolt", [[sx * (xA + 15), yPad - 60, zR]], [-sx, 0, 0], sx < 0 ? "A1" : "A2", { mate: "BK", ...BOLT })),
      from: { BK: [0, 200, -200] },
    },
    { title: "Add the lower screws", detail: "One more on each side, lower down the uprights.", fix: sides.map((sx) => fx("bolt", [[sx * (xA + 15), SH - 20, zR]], [-sx, 0, 0], sx < 0 ? "A1" : "A2", { mate: "BK", ...BOLT })) },
    { title: "Tighten all eight screws", detail: "The four in the armrests and the four in the back, firmly with the Allen key.", tools: ["allen"] },
    { title: "Zip the back cover shut", detail: "Pull it down over the back and close the zip. The Allen key goes in the little pocket inside." },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["MILLBERGET"],
  recipe(s) {
    if (!/swivel/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
