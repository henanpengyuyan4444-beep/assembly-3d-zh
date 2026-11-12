import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TARSELE, read from its two manuals. Both tops are trays with a deep rim, laid upside down on a rug, and both stand
 * on two U-shaped steel legs bolted into the corners with washers.
 * - Coffee table: one step, the two legs with four bolts and washers in each foot plate.
 * - Extendable table: the two top halves are pushed together on their pegs and locked, the two slide runners are
 *   screwed across them, the two leaf holders get their brackets and are screwed to the runners, then the legs go
 *   on with six bolts a plate. Stood up, the halves are unlocked and pulled apart so the leaf can be stored in the
 *   middle underneath, then pushed back together and locked.
 */

const UP: Vec3 = [0, 1, 0];
const fx = (kind: CustomFix["kind"], at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, ...o });
const SIDES = [-1, 1];

/** A tray-shaped top (or half of one) given by its outer box, with a slab on top and a rim round the edges. */
function tray(id: string, name: string, x0: number, x1: number, D: number, H: number, rim: number, open: number[] = []): CustomPart {
  const w = x1 - x0, cx = (x0 + x1) / 2, slab = 20, rw = 20;
  const pieces: PartPiece[] = [
    { shape: "box", size: [w, slab, D], pos: [0, rim / 2 - slab / 2, 0] },
    ...SIDES.map((sz): PartPiece => ({ shape: "box", size: [w, rim - slab, rw], pos: [0, -slab / 2, sz * (D / 2 - rw / 2)] })),
    // no rim along an edge that meets the other half
    ...SIDES.filter((sx) => !open.includes(sx)).map((sx): PartPiece => ({ shape: "box", size: [rw, rim - slab, D - 2 * rw], pos: [sx * (w / 2 - rw / 2), -slab / 2, 0] })),
  ];
  return { id, name, size: [w, rim, D], pos: [cx, H - rim / 2, 0], pieces, material: "board" };
}

/** A U-shaped leg across the table at x: two uprights, a bar along the floor and a plate on top of each upright. */
function uLeg(id: string, x: number, D: number, top: number, inset: number): CustomPart {
  const t = 40, zu = D / 2 - inset;
  const pieces: PartPiece[] = [
    ...SIDES.map((sz): PartPiece => ({ shape: "box", size: [t, top - 4, t], pos: [0, (top - 4) / 2 - top / 2, sz * zu] })),
    { shape: "box", size: [t, t, 2 * zu - t], pos: [0, t / 2 - top / 2, 0] },
    ...SIDES.map((sz): PartPiece => ({ shape: "box", size: [70, 4, 70], pos: [0, top / 2 - 2, sz * zu] })),
  ];
  return { id, name: "U-shaped leg", size: [70, top, 2 * zu + 70], pos: [x, top / 2, 0], pieces, material: "metal" };
}

/** n bolts round a leg's foot plate, going up into the top. */
function plateBolts(x: number, z: number, y: number, n: number): Vec3[] {
  const pts: Vec3[] = [[x - 24, y, z - 24], [x + 24, y, z - 24], [x + 24, y, z + 24], [x - 24, y, z + 24], [x - 24, y, z], [x + 24, y, z]];
  return pts.slice(0, n);
}

function coffee(s: ProductSpec): CustomParams {
  // IKEA: 114 x 72, 45 high
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const rim = 85, top = H - 20, xl = W / 2 - 110, inset = 60;
  const parts: CustomPart[] = [tray("T", "Table top", -W / 2, W / 2, D, H, rim), uLeg("L1", -xl, D, top, inset), uLeg("L2", xl, D, top, inset)];
  const bolts = SIDES.flatMap((sx) => SIDES.flatMap((sz) => plateBolts(sx * xl, sz * (D / 2 - inset), top - 4, 4)));
  return {
    parts,
    steps: [
      { title: "Lay the top upside down on a rug", detail: "The rim keeps it off the floor, the rug keeps the surface free of scratches.", add: ["T"], pose: "-y", warnings: ["floor"] },
      {
        title: "Bolt the two legs into the top",
        detail: "Four bolts through each foot plate, each with a washer. Tighten them all with the Allen key once both legs sit on the holes.",
        add: ["L1", "L2"],
        fix: [fx("bolt", bolts, { len: 16, dia: 6, dir: UP, mate: "T" }), fx("washer", bolts, { len: 2, dia: 16, dir: UP })],
        tools: ["allen"],
      },
      { title: "Turn the table over", detail: "Lift it by the top and set it down on its legs.", pose: "+y" },
    ],
  };
}

function extendable(s: ProductSpec): CustomParams {
  // IKEA: 150 (200 with the leaf) x 80, 77 high
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const rim = 50, slabY = H - 20; // underside of the slab
  const zr = D / 2 - 120; // the slide runners
  const xh = 200; // leaf holders
  const parts: CustomPart[] = [
    tray("TA", "Top half", -W / 2, 0, D, H, rim, [1]),
    tray("TB", "Top half", 0, W / 2, D, H, rim, [-1]),
    ...SIDES.map((sz, i): CustomPart => ({ id: `R${i}`, name: "Slide runner", size: [W - 200, 30, 40], pos: [0, slabY - 15, sz * zr], material: "metal" })),
    ...SIDES.map((sx, i): CustomPart => ({
      id: `H${i}`,
      name: "Leaf holder",
      size: [50, 22, 2 * zr + 40],
      pos: [sx * xh, slabY - 41, 0],
      pieces: [
        { shape: "box", size: [50, 10, 2 * zr - 40], pos: [0, -6, 0], material: "wood" },
        ...SIDES.map((sz): PartPiece => ({ shape: "box", size: [50, 22, 40], pos: [0, 0, sz * zr] })),
      ],
      material: "metal",
    })),
    { id: "X", name: "Extension leaf", size: [500, 20, 2 * zr - 60], pos: [0, slabY - 32, 0], material: "board" },
  ];
  const top = slabY;
  const xl = W / 2 - 55, inset = 55;
  parts.push(uLeg("L1", -xl, D, top, inset), uLeg("L2", xl, D, top, inset));

  const runnerScrews = (sz: number): Vec3[] => [-0.95, -0.85, -0.45, -0.15, 0.15, 0.45, 0.85, 0.95].map((f): Vec3 => [(f * (W - 200)) / 2, slabY - 30, sz * zr + (Math.abs(f) > 0.8 ? 0 : 14)]);
  const bracketScrews: Vec3[] = SIDES.flatMap((sx) => SIDES.flatMap((sz) => [-12, 12].map((d): Vec3 => [sx * xh + d, slabY - 52, sz * zr])));
  const holderScrews: Vec3[] = SIDES.flatMap((sx) => SIDES.map((sz): Vec3 => [sx * xh, slabY - 30, sz * zr]));
  const bolts = SIDES.flatMap((sx) => SIDES.flatMap((sz) => plateBolts(sx * xl, sz * (D / 2 - inset), top - 4, 6)));
  const locks: Vec3[] = SIDES.map((sz): Vec3 => [0, slabY, sz * (zr - 90)]);
  const steps: CustomStep[] = [
    {
      title: "Push the two top halves together",
      detail: "Upside down on a rug. The four pegs on one half go into the holes in the other.",
      add: ["TA", "TB"],
      from: { TA: [-200, 0, 0], TB: [200, 0, 0] },
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Lock the halves together", detail: "Swing both catches over and press them down until they click.", fix: [fx("clip", locks, { name: "Table lock", len: 20, dia: 40, dir: UP })] },
    {
      title: "Screw the slide runners across both halves",
      detail: "Eight screws in each, two through each end bracket. Turn the round clips the way the drawing shows before you screw.",
      add: ["R0", "R1"],
      fix: SIDES.map((sz) => fx("screw", runnerScrews(sz), { len: 14, dia: 4, dir: [0, 1, 0] })),
      tools: ["screwdriver"],
    },
    {
      title: "Screw the brackets onto the leaf holders",
      detail: "One bracket on each end, two screws in each. Then lay the holders across the middle.",
      add: ["H0", "H1"],
      fix: [fx("screw", bracketScrews, { name: "Wood screw", len: 14, dia: 4, dir: [0, 1, 0], to: ["H0", "H1"] })],
      tools: ["screwdriver"],
    },
    {
      title: "Screw the leaf holders to the runners",
      detail: "One screw through each bracket into the runner.",
      fix: [fx("screw", holderScrews, { len: 14, dia: 4, dir: [0, 1, 0] })],
      tools: ["screwdriver"],
    },
    {
      title: "Bolt the legs into the corners",
      detail: "Six bolts through each foot plate, each with a washer. Tighten them with the Allen key.",
      add: ["L1", "L2"],
      fix: [fx("bolt", bolts, { len: 16, dia: 6, dir: UP }), fx("washer", bolts, { len: 2, dia: 16, dir: UP })],
      tools: ["allen"],
    },
    {
      title: "Turn it over and unlock the halves",
      detail: "Two people, lifting by the top. Open both catches underneath and pull the two ends apart.",
      pose: "+y",
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Store the leaf and close the table",
      detail: "Lower the leaf through the gap onto its holders, push the halves together and lock both catches. To extend, lay the leaf in the gap instead.",
      add: ["X"],
      from: { X: [0, 400, 0] },
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["TARSELE"],
  recipe(s) {
    const t = `${s.slug ?? ""} ${s.variant}`.toLowerCase();
    if (/coffee/.test(t)) return coffee(s);
    if (/extendable|dining/.test(t)) return extendable(s);
    return null;
  },
};
export default family;
