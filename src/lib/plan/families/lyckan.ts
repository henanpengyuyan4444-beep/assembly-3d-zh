import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LYCKAN, read from the dining chair's manual. Everything is done with the seat upside down on a table. The two bent
 * birch side frames drop into the slots under the seat, a rail goes between their back uprights on two long bolts
 * (turned in only to the stop), the frames are bolted up into the seat and the long bolts tightened. The crossbar is
 * screwed into the notches in the floor runners, the two back supports are bolted under the seat and the backrest is
 * bolted onto them.
 */

const BAND = 42, PLY = 24; // the bent birch strips: across, thick

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: PartMaterial): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

/** A straight run of bent plywood from a to b (in the y-z plane), BAND wide across the chair. */
function strip(a: Vec3, b: Vec3, w = BAND, t = PLY): PartPiece {
  const len = Math.hypot(b[1] - a[1], b[2] - a[2]);
  return { shape: "box", size: [w, t, len + t], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [-Math.atan2(b[1] - a[1], b[2] - a[2]), 0, 0] };
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function chair(s: ProductSpec): CustomParams {
  // IKEA: 45 wide, 51 deep, 83 high; the seat 46 high, 45 wide and 42 deep
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const seatTop = 460, seatT = 16;
  const yS = seatTop - seatT; // underside of the seat
  const xf = W / 2 - BAND / 2;
  const zFr = D / 2 - 20, zBk = -D / 2 + 50; // seat front, back uprights of the frames
  const yRail = yS - PLY / 2, yRun = PLY / 2;
  const frame = (sx: number) => {
    const x = sx * xf;
    const abs = [strip([x, yRail, zBk], [x, yRail, zFr - 60]), strip([x, yRail, zBk], [x, yRun, zBk]), strip([x, yRun, zBk], [x, yRun, D / 2 - PLY / 2])];
    return part(sx < 0 ? "SL" : "SR", "Side frame", abs, [x - BAND / 2, 0, zBk - PLY / 2], [x + BAND / 2, yS, D / 2], "wood");
  };
  // the back supports: a foot under the seat, then up and leaning back
  const xu = 120, zU0 = -90, zU1 = zBk - 10, yU1 = H - 60, zU2 = -D / 2 + 12;
  const support = (sx: number) => {
    const x = sx * xu;
    const abs = [strip([x, yS - 10, zU0], [x, yS - 10, zU1], 50, 20), strip([x, yS - 10, zU1], [x, yU1, zU2], 50, 20)];
    return part(sx < 0 ? "BL" : "BR", "Back support", abs, [x - 25, yS - 20, zU2 - 12], [x + 25, yU1 + 10, zU0 + 10], "wood");
  };
  const zBR = zU2 + 22, bh = 230;
  const parts: CustomPart[] = [
    {
      id: "SEAT",
      name: "Seat",
      size: [W - 30, seatT, zFr - zBk + 10],
      pos: [0, seatTop - seatT / 2, (zFr + zBk) / 2],
      material: "wood",
    },
    frame(-1),
    frame(1),
    { id: "RAIL", name: "Back rail", shape: "cyl", size: [2 * xf - BAND, 18, 18], pos: [0, 240, zBk], material: "metal" },
    { id: "BAR", name: "Crossbar", size: [2 * xf + BAND, PLY, 60], pos: [0, yRun, D / 2 - 90], material: "wood" },
    support(-1),
    support(1),
    { id: "BACK", name: "Backrest", size: [W - 40, bh, 14], pos: [0, H - bh / 2, zBR], material: "wood" },
  ];
  const BOLT = { name: "Allen bolt", dia: 6 };
  const railBolts = [-1, 1].map((sx) => fx("bolt", [[sx * (xf + BAND / 2), 240, zBk]], [-sx, 0, 0], sx < 0 ? "SL" : "SR", { ...BOLT, len: 50, mate: "RAIL" }));
  const seatBolts = fx("bolt", [-1, 1].flatMap((sx) => [zBk + 90, zFr - 110].map((z): Vec3 => [sx * xf, yRail - PLY / 2, z])), [0, 1, 0], "SL", { ...BOLT, len: 35, mate: "SEAT" });
  seatBolts.on = undefined;
  const barScrews = fx("screw", [-1, 1].flatMap((sx) => [-25, 0, 25].map((dz): Vec3 => [sx * xf, 0, D / 2 - 90 + dz])), [0, 1, 0], "BAR", { name: "Wood screw", len: 16, dia: 4 });
  const supportBolts = [-1, 1].map((sx) => fx("bolt", [zU0 - 25, zU1 + 35].map((z): Vec3 => [sx * xu, yS - 20, z]), [0, 1, 0], sx < 0 ? "BL" : "BR", { ...BOLT, len: 35, mate: "SEAT" }));
  const backBolts = [-1, 1].map((sx) => fx("bolt", [[sx * xu, H - 110, zU2 - 10]], [0, 0, 1], sx < 0 ? "BL" : "BR", { ...BOLT, len: 35, mate: "BACK" }));
  return {
    parts,
    steps: [
      {
        title: "Drop the side frames into the seat",
        detail: "Lay the seat upside down on a table with a cloth under it. Each frame's rail fits the slots on its side, runners up.",
        add: ["SEAT", "SL", "SR"],
        pose: "-y",
      },
      {
        title: "Fit the rail between the frames",
        detail: "Two long bolts from bag 1 through the back uprights into the rail ends. Turn them in only until they stop, leaving a small gap.",
        add: ["RAIL"],
        fix: railBolts,
        tools: ["allen"],
        warnings: ["loose"],
      },
      { title: "Bolt the frames to the seat", detail: "Two bolts from bag 2 through each frame's rail into the seat, tight.", fix: [seatBolts], tools: ["allen"] },
      { title: "Tighten the rail bolts", detail: "Now turn both long bolts in fully.", tools: ["allen"] },
      {
        title: "Screw on the crossbar",
        detail: "It sits in the notches across the front of the runners. Three wood screws into each runner.",
        add: ["BAR"],
        fix: [barScrews],
        tools: ["screwdriver"],
      },
      { title: "Bolt the back supports under the seat", detail: "Their feet lie on the back of the seat, the uprights leaning back over the edge of the table. Two bolts each.", add: ["BL", "BR"], fix: supportBolts, tools: ["allen"] },
      { title: "Bolt on the backrest", detail: "Hold it against the supports and fit one bolt with a washer through each from behind.", add: ["BACK"], fix: backBolts, tools: ["allen"] },
      { title: "Stand the chair up", detail: "Check every bolt once more after a week of use.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["LYCKAN"],
  recipe: (s) => (/chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair(s) : null),
};
export default family;
