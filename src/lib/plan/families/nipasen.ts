import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * NIPÅSEN, read from the coat stand's and the shoe bench's manuals.
 * Coat stand: on a rug, the four bent legs clip onto the lower pole and a star clamp is screwed round the bundle,
 * the feet go in and the floor ring is pressed on and screwed to every leg. Stood up, the middle hooks go onto the
 * pole, the upper pole is screwed on with a threaded stud, the five top hooks are pushed in and held by a second
 * star clamp and screw.
 * Bench: the seat lies upside down while two rails are screwed under it, an end frame is bolted to the rails, the
 * mesh shelf is bolted to that frame with the bench on its back, then the second end frame takes four bolts.
 */

interface Bit {
  piece: PartPiece;
  lo: Vec3;
  hi: Vec3;
}
function tb(a: Vec3, b: Vec3, dia: number): Bit {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const r = dia / 2;
  return {
    piece: { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)] },
    lo: [0, 1, 2].map((k) => Math.min(a[k], b[k]) - r) as Vec3,
    hi: [0, 1, 2].map((k) => Math.max(a[k], b[k]) + r) as Vec3,
  };
}
const bit = (size: Vec3, pos: Vec3, shape: "box" | "cyl" = "box"): Bit => ({
  piece: { shape, size, pos },
  lo: [pos[0] - size[0] / 2, pos[1] - size[1] / 2, pos[2] - size[2] / 2],
  hi: [pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2],
});
function assemble(id: string, name: string, bits: Bit[], material: CustomPart["material"] = "metal"): CustomPart {
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
const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SIDES = [-1, 1] as const;

function coatStand(): CustomParams {
  // IKEA: 181 high, 56 across the feet
  const H = 1810, R = 265, T = 22;
  const yB0 = 420, yB1 = 610; // the leg bundle round the lower pole
  const yMid = 1080, yTop = 1560;
  const radial = (a: number, r: number, y: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
  const legA = [1, 3, 5, 7].map((k) => (k * Math.PI) / 4);
  const yRing = 200;
  const rRing = 20 + ((R - 20) * (yB0 - yRing)) / (yB0 - 30);
  const legs = legA.map((a, i) =>
    assemble(`L${i}`, "Leg", [tb(radial(a, 20, yB1), radial(a, 20, yB0), T), tb(radial(a, 20, yB0), radial(a, R, 30), T)]),
  );
  const ring = assemble("G", "Floor ring", Array.from({ length: 16 }, (_, k) => tb(radial((k * Math.PI) / 8, rRing, yRing), radial(((k + 1) * Math.PI) / 8, rRing, yRing), 14)));
  const hook = (id: string, name: string, a: number, y: number, r: number) =>
    assemble(id, name, [tb(radial(a, 14, y + 60), radial(a, 14, y), 14), tb(radial(a, 14, y), radial(a, r, y - 30), 14), tb(radial(a, r, y - 30), radial(a, r, y + 10), 14)]);
  const midA = [0, 1, 2, 3].map((k) => (k * Math.PI) / 2);
  const topA = [0, 1, 2, 3, 4].map((k) => (k * 2 * Math.PI) / 5 + Math.PI / 2);
  const topHook = (i: number) => {
    const a = topA[i];
    return assemble(`T${i}`, "Top hook", [
      tb(radial(a, 14, yTop - 100), radial(a, 14, yTop + 20), 14),
      tb(radial(a, 14, yTop + 20), radial(a, 95, yTop + 110), 14),
      tb(radial(a, 95, yTop + 110), radial(a, 95, H), 14),
      tb(radial(a, 14, yTop - 70), radial(a, 65, yTop - 110), 14),
      tb(radial(a, 65, yTop - 110), radial(a, 65, yTop - 70), 14),
    ]);
  };
  const parts: CustomPart[] = [
    { id: "P", name: "Lower pole", shape: "cyl", size: [25, yMid - yB0, 25], pos: [0, (yB0 + yMid) / 2, 0], material: "metal" },
    ...legs,
    { id: "C1", name: "Star clamp", shape: "cyl", size: [80, 30, 80], pos: [0, yB1 - 25, 0], material: "board" },
    ring,
    ...midA.map((a, i) => hook(`M${i}`, "Middle hook", a, yMid - 20, 55)),
    { id: "U", name: "Upper pole", shape: "cyl", size: [25, yTop - yMid, 25], pos: [0, (yMid + yTop) / 2, 0], material: "metal" },
    ...topA.map((_, i) => topHook(i)),
    { id: "C2", name: "Star clamp", shape: "cyl", size: [80, 30, 80], pos: [0, yTop + 35, 0], material: "board" },
  ];
  const legIds = legs.map((l) => l.id);
  const steps: CustomStep[] = [
    {
      title: "Clip the legs onto the lower pole",
      detail: "Lay the pole on a rug. Press each leg's two pegs into the slots on the one beside it, then slide it along until it locks.",
      add: ["P", ...legIds],
      pose: "+z",
      warnings: ["floor"],
    },
    {
      title: "Screw the star clamp round the legs",
      detail: "Fit it over the top of the bundle, flat side towards the legs, and screw it tight.",
      add: ["C1"],
      fix: [at("screw", [[0, yB1 - 10, 0]], [0, -1, 0], "C1", "P", { len: 25, dia: 6 })],
      tools: ["screwdriver"],
    },
    {
      title: "Screw a foot into each leg",
      detail: "By hand, until they stop.",
      fix: [at("foot", legA.map((a) => radial(a, R, 0)), [0, 1, 0], undefined, undefined, { len: 15, dia: 30 })],
    },
    { title: "Press the ring onto the legs", detail: "Push it up the legs until it sits in the notch on each one.", add: ["G"], from: { G: [0, -260, 0] } },
    {
      title: "Screw the ring to every leg",
      detail: "One small screw where the ring meets each leg.",
      fix: legA.map((a, i) => at("screw", [radial(a, rRing + 7, yRing)], [-Math.cos(a), 0, -Math.sin(a)], "G", legIds[i], { len: 12, dia: 4 })),
      tools: ["screwdriver"],
    },
    {
      title: "Stand it up and push the middle hooks on",
      detail: "Push the straight end of each hook down into the sleeve at the top of the lower pole.",
      add: midA.map((_, i) => `M${i}`),
      pose: "+y",
    },
    {
      title: "Screw the stud into the upper pole",
      detail: "Turn the threaded stud into the bottom end of the pole by hand, halfway in.",
      add: ["U"],
      fix: [at("stud", [[0, yMid, 0]], [0, 1, 0], "U", "P", { len: 50, dia: 8 })],
    },
    { title: "Screw the upper pole onto the lower pole", detail: "Turn it clockwise until it's tight. It holds the middle hooks in place." },
    {
      title: "Push the five top hooks in",
      detail: "One into each slot round the top of the pole, the tall end pointing up.",
      add: topA.map((_, i) => `T${i}`),
    },
    {
      title: "Screw the top clamp on",
      detail: "Lay the second star clamp on top of the hooks and screw it down into the pole. Turn the feet to make the stand steady.",
      add: ["C2"],
      fix: [at("screw", [[0, yTop + 50, 0]], [0, -1, 0], "C2", "U", { len: 25, dia: 6 })],
      tools: ["screwdriver"],
    },
  ];
  return { parts, steps };
}

function bench(s: ProductSpec): CustomParams {
  // IKEA: 79 wide, 35 deep, 52 high, 24 cm free under the shelf
  const W = Math.round(s.size.w * 10) || 790, D = Math.round(s.size.d * 10) || 350, H = Math.round(s.size.h * 10) || 520;
  const ST = 25, L = 30;
  const yS = H - ST; // under the seat
  const xl = W / 2 - 35, zl = D / 2 - 30;
  const yR = yS - 15; // rails under the seat
  const ySh = 255; // the shelf's frame
  const frame = (sx: number) =>
    assemble(sx < 0 ? "EL" : "ER", "End frame", [...SIDES.map((sz) => bit([L, yS, L], [sx * xl, yS / 2, sz * zl], "cyl")), tb([sx * xl, yS - 40, -zl], [sx * xl, yS - 40, zl], 20)]);
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [W, ST, D], pos: [0, H - ST / 2, 0], material: "board" },
    ...SIDES.map((sz): CustomPart => ({ id: sz < 0 ? "RB" : "RF", name: "Seat rail", shape: "cyl", size: [30, 2 * xl - L, 30], pos: [0, yR, sz * zl], rot: [0, 0, Math.PI / 2], material: "metal" })),
    frame(-1),
    frame(1),
    assemble("M", "Mesh shelf", [
      ...SIDES.map((sz) => tb([-xl + L / 2, ySh, sz * zl], [xl - L / 2, ySh, sz * zl], 20)),
      bit([2 * xl - L, 4, 2 * zl - 20], [0, ySh + 8, 0]),
      ...[-1, 1].map((k) => bit([20, 20, 2 * zl - 20], [(k * (2 * xl - L)) / 6, ySh, 0])),
    ]),
  ];
  const bolt = (sx: number, y: number, mate: string, sz: number) => at("bolt", [[sx * (xl + L / 2), y, sz * zl]], [-sx, 0, 0], sx < 0 ? "EL" : "ER", mate, { len: 60, dia: 6 });
  const steps: CustomStep[] = [
    {
      title: "Screw the two rails under the seat",
      detail: "Lay the seat upside down on a rug. Two screws hold each rail.",
      add: ["S", "RB", "RF"],
      fix: SIDES.map((sz) => at("screw", [-200, 200].map((x): Vec3 => [x, yR - 15, sz * zl]), [0, 1, 0], sz < 0 ? "RB" : "RF", "S", { len: 30, dia: 4 })),
      tools: ["screwdriver"],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Bolt an end frame to the rails",
      detail: "One bolt through each leg into the end of a rail. Leave them a little loose for now.",
      add: ["EL"],
      fix: SIDES.map((sz) => bolt(-1, yR, sz < 0 ? "RB" : "RF", sz)),
      tools: ["allen"],
    },
    {
      title: "Bolt the shelf to the end frame",
      detail: "Lay the bench on its back. Slide the mesh shelf in between the legs and fix it with two bolts, loosely.",
      add: ["M"],
      fix: SIDES.map((sz) => bolt(-1, ySh, "M", sz)),
      tools: ["allen"],
      pose: "+z",
    },
    {
      title: "Bolt on the other end frame",
      detail: "Four bolts: two into the rails and two into the shelf.",
      add: ["ER"],
      fix: [...SIDES.map((sz) => bolt(1, yR, sz < 0 ? "RB" : "RF", sz)), ...SIDES.map((sz) => bolt(1, ySh, "M", sz))],
      tools: ["allen"],
    },
    {
      title: "Stand it up and tighten every bolt",
      detail: "Turn it onto its legs and tighten all eight bolts, holding the head with one Allen key while you turn with the other.",
      pose: "+y",
      tools: ["allen"],
      check: "square",
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["NIPÅSEN", "NIPASEN"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/coat-stand/.test(slug)) return coatStand();
    if (/nipasen-bench/.test(slug)) return bench(s);
    return null;
  },
};
export default family;
