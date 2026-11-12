import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomParams, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";
import { boxOf } from "../custom";

/**
 * GRÖTÅN, read from IKEA's manuals. The round table is built upside down on a rug: two hanging bolts are turned
 * part way into the pine top, the two black steel leg frames are hooked onto them and bolted together where they
 * meet, the frame is set square and tightened, then each leg's plate and the rails are screwed to the top. The
 * chair's back frame is joined to the front frame with two connector bolts, the frame is bolted onto the upturned
 * seat with five bolts, and the wooden backrest is bolted to the back posts.
 */

type Kind = CustomFix["kind"];
interface Pc {
  size: Vec3;
  pos: Vec3;
  rot?: Vec3;
  shape?: "box" | "cyl";
  material?: PartMaterial;
}

const at = (kind: Kind, pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: { len?: number; dia?: number; name?: string } = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Pc => ({ size: [x1 - x0, y1 - y0, z1 - z0], pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });

/** A round tube from a to b. */
function rod(a: Vec3, b: Vec3, dia: number): Pc {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const u = d.map((v) => v / len) as Vec3;
  if (u[1] < 0) u.forEach((_, i) => (u[i] = -u[i]));
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] };
}

function group(id: string, name: string, pcs: Pc[], material: PartMaterial = "metal"): CustomPart {
  const bs = pcs.map((p) => boxOf(p));
  const lo = [0, 1, 2].map((k) => Math.min(...bs.map((b) => b.min[k])));
  const hi = [0, 1, 2].map((k) => Math.max(...bs.map((b) => b.max[k])));
  const pos = [0, 1, 2].map((k) => Math.round(((lo[k] + hi[k]) / 2) * 10) / 10) as Vec3;
  const size = [0, 1, 2].map((k) => Math.round((hi[k] - lo[k]) * 10) / 10) as Vec3;
  const pieces: PartPiece[] = pcs.map((p) => ({ shape: p.shape ?? "box", size: p.size, pos: [p.pos[0] - pos[0], p.pos[1] - pos[1], p.pos[2] - pos[2]], rot: p.rot, material: p.material ?? material }));
  return { id, name, size, pos, pieces, material };
}

function table(s: ProductSpec): CustomParams {
  const Dia = s.size.w * 10, H = s.size.h * 10;
  const T = 25, R = 22; // top thickness, rail size
  const yt = H - T; // underside of the top
  const a = Math.round(((Dia / 2) * 0.86) / Math.SQRT2); // the legs stand on the corners of a square under the top
  const LEG = 30;
  // each frame: two legs along one side, joined by a rail, with half rails running round the corners to meet the other frame
  const frame = (id: string, sz: 1 | -1) => {
    const z = sz * a;
    const pcs: Pc[] = [
      { shape: "cyl", size: [LEG, yt, LEG], pos: [-a, yt / 2, z] },
      { shape: "cyl", size: [LEG, yt, LEG], pos: [a, yt / 2, z] },
      box(-a, a, yt - R, yt, z - R / 2, z + R / 2),
      ...[-1, 1].map((sx) => box(sx * a - R / 2, sx * a + R / 2, yt - R, yt, Math.min(0, z), Math.max(0, z))),
      // the braces from each leg up to the rails
      ...[-1, 1].flatMap((sx) => [rod([sx * a, yt - 130, z], [sx * (a - 110), yt - R, z], 14), rod([sx * a, yt - 130, z], [sx * a, yt - R, z - sz * 110], 14)]),
      ...[-1, 1].map((sx) => box(sx * a - 30, sx * a + 30, yt - 3, yt, z - 30, z + 30)),
    ];
    return group(id, "Leg frame", pcs);
  };
  const parts: CustomPart[] = [
    { id: "T", name: "Table top", size: [Dia, T, Dia], pos: [0, H - T / 2, 0], shape: "cyl", material: "wood" },
    frame("FB", -1),
    frame("FF", 1),
  ];
  const hang = [-1, 1].map((sz) => [0, yt, sz * a] as Vec3);
  const joins = [-1, 1].flatMap((sx) => [-25, 25].map((dz) => [sx * a + (sx * R) / 2, yt - R / 2, dz] as Vec3));
  const plates = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [[sx * a + sx * 20, sz * a - sz * 20], [sx * a - sx * 20, sz * a + sz * 20], [sx * a + sx * 20, sz * a + sz * 20]].map(([x, z]) => [x, yt - 3, z] as Vec3)));
  // ten screws up through the rails: three along each long rail, two along each pair of half rails
  const railScrews: Vec3[] = [
    ...[-1, 1].flatMap((sz) => [-a * 0.55, a * 0.55, 0].map((x, i) => [i === 2 ? x + 80 : x, yt - R, sz * a] as Vec3)),
    ...[-1, 1].flatMap((sx) => [-a * 0.5, a * 0.5].map((z) => [sx * a, yt - R, z] as Vec3)),
  ];
  const steps: CustomStep[] = [
    {
      title: "Turn two hanging bolts into the top",
      detail: "Lay the top upside down on a rug. Turn the two long bolts in part way: the head stays a few millimetres proud.",
      add: ["T"],
      fix: [at("bolt", hang, [0, 1, 0], "T", undefined, { len: 18, dia: 6, name: "Hanging bolt" })],
      pose: "-y",
      tools: ["allen"],
      warnings: ["floor"],
    },
    { title: "Hook the two leg frames onto the bolts", detail: "Slide each frame's slot over its bolt head, so the frames meet at the corners.", add: ["FB", "FF"] },
    {
      title: "Bolt the frames together",
      detail: "Two bolts at each place the frames meet. Leave them loose for now.",
      fix: [at("bolt", joins, [0, 0, 1], "FB", "FF", { len: 12, dia: 6 })],
      tools: ["allen"],
    },
    { title: "Set the frame square and tighten the hanging bolts", detail: "Check that the frame sits square on the top, then tighten the two hanging bolts.", tools: ["allen"], check: "square" },
    { title: "Tighten the four frame bolts", detail: "Firmly, now the frame is square.", tools: ["allen"] },
    {
      title: "Screw each leg's plate to the top",
      detail: "Three screws through the plate at the top of every leg.",
      fix: [at("screw", plates, [0, 1, 0], undefined, "T", { len: 16, dia: 4 })],
      tools: ["screwdriver"],
    },
    {
      title: "Screw the rails to the top",
      detail: "The ten long screws, up through the holes in the rails.",
      fix: [at("screw", railScrews, [0, 1, 0], undefined, "T", { len: 40, dia: 4 })],
      tools: ["screwdriver"],
    },
    { title: "Turn the table over together", detail: "Lift it by the top, not by one leg.", pose: "+y", people: 2, warnings: ["two"] },
  ];
  return { parts, steps };
}

function chair(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const ST = (s.seat?.seatH ?? 46) * 10;
  const ys = ST - 60; // top of the frame, under the seat
  const L = 22, xl = W / 2 - 25, zf = D / 2 - 30, zb = -D / 2 + 30, yl = 170;
  const back = group("BF", "Back frame", [
    ...[-1, 1].map((sx) => ({ shape: "cyl" as const, size: [L, H - 10, L] as Vec3, pos: [sx * xl, (H - 10) / 2, zb] as Vec3 })),
    box(-xl, xl, ys - 20, ys, zb - 10, zb + 10),
    ...[-1, 1].map((sx) => rod([sx * xl, yl, (zf + zb) / 2], [sx * xl, ST - 120, zb], 16)),
  ]);
  const front = group("FF", "Front frame", [
    ...[-1, 1].map((sx) => ({ shape: "cyl" as const, size: [L, ys, L] as Vec3, pos: [sx * xl, ys / 2, zf] as Vec3 })),
    box(-xl, xl, ys - 20, ys, zf - 10, zf + 10),
    ...[-1, 1].map((sx) => box(sx * xl - 10, sx * xl + 10, ys - 20, ys, zb + 11, zf - 11)),
    ...[-1, 1].map((sx) => box(sx * xl - 9, sx * xl + 9, yl - 9, yl + 9, zb + 11, zf - 11)),
    ...[-1, 1].map((sx) => ({ shape: "cyl" as const, size: [30, 50, 30] as Vec3, pos: [sx * xl, yl, (zf + zb) / 2] as Vec3 })),
  ]);
  const parts: CustomPart[] = [
    back,
    front,
    { id: "S", name: "Seat", size: [W, ST - ys, D], pos: [0, (ST + ys) / 2, 0], material: "soft" },
    { id: "B", name: "Backrest", size: [W - 60, 190, 20], pos: [0, H - 95, zb + L / 2 + 10], material: "wood" },
  ];
  const seatBolts: Vec3[] = [
    ...[-1, 1].flatMap((sx) => [zb + 80, zf - 80].map((z) => [sx * xl, ys - 20, z] as Vec3)),
    [0, ys - 20, zf],
  ];
  const steps: CustomStep[] = [
    {
      title: "Join the back frame to the front frame",
      detail: "Push the side rails into the sleeves and turn a connector bolt up into each one.",
      add: ["BF", "FF"],
      fix: [at("bolt", [-1, 1].map((sx) => [sx * xl, yl - 25, (zf + zb) / 2] as Vec3), [0, 1, 0], "FF", "BF", { len: 40, dia: 8, name: "Connector bolt" })],
      tools: ["allen"],
    },
    {
      title: "Bolt the frame onto the seat",
      detail: "Lay the seat upside down on a table with a cloth under it, stand the frame on it and turn in the five bolts.",
      add: ["S"],
      fix: [at("bolt", seatBolts, [0, 1, 0], undefined, "S", { len: 40, dia: 6 })],
      pose: "-y",
      tools: ["allen"],
      warnings: ["floor"],
    },
    {
      title: "Bolt the backrest to the back posts",
      detail: "Stand the chair up. One short bolt through each post into the backrest.",
      add: ["B"],
      fix: [at("bolt", [-1, 1].map((sx) => [sx * xl, H - 95, zb - L / 2] as Vec3), [0, 0, 1], "BF", "B", { len: 12, dia: 6 })],
      pose: "+y",
      tools: ["allen"],
    },
    { title: "Tighten every bolt", detail: "Go round all nine bolts once more, until they sit flush. Not so hard that they strip.", tools: ["allen"] },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["GRÖTÅN", "GROTAN"],
  recipe(s) {
    if (/^table/i.test(s.variant)) return table(s);
    if (/^chair/i.test(s.variant)) return chair(s);
    return null;
  },
};
export default family;
