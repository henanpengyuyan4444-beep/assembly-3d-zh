import type { Family } from "./family";
import type { CustomParams, CustomPart, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LÖVBACKEN, read from the side table's manual. One step: the teardrop top lies upside down on a rug with its three
 * leg plates already fitted, and each leg's threaded end is turned into a plate by hand. No tools, no loose fittings.
 */

function tube(a: Vec3, b: Vec3, dia: number, material?: PartMaterial): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))], material };
}

/** A part drawn from pieces placed in product space, boxed by the points it reaches (plus pad). */
function part(id: string, name: string, abs: PartPiece[], pts: Vec3[], pad: number, material: PartMaterial): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])) - pad) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])) + pad) as Vec3;
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

function table(s: ProductSpec): CustomParams {
  // IKEA: 77 long, 39 wide, 51 high
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const T = 18, yU = H - T;
  // the teardrop: a wide round end and a narrow one joined by straight sides (bands along the two tangents)
  const r1 = D / 2, r3 = D * 0.19, x1 = -W / 2 + r1, x3 = W / 2 - r3;
  const yT = H - T / 2;
  const beta = Math.asin((r1 - r3) / (x3 - x1));
  const band = r3 * 1.6;
  const side = (sz: number): PartPiece => {
    const n: [number, number] = [Math.sin(beta), sz * Math.cos(beta)];
    const p1: [number, number] = [x1 + r1 * n[0], r1 * n[1]], p3: [number, number] = [x3 + r3 * n[0], r3 * n[1]];
    const len = Math.hypot(p3[0] - p1[0], p3[1] - p1[1]);
    return { shape: "box", size: [len, T, band], pos: [(p1[0] + p3[0]) / 2 - (n[0] * band) / 2, yT, (p1[1] + p3[1]) / 2 - (n[1] * band) / 2], rot: [0, sz * beta, 0] };
  };
  const top: PartPiece[] = [
    { shape: "cyl", size: [2 * r1, T, 2 * r1], pos: [x1, yT, 0] },
    { shape: "cyl", size: [2 * r3, T, 2 * r3], pos: [x3, yT, 0] },
    { shape: "box", size: [x3 - x1, T, 2 * r3], pos: [(x1 + x3) / 2, yT, 0] },
    side(1),
    side(-1),
  ];
  const zA = D * 0.27;
  const tops: Vec3[] = [[x1 - 10, yU - 6, -zA], [x1 - 10, yU - 6, zA], [x3 - 25, yU - 6, 0]];
  const feet: Vec3[] = [[x1 - 60, 0, -zA - 45], [x1 - 60, 0, zA + 45], [x3 + 25, 0, 0]];
  // the leg plates come fitted to the top
  for (const t of tops) top.push({ shape: "box", size: [70, 6, 70], pos: [t[0], yU - 3, t[2]], material: "metal" });
  const parts: CustomPart[] = [part("TOP", "Table top", top, [[-W / 2, yU - 6, -D / 2], [W / 2, H, D / 2]], 0, "wood")];
  tops.forEach((t, i) => {
    const f = feet[i];
    const d: Vec3 = [t[0] - f[0], t[1] - f[1], t[2] - f[2]];
    const L = Math.hypot(...d);
    const cap: Vec3 = [f[0] + (d[0] * 70) / L, f[1] + (d[1] * 70) / L, f[2] + (d[2] * 70) / L];
    parts.push(part(`L${i + 1}`, "Leg", [tube(cap, t, 32), tube(f, cap, 26, "metal")], [f, t], 16, "wood"));
  });
  return {
    parts,
    steps: [
      { title: "Lay the top upside down on a rug", detail: "The three leg plates are already screwed on underneath.", add: ["TOP"], pose: "-y", warnings: ["floor"] },
      { title: "Screw in the three legs", detail: "Turn each leg clockwise into its plate by hand until it stops. No tools needed.", add: ["L1", "L2", "L3"] },
      { title: "Turn the table over", detail: "Stand it on its feet and check it doesn't rock.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["LÖVBACKEN", "LOVBACKEN"],
  recipe: (s) => (/side table/i.test(s.variant) || /side-table/.test(s.slug ?? "") ? table(s) : null),
};
export default family;
