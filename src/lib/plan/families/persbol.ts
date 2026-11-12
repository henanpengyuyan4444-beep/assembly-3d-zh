import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, Vec3 } from "../../types";

/**
 * PERSBOL armchair, read from its manual. The seat comes in two halves, the back one with the spindle backrest
 * already on it. Upside down on a table edge, the front half goes onto three dowels. The leg frame is put together
 * on its own (a stretcher screwed between the two leg sets), laid on the seat and bolted through its two battens
 * with eight bolts. Felt pads go on the feet, the chair is turned over, and the armrests plug into the seat and
 * the back posts and take two screws each.
 */

const SCREW = { name: "Allen screw", len: 70, dia: 6 };
const BOLT = { name: "Allen bolt", len: 35, dia: 6 };

function part(id: string, name: string, abs: PartPiece[], material: CustomPart["material"] = "wood"): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...abs.map((p) => p.pos[k] - p.size[k] / 2)));
  const hi = [0, 1, 2].map((k) => Math.max(...abs.map((p) => p.pos[k] + p.size[k] / 2)));
  const c = lo.map((v, k) => (v + hi[k]) / 2) as Vec3;
  return {
    id,
    name,
    size: lo.map((v, k) => hi[k] - v) as Vec3,
    pos: c,
    material,
    pieces: abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 })),
  };
}

const box = (lo: Vec3, hi: Vec3): PartPiece => ({ shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] });

/** A round rod from a to b. */
function rod(a: Vec3, b: Vec3, dia: number): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))] };
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function chair(): CustomParams {
  // IKEA: 69 wide, 70 deep, 84 high; arms at 57, seat (on the cushion) at 43
  const H = 840, X = 330, Z = 320; // seat board half width and half depth
  const y0 = 300, y1 = 330; // seat board
  const zSplit = -40;
  const xP = 295, zP = -Z + 30; // back posts
  const xL = 230, legY = y0 - 25, stY = 130;
  const zTop = 220, zFoot = 330;
  const spindles = Array.from({ length: 8 }, (_, i) => -235 + (i * 470) / 7);
  const legSet = (sx: number): PartPiece[] => [
    box([sx * xL - 30, legY, -Z + 50], [sx * xL + 30, y0, Z - 50]),
    rod([sx * xL, legY, zTop], [sx * (xL + 40), 0, zFoot], 42),
    rod([sx * xL, legY, -zTop], [sx * (xL + 40), 0, -zFoot], 42),
    rod([sx * (xL + 22), stY, -zTop - 52], [sx * (xL + 22), stY, zTop + 52], 26),
  ];
  const armX = 315, armY = 570, zPost = 150;
  const arm = (sx: number): PartPiece[] => [
    box([sx * armX - 30, armY - 25, zP + 20], [sx * armX + 30, armY, zPost + 70]),
    rod([sx * armX, y1, zPost], [sx * armX, armY - 25, zPost], 32),
  ];
  const parts: CustomPart[] = [
    part("SEATB", "Seat with backrest", [
      box([-X, y0, -Z], [X, y1, zSplit]),
      ...[-1, 1].map((sx) => rod([sx * xP, y0, zP], [sx * xP, H, zP - 20], 40)),
      box([-xP + 20, H - 80, zP - 32], [xP - 20, H - 10, zP - 8]),
      ...spindles.map((x) => rod([x, y1, zP + 10], [x, H - 80, zP - 18], 18)),
    ]),
    part("SEATF", "Seat front", [box([-X, y0, zSplit], [X, y1, Z])]),
    part("LEGL", "Leg set", legSet(-1)),
    part("LEGR", "Leg set", legSet(1)),
    { id: "MID", name: "Stretcher", size: [2 * (xL + 22) - 26, 26, 26], pos: [0, stY, 0], shape: "cyl", material: "wood" },
    part("ARML", "Armrest", arm(-1)),
    part("ARMR", "Armrest", arm(1)),
    { id: "CUSH", name: "Seat cushion", size: [580, 100, 540], pos: [0, y1 + 50, 10], material: "soft" },
  ];
  const battenBolts = (sx: number): Vec3[] => [-230, -80, 80, 230].map((z) => [sx * xL, legY, z]);
  const feet: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (xL + 40), 0, sz * zFoot]));
  const steps: CustomStep[] = [
    {
      title: "Tap the dowels into the back half of the seat",
      detail: "Lay it upside down on a table, the backrest hanging over the edge. Three dowels into the holes in its front edge.",
      fix: [fx("dowel", [-200, 0, 200].map((x): Vec3 => [x, (y0 + y1) / 2, zSplit]), [0, 0, -1], "SEATB", { len: 30, dia: 8, mate: "SEATF" })],
      tools: ["hammer"],
      pose: "-y",
    },
    { title: "Push the front half onto the dowels", detail: "Press the two halves tight together so the seat is flush, with no step between them.", add: ["SEATF"], from: { SEATF: [0, 0, 260] } },
    {
      title: "Screw the stretcher between the leg sets",
      detail: "Legs up, the stretcher's ends in the holes in the side rails. One long screw through each rail into it, with the long end of the Allen key.",
      fix: [-1, 1].map((sx) => fx("screw", [[sx * (xL + 35), stY, 0]], [-sx, 0, 0], sx < 0 ? "LEGL" : "LEGR", { ...SCREW, mate: "MID" })),
      tools: ["allen"],
      wait: ["LEGL", "LEGR", "MID"],
      from: { LEGL: [0, 0, 760], LEGR: [0, 0, 760], MID: [0, 0, 760] },
    },
    { title: "Lay the leg frame on the seat", detail: "Battens down on the seat, legs leaning outwards, with the holes lined up.", add: ["LEGL", "LEGR", "MID"] },
    {
      title: "Bolt the battens to the seat by hand",
      detail: "Four bolts through each batten into the seat, just turned in with your fingers for now.",
      fix: [-1, 1].map((sx) => fx("bolt", battenBolts(sx), [0, 1, 0], sx < 0 ? "LEGL" : "LEGR", { ...BOLT, mate: sx < 0 ? "SEATB" : "SEATF" })),
      warnings: ["loose"],
    },
    { title: "Tighten all eight bolts", detail: "Firmly with the Allen key, but stop once the head is down: the wood can split.", tools: ["allen"] },
    {
      title: "Stick the felt pads on the feet",
      detail: "One on the end of each leg. Then turn the chair over onto its feet.",
      fix: [fx("glide", feet.slice(0, 2), [0, 1, 0], "LEGL"), fx("glide", feet.slice(2), [0, 1, 0], "LEGR")],
    },
    {
      title: "Plug in the armrests",
      detail: "Each post into its hole at the front of the seat, the back end of the arm onto the peg in the back post.",
      add: ["ARML", "ARMR"],
      pose: "+y",
      from: { ARML: [0, 260, 0], ARMR: [0, 260, 0] },
    },
    {
      title: "Screw the armrests on",
      detail: "One screw through each back post into the arm, and one up through the seat into each armrest post.",
      fix: [
        ...[-1, 1].map((sx) => fx("screw", [[sx * xP, armY - 12, zP - 20]], [0, 0, 1], "SEATB", { ...SCREW, mate: sx < 0 ? "ARML" : "ARMR" })),
        ...[-1, 1].map((sx) => fx("screw", [[sx * armX, y0, zPost]], [0, 1, 0], "SEATF", { ...SCREW, mate: sx < 0 ? "ARML" : "ARMR" })),
      ],
      tools: ["allen"],
    },
    { title: "Put the cushion on", detail: "Zip side to the back.", add: ["CUSH"] },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["PERSBOL"],
  recipe(s) {
    if (!/armchair/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return chair();
  },
};
export default family;
