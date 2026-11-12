import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LILLÅNÄS, read from the chair's and the bar stool's manuals. The upholstered shell is laid upside down on a
 * table with its back hanging over the edge. The chrome sled base comes as two side frames, each with half of the
 * front and back cross tubes: the halves are pushed together (spring buttons click) over the shell. The chair is
 * held by four bolts through the brackets on the shell; the bar stool by four screws through plastic spacers at the
 * corners, a short screw at each joint, and a footrest screwed between the front legs. Then it's turned over, sat
 * on, and every fitting is tightened.
 */

interface Bit {
  piece: PartPiece;
  lo: Vec3;
  hi: Vec3;
}
const bx = (lo: Vec3, hi: Vec3): Bit => ({
  piece: { shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] },
  lo,
  hi,
});
/** A straight round tube between two points. */
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
function assemble(id: string, name: string, bits: Bit[], material: PartMaterial): CustomPart {
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

interface Dims {
  W: number;
  H: number;
  D: number;
  seat: number; // seat height
  sw: number; // shell width
  xc: number; // where the legs meet the cross tubes
  zc: number;
  xr: number; // runners
  zr: number;
}

/** The upholstered shell: a seat and a back leaning slightly back, in one piece. */
function shell(d: Dims): CustomPart {
  const t = 55, bt = 45;
  const yb = d.seat - t;
  const zBack = -d.D / 2 + 30;
  const backH = d.H - d.seat;
  const lean = 0.09;
  const back: Bit = {
    piece: { shape: "box", size: [d.sw - 20, backH + 20, bt], pos: [0, d.seat + backH / 2 - 10, zBack + bt / 2 - Math.sin(lean) * backH * 0.5], rot: [-lean, 0, 0] },
    lo: [-d.sw / 2 + 10, d.seat - 20, -d.D / 2],
    hi: [d.sw / 2 - 10, d.H, zBack + bt],
  };
  return assemble("A", "Seat shell", [bx([-d.sw / 2, yb, zBack], [d.sw / 2, d.seat, d.D / 2 - 10]), back], "soft");
}

/** One side of the sled base: a runner, the front and back legs, and half of each cross tube. */
function sideFrame(d: Dims, sx: 1 | -1, yc: number): CustomPart {
  const T = 20;
  const top = (sz: number): Vec3 => [sx * d.xc, yc, sz * d.zc];
  const foot = (sz: number): Vec3 => [sx * d.xr, T / 2, sz * d.zr];
  return assemble(sx < 0 ? "L" : "R", "Side frame", [
    tb(foot(-1), foot(1), T),
    tb(foot(1), top(1), T),
    tb(foot(-1), top(-1), T),
    tb(top(1), [0, yc, d.zc], T),
    tb(top(-1), [0, yc, -d.zc], T),
  ], "metal");
}

function chair(): CustomParams {
  // IKEA: 48 wide, 54 deep, 87 high, seat 47 up
  const d: Dims = { W: 480, H: 870, D: 540, seat: 470, sw: 440, xc: 190, zc: 160, xr: 225, zr: 240 };
  const yc = d.seat - 55 - 11;
  const parts: CustomPart[] = [shell(d), sideFrame(d, -1, yc), sideFrame(d, 1, yc)];
  const bolts = [-1, 1].flatMap((sz) => [-1, 1].map((sx): Vec3 => [sx * 95, yc, sz * (d.zc + 22)]));
  const steps: CustomStep[] = [
    {
      title: "Lay the seat upside down on a table",
      detail: "Rest it on a soft cloth with the back hanging down over the edge.",
      add: ["A"],
      pose: "-y",
    },
    {
      title: "Push the two side frames together",
      detail: "Slide the narrow end of each cross tube into the other frame's tube until the spring button clicks out. The tubes lie in the brackets under the seat.",
      add: ["L", "R"],
      from: { L: [-200, 0, 0], R: [200, 0, 0] },
      warnings: ["hand"],
    },
    {
      title: "Screw the bolts in through the brackets",
      detail: "Four bolts, one through each bracket into its tube. Turn them in by hand first, then snug them with the Allen key, not fully tight yet.",
      fix: bolts.map((p) => at("bolt", [p], [0, 0, -Math.sign(p[2])], "A", p[0] < 0 ? "L" : "R", { len: 16, dia: 6 })),
      tools: ["allen"],
    },
    {
      title: "Turn it over and tighten the bolts",
      detail: "Stand the chair on its runners and put some weight on the seat, then tighten all four bolts. Check them again after a couple of weeks.",
      pose: "+y",
      tools: ["allen"],
    },
  ];
  return { parts, steps };
}

function barStool(): CustomParams {
  // IKEA: 47 wide, 51 deep, 94 high, seat 63 up
  const d: Dims = { W: 470, H: 940, D: 510, seat: 630, sw: 420, xc: 175, zc: 135, xr: 225, zr: 235 };
  const yc = d.seat - 55 - 16;
  const parts: CustomPart[] = [shell(d), sideFrame(d, -1, yc), sideFrame(d, 1, yc)];
  // spacers under the four corners where the legs bend into the cross tubes
  const corners = [-1, 1].flatMap((sz) => [-1, 1].map((sx): Vec3 => [sx * (d.xc - 15), yc + 10, sz * d.zc]));
  const yF = 240;
  const t = (yc - yF) / (yc - 10);
  const xF = d.xc + (d.xr - d.xc) * t, zF = d.zc + (d.zr - d.zc) * t;
  parts.push({ id: "F", name: "Footrest", shape: "cyl", material: "metal", size: [20, 2 * xF - 20, 20], pos: [0, yF, zF], rot: [0, 0, Math.PI / 2] });
  const steps: CustomStep[] = [
    {
      title: "Lay the seat upside down on a table",
      detail: "Rest it on a soft cloth with the back hanging down over the edge.",
      add: ["A"],
      pose: "-y",
    },
    {
      title: "Push the two side frames together",
      detail: "Slide the narrow end of each cross tube into the other frame's tube until it stops. Stand the frame on the seat with the four corners over the holes.",
      add: ["L", "R"],
      from: { L: [-200, 250, 0], R: [200, 250, 0] },
    },
    {
      title: "Screw the corners to the seat",
      detail: "A plastic spacer under each corner, then a long screw through it. Turn them in by hand and stop before they're tight.",
      fix: [
        at("washer", corners.map((p): Vec3 => [p[0], yc + 11, p[2]]), [0, 1, 0], "L", undefined, { name: "Plastic spacer", len: 6, dia: 26 }),
        at("screw", corners, [0, 1, 0], undefined, "A", { len: 40, dia: 6 }),
      ],
      tools: ["allen"],
    },
    {
      title: "Screw the joints to the seat",
      detail: "One short screw through the middle of each cross tube, where the two halves meet. Hand tight for now.",
      fix: [at("screw", [-1, 1].map((sz): Vec3 => [0, yc + 10, sz * d.zc]), [0, 1, 0], "L", "A", { len: 20, dia: 6 })],
      tools: ["allen"],
    },
    {
      title: "Screw the footrest between the front legs",
      detail: "A long screw through each leg into the end of the footrest. Turn them in by hand first.",
      add: ["F"],
      fix: [-1, 1].map((sx) => at("screw", [[sx * (xF + 10), yF, zF]], [-sx, 0, 0], sx < 0 ? "L" : "R", "F", { len: 40, dia: 6 })),
      tools: ["allen"],
    },
    {
      title: "Turn it over and tighten everything",
      detail: "Stand the stool on its runners and put some weight on the seat, then tighten all eight screws. Check them again after a couple of weeks.",
      pose: "+y",
      tools: ["allen"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["LILLÅNÄS", "LILLANAS"],
  recipe(s: ProductSpec) {
    const slug = s.slug ?? "";
    if (/bar-stool/.test(slug)) return barStool();
    if (/lillanas-chair/.test(slug)) return chair();
    return null;
  },
};
export default family;
