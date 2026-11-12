import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * HÖGVED, read from the chair's manual. The seat comes with its spindle back already fixed. The underframe is two
 * side frames (a front and a back leg joined by a bearer on top and a rail lower down) and one cross stretcher: it is
 * pushed into one side frame's rail, the other side frame is pushed on, and a long screw through each rail holds it.
 * The seat is laid upside down on a cloth on a table, the underframe is turned over onto it, and six bolts with
 * washers go up through the bearers into the seat.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** A round bar from a to b, as a piece of a part centred at c. */
function bar(a: Vec3, b: Vec3, c: Vec3, dia: number): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [dia, len, dia],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}

function chair(): CustomParams {
  // IKEA: 40 wide, 51 deep, 86 high, seat 45 high
  const H = 860, ySeat = 450, tSeat = 30;
  const yBear = ySeat - tSeat, hBear = 25;
  const xTop = 135, xFoot = 175, zTop = 150, zFoot = 235;
  const yRail = 200;
  const lerp = (a: number, b: number, y: number) => a + ((b - a) * (yBear - hBear - y)) / (yBear - hBear);
  const xRail = lerp(xTop, xFoot, yRail), zRail = lerp(zTop, zFoot, yRail);
  const LEG = 32, RAIL = 18;

  const side = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * (xTop + xFoot) / 2, yBear / 2, 0];
    const y0 = yBear - hBear;
    return {
      id,
      name: "Side frame",
      size: [xFoot - xTop + LEG, yBear, 2 * zFoot + LEG],
      pos: c,
      material: "wood",
      pieces: [
        { shape: "box", size: [40, hBear, 2 * zTop + 50], pos: [sx * xTop - c[0], y0 + hBear / 2 - c[1], 0] },
        ...[-1, 1].map((sz) => bar([sx * xTop, y0, sz * zTop], [sx * xFoot, 0, sz * zFoot], c, LEG)),
        bar([sx * xRail, yRail, -zRail], [sx * xRail, yRail, zRail], c, RAIL),
      ],
    };
  };

  // the seat with its spindle back, in one piece
  const zSeat0 = -210, zSeat1 = 210, zBack0 = zSeat0 + 30, zBack1 = -235;
  const sc: Vec3 = [0, (yBear + H) / 2, (zBack1 - 12 + zSeat1) / 2];
  const seat: CustomPart = {
    id: "S",
    name: "Seat with back",
    size: [400, H - yBear, zSeat1 - zBack1 + 12],
    pos: sc,
    material: "wood",
    pieces: [
      { shape: "box", size: [400, tSeat, zSeat1 - zSeat0], pos: [0, ySeat - tSeat / 2 - sc[1], (zSeat0 + zSeat1) / 2 - sc[2]] },
      ...Array.from({ length: 7 }, (_, i) => bar([-150 + i * 50, ySeat, zBack0], [-165 + i * 55, H - 50, zBack1], sc, 14)),
      { shape: "box", size: [400, 60, 25], pos: [0, H - 30 - sc[1], zBack1 - sc[2]], rot: [-0.12, 0, 0] },
    ],
  };

  const parts: CustomPart[] = [
    side("L", -1),
    { id: "X", name: "Cross stretcher", shape: "cyl", size: [2 * xRail, RAIL, RAIL], pos: [0, yRail, 0], material: "wood" },
    side("R", 1),
    seat,
  ];
  const seatBolts = (sx: number): Vec3[] => [-110, 0, 110].map((z) => [sx * xTop, yBear - hBear, z] as Vec3);

  return {
    parts,
    steps: [
      {
        title: "Push the stretcher into a side frame",
        detail: "Stand one side frame on its legs and push the end of the cross stretcher into the hole in its rail.",
        add: ["L", "X"],
        from: { X: [300, 0, 0] },
      },
      { title: "Push the other side frame on", detail: "Line it up the same way round and press its rail onto the free end.", add: ["R"], from: { R: [300, 0, 0] } },
      {
        title: "Screw the stretcher in place",
        detail: "One long screw through each rail into the end of the stretcher. Turn them with the Allen key until tight.",
        fix: [-1, 1].map((sx) => at("bolt", [[sx * (xRail + RAIL / 2), yRail, 0]], [-sx, 0, 0], sx < 0 ? "L" : "R", "X", { len: 80, dia: 6, name: "Long screw" })),
        tools: ["allen"],
      },
      {
        title: "Turn the underframe onto the seat",
        detail: "Lay the seat upside down on a cloth on a table, back hanging over the edge. Turn the underframe over onto it so the holes line up.",
        add: ["S"],
        pose: "-y",
        from: { S: [0, -300, 0] },
      },
      {
        title: "Bolt the seat on",
        detail: "Three bolts with washers through each bearer. Tighten them all firmly.",
        fix: [-1, 1].flatMap((sx) => [
          at("bolt", seatBolts(sx), [0, 1, 0], sx < 0 ? "L" : "R", "S", { len: 50, dia: 6 }),
          at("washer", seatBolts(sx), [0, 1, 0], sx < 0 ? "L" : "R", "S"),
        ]),
        tools: ["allen"],
      },
      { title: "Stand the chair up", detail: "Check all four legs touch the floor; tighten the bolts again after a week.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["HÖGVED", "HOGVED"],
  recipe(s) {
    if (/chair/i.test(s.variant) || /hogved-chair/.test(s.slug ?? "")) return chair();
    return null;
  },
};
export default family;
