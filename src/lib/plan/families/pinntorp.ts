import type { Family } from "./family";
import type { PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";

/**
 * PINNTORP, from IKEA's manuals. The tables build an apron frame first: four rails joined at the corners by steel
 * brackets (two screws into each rail), two dowels in its top edge, then it is laid on the upside-down top and
 * screwed down. Each leg gets a barrel nut and two hanger rods, the rods go through the bracket and are nutted with
 * the box spanner; the legs splay out a little. The gateleg table adds a low H of stretchers, bolted into the legs,
 * and a gate hinged to one leg that swings out under the leaf. The chair is built on its side: two leg frames, the
 * front and back rails and the backrest on dowels, three screws through each frame, then the seat drops in and is
 * screwed through four brackets.
 */

const T = 25; // tops, thick
const A = 80; // apron rails, high
const RT = 22; // apron rails, thick
const LEG = 45;
const SPLAY = 0.045;

const SCREW_S: HwDef = { kind: "screw", len: 16, dia: 4 };
const SCREW_L: HwDef = { kind: "screw", len: 100, dia: 6, name: "Long screw with washer" };
const DOWEL: HwDef = { kind: "dowel", len: 30, dia: 8 };
const BARREL: HwDef = { kind: "nut", len: 20, dia: 10, name: "Barrel nut" };
const ROD: HwDef = { kind: "stud", len: 60, dia: 8, name: "Hanger rod" };
const NUT: HwDef = { kind: "nut", len: 6, dia: 8 };
const SPRING: HwDef = { kind: "washer", len: 2, dia: 14, name: "Spring washer" };
const BOLT: HwDef = { kind: "bolt", len: 90, dia: 6 };

type StepIn = { title: string; detail?: string; tools?: ToolId[]; people?: 1 | 2; pose?: Pose; warnings?: WarnId[]; kind: StepKind; scene?: string };

function stepper(b: PlanBuilder) {
  let pose: Pose = "+y";
  return (d: StepIn, body: () => void = () => {}) => {
    const side = !!d.scene && d.scene !== "main";
    if (d.pose && !side) pose = d.pose;
    const w = new Set<WarnId>(d.warnings ?? []);
    if (d.people === 2) w.add("two");
    b.step({ ...d, tools: d.tools ?? [], people: d.people ?? 1, pose: side ? (d.pose ?? "+y") : pose, warnings: [...w].slice(0, 3) }, body);
  };
}
const rel = (b: PlanBuilder, k: string, c: Vec3): Vec3 => {
  const p = b.partItem(k).final.pos;
  return [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
};

interface Corner {
  sx: number;
  sz: number;
  ix: number; // inner corner of the frame
  iz: number;
  bracket: string;
  leg: string;
  edge: [number, number]; // the leg's inner edge, where its rods go in
}

/** The apron frame under a top, its corner brackets and legs. cx shifts it along x (the gateleg's frame sits under its fixed top). */
function frame(b: PlanBuilder, o: { FW: number; FD: number; H: number; cx: number; splay: boolean; legH?: number }) {
  const { FW, FD, H, cx } = o;
  const yU = H - T;
  const yA = yU - A / 2;
  const longT = b.part("Long rail", [FW, A, RT], { material: "wood" });
  const shortT = b.part("Short rail", [RT, A, FD - 2 * RT], { material: "wood" });
  const longs = [-1, 1].map((sz) => b.place(longT, [cx, yA, sz * (FD / 2 - RT / 2)]));
  const shorts = [-1, 1].map((sx) => b.place(shortT, [cx + sx * (FW / 2 - RT / 2), yA, 0]));
  const legT = b.part("Leg", [LEG, o.legH ?? yU, LEG], { material: "wood" });
  const corners: Corner[] = [];
  for (const sz of [-1, 1])
    for (const sx of [-1, 1]) {
      const ix = cx + sx * (FW / 2 - RT), iz = sz * (FD / 2 - RT);
      const e: [number, number] = [ix - sx * LEG, iz - sz * LEG];
      const c: [number, number] = [e[0] - sx * 14, e[1] - sz * 14];
      const pieces: PartPiece[] = [
        { shape: "box", size: [166, 50, 4], pos: [c[0], yA, c[1]], rot: [0, Math.atan2(sz, sx), 0] },
        { shape: "box", size: [3, 50, 60], pos: [ix - sx * 1.5, yA, iz - sz * 118] },
        { shape: "box", size: [60, 50, 3], pos: [ix - sx * 118, yA, iz - sz * 1.5] },
      ];
      const br = b.compound("Corner bracket", pieces, { material: "metal" });
      const bracket = b.place(br.type, br.mid);
      const L = o.legH ?? yU;
      const lean = o.splay ? Math.tan(SPLAY) * L : 0;
      const top: Vec3 = [ix - sx * LEG / 2, yU, iz - sz * LEG / 2];
      const leg = b.place(legT, [top[0] + (sx * lean) / 2, yU - L / 2, top[2] + (sz * lean) / 2], o.splay ? [-sz * SPLAY, 0, sx * SPLAY] : [0, 0, 0]);
      corners.push({ sx, sz, ix, iz, bracket, leg, edge: e });
    }
  const flangeScrews = (k: Corner, which: "short" | "long"): FitOpts[] =>
    [-15, 15].map((d) =>
      which === "short"
        ? { on: k.bracket, at: [k.ix - k.sx * 3, yA + d, k.iz - k.sz * 118] as Vec3, dir: [k.sx, 0, 0] as Vec3, mate: shorts[k.sx < 0 ? 0 : 1] }
        : { on: k.bracket, at: [k.ix - k.sx * 118, yA + d, k.iz - k.sz * 3] as Vec3, dir: [0, 0, k.sz] as Vec3, mate: longs[k.sz < 0 ? 0 : 1] },
    );
  const diag = (k: Corner, out: number, y: number): Vec3 => [k.edge[0] - (k.sx * out) / Math.SQRT2, y, k.edge[1] - (k.sz * out) / Math.SQRT2];
  const rodY = [yA - 15, yA + 15];
  const rods = (k: Corner): FitOpts[] => rodY.map((y) => ({ on: k.leg, at: diag(k, 0, y), dir: [k.sx / Math.SQRT2, 0, k.sz / Math.SQRT2] as Vec3, travel: 90, spin: 3 }));
  const nutAt = (k: Corner, def: "spring" | "nut"): FitOpts[] => rodY.map((y) => ({ on: k.bracket, at: diag(k, def === "spring" ? 24 : 27, y), dir: [k.sx / Math.SQRT2, 0, k.sz / Math.SQRT2] as Vec3, hole: false as const }));
  return { longs, shorts, corners, flangeScrews, rods, nutAt, yU, yA };
}

type Frame = ReturnType<typeof frame>;

/** Steps 1 to 5 of the tables: brackets on the short rails, the long rails, dowels, onto the top, screwed down. */
function frameSteps(b: PlanBuilder, st: ReturnType<typeof stepper>, f: Frame, top: string, screwPts: Vec3[], o: { cx: number; FW: number; FD: number }) {
  st(
    {
      title: "Screw a bracket to each end of the short rails",
      detail: "Rails on a rug, holes for the long screws facing up. Two small screws hold each bracket.",
      tools: ["screwdriver"],
      kind: "screws",
      pose: "-y",
      warnings: ["floor"],
    },
    () => {
      b.stagger(0.25);
      for (const k of f.shorts) b.add(k, [0, 0, 0]);
      b.then(0.1);
      for (const k of f.corners) b.add(k.bracket, [0, -120, 0]);
      b.then(0.1);
      b.fits(SCREW_S, f.corners.flatMap((k) => f.flangeScrews(k, "short")), 0.05);
    },
  );
  st(
    { title: "Screw on the long rails", detail: "Close the frame: two small screws through each bracket into the long rail.", tools: ["screwdriver"], kind: "screws" },
    () => {
      b.stagger(0.3);
      f.longs.forEach((k, i) => b.add(k, [0, 0, (i ? 1 : -1) * 260]));
      b.then(0.15);
      b.fits(SCREW_S, f.corners.flatMap((k) => f.flangeScrews(k, "long")), 0.05);
    },
  );
  st({ title: "Tap two dowels into the frame", detail: "Into the holes in the top edge of the rails: they find the holes in the top.", tools: ["hammer"], kind: "dowels" }, () =>
    b.fits(DOWEL, [-1, 1].map((sx) => ({ on: f.longs[sx < 0 ? 0 : 1], at: [o.cx + sx * (o.FW / 4), f.yU, sx * (o.FD / 2 - RT / 2)] as Vec3, dir: [0, -1, 0] as Vec3, mate: top })), 0.2),
  );
  st({ title: "Lay the frame on the upside-down top", detail: "Top face down on a rug. Fit the dowels into their holes.", kind: "join", warnings: ["floor"] }, () => {
    b.add(top, [0, 300, 0]);
  });
  st({ title: "Screw the frame to the top", detail: `${screwPts.length} long screws with washers, down through the rails into the top. Don't drive them through the surface.`, tools: ["screwdriver"], kind: "screws" }, () =>
    b.fits(SCREW_L, screwPts.map((at) => ({ on: f.longs[0], at, dir: [0, 1, 0] as Vec3, mate: top })), 0.08),
  );
}

/** Points for the long screws: along the long rails, then the short ones. */
function screwPoints(cx: number, FW: number, FD: number, yU: number, nLong: number, nShort: number): Vec3[] {
  const y = yU - A;
  const out: Vec3[] = [];
  for (const sz of [-1, 1]) for (let i = 0; i < nLong; i++) out.push([cx - FW / 2 + 130 + ((FW - 260) * i) / Math.max(1, nLong - 1), y, sz * (FD / 2 - RT / 2)]);
  for (const sx of [-1, 1]) for (let i = 0; i < nShort; i++) out.push([cx + sx * (FW / 2 - RT / 2), y, nShort === 1 ? 0 : -FD / 2 + 150 + ((FD - 300) * i) / Math.max(1, nShort - 1)]);
  return out;
}

function legSteps(b: PlanBuilder, st: ReturnType<typeof stepper>, f: Frame, o: { last?: boolean }) {
  st(
    {
      title: "Fit a barrel nut and two rods into each leg",
      detail: "Lay the legs on a rug. Barrel nut into the hole near the top, slot facing the end, then turn the two rods in by hand until they stop.",
      tools: ["flathead"],
      kind: "bolts",
      scene: "legs",
      warnings: ["floor", "hand"],
    },
    () => {
      b.stagger(0.15);
      f.corners.forEach((k, i) => b.stage(k.leg, [0, LEG / 2, (i - 1.5) * 140], [0, 0, Math.PI / 2], [0, 160, 0]));
      b.then(0.15);
      b.fits(BARREL, f.corners.map((k) => ({ on: k.leg, at: [k.edge[0] + (k.sx * LEG) / 2, f.yA, k.edge[1] + (k.sz * LEG) / 2] as Vec3, dir: [0, -1, 0] as Vec3, hole: false as const })), 0.1);
      b.then(0.1);
      b.fits(ROD, f.corners.flatMap((k) => f.rods(k)), 0.06);
    },
  );
  st(
    {
      title: "Fix the legs into the corners",
      detail: "Push each leg into its corner so both rods come through the bracket. A spring washer and a nut on each rod, tightened with the box spanner. Check the leg sits tight against both rails.",
      tools: ["wrench"],
      kind: "legs",
    },
    () => {
      b.stagger(0.25);
      for (const k of f.corners) b.add(k.leg, [0, -300, 0]);
      b.then(0.15);
      b.fits(SPRING, f.corners.flatMap((k) => f.nutAt(k, "spring")), 0.04);
      b.fits(NUT, f.corners.flatMap((k) => f.nutAt(k, "nut")), 0.04);
    },
  );
  if (o.last) st({ title: "Turn the table over", detail: "Lift it by the top, not the legs, and stand it on all four feet.", kind: "standup", pose: "+y" });
}

function table(b: PlanBuilder, s: ProductSpec): boolean {
  const st = stepper(b);
  const round = /^\d+ ?cm$/i.test(s.variant.trim()) || !!s.table?.round || /table-\d+$/.test(s.slug ?? "");
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const top = round
    ? b.place(b.part("Round table top", [W, T, W], { shape: "cyl", material: "wood" }), [0, H - T / 2, 0])
    : b.place(b.part("Table top", [W, T, D], { material: "wood" }), [0, H - T / 2, 0]);
  const FW = round ? Math.round(W / Math.SQRT2 - 40) : W - 100;
  const FD = round ? FW : D - 100;
  const f = frame(b, { FW, FD, H, cx: 0, splay: true });
  const pts = round ? screwPoints(0, FW, FD, f.yU, 2, 2) : screwPoints(0, FW, FD, f.yU, 3, 2);
  frameSteps(b, st, f, top, pts, { cx: 0, FW, FD });
  legSteps(b, st, f, { last: true });
  return true;
}

function gateleg(b: PlanBuilder, s: ProductSpec): boolean {
  const st = stepper(b);
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const W1 = 670; // the fixed top; the rest is the leaf
  const x0 = -W / 2, xj = x0 + W1; // fixed top from x0, the leaf hinge at xj
  const fixed = b.place(b.part("Table top", [W1, T, D], { material: "wood" }), [(x0 + xj) / 2, H - T / 2, 0]);
  const leaf = b.place(b.part("Leaf", [W - W1, T, D], { material: "wood" }), [(xj + W / 2) / 2, H - T / 2, 0]);
  const FW = W1 - 80, FD = D - 80, cx = (x0 + xj) / 2;
  const f = frame(b, { FW, FD, H, cx, splay: false });
  const yU = f.yU;
  // the H of stretchers between the legs, low down
  const yS = 150;
  const legX = [cx - FW / 2 + RT + LEG / 2, cx + FW / 2 - RT - LEG / 2];
  const legZ = FD / 2 - RT - LEG / 2;
  const sideT = b.part("Side stretcher", [30, 50, 2 * legZ - LEG], { material: "wood" });
  const sides = legX.map((x) => b.place(sideT, [x, yS, 0]));
  const mid = b.place(b.part("Middle stretcher", [legX[1] - legX[0] - 30, 40, 30], { material: "wood" }), [cx, yS, 0]);
  // the gate: hinged to the back leg on the leaf side, open under the leaf
  const hx = legX[1] + LEG / 2, hz = -legZ;
  const gx = Math.min(W / 2 - 150, hx + 440);
  const gate = b.compound(
    "Gate",
    [
      { shape: "box", size: [30, 520, 40], pos: [hx + 15, 120 + 260, hz] },
      { shape: "box", size: [LEG, yU, LEG], pos: [gx, yU / 2, hz] },
      { shape: "box", size: [gx - hx + 60, 40, 30], pos: [(hx + gx + 60) / 2, 610, hz] },
      { shape: "box", size: [gx - hx - 30 - LEG / 2, 40, 30], pos: [(hx + 30 + gx - LEG / 2) / 2, 140, hz] },
    ],
    { material: "wood" },
  );
  const gk = b.place(gate.type, gate.mid);

  st({ title: "Screw the stop block under the leaf", detail: "Lay the top upside down on a rug, leaf opened out flat. Two screws hold the block.", tools: ["screwdriver"], kind: "screws", pose: "-y", warnings: ["floor"] }, () => {
    b.add(fixed, [0, -200, 0]);
    b.add(leaf, [0, -200, 0]);
    b.then(0.15);
    b.fits({ kind: "cap", len: 20, dia: 40, name: "Stop block" }, [{ on: leaf, at: [gx + 60, yU + T - T, hz + 90], dir: [0, 1, 0], hole: false }]);
    b.fits({ kind: "screw", len: 30, dia: 4 }, [-12, 12].map((d) => ({ on: leaf, at: [gx + 60 + d, yU - 20, hz + 90] as Vec3, dir: [0, 1, 0] as Vec3 })), 0.15);
  });
  st({ title: "Screw the stop cup under the leaf", detail: "Where the top of the gate leg meets the leaf when it is open.", tools: ["screwdriver"], kind: "screws" }, () => {
    b.fits({ kind: "cap", len: 10, dia: 30, name: "Stop cup" }, [{ on: leaf, at: [gx, yU, hz], dir: [0, 1, 0], hole: false }]);
    b.fits({ kind: "screw", len: 16, dia: 4 }, [{ on: leaf, at: [gx, yU - 10, hz], dir: [0, 1, 0] }]);
  });
  st({ title: "Tap two dowels into the top", detail: "Into the two holes in the fixed part, not the leaf.", tools: ["hammer"], kind: "dowels" }, () =>
    b.fits(DOWEL, [-1, 1].map((sx) => ({ on: fixed, at: [cx + sx * (FW / 4), yU, sx * (FD / 2 - RT / 2)] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })), 0.2),
  );
  st({ title: "Screw the brackets to the long rails", detail: "One at each end, two small screws each. Check which way up the rails go: the holes for the long screws face the top.", tools: ["screwdriver"], kind: "screws" }, () => {
    b.stagger(0.3);
    f.longs.forEach((k, i) => b.add(k, [0, -300, (i ? 1 : -1) * 200]));
    b.then(0.1);
    for (const k of f.corners) b.add(k.bracket, [0, -120, 0]);
    b.then(0.1);
    b.fits(SCREW_S, f.corners.flatMap((k) => f.flangeScrews(k, "long")), 0.05);
  });
  st({ title: "Screw on the short rails", detail: "Two small screws through each bracket.", tools: ["screwdriver"], kind: "screws" }, () => {
    b.stagger(0.3);
    f.shorts.forEach((k, i) => b.add(k, [(i ? 1 : -1) * 260, 0, 0]));
    b.then(0.15);
    b.fits(SCREW_S, f.corners.flatMap((k) => f.flangeScrews(k, "short")), 0.05);
  });
  st({ title: "Screw the frame to the top", detail: "Over the dowels, on the fixed part of the top. Ten long screws with washers.", tools: ["screwdriver"], kind: "screws" }, () =>
    b.fits(SCREW_L, screwPoints(cx, FW, FD, yU, 3, 2).map((at) => ({ on: f.longs[0], at, dir: [0, 1, 0] as Vec3, mate: fixed })), 0.08),
  );
  legSteps(b, st, f, {});
  st({ title: "Tap a dowel into each end of the middle stretcher", tools: ["hammer"], kind: "dowels", scene: "h" }, () => {
    const c: Vec3 = [cx, yS, 0];
    b.stage(mid, rel(b, mid, c), [0, 0, 0], [0, 160, 0]);
    b.then(0.1);
    b.fits(DOWEL, [0, 1].map((i) => ({ on: mid, at: [legX[i] + (i ? -15 : 15), yS + 10, 0] as Vec3, dir: [i ? -1 : 1, 0, 0] as Vec3, mate: sides[i] })), 0.2);
  });
  st({ title: "Bolt the side stretchers to it", detail: "A barrel nut into the hole in each end of the middle stretcher, then a long bolt through each side stretcher into it.", tools: ["flathead", "allen"], kind: "bolts", scene: "h" }, () => {
    const c: Vec3 = [cx, yS, 0];
    b.stagger(0.3);
    for (const k of sides) b.stage(k, rel(b, k, c), [0, 0, 0], [0, 160, 0]);
    b.then(0.1);
    b.fits(BARREL, [0, 1].map((i) => ({ on: mid, at: [legX[i] + (i ? -60 : 60), yS + 20, 0] as Vec3, dir: [0, -1, 0] as Vec3, hole: false as const })), 0.2);
    b.fits(BOLT, [0, 1].map((i) => ({ on: sides[i], at: [legX[i] + (i ? 15 : -15), yS - 8, 0] as Vec3, dir: [i ? -1 : 1, 0, 0] as Vec3, mate: mid })), 0.2);
  });
  st({ title: "Tap dowels into the ends of the side stretchers", detail: "One in each end: four.", tools: ["hammer"], kind: "dowels", scene: "h" }, () =>
    b.fits(DOWEL, legX.flatMap((x, i) => [-1, 1].map((sz) => ({ on: sides[i], at: [x, yS + 10, sz * (legZ - LEG / 2)] as Vec3, dir: [0, 0, -sz] as Vec3 }))), 0.1),
  );
  st({ title: "Lower the stretchers in between the legs", detail: "One of you spreads the legs a little while the other pushes the dowels home.", kind: "join", people: 2 }, () => {
    b.stagger(0);
    for (const k of [mid, ...sides]) b.add(k, [0, 300, 0]);
  });
  st({ title: "Bolt the legs to the stretchers", detail: "A barrel nut into each stretcher end, then a long bolt through each leg into it.", tools: ["flathead", "allen"], kind: "bolts", people: 2 }, () => {
    b.fits(BARREL, legX.flatMap((x, i) => [-1, 1].map((sz) => ({ on: sides[i], at: [x, yS + 25, sz * (legZ - LEG / 2 - 40)] as Vec3, dir: [0, -1, 0] as Vec3, hole: false as const }))), 0.08);
    b.then(0.1);
    b.fits(BOLT, legX.flatMap((x, i) => [-1, 1].map((sz) => ({ on: f.corners.find((k) => Math.sign(k.ix - cx) === (i ? 1 : -1) && k.sz === sz)!.leg, at: [x, yS - 8, sz * (legZ + LEG / 2)] as Vec3, dir: [0, 0, -sz] as Vec3, mate: sides[i] }))), 0.1);
  });
  st({ title: "Tighten the leg nuts again", detail: "Go round the four corners with the box spanner now the stretchers pull the legs square.", tools: ["wrench"], kind: "bolts" });
  const hinges = [0, 1].map((i) => 220 + i * 300);
  st({ title: "Screw the hinges onto the gate", detail: "On the short upright, two screws each.", tools: ["screwdriver"], kind: "hinges", scene: "gate" }, () => {
    b.stage(gk, [0, 0, 0], [Math.PI / 2, 0, 0], [0, 160, 0]);
    b.then(0.1);
    b.fits({ kind: "hinge", len: 50, dia: 35 }, hinges.map((y) => ({ on: gk, at: [hx, y, hz] as Vec3, dir: [1, 0, 0] as Vec3, hole: false as const })), 0.2);
    b.fits({ kind: "screw", len: 16, dia: 4 }, hinges.flatMap((y) => [-12, 12].map((d) => ({ on: gk, at: [hx, y + d, hz + 8] as Vec3, dir: [1, 0, 0] as Vec3 }))), 0.1);
  });
  st({ title: "Screw the gate to the leg", detail: "The hinges go on the leg on the leaf side, two screws each. Check that the gate swings freely.", tools: ["screwdriver"], kind: "hinges" }, () => {
    b.add(gk, [300, 0, 0]);
    b.then(0.15);
    const leg = f.corners.find((k) => k.sx > 0 && k.sz < 0)!.leg;
    b.fits({ kind: "screw", len: 16, dia: 4 }, hinges.flatMap((y) => [-12, 12].map((d) => ({ on: leg, at: [hx, y + d, hz - 8] as Vec3, dir: [-1, 0, 0] as Vec3 }))), 0.1);
  });
  st({
    title: "Turn the table over and try the leaf",
    detail: "Swing the gate out until it meets the stop, then lower the leaf onto it. Keep your fingers clear of the hinge when the leaf comes down.",
    kind: "standup",
    pose: "+y",
    people: 2,
    warnings: ["hand"],
  });
  return true;
}

function chair(b: PlanBuilder, s: ProductSpec): boolean {
  const st = stepper(b);
  const W = s.size.w * 10 || 420, D = s.size.d * 10 || 490, H = s.size.h * 10 || 900;
  const SH = 450, ST = 28, L = 40;
  const xs = W / 2 - L / 2, zb = -D / 2 + L / 2, zf = D / 2 - 30;
  const yR = SH - ST - 35; // seat rails, centre
  const inner = W - 2 * L;
  const side = b.compound(
    "Side frame",
    [
      { shape: "box", size: [L, H, L], pos: [0, H / 2, zb] },
      { shape: "box", size: [L, SH - ST, L], pos: [0, (SH - ST) / 2, zf] },
      { shape: "box", size: [24, 70, zf - zb - L], pos: [0, yR, (zb + zf) / 2] },
      { shape: "box", size: [20, 30, zf - zb - L], pos: [0, 150, (zb + zf) / 2] },
    ],
    { material: "wood" },
  );
  const sides = [-1, 1].map((sx) => b.place(side.type, [sx * xs + side.mid[0], side.mid[1], side.mid[2]]));
  const railT = b.part("Seat rail", [inner, 70, 22], { material: "wood" });
  const front = b.place(railT, [0, yR, zf]);
  const back = b.place(railT, [0, yR, zb]);
  const bk = b.compound(
    "Backrest",
    [
      { shape: "box", size: [inner, 80, 22], pos: [0, H - 60, zb] },
      { shape: "box", size: [inner, 40, 22], pos: [0, SH + 120, zb] },
      ...[-1, 0, 1].map((i) => ({ shape: "box" as const, size: [40, H - 100 - (SH + 140), 16] as Vec3, pos: [i * 95, (SH + 140 + H - 100) / 2, zb] as Vec3 })),
    ],
    { material: "wood" },
  );
  const backrest = b.place(bk.type, bk.mid);
  const seat = b.place(b.part("Seat", [W, ST, zf + L / 2 - (zb + L / 2)], { material: "wood" }), [0, SH - ST / 2, (zf + L / 2 + zb + L / 2) / 2]);
  const clipX = [-inner / 2 + 60, inner / 2 - 60];
  const clips = [front, back].flatMap((r, i) => clipX.map((x) => ({ r, x, z: i ? zb + 11 : zf - 11, sz: i ? 1 : -1 })));
  const CLIP: HwDef = { kind: "clip", len: 12, dia: 24, name: "Seat bracket" };
  const SCREW: HwDef = { kind: "screw", len: 70, dia: 6, name: "Long screw" };
  const dowels = (k: string, y: number[], z: number, ends: number[]): FitOpts[] => ends.flatMap((sx) => y.map((yy) => ({ on: k, at: [sx * (inner / 2), yy, z] as Vec3, dir: [-sx, 0, 0] as Vec3, mate: sides[sx < 0 ? 0 : 1] })));
  const screws = (sx: number): FitOpts[] =>
    [
      [yR, zf],
      [yR, zb],
      [H - 60, zb],
    ].map(([y, z]) => ({ on: sides[sx < 0 ? 0 : 1], at: [sx * (W / 2), y, z] as Vec3, dir: [-sx, 0, 0] as Vec3, mate: z === zf ? front : y === yR ? back : backrest }));

  st({ title: "Press the seat brackets into the rails", detail: "Lay the two seat rails on a rug. Two brackets into the slots on the inside of each.", kind: "general", scene: "rails", warnings: ["floor"] }, () => {
    b.stagger(0.3);
    b.stage(front, [0, 11, 100], [Math.PI / 2, 0, 0], [0, 160, 0]);
    b.stage(back, [0, 11, -100], [Math.PI / 2, 0, 0], [0, 160, 0]);
    b.then(0.1);
    b.fits(CLIP, clips.map((c) => ({ on: c.r, at: [c.x, yR - 20, c.z] as Vec3, dir: [0, 0, -c.sz] as Vec3, hole: false as const })), 0.15);
  });
  st({ title: "Stand the front rail in a side frame", detail: "Lay one side frame flat on a rug, holes up. Tap two dowels into each end of the rail and push one end into the front leg.", tools: ["hammer"], kind: "dowels", pose: "-x", warnings: ["floor"] }, () => {
    b.add(sides[1], [200, 0, 0]);
    b.then(0.15);
    b.fits(DOWEL, dowels(front, [yR - 18, yR + 18], zf, [-1, 1]), 0.08);
    b.then(0.1);
    b.add(front, [-260, 0, 0]);
  });
  st({ title: "Stand the back rail in it the same way", detail: "Two dowels in each end, the brackets facing in.", tools: ["hammer"], kind: "dowels" }, () => {
    b.fits(DOWEL, dowels(back, [yR - 18, yR + 18], zb, [-1, 1]), 0.08);
    b.then(0.1);
    b.add(back, [-260, 0, 0]);
  });
  st({ title: "Stand the backrest in the back leg", detail: "Three dowels in each end of it.", tools: ["hammer"], kind: "dowels" }, () => {
    b.fits(DOWEL, dowels(backrest, [H - 75, H - 45, SH + 120], zb, [-1, 1]), 0.06);
    b.then(0.1);
    b.add(backrest, [-260, 0, 0]);
  });
  st({ title: "Lay the other side frame on and screw it", detail: "Onto all the dowels at once, then three long screws through it into the rails and the backrest.", tools: ["allen"], kind: "screws" }, () => {
    b.add(sides[0], [-300, 0, 0]);
    b.then(0.15);
    b.fits(SCREW, screws(-1), 0.15);
  });
  st({ title: "Turn it over and screw the first side", detail: "Three more long screws.", tools: ["allen"], kind: "screws", pose: "+x" }, () => b.fits(SCREW, screws(1), 0.15));
  st({ title: "Stand the chair up and drop in the seat", detail: "Smooth side up. Check it sits flush with the frame all round.", kind: "join", pose: "+y" }, () => b.add(seat, [0, 300, 0]));
  st({ title: "Push the seat back against the back legs", detail: "Reach under and press it home before you fix it.", kind: "general" });
  st({ title: "Screw the seat on from below", detail: "One screw up through each bracket into the seat: four.", tools: ["screwdriver"], kind: "screws" }, () =>
    b.fits({ kind: "screw", len: 16, dia: 4 }, clips.map((c) => ({ on: c.r, at: [c.x, SH - ST - 4, c.z + c.sz * 12] as Vec3, dir: [0, 1, 0] as Vec3, mate: seat })), 0.15),
  );
  return true;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const slug = s.slug ?? "";
  if (/pinntorp-chair/.test(slug)) return chair(b, s);
  if (/pinntorp-gateleg/.test(slug)) return gateleg(b, s);
  if (/pinntorp-table/.test(slug)) return table(b, s);
  return false;
}

const family: Family = { names: ["PINNTORP"], build };
export default family;
