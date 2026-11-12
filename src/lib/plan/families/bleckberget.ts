import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BLECKBERGET swivel chair, read from its manual. On a rug, five legs push into the hub and take two screws with
 * washers each; the base is turned over for the five castors, a cover snaps over the hub and the gas lift (cap off)
 * drops in. The backrest is laid face down and its bar is screwed on with three long screws; the bar's other end
 * slides into the sleeve of the seat plate and takes one screw. The plate then goes under the upside-down seat with
 * four screws, and the seat is pressed onto the lift.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

interface Bit {
  piece: PartPiece;
  lo: Vec3;
  hi: Vec3;
}
function tube(a: Vec3, b: Vec3, dia: number): Bit {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const r = dia / 2;
  return {
    piece: { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)] },
    lo: [0, 1, 2].map((k) => Math.min(a[k], b[k]) - r) as Vec3,
    hi: [0, 1, 2].map((k) => Math.max(a[k], b[k]) + r) as Vec3,
  };
}
const bx = (lo: Vec3, hi: Vec3): Bit => ({
  piece: { shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] },
  lo,
  hi,
});
function assemble(id: string, name: string, bits: Bit[], material: CustomPart["material"]): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...bits.map((b) => b.lo[k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...bits.map((b) => b.hi[k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  return {
    id,
    name,
    size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
    pos,
    material,
    pieces: bits.map((b) => ({ ...b.piece, pos: [b.piece.pos[0] - pos[0], b.piece.pos[1] - pos[1], b.piece.pos[2] - pos[2]] as Vec3 })),
  };
}

function recipe(s: ProductSpec): CustomParams | null {
  if (!/swivel|chair/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
  // IKEA's measures: 68 x 68, 90 high at the top of the lift; seat 47 x 44, 47 to 59 high
  const R = 300, legY = 95, hubY = 95;
  const LIFT1 = 470, PLATE1 = 492, SEAT1 = 562, TOP = 900;
  const parts: CustomPart[] = [];
  parts.push({ id: "HUB", name: "Hub", size: [80, 70, 80], pos: [0, hubY, 0], shape: "cyl", material: "metal" });
  const angles = [0, 1, 2, 3, 4].map((i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
  const legs = angles.map((a, i) => {
    const r = (40 + R) / 2;
    parts.push({ id: `A${i}`, name: "Leg", size: [R - 40, 36, 44], pos: [Math.cos(a) * r, legY, -Math.sin(a) * r], rot: [0, a, 0], material: "metal" });
    return `A${i}`;
  });
  parts.push({ id: "COV", name: "Hub cover", size: [96, 50, 96], pos: [0, hubY + 50, 0], shape: "cyl", material: "metal" });
  const gas0 = hubY - 10;
  parts.push({ id: "GAS", name: "Gas lift", size: [44, LIFT1 - gas0, 44], pos: [0, (LIFT1 + gas0) / 2, 0], shape: "cyl", material: "metal" });
  // the seat plate, with its lever on the right and a sleeve at the back for the bar
  parts.push(
    assemble("PL", "Seat plate", [
      bx([-90, LIFT1, -90], [90, PLATE1, 90]),
      bx([90, LIFT1 + 4, 30], [240, LIFT1 + 14, 46]),
      tube([0, LIFT1 + 2, -90], [0, LIFT1 + 2, -150], 34),
    ], "metal"),
  );
  parts.push({ id: "SEAT", name: "Seat", size: [470, SEAT1 - PLATE1, 440], pos: [0, (SEAT1 + PLATE1) / 2, 20], material: "soft" });
  // the backrest stands behind the seat; the bar runs back from the sleeve and up behind it
  const backT = 60, backZ = -250, backH = 290, back0 = TOP - backH;
  parts.push({ id: "BACK", name: "Backrest", size: [450, backH, backT], pos: [0, TOP - backH / 2, backZ], rot: [-0.08, 0, 0], material: "soft" });
  const barZ = backZ - backT / 2 - 12;
  parts.push(
    assemble("BAR", "Back bar", [
      tube([0, LIFT1 + 2, -150], [0, LIFT1 + 2, barZ + 40], 26),
      tube([0, LIFT1 + 2, barZ + 40], [0, LIFT1 + 60, barZ], 26),
      tube([0, LIFT1 + 60, barZ], [0, back0 + 90, barZ], 26),
      bx([-50, back0 + 40, barZ - 6], [50, back0 + 130, barZ + 6]),
    ], "metal"),
  );

  const steps: CustomStep[] = [];
  const legScrews = angles.flatMap((a) => [60, 90].map((r) => [Math.cos(a) * r, legY + 18, -Math.sin(a) * r] as Vec3));
  const tips = angles.map((a) => [Math.cos(a) * (R - 25), legY - 18, -Math.sin(a) * (R - 25)] as Vec3);
  steps.push(
    { title: "Push the five legs into the hub", detail: "On a rug, each leg straight into its socket until it stops, the holes facing up.", add: ["HUB", ...legs], warnings: ["floor"] },
    {
      title: "Screw the legs to the hub",
      detail: "Two screws in each leg, each with a washer under its head. Tighten them with the big Allen key.",
      fix: [at("screw", legScrews, [0, -1, 0], "HUB", undefined, { len: 16, dia: 6 }), at("washer", legScrews, [0, -1, 0], "HUB", undefined, { len: 2, dia: 14 })],
      tools: ["allen"],
    },
    { title: "Turn the base over and push in the castors", detail: "Press each castor's pin into the end of a leg until it clicks, then stand the base up.", fix: [at("castor", tips, [0, 1, 0], undefined, undefined, { len: 58, dia: 50 })], pose: "-y" },
    { title: "Press the cover over the hub", detail: "It snaps down over the screws.", add: ["COV"], pose: "+y" },
    { title: "Pull the cap off the gas lift and push it into the hub", detail: "The cap only protects it in the box. Thick end down, straight in.", add: ["GAS"], from: { GAS: [0, 380, 0] } },
  );
  const barPts: Vec3[] = [[0, back0 + 110, barZ - 6], [-32, back0 + 60, barZ - 6], [32, back0 + 60, barZ - 6]];
  steps.push(
    {
      title: "Screw the bar onto the back of the backrest",
      detail: "Lay the backrest face down on a table. Three long screws through the bar's plate, with the small Allen key.",
      add: ["BACK", "BAR"],
      fix: [at("screw", barPts, [0, 0, 1], "BAR", "BACK", { len: 45, dia: 5 })],
      tools: ["allen"],
      from: { BACK: [0, 0, -350], BAR: [0, 0, -450] },
    },
    { title: "Slide the bar into the seat plate's sleeve", detail: "Push the free end in until its hole lines up with the hole in the sleeve.", add: ["PL"], from: { PL: [0, 0, 220] } },
    {
      title: "Screw the bar into the sleeve",
      detail: "One round-headed screw through the sleeve into the bar, with the big Allen key.",
      fix: [at("screw", [[0, LIFT1 + 19, -130]], [0, -1, 0], "PL", "BAR", { len: 25, dia: 6 })],
      tools: ["allen"],
    },
    {
      title: "Screw the seat plate under the seat",
      detail: "Lay the seat upside down on the table, with the backrest hanging behind it. Four screws, tight.",
      add: ["SEAT"],
      fix: [at("bolt", [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 65, PLATE1, sz * 65] as Vec3)), [0, 1, 0], "PL", "SEAT", { len: 20, dia: 6 })],
      tools: ["allen"],
      from: { SEAT: [0, 320, 0] },
    },
    { title: "Press the seat onto the gas lift", detail: "Turn it over, lower the plate's socket straight onto the lift and sit on it once to lock it." },
  );
  return { parts, steps };
}

const family: Family = { names: ["BLECKBERGET"], recipe };
export default family;
