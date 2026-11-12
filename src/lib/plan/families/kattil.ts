import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/*
 * KÄTTIL dining chair, read from IKEA's manual. On a table with a rug on it, the upholstered back frame is stood on
 * the back of the seat and held with two long bolts, each with a spring washer and a washer, put in by hand and then
 * tightened. The chair is turned over so the back hangs over the table edge, the four legs slide onto the fittings
 * in the corners of the seat and two more long bolts go in at the front. Then the cover is pulled over the back,
 * down over the seat, tucked in at the back and fastened under the seat. IKEA's sizes: 46 x 52 cm, 89 high,
 * seat 46 high.
 */

const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function chair(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 460, D = Math.round(s.size.d * 10) || 520, H = Math.round(s.size.h * 10) || 890;
  const SY = 460, S0 = 380; // seat top, seat underside
  const zb = -D / 2, bt = 80; // back of the chair, thickness of the backrest
  const zs = zb + bt; // where the seat starts
  const L = 40; // legs
  const lx = W / 2 - 25, zF = D / 2 - 25, zB = zs + 25;
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", material: "soft", size: [W, SY - S0, D - bt], pos: [0, (SY + S0) / 2, (zs + D / 2) / 2] },
    { id: "B", name: "Backrest", material: "soft", size: [W, H - S0, bt], pos: [0, (H + S0) / 2, zb + bt / 2] },
    ...([[-1, zB], [1, zB], [-1, zF], [1, zF]] as const).map(([g, z], i): CustomPart => ({
      id: `L${i}`,
      name: "Leg",
      material: "wood",
      size: [L, S0, L],
      pos: [g * lx, S0 / 2, z],
    })),
  ];
  const backBolts = [-1, 1].map((g): Vec3 => [g * (W / 2 - 60), S0 + 30, zs]);
  const frontBolts = [-1, 1].map((g): Vec3 => [g * (lx - 40), S0 + 10, zF - 40]);
  const washers = (pts: Vec3[], dir: Vec3 | ((p: Vec3) => Vec3), on: string) =>
    [
      fix("washer", pts, [0, 0, 1], { len: 2, dia: 18, on }),
      fix("washer", pts, [0, 0, 1], { name: "Spring washer", len: 2, dia: 10, on }),
    ].map((f) => ({ ...f, dir: typeof dir === "function" ? dir(pts[0]) : dir }));
  return {
    parts,
    steps: [
      {
        title: "Stand the backrest on the back of the seat",
        detail: "Work on a table with a rug on it. Put a spring washer and a washer on each long bolt and turn them in by hand through the bottom of the backrest.",
        add: ["S", "B"],
        fix: [fix("bolt", backBolts, [0, 0, 1], { len: 90, dia: 6, on: "B", mate: "S" }), ...washers(backBolts, [0, 0, 1], "B")],
        warnings: ["floor"],
      },
      { title: "Tighten the two bolts", detail: "With the Allen key, until the backrest sits firmly against the seat.", tools: ["allen"], kind: "bolts" },
      {
        title: "Slide the legs into the corners",
        detail: "Turn the chair over so the seat lies on the table and the backrest hangs over its edge. Each leg slides onto the fitting in its corner.",
        add: ["L0", "L1", "L2", "L3"],
        pose: "-y",
        from: { L0: [0, -300, 0], L1: [0, -300, 0], L2: [0, -300, 0], L3: [0, -300, 0] },
      },
      {
        title: "Bolt the front legs",
        detail: "A long bolt with a spring washer and a washer through each front corner block into the leg. Tighten them firmly.",
        fix: [-1, 1].flatMap((g, i) => {
          const p = [frontBolts[i]];
          const dir: Vec3 = [g * 0.7, 0, 0.7];
          return [fix("bolt", p, dir, { len: 90, dia: 6, mate: `L${i + 2}` }), ...washers(p, dir, "S")];
        }),
        tools: ["allen"],
      },
      {
        title: "Pull the cover over the backrest",
        detail: "Stand the chair up. Inside out is easiest: start at the top of the backrest and work it down.",
        pose: "+y",
      },
      { title: "Pull the cover down over the seat", detail: "Ease it over the front corners, then tuck the flaps in between the backrest and the seat." },
      {
        title: "Fasten the cover under the seat",
        detail: "Turn the chair over again and fix the edges of the cover under the seat all round. Smooth it out once it is standing.",
        pose: "-y",
      },
      { title: "Stand the chair up", detail: "Check after a week or two that the bolts are still tight.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["KÄTTIL", "KATTIL"],
  recipe(s) {
    if (!/chair/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return chair(s);
  },
};
export default family;
