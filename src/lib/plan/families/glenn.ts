import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GLENN bar stool, read from its manual. Two chrome sled frames, one for each side. Four plastic glides are tapped
 * onto the runners, then the frames are joined: two long bolts with nuts where their top bars meet in the middle
 * (a spanner holds the nut), and one bolt at each end of the footrest. Four cups go on top of the frame. The shell
 * seat lies face down on a cloth and the frame goes on it upside down, four bolts through the cups. Last the long
 * bolts and then the footrest bolts are tightened. IKEA: 50 wide, 48 deep, 89 high, seat 66 high and 37 x 40.
 */

const TUBE = 20;

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, c: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [TUBE, L, TUBE],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, -Math.asin(d[0] / L)],
  };
}

function stool(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 500, D = Math.round(s.size.d * 10) || 480, H = Math.round(s.size.h * 10) || 890;
  const ySeat = 660; // top of the seat
  const yFrame = ySeat - 50; // centre of the top bars, under the cups
  const xFoot = W / 2 - TUBE / 2, xTop = xFoot - 65;
  const zF = D / 2 - 40, zB = -D / 2 + 20, zTop = 160;
  const yRest = 300;
  const legX = (y: number) => xFoot - ((xFoot - xTop) * y) / yFrame;
  const legZ = (z0: number, z1: number, y: number) => z0 + ((z1 - z0) * y) / yFrame;
  // one side: a runner on the floor, a front and a back leg leaning in, a bar along the top and a tab reaching to
  // the middle; the left frame carries the front footrest, the right one the back bar
  const side = (sx: number) => {
    const c: Vec3 = [(sx * (xFoot + TUBE - legX(yRest))) / 2, yFrame / 2, 0]; // the middle of its box: the footrest reaches across
    const p = (x: number, y: number, z: number): Vec3 => [sx * x, y, z];
    const pieces: PartPiece[] = [
      tube(p(xFoot, TUBE / 2, -D / 2 + TUBE / 2), p(xFoot, TUBE / 2, D / 2 - TUBE / 2), c),
      tube(p(xFoot, TUBE / 2, zF), p(xTop, yFrame, zTop), c),
      tube(p(xFoot, TUBE / 2, zB), p(xTop, yFrame, -zTop), c),
      tube(p(xTop, yFrame, zTop), p(xTop, yFrame, -zTop), c),
      tube(p(xTop, yFrame, -sx * 9), p(-20, yFrame, -sx * 9), c),
    ];
    const z = sx < 0 ? legZ(zF, zTop, yRest) : legZ(zB, -zTop, yRest);
    pieces.push(tube(p(legX(yRest), yRest, z), p(-legX(yRest) + TUBE, yRest, z), c));
    return { c, pieces };
  };
  const L = side(-1), R = side(1);
  const shell: PartPiece[] = [
    { shape: "box", size: [370, 25, 400], pos: [0, -100, 30] },
    { shape: "box", size: [370, 240, 22], pos: [0, 30, -190], rot: [-0.18, 0, 0] },
  ];
  const parts: CustomPart[] = [
    { id: "FL", name: "Side frame", size: [xFoot + legX(yRest), yFrame, D], pos: L.c, pieces: L.pieces, material: "metal" },
    { id: "FR", name: "Side frame", size: [xFoot + legX(yRest), yFrame, D], pos: R.c, pieces: R.pieces, material: "metal" },
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz, i): CustomPart => ({ id: `C${sx < 0 ? 0 : 1}${i}`, name: "Cup", shape: "cyl", size: [40, 20, 40], pos: [sx * xTop, yFrame + TUBE / 2 + 10, sz * (zTop - 30)], material: "soft" }))),
    { id: "ST", name: "Seat", size: [370, H - ySeat + 25, 440], pos: [0, ySeat + 100 - 12, -20], pieces: shell },
  ];
  const cups = parts.filter((p) => p.name === "Cup").map((p) => p.id);
  const zRestF = legZ(zF, zTop, yRest), zRestB = legZ(zB, -zTop, yRest);
  return {
    parts,
    steps: [
      {
        title: "Tap the glides onto the runners",
        detail: "Two under each frame's runner, near the ends. Tap them home with a hammer.",
        add: ["FL", "FR"],
        fix: [{ kind: "glide", count: 4, name: "Glide", at: [-1, 1].flatMap((sx) => [zF, zB].map((z): Vec3 => [sx * xFoot, 0, z])), dir: [0, 1, 0] }],
        tools: ["hammer"],
      },
      {
        title: "Bolt the frames together at the top",
        detail: "Where the two top tabs meet in the middle: two long bolts, with a nut held in the channel by a spanner. Loosely for now.",
        fix: [
          { kind: "bolt", count: 2, len: 70, dia: 6, on: "FR", mate: "FL", at: [-40, 40].map((x): Vec3 => [x, yFrame, 18]), dir: [0, 0, -1] },
          { kind: "nut", count: 2, dia: 6, on: "FL", at: [-40, 40].map((x): Vec3 => [x, yFrame, -18]), dir: [0, 0, 1] },
        ],
        tools: ["allen", "wrench"],
      },
      {
        title: "Bolt the footrest ends",
        detail: "One bolt through each frame's leg into the end of the other frame's footrest bar. Loosely too.",
        fix: [
          { kind: "bolt", count: 1, len: 40, dia: 6, on: "FR", mate: "FL", at: [[legX(yRest) + TUBE / 2, yRest, zRestF]], dir: [-1, 0, 0] },
          { kind: "bolt", count: 1, len: 40, dia: 6, on: "FL", mate: "FR", at: [[-legX(yRest) - TUBE / 2, yRest, zRestB]], dir: [1, 0, 0] },
        ],
        tools: ["allen"],
      },
      {
        title: "Press the cups onto the top",
        detail: "One at each corner of the top bars, over the holes.",
        add: cups,
      },
      {
        title: "Bolt the seat on upside down",
        detail: "Lay the seat face down on a cloth on the table and set the frame on it. One bolt through each cup, by hand with the Allen key.",
        add: ["ST"],
        fix: [{ kind: "bolt", count: 4, len: 30, dia: 6, on: "ST", at: [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xTop, yFrame - TUBE / 2, sz * (zTop - 30)])), dir: [0, 1, 0] }],
        tools: ["allen"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Tighten the top bolts",
        detail: "Hold each nut with the spanner and tighten the two long bolts hard.",
        tools: ["allen", "wrench"],
      },
      {
        title: "Tighten the footrest bolts",
        detail: "Then the two bolts at the footrest. Check all the bolts again now and then.",
        tools: ["allen"],
      },
    ],
  };
}

const family: Family = {
  names: ["GLENN"],
  recipe(s) {
    if (/bar-stool/.test(s.slug ?? "")) return stool(s);
    return null;
  },
};
export default family;
