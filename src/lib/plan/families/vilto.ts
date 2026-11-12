import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * VILTO, read from its two manuals (solid birch).
 * Shelving unit: each side is a ladder that comes in one piece. Lying on its back, three shelves are screwed to one
 * ladder with two long connector screws each; two more shelves get four dowels each. Turned onto its side, the
 * dowelled shelves push into the ladder, the second ladder goes on top and takes six connector screws. Four
 * adjustable feet screw into the posts, it is stood up and levelled, and a bracket ties the top to the wall.
 * Step stool: each side is a pair of splayed legs on a rail. Upside down, one side is screwed to the seat with two
 * screws, the two stretchers plug in, the other side goes on and is screwed down, and four connector screws go
 * through the legs into the stretchers.
 */

function fx(kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix {
  return { kind, count: at.length, at, dir, ...(on ? { on } : {}), ...o };
}

/** A round leg or rail from a to b (any direction), as a piece of a part centred on c. */
function tube(a: Vec3, b: Vec3, dia: number, c: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(d[2], d[1]), 0, -Math.asin(d[0] / len)] };
}

const CONNECTOR = { len: 70, dia: 7, name: "Connector screw" };

function shelving(s: ProductSpec): CustomParams {
  // IKEA: 46 wide, 26 deep, 150 high, five shelves
  const W = Math.round(s.size.w * 10) || 460, H = Math.round(s.size.h * 10) || 1500, D = 260;
  const P = 30, xs = W / 2 - P / 2, xi = W / 2 - P, zp = D / 2 - P / 2, foot = 10;
  const ys = [0.232, 0.415, 0.599, 0.781, 0.964].map((f) => Math.round(H * f)); // shelf tops, from the photo
  const ladder = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * xs, (H + foot) / 2, 0];
    const pieces: PartPiece[] = [
      ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [P, H - foot, P], pos: [0, 0, sz * zp] })),
      ...[0.13, 0.5, 0.87].map((f): PartPiece => tube([sx * xs, ys[0] - 120 + f * (ys[4] - ys[0]), -zp], [sx * xs, ys[0] - 120 + f * (ys[4] - ys[0]), zp], 22, c)),
    ];
    return { id, name: "Side", size: [P, H - foot, D], pos: c, pieces, material: "wood" };
  };
  const parts: CustomPart[] = [
    ladder("SL", -1),
    ...ys.map((y, i): CustomPart => ({ id: `SH${i}`, name: "Shelf", size: [2 * xi, 18, D], pos: [0, y - 9, 0], material: "wood" })),
    ladder("SR", 1),
  ];
  const screws = (sx: number, i: number) => fx("bolt", [-1, 1].map((sz): Vec3 => [sx * (W / 2), ys[i] - 9, sz * zp]), [-sx, 0, 0], sx < 0 ? "SL" : "SR", { ...CONNECTOR, mate: `SH${i}` });
  const dowels = (i: number) => [-1, 1].flatMap((sx) => fx("dowel", [-1, 1].map((sz): Vec3 => [sx * xi, ys[i] - 9, sz * zp]), [sx, 0, 0], `SH${i}`, { mate: sx < 0 ? "SL" : "SR" }));
  const yb = ys[4] - 30;
  const steps: CustomStep[] = [
    {
      title: "Screw the first shelf to one side",
      detail: "Lay the side on its back edge on a rug. Take the shelves from the stack with their holes the right way, and turn two connector screws through the posts into the shelf.",
      add: ["SL", "SH0"],
      fix: [screws(-1, 0)],
      pose: "+z",
      warnings: ["floor"],
    },
    { title: "Screw on the middle shelf", detail: "Two more connector screws, the same way.", add: ["SH2"], fix: [screws(-1, 2)] },
    { title: "Screw on the top shelf", detail: "Two more, then check all three sit square to the side.", add: ["SH4"], fix: [screws(-1, 4)] },
    { title: "Push the dowels into the other two shelves", detail: "Four in each shelf, two at each end.", fix: [...dowels(1), ...dowels(3)], wait: ["SH1", "SH3"] },
    { title: "Turn it over and fit the dowelled shelves", detail: "Lay the side flat on the rug. Push the two shelves' dowels into the posts, between the screwed shelves.", add: ["SH1", "SH3"], pose: "+x" },
    { title: "Lay the other side on top", detail: "Line up the dowels with the holes in its posts and press it down.", add: ["SR"], from: { SR: [300, 0, 0] } },
    { title: "Screw the other side to the shelves", detail: "Six connector screws, two into each of the screwed shelves.", fix: [screws(1, 0), screws(1, 2), screws(1, 4)] },
    { title: "Screw the feet into the posts", detail: "One into the bottom of each post, by hand.", fix: [fx("foot", [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xs, foot, sz * zp])), [0, 1, 0], undefined, { len: 20, dia: 20, name: "Adjustable foot" })], tools: [] },
    { title: "Stand it up and level it", detail: "Turn the feet until it stands steady and straight against the wall.", pose: "+y", tools: ["level"], kind: "legs" },
    {
      title: "Fix it to the wall",
      detail: "Screw the bracket under the top shelf at the back, then to the wall. Wall screws aren't included: pick ones made for your wall.",
      fix: [
        fx("bracket", [[0, yb, -D / 2]], [0, 0, -1], "SH4"),
        fx("screw", [[0, ys[4] - 18, -D / 2 + 20]], [0, 1, 0], "SH4", { len: 16, dia: 4 }),
        fx("washer", [[0, yb, -D / 2 - 2], [0, yb, -D / 2 - 4]], [0, 0, -1], undefined, { name: "Washer" }),
        fx("plug", [[0, yb, -D / 2 - 6]], [0, 0, -1]),
        fx("screw", [[0, yb, -D / 2 - 4]], [0, 0, -1], undefined, { len: 50, dia: 5 }),
      ],
      wall: true,
      warnings: ["wall", "tip"],
    },
  ];
  return { parts, steps };
}

function stool(): CustomParams {
  // IKEA: 40 wide, 32 deep, 25 high
  const H = 250, seatT = 22, under = H - seatT, L = 32;
  const xt = 160, xf = 182, zt = 100, zf = 136; // leg centres at the top and at the floor
  const at = (y: number, a: number, b: number) => a + ((b - a) * (under - y)) / under;
  const yR = under - 14; // the rail under the seat
  const yS = 110; // the stretchers
  const side = (id: string, sx: number): CustomPart => {
    const c: Vec3 = [sx * (xt + xf) / 2, under / 2, 0];
    const pieces: PartPiece[] = [
      ...[-1, 1].map((sz) => tube([sx * xt, under, sz * zt], [sx * xf, 0, sz * zf], L, c)),
      { shape: "box", size: [28, 28, 2 * zt], pos: [sx * xt - c[0], yR - c[1], 0] },
    ];
    return { id, name: "Leg frame", size: [xf - xt + L, under, 2 * zf + L], pos: c, pieces, material: "wood" };
  };
  const xs = at(yS, xt, xf) - L / 2, zs = at(yS, zt, zf);
  const parts: CustomPart[] = [
    { id: "SEAT", name: "Seat", size: [400, seatT, 300], pos: [0, under + seatT / 2, 0], material: "wood" },
    side("SL", -1),
    ...[-1, 1].map((sz, i): CustomPart => ({ id: `ST${i}`, name: "Stretcher", size: [2 * xs, 24, 24], pos: [0, yS, sz * zs], shape: "cyl", material: "wood" })),
    side("SR", 1),
  ];
  const seatScrews = (sx: number) => fx("screw", [-1, 1].map((sz): Vec3 => [sx * xt, yR - 14, sz * 60]), [0, 1, 0], sx < 0 ? "SL" : "SR", { len: 30, dia: 4, mate: "SEAT" });
  const legScrews = [-1, 1].flatMap((sx) => [-1, 1].map((sz, i) => fx("bolt", [[sx * (xs + L), yS, sz * zs]], [-sx, 0, 0], sx < 0 ? "SL" : "SR", { ...CONNECTOR, len: 60, mate: `ST${i}` })));
  return {
    parts,
    steps: [
      { title: "Screw a leg frame to the seat", detail: "Lay the seat upside down on a rug. Two screws down through the frame's rail, by hand, not with a drill.", add: ["SEAT", "SL"], fix: [seatScrews(-1)], pose: "-y", warnings: ["floor"] },
      { title: "Push the stretchers into the legs", detail: "Their ends go into the holes on the inside of the legs.", add: ["ST0", "ST1"] },
      { title: "Fit the other leg frame onto them", detail: "Push its legs over the free ends of the stretchers.", add: ["SR"] },
      { title: "Screw that frame to the seat", detail: "Two more screws through its rail.", fix: [seatScrews(1)] },
      { title: "Screw the legs to the stretchers", detail: "Four connector screws, one through each leg into the stretcher end. Tighten them with the Allen key in its holder.", fix: legScrews },
    ],
  };
}

const family: Family = {
  names: ["VILTO"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/vilto-shelving-unit/.test(slug)) return shelving(s);
    if (/vilto-step-stool/.test(slug)) return stool();
    return null;
  },
};
export default family;
