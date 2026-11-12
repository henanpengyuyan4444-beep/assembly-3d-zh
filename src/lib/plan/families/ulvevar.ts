import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * ULVEVÄR, read from the chair's manual. Four woven pieces: two sides (leg, arm and leg in one), the backrest and
 * the seat. The chair is built lying on its left side on a rug: the backrest hooks into the side and takes one bolt,
 * the seat slides in and takes three bolts into the side and two into the backrest. The right side hooks on top, the
 * chair is turned over and that side gets its four bolts. Every bolt has a spring washer and a flat washer. Last,
 * upside down, all ten are tightened with the Allen key and the chair is stood up.
 */

const T = 45; // wrapped leg tube

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 63 wide, 71 deep, 82 high, seat 43 high, 50 wide and 49 deep
  const W = (s.size.w || 63) * 10, D = (s.size.d || 71) * 10, H = (s.size.h || 82) * 10;
  const sw = 56; // a side, across
  const xS = W / 2 - sw / 2, xIn = xS - sw / 2;
  const zF = D / 2 - T / 2, zB = -D / 2 + T / 2;
  const yArm = 640, ySeat = 430, yLow = 260;
  const zSweep = zB + 160; // where the arm starts to rise
  const side = (sx: number): CustomPart => {
    const c: Vec3 = [sx * xS, H / 2, 0];
    const p = (size: Vec3, pos: Vec3, o: Partial<PartPiece> = {}): PartPiece => ({ shape: "box", size, pos: [0, pos[1] - c[1], pos[2]], ...o });
    return {
      id: sx < 0 ? "L" : "R",
      name: sx < 0 ? "Left side" : "Right side",
      size: [sw, H, D],
      pos: c,
      material: "wood",
      pieces: [
        { shape: "cyl", size: [T, yArm, T], pos: [0, yArm / 2 - c[1], zF] },
        { shape: "cyl", size: [T, H - 40, T], pos: [0, (H - 40) / 2 - c[1], zB] },
        // the arm runs back level from the front leg, then sweeps up into the back corner
        p([sw, 50, zF + T / 2 - zSweep], [0, yArm, (zSweep + zF + T / 2) / 2]),
        p([sw, 50, Math.hypot(H - 40 - yArm, zSweep - zB)], [0, (yArm + H - 40) / 2, (zSweep + zB) / 2], { rot: [Math.atan2(H - 40 - yArm, zSweep - zB), 0, 0] }),
        p([sw - 16, yArm - yLow - 40, D - 2 * T], [0, (yArm + yLow) / 2 - 20, 0]),
        p([sw - 10, 30, D - 2 * T], [0, yLow, 0]),
      ],
    };
  };
  const bz = zB + T / 2 + 15;
  const bBot = ySeat - 60;
  const zS0 = bz + 15, zS1 = zF - T / 2;
  const parts: CustomPart[] = [
    side(-1),
    { id: "B", name: "Backrest", size: [2 * xIn, H - 40 - bBot, 30], pos: [0, (bBot + H - 40) / 2, bz], material: "wood" },
    {
      id: "S",
      name: "Seat",
      size: [2 * xIn, ySeat - yLow, zS1 - zS0],
      pos: [0, (ySeat + yLow) / 2, (zS0 + zS1) / 2],
      material: "wood",
      pieces: [
        { shape: "box", size: [2 * xIn, 35, zS1 - zS0], pos: [0, (ySeat - yLow) / 2 - 17.5, 0] },
        { shape: "box", size: [2 * xIn, ySeat - yLow, 30], pos: [0, 0, (zS1 - zS0) / 2 - 15] },
      ],
    },
    side(1),
  ];
  const seatZ = [zS0 + 90, (zS0 + zS1) / 2, zS1 - 70];
  const yS = ySeat - 25;
  const bolt = (sx: number, at: Vec3[], dir: Vec3, on: string, mate: string): CustomFix[] => [
    { kind: "bolt", count: at.length, at, dir, on, mate, len: 40, dia: 6 },
    { kind: "washer", count: at.length, at, dir, on, name: "Spring washer", dia: 6 },
    { kind: "washer", count: at.length, at, dir, on, name: "Washer", dia: 6 },
  ];
  // bolts go from inside the chair out into the side, and from the seat back into the backrest
  const backBolt = (sx: number) => bolt(sx, [[sx * xIn, H - 160, bz]], [sx, 0, 0], "B", sx < 0 ? "L" : "R");
  const seatBolts = (sx: number, zs: number[]) => bolt(sx, zs.map((z): Vec3 => [sx * xIn, yS, z]), [sx, 0, 0], "S", sx < 0 ? "L" : "R");
  const steps: CustomStep[] = [
    {
      title: "Hook the backrest onto the left side",
      detail: "Lay the left side flat on a rug, outside down. Stand the backrest on it and slide its hooks into the slots.",
      add: ["L", "B"],
      pose: "+x",
      warnings: ["floor"],
    },
    { title: "Bolt the backrest to the side", detail: "A spring washer, then a flat washer on the bolt. Turn it in by hand for now.", fix: backBolt(-1), tools: ["allen"], warnings: ["loose"] },
    { title: "Slide the seat in", detail: "Front skirt to the front, pushed against the backrest.", add: ["S"] },
    { title: "Bolt the seat to the side", detail: "Three bolts, each with both washers.", fix: seatBolts(-1, seatZ), tools: ["allen"] },
    {
      title: "Bolt the seat to the backrest",
      detail: "Two bolts through the seat's back edge into the backrest.",
      fix: bolt(0, [-1, 1].map((sx): Vec3 => [sx * 150, yS, zS0]), [0, 0, -1], "S", "B"),
      tools: ["allen"],
    },
    { title: "Hook the right side on", detail: "Lower it onto the backrest and seat and slide its hooks into the slots.", add: ["R"] },
    { title: "Turn the chair over and bolt the seat", detail: "Lay it on the right side and put two bolts into the seat.", fix: seatBolts(1, seatZ.slice(0, 2)), pose: "-x", tools: ["allen"] },
    {
      title: "Put in the last two bolts",
      detail: "One more into the seat and one into the backrest.",
      fix: [...seatBolts(1, seatZ.slice(2)), ...backBolt(1)],
      tools: ["allen"],
    },
    { title: "Tighten all ten bolts", detail: "Stand the chair upside down and tighten every bolt firmly, so the washers press flat.", pose: "-y", tools: ["allen"] },
    { title: "Stand the chair up", detail: "Turn it onto its legs and check it doesn't rock.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["ULVEVÄR", "ULVEVAR"],
  recipe(s) {
    if (!/chair/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
