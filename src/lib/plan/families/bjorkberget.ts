import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BJÖRKBERGET swivel chair, read from its manual. Four curved legs push into the tall hub and each takes a short
 * screw high up and a long one lower down. The gas lift (cap off) drops into the hub. The seat is laid upside down
 * on a table: the seat plate goes on with four flange screws and the two back bars with three each, left loose. The
 * back cover is unzipped, the back slides down over the bars, two small screws hold it and the zips are closed.
 * Then the six bar screws are tightened and the seat is pressed onto the lift. It stands on feet, no castors.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

interface Bit {
  piece: PartPiece;
  lo: Vec3;
  hi: Vec3;
}
/** A round tube from a to b. */
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
  // IKEA's measures: 58 x 59, 93 high at the top of the lift; seat 43 x 39, 47 to 52 high
  const HUB0 = 250, HUB1 = 400, LIFT1 = 445, PLATE1 = 460, SEAT1 = 525, TOP = 930;
  const FOOT = 275; // feet on the diagonals, 58 across
  const parts: CustomPart[] = [];
  parts.push({
    id: "HUB",
    name: "Hub",
    size: [80, HUB1 - HUB0, 80],
    pos: [0, (HUB0 + HUB1) / 2, 0],
    pieces: [
      { shape: "cyl", size: [80, 50, 80], pos: [0, -(HUB1 - HUB0) / 2 + 25, 0] },
      { shape: "cyl", size: [62, HUB1 - HUB0 - 50, 62], pos: [0, 25, 0] },
    ],
    material: "metal",
  });
  // each leg runs down the side of the hub, then curves out to its foot
  const diag = [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const;
  const legIds: string[] = [];
  diag.forEach(([gx, gz], i) => {
    const p = (r: number, y: number): Vec3 => [(gx * r) / Math.SQRT2, y, (gz * r) / Math.SQRT2];
    const R = FOOT * Math.SQRT2;
    const id = `L${i + 1}`;
    legIds.push(id);
    parts.push(
      assemble(id, "Leg", [
        tube(p(44, HUB1 - 10), p(52, HUB0 + 20), 24),
        tube(p(52, HUB0 + 20), p(R * 0.55, 150), 24),
        tube(p(R * 0.55, 150), p(R - 10, 50), 24),
        tube(p(R - 10, 50), p(R, 12), 24),
        { piece: { shape: "cyl", size: [36, 12, 36], pos: p(R, 6) }, lo: [p(R, 0)[0] - 18, 0, p(R, 0)[2] - 18], hi: [p(R, 0)[0] + 18, 12, p(R, 0)[2] + 18] },
      ], "metal"),
    );
  });
  parts.push({ id: "GAS", name: "Gas lift", size: [28, LIFT1 - (HUB1 - 60), 28], pos: [0, (LIFT1 + HUB1 - 60) / 2, 0], shape: "cyl", material: "metal" });
  parts.push(
    assemble("PL", "Seat plate", [bx([-80, LIFT1, -80], [80, PLATE1, 80]), bx([80, LIFT1 + 2, 20], [250, LIFT1 + 12, 36])], "metal"),
  );
  parts.push({ id: "SEAT", name: "Seat", size: [430, SEAT1 - PLATE1, 390], pos: [0, (SEAT1 + PLATE1) / 2, 0], shape: "cyl", material: "soft" });
  // the back bars: a strap under the seat, then up behind it into the back's pockets
  const backZ = -230, backH = 340, backY = TOP - backH / 2;
  const barIds = ["BL", "BR"];
  [-1, 1].forEach((sx, i) => {
    parts.push(
      assemble(barIds[i], "Back bar", [
        bx([sx > 0 ? 70 : -150, PLATE1 - 12, -170], [sx > 0 ? 150 : -70, PLATE1, -40]),
        tube([sx * 120, PLATE1 - 6, -170], [sx * 160, PLATE1 - 6, -205], 20),
        tube([sx * 160, PLATE1 - 6, -205], [sx * 165, SEAT1 + 40, -220], 20),
        tube([sx * 165, SEAT1 + 40, -220], [sx * 135, TOP - backH + 120, backZ + 5], 20),
      ], "metal"),
    );
  });
  // the back: an upright oval cushion, leaning back a little
  parts.push({ id: "BACK", name: "Backrest", size: [400, 60, backH], pos: [0, backY, backZ], shape: "cyl", rot: [Math.PI / 2 - 0.1, 0, 0], material: "soft" });

  const steps: CustomStep[] = [];
  const legDirs = diag.map(([gx, gz]) => [-gx / Math.SQRT2, 0, -gz / Math.SQRT2] as Vec3);
  const legPt = (i: number, y: number): Vec3 => [(diag[i][0] * 56) / Math.SQRT2, y, (diag[i][1] * 56) / Math.SQRT2];
  const legScrews = (y: number, len: number) => diag.map((_, i) => at("screw", [legPt(i, y)], legDirs[i], legIds[i], "HUB", { len, dia: 6 }));
  steps.push(
    { title: "Push the four legs onto the hub", detail: "Stand the hub on a rug and slide each leg's top into its groove, the feet out on the diagonals.", add: ["HUB", ...legIds], warnings: ["floor"] },
    { title: "Screw the top of each leg to the hub", detail: "Use the four short countersunk screws in the upper holes. Turn them with the small Allen key.", fix: legScrews(HUB1 - 30, 16), tools: ["allen"] },
    { title: "Screw in the long screws below", detail: "The four long countersunk screws go in the lower holes. Tighten all eight now.", fix: legScrews(HUB0 + 50, 35), tools: ["allen"] },
    { title: "Pull the cap off the gas lift and push it into the hub", detail: "The cap only protects it in the box. Thin end up, straight down into the hub.", add: ["GAS"], from: { GAS: [0, 320, 0] } },
  );
  const plate: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 60, LIFT1, sz * 60] as Vec3));
  const barPts = (sx: number): Vec3[] => [[sx * 110, PLATE1 - 12, -60], [sx * 110, PLATE1 - 12, -100], [sx * 110, PLATE1 - 12, -150]];
  steps.push(
    {
      title: "Screw the seat plate under the seat",
      detail: "Lay the seat upside down on a table. The lever points to the right. Four flange screws with the big Allen key.",
      add: ["SEAT", "PL"],
      fix: [at("bolt", plate, [0, 1, 0], "PL", "SEAT", { len: 20, dia: 6 })],
      tools: ["allen"],
      from: { SEAT: [0, 420, 0], PL: [0, 560, 0] },
    },
    {
      title: "Screw the two back bars under the seat",
      detail: "Three flange screws in each. Leave them a little loose for now, so the bars can still move.",
      add: barIds,
      fix: [-1, 1].map((sx, i) => at("bolt", barPts(sx), [0, 1, 0], barIds[i], "SEAT", { len: 20, dia: 6 })),
      tools: ["allen"],
    },
    { title: "Open the zips on the back cover", detail: "Unzip the bottom of the cover and fold it up, so the two pockets inside the back are free." },
    { title: "Slide the back down over the bars", detail: "Turn the seat the right way up. Push the back down so each bar goes into its pocket.", add: ["BACK"], from: { BACK: [0, 300, 0] } },
    {
      title: "Screw the back to the bars",
      detail: "One small screw through each bar into the back, with the small Allen key.",
      fix: [-1, 1].map((sx, i) => at("screw", [[sx * 150, TOP - backH + 60, backZ + 5]], [0, 0, 1], barIds[i], "BACK", { len: 10, dia: 5 })),
      tools: ["allen"],
    },
    { title: "Close the zips on the back cover", detail: "Pull the cover down over the bars and zip both sides shut." },
    { title: "Tighten the six bar screws", detail: "Turn the seat upside down again and tighten the screws under the seat until the flanges sit flat.", tools: ["allen"] },
    { title: "Press the seat onto the gas lift", detail: "Turn it over, lower the plate's socket straight onto the lift and sit on it once to lock it." },
  );
  return { parts, steps };
}

const family: Family = { names: ["BJÖRKBERGET", "BJORKBERGET"], recipe };
export default family;
