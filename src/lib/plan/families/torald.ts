import type { Family } from "./family";
import type { CustomFix, CustomParams, ProductSpec, Vec3 } from "../../types";

/**
 * TORALD, read from the desk's manual. Dowels go into the ends of the top and the shelf, then the desk is built
 * lying on its front: the top and shelf are pushed onto one side and held by five Allen screws (three into the top,
 * two into the shelf), the other side the same way. Two steel braces at the open back run from each side up to the
 * middle of the shelf, four feet clip onto the bottoms of the sides, and the desk is tipped up onto them.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 65 x 40, 75 high
  const W = s.size.w * 10 || 650, D = s.size.d * 10 || 400, H = s.size.h * 10 || 750;
  const t = 16, glide = 6;
  const xi = W / 2 - t; // inner face of a side
  const yTop = H - t / 2, yShelf = H - t - 100 - t / 2;
  const zr = -D / 2 + 20; // the braces sit at the back
  const lowY = yShelf - 190, highX = 30, shelfUnder = yShelf - t / 2;
  const dx = xi - highX, dy = shelfUnder - lowY, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const side = (id: string, sx: number) => ({ id, name: "Side panel", size: [t, H - glide, D] as Vec3, pos: [sx * (W / 2 - t / 2), glide + (H - glide) / 2, 0] as Vec3, material: "board" as const });
  const brace = (id: string, sx: number) => ({
    id,
    name: "Brace",
    size: [len, 3, 22] as Vec3,
    pos: [sx * (xi + highX) / 2, (lowY + shelfUnder) / 2, zr] as Vec3,
    rot: [0, 0, sx * -ang] as Vec3,
    material: "metal" as const,
  });
  const ends = (y: number, zs: number[], sx: number): Vec3[] => zs.map((z): Vec3 => [sx * xi, y, z]);
  const dowels = (id: string, y: number): CustomFix[] =>
    [-1, 1].map((sx) => ({ kind: "dowel", count: 2, at: ends(y, [-D / 2 + 70, D / 2 - 70], sx), dir: [sx, 0, 0], on: id, mate: sx < 0 ? "L" : "R" }));
  const screws = (sx: number, id: string): CustomFix[] => [
    { kind: "bolt", name: "Allen screw", count: 3, len: 50, dia: 7, at: [-D / 2 + 40, 0, D / 2 - 40].map((z): Vec3 => [sx * (W / 2), yTop, z]), dir: [-sx, 0, 0], on: id, mate: "T" },
    { kind: "bolt", name: "Allen screw", count: 2, len: 50, dia: 7, at: [-D / 2 + 50, D / 2 - 50].map((z): Vec3 => [sx * (W / 2), yShelf, z]), dir: [-sx, 0, 0], on: id, mate: "S" },
  ];
  return {
    parts: [
      { id: "T", name: "Desk top", size: [W - 2 * t, t, D], pos: [0, yTop, 0], material: "board" },
      { id: "S", name: "Shelf", size: [W - 2 * t, t, D], pos: [0, yShelf, 0], material: "board" },
      side("L", -1),
      side("R", 1),
      brace("B1", -1),
      brace("B2", 1),
    ],
    steps: [
      {
        title: "Tap the dowels into the top and the shelf",
        detail: "Lay both on a rug. Two dowels go into each end, tapped in until they stop.",
        add: ["T", "S"],
        fix: [...dowels("T", yTop), ...dowels("S", yShelf)],
        tools: ["hammer"],
        warnings: ["floor"],
      },
      {
        title: "Push the top and the shelf onto a side",
        detail: "Lay the side flat with its holes up, and stand the top and the shelf on their front edges so the dowels go into its holes.",
        add: ["L"],
        pose: "-z",
      },
      { title: "Screw the side on", detail: "Three screws into the top and two into the shelf. Turn them in with the Allen key.", fix: screws(-1, "L") },
      {
        title: "Fit the other side the same way",
        detail: "Push it onto the dowels and screw it on with five more screws.",
        add: ["R"],
        fix: screws(1, "R"),
      },
      {
        title: "Screw the braces to the sides",
        detail: "They go at the open back. Two screws hold the low end of each brace to a side.",
        add: ["B1", "B2"],
        fix: [-1, 1].map((sx): CustomFix => ({
          kind: "screw",
          count: 2,
          len: 15,
          dia: 5,
          at: [lowY - 12, lowY + 12].map((y): Vec3 => [sx * xi, y, zr]),
          dir: [sx, 0, 0],
          on: sx < 0 ? "B1" : "B2",
          mate: sx < 0 ? "L" : "R",
        })),
      },
      {
        title: "Screw the braces to the shelf",
        detail: "One screw through the top end of each brace into the underside of the shelf.",
        fix: [{ kind: "screw", count: 2, len: 20, dia: 4, at: [-1, 1].map((sx): Vec3 => [sx * (highX + 8), shelfUnder, zr]), dir: [0, 1, 0], on: "S" }],
      },
      {
        title: "Press the feet onto the sides",
        detail: "One at each end of both sides' bottom edges, pegs into the holes.",
        fix: [{ kind: "glide", name: "Foot", count: 4, at: [-1, 1].flatMap((sx) => [-D / 2 + 40, D / 2 - 40].map((z): Vec3 => [sx * (W / 2 - t / 2), glide, z])), dir: [0, 1, 0] }],
      },
      { title: "Stand the desk up", detail: "Tip it up onto its feet; don't drag it on them.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["TORALD"], recipe };
export default family;
