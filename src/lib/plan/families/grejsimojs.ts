import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GREJSIMOJS, read from its four manuals. The children's table and stool are a pine top on two bent steel leg frames:
 * upside down on a rug, sleeve bolts go through each frame into the top, turned in loosely first and then tightened
 * flush (eight on the table, six on the stool). The cactus clothes stand is two flat halves slid together slot into
 * slot, pushed into a round base and held by one bolt from underneath, then lowered into its felt pot. The monster
 * pouffe gets four feet bolted on upside down, then its lid goes on.
 */

const Y = (p: Vec3, dy: number): Vec3 => [p[0], p[1] + dy, p[2]];

/** A flat oval: a box with a disc at each end, `w` long and `d` across. */
function oval(w: number, h: number, d: number): PartPiece[] {
  const r = (w - d) / 2;
  return [
    { shape: "box", size: [w - d, h, d], pos: [0, 0, 0] },
    { shape: "halfcyl", size: [d, h, d / 2], pos: [-r - d / 4, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { shape: "halfcyl", size: [d, h, d / 2], pos: [r + d / 4, 0, 0], rot: [0, Math.PI / 2, 0] },
  ];
}

/** A bent tube frame seen as straight runs: two legs up to a flat bar under the top, at one end (sx) of the piece. */
function legFrame(id: string, sx: number, o: { H: number; legX: number; legZ: number; barX: number; barLen: number; tube: number }): CustomPart {
  const { H, legX, legZ, barX, barLen, tube } = o;
  const bar = 8; // the flattened run the bolts go through
  const x0 = sx * barX;
  const legH = H - tube / 2;
  const pieces: PartPiece[] = [
    { shape: "box", size: [44, bar, barLen], pos: [0, H - bar / 2, 0] },
    ...[-1, 1].flatMap((sz): PartPiece[] => [
      { shape: "cyl", size: [tube, legH, tube], pos: [sx * (legX - barX), legH / 2, sz * legZ] },
      // the bend from the bar out to the leg, drawn as a short run
      { shape: "box", size: [Math.abs(legX - barX) + tube, tube, tube], pos: [(sx * (legX - barX)) / 2, H - tube / 2, sz * legZ] },
      { shape: "box", size: [tube, tube, Math.abs(legZ - barLen / 2) + tube], pos: [0, H - tube / 2, sz * (legZ + barLen / 2) / 2] },
    ]),
  ];
  const lo = Math.min(...pieces.map((p) => p.pos[1] - p.size[1] / 2));
  const hi = Math.max(...pieces.map((p) => p.pos[1] + p.size[1] / 2));
  const w = Math.abs(legX - barX) + 44;
  const cx = x0 + (sx * (legX - barX)) / 2;
  const d = Math.max(barLen, 2 * legZ + tube);
  const cy = (lo + hi) / 2;
  // pieces are given from the bar's x and the floor; move them to the part's centre
  const shifted = pieces.map((p) => ({ ...p, pos: [p.pos[0] + x0 - cx, p.pos[1] - cy, p.pos[2]] as Vec3 }));
  return { id, name: "Leg frame", size: [w, hi - lo, d], pos: [cx, cy, 0], material: "metal", pieces: shifted };
}

/** The table and the stool: the same build with a different top and bolt count. */
function topOnFrames(s: ProductSpec, kind: "table" | "stool"): CustomParams {
  const table = kind === "table";
  const W = table ? s.size.w * 10 : 270;
  const D = table ? s.size.d * 10 : 270;
  const H = table ? s.size.h * 10 : 280;
  const t = table ? 20 : 24;
  const tube = 22;
  const yTop = H - t; // underside of the top
  const top: CustomPart = table
    ? { id: "top", name: "Table top", size: [W, t, D], pos: [0, H - t / 2, 0], material: "wood", pieces: oval(W, t, D) }
    : { id: "top", name: "Seat", size: [240, t, 240], pos: [0, H - t / 2, 0], material: "wood", shape: "cyl" };
  const o = table
    ? { H: yTop, legX: W / 2 - 95, legZ: D / 2 - 55, barX: W / 2 - 120, barLen: D - 150, tube }
    : { H: yTop, legX: W / 2 - tube / 2, legZ: 95, barX: 62, barLen: 150, tube };
  const frames = [legFrame("F0", -1, o), legFrame("F1", 1, o)];
  const per = table ? 4 : 3;
  const zs = Array.from({ length: per }, (_, i) => -o.barLen / 2 + 25 + ((o.barLen - 50) * i) / (per - 1));
  const at: Vec3[] = [-1, 1].flatMap((sx) => zs.map((z) => [sx * o.barX, yTop - 8, z] as Vec3));
  const n = at.length;
  return {
    parts: [top, ...frames],
    steps: [
      {
        title: "Lay the top upside down on a rug",
        detail: table ? "The pre-drilled holes face up. A rug or the box lid keeps the wood from scratching." : "Seat face down, holes up, on a rug or the box lid.",
        add: ["top"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Bolt the leg frames on loosely",
        detail: `Hold each frame over its holes and turn the ${n} sleeve bolts in by hand with the Allen key. Leave them standing a little proud for now. Don't use a drill.`,
        add: ["F0", "F1"],
        fix: [{ kind: "bolt", name: "Sleeve bolt", count: n, len: 30, dia: 8, at: at.map((p) => Y(p, -14)), dir: [0, 1, 0], to: ["top"] }],
        tools: ["allen"],
      },
      {
        title: "Tighten every bolt",
        detail: "Go round them all with the Allen key until each sits flush with the frame. Turn it the right way up.",
        tools: ["allen"],
        check: "square",
      },
      { title: table ? "Stand the table up" : "Stand the stool up", detail: "Check it stands flat on all four legs.", pose: "+y" },
    ],
  };
}

function clothesStand(s: ProductSpec): CustomParams {
  const H = s.size.h * 10;
  const t = 12, base = 15, pot = 480, potH = 300;
  const ph = H - base; // each half stands on the base
  const trunk = 150;
  // a cactus arm: out from the trunk, then up, given in the panel's own across (u) and up (y), from its centre
  const arm = (u: number, y: number, len: number): PartPiece[] => {
    const s = Math.sign(u);
    return [
      { shape: "box", size: [len, 60, t], pos: [s * (trunk / 2 + len / 2), y, 0] },
      { shape: "box", size: [60, 170, t], pos: [s * (trunk / 2 + len - 30), y + 85, 0] },
    ];
  };
  const panel = (arms: PartPiece[]): PartPiece[] => [
    { shape: "box", size: [trunk, ph - trunk / 2, t], pos: [0, -trunk / 4, 0] },
    { shape: "cyl", size: [trunk, t, trunk], pos: [0, ph / 2 - trunk / 2, 0], rot: [Math.PI / 2, 0, 0] },
    { shape: "box", size: [pot - 60, potH - base - 10, t], pos: [0, -ph / 2 + (potH - base - 10) / 2, 0] },
    ...arms,
  ];
  const yc = base + ph / 2;
  const armsA = [...arm(-1, ph * 0.26, 120), ...arm(1, ph * 0.08, 120), ...arm(1, ph * 0.4, 60)];
  const armsB = [...arm(-1, -ph * 0.02, 100), ...arm(1, ph * 0.18, 110)];
  // the second half turns a quarter round: its across runs front to back
  const turn = (ps: PartPiece[]): PartPiece[] =>
    ps.map((p) => ({ ...p, size: [p.size[2], p.size[1], p.size[0]] as Vec3, pos: [p.pos[2], p.pos[1], p.pos[0]] as Vec3, rot: p.rot ? [0, 0, Math.PI / 2] : undefined }));
  const wA = pot - 60;
  const parts: CustomPart[] = [
    { id: "A", name: "Stand half", size: [wA, ph, t], pos: [0, yc, 0], material: "board", pieces: panel(armsA) },
    { id: "B", name: "Stand half", size: [t, ph, wA], pos: [0, yc, 0], material: "board", pieces: turn(panel(armsB)) },
    { id: "base", name: "Base", size: [pot - 80, base, pot - 80], pos: [0, base / 2, 0], shape: "cyl", material: "board" },
    { id: "pot", name: "Felt pot", size: [pot, potH, pot], pos: [0, potH / 2, 0], shape: "cyl", material: "soft" },
  ];
  return {
    parts,
    steps: [
      {
        title: "Slide the two halves together",
        detail: "Stand one half on a rug and lower the other onto it, slot into slot, until their bottom edges are level.",
        add: ["A", "B"],
        from: { B: [0, 700, 0] },
        warnings: ["floor"],
      },
      {
        title: "Push the halves into the base",
        detail: "The four tabs at the bottom go into the four slots in the base.",
        add: ["base"],
        from: { base: [0, -220, 0] },
      },
      {
        title: "Bolt the base on from underneath",
        detail: "Washer on the bolt, then up through the middle of the base into the cross. Tighten it with the Allen key.",
        fix: [
          { kind: "washer", count: 1, len: 1.5, dia: 16, at: [[0, -2, 0]], dir: [0, 1, 0], on: "base" },
          { kind: "bolt", count: 1, len: 70, dia: 6, at: [[0, -3, 0]], dir: [0, 1, 0], on: "base", mate: "A" },
        ],
        tools: ["allen"],
      },
      {
        title: "Lower the stand into the pot",
        detail: "Fold the top edge of the felt pot over first, then set the stand down inside it so the base sits flat on the bottom.",
        add: ["pot"],
        from: { pot: [0, -320, 0] },
      },
    ],
  };
}

function pouffe(): CustomParams {
  // IKEA's page: 57 wide, 32 deep, 24 high
  const W = 570, D = 320, H = 240;
  const foot = 40, lid = 45;
  const bodyH = H - foot - lid;
  const parts: CustomPart[] = [
    { id: "body", name: "Box", size: [W, bodyH, D], pos: [0, foot + bodyH / 2, 0], material: "soft", pieces: oval(W, bodyH, D) },
    { id: "lid", name: "Lid", size: [W, lid, D], pos: [0, H - lid / 2, 0], material: "soft", pieces: oval(W, lid, D) },
  ];
  const feet: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (W / 2 - 90), foot / 2, sz * 85] as Vec3));
  feet.forEach((p, i) => parts.push({ id: `F${i}`, name: "Foot", size: [100, foot, 100], pos: p, shape: "cyl", material: "soft" }));
  return {
    parts,
    steps: [
      {
        title: "Lay the box upside down on a rug",
        detail: "Take the lid off first. The four marked holes in the bottom face up.",
        add: ["body"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Bolt on the four feet",
        detail: "Turn each foot so its toes point out, then one bolt through its middle with the Allen key.",
        add: ["F0", "F1", "F2", "F3"],
        fix: [{ kind: "bolt", count: 4, len: 50, dia: 6, at: feet.map((p) => [p[0], 0, p[2]] as Vec3), dir: [0, 1, 0], to: ["body"] }],
        tools: ["allen"],
      },
      {
        title: "Turn it over and put the lid on",
        detail: "Stand it on its feet and lay the lid on top. The cover zips off to wash.",
        add: ["lid"],
        pose: "+y",
      },
    ],
  };
}

const family: Family = {
  names: ["GREJSIMOJS"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/clothes-stand/.test(slug)) return clothesStand(s);
    if (/children-s-table/.test(slug)) return topOnFrames(s, "table");
    if (/children-s-stool/.test(slug)) return topOnFrames(s, "stool");
    if (/pouffe/.test(slug)) return pouffe();
    return null;
  },
};
export default family;
