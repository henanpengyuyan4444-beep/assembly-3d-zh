import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * HADDARP step stool, read from its manual. Everything is done upside down on a rug: the four splayed steel legs push
 * into the corners of the top step and a short bolt goes into each, the lower step slides down over the legs and a
 * long countersunk bolt goes through each leg into it, then the long bolts and the short ones are tightened with the
 * Allen key that comes with it. IKEA's sizes: 43.8 x 43.8 cm, 47 high.
 */

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, d: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...v);
  const n = v.map((x) => x / L);
  return { shape: "cyl", size: [d, L, d], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(n[2], n[1]), 0, -Math.asin(n[0])] };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dirs: Vec3[], o: Partial<CustomFix>): CustomFix[] =>
  at.map((p, i) => ({ kind, count: 1, at: [p], dir: dirs[i], ...o }));

function recipe(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 438, H = Math.round(s.size.h * 10) || 470;
  const LD = 25, T = 30;
  const yTop = H - T; // underside of the top step
  const xt = 135, xf = W / 2 - LD / 2; // leg centres at the top step and on the floor
  const yLow = 200, lt = 24; // lower step, its top
  const xAt = (y: number) => xt + ((xf - xt) * (yTop - y)) / yTop;
  const xl = xAt(yLow - lt / 2);
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz] as const));
  const parts: CustomPart[] = [
    { id: "T", name: "Top step", size: [xt * 2 + 50, T, xt * 2 + 50], pos: [0, H - T / 2, 0], material: "board" },
  ];
  corners.forEach(([sx, sz], i) => {
    const a: Vec3 = [sx * xt, H - 10, sz * xt], b: Vec3 = [sx * xf, 0, sz * xf];
    const c: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    parts.push({ id: `L${i}`, name: "Leg", size: [Math.abs(a[0] - b[0]) + LD, a[1], Math.abs(a[2] - b[2]) + LD], pos: c, material: "metal", pieces: [tube(a, b, LD, c)] });
  });
  const sw = 2 * (xl - LD / 2) - 4;
  parts.push({ id: "S", name: "Lower step", size: [sw, lt, sw], pos: [0, yLow - lt / 2, 0], material: "board" });

  const inward = (sx: number, sz: number): Vec3 => [-sx * Math.SQRT1_2, 0, -sz * Math.SQRT1_2];
  const dirs = corners.map(([sx, sz]) => inward(sx, sz));
  const xb = xAt(H - 45) + LD / 2;
  const topBolts = fix("bolt", corners.map(([sx, sz]): Vec3 => [sx * xb, H - 45, sz * xb]), dirs, { len: 12, dia: 6, on: "T", name: "Short bolt" });
  topBolts.forEach((f, i) => (f.mate = `L${i}`));
  const xs = xl + LD / 2;
  const lowBolts = fix("bolt", corners.map(([sx, sz]): Vec3 => [sx * xs, yLow - lt / 2, sz * xs]), dirs, { len: 40, dia: 6, name: "Long bolt" });
  lowBolts.forEach((f, i) => ((f.on = `L${i}`), (f.mate = "S")));
  const legs = corners.map((_, i) => `L${i}`);
  return {
    parts,
    steps: [
      {
        title: "Push the legs into the top step",
        detail: "Lay the top step upside down on a rug. Each leg goes into a corner, then put a short bolt into each corner by hand.",
        add: ["T", ...legs],
        from: Object.fromEntries(legs.map((id) => [id, [0, -280, 0] as Vec3])),
        fix: topBolts,
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Slide the lower step over the legs",
        detail: "Its corners meet the holes in the legs. Push a long bolt through each leg into it by hand.",
        add: ["S"],
        from: { S: [0, -420, 0] },
        fix: lowBolts,
      },
      {
        title: "Tighten the long bolts",
        detail: "With the Allen key, until each head sits flush in the leg.",
        tools: ["allen"],
        kind: "bolts",
      },
      {
        title: "Tighten the short bolts",
        detail: "The same at the top step, until the heads sit tight against the legs.",
        tools: ["allen"],
        kind: "bolts",
      },
      { title: "Turn it over", detail: "Stand it on its feet and check it doesn't rock before you step on it.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["HADDARP"],
  recipe(s) {
    if (!/step-stool|step stool/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
