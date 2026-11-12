import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * BÄSTBOLL, read from the gaming chair's manual. The seat comes with its mechanism, back frame and armrests already
 * on. Five castors click into the star base, the gas lift loses its cap and drops into the hub, and two people lower
 * the seat onto it; sitting on it and turning once presses it home. The mesh back is bolted to the back frame with
 * four bolts (tightened crosswise), the headrest pushed down onto the top of the back and held by three small bolts,
 * and a ring clicks on over its mount.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function chair(): CustomParams {
  // IKEA: 69 wide and deep, 120 high with the seat down (seat 48 high, 50 x 47), armrests 64 high
  const H = 1200, R = 330, baseY = 95;
  const seatTop = 480, seatT = 60, seatW = 500, seatD = 470, zSeat = 20;
  const mechY = seatTop - seatT - 60;
  const armX = seatW / 2 + 40, armTop = 640;
  const angles = Array.from({ length: 5 }, (_, i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
  const dirOf = (a: number): [number, number] => [Math.cos(a), -Math.sin(a)];
  const basePieces: PartPiece[] = [
    { shape: "cyl", size: [80, 70, 80], pos: [0, 0, 0] },
    ...angles.map((a): PartPiece => {
      const [dx, dz] = dirOf(a);
      return { shape: "box", size: [R - 20, 26, 40], pos: [(dx * (R + 20)) / 2, -8, (dz * (R + 20)) / 2], rot: [0, a, 0] };
    }),
  ];
  // the seat as it comes: pad, mechanism under it, the loop of the back frame behind it and both armrests
  const zFrame = zSeat - seatD / 2 - 20;
  const sc: Vec3 = [0, (mechY + armTop + 15) / 2, zSeat - 20];
  const rel = (p: Vec3): Vec3 => [p[0] - sc[0], p[1] - sc[1], p[2] - sc[2]];
  const seatPieces: PartPiece[] = [
    { shape: "box", size: [seatW, seatT, seatD], pos: rel([0, seatTop - seatT / 2, zSeat]), material: "soft" },
    { shape: "box", size: [240, 60, 280], pos: rel([0, mechY + 30, zSeat - 20]) },
    { shape: "box", size: [2 * armX - 40, 30, 30], pos: rel([0, seatTop - seatT - 10, zFrame]) },
    { shape: "box", size: [2 * armX - 40, 30, 30], pos: rel([0, seatTop + 60, zFrame]) },
    ...[-1, 1].flatMap((sx): PartPiece[] => [
      { shape: "box", size: [30, 130, 30], pos: rel([sx * (armX - 35), seatTop + 5, zFrame]) },
      { shape: "box", size: [40, armTop - seatTop + 40, 50], pos: rel([sx * armX, (seatTop - 40 + armTop) / 2, zSeat - 60]) },
      { shape: "box", size: [90, 30, 260], pos: rel([sx * armX, armTop + 15 - 15, zSeat - 20]), material: "soft" },
    ]),
  ];
  const bA: Vec3 = [0, seatTop + 10, zFrame - 20], bB: Vec3 = [0, H - 140, zFrame - 90];
  const headY = H - 80;
  const parts: CustomPart[] = [
    { id: "BASE", name: "Star base", size: [2 * R, 70, 2 * R], pos: [0, baseY, 0], pieces: basePieces, material: "metal" },
    { id: "GAS", name: "Gas lift", shape: "cyl", size: [50, mechY - 90 + 20, 50], pos: [0, (mechY + 20 + 90) / 2, 0], material: "metal" },
    { id: "SEAT", name: "Seat with armrests", size: [2 * armX + 90, armTop + 15 - mechY, seatD + 60], pos: sc, pieces: seatPieces, material: "metal" },
    {
      id: "BACK",
      name: "Backrest",
      size: [480, Math.hypot(bB[1] - bA[1], bB[2] - bA[2]), 40],
      pos: [0, (bA[1] + bB[1]) / 2, (bA[2] + bB[2]) / 2],
      rot: [Math.atan2(bB[2] - bA[2], bB[1] - bA[1]), 0, 0],
      material: "soft",
    },
    { id: "HEAD", name: "Headrest", size: [260, 160, 90], pos: [0, headY, bB[2] + 10], material: "soft" },
  ];
  const tips: Vec3[] = angles.map((a) => [dirOf(a)[0] * R, baseY - 35, dirOf(a)[1] * R]);
  const backBolts = (sx: number): Vec3[] => [seatTop + 20, seatTop + 70].map((y) => [sx * (armX - 20), y, zFrame] as Vec3);
  const zMount = bB[2] - 40;
  return {
    parts,
    steps: [
      {
        title: "Click the castors into the base",
        detail: "Lay the base upside down on a rug. Push each castor's pin into the end of a leg until it clicks.",
        add: ["BASE"],
        fix: [at("castor", tips, [0, 1, 0], "BASE", undefined, { len: 58, dia: 50 })],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Pull the cap off the gas lift", detail: "The plastic cap only protects its thin end in the box, so recycle it.", pose: "+y" },
      { title: "Push the gas lift into the base", detail: "Stand the base on its castors and drop the lift into the hub, thick end down.", add: ["GAS"], from: { GAS: [0, 360, 0] } },
      {
        title: "Lower the seat onto the gas lift together",
        detail: "It comes with its armrests on. Hold it level, straight above the base, and press the hole underneath down over the lift.",
        add: ["SEAT"],
        from: { SEAT: [0, 350, 0] },
        people: 2,
        warnings: ["two"],
      },
      { title: "Sit down and turn once", detail: "Sit on the seat and swivel round a full turn: your weight presses it firmly onto the lift." },
      {
        title: "Bolt the back to the back frame",
        detail: "Set the back's lugs inside the frame behind the seat. Start all four bolts, then tighten them crosswise: top left, bottom right, bottom left, top right.",
        add: ["BACK"],
        fix: [-1, 1].map((sx) => at("bolt", backBolts(sx), [-sx, 0, 0], "SEAT", "BACK", { len: 16, dia: 6 })),
        tools: ["allen"],
        from: { BACK: [0, 250, -200] },
      },
      {
        title: "Push the headrest on and bolt it",
        detail: "Press it straight down onto the mount at the top of the back, then turn in the three small bolts from behind.",
        add: ["HEAD"],
        fix: [at("bolt", [-30, 0, 30].map((dx, i) => [dx, headY - 10 + (i === 1 ? 25 : 0), zMount] as Vec3), [0, 0, 1], "HEAD", "BACK", { len: 12, dia: 5 })],
        tools: ["allen"],
        from: { HEAD: [0, 250, 0] },
      },
      {
        title: "Click the cover ring on",
        detail: "Hook it in at the top of the mount and press the bottom until it clicks.",
        fix: [at("cap", [[0, headY, zMount - 4]], [0, 0, 1], "HEAD", undefined, { name: "Cover ring", len: 6, dia: 70 })],
      },
    ],
  };
}

const family: Family = {
  names: ["BÄSTBOLL", "BASTBOLL"],
  recipe(s) {
    if (/gaming chair/i.test(s.variant) || /bastboll-gaming-chair/.test(s.slug ?? "")) return chair();
    return null;
  },
};
export default family;
