import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, Vec3 } from "../../types";

/**
 * RAGGBERG bench with shoe storage, read from its manual. The two solid pine sides take cam bolts and plastic
 * feet; the slatted shelf gets its two end rails, and the bench is built lying on its left side: shelf, front
 * rail and top go onto it (dowels and cams), then the right side on top and its cams. A fitting screwed under the
 * top at the back holds it to the wall.
 */

const W = 600, H = 450, D = 350, T = 18;
const XI = W / 2 - T;

const panel = (id: string, name: string, lo: Vec3, hi: Vec3, material: CustomPart["material"] = "wood"): CustomPart => ({
  id,
  name,
  size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
  pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
  material,
});
const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });
const side = (sx: number) => (sx < 0 ? "SL" : "SR");

function bench(): CustomParams {
  const yR0 = 180, yR1 = 210; // shelf end rails
  const yTop = H - 23;
  const slatZ = Array.from({ length: 7 }, (_, i) => -135 + i * 45);
  const slats: PartPiece[] = slatZ.map((z) => ({ shape: "box", size: [2 * (XI - 20), 15, 30], pos: [0, 0, z] }));
  const parts: CustomPart[] = [
    panel("SL", "Side panel", [-W / 2, 0, -D / 2], [-XI, H, D / 2]),
    panel("SR", "Side panel", [XI, 0, -D / 2], [W / 2, H, D / 2]),
    panel("RL", "Shelf rail", [-XI, yR0, -150], [-XI + 20, yR1, 150]),
    panel("RR", "Shelf rail", [XI - 20, yR0, -150], [XI, yR1, 150]),
    { id: "SH", name: "Slatted shelf", size: [2 * (XI - 20), 15, 300], pos: [0, 197, 0], pieces: slats, material: "wood" },
    panel("AP", "Front rail", [-XI, 140, D / 2 - T], [XI, 210, D / 2]),
    panel("TOP", "Top", [-XI, yTop, -D / 2], [XI, yTop + T, D / 2]),
    panel("FIX", "Wall fitting", [-150, yTop - 20, -D / 2], [150, yTop, -D / 2 + 25], "metal"),
  ];
  // per side: two cam bolts for the shelf rail, one for the front rail
  const camPts = (sx: number): [string, Vec3][] => [
    [sx < 0 ? "RL" : "RR", [sx * XI, 195, -90]],
    [sx < 0 ? "RL" : "RR", [sx * XI, 195, 90]],
    ["AP", [sx * XI, 175, D / 2 - T / 2]],
  ];
  const cams = (sx: number, ids: string[]) =>
    camPts(sx)
      .filter(([id]) => ids.includes(id))
      .map(([id, p]) => fx("cam", [id === "AP" ? [sx * (XI - 30), p[1], D / 2 - T] : [sx * (XI - 10), yR0, p[2]]], id === "AP" ? [0, 0, 1] : [0, 1, 0], id));
  const steps: CustomStep[] = [
    {
      title: "Screw the cam bolts into the sides",
      detail: "Lay both sides on a rug, inside up. Three bolts into each, by hand until they stop.",
      add: ["SL"],
      fix: [-1, 1].map((sx) => fx("camScrew", camPts(sx).map(([, p]) => p), [sx, 0, 0], side(sx))),
      wait: ["SR"],
      from: { SR: [0, 0, -520] },
      tools: ["screwdriver"],
      pose: "+x",
      warnings: ["floor"],
    },
    {
      title: "Press the feet into the sides",
      detail: "Two plastic feet into the bottom edge of each side, pegs first.",
      fix: [-1, 1].map((sx) => fx("glide", [-150, 150].map((z): Vec3 => [sx * (W / 2 - T / 2), 0, z]), [0, 1, 0], side(sx), { name: "Plastic foot", len: 8, dia: 20 })),
    },
    {
      title: "Tap the dowels into the rails",
      detail: "Two into the outside of each shelf rail and one into each end of the front rail.",
      fix: [
        ...[-1, 1].map((sx) => fx("dowel", [-130, 130].map((z): Vec3 => [sx * XI, 195, z]), [sx, 0, 0], sx < 0 ? "RL" : "RR", { len: 30, dia: 8, mate: side(sx) })),
        ...[-1, 1].map((sx) => fx("dowel", [[sx * XI, 195, D / 2 - T / 2]], [sx, 0, 0], "AP", { len: 30, dia: 8, mate: side(sx) })),
      ],
      wait: ["RL", "RR", "AP"],
      from: { RL: [0, 0, 520], RR: [0, 0, 520], AP: [0, 0, 520] },
      tools: ["hammer"],
    },
    {
      title: "Push the rails onto the slats",
      detail: "One on each end of the slatted shelf, dowels facing out. Every slat's pin goes into its hole.",
      wait: ["SH"],
      from: { SH: [0, 0, 520] },
    },
    { title: "Stand the shelf in the left side", detail: "Its rail's dowels and the cam bolts go into the holes.", add: ["SH", "RL", "RR"] },
    { title: "Lock the shelf with two cams", detail: "Arrow towards the bolt, turned clockwise.", fix: cams(-1, ["RL"]), tools: ["screwdriver"] },
    { title: "Stand the front rail in", detail: "Along the front edge, under the shelf's front slat.", add: ["AP"] },
    { title: "Lock it with a cam", detail: "Turned clockwise until it's tight.", fix: cams(-1, ["AP"]), tools: ["screwdriver"] },
    {
      title: "Tap the dowels into the top",
      detail: "Two into each end.",
      fix: [-1, 1].map((sx) => fx("dowel", [-110, 110].map((z): Vec3 => [sx * XI, yTop + T / 2, z]), [sx, 0, 0], "TOP", { len: 30, dia: 8, mate: side(sx) })),
      wait: ["TOP"],
      tools: ["hammer"],
    },
    { title: "Stand the top in the side", detail: "Its dowels into the holes along the side's top edge.", add: ["TOP"] },
    { title: "Lay the right side on top", detail: "Over all the dowels and cam bolts at once, pressed down evenly.", add: ["SR"] },
    { title: "Lock the right side with three cams", detail: "Each one turned clockwise until it grips.", fix: cams(1, ["RR", "AP"]), tools: ["screwdriver"] },
    {
      title: "Screw the wall fitting under the top",
      detail: "Stand the bench up. Two long screws through the fitting into the underside of the top, at the back.",
      add: ["FIX"],
      fix: [fx("screw", [-110, 110].map((x): Vec3 => [x, yTop - 20, -D / 2 + 12]), [0, 1, 0], "FIX", { len: 30, dia: 6, mate: "TOP" })],
      tools: ["allen"],
      pose: "+y",
    },
    {
      title: "Fix it to the wall",
      detail: "Push the bench back against the wall and screw the fitting to it. Wall screws aren't included: pick ones made for your wall.",
      fix: [
        fx("plug", [[-110, yTop - 10, -D / 2], [110, yTop - 10, -D / 2]], [0, 0, -1], "FIX", { len: 35, dia: 8 }),
        fx("screw", [[-110, yTop - 10, -D / 2], [110, yTop - 10, -D / 2]], [0, 0, -1], "FIX", { len: 50, dia: 5 }),
      ],
      tools: ["drill", "screwdriver"],
      wall: true,
      warnings: ["wall"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["RAGGBERG"],
  recipe(s) {
    if (!/bench/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return bench();
  },
};
export default family;
