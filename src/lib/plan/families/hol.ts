import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * HOL, read from the side table's and the storage table's manuals: both are an open lattice box with a loose lid,
 * not a table on legs. The two end frames (lattice between two corner posts) stand on the bottom on four dowels, the
 * lattice front and back slide down into the posts' grooves (the long table's front is two panels either side of a
 * middle post), and the open top frame is screwed onto the posts. Turned upside down, the bottom is screwed on the
 * same way (four screws each for the side table, five for the storage table). Four bumpers are tapped into the
 * lid's corners and the lid is laid on top.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SCREW = { len: 60, dia: 5 };

/** Lattice slats both ways across a panel, `n` mm wide and `m` mm high, facing along `face` ("x" or "z"). */
function lattice(n: number, m: number, face: "x" | "z" | "y", cy = 0): PartPiece[] {
  const bar = 22, gap = 58, t = 8;
  const pieces: PartPiece[] = [];
  const count = (len: number) => Math.max(2, Math.floor(len / gap));
  const along = (len: number, k: number) => Array.from({ length: k }, (_, i) => -len / 2 + (len / k) * (i + 0.5));
  const put = (u: number, v: number, su: number, sv: number, layer: number) => {
    if (face === "z") pieces.push({ shape: "box", size: [su, sv, t], pos: [u, cy + v, layer] });
    else if (face === "x") pieces.push({ shape: "box", size: [t, sv, su], pos: [layer, cy + v, u] });
    else pieces.push({ shape: "box", size: [su, t, sv], pos: [u, cy + layer, v] });
  };
  for (const u of along(n, count(n))) put(u, 0, bar, m, -t / 2);
  for (const v of along(m, count(m))) put(0, v, n, bar, t / 2);
  return pieces;
}

function recipe(s: ProductSpec): CustomParams | null {
  if (!/^hol-(side|storage)-table/i.test(s.slug ?? "")) return null;
  const long = /storage/i.test(s.slug ?? "");
  // IKEA's measures: 50 x 50 x 50, or 98 x 50 x 50
  const W = long ? 980 : 500, D = 500, H = 500;
  const lidT = 20, rimT = 30, botT = 40, P = 40;
  const Wb = W - 10, Db = D - 10; // the box, under the lid's small overhang
  const xp = Wb / 2 - P / 2, zp = Db / 2 - P / 2;
  const y0 = botT, y1 = H - lidT - rimT; // the walls
  const wallH = y1 - y0, wy = (y0 + y1) / 2;
  const inW = Wb - 2 * P, inD = Db - 2 * P;

  const endFrame: PartPiece[] = [
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [P, wallH, P], pos: [0, 0, sz * zp] })),
    ...lattice(inD, wallH, "x"),
  ];
  const frame = (w: number, d: number, t: number, solid: boolean): PartPiece[] => [
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [P, t, d], pos: [sx * (w / 2 - P / 2), 0, 0] })),
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [w - 2 * P, t, P], pos: [0, 0, sz * (d / 2 - P / 2)] })),
    ...(solid ? lattice(w - 2 * P, d - 2 * P, "y") : []),
  ];
  const parts: CustomPart[] = [
    { id: "BOT", name: "Bottom", size: [Wb, botT, Db], pos: [0, botT / 2, 0], pieces: frame(Wb, Db, botT, true), material: "wood" },
    { id: "EL", name: "End frame", size: [P, wallH, Db], pos: [-xp, wy, 0], pieces: endFrame, material: "wood" },
    { id: "ER", name: "End frame", size: [P, wallH, Db], pos: [xp, wy, 0], pieces: endFrame, material: "wood" },
  ];
  const panel = (id: string, w: number, x: number, z: number) =>
    parts.push({ id, name: "Lattice panel", size: [w, wallH, 16], pos: [x, wy, z], pieces: lattice(w, wallH, "z"), material: "wood" });
  const slide: string[] = [];
  if (long) {
    const half = (inW - P) / 2;
    panel("PF1", half, -(P + half) / 2, zp);
    panel("PF2", half, (P + half) / 2, zp);
    parts.push({ id: "MP", name: "Middle post", size: [P, wallH, P], pos: [0, wy, zp], material: "wood" });
    panel("PB", inW, 0, -zp);
    slide.push("PB", "PF1", "MP", "PF2");
  } else {
    panel("PB", inW, 0, -zp);
    panel("PF", inW, 0, zp);
    slide.push("PB", "PF");
  }
  parts.push({ id: "RIM", name: "Top frame", size: [Wb, rimT, Db], pos: [0, y1 + rimT / 2, 0], pieces: frame(Wb, Db, rimT, false), material: "wood" });
  parts.push({
    id: "LID",
    name: "Lid",
    size: [W, lidT, D],
    pos: [0, H - lidT / 2, 0],
    pieces: [...frame(W, D, lidT, false), ...lattice(W - 2 * P, D - 2 * P, "y")],
    material: "wood",
  });

  const posts: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xp, 0, sz * zp]));
  if (long) posts.push([0, 0, zp]);
  const dowels = (sx: number): Vec3[] => [-1, 1].map((sz): Vec3 => [sx * xp, y0, sz * zp]);
  const bumpers: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (W / 2 - P / 2), H - lidT, sz * (D / 2 - P / 2)]));
  const n = posts.length;

  const steps: CustomStep[] = [
    {
      title: "Stand the end frames on the bottom",
      detail: "Tap two dowels into the foot of each end frame, then push them into the holes in the bottom.",
      add: ["BOT", "EL", "ER"],
      fix: [at("dowel", dowels(-1), [0, -1, 0], "EL", "BOT"), at("dowel", dowels(1), [0, -1, 0], "ER", "BOT")],
      tools: ["hammer"],
    },
    {
      title: long ? "Slide the back and front panels into the grooves" : "Slide the lattice panels into the grooves",
      detail: long
        ? "The long panel goes in at the back. At the front, the middle post goes in between the two short panels."
        : "Lower each one straight down between the corner posts until it rests on the bottom.",
      add: slide,
    },
    {
      title: "Screw the top frame onto the posts",
      detail: `One screw down into each ${long ? "post, the middle one too" : "corner post"}. Tighten them with the Allen key.`,
      add: ["RIM"],
      fix: [at("screw", posts.map(([x, , z]): Vec3 => [x, H - lidT, z]), [0, -1, 0], "RIM", undefined, SCREW)],
      tools: ["allen"],
    },
    {
      title: "Turn it over and screw on the bottom",
      detail: `Stand it upside down on a rug. ${n} more screws through the bottom into the posts.`,
      fix: [at("screw", posts, [0, 1, 0], "BOT", undefined, SCREW)],
      pose: "-y",
      tools: ["allen"],
      warnings: ["floor"],
    },
    {
      title: "Tap the bumpers into the lid",
      detail: "Stand the box up again. Lay the lid upside down and tap a bumper into each corner with a hammer.",
      add: ["LID"],
      fix: [at("glide", bumpers, [0, 1, 0], "LID", undefined, { len: 10, dia: 12, name: "Bumper" })],
      pose: "+y",
      tools: ["hammer"],
      from: { LID: [0, 350, 0] },
    },
    { title: "Lay the lid on the box", detail: "Bumpers down. It sits loose on the top frame and lifts off." },
  ];
  return { parts, steps };
}

const family: Family = { names: ["HOL"], recipe };
export default family;
