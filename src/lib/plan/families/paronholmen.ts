import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, Vec3 } from "../../types";

/**
 * PÄRONHOLMEN bench with backrest, read from its manual. The two sides come made (legs, armrest and slats in one
 * frame). The bench is built lying on its end: the left side flat on a rug, the backrest, the seat and the low rail
 * plug into it on their wooden pegs, and the right side goes on top over all five pegs. Four long bolts go through
 * that side into barrel nuts, then two people turn the bench over and the other side takes the other four.
 */

const BOLT = { name: "Long bolt", len: 110, dia: 6 };
const NUT = { name: "Barrel nut", len: 14, dia: 10 };

/** A part drawn as pieces given in finished-product mm, centred on their own bounding box. */
function part(id: string, name: string, abs: PartPiece[]): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...abs.map((p) => p.pos[k] - p.size[k] / 2)));
  const hi = [0, 1, 2].map((k) => Math.max(...abs.map((p) => p.pos[k] + p.size[k] / 2)));
  const c = lo.map((v, k) => (v + hi[k]) / 2) as Vec3;
  return {
    id,
    name,
    size: lo.map((v, k) => hi[k] - v) as Vec3,
    pos: c,
    material: "wood",
    pieces: abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 })),
  };
}

const box = (lo: Vec3, hi: Vec3): PartPiece => ({ shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] });

function bench(): CustomParams {
  // IKEA: 111 wide, 70 deep, 83 high; the seat 100 wide and 50 deep, 42 high
  const W = 1110, H = 830, D = 700, inner = 500, T = 50;
  const armY = 640, seatY = 420, lowY = 180;
  const zB = -D / 2 + 40, zF = D / 2 - 40; // back and front legs
  const side = (sx: number): PartPiece[] => {
    const x0 = sx < 0 ? -W / 2 : inner, x1 = sx < 0 ? -inner : W / 2;
    const slats = Array.from({ length: 6 }, (_, i) => zB + 70 + (i * (zF - zB - 140)) / 5);
    return [
      box([x0, 0, zB - T / 2], [x1, H, zB + T / 2]),
      box([x0, 0, zF - T / 2], [x1, armY - 30, zF + T / 2]),
      box([x0 - 5 * sx, armY - 30, zB], [x1 + 5 * sx, armY + 30, D / 2]),
      box([x0, seatY - 70, zB], [x1, seatY - 20, zF]),
      box([x0, lowY - 25, zB], [x1, lowY + 25, zF]),
      ...slats.map((z) => box([x0 + 10, seatY - 20, z - 20], [x1 - 10, armY - 30, z + 20])),
    ];
  };
  const yb0 = 470, yb1 = H - 40, zBack = zB;
  const backSlats = [-1, 1].flatMap((sx) => Array.from({ length: 7 }, (_, i) => sx * (60 + i * 62)));
  const seatSlats = Array.from({ length: 19 }, (_, i) => -inner + 30 + (i * (2 * inner - 60)) / 18);
  const zs0 = zB + T / 2, zs1 = zF + T / 2;
  const parts: CustomPart[] = [
    part("SL", "Side frame", side(-1)),
    part("SR", "Side frame", side(1)),
    part("BACK", "Backrest", [
      box([-inner, yb0, zBack - 15], [inner, yb0 + 60, zBack + 15]),
      box([-inner, yb1 - 90, zBack - 15], [inner, yb1, zBack + 15]),
      box([-30, yb0, zBack - 20], [30, H, zBack + 20]),
      ...backSlats.map((x) => box([x - 20, yb0 + 60, zBack - 8], [x + 20, yb1 - 90, zBack + 8])),
    ]),
    part("SEAT", "Seat", [
      box([-inner, seatY - 60, zs0], [inner, seatY - 20, zs0 + 50]),
      box([-inner, seatY - 60, zs1 - 50], [inner, seatY - 20, zs1]),
      ...seatSlats.map((x) => box([x - 20, seatY - 20, zs0], [x + 20, seatY, zs1])),
    ]),
    part("RAIL", "Low rail", [box([-inner, lowY - 25, -25], [inner, lowY + 25, 25])]),
  ];

  // per side: one bolt into the backrest, two into the seat's rails, one into the low rail, each on a barrel nut
  const pts = (sx: number): Vec3[] => [
    [sx * W / 2, yb0 + 30, zBack],
    [sx * W / 2, seatY - 40, zs0 + 25],
    [sx * W / 2, seatY - 40, zs1 - 25],
    [sx * W / 2, lowY, 0],
  ];
  const bolts = (sx: number, on: string): CustomFix => ({ kind: "bolt", count: 4, at: pts(sx), dir: [-sx, 0, 0], on, ...BOLT });
  const nuts = (sx: number): CustomFix => ({
    kind: "nut",
    count: 4,
    at: pts(sx).map((p) => [sx * (inner - 40), p[1] + 25, p[2]] as Vec3),
    dir: [0, -1, 0],
    ...NUT,
  });
  const steps: CustomStep[] = [
    {
      title: "Plug the backrest into a side",
      detail: "Lay the left side on a rug, inside up. Stand the backrest on it, its two pegs in the holes.",
      add: ["SL", "BACK"],
      pose: "+x",
      warnings: ["floor"],
      from: { BACK: [300, 0, 0] },
    },
    {
      title: "Plug the seat in",
      detail: "Its two pegs go into the side. Turn it so the small holes in its rails face out where you can reach them.",
      add: ["SEAT"],
      from: { SEAT: [300, 0, 0] },
    },
    { title: "Plug the low rail in", detail: "One peg into the side's bottom rail, the small hole facing out.", add: ["RAIL"], from: { RAIL: [300, 0, 0] } },
    { title: "Lay the other side on top", detail: "Guide all five pegs into its holes and press it down.", add: ["SR"], from: { SR: [300, 0, 0] } },
    {
      title: "Bolt the top side on",
      detail: "Drop a barrel nut into each small hole, slot out, then turn a long bolt through the side into each one. Tighten all four.",
      fix: [nuts(1), bolts(1, "SR")],
      tools: ["allen", "flathead"],
    },
    { title: "Turn the bench over", detail: "Lift it together and lay it on the bolted side.", pose: "-x", people: 2, warnings: ["two"] },
    {
      title: "Bolt the other side on",
      detail: "Four more barrel nuts and bolts, the same way. Turn the nut with a flat screwdriver if the bolt won't catch.",
      fix: [nuts(-1), bolts(-1, "SL")],
      tools: ["allen", "flathead"],
    },
    { title: "Stand it on its legs", detail: "Check it stands level, then tighten every bolt once more.", pose: "+y", people: 2, warnings: ["two"] },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["PÄRONHOLMEN", "PARONHOLMEN"],
  recipe(s) {
    if (!/bench/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return bench();
  },
};
export default family;
