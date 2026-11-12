import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * ANTILOP highchair, read from IKEA's manuals (the seat shell's, and the tray's for the chair sold with one).
 * No tools and no fittings: the seat shell is laid upside down on a table and the safety belt is threaded through
 * its three slots, each strap looped back through its buckle. The four legs are pushed into the sockets until their
 * spring buttons click out of the holes, the chair is turned over and the belt is buckled. The tray hooks onto the
 * armrests with its two catches at the back and is pressed down at the front until it clicks.
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
/** A disc standing upright, facing front, for the rounded top of the backrest. */
const disc = (c: Vec3, dia: number, t: number): Bit => ({
  piece: { shape: "cyl", size: [dia, t, dia], pos: c, rot: [Math.PI / 2, 0, 0] },
  lo: [c[0] - dia / 2, c[1] - dia / 2, c[2] - t / 2],
  hi: [c[0] + dia / 2, c[1] + dia / 2, c[2] + t / 2],
});
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
/** A straight round tube from its foot to its top, as a turned cylinder. */
function tube(id: string, name: string, foot: Vec3, top: Vec3, dia: number): CustomPart {
  const d: Vec3 = [top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]];
  const len = Math.hypot(...d);
  return {
    id,
    name,
    shape: "cyl",
    material: "metal",
    size: [dia, len, dia],
    pos: [(foot[0] + top[0]) / 2, (foot[1] + top[1]) / 2, (foot[2] + top[2]) / 2],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}

function highchair(s: ProductSpec): CustomParams {
  const tray = /tray/.test(`${s.slug ?? ""} ${s.variant}`.toLowerCase());
  // IKEA: 56 wide, 60 deep, 90 high, the seat 54 cm up, 25 x 22 cm inside
  const W = 560, D = 600, H = 900, SEAT = 540, ARM = 640;
  const sx = 210, sz = 175; // the shell's outer corners at the armrests
  const shell = assemble("A", "Seat shell", [
    bx([-150, SEAT - 70, -120], [150, SEAT, 150]), // the seat
    bx([-sx, SEAT - 70, -sz], [-150, ARM, sz]), // the sides, the armrests on top
    bx([150, SEAT - 70, -sz], [sx, ARM, sz]),
    bx([-150, ARM - 50, sz - 40], [150, ARM, sz]), // the front rim
    bx([-195, SEAT - 70, -sz], [195, 720, -sz + 34]), // the backrest
    disc([0, 710, -sz + 17], 390, 34),
  ], "board");
  const leg = (id: string, gx: number, gz: number) =>
    tube(id, "Leg", [gx * (W / 2 - 14), 0, gz * (D / 2 - 14)], [gx * (sx - 16), ARM - 30, gz * (sz - 30)], 24);
  const belt = assemble("C", "Safety belt", [
    bx([-140, SEAT + 30, 40], [140, SEAT + 52, 48]), // round the waist, buckled in the middle
    bx([-30, SEAT + 26, 36], [30, SEAT + 56, 54]),
    bx([-12, SEAT, 100], [12, SEAT + 40, 108]), // between the legs
    bx([-12, 330, 100], [12, SEAT - 70, 108]), // the loose ends under the seat
    bx([-120, 360, 30], [-100, SEAT - 70, 38]),
    bx([100, 360, 30], [120, SEAT - 70, 38]),
  ], "soft");
  const parts: CustomPart[] = [shell, belt, leg("L1", -1, 1), leg("L2", 1, 1), leg("L3", -1, -1), leg("L4", 1, -1)];
  if (tray)
    parts.push(
      assemble("T", "Tray", [
        bx([-245, ARM, -10], [245, ARM + 14, 270]),
        bx([-245, ARM + 14, 240], [245, ARM + 30, 270]), // the raised rim
        bx([-245, ARM + 14, -10], [-215, ARM + 30, 240]),
        bx([215, ARM + 14, -10], [245, ARM + 30, 240]),
      ], "board"),
    );
  // each leg slides up into its socket along its own line
  const along = (p: CustomPart): Vec3 => {
    const r = p.rot!;
    const up: Vec3 = [-Math.sin(r[2]), Math.cos(r[2]) * Math.cos(r[0]), Math.cos(r[2]) * Math.sin(r[0])];
    return [-up[0] * 320, -up[1] * 320, -up[2] * 320];
  };
  const legs = parts.filter((p) => p.name === "Leg");

  const steps: CustomStep[] = [
    {
      title: "Lay the seat upside down on a table",
      detail: "Rest it on its armrests on a soft cloth so it doesn't scratch.",
      add: ["A"],
      pose: "-y",
    },
    {
      title: "Thread the safety belt through the seat",
      detail: "Push each strap through its slot from the inside, then loop it back through its buckle so it can't slip out. Do the same with all three.",
      add: ["C"],
      from: { C: [0, 260, 0] },
    },
    {
      title: "Click the legs into the seat",
      detail: "Press in the button on each leg and push it into its socket until the button clicks out of the hole. Pull to check it's held.",
      add: legs.map((p) => p.id),
      from: Object.fromEntries(legs.map((p) => [p.id, along(p)])),
      warnings: ["hand"],
    },
    {
      title: "Turn it over and buckle the belt",
      detail: "Stand it on its legs and click the two ends of the belt together round the middle strap. Pull the loose ends under the seat to tighten it.",
      pose: "+y",
    },
  ];
  if (tray)
    steps.push(
      {
        title: "Hook the tray onto the armrests",
        detail: "Hold it tilted up and slot its two catches into the armrests at the back first.",
        add: ["T"],
        from: { T: [0, 260, 80] },
      },
      { title: "Press the tray down until it clicks", detail: "Push down at the front edge. To take it off, pull the catch underneath and lift." },
    );
  return { parts, steps };
}

const family: Family = {
  names: ["ANTILOP"],
  recipe(s) {
    if (s.archetype !== "seat" && !/highchair/i.test(s.variant)) return null;
    return highchair(s);
  },
};
export default family;
