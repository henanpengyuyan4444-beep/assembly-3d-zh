import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * GULLVALLA 2- and 3-seat sofa, read from IKEA's manual (one manual for both).
 * No tools: the two armrests are separated and laid on their sides, their cover flaps fixed with the hook-and-loop
 * strips, two legs and two threaded studs screwed into each by hand. The seat frame is laid on its back and each
 * armrest goes onto it, held by a washer and wing nut on each stud. Stood up, a stud goes into each armrest, the
 * backrest frame is lowered onto them and held by two more wing nuts. Two people pull the seat cover on, the top
 * roll is fixed with the last two studs and wing nuts, all eight nuts are tightened, the back cover is closed and
 * the two back cushions are filled and set on.
 * IKEA's sizes: 142 (2-seat) or 182 (3-seat) wide, 83 deep, 78 high with the cushions (backrest 70), seat 42 cm
 * high and 48 deep, 15 cm under it.
 */

/** One part drawn as boxes given in finished-product mm. */
function boxes(id: string, name: string, list: [Vec3, Vec3, PartMaterial?][], material: PartMaterial, extra?: boolean): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...list.map((b) => b[0][k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...list.map((b) => b[1][k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  const pieces: PartPiece[] = list.map(([a, b, m]) => ({
    shape: "box",
    size: [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    pos: [(a[0] + b[0]) / 2 - pos[0], (a[1] + b[1]) / 2 - pos[1], (a[2] + b[2]) / 2 - pos[2]],
    ...(m ? { material: m } : {}),
  }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos, material, pieces, ...(extra ? { extra } : {}) };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function sofa(s: ProductSpec): CustomParams {
  const three = /3-seat/i.test(`${s.variant} ${s.slug ?? ""}`) || s.size.w > 160;
  const W = three ? 1820 : 1420, D = 830, AW = 110, LEG = 150;
  const X = W / 2, xi = X - AW, Z = D / 2;
  const SF = 330, SEAT = 420, BACK = 700, TOP = 780, ARM = 600;
  const bz0 = -Z, bz1 = -Z + 110; // the backrest frame
  // the armrest sweeps up towards the back
  const arm = (id: string, g: number) => {
    const x0 = g < 0 ? -X : xi, x1 = g < 0 ? -xi : X;
    return boxes(id, "Armrest", [
      [[x0, LEG, -Z + 260], [x1, ARM - 60, Z]],
      [[x0, ARM - 60, -Z + 260], [x1, ARM, Z - 40]],
      [[x0, LEG, -Z], [x1, BACK - 40, -Z + 260]],
    ], "soft");
  };
  const legAt = (g: number, h: number): Vec3 => [g * (X - AW / 2), LEG / 2, h * (Z - 70)];
  const parts: CustomPart[] = [
    boxes("F", "Seat frame", [[[-xi, LEG + 10, -Z], [xi, SF, Z]]], "board"),
    arm("A0", -1),
    arm("A1", 1),
  ];
  let li = 0;
  for (const g of [-1, 1]) for (const h of [-1, 1]) parts.push({ id: `L${li++}`, name: "Leg", shape: "cyl", material: "wood", size: [50, LEG, 50], pos: legAt(g, h) });
  parts.push(
    boxes("B", "Backrest frame", [[[-xi, SF, bz0], [xi, BACK - 60, bz1]]], "board"),
    boxes("C", "Seat cover", [[[-xi, SF, bz1], [-1, SEAT, Z + 4]], [[1, SF, bz1], [xi, SEAT, Z + 4]], [[-xi, LEG + 10, Z], [xi, SF, Z + 4]]], "soft"),
    boxes("T", "Top roll", [[[-xi, BACK - 60, bz0], [xi, BACK, bz1]]], "soft"),
    boxes("V", "Back cover", [[[-xi, LEG + 10, bz0 - 4], [xi, BACK, bz0]]], "soft"),
  );
  const cw = (2 * xi) / 2;
  [0, 1].forEach((i) => parts.push(boxes(`K${i}`, "Back cushion", [[[-xi + i * cw + 5, SEAT, bz1], [-xi + (i + 1) * cw - 5, TOP, bz1 + 170]]], "soft")));

  const studs = (y: number, zs: number[]) => [-1, 1].map((g) => fix("stud", zs.map((z): Vec3 => [g * xi, y, z]), [g, 0, 0], { len: 70, dia: 8, on: g < 0 ? "A0" : "A1" }));
  const nuts = (y: number, zs: number[]) => [
    ...[-1, 1].map((g) => fix("washer", zs.map((z): Vec3 => [g * (xi - 60), y, z]), [g, 0, 0], { len: 2, dia: 24 })),
    ...[-1, 1].map((g) => fix("nut", zs.map((z): Vec3 => [g * (xi - 60), y, z]), [g, 0, 0], { name: "Wing nut", len: 14, dia: 30 })),
  ];
  const seatZ = [-Z + 200, Z - 150];
  const backY = (SF + BACK) / 2;
  const steps: CustomStep[] = [
    {
      title: "Unpack the armrests and fix their flaps",
      detail: "Slide them apart and lay them on their sides on a rug. Fold the cover flaps over the frame and press the strips together.",
      add: ["A0", "A1"],
      warnings: ["floor"],
      from: { A0: [-300, 0, 0], A1: [300, 0, 0] },
    },
    {
      title: "Screw the legs into the armrests",
      detail: "Two in each, by hand until they're firm.",
      add: ["L0", "L1", "L2", "L3"],
      kind: "legs",
      from: Object.fromEntries([0, 1, 2, 3].map((i) => [`L${i}`, [0, -250, 0] as Vec3])),
    },
    {
      title: "Screw the studs into the armrests",
      detail: "Two in the inside of each armrest, low down, as far as they go by hand.",
      fix: studs((LEG + SF) / 2, seatZ),
    },
    {
      title: "Fix the armrests to the seat frame",
      detail: "Lay the seat frame on its back. Push each armrest's studs through its holes, then a washer and a wing nut on each.",
      add: ["F"],
      pose: "+z",
      fix: nuts((LEG + SF) / 2, seatZ),
      people: 2,
      warnings: ["two", "floor"],
    },
    {
      title: "Stand it up and screw in a stud each side",
      detail: "Turn the sofa onto its legs. One stud into each armrest, at the back above the seat.",
      pose: "+y",
      people: 2,
      fix: studs(backY, [(bz0 + bz1) / 2]),
    },
    {
      title: "Lower the backrest frame on",
      detail: "Guide its holes over the two studs, then a washer and a wing nut on each.",
      add: ["B"],
      fix: nuts(backY, [(bz0 + bz1) / 2]),
      from: { B: [0, 300, 0] },
    },
    {
      title: "Pull the seat cover on",
      detail: "One person at each end. Pull it over the seat and frame from the back, then tuck its edges in behind the backrest.",
      add: ["C"],
      people: 2,
      warnings: ["two"],
      from: { C: [0, 250, 200] },
    },
    {
      title: "Fix the top roll",
      detail: "Screw a stud into each armrest at the top, lay the roll on and hold it with a washer and wing nut each side.",
      add: ["T"],
      fix: [...studs(BACK - 30, [(bz0 + bz1) / 2]), ...nuts(BACK - 30, [(bz0 + bz1) / 2])],
      from: { T: [0, 250, 0] },
    },
    {
      title: "Tighten all the wing nuts",
      detail: "By hand, until they're snug. Don't force them or they'll strip.",
      warnings: ["hand"],
      kind: "bolts",
    },
    {
      title: "Close the back cover",
      detail: "Fold it down over the back of the frame and close the zip along the bottom.",
      add: ["V"],
      from: { V: [0, 300, -100] },
    },
    {
      title: "Fill the back cushions and set them on",
      detail: "Fold each inner cushion in half, slide it into its cover, open it out and close the zip. Stand them against the backrest.",
      add: ["K0", "K1"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["GULLVALLA"],
  recipe(s) {
    if (s.archetype !== "sofa" && !/sofa/i.test(s.variant)) return null;
    return sofa(s);
  },
};
export default family;
