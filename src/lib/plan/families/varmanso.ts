import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * VÄRMANSÖ, read from its two manuals. The chair: the woven seat is bolted to the woven back on a rug, then the
 * chair lies on its side while each side frame (armrest, legs and runner in one loop) is lowered on and bolted,
 * one long bolt into the back and two short ones into the seat, all with washers. The table is built upside
 * down by two people: the aluminium frame bolted together with four corner plates, the two leg frames bolted to
 * the plates' tabs, the cross brace bolted in; turned over, the middle rail drops in and the 21 top slats are
 * laid in a few at a time, locked by the catches on the frame.
 */

const BAR = 22; // the chair's flat steel bars, across

function chair(s: ProductSpec): CustomParams {
  // IKEA: 59 wide, 88 high, 56 deep, seat 44 high
  const W = 590, H = Math.min(s.size.h * 10, 880), D = 560;
  const xs = W / 2 - BAR / 2, xi = xs - BAR / 2;
  const yArm = 650, ySeat = 440, st = 60;
  const zF = D / 2 - 30, zB = -D / 2 + 50;
  const sideOf = (id: string, sx: number): CustomPart => {
    const cy = yArm / 2 + 10, cz = 0;
    const pieces: PartPiece[] = [
      { shape: "box", size: [BAR, 40, D], pos: [0, yArm - 20 - cy, -cz] }, // armrest
      { shape: "box", size: [BAR, 30, D - 40], pos: [0, 15 - cy, 0] }, // runner
      { shape: "box", size: [BAR, yArm - 70, 40], pos: [0, (yArm - 40 + 30) / 2 - cy, zF] },
      { shape: "box", size: [BAR, yArm - 70, 40], pos: [0, (yArm - 40 + 30) / 2 - cy, zB] },
    ];
    return { id, name: "Side frame", size: [BAR, yArm, D], pos: [sx * xs, cy, 0], pieces, material: "metal" };
  };
  const zSb = zB + 20, zSf = zF + 10; // seat back and front
  const bt = 40, tilt = 0.12;
  const backH = H - ySeat + 20;
  const zBack = zSb - bt / 2 - Math.sin(tilt) * (backH / 2);
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [2 * xi, st, zSf - zSb], pos: [0, ySeat - st / 2, (zSf + zSb) / 2], material: "soft" },
    { id: "B", name: "Back", size: [2 * xi, backH, bt], pos: [0, ySeat - 20 + (backH / 2) * Math.cos(tilt), zBack], rot: [-tilt, 0, 0], material: "soft" },
    sideOf("R", 1),
    sideOf("L", -1),
  ];
  const withWashers = (f: CustomFix): CustomFix[] => [f, { kind: "washer", count: f.count, at: f.at, dir: f.dir, on: f.on, len: 2, dia: 14 }];
  const longBolt = (sx: number): CustomFix[] =>
    withWashers({ kind: "bolt", count: 1, len: 70, dia: 6, at: [[sx * (xs + BAR / 2), yArm - 80, zB]], dir: [-sx, 0, 0], on: sx > 0 ? "R" : "L", mate: "B" });
  const shortBolts = (sx: number): CustomFix[] =>
    withWashers({ kind: "bolt", count: 2, len: 20, dia: 6, at: [zF - 10, zB + 40].map((z): Vec3 => [sx * (xs + BAR / 2), ySeat - 30, z]), dir: [-sx, 0, 0], on: sx > 0 ? "R" : "L", mate: "S" });
  const steps: CustomStep[] = [
    {
      title: "Fit the seat onto the back",
      detail: "On a rug, with the back lying down. Push the seat's back edge onto the two pegs on the back's frame.",
      add: ["B", "S"],
      pose: "+z",
      warnings: ["floor"],
    },
    {
      title: "Bolt the seat to the back",
      detail: "Two medium bolts with washers, one each side. Leave them a little loose.",
      fix: withWashers({ kind: "bolt", count: 2, len: 40, dia: 6, at: [-1, 1].map((sx): Vec3 => [sx * (xi - 40), ySeat - 30, zSb - 30]), dir: [0, 0, 1], on: "B", mate: "S" }),
      tools: ["allen"],
    },
    { title: "Lay it on its side and lower a side frame on", detail: "The armrest goes at the top of the back, the runner at the floor end.", add: ["R"], pose: "+x" },
    { title: "Bolt the side frame to the back", detail: "One long bolt with a washer through the back leg.", fix: longBolt(1), tools: ["allen"] },
    { title: "Bolt the side frame to the seat", detail: "Two short bolts with washers, into the seat's frame.", fix: shortBolts(1), tools: ["allen"] },
    { title: "Turn it over and lower the other side frame on", detail: "Now lying on the first side frame.", add: ["L"], pose: "-x" },
    { title: "Bolt the second side frame to the back", detail: "One long bolt with a washer.", fix: longBolt(-1), tools: ["allen"] },
    { title: "Bolt it to the seat", detail: "Two short bolts with washers.", fix: shortBolts(-1), tools: ["allen"] },
    {
      title: "Stand the chair up and tighten all the bolts",
      detail: "All eight, firmly. If you use a seat pad, tie its strings round the back's frame.",
      pose: "+y",
      tools: ["allen"],
      check: "square",
    },
  ];
  return { parts, steps };
}

function table(s: ProductSpec): CustomParams {
  // IKEA: 224 x 93, 75 high
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const rt = 30, rh = 60, yR = H - rh; // frame profile
  const xe = W / 2 - rt / 2, ze = D / 2 - rt / 2;
  const lt = 40, yL = yR; // leg frames reach up to the frame
  const xl = W / 2 - rt - lt / 2 - 20, zl = D / 2 - rt - lt / 2;
  const legOf = (id: string, sx: number): CustomPart => {
    const pieces: PartPiece[] = [
      { shape: "box", size: [lt, yL - lt, lt], pos: [0, lt / 2, -zl] },
      { shape: "box", size: [lt, yL - lt, lt], pos: [0, lt / 2, zl] },
      { shape: "box", size: [lt, lt, 2 * zl + lt], pos: [0, -yL / 2 + lt / 2, 0] },
    ];
    return { id, name: "Leg frame", size: [lt, yL, 2 * zl + lt], pos: [sx * xl, yL / 2, 0], pieces, material: "metal" };
  };
  const parts: CustomPart[] = [
    { id: "LA", name: "Long rail", size: [W - 2 * rt, rh, rt], pos: [0, yR + rh / 2, -ze], material: "metal" },
    { id: "LB", name: "Long rail", size: [W - 2 * rt, rh, rt], pos: [0, yR + rh / 2, ze], material: "metal" },
    { id: "EA", name: "End rail", size: [rt, rh, D], pos: [-xe, yR + rh / 2, 0], material: "metal" },
    { id: "EB", name: "End rail", size: [rt, rh, D], pos: [xe, yR + rh / 2, 0], material: "metal" },
    legOf("GA", -1),
    legOf("GB", 1),
    { id: "X", name: "Cross brace", size: [40, 20, D - 2 * rt], pos: [0, yR + 10, 0], material: "metal" },
    { id: "M", name: "Middle rail", size: [W - 2 * rt, 20, 30], pos: [0, yR + 30, 0], material: "metal" },
  ];
  const n = 21, sw = (W - 2 * rt) / n, slt = 10, yS = yR + 40 + slt / 2;
  const slatIds = Array.from({ length: n }, (_, i) => `S${i + 1}`);
  slatIds.forEach((id, i) => parts.push({ id, name: "Slat", size: [sw - 2, slt, D - 2 * rt], pos: [-W / 2 + rt + sw * (i + 0.5), yS, 0], material: "metal" }));

  const yb = yR + rh / 2;
  const corner = (sx: number, sz: number): CustomFix[] => {
    const x = sx * (W / 2 - rt), z = sz * (D / 2 - rt);
    const bolt = { kind: "bolt" as const, len: 16, dia: 6 };
    const toEnd = [40, 80].map((d): Vec3 => [x, yb, z - sz * d]);
    const toLong = [40, 80].map((d): Vec3 => [x - sx * d, yb, z]);
    return [
      { ...bolt, count: 2, at: toEnd, dir: [sx, 0, 0], on: sx < 0 ? "EA" : "EB" },
      { ...bolt, count: 2, at: toLong, dir: [0, 0, sz], on: sz < 0 ? "LA" : "LB" },
      { kind: "washer", count: 4, at: [...toEnd, ...toLong], len: 2, dia: 14, dir: [0, 0, 1] },
    ];
  };
  const plates = (sx: number): CustomFix => ({
    kind: "angle",
    name: "Corner plate",
    count: 2,
    len: 70,
    dia: 60,
    at: [-1, 1].map((sz): Vec3 => [sx * (W / 2 - rt - 30), yb, sz * (D / 2 - rt - 30)]),
    dir: [0, 1, 0],
  });
  const legBolts = (sx: number): CustomFix[] => {
    const pts = [-1, 1].flatMap((sz) => [yR - 40, yR - 80, yR - 120].map((y): Vec3 => [sx * (xl - lt / 2), y, sz * zl]));
    return [
      { kind: "bolt", count: pts.length, len: 16, dia: 6, at: pts, dir: [sx, 0, 0], on: sx < 0 ? "GA" : "GB" },
      { kind: "washer", count: pts.length, len: 2, dia: 14, at: pts, dir: [sx, 0, 0] },
    ];
  };
  const bracePts = [-1, 1].flatMap((sz) => [-12, 12].map((x): Vec3 => [x, yR + 10, sz * (D / 2 - rt)]));
  const steps: CustomStep[] = [
    {
      title: "Slide corner plates into one end rail",
      detail: "Upside down on a rug, with both long rails beside it. A plate into each end of the end rail, its tab standing up.",
      add: ["EA", "LA", "LB"],
      fix: [plates(-1)],
      pose: "-y",
      people: 2,
      warnings: ["floor", "two"],
    },
    { title: "Bolt the long rails to the corner plates", detail: "Four bolts with washers at each corner. Leave them a little loose.", fix: [...corner(-1, -1), ...corner(-1, 1)], tools: ["allen"] },
    { title: "Fit the other end rail with its corner plates", detail: "Plates into both ends, tabs up, then push it onto the long rails.", add: ["EB"], fix: [plates(1)] },
    { title: "Bolt the other two corners", detail: "Four bolts with washers at each, then tighten all sixteen.", fix: [...corner(1, -1), ...corner(1, 1)], tools: ["allen"], check: "square" },
    {
      title: "Bolt the leg frames to the corner plates",
      detail: "Each leg goes against a plate's tab: three bolts with washers at each leg.",
      add: ["GA", "GB"],
      fix: [...legBolts(-1), ...legBolts(1)],
      tools: ["allen"],
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Bolt in the cross brace",
      detail: "Across the middle of the frame, two bolts with washers at each end.",
      add: ["X"],
      fix: [
        { kind: "bolt", count: 4, len: 16, dia: 6, at: bracePts, dir: [0, 0, 1] },
        { kind: "washer", count: 4, len: 2, dia: 14, at: bracePts, dir: [0, 0, 1] },
      ],
      tools: ["allen"],
    },
    { title: "Turn the table over together", detail: "Lift it by the frame, one at each end.", pose: "+y", people: 2, warnings: ["two"] },
    { title: "Drop the middle rail into its brackets", detail: "It runs the length of the table and rests in the bracket on the cross brace.", add: ["M"] },
  ];
  // the slats go in from one end, a few at a time, each group locked by the catches on the frame
  const groups = [1, 2, 3, 3, 3, 3, 3, 2, 1];
  let k = 0;
  groups.forEach((g, i) => {
    const ids = slatIds.slice(k, k + g);
    k += g;
    const first = i === 0, last = i === groups.length - 1;
    steps.push({
      title: first ? "Lay in the first slat and lock it" : last ? "Lay in the last slat and lock it" : `Lay in the next ${g === 1 ? "slat" : `${g} slats`} and lock them`,
      detail: first
        ? "The wide one with the lip goes at the end. Turn the two catches under it to hold it."
        : "Hook each one into the one before, press it down, then turn the next two catches.",
      add: ids,
      from: Object.fromEntries(ids.map((id) => [id, [0, 200, 0] as Vec3])),
    });
  });
  return { parts, steps };
}

const family: Family = {
  names: ["VÄRMANSÖ", "VARMANSO"],
  recipe(s) {
    const t = `${s.slug ?? ""} ${s.variant}`.toLowerCase();
    if (/chair/.test(t)) return chair(s);
    if (/table/.test(t)) return table(s);
    return null;
  },
};
export default family;
