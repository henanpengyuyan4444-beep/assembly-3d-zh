import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * FRIDHULT, read from the sofa bed's manual. Everything is built with the sofa lying on its back: three threaded rods
 * are screwed into the back by hand, the seat unit (with the folded bed in it) is lowered onto them and held with
 * washers and nuts, turned with the box spanner that comes in the pack. Each armrest gets a hook screwed on, hooks
 * into the frame, is pushed down flush and is bolted from inside with two hex bolts and washers. Four legs screw into
 * the underside and get felt pads, the sofa is stood up and the two back cushions go on.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 126 wide, 76 deep, 61 high (73 with the back cushions), seat 37 high, bed 119 x 202
  const W = 1260, D = Math.round(s.size.d * 10) || 760, Hb = 610, Hc = 730;
  const aT = 35; // armrests
  const xi = W / 2 - aT;
  const legH = 90, yb = legH; // underside of the frame
  const seatY = 370, backT = 130;
  const zb = -D / 2 + backT; // front face of the back
  const parts: CustomPart[] = [];
  parts.push({ id: "K", name: "Back", size: [2 * xi, Hb - yb, backT], pos: [0, (yb + Hb) / 2, -D / 2 + backT / 2], material: "soft" });
  // the seat unit: a box frame with the folded bed lying in it
  const sc: Vec3 = [0, (yb + seatY) / 2, (zb + D / 2) / 2];
  const sd = D / 2 - zb;
  const seat: PartPiece[] = [
    { shape: "box", size: [2 * xi, 160, sd], pos: [0, yb + 80 - sc[1], 0], material: "soft" },
    { shape: "box", size: [2 * xi - 20, seatY - yb - 160, sd - 20], pos: [0, seatY - (seatY - yb - 160) / 2 - sc[1], 0], material: "soft" },
  ];
  parts.push({ id: "S", name: "Seat with bed", size: [2 * xi, seatY - yb, sd], pos: sc, pieces: seat, material: "soft" });
  const armH = 560;
  for (const [id, sx] of [["A1", -1], ["A2", 1]] as const) parts.push({ id, name: "Armrest", size: [aT, armH - 60, D], pos: [sx * (W / 2 - aT / 2), (60 + armH) / 2, 0], material: "soft" });
  const legX = W / 2 - 90, legZ = [-D / 2 + 70, D / 2 - 80];
  let n = 0;
  for (const z of legZ) for (const sx of [-1, 1]) parts.push({ id: `L${++n}`, name: "Leg", shape: "cyl", size: [55, legH, 55], pos: [sx * legX, legH / 2, z], material: "wood" });
  const cw = xi - 15;
  for (const [id, sx] of [["C1", -1], ["C2", 1]] as const) parts.push({ id, name: "Back cushion", size: [cw, Hc - seatY - 10, 150], pos: [(sx * (cw + 10)) / 2, (seatY + Hc) / 2 + 5, zb + 100], rot: [-0.12, 0, 0], material: "soft" });

  const rodY = yb + 80;
  const rodX = [-xi + 160, 0, xi - 160];
  const armBolts = (arm: string, sx: number): CustomFix[] => {
    const at = [-D / 2 + 200, D / 2 - 160].map((z): Vec3 => [sx * xi, yb + 60, z]);
    return [
      { kind: "bolt", count: 2, len: 40, dia: 8, name: "Hex bolt", at, dir: [sx, 0, 0], on: "S", mate: arm },
      { kind: "washer", count: 2, len: 2, dia: 16, at, dir: [sx, 0, 0], on: "S" },
    ];
  };
  const hook = (arm: string, sx: number): CustomFix[] => {
    const at: Vec3[] = [[sx * xi, Hb - 80, -D / 2 + 60]];
    return [
      { kind: "hook", count: 1, len: 60, dia: 20, at, dir: [sx, 0, 0], on: arm },
      { kind: "screw", count: 1, len: 16, dia: 5, at, dir: [sx, 0, 0], on: arm },
    ];
  };
  return {
    parts,
    steps: [
      {
        title: "Screw the threaded rods into the back",
        detail: "Lay the back on a rug, front face up. Turn all three rods in by hand until they stop.",
        add: ["K"],
        fix: [{ kind: "stud", count: 3, len: 110, dia: 10, name: "Threaded rod", at: rodX.map((x): Vec3 => [x, rodY, zb]), dir: [0, 0, -1], on: "K", mate: "S" }],
        pose: "+z",
        warnings: ["floor"],
      },
      {
        title: "Screw a hook onto each armrest",
        detail: "Lay the armrests flat, inside up. One screw holds each hook, at the top of the back edge.",
        fix: [...hook("A1", -1), ...hook("A2", 1)],
        wait: ["A1", "A2"],
        tools: ["screwdriver"],
      },
      {
        title: "Lower the seat onto the rods",
        detail: "The folded bed faces up, away from the back. Let the rods go through the holes in the frame.",
        add: ["S"],
        from: { S: [0, 0, 400] },
      },
      {
        title: "Fit a washer and nut on each rod",
        detail: "Tighten all three with the box spanner until the seat is pulled snug against the back.",
        fix: [
          { kind: "washer", count: 3, len: 2, dia: 16, at: rodX.map((x): Vec3 => [x, rodY, zb + 40]), dir: [0, 0, -1], on: "S" },
          { kind: "nut", count: 3, len: 8, dia: 10, at: rodX.map((x): Vec3 => [x, rodY, zb + 44]), dir: [0, 0, -1], on: "S" },
        ],
        tools: ["wrench"],
      },
      {
        title: "Hook the left armrest onto the frame",
        detail: "Slide its hook into the slot at the back, then let the armrest swing in against the side.",
        add: ["A1"],
        from: { A1: [-300, 0, 0] },
      },
      { title: "Push it down until it sits flush", detail: "Its top and bottom edges should line up with the frame's. If not, lift it and hook it again." },
      {
        title: "Bolt the armrest on",
        detail: "From inside the seat frame, two bolts with washers. Tighten them with the box spanner.",
        fix: armBolts("A1", -1),
        tools: ["wrench"],
      },
      { title: "Hook the right armrest onto the frame", detail: "The same way on the other side.", add: ["A2"], from: { A2: [300, 0, 0] } },
      { title: "Push it down until it sits flush", detail: "Check the edges line up with the frame before you bolt it." },
      { title: "Bolt the right armrest on", detail: "Two more bolts with washers, from inside.", fix: armBolts("A2", 1), tools: ["wrench"] },
      { title: "Screw in the four legs", detail: "One in each corner of the underside, by hand until tight.", add: ["L1", "L2", "L3", "L4"] },
      {
        title: "Stick a felt pad under each leg",
        detail: "Then tip the sofa forward onto its legs, with two people if you can.",
        fix: [{ kind: "glide", count: 4, len: 3, dia: 45, name: "Felt pad", at: legZ.flatMap((z) => [-1, 1].map((sx): Vec3 => [sx * legX, 0, z])), dir: [0, 1, 0] }],
      },
      {
        title: "Fill the back cushion covers",
        detail: "Give the cushions time to recover their shape after unpacking. Push each one into its cover, corners first, and zip it shut.",
        pose: "+y",
      },
      { title: "Put the back cushions on", detail: "Stand them on the seat, leaning against the back.", add: ["C1", "C2"] },
    ],
  };
}

const family: Family = {
  names: ["FRIDHULT"],
  recipe(s) {
    return /sofa-bed|sofa bed/i.test(`${s.slug ?? ""} ${s.variant}`) ? recipe(s) : null;
  },
};
export default family;
