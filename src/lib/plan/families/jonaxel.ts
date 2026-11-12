import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * JONAXEL, read from the frame's and the shelf unit's manuals. All steel, no panels. The frame is two welded side
 * ladders (posts with basket runners) joined by four bent rails whose plugged ends are tapped into the post ends,
 * top pair first, then upside down for the bottom pair and the four feet. The shelf unit starts on its back: four
 * posts screwed to five steel shelves (20 screws), then the same rails and feet. Both get two wall clips on the back
 * posts. The stacking clips and skirting spacers in the bag are only for stacking or a skirting board.
 */

const P = 18; // square post
const FOOT = 8;
const Y_LO = FOOT + P / 2; // bottom rails
const RUNNER_TOP = 40, RUNNER_GAP = 145; // frame: four basket runners down from the top

const box = (size: [number, number, number], pos: [number, number, number]): PartPiece => ({ shape: "box", size, pos });

function dims(s: ProductSpec) {
  return { W: s.size.w * 10, H: s.size.h * 10, D: s.size.d * 10 };
}

/** The four feet, screwed up into the ends of the bottom rails. */
function feet(W: number, D: number): CustomFix {
  const at = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (W / 2 - P / 2), 0, sz * (D / 2 - P / 2)] as Vec3));
  return { kind: "foot", name: "Adjustable foot", count: 4, len: 20, dia: 8, at, dir: [0, 1, 0] };
}

/** Two clips clicked onto the back posts near the top, each screwed to the wall (plugs and screws not included). */
function wallStep(W: number, H: number, D: number, on: [string, string]): CustomStep {
  const y = H - 60, zb = -D / 2;
  const xs = [-1, 1].map((sx) => sx * (W / 2 - P / 2));
  return {
    title: "Clip it to the wall",
    detail: "Click a wall clip onto each back post near the top, then screw them to the wall. Against a skirting board, put the square spacers behind the clips. Wall screws aren't included: pick ones made for your wall.",
    fix: [
      { kind: "bracket", name: "Wall clip", count: 1, at: [[xs[0], y, zb]], dir: [0, 0, 1], on: on[0] },
      { kind: "bracket", name: "Wall clip", count: 1, at: [[xs[1], y, zb]], dir: [0, 0, 1], on: on[1] },
      { kind: "plug", count: 2, at: xs.map((x) => [x, y, zb - 12] as Vec3), dir: [0, 0, -1] },
      { kind: "screw", count: 2, len: 50, dia: 5, at: xs.map((x) => [x, y, zb - 10] as Vec3), dir: [0, 0, -1] },
    ],
    tools: ["screwdriver", "drill", "pencil"],
    wall: true,
    warnings: ["wall", "tip"],
  };
}

/** The 25 and 50 cm frames: side ladders across the depth, rails across the width at front and back. */
function frame(s: ProductSpec) {
  const { W, H, D } = dims(s);
  const yTop = H - P / 2;
  const postH = yTop - Y_LO - P;
  const cy = (Y_LO + yTop) / 2;
  const parts: CustomPart[] = [];
  for (const [i, sx] of [-1, 1].entries()) {
    const x = sx * (W / 2 - P / 2);
    const pieces: PartPiece[] = [-1, 1].map((sz) => box([P, postH, P], [0, 0, sz * (D / 2 - P / 2)]));
    for (let k = 0; k < 4; k++) pieces.push(box([12, 20, D - 2 * P], [-sx * (P / 2 + 6), H - RUNNER_TOP - k * RUNNER_GAP - cy, 0]));
    parts.push({ id: `L${i}`, name: "Side frame", size: [P, postH, D], pos: [x, cy, 0], material: "metal", pieces });
  }
  const rail = (id: string, y: number, sz: number): CustomPart => ({ id, name: "Rail", size: [W, P, P], pos: [0, y, sz * (D / 2 - P / 2)], material: "metal" });
  parts.push(rail("TF", yTop, 1), rail("TB", yTop, -1), rail("BF", Y_LO, 1), rail("BB", Y_LO, -1));
  const steps: CustomStep[] = [
    {
      title: "Tap the top rails onto the side frames",
      detail: "Stand the side frames on the packaging, runners facing each other. Push the plugged rail ends into the posts, then tap them home with the plastic block between hammer and rail.",
      add: ["L0", "L1", "TF", "TB"],
      tools: ["hammer"],
      warnings: ["floor"],
    },
    {
      title: "Turn it over and tap on the bottom rails",
      detail: "The same way: plugs into the post ends, tapped down through the block.",
      add: ["BF", "BB"],
      tools: ["hammer"],
      pose: "-y",
    },
    { title: "Screw in the feet", detail: "One into each corner of the bottom rails, by hand.", fix: [feet(W, D)] },
    {
      title: "Stand it up and level it",
      detail: "Put it where it will go and turn the feet until it stands level and steady.",
      pose: "+y",
      tools: ["level"],
    },
    wallStep(W, H, D, ["L0", "L1"]),
  ];
  return { parts, steps };
}

/** The 80 cm shelf unit: four posts and five steel shelves, side rails across the depth at top and bottom. */
function shelfUnit(s: ProductSpec) {
  const { W, H, D } = dims(s);
  const yTop = H - P / 2;
  const y0 = Y_LO + P / 2, y1 = yTop - P / 2;
  const n = 5;
  const shelfY = (i: number) => 150 + ((H - 60 - 150) * i) / (n - 1);
  const parts: CustomPart[] = [];
  const xs = (sx: number) => sx * (W / 2 - P / 2);
  const zs = (sz: number) => sz * (D / 2 - P / 2);
  for (const [i, sx] of [-1, 1].entries())
    for (const [j, sz] of [-1, 1].entries()) parts.push({ id: `P${i}${j}`, name: "Post", size: [P, y1 - y0, P], pos: [xs(sx), (y0 + y1) / 2, zs(sz)], material: "metal" });
  for (let k = 0; k < n; k++) parts.push({ id: `S${k}`, name: "Shelf", size: [W - 2 * P, 20, D - 2], pos: [0, shelfY(k), 0], material: "metal" });
  const rail = (id: string, y: number, sx: number): CustomPart => ({ id, name: "Rail", size: [P, P, D], pos: [xs(sx), y, 0], material: "metal" });
  parts.push(rail("TL", yTop, -1), rail("TR", yTop, 1), rail("BL", Y_LO, -1), rail("BR", Y_LO, 1));
  // one screw through each post into each shelf corner, from the outside
  const screws: CustomFix[] = [-1, 1].map((sx) => ({
    kind: "screw",
    count: 2 * n,
    len: 16,
    dia: 6,
    at: [-1, 1].flatMap((sz) => Array.from({ length: n }, (_, k) => [sx * (W / 2), shelfY(k), zs(sz)] as Vec3)),
    dir: [-sx, 0, 0],
  }));
  const posts = parts.filter((p) => p.id.startsWith("P")).map((p) => p.id);
  const shelves = parts.filter((p) => p.id.startsWith("S")).map((p) => p.id);
  const steps: CustomStep[] = [
    {
      title: "Screw the posts to the shelves",
      detail: "Lay the shelves on a rug with the posts along them. The holes sit closer to one end of each post: that end goes at the bottom. One screw at every shelf corner, 20 in all.",
      add: [...shelves, ...posts],
      fix: screws,
      tools: ["allen"],
      pose: "+z",
      warnings: ["floor"],
    },
    {
      title: "Stand it up and tap on the top rails",
      detail: "Push the plugged rail ends into the post tops, then tap them home with the plastic block between hammer and rail.",
      add: ["TL", "TR"],
      tools: ["hammer"],
      pose: "+y",
    },
    { title: "Turn it over and tap on the bottom rails", detail: "The same way, through the block.", add: ["BL", "BR"], tools: ["hammer"], pose: "-y" },
    { title: "Screw in the feet", detail: "One into each corner of the bottom rails, by hand.", fix: [feet(W, D)] },
    { title: "Stand it up and level it", detail: "Turn the feet until it stands level and steady against the wall.", pose: "+y", tools: ["level"] },
    wallStep(W, H, D, ["P00", "P10"]),
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["JONAXEL"],
  recipe(s) {
    const v = `${s.variant} ${s.slug ?? ""}`;
    if (/shelf unit/i.test(v)) return shelfUnit(s);
    if (/frame/i.test(v)) return frame(s);
    return null;
  },
};
export default family;
