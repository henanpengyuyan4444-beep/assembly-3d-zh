import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * HATTHOLMEN outdoor table, read from its manual. The slatted top comes with its apron and corner brackets already on:
 * it lies upside down on a rug, and each of the four splayed round legs is fixed in its corner with a plate and two
 * bolts with washers, tightened with the spanner in the box. That is the whole manual.
 * IKEA's sizes: 75 x 75 cm, 74 high.
 */

const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, d: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...v);
  const n = v.map((x) => x / L);
  return { shape: "cyl", size: [d, L, d], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(n[2], n[1]), 0, -Math.asin(n[0])] };
}

function recipe(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 750, H = Math.round(s.size.h * 10) || 740;
  const T = 25, yU = H - T; // underside of the slats
  const ah = 70, at = 20, ai = 70; // apron height, thickness, set in from the edge
  const xa = W / 2 - ai; // apron outer face
  const n = 14, gap = 6, sw = (W - (n - 1) * gap) / n;
  const tc: Vec3 = [0, H - T / 2 - ah / 2, 0];
  const pieces: PartPiece[] = [
    ...Array.from({ length: n }, (_, k): PartPiece => ({ shape: "box", size: [sw, T, W], pos: [-W / 2 + sw / 2 + k * (sw + gap), H - T / 2 - tc[1], 0] })),
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [2 * xa, ah, at], pos: [0, yU - ah / 2 - tc[1], sz * (xa - at / 2)] })),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [at, ah, 2 * xa - 2 * at], pos: [sx * (xa - at / 2), yU - ah / 2 - tc[1], 0] })),
  ];
  const parts: CustomPart[] = [{ id: "T", name: "Table top", size: [W, T + ah, W], pos: tc, material: "wood", pieces }];
  const LD = 45;
  const top = xa - at - LD / 2 - 5, foot = W / 2 - 40;
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz] as const));
  corners.forEach(([sx, sz], i) => {
    const a: Vec3 = [sx * top, yU, sz * top], b: Vec3 = [sx * foot, 0, sz * foot];
    const c: Vec3 = [(a[0] + b[0]) / 2, yU / 2, (a[2] + b[2]) / 2];
    parts.push({ id: `L${i}`, name: "Leg", size: [foot - top + LD, yU, foot - top + LD], pos: c, material: "wood", pieces: [tube(a, b, LD, c)] });
  });
  // a plate on each corner bracket, two bolts through it into the leg
  const xb = top - LD / 2 - 12;
  const out = (sx: number, sz: number): Vec3 => [sx * Math.SQRT1_2, 0, sz * Math.SQRT1_2];
  const boltYs = [yU - 20, yU - 50];
  const fixes: CustomFix[] = corners.flatMap(([sx, sz], i) => [
    fix("plate", [[sx * xb, yU - 35, sz * xb]], out(sx, sz), { on: "T", mate: `L${i}`, len: 3, dia: 50 }),
    fix("bolt", boltYs.map((y): Vec3 => [sx * xb, y, sz * xb]), out(sx, sz), { on: "T", mate: `L${i}`, len: 60, dia: 8, name: "Hex bolt" }),
  ]);
  fixes.push(fix("washer", corners.flatMap(([sx, sz]) => boltYs.map((y): Vec3 => [sx * (xb - 4), y, sz * (xb - 4)])), [0, -1, 0], { on: "T", dia: 16 }));
  return {
    parts,
    steps: [
      {
        title: "Bolt a leg into each corner",
        detail: "Lay the top upside down on a rug. Hold each leg in its corner, put the plate on the bracket and turn in two bolts with washers. Tighten them with the spanner.",
        add: ["T", ...corners.map((_, i) => `L${i}`)],
        from: Object.fromEntries(corners.map((_, i) => [`L${i}`, [0, -300, 0] as Vec3])),
        fix: fixes,
        tools: ["wrench"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Turn the table over", detail: "Lift it by the top, not the legs. Tighten the bolts again after two weeks outdoors.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["HATTHOLMEN"],
  recipe(s) {
    if (!/table/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
