import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * MAMMUT (children's plastic furniture), read from its three manuals. No screws in the chair or stool.
 * Chair: the seat lies upside down on a rug, the four legs go into its holes with a foot cap pressed onto each,
 * each leg is pushed down with your weight and tapped home with a hammer over a block of wood, then the chair
 * stands up and the backrest's three slats are pushed into the slots until they click.
 * Stool: upside down, the four legs go into the holes and are pressed down until they click.
 * Table: a double-ended screw goes into each leg by hand, the legs are screwed into the top lying upside down,
 * then a cap is pressed onto each foot.
 */

/** A leg, thin where it meets the seat and wider at the foot, as two cylinders about its middle (the seam the real legs show). */
function taper(len: number, thin: number, wide: number): PartPiece[] {
  const lo = Math.round(len * 0.35), hi = len - lo;
  return [
    { shape: "cyl", size: [wide, lo, wide], pos: [0, -len / 2 + lo / 2, 0] },
    { shape: "cyl", size: [thin, hi, thin], pos: [0, len / 2 - hi / 2, 0] },
  ];
}

const corners = (x: number, z: number): Vec3[] => [[-x, 0, -z], [x, 0, -z], [-x, 0, z], [x, 0, z]];

function chair(): CustomParams {
  const SY = 300, ST = 40; // seat top, seat thickness with its skirt
  const LX = 145, LZ = 120, F = 8; // legs, and the foot caps under them
  const legLen = SY - ST - F;
  const legs = corners(LX, LZ);
  const back: PartPiece[] = [
    ...[-85, 0, 85].map((x): PartPiece => ({ shape: "box", size: [42, 280, 22], pos: [x, -60, 0] })),
    { shape: "box", size: [320, 140, 30], pos: [0, 130, 0] },
  ];
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [360, ST, 330], pos: [0, SY - ST / 2, 0], material: "board" },
    ...legs.map((p, i): CustomPart => ({ id: `L${i}`, name: "Leg", size: [58, legLen, 58], pos: [p[0], F + legLen / 2, p[2]], material: "board", pieces: taper(legLen, 46, 58) })),
    { id: "B", name: "Backrest", size: [320, 400, 30], pos: [0, 470, -145], material: "board", pieces: back },
  ];
  const caps: CustomFix = { kind: "cap", name: "Foot cap", count: 4, len: F, dia: 58, at: legs, dir: [0, 1, 0] };
  const steps: CustomStep[] = [
    {
      title: "Set the legs in the seat and press on the foot caps",
      detail: "Lay the seat upside down on a rug. Push the thin end of each leg into a hole, then press a cap onto each wide end.",
      add: ["S", "L0", "L1", "L2", "L3"],
      fix: [caps],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Push each leg down into the seat", detail: "Lean your weight on each leg in turn until it goes in as far as it will.", kind: "legs" },
    {
      title: "Tap the legs home with a hammer",
      detail: "Lay a block of wood on the foot and tap it until there's no gap between the leg and the seat.",
      tools: ["hammer"],
      kind: "legs",
    },
    { title: "Stand the chair up and line up the backrest", detail: "The three slats go into the three slots at the back of the seat.", add: ["B"], pose: "+y", from: { B: [0, 220, 0] } },
    { title: "Push the backrest down until it clicks", detail: "Press on the top with both hands. Each slat clicks and no gap shows at the slots.", kind: "general" },
  ];
  return { parts, steps };
}

function stool(): CustomParams {
  const SY = 300, ST = 50, R = 300; // seat top, thickness, diameter
  const top = 80, foot = 148; // legs, from the middle at the seat and at the floor
  const drop = SY - ST;
  const a = Math.atan2(foot - top, drop);
  const len = Math.hypot(foot - top, drop);
  const mid = (top + foot) / 2;
  const legs: { pos: Vec3; rot: Vec3 }[] = [
    { pos: [mid, drop / 2, 0], rot: [0, 0, a] },
    { pos: [-mid, drop / 2, 0], rot: [0, 0, -a] },
    { pos: [0, drop / 2, mid], rot: [-a, 0, 0] },
    { pos: [0, drop / 2, -mid], rot: [a, 0, 0] },
  ];
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [R, ST, R], pos: [0, SY - ST / 2, 0], shape: "cyl", material: "board" },
    ...legs.map((l, i): CustomPart => ({ id: `L${i}`, name: "Leg", size: [60, len, 60], pos: l.pos, rot: l.rot, material: "board", pieces: taper(len, 46, 60) })),
  ];
  const steps: CustomStep[] = [
    {
      title: "Set the legs into the holes in the seat",
      detail: "Lay the seat upside down on a rug. The thin end of each leg goes into a hole.",
      add: ["S", "L0", "L1", "L2", "L3"],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Press each leg down until it clicks", detail: "Lean your weight on it. When it's in, no gap shows between the leg and the seat.", kind: "legs" },
    { title: "Stand the stool up", detail: "Check every leg is in all the way before anyone sits on it.", pose: "+y" },
  ];
  return { parts, steps };
}

function table(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 770, D = Math.round(s.size.d * 10) || 550, H = Math.round(s.size.h * 10) || 480;
  const TT = 40, F = 6; // top with its skirt, foot caps
  const LX = W / 2 - 65, LZ = D / 2 - 65;
  const legLen = H - TT - F;
  const legs = corners(LX, LZ);
  const parts: CustomPart[] = [
    { id: "T", name: "Table top", size: [W, TT, D], pos: [0, H - TT / 2, 0], material: "board" },
    ...legs.map((p, i): CustomPart => ({ id: `L${i}`, name: "Leg", size: [60, legLen, 60], pos: [p[0], F + legLen / 2, p[2]], material: "board", pieces: taper(legLen, 46, 60) })),
  ];
  const ids = legs.map((_, i) => `L${i}`);
  const steps: CustomStep[] = [
    {
      title: "Screw a double-ended screw into each leg",
      detail: "By hand, into the thin end, until the collar sits against the leg. The other thread stays out.",
      add: ids,
      fix: legs.map((p, i): CustomFix => ({ kind: "legScrew", name: "Double-ended screw", count: 1, len: 50, dia: 8, at: [[p[0], H - TT, p[2]]], dir: [0, -1, 0], on: `L${i}`, mate: "T" })),
    },
    {
      title: "Screw the legs into the top",
      detail: "Lay the top upside down on a rug and turn each leg clockwise into its hole until it's tight.",
      add: ["T"],
      pose: "-y",
      warnings: ["floor"],
      kind: "legs",
    },
    {
      title: "Press a cap onto each foot",
      detail: "Push it on until it sits flat, then turn the table over.",
      fix: [{ kind: "cap", name: "Foot cap", count: 4, len: F, dia: 60, at: legs, dir: [0, 1, 0] }],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["MAMMUT"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/children-s-chair/.test(slug)) return chair();
    if (/children-s-stool/.test(slug)) return stool();
    if (/children-s-table/.test(slug)) return table(s);
    return null;
  },
};
export default family;
