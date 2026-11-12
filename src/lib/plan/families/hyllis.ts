import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * HYLLIS, read from its manuals. Galvanised steel: four angle posts and pressed steel shelves with folded rims,
 * joined with small self-tapping screws, two at each corner of each shelf (one through each flange of the post).
 * Foot caps go on the posts first. It is built lying on its back: the shelves stand between the two back posts
 * and are screwed through their side flanges, the front posts go on top (both flanges), then it is turned over
 * for the screws through the back flanges. Stood up, every screw is tightened and the top is fixed to the wall.
 * The tall unit has four shelves (32 screws), the low one three (24).
 */

const POST = 35; // angle leg
const T = 2;
const RIM = 30;
const SCREW = { len: 12, dia: 4 };

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const n = H > 1000 ? 4 : 3;
  const bottom = H > 1000 ? 70 + RIM : 100 + RIM;
  const shelfTop = (i: number) => bottom + ((H - bottom) * i) / (n - 1);
  const parts: CustomPart[] = [];
  const corners: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const pid = (sx: number, sz: number) => `P${sz < 0 ? "B" : "F"}${sx < 0 ? "L" : "R"}`;
  for (const [sx, sz] of corners) {
    // the part's box is the angle's square; its two flanges lie on the outside faces
    const pieces: PartPiece[] = [
      { shape: "box", size: [T, H, POST], pos: [(sx * (POST - T)) / 2, 0, 0] },
      { shape: "box", size: [POST, H, T], pos: [0, 0, (sz * (POST - T)) / 2] },
    ];
    parts.push({ id: pid(sx, sz), name: "Post", size: [POST, H, POST], pos: [sx * (W / 2 - POST / 2), H / 2, sz * (D / 2 - POST / 2)], material: "metal", pieces });
  }
  const sw = W - 2 * T, sd = D - 2 * T;
  const tray: PartPiece[] = [
    { shape: "box", size: [sw, 1.5, sd], pos: [0, RIM / 2 - 0.75, 0] },
    { shape: "box", size: [sw, RIM, 1.5], pos: [0, 0, sd / 2 - 0.75] },
    { shape: "box", size: [sw, RIM, 1.5], pos: [0, 0, -sd / 2 + 0.75] },
    { shape: "box", size: [1.5, RIM, sd], pos: [sw / 2 - 0.75, 0, 0] },
    { shape: "box", size: [1.5, RIM, sd], pos: [-sw / 2 + 0.75, 0, 0] },
  ];
  const shelves: string[] = [];
  for (let i = 0; i < n; i++) {
    shelves.push(`S${i}`);
    parts.push({ id: `S${i}`, name: "Shelf", size: [sw, RIM, sd], pos: [0, shelfTop(i) - RIM / 2, 0], material: "metal", pieces: tray });
  }
  const ys = shelves.map((_, i) => shelfTop(i) - RIM / 2);
  // one screw through a post's side flange (into the shelf's side rim), one through its front or back flange
  const side = (sx: number, sz: number): CustomFix => ({
    kind: "screw",
    count: n,
    ...SCREW,
    at: ys.map((y) => [sx * (W / 2), y, sz * (D / 2 - POST / 2)] as Vec3),
    dir: [-sx, 0, 0],
    on: pid(sx, sz),
  });
  const face = (sx: number, sz: number): CustomFix => ({
    kind: "screw",
    count: n,
    ...SCREW,
    at: ys.map((y) => [sx * (W / 2 - POST / 2), y, sz * (D / 2)] as Vec3),
    dir: [0, 0, -sz],
    on: pid(sx, sz),
  });
  const caps = (ids: [number, number][]): CustomFix => ({
    kind: "cap",
    name: "Foot cap",
    count: ids.length,
    len: 12,
    dia: 38,
    at: ids.map(([sx, sz]) => [sx * (W / 2 - POST / 2), 0, sz * (D / 2 - POST / 2)] as Vec3),
    dir: [0, 1, 0],
  });
  const steps: CustomStep[] = [
    {
      title: "Lay the two back posts down and fit their foot caps",
      detail: "On a rug, flanges facing in, as far apart as the shelves are wide. Push a cap onto the bottom end of each post.",
      add: ["PBL", "PBR"],
      fix: [caps([[-1, -1], [1, -1]])],
      pose: "+z",
      warnings: ["floor"],
    },
    {
      title: "Screw the shelves between the back posts",
      detail: `Stand the ${n} shelves on their back edge, rims facing the same way. One screw through each post's side flange into each shelf, loose for now.`,
      add: shelves,
      fix: [side(-1, -1), side(1, -1)],
      tools: ["screwdriver"],
    },
    {
      title: "Screw on the front posts",
      detail: "Put a foot cap on each, then lay them over the front corners. Two screws at every corner: one from the top, one through the side.",
      add: ["PFL", "PFR"],
      fix: [caps([[-1, 1], [1, 1]]), face(-1, 1), face(1, 1), side(-1, 1), side(1, 1)],
      tools: ["screwdriver"],
    },
    {
      title: "Turn it over and screw through the back posts",
      detail: "Now it lies on its front. One screw through each back post's back flange into every shelf.",
      fix: [face(-1, -1), face(1, -1)],
      tools: ["screwdriver"],
      pose: "-z",
    },
    {
      title: "Stand it up and tighten every screw",
      detail: `All ${8 * n} of them, now that it stands square on its feet.`,
      tools: ["screwdriver"],
      pose: "+y",
      check: "square",
    },
    {
      title: "Fix it to the wall",
      detail: "One screw through each back post near the top. Wall screws and plugs aren't included: pick ones made for your wall.",
      fix: [
        { kind: "plug", count: 2, at: [-1, 1].map((sx) => [sx * (W / 2 - POST / 2), H - 60, -D / 2 - 30] as Vec3), dir: [0, 0, -1] },
        { kind: "screw", count: 2, len: 50, dia: 5, at: [-1, 1].map((sx) => [sx * (W / 2 - POST / 2), H - 60, -D / 2 + T] as Vec3), dir: [0, 0, -1] },
      ],
      tools: ["drill", "screwdriver", "pencil"],
      wall: true,
      warnings: ["wall", "tip"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["HYLLIS"],
  recipe(s) {
    if (s.size.w < 40 || s.size.h < 50) return null;
    return recipe(s);
  },
};
export default family;
