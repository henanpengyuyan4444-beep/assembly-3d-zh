import type { Family } from "./family";
import type { CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * ÖRTRÄSK coffee table (ash veneer top, solid ash legs), read from its manual (one manual for both sizes).
 * No tools: with the top upside down on a rug, the four round legs screw in by hand on their own threaded pins,
 * then a glide screws into the foot of each leg, and the table is turned over.
 * IKEA's sizes: 75 x 48 x 30 and 110 x 68 x 35 cm. We draw the rounded top as a long oval.
 */

function recipe(s: ProductSpec) {
  const slug = s.slug ?? "";
  if (!/^ortrask-coffee-table/.test(slug)) return null;
  const big = /110-x-68/.test(slug);
  const W = big ? 1100 : 750, D = big ? 680 : 480, H = big ? 350 : 300;
  const T = 22, LD = big ? 60 : 50;
  const pieces: PartPiece[] = [
    { shape: "box", size: [W - D, T, D], pos: [0, 0, 0] },
    { shape: "halfcyl", size: [D, T, D / 2], pos: [(W - D) / 2 + D / 4, 0, 0], rot: [0, Math.PI / 2, 0] },
    { shape: "halfcyl", size: [D, T, D / 2], pos: [-(W - D) / 2 - D / 4, 0, 0], rot: [0, -Math.PI / 2, 0] },
  ];
  const parts: CustomPart[] = [{ id: "TOP", name: "Table top", size: [W, T, D], pos: [0, H - T / 2, 0], material: "wood", pieces }];
  const legAt: [number, number][] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): [number, number] => [sx * W * 0.33, sz * D * 0.28]));
  legAt.forEach(([x, z], i) => parts.push({ id: `L${i}`, name: "Leg", size: [LD, H - T, LD], pos: [x, (H - T) / 2, z], shape: "cyl", material: "wood" }));
  const steps: CustomStep[] = [
    {
      title: "Screw the legs into the top",
      detail: "Lay the top face down on a rug. Each leg turns in by hand on its own threaded pin; stop when it sits tight against the top.",
      add: ["TOP", "L0", "L1", "L2", "L3"],
      pose: "-y",
      warnings: ["floor"],
      from: Object.fromEntries([0, 1, 2, 3].map((i) => [`L${i}`, [0, -250, 0] as Vec3])),
    },
    {
      title: "Screw a glide into each leg",
      detail: "Into the hole in the end of the leg, by hand.",
      fix: [{ kind: "glide", name: "Glide", count: 4, len: 8, dia: LD - 6, at: legAt.map(([x, z]): Vec3 => [x, 0, z]), dir: [0, 1, 0] }],
    },
    { title: "Turn the table over", detail: "Lift it by the top, not the legs. Don't sit or stand on it.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["ÖRTRÄSK", "ORTRASK"],
  recipe,
};
export default family;
