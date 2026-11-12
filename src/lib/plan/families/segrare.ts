import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * SEGRARE, read from the sit/stand desk's manual (crank on the right). Everything goes onto the top lying face
 * down: the column clips into the cross beam, the beam is screwed to the top, the two end brackets are screwed to
 * the beam and the top, then the gearbox with its drive shaft, the crank holder and the folding crank go in.
 * The U-shaped base is bolted on the column's end last, and the desk is turned over and its feet levelled.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SIDES = [-1, 1] as const;
const SCREW = { len: 10, dia: 6 };

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 110 x 60, 75 to 125 high (drawn at its lowest)
  const W = s.size.w * 10 || 1100, D = s.size.d * 10 || 600, H = s.size.h * 10 || 750;
  const tT = 20, ty = H - tT;
  const bH = 40, by = ty - bH / 2; // cross beam
  const bx = W / 2 - 110; // beam ends, where the end brackets sit
  const tube = 40, by0 = tube / 2 + 10; // base tubes, on their feet
  const zb = D / 2 - 90; // base rails
  const plateY = by0 + tube / 2 + 4;
  const xg = 300, zg = 70; // gearbox
  const base: PartPiece[] = [];
  const bx0 = -W / 2 + 40, bx1 = W / 2 - 60;
  const cyl = (len: number, pos: Vec3, axis: "x" | "z", dia = tube): PartPiece => ({ shape: "cyl", size: [dia, len, dia], pos, rot: axis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0] });
  const baseMid: Vec3 = [(bx0 + bx1) / 2, by0, 0];
  const rel = (p: Vec3): Vec3 => [p[0] - baseMid[0], p[1] - baseMid[1], p[2] - baseMid[2]];
  base.push(
    ...SIDES.map((sz) => cyl(bx1 - bx0, rel([(bx0 + bx1) / 2, by0, sz * zb]), "x")),
    cyl(2 * zb, rel([bx1, by0, 0]), "z"), // the closed end, on the right
    cyl(2 * zb, rel([bx0 + 120, by0, 0]), "z", 30),
    { shape: "box", size: [120, 8, 2 * zb], pos: rel([0, plateY - 4, 0]) },
    ...SIDES.flatMap((sz) => [bx0 + 15, bx1].map((x): PartPiece => ({ shape: "cyl", size: [30, 10, 30], pos: rel([x, 5, sz * zb]) }))),
  );
  const parts: CustomPart[] = [
    { id: "BM", name: "Cross beam", size: [2 * bx, bH, 60], pos: [0, by, 0], material: "metal" },
    { id: "CO", name: "Column", shape: "cyl", size: [80, by - bH / 2 - plateY, 80], pos: [0, (by - bH / 2 + plateY) / 2, 0], material: "metal" },
    { id: "TOP", name: "Desk top", size: [W, tT, D], pos: [0, ty + tT / 2, 0], material: "board" },
    ...SIDES.map((sx, i): CustomPart => ({ id: `EB${i + 1}`, name: "End bracket", size: [30, bH, D - 160], pos: [sx * (bx + 15), by, 0], material: "metal" })),
    (() => {
      // the gearbox sits beside the beam; its square shaft runs inside the beam to the column
      const c: Vec3 = [(xg + 40) / 2, by, (zg + 30 - 6) / 2];
      return { id: "GB", name: "Gearbox with shaft", size: [xg + 40, bH, zg + 36] as Vec3, pos: c, material: "metal" as const, pieces: [
        { shape: "box" as const, size: [80, bH, 60] as Vec3, pos: [xg - c[0], 0, zg - c[2]] as Vec3 },
        { shape: "box" as const, size: [xg - 40, 12, 12] as Vec3, pos: [(xg - 40) / 2 - c[0], 0, -c[2]] as Vec3 },
      ] };
    })(),
    { id: "CH", name: "Crank holder", size: [40, 30, 30], pos: [xg + 160, ty - 15, D / 2 - 60], material: "metal" },
    { id: "CS", name: "Crank support", size: [40, 10, 50], pos: [xg, ty - 5, zg + 60], material: "metal" },
    (() => {
      // folded: an arm from the gearbox to the front, the handle along the front edge, knob down
      const z0 = zg + 30, z1 = D / 2 - 60, arm = z1 - z0;
      return { id: "CR", name: "Crank", size: [214, 64, arm + 14] as Vec3, pos: [xg + 100, ty - 37, (z0 + z1) / 2] as Vec3, material: "metal" as const, pieces: [
        cyl(arm, [-100, 18, 0], "z", 14),
        cyl(200, [0, 18, arm / 2], "x", 14),
        { shape: "cyl" as const, size: [24, 50, 24] as Vec3, pos: [100, -7, arm / 2] as Vec3 },
      ] };
    })(),
    { id: "BS", name: "Base", size: [bx1 - bx0 + tube, by0 + tube / 2 + 4, 2 * zb + tube], pos: [baseMid[0], (by0 + tube / 2 + 4) / 2, 0], material: "metal", pieces: base.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] + by0 - (by0 + tube / 2 + 4) / 2, p.pos[2]] as Vec3 })) },
  ];
  const yB = by - bH / 2; // the beam's underside
  return {
    parts,
    steps: [
      {
        title: "Clip the column into the cross beam",
        detail: "Lay the beam on a rug and push the column's end bracket into it until it clicks. Two screws through the beam.",
        add: ["BM", "CO"],
        fix: [at("screw", SIDES.map((sx) => [sx * 30, ty, 0] as Vec3), [0, -1, 0], "BM", "CO", SCREW)],
        tools: ["allen"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Turn the beam over and screw it again", detail: "Two more screws into the column's bracket from this side.", fix: [at("screw", SIDES.map((sx) => [sx * 30, yB, 20] as Vec3), [0, 1, 0], "BM", "CO", SCREW)], tools: ["allen"] },
      {
        title: "Screw the beam to the top",
        detail: "Lay the top face down on the rug. Stand the beam on it with the column up, lined up with the arrows, and drive in two screws.",
        add: ["TOP"],
        fix: [at("screw", SIDES.map((sx) => [sx * 250, yB, 0] as Vec3), [0, 1, 0], "BM", "TOP", SCREW)],
        tools: ["allen"],
      },
      {
        title: "Screw the end brackets to the beam",
        detail: "One at each end, curved edge to the top. Two screws in each.",
        add: ["EB1", "EB2"],
        fix: SIDES.map((sx, i) => at("screw", SIDES.map((sz) => [sx * (bx + 30), by, sz * 15] as Vec3), [-sx, 0, 0], `EB${i + 1}`, "BM", SCREW)),
        tools: ["allen"],
      },
      {
        title: "Screw the end brackets to the top",
        detail: "Four screws through each bracket.",
        fix: SIDES.map((sx, i) => at("screw", [-170, -60, 60, 170].map((z) => [sx * (bx + 15), yB, z] as Vec3), [0, 1, 0], `EB${i + 1}`, "TOP", SCREW)),
        tools: ["allen"],
      },
      { title: "Slide the gearbox's shaft into the beam", detail: "The square shaft goes along the beam until it meets the column.", add: ["GB"], from: { GB: [400, 0, 0] } },
      {
        title: "Screw the gearbox to the top",
        detail: "Four screws through its feet.",
        fix: [at("screw", SIDES.flatMap((dx) => SIDES.map((dz) => [xg + dx * 30, yB, zg + dz * 20] as Vec3)), [0, 1, 0], "GB", "TOP", SCREW)],
        tools: ["allen"],
      },
      {
        title: "Screw the crank holder to the top",
        detail: "Near the front edge. The rounded side faces the front.",
        add: ["CH"],
        fix: [at("screw", SIDES.map((sx) => [xg + 160 + sx * 12, ty - 30, D / 2 - 60] as Vec3), [0, 1, 0], "CH", "TOP", SCREW)],
        tools: ["allen"],
      },
      { title: "Push the crank into the gearbox", detail: "Its end goes into the gearbox's hole, then turn the small screw at the end of the beam in.", add: ["CR"] },
      { title: "Screw the crank support down", detail: "Two screws hold the crank's shaft against the top.", add: ["CS"], fix: [at("screw", SIDES.map((sx) => [xg + sx * 12, ty - 10, zg + 60] as Vec3), [0, 1, 0], "CS", "TOP", SCREW)], tools: ["allen"] },
      {
        title: "Fold the crank into its holder",
        detail: "Swing it round until it clicks into the holder, then tighten the thumb screw with the long Allen key.",
        fix: [at("screw", [[xg, ty - 30, zg + 40]], [0, 1, 0], "CR", "GB", { name: "Thumb screw", len: 20, dia: 8 })],
        tools: ["allen"],
      },
      {
        title: "Bolt the base onto the column",
        detail: "Closed end of the base on the crank's side. Four long bolts, each with a spring washer.",
        add: ["BS"],
        fix: [
          at("bolt", SIDES.flatMap((dx) => SIDES.map((dz) => [dx * 30, plateY - 8, dz * 30] as Vec3)), [0, 1, 0], "BS", "CO", { len: 60, dia: 8 }),
          at("washer", SIDES.flatMap((dx) => SIDES.map((dz) => [dx * 30, plateY - 10, dz * 30] as Vec3)), [0, 1, 0], "BS", undefined, { name: "Spring washer", len: 2, dia: 8 }),
        ],
        tools: ["allen"],
      },
      { title: "Turn the desk over and level it", detail: "Stand it on the base, then turn the four feet until it doesn't rock.", pose: "+y", people: 2 },
      { title: "Crank it to the height you want", detail: "Fold the crank out, turn it to raise or lower the top, then fold it back until it clicks. Don't put more than 40 kg on it." },
    ],
  };
}

const family: Family = { names: ["SEGRARE"], recipe };
export default family;
