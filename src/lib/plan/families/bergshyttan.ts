import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/**
 * BERGSHYTTAN, read from its manuals. The table and the bench are built the same way: two slab legs and one long
 * rail. The rail gets dowels and big cam locks at its ends, the legs get their feet and long cam bolts, and the legs
 * are pushed onto the rail and locked. Turned upside down, dowels go into the leg tops, cam bolts go into the
 * underside of the top, and the frame is lowered onto it and locked with small cam locks in the rail and the legs.
 * Covers hide the big cam locks. The table has twice the big cams and adjustable feet; the bench has tap-in glides.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function build(s: ProductSpec, table: boolean): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const tt = 40; // top
  const lt = 40; // leg slab
  const inset = table ? 300 : 230; // leg from the end of the top
  const ld = table ? 640 : 300; // leg depth
  const rh = table ? 120 : 90, rt = 25; // rail
  const yU = H - tt; // underside of the top
  const xo = W / 2 - inset; // leg outer face
  const xi = xo - lt; // leg inner face
  const xl = xo - lt / 2;
  const yr = yU - rh / 2;
  const parts: CustomPart[] = [
    { id: "R", name: "Rail", size: [2 * xi, rh, rt], pos: [0, yr, 0], material: "wood" },
    { id: "L1", name: "Leg", size: [lt, yU, ld], pos: [-xl, yU / 2, 0], material: "wood" },
    { id: "L2", name: "Leg", size: [lt, yU, ld], pos: [xl, yU / 2, 0], material: "wood" },
    { id: "T", name: table ? "Table top" : "Seat", size: [W, tt, D], pos: [0, H - tt / 2, 0], material: "wood" },
  ];
  const ends = [-1, 1];
  const bigYs = table ? [yr - 25, yr + 25] : [yr];
  const big: Vec3[] = ends.flatMap((sx) => bigYs.map((y) => [sx * (xi - 32), y, rt / 2] as Vec3));
  const zFeet = ld / 2 - 60;
  const legPts = (fn: (sx: number, z: number) => Vec3) => ends.flatMap((sx) => [-1, 1].map((sz) => fn(sx, sz * zFeet)));
  const steps: CustomStep[] = [
    {
      title: "Tap two dowels into the ends of the rail",
      detail: "One in each end, half way in.",
      add: ["R"],
      fix: ends.map((sx) => fx("dowel", [[sx * xi, yr, 0]], [-sx, 0, 0], { on: "R", mate: sx < 0 ? "L1" : "L2" })),
      tools: ["hammer"],
      warnings: ["floor"],
    },
    {
      title: `Push the big cam locks into the rail`,
      detail: table ? "Two at each end, one above the other, arrows pointing to the end." : "One at each end, arrow pointing to the end.",
      fix: [fx("cam", big, [0, 0, -1], { on: "R", dia: 35, name: "Big cam lock" })],
    },
    table
      ? {
          title: "Screw the adjustable feet into the legs",
          detail: "Two under each leg, by hand until they stop.",
          add: ["L1", "L2"],
          fix: [fx("foot", legPts((sx, z) => [sx * xl, 0, z]), [0, 1, 0], { len: 20, dia: 40, to: ["L1", "L2"] })],
          from: { L1: [-300, 0, 0], L2: [300, 0, 0] },
        }
      : {
          title: "Tap the glides into the bottom of the legs",
          detail: "Two in each leg. Lay the legs flat on a rug while you tap them in.",
          add: ["L1", "L2"],
          fix: [fx("glide", legPts((sx, z) => [sx * xl, 0, z]), [0, 1, 0], { len: 6, dia: 30, name: "Glide", to: ["L1", "L2"] })],
          tools: ["hammer"],
          from: { L1: [-300, 0, 0], L2: [300, 0, 0] },
        },
    {
      title: "Screw the long cam bolts into the legs",
      detail: "Into the holes on the inside face, with the wrench, until the collar touches the wood.",
      fix: ends.map((sx) =>
        fx("camScrew", (table ? bigYs : [yr]).map((y) => [sx * xi, y, 0] as Vec3), [-sx, 0, 0], { on: sx < 0 ? "L1" : "L2", mate: "R", len: 40 }),
      ),
      tools: ["wrench"],
    },
    {
      title: "Push the legs onto the rail and lock them",
      detail: "The bolts go into the big cam locks. Turn each lock clockwise with the Allen key until it pulls the leg tight.",
      tools: ["allen"],
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Turn the frame over and tap dowels into the legs",
      detail: "Four along the top edge of each leg.",
      fix: ends.map((sx) =>
        fx("dowel", [-0.38, -0.13, 0.13, 0.38].map((f) => [sx * xl, yU, f * ld] as Vec3), [0, -1, 0], { on: sx < 0 ? "L1" : "L2", mate: "T" }),
      ),
      tools: ["hammer"],
      pose: "-y",
      people: 2,
    },
    {
      title: `Screw the cam bolts into the ${table ? "table top" : "seat"}`,
      detail: "Lay it upside down on a rug. Seven bolts: three along the middle for the rail, two at each end for the legs.",
      add: ["T"],
      fix: [
        fx(
          "camScrew",
          [
            ...[-0.5, 0, 0.5].map((f) => [f * xi, yU, 0] as Vec3),
            ...ends.flatMap((sx) => [-1, 1].map((sz) => [sx * xl, yU, sz * (ld / 2 - 30)] as Vec3)),
          ],
          [0, 1, 0],
          { on: "T", len: 30 },
        ),
      ],
      from: { T: [0, -500, 0] },
      warnings: ["floor"],
    },
    {
      title: "Lower the frame onto it",
      detail: "Upside down, so the dowels and every bolt find their holes.",
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Turn the cam locks in the rail",
      detail: "Three of them, clockwise until tight.",
      fix: [fx("cam", [-0.5, 0, 0.5].map((f) => [f * xi, yU - 25, rt / 2] as Vec3), [0, 0, -1], { on: "R", dia: 15 })],
      tools: ["screwdriver"],
    },
    {
      title: "Turn the cam locks in the legs",
      detail: "Two in each leg, on the inside face.",
      fix: ends.map((sx) =>
        fx("cam", [-1, 1].map((sz) => [sx * xi, yU - 25, sz * (ld / 2 - 30)] as Vec3), [sx, 0, 0], { on: sx < 0 ? "L1" : "L2", dia: 15 }),
      ),
      tools: ["screwdriver"],
    },
    {
      title: "Press the covers onto the big cam locks",
      fix: [fx("cap", big, [0, 0, -1], { on: "R", len: 3, dia: 40, name: "Cover" })],
    },
    {
      title: `Turn the ${table ? "table" : "bench"} the right way up`,
      detail: table ? "Lift it together by the top. If it rocks, turn the feet with the wrench." : "Lift it together by the seat, not the legs.",
      pose: "+y",
      people: 2,
      warnings: ["two"],
      tools: table ? ["wrench"] : undefined,
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["BERGSHYTTAN"],
  recipe(s) {
    const v = `${s.variant} ${s.slug ?? ""}`.toLowerCase();
    if (/bench/.test(v)) return build(s, false);
    if (/table/.test(v)) return build(s, true);
    return null;
  },
};
export default family;
