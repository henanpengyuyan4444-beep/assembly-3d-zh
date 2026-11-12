import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, Vec3 } from "../../types";

/*
 * SKÅPAFORS chair, read from IKEA's manual. Everything is done with the back lying on the floor: four threaded rods
 * are turned by hand into the rail at the foot of the back, and four dowels tapped in beside them. The seat is
 * lowered onto them and held with a washer and nut on each rod. The two front legs push into the seat's front
 * corners and each takes one hex bolt with a washer through the corner block, then the chair is tipped up onto
 * its legs. A sheet of felt pads comes in the box for the feet.
 * IKEA's sizes: 58 wide, 68 deep, 83 high, seat 45 high, 58 x 47.
 */

const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

/** A box from a to b (centre line, in y and z), w wide and t thick, as a piece of a part centred at c. */
function beam(x: number, a: [number, number], b: [number, number], w: number, t: number, c: Vec3, material?: PartMaterial): PartPiece {
  const [ya, za] = a, [yb, zb] = b;
  return {
    shape: "box",
    size: [w, Math.hypot(yb - ya, zb - za), t],
    pos: [x - c[0], (ya + yb) / 2 - c[1], (za + zb) / 2 - c[2]],
    rot: [Math.atan2(zb - za, yb - ya), 0, 0],
    ...(material ? { material } : {}),
  };
}

function chair(): CustomParams {
  const W = 580, H = 830, SY0 = 330, SY1 = 450, SZ0 = -200, SZ1 = 340;
  const LX = 250, RAIL: [number, number] = [-230, SZ0]; // the back's seat rail, its front face against the seat
  const kc: Vec3 = [0, H / 2, -270];
  const back: CustomPart = {
    id: "K",
    name: "Back with back legs",
    size: [W, H, 140],
    pos: kc,
    material: "soft",
    pieces: [
      beam(0, [SY0, -262], [H, -285], W, 110, kc),
      ...[-1, 1].map((g) => beam(g * (LX + 5), [0, -320], [SY0 + 30, -230], 40, 40, kc, "wood")),
      { shape: "box", size: [2 * LX + 50, 70, RAIL[1] - RAIL[0]], pos: [0, 365 - kc[1], (RAIL[0] + RAIL[1]) / 2 - kc[2]], material: "wood" },
    ],
  };
  const parts: CustomPart[] = [
    back,
    { id: "S", name: "Seat", size: [W, SY1 - SY0, SZ1 - SZ0], pos: [0, (SY0 + SY1) / 2, (SZ0 + SZ1) / 2], material: "soft" },
    ...[-1, 1].map((g, i): CustomPart => ({ id: `F${i + 1}`, name: "Front leg", size: [40, SY0, 40], pos: [g * LX, SY0 / 2, SZ1 - 50], material: "wood" })),
  ];
  const rods: Vec3[] = [-1, 1].flatMap((g): Vec3[] => [[g * 80, 365, SZ0], [g * 200, 365, SZ0]]);
  const dowels: Vec3[] = [-1, 1].flatMap((g): Vec3[] => [[g * 140, 365, SZ0], [g * 230, 365, SZ0]]);
  const nuts: Vec3[] = rods.map(([x, y]): Vec3 => [x, y, SZ0 + 40]);
  const corner = (g: number): Vec3 => [g * (LX - 70), SY0 + 40, SZ1 - 120];
  const cornerDir = (g: number): Vec3 => [g * Math.SQRT1_2, 0, Math.SQRT1_2];
  return {
    parts,
    steps: [
      {
        title: "Turn the threaded rods into the back",
        detail: "Lay the back on a rug, face up. Turn all four rods into the rail at its foot by hand, as far as they go.",
        add: ["K"],
        fix: [fix("stud", rods, [0, 0, -1], { on: "K", len: 70, dia: 8, name: "Threaded rod" })],
        pose: "+z",
        warnings: ["floor"],
      },
      { title: "Tap in the dowels", detail: "One in each hole beside the rods.", fix: [fix("dowel", dowels, [0, 0, -1], { on: "K", mate: "S" })], tools: ["hammer"] },
      {
        title: "Lower the seat onto the rods",
        detail: "Underside up, so the rods and dowels go into the holes in the seat's back rail.",
        add: ["S"],
        from: { S: [0, 0, 400] },
      },
      {
        title: "Fix the seat with washers and nuts",
        detail: "A washer and a nut on each rod, tightened with the box spanner.",
        fix: [fix("washer", nuts, [0, 0, -1], { on: "S" }), fix("nut", nuts, [0, 0, -1], { on: "S" })],
        tools: ["wrench"],
      },
      {
        title: "Push the front legs into the corners",
        detail: "Each leg goes into a front corner of the seat frame. Its top must hook over the frame's edge as shown, not stop below it.",
        add: ["F1", "F2"],
        from: { F1: [0, -250, 0], F2: [0, -250, 0] },
      },
      {
        title: "Bolt each front leg",
        detail: "A washer on a hex bolt, through the corner block into the leg. Tighten with the box spanner.",
        fix: [-1, 1].flatMap((g, i) => [
          fix("washer", [corner(g)], cornerDir(g), { on: "S", mate: `F${i + 1}` }),
          fix("bolt", [corner(g)], cornerDir(g), { on: "S", mate: `F${i + 1}`, len: 60, dia: 8, name: "Hex bolt" }),
        ]),
        tools: ["wrench"],
      },
      {
        title: "Tip the chair onto its legs",
        detail: "Roll it forward onto its feet and stick a felt pad under each leg.",
        pose: "+y",
        fix: [fix("glide", [[-LX, 0, SZ1 - 50], [LX, 0, SZ1 - 50], [-(LX + 5), 0, -320], [LX + 5, 0, -320]], [0, 1, 0])],
      },
    ],
  };
}

const family: Family = {
  names: ["SKÅPAFORS", "SKAPAFORS"],
  recipe(s) {
    if (/chair/i.test(`${s.variant} ${s.slug ?? ""}`)) return chair();
    return null;
  },
};
export default family;
