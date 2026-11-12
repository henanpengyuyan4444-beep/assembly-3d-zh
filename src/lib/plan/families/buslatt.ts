import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BUSLÄTT, read from the chair's manual. Each side is one steel frame (back leg, side rail and front leg). The
 * backrest drops in between the two back legs and is screwed on, the front and back rails drop onto the side rails
 * and are bolted through the sides, then the chair goes upside down onto the seat and four long bolts go up through
 * the rails into it, by hand only. Last, every screw and bolt is tightened once more with the chair standing.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, ...o });
const UP: Vec3 = [0, 1, 0];
const TUBE = 20;

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 39 wide, 47 deep, 79 high, seat at 45
  const W = s.size.w * 10 || 390, D = s.size.d * 10 || 470, H = s.size.h * 10 || 790;
  const seatTop = 450, st = 20, railTop = seatTop - st, railH = 30, railY = railTop - railH / 2;
  const xs = W / 2 - TUBE / 2 - 2; // side frames
  const bz0 = -D / 2 + TUBE / 2, bz1 = bz0 + 35; // back leg: foot, top
  const fz0 = D / 2 - TUBE / 2, fz1 = fz0 - 20; // front leg: foot, top
  const backZ = (y: number) => bz0 + ((bz1 - bz0) * y) / H;
  const zr = (railY * (bz1 - bz0)) / H + bz0; // back leg at the rail
  const mid = H / 2;
  const rod = (a: Vec3, b: Vec3, d = TUBE): PartPiece => {
    const len = Math.hypot(b[1] - a[1], b[2] - a[2]);
    return { shape: "cyl", size: [d, len, d], pos: [0, (a[1] + b[1]) / 2 - mid, (a[2] + b[2]) / 2], rot: [Math.atan2(b[2] - a[2], b[1] - a[1]), 0, 0] };
  };
  const side: PartPiece[] = [
    rod([0, 0, bz0], [0, H, bz1]),
    rod([0, 0, fz0], [0, railTop, fz1]),
    { shape: "box", size: [TUBE, railH, fz1 - zr], pos: [0, railY - mid, (fz1 + zr) / 2] },
  ];
  const frame = (id: string, sx: number): CustomPart => ({ id, name: "Side frame", size: [TUBE, H, D], pos: [sx * xs, mid, 0], pieces: side, material: "metal" });
  const bw = 2 * (xs - TUBE / 2), bh = 120, by = H - 20 - bh / 2, bz = backZ(by);
  const railZ = [zr + 30, fz1 - 25];
  const parts: CustomPart[] = [
    frame("L", -1),
    frame("R", 1),
    { id: "B", name: "Backrest", size: [bw, bh, 6], pos: [0, by, bz], material: "metal" },
    { id: "F", name: "Front rail", size: [bw, railH, 20], pos: [0, railY, railZ[1]], material: "metal" },
    { id: "K", name: "Back rail", size: [bw, railH, 20], pos: [0, railY, railZ[0]], material: "metal" },
    { id: "S", name: "Seat", size: [W, st, fz0 - zr + 10], pos: [0, seatTop - st / 2, (fz0 + zr + 10) / 2], material: "wood" },
  ];
  const sides = [-1, 1];
  const backScrews = sides.flatMap((sx) => [by + 35, by - 35].map((y): Vec3 => [sx * (xs + TUBE / 2), y, backZ(y)]));
  const sideBolts = sides.flatMap((sx) => railZ.map((z): Vec3 => [sx * (xs + TUBE / 2), railY, z]));
  const inward = (pts: Vec3[], kind: CustomFix["kind"], o: Partial<CustomFix>) => sides.map((sx) => fx(kind, pts.filter((p) => Math.sign(p[0]) === sx), { dir: [-sx, 0, 0], ...o }));

  return {
    parts,
    steps: [
      {
        title: "Push the backrest down between the back legs",
        detail: "Stand the two side frames up and slide the backrest down from the top until its holes line up.",
        add: ["L", "R", "B"],
      },
      {
        title: "Screw the backrest on",
        detail: "Two screws through each back leg. Snug, not tight yet.",
        fix: inward(backScrews, "screw", { mate: "B", len: 12, dia: 4 }),
        tools: ["screwdriver"],
      },
      {
        title: "Lay the front and back rails in",
        detail: "They drop onto the side rails. The one with two holes in each end goes at the back.",
        add: ["F", "K"],
      },
      {
        title: "Bolt the rails through the sides",
        detail: "One short bolt through each side frame into each rail end, with the Allen key. Then turn the chair upside down.",
        fix: inward(sideBolts, "bolt", { len: 30, dia: 6 }),
        tools: ["allen"],
      },
      {
        title: "Bolt the seat on from below",
        detail: "Lay the seat face down on a rug and put the chair on it upside down. Four long bolts go up through the rails into the seat. Use the Allen key, not a drill.",
        add: ["S"],
        fix: [fx("bolt", railZ.flatMap((z) => [-1, 1].map((sx): Vec3 => [sx * bw * 0.3, railY - railH / 2, z])), { dir: UP, mate: "S", len: 45, dia: 6 })],
        tools: ["allen"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Tighten the backrest screws",
        detail: "Stand the chair up and tighten all four screws firmly.",
        tools: ["screwdriver"],
        pose: "+y",
      },
      { title: "Tighten the side bolts", detail: "All four, with the Allen key, until the heads sit flat.", tools: ["allen"] },
    ],
  };
}

const family: Family = { names: ["BUSLÄTT"], recipe };
export default family;
