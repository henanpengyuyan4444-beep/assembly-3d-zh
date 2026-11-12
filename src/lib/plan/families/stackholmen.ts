import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * STACKHOLMEN, read from the outdoor stool's manual. Two dowels go into each of the four legs, then the two leg frames
 * are made: a rail pushed onto one leg and screwed, the second leg turned onto the rail's other end and screwed. The
 * seat lies upside down on a table while the frames are pushed into it, then a barrel nut and a long Allen bolt go into
 * each leg top through the seat rails. Glides are tapped onto the feet before it is turned over.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 48 long, 35 wide, 43 high
  const W = Math.round(s.size.w * 10) || 480, H = Math.round(s.size.h * 10) || 430;
  const D = Math.round(Math.min(s.size.d, s.size.w) * 10) || 350;
  const rt = 30, rh = 60, yR = H - rh; // seat rails along the front and back
  const lt = 40, yTop = H - 10; // legs, square, up into the seat's corners
  const a = 0.06; // the legs lean out to the sides
  const xTop = W / 2 - 55, zL = D / 2 - rt - lt / 2;
  const xAt = (sx: number, y: number) => sx * (xTop - (yTop - y) * Math.tan(a));
  const yS = 170, sh = 50; // the rail between front and back leg
  const parts: CustomPart[] = [];
  const legs: string[][] = [[], []];
  [-1, 1].forEach((sx, i) =>
    [-1, 1].forEach((sz, j) => {
      const id = `L${i * 2 + j + 1}`;
      legs[i].push(id);
      parts.push({ id, name: "Leg", size: [lt, yTop / Math.cos(a), lt], pos: [xAt(sx, yTop / 2), yTop / 2, sz * zL], rot: [0, 0, -sx * a], material: "wood" });
    }),
  );
  [-1, 1].forEach((sx, i) => parts.push({ id: `R${i + 1}`, name: "Rail", size: [lt - 10, sh, 2 * zL - lt], pos: [xAt(sx, yS), yS, 0], material: "wood" }));
  parts.push({
    id: "S",
    name: "Seat",
    size: [W, rh, D],
    pos: [0, yR + rh / 2, 0],
    material: "wood",
    pieces: [
      ...[-1, 1].map((sz) => ({ shape: "box" as const, size: [W, rh, rt] as Vec3, pos: [0, 0, sz * (D / 2 - rt / 2)] as Vec3 })),
      ...[-1, 1].map((sx) => ({ shape: "box" as const, size: [40, rh - 10, D - 2 * rt] as Vec3, pos: [sx * (W / 2 - 20), 5, 0] as Vec3 })),
      { shape: "box", size: [W - 80, 8, D - 2 * rt], pos: [0, rh / 2 - 14, 0], material: "soft" },
    ],
  });

  const dowels = (ids: string[]): CustomFix[] =>
    ids.map((id) => {
      const p = parts.find((q) => q.id === id)!;
      const sx = Math.sign(p.pos[0]), sz = Math.sign(p.pos[2]);
      return { kind: "dowel", count: 2, at: [yS - 12, yS + 12].map((y): Vec3 => [xAt(sx, yS), y, sz * (zL - lt / 2)]), dir: [0, 0, -sz], on: id, mate: `R${sx < 0 ? 1 : 2}` };
    });
  const screws = (j: 0 | 1): CustomFix[] =>
    [-1, 1].map((sx, i) => ({
      kind: "screw",
      name: "Allen screw",
      count: 1,
      len: 70,
      dia: 6,
      at: [[xAt(sx, yS), yS, (j ? 1 : -1) * (zL + lt / 2)]],
      dir: [0, 0, j ? -1 : 1],
      on: legs[i][j],
      mate: `R${i + 1}`,
    }));
  const yB = H - rh / 2 - 5;
  const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return {
    parts,
    steps: [
      {
        title: "Tap two dowels into each leg",
        detail: "Into the pair of holes halfway down the inside of each leg. Lay the legs flat on a rug.",
        fix: dowels(["L1", "L2", "L3", "L4"]),
        tools: ["hammer"],
        wait: ["L1", "L2", "L3", "L4"],
        warnings: ["floor"],
      },
      {
        title: "Push a rail onto two of the legs",
        detail: "Stand each rail on the dowels of one leg, one rail for each leg frame.",
        add: ["L1", "R1", "L3", "R2"],
      },
      { title: "Screw the rails to the legs", detail: "One screw through each leg into its rail. Turn them with the Allen key, not a drill.", fix: screws(0), tools: ["allen"] },
      { title: "Turn the other legs onto the rails", detail: "Press each one down onto the dowels at the free end of a rail.", add: ["L2", "L4"] },
      { title: "Screw them on", detail: "One screw in each leg. Now you have two leg frames.", fix: screws(1), tools: ["allen"] },
      {
        title: "Push the leg frames into the seat",
        detail: "Lay the seat upside down on a table and press the leg tops into its corners. Check both frames stand straight.",
        add: ["S"],
        pose: "-y",
      },
      {
        title: "Bolt the seat to the legs",
        detail: "Drop a barrel nut into the hole in each leg top, slot facing the bolt. Then turn a long bolt in through the seat rail with the Allen key.",
        fix: corners.flatMap(([sx, sz], k): CustomFix[] => [
          { kind: "nut", name: "Barrel nut", count: 1, dia: 10, at: [[xAt(sx, yB) - (sx * lt) / 2, yB, sz * zL]], dir: [sx, 0, 0], on: `L${k + 1}` },
          { kind: "bolt", count: 1, len: 70, dia: 6, at: [[xAt(sx, yB), yB, (sz * D) / 2]], dir: [0, 0, -sz], on: "S", mate: `L${k + 1}` },
        ]),
        tools: ["allen"],
        pose: "+z",
      },
      {
        title: "Tap a glide onto each foot",
        detail: "Turn it upside down again and knock them in with a hammer.",
        fix: corners.map(([sx, sz], k): CustomFix => ({ kind: "glide", name: "Glide", count: 1, at: [[xAt(sx, 0), 0, sz * zL]], dir: [0, 1, 0], on: `L${k + 1}`, len: 4, dia: 22 })),
        tools: ["hammer"],
        pose: "-y",
      },
      { title: "Turn it over", detail: "Stand it on its feet and check it doesn't rock.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["STACKHOLMEN"], recipe };
export default family;
