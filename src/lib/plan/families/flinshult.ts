import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * FLINSHULT armchair, read from its manual. Each arm gets a hook plate (one screw) and two legs with big washers.
 * Two threaded rods go by hand into the seat frame, the back frame drops onto them and is held with washers and nuts
 * (spanner). With the seat and back lying on their back, each arm hooks onto the side and is bolted through the back
 * frame with two hex bolts and washers, all four tightened with the spanner at the end. Stood up, the seat cushion and
 * the back cushion go in.
 * IKEA: 84 x 95 x 91 cm, seat 58 x 66 cm at 51 cm, arms 12 cm wide and 57 cm high, 18 cm under it.
 */

function armchair(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 840, H = Math.round(s.size.h * 10) || 910, D = Math.round(s.size.d * 10) || 950;
  const legH = 180, armW = 120, armTop = 570, seatTop = 510;
  const ax = W / 2 - armW / 2, inner = W / 2 - armW;
  const zB = -D / 2 + 30, backT = 150; // back of the chair, back frame depth
  const deckTop = seatTop - 160;

  // the sloping top of the arm, from the front of the wing down to the armrest
  const slope = (c: Vec3) => {
    const z0 = zB + 260, z1 = 0, dy = armTop - H, dz = z1 - z0, L = Math.hypot(dy, dz), th = Math.asin(-dy / L), t = 150;
    const y = (H + armTop) / 2 - (t / 2) * Math.cos(th), z = (z0 + z1) / 2 - (t / 2) * Math.sin(th);
    return { shape: "box" as const, size: [armW, t, L] as Vec3, pos: [0, y - c[1], z - c[2]] as Vec3, rot: [th, 0, 0] as Vec3 };
  };
  const arm = (sx: number): CustomPart => {
    const c: Vec3 = [sx * ax, (legH + H) / 2, 0];
    return {
      id: sx < 0 ? "AL" : "AR",
      name: "Armrest",
      size: [armW, H - legH, D - 30],
      pos: c,
      material: "soft",
      pieces: [
        // low and long at the front, sweeping up into the back's wing at the rear
        { shape: "box", size: [armW, armTop - legH, D - 30], pos: [0, (armTop + legH) / 2 - c[1], 15] },
        { shape: "box", size: [armW, H - armTop, 260], pos: [0, (H + armTop) / 2 - c[1], zB + 130] },
        slope(c),
      ],
    };
  };
  const parts: CustomPart[] = [arm(-1), arm(1)];
  const legs: [string, number, number][] = [["L1", -1, D / 2 - 70], ["L2", -1, zB + 60], ["L3", 1, D / 2 - 70], ["L4", 1, zB + 60]];
  for (const [id, sx, z] of legs) parts.push({ id, name: "Leg", size: [45, legH, 45], pos: [sx * ax, legH / 2, z], material: "wood" });
  parts.push(
    { id: "SF", name: "Seat frame", size: [2 * inner, deckTop - legH - 20, D - 30 - backT], pos: [0, (deckTop + legH + 20) / 2, zB + backT + (D - 30 - backT) / 2], material: "soft" },
    { id: "BF", name: "Back frame", size: [2 * inner, H - 30 - legH - 20, backT], pos: [0, (H - 30 + legH + 20) / 2, zB + backT / 2], material: "soft" },
    { id: "SC", name: "Seat cushion", size: [2 * inner - 10, seatTop - deckTop, D - 30 - backT - 40], pos: [0, (seatTop + deckTop) / 2, zB + backT + (D - 30 - backT) / 2 - 15], material: "soft" },
    { id: "BC", name: "Back cushion", size: [460, 330, 130], pos: [0, seatTop + 210, zB + backT + 80], rot: [-0.2, 0, 0], material: "soft" },
  );

  const legIds = legs.map(([id]) => id);
  const hookAt = (sx: number): Vec3 => [sx * inner, deckTop - 60, zB + backT + 40];
  const rodAt: Vec3[] = [-1, 1].map((sx): Vec3 => [sx * (inner - 120), legH + 20, zB + backT / 2]);
  const boltAt = (sx: number): Vec3[] => [legH + 140, H - 260].map((y): Vec3 => [sx * (inner - 40), y, zB + backT / 2]);
  const armBolts = (sx: number): CustomFix[] => [
    { kind: "washer", count: 2, len: 2, dia: 18, at: boltAt(sx), dir: [sx, 0, 0], on: "BF" },
    { kind: "bolt", name: "Hex bolt", count: 2, len: 70, dia: 8, at: boltAt(sx), dir: [sx, 0, 0], on: "BF", mate: sx < 0 ? "AL" : "AR" },
  ];

  return {
    parts,
    steps: [
      {
        title: "Screw a hook plate onto each arm",
        detail: "On the inside face, near the bottom, hook pointing up. One screw holds each.",
        fix: [-1, 1].flatMap((sx): CustomFix[] => [
          { kind: "hook", name: "Hook plate", count: 1, len: 40, dia: 30, at: [hookAt(sx)], dir: [sx, 0, 0], on: sx < 0 ? "AL" : "AR" },
          { kind: "screw", count: 1, len: 16, dia: 4, at: [[hookAt(sx)[0], hookAt(sx)[1] - 25, hookAt(sx)[2]]], dir: [sx, 0, 0], on: sx < 0 ? "AL" : "AR" },
        ]),
        tools: ["screwdriver"],
        wait: ["AL", "AR"],
        warnings: ["floor"],
      },
      {
        title: "Screw two legs into each arm",
        detail: "A big washer goes on each leg's bolt first. Turn the legs in by hand until they're tight.",
        fix: legs.map(([id, sx, z]): CustomFix => ({ kind: "washer", name: "Big washer", count: 1, len: 2, dia: 40, at: [[sx * ax, legH, z]], dir: [0, 1, 0], on: id })),
        wait: legIds,
      },
      {
        title: "Screw two threaded rods into the seat frame",
        detail: "Into the holes in its back rail, by hand, so they stand straight up.",
        add: ["SF"],
        fix: [{ kind: "stud", name: "Threaded rod", count: 2, len: 110, dia: 8, at: rodAt, dir: [0, 1, 0], on: "SF", mate: "BF" }],
      },
      {
        title: "Lower the back frame onto the rods",
        detail: "The rods go up through the holes in its bottom rail.",
        add: ["BF"],
        from: { BF: [0, 400, 0] },
      },
      {
        title: "Fasten the back frame with nuts",
        detail: "A washer and a nut on each rod, tightened with the spanner from behind.",
        fix: [
          { kind: "washer", count: 2, len: 2, dia: 18, at: rodAt.map((p): Vec3 => [p[0], p[1] + 110, p[2]]), dir: [0, -1, 0], on: "BF" },
          { kind: "nut", count: 2, len: 7, dia: 13, at: rodAt.map((p): Vec3 => [p[0], p[1] + 112, p[2]]), dir: [0, -1, 0], on: "BF" },
        ],
        tools: ["wrench"],
      },
      {
        title: "Hook on the first arm",
        detail: "Lay the seat and back on their back on a rug. Slide the arm's hook plate down into the slot in the side of the seat frame.",
        add: ["AL", "L1", "L2"],
        pose: "+z",
        warnings: ["floor"],
      },
      {
        title: "Bolt the arm on",
        detail: "Two hex bolts with washers through the back frame into the arm, turned in by hand for now.",
        fix: armBolts(-1),
        tools: ["wrench"],
      },
      { title: "Hook on the other arm", detail: "The same way, hook plate down into its slot.", add: ["AR", "L3", "L4"] },
      { title: "Bolt the other arm on", detail: "Two more bolts and washers, by hand.", fix: armBolts(1), tools: ["wrench"] },
      {
        title: "Tighten the four bolts and stand it up",
        detail: "Tighten each with the spanner until the arms sit firm against the frame, then turn the chair onto its legs.",
        tools: ["wrench"],
        pose: "+y",
      },
      { title: "Put in the seat cushion", detail: "Slide it in from the front, onto the seat.", add: ["SC"], from: { SC: [0, 100, 500] } },
      { title: "Add the back cushion", detail: "Lean it against the back.", add: ["BC"] },
    ],
  };
}

const family: Family = {
  names: ["FLINSHULT"],
  recipe(s) {
    if (/^flinshult-armchair/.test(s.slug ?? "")) return armchair(s);
    return null;
  },
};
export default family;
