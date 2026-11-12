import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * VALTORP, read from the storage bench's manual. The padded box comes with its lid already hinged on. With it upside
 * down on a rug, the two steel leg frames (front and back: two legs, a long rail and a bracket at each leg) take two
 * bolts a bracket, eight in all. Stood up, the lid's two stays click onto their pins, and the fabric liner is laid
 * in and its edges tucked in all round.
 */

const TUBE = 22;

/** A round tube from a to b. */
function tube(a: Vec3, b: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const h = Math.hypot(d[0], d[2]);
  const [ux, uz] = h > 1e-6 ? [d[0] / h, d[2] / h] : [1, 0];
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [0, Math.atan2(-uz, ux), -Math.acos(d[1] / len)] };
}

/** One part drawn from tubes and boxes placed in the finished product (mm): its box is their extent. */
function part(id: string, name: string, runs: [Vec3, Vec3][], boxes: PartPiece[], material: CustomPart["material"]): CustomPart {
  const pts: Vec3[] = runs.flat();
  for (const bx of boxes) for (const s of [-1, 1]) pts.push([bx.pos[0] + (s * bx.size[0]) / 2, bx.pos[1] + (s * bx.size[1]) / 2, bx.pos[2] + (s * bx.size[2]) / 2]);
  const pad = runs.length ? TUBE / 2 : 0;
  const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])) - pad);
  const hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])) + pad);
  lo[1] = Math.max(0, lo[1]);
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const rel = (p: Vec3): Vec3 => [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const pieces: PartPiece[] = [...runs.map(([a, b]) => tube(rel(a), rel(b))), ...boxes.map((bx) => ({ ...bx, pos: rel(bx.pos) }))];
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, ...o });

function bench(s: { size: { w: number } }): CustomParams {
  // IKEA (103 cm): 103 wide, 46 deep, 47 high, seat 42 deep
  const W = Math.round(s.size.w * 10) || 1030, D = 420, H = 470;
  const y0 = 165, yLid = 410, T = 40; // the box's underside, the lid's underside, wall thickness
  const box = part(
    "B",
    "Bench box",
    [],
    [
      { shape: "box", size: [W, 24, D], pos: [0, y0 + 12, 0] },
      ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [W, yLid - y0, T], pos: [0, (y0 + yLid) / 2, sz * (D / 2 - T / 2)] })),
      ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [T, yLid - y0, D - 2 * T], pos: [sx * (W / 2 - T / 2), (y0 + yLid) / 2, 0] })),
    ],
    "soft",
  );
  // the lid is hinged on from the start; it's drawn coming down last so the steps inside the box can be seen
  const lid: CustomPart = { id: "LD", name: "Lid", size: [W, H - yLid, D], pos: [0, (yLid + H) / 2, 0], material: "soft" };
  const xL = W / 2 - 75, zL = D / 2 + 20, yRail = 290, yBr = y0 - 6, zIn = D / 2 - 110;
  const legFrame = (id: string, sz: number) =>
    part(
      id,
      "Leg frame",
      [
        ...[-1, 1].map((sx): [Vec3, Vec3] => [[sx * xL, 0, sz * zL], [sx * xL, yRail + TUBE / 2, sz * zL]]),
        [[-xL, yRail, sz * zL], [xL, yRail, sz * zL]],
        ...[-1, 1].map((sx): [Vec3, Vec3] => [[sx * xL, yBr, sz * zL], [sx * xL, yBr, sz * zIn]]),
      ],
      [],
      "metal",
    );
  const stays = [-1, 1].map((sx, i) => ({ id: `S${i}`, name: "Lid stay", size: [8, 190, 20] as Vec3, pos: [sx * (W / 2 - T - 10), yLid - 100, -D / 2 + T + 40] as Vec3, material: "metal" as const }));
  // the fabric liner: a bag lining the bottom and the four sides
  const lw = W - 2 * T - 4, ld = D - 2 * T - 4, ly0 = y0 + 25, ly1 = yLid - 8;
  const liner = part(
    "LN",
    "Liner",
    [],
    [
      { shape: "box", size: [lw, 10, ld], pos: [0, ly0 + 5, 0] },
      ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [lw, ly1 - ly0, 8], pos: [0, (ly0 + ly1) / 2, sz * (ld / 2 - 4)] })),
      ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [8, ly1 - ly0, ld - 16], pos: [sx * (lw / 2 - 4), (ly0 + ly1) / 2, 0] })),
    ],
    "soft",
  );
  const parts: CustomPart[] = [box, legFrame("FB", -1), legFrame("FF", 1), ...stays, liner, lid];

  const boltPts = (sz: number): Vec3[] => [-1, 1].flatMap((sx) => [sz * (zIn + 25), sz * (zL - 45)].map((z) => [sx * xL, yBr - TUBE / 2, z] as Vec3));
  return {
    parts,
    steps: [
      {
        title: "Bolt the leg frames under the box",
        detail: "Lay the bench upside down on a rug with the lid shut. Two bolts through each leg bracket, eight in all; tighten them with the Allen key.",
        add: ["B", "FB", "FF"],
        fix: [at("bolt", boltPts(-1), [0, 1, 0], "FB", { len: 30, dia: 6, mate: "B" }), at("bolt", boltPts(1), [0, 1, 0], "FF", { len: 30, dia: 6, mate: "B" })],
        tools: ["allen"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Turn the bench over and open the lid", detail: "Stand it on its legs. Lift the lid right up.", pose: "+y" },
      {
        title: "Click the lid stays onto their pins",
        detail: "Press the end of each stay over its pin on the box, then the other end over the pin on the lid, until you hear a click.",
        add: ["S0", "S1"],
      },
      { title: "Lay the liner in the box", detail: "Flat side down, pushed into the corners.", add: ["LN"], from: { LN: [0, 400, 0] } },
      { title: "Tuck the liner in along the front", detail: "Push its edge down between the padding and the box side." },
      { title: "Tuck it in along the back", detail: "Pull it straight first so it lies smooth across the bottom." },
      { title: "Tuck in the ends", detail: "Fold the liner's ends down at each end of the box so nothing stands up." },
      { title: "Close the lid", detail: "The stays hold it open while you fill the box; pull it down gently to close.", add: ["LD"], from: { LD: [0, 240, -260] } },
    ],
  };
}

const family: Family = {
  names: ["VALTORP"],
  recipe: (s) => (/bench/i.test(`${s.variant} ${s.slug ?? ""}`) ? bench(s) : null),
};
export default family;
