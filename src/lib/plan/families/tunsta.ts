import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * TUNSTA, read from the side table's manual. The whole box is built upside down on a rug: the table top lies face
 * down with its dowels already in, the long front and back panels stand on them, and two small blocks with dowels
 * stand in the middle. The shelf gets the four leg plates first, then goes on top and is held with six long Allen
 * screws, the legs screw into the plates by hand and the table is turned over.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 70 x 50, 37 high, 20 free under the shelf
  const W = (s.size.w || 70) * 10, D = (s.size.d || 50) * 10, H = (s.size.h || 37) * 10;
  const t = 20, legH = 200, pt = 16;
  const yTop = H - t / 2, yBot = legH + t / 2;
  const sideH = H - legH - 2 * t, ySide = legH + t + sideH / 2;
  const zP = D / 2 - 6 - pt / 2;
  const zM = zP - pt / 2 - 15;
  const legX = W / 2 - 55, legZ = D / 2 - 55;
  const corners: [number, number][] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): [number, number] => [sx, sz]));
  const parts: CustomPart[] = [
    { id: "T", name: "Table top", size: [W, t, D], pos: [0, yTop, 0] },
    ...[-1, 1].map((sz, i): CustomPart => ({ id: `P${i}`, name: "Long panel", size: [W - 10, sideH, pt], pos: [0, ySide, sz * zP] })),
    ...[-1, 1].map((sz, i): CustomPart => ({ id: `M${i}`, name: "Support block", size: [100, sideH, 30], pos: [0, ySide, sz * zM] })),
    { id: "B", name: "Shelf", size: [W, t, D], pos: [0, yBot, 0] },
    ...corners.map(([sx, sz], i): CustomPart => ({ id: `L${i}`, name: "Leg", size: [32, legH - 2, 32], pos: [sx * legX, (legH - 2) / 2, sz * legZ], shape: "cyl", material: "metal" })),
  ];
  const yLow = legH + t; // the long panels' and blocks' lower edges, where they meet the shelf
  const dowelX = W / 2 - 30, screwX = W / 2 - 130;
  const steps = [
    {
      title: "Stand the long panels on the table top",
      detail: "Lay the top face down on a rug. Its dowels are already in: press both panels onto them and push them flush with the ends.",
      add: ["T", "P0", "P1"],
      pose: "-y" as const,
      warnings: ["floor" as const],
    },
    {
      title: "Tap dowels into the long panels",
      detail: "Two in the upper edge of each panel, one at each end.",
      fix: [0, 1].map((i) => fx("dowel", [-dowelX, dowelX].map((x): Vec3 => [x, yLow, (i ? 1 : -1) * zP]), [0, 1, 0], `P${i}`, { mate: "B", len: 30, dia: 8 })),
    },
    {
      title: "Put dowels in the support blocks",
      detail: "Two in one end of each block and one in the other.",
      fix: [0, 1].flatMap((i) => {
        const z = (i ? 1 : -1) * zM;
        return [
          fx("dowel", [-25, 25].map((x): Vec3 => [x, H - t, z]), [0, -1, 0], `M${i}`, { mate: "T", len: 30, dia: 8 }),
          fx("dowel", [[0, yLow, z]], [0, 1, 0], `M${i}`, { mate: "B", len: 30, dia: 8 }),
        ];
      }),
      wait: ["M0", "M1"],
    },
    { title: "Stand the blocks in the middle", detail: "Two dowels down into the top, one against each long panel.", add: ["M0", "M1"] },
    {
      title: "Screw the leg plates to the shelf",
      detail: "One near each corner of the shelf's underside, four screws each, with the plate's raised centre facing out.",
      fix: [
        ...corners.map(([sx, sz]) => fx("plate", [[sx * legX, legH, sz * legZ]], [0, 1, 0], "B")),
        fx(
          "screw",
          corners.flatMap(([sx, sz]) => corners.map(([ax, az]): Vec3 => [sx * legX + ax * 25, legH, sz * legZ + az * 25])),
          [0, 1, 0],
          "B",
          { len: 14, dia: 4 },
        ),
      ],
      tools: ["screwdriver" as const],
      wait: ["B"],
    },
    {
      title: "Screw the shelf onto the box",
      detail: "Plates up. Two long screws into each long panel and one into each block.",
      add: ["B"],
      fix: [
        ...[0, 1].map((i) => fx("screw", [-screwX, screwX].map((x): Vec3 => [x, legH, (i ? 1 : -1) * zP]), [0, 1, 0], "B", { mate: `P${i}`, len: 50, dia: 5 })),
        ...[0, 1].map((i) => fx("screw", [[0, legH, (i ? 1 : -1) * zM]], [0, 1, 0], "B", { mate: `M${i}`, len: 50, dia: 5 })),
      ],
      tools: ["allen" as const],
    },
    { title: "Screw the legs into the plates", detail: "Turn each one clockwise by hand until it stops.", add: corners.map((_, i) => `L${i}`) },
    { title: "Turn the table over", detail: "Lift it by the box, not the legs, and stand it on its feet.", pose: "+y" as const },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["TUNSTA"],
  recipe(s) {
    if (!/side table/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
