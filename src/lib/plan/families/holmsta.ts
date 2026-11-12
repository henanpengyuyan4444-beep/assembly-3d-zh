import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * HOLMSTA, read from the armchair's manual. The rattan chair comes as four frames: two sides (legs, armrest and
 * spindles in one), the woven seat and the spindle back. It is built lying on its left side: the seat and then the
 * back stand on the side frame on the floor and are bolted down through their own frames, three bolts each with a
 * spring washer and a washer, only loosely. The other side drops on top and takes six more bolts, then four
 * screw-in glides go into the legs. Stood up and pressed down so all four feet touch, the twelve bolts are
 * tightened. With FRÖKNABO the seat and back cushions go on last.
 */

const BOLT = { len: 60, dia: 6 };
const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function recipe(s: ProductSpec): CustomParams | null {
  if (!/holmsta/i.test(s.slug ?? s.name)) return null;
  const cushions = /fr[oö]knabo/i.test(`${s.slug ?? ""} ${s.name}`);
  // IKEA's measures for the frame: 62 wide, 73 high, 75 deep, seat 33 high and 55 wide
  const W = 620, H = 730, D = 750;
  const L = 40; // rattan pole
  const xs = W / 2 - L / 2;
  const inner = W - 2 * L;
  const armY = 570, seatY = 300, seatT = 70;
  const zb = -D / 2 + L / 2, zf = D / 2 - L / 2;

  const sidePieces: PartPiece[] = [
    { shape: "cyl", size: [L, armY + 10, L], pos: [0, (armY + 10) / 2 - H / 2, zf] },
    { shape: "cyl", size: [L, H, L], pos: [0, 0, zb] },
    { shape: "cyl", size: [L, D - L, L], pos: [0, armY - H / 2, 0], rot: [Math.PI / 2, 0, 0] },
    { shape: "box", size: [L, seatT, D - 2 * L], pos: [0, seatY - H / 2, 0] },
    { shape: "box", size: [16, 16, D - 2 * L], pos: [0, 450 - H / 2, 0] },
    ...[-250, -150, -50, 50, 150, 250].map((z): PartPiece => ({ shape: "cyl", size: [14, armY - seatY - seatT / 2, 14], pos: [0, (armY + seatY + seatT / 2) / 2 - H / 2, z] })),
  ];
  const seatZ0 = zb + L / 2, seatZ1 = zf + L / 2 - 10;
  const seatD = seatZ1 - seatZ0;
  const seatPieces: PartPiece[] = [
    { shape: "box", size: [inner, 14, seatD], pos: [0, seatT / 2 - 7, 0] },
    { shape: "box", size: [inner, seatT, 36], pos: [0, 0, seatD / 2 - 18] },
    { shape: "box", size: [inner, seatT, 36], pos: [0, 0, -seatD / 2 + 18] },
    { shape: "box", size: [36, seatT, seatD], pos: [-inner / 2 + 18, 0, 0] },
    { shape: "box", size: [36, seatT, seatD], pos: [inner / 2 - 18, 0, 0] },
  ];
  const backY0 = seatY + seatT / 2, backH = H - backY0;
  const backPieces: PartPiece[] = [
    { shape: "cyl", size: [L, inner, L], pos: [0, backH / 2 - L / 2, 0], rot: [0, 0, Math.PI / 2] },
    { shape: "box", size: [inner, 40, 30], pos: [0, -backH / 2 + 20, 0] },
    { shape: "box", size: [inner, 14, 16], pos: [0, 20, 0] },
    ...[-210, -140, -70, 0, 70, 140, 210].map((x): PartPiece => ({ shape: "cyl", size: [14, backH - 60, 14], pos: [x, 0, 0] })),
  ];
  const parts: CustomPart[] = [
    { id: "SL", name: "Side frame", size: [L, H, D], pos: [-xs, H / 2, 0], pieces: sidePieces, material: "wood" },
    { id: "SR", name: "Side frame", size: [L, H, D], pos: [xs, H / 2, 0], pieces: sidePieces, material: "wood" },
    { id: "SEAT", name: "Woven seat", size: [inner, seatT, seatD], pos: [0, seatY, (seatZ0 + seatZ1) / 2], pieces: seatPieces, material: "wood" },
    { id: "BACK", name: "Back frame", size: [inner, backH, L], pos: [0, backY0 + backH / 2, zb], pieces: backPieces, material: "wood" },
  ];
  if (cushions) {
    parts.push({ id: "CS", name: "Seat cushion", size: [inner - 10, 110, seatD - 70], pos: [0, seatY + seatT / 2 + 55, seatZ0 + 70 + (seatD - 70) / 2], material: "soft" });
    parts.push({ id: "CB", name: "Back cushion", size: [inner - 10, 420, 120], pos: [0, seatY + seatT / 2 + 110 + 210, zb + L / 2 + 60], rot: [-0.12, 0, 0], material: "soft" });
  }

  const seatZs = [seatZ0 + 90, (seatZ0 + seatZ1) / 2, seatZ1 - 90];
  const backYs = [backY0 + 60, backY0 + backH / 2, H - 60];
  const bolts = (sx: number, pts: Vec3[], on: string, mate: string): CustomFix[] => [
    at("washer", pts, [sx, 0, 0], on, undefined, { len: 1.5, dia: 16 }),
    at("washer", pts, [sx, 0, 0], on, undefined, { len: 2, dia: 12, name: "Spring washer" }),
    at("bolt", pts, [sx, 0, 0], on, mate, BOLT),
  ];
  const seatPts = (sx: number) => seatZs.map((z) => [sx * (inner / 2 - 40), seatY, z] as Vec3);
  const backPts = (sx: number) => backYs.map((y) => [sx * (inner / 2 - 40), y, zb] as Vec3);
  const feet = [-1, 1].flatMap((sx) => [zb, zf].map((z) => [sx * xs, 0, z] as Vec3));

  const steps: CustomStep[] = [
    {
      title: "Bolt the seat onto a side frame",
      detail: "Lay the left side frame on a rug, outside down, and stand the seat on it. Three bolts through the seat frame, each with a spring washer and a washer: only snug them for now.",
      add: ["SL", "SEAT"],
      fix: bolts(-1, seatPts(-1), "SEAT", "SL"),
      pose: "+x",
      warnings: ["floor", "loose"],
      tools: ["allen"],
    },
    {
      title: "Bolt the back frame on beside it",
      detail: "Stand the back on the same side frame, behind the seat. Three more bolts with their washers, still loose.",
      add: ["BACK"],
      fix: bolts(-1, backPts(-1), "BACK", "SL"),
      warnings: ["loose"],
      tools: ["allen"],
    },
    {
      title: "Lay the other side frame on top",
      detail: "Line its holes up with the seat and the back, then six bolts with washers from inside the frames. Keep them loose.",
      add: ["SR"],
      fix: bolts(1, [...seatPts(1), ...backPts(1)], "SEAT", "SR"),
      warnings: ["loose"],
      tools: ["allen"],
    },
    {
      title: "Screw a glide into each leg",
      detail: "Turn each one in by hand until it sits flat against the end of the leg.",
      fix: [at("glide", feet, [0, 1, 0], undefined, undefined, { len: 12, dia: 24, name: "Screw-in glide" })],
    },
    {
      title: "Stand it up and tighten every bolt",
      detail: "Press down on the chair so all four legs touch the floor, then tighten all twelve bolts with the Allen key.",
      pose: "+y",
      tools: ["allen"],
      kind: "bolts",
    },
  ];
  if (cushions)
    steps.push(
      { title: "Lay the seat cushion in", detail: "Push it back against the back frame, zip to the back.", add: ["CS"] },
      { title: "Stand the back cushion against the back", detail: "It rests on the seat cushion and leans on the spindles.", add: ["CB"] },
    );
  return { parts, steps };
}

const family: Family = { names: ["HOLMSTA"], recipe };
export default family;
