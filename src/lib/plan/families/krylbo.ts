import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * KRYLBO, read from the chair's and the swivel chair's manuals.
 * Chair: the seat lies upside down on a table (on a rug) and the welded four-leg underframe is bolted to it with six
 * bolts; the back's bracket slides into the slot under the seat's back edge and takes four more bolts, then the
 * chair is turned over.
 * Swivel chair: four legs push into the hub on a rug and take two screws each; turned over, the gas lift (cap off)
 * drops in. The seat (back and seat in one) lies upside down on a table for the seat plate's four bolts, and is
 * pressed down onto the lift.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** The upholstered back, leaning a little back from the seat, its ends turned slightly forward. */
function backPieces(W: number, h: number, t: number, tilt: number): PartPiece[] {
  const end = 90;
  return [
    { shape: "box", size: [W - 2 * end + 20, h, t], pos: [0, 0, 0], rot: [tilt, 0, 0] },
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [end, h - 30, t], pos: [sx * (W / 2 - end / 2 - 8), 0, 22], rot: [tilt, -sx * 0.45, 0] })),
  ];
}

function chair(): CustomParams {
  // IKEA's measures: 55 wide, 51 deep, 75 high; seat 49 high, 49 wide, 41 deep
  const W = 550, D = 510, H = 750, seatH = 490, seatW = 490, seatD = 410, seatT = 80;
  const y0 = seatH - seatT; // under the seat
  const legT = 20, xl = 220, zf = 200, zb = -190;
  const frameCy = y0 / 2;
  const legPieces: PartPiece[] = [];
  for (const sx of [-1, 1])
    for (const z of [zf, zb]) legPieces.push({ shape: "cyl", size: [legT, y0, legT], pos: [sx * (xl + 15), 0, z + Math.sign(z) * 15], rot: [Math.sign(z) * 0.08, 0, -sx * 0.07] });
  for (const sx of [-1, 1]) legPieces.push({ shape: "cyl", size: [legT, zf - zb, legT], pos: [sx * (xl - 15), y0 / 2 - legT / 2, (zf + zb) / 2], rot: [Math.PI / 2, 0, 0] });
  legPieces.push({ shape: "cyl", size: [legT, 2 * (xl - 15), legT], pos: [0, y0 / 2 - legT / 2, 0], rot: [0, 0, Math.PI / 2] });
  const seatZ = (D / 2 - seatD / 2) - 30;
  const backH = H - seatH + 60, backT = 60, tilt = -0.14;
  const backZ = seatZ - seatD / 2 + 10;
  const parts: CustomPart[] = [
    { id: "SEAT", name: "Seat", size: [seatW, seatT, seatD], pos: [0, seatH - seatT / 2, seatZ], material: "soft" },
    { id: "FR", name: "Underframe", size: [W - 40, y0, D - 60], pos: [0, frameCy, 0], pieces: legPieces, material: "metal" },
    {
      id: "BACK",
      name: "Back",
      size: [W, backH + 80, 180],
      pos: [0, H - backH / 2 - 40, backZ],
      pieces: [
        ...backPieces(W, backH, backT, tilt).map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] + 40, p.pos[2]] as Vec3 })),
        { shape: "box", size: [160, 14, 120], pos: [0, y0 - (H - backH / 2 - 40) - 7, 60], material: "metal" },
      ],
      material: "soft",
    },
  ];
  const frameBolts = [-1, 1].flatMap((sx) => [-130, 0, 130].map((z): Vec3 => [sx * (xl - 15), y0, z]));
  const backBolts = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * 50, y0 - 14, backZ + 60 + sz * 35]));
  const steps: CustomStep[] = [
    {
      title: "Bolt the underframe to the seat",
      detail: "Lay the seat upside down on a table with a rug under it. Set the frame on it and turn in six bolts with their washers.",
      add: ["SEAT", "FR"],
      fix: [at("bolt", frameBolts, [0, 1, 0], "FR", "SEAT", { len: 35, dia: 6 })],
      pose: "-y",
      tools: ["allen"],
      warnings: ["floor"],
    },
    {
      title: "Slide the back's bracket into the seat",
      detail: "The flat bracket under the back goes into the slot at the seat's back edge, all the way in.",
      add: ["BACK"],
      from: { BACK: [0, 0, -260] },
    },
    {
      title: "Bolt the back on",
      detail: "Four bolts through the bracket into the seat. Tighten them all, the frame's too.",
      fix: [at("bolt", backBolts, [0, 1, 0], "BACK", "SEAT", { len: 16, dia: 6 })],
      tools: ["allen"],
    },
    { title: "Turn the chair over", detail: "Stand it on its feet and check that all four touch the floor.", pose: "+y", kind: "flip" },
  ];
  return { parts, steps };
}

function swivel(): CustomParams {
  // IKEA's measures: 63 x 63, 88 high at the top; seat 51 wide, 45 deep, 46 to 58 high (drawn at the top)
  const R = 315, H = 880, seatH = 580, seatW = 510, seatD = 450, seatT = 70;
  const legY = 40, hubY = 60;
  const angles = [0, 1, 2, 3].map((i) => Math.PI / 4 + (i * Math.PI) / 2);
  const legs = angles.map((_, i) => `LG${i}`);
  const parts: CustomPart[] = [{ id: "HUB", name: "Hub", size: [70, 80, 70], pos: [0, hubY, 0], shape: "cyl", material: "metal" }];
  angles.forEach((a, i) => {
    const r = (35 + R) / 2;
    parts.push({ id: legs[i], name: "Leg", size: [R - 35, 30, 40], pos: [Math.cos(a) * r, legY, -Math.sin(a) * r], rot: [0, a, 0], material: "metal" });
  });
  const plateY = seatH - seatT - 10;
  parts.push({ id: "GAS", name: "Gas lift", size: [40, plateY - 10 - (hubY - 30), 40], pos: [0, (plateY - 10 + hubY - 30) / 2, 0], shape: "cyl", material: "metal" });
  parts.push({ id: "PL", name: "Seat plate", size: [200, 20, 200], pos: [0, plateY, 0], material: "metal" });
  const backH = H - seatH + 40, backT = 60;
  const cy = (seatH - seatT + H) / 2;
  const backZ = -seatD / 2 + 10;
  parts.push({
    id: "SH",
    name: "Seat and back",
    size: [seatW + 60, H - seatH + seatT, seatD + 80],
    pos: [0, cy, 0],
    pieces: [
      { shape: "box", size: [seatW, seatT, seatD], pos: [0, seatH - seatT / 2 - cy, 20] },
      ...backPieces(seatW + 40, backH, backT, -0.14).map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] + H - backH / 2 - cy, p.pos[2] + backZ] as Vec3 })),
    ],
    material: "soft",
  });
  const screws = angles.flatMap((a) => [55, 85].map((r): Vec3 => [Math.cos(a) * r, legY - 15, -Math.sin(a) * r]));
  const plate = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * 70, plateY + 10, sz * 70]));
  const steps: CustomStep[] = [
    { title: "Push the four legs into the hub", detail: "Upside down on a rug, each leg straight into its socket until it stops.", add: ["HUB", ...legs], pose: "-y", warnings: ["floor"] },
    { title: "Screw the legs to the hub", detail: "Two screws in each leg, tight with the Allen key.", fix: [at("screw", screws, [0, 1, 0], "HUB", undefined, { len: 14, dia: 6 })], tools: ["allen"] },
    {
      title: "Turn the base over and push in the gas lift",
      detail: "Pull the cap off the lift and throw it away, then push the lift into the hub, thick end down.",
      add: ["GAS"],
      pose: "+y",
      from: { GAS: [0, 380, 0] },
    },
    {
      title: "Bolt the seat plate under the seat",
      detail: "Lay the seat upside down on a table, lever to the right. Four bolts, tight.",
      add: ["SH", "PL"],
      fix: [at("bolt", plate, [0, 1, 0], "PL", "SH", { len: 20, dia: 6 })],
      tools: ["allen"],
      from: { SH: [0, 520, 0], PL: [0, 640, 0] },
    },
    { title: "Press the seat down onto the gas lift", detail: "Straight down over the lift, then sit on it once: your weight locks the taper." },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["KRYLBO"],
  recipe(s: ProductSpec) {
    const t = s.slug ?? "";
    if (/^krylbo-swivel-chair/.test(t)) return swivel();
    if (/^krylbo-chair/.test(t)) return chair();
    return null;
  },
};
export default family;
