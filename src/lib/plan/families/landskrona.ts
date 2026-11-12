import type { Family } from "./family";
import type { PartMaterial, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";

/**
 * LANDSKRONA, from IKEA's manuals. Every frame comes upholstered in one piece, the sofa's armrests already bolted on,
 * so a sofa or armchair is only legs and cushions: each leg gets a fabric sleeve under its washer and screws into the
 * frame while it lies on its back. A chaise longue goes on the end of a sofa: the armrest comes off that end, the
 * chaise is bolted on through the same four holes, gets its four legs, and the armrest goes back on its outer side.
 * The corner sofa's corner section stands on four legs and has U brackets on its two open sides; each section has
 * legs only under its armrest, a pin in its open end, and is lowered into the brackets. The seat cushions grip the
 * frame with strips underneath; each back cushion's flap tucks into the slot along the top of the backrest.
 */

type Cell = "S1" | "S2" | "S3" | "C" | "arm";
type Kind = "sec" | "chaise" | "corner" | "arm";
interface Rec {
  key: string;
  lp: Vec3; // centre in the module's own frame
}
interface Mod {
  kind: Kind;
  cell: Cell | "K";
  w: number; // along the module's own x
  ox: number;
  oz: number;
  yaw: 0 | 1; // 1: turned a quarter, its front facing +x (the wing of a corner sofa)
  legEnd: 0 | 1 | -1; // which ends carry legs (0: both)
  frame: Rec;
  legs: Rec[];
  sleeves: Rec[];
  cush: string[];
  backs: string[];
}
interface Layout {
  row?: Cell[]; // left to right
  back?: Cell[]; // to the right of the corner at the back left
  wing?: Cell[]; // coming forward from the corner
  addOn?: boolean;
}

const D = 890, Z0 = -445;
const LEGH = 150, BASE = 310, SEAT = 440, BACK = 640;
const BT = 160, CB = 120, ARM = 120, CW = 780, CL = 1580, K = 890;
const SEC: Record<"S1" | "S2" | "S3", number> = { S1: 650, S2: 1400, S3: 1800 };
const LD = 45; // leg diameter

const LWASH: HwDef = { kind: "washer", len: 3, dia: 40, name: "Leg washer" };
const CBOLT: HwDef = { kind: "bolt", len: 100, dia: 8, name: "Carriage bolt" };
const WASH: HwDef = { kind: "washer", len: 1.6, dia: 24 };
const NUT: HwDef = { kind: "nut", len: 6.5, dia: 8 };
const AWASH: HwDef = { kind: "washer", len: 1.6, dia: 24, name: "Armrest washer" };
const ANUT: HwDef = { kind: "nut", len: 6.5, dia: 8, name: "Armrest nut" };
const UBRK: HwDef = { kind: "hook", len: 60, dia: 40, name: "U bracket" };
const BSCREW: HwDef = { kind: "bolt", len: 30, dia: 6 };
const PIN: HwDef = { kind: "stud", len: 100, dia: 12, name: "Hanging pin" };

const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (m: Mod, v: Vec3): Vec3 => (m.yaw === 1 ? [m.ox + v[2], v[1], m.oz - v[0]] : [m.ox + v[0], v[1], m.oz + v[2]]);
const Wd = (m: Mod, d: Vec3): Vec3 => (m.yaw === 1 ? [d[2], d[1], -d[0]] : d);
const rotY = (m: Mod) => (m.yaw === 1 ? Math.PI / 2 : 0);
/** Where module m's origin sits in host's own frame (they share a yaw). */
const rel = (host: Mod, m: Mod): Vec3 => (host.yaw === 1 ? [host.oz - m.oz, 0, m.ox - host.ox] : [m.ox - host.ox, 0, m.oz - host.oz]);
const widthOf = (c: Cell) => (c === "arm" ? ARM : c === "C" ? CW : SEC[c]);

/** What the product is made of, from its name; null for anything these manuals don't cover. */
function layout(s: ProductSpec): Layout | null {
  const v = s.variant.toLowerCase().trim();
  if (/^armchair/.test(v)) return { row: ["arm", "S1", "arm"] };
  if (/^2-seat sofa$/.test(v)) return { row: ["arm", "S2", "arm"] };
  if (/^3-seat sofa$/.test(v)) return { row: ["arm", "S3", "arm"] };
  // a 2-seat sofa with two chaise longues side by side on its left end
  if (/^4-seat sofa with chaise longues/.test(v)) return { row: ["arm", "C", "C", "S2", "arm"] };
  // a 3-seat sofa with a chaise longue on its right end
  if (/^4-seat sofa$/.test(v)) return { row: ["arm", "S3", "C", "arm"] };
  // a 3-seat sofa with two chaise longues on its left end
  if (/^5-seat sofa/.test(v)) return { row: ["arm", "C", "C", "S3", "arm"] };
  if (/^chaise longue, add-on/.test(v)) return { addOn: true };
  if (/^corner sofa, 5-seat/.test(v)) return { back: ["S3", "arm"], wing: ["S2", "arm"] };
  if (/^corner sofa, 6-seat/.test(v)) return { back: ["S3", "C", "arm"], wing: ["S2", "arm"] };
  return null;
}

/** A cushion with its tufted face: a slab with a grid of raised squares on one side (axis 0, 1 or 2, facing +). */
function tufted(size: Vec3, axis: 0 | 1 | 2): PartPiece[] {
  const t = 12;
  const [a, c] = axis === 1 ? [0, 2] : axis === 2 ? [0, 1] : [2, 1];
  const na = Math.max(2, Math.round(size[a] / 230)), nc = Math.max(2, Math.round(size[c] / 230));
  const slab: Vec3 = [...size];
  slab[axis] -= t;
  const sp: Vec3 = [0, 0, 0];
  sp[axis] = -t / 2;
  const pieces: PartPiece[] = [{ shape: "box", size: slab, pos: sp }];
  const ca = size[a] / na, cc = size[c] / nc;
  for (let i = 0; i < na; i++)
    for (let j = 0; j < nc; j++) {
      const ps: Vec3 = [0, 0, 0], pp: Vec3 = [0, 0, 0];
      ps[a] = ca - 8;
      ps[c] = cc - 8;
      ps[axis] = t;
      pp[a] = -size[a] / 2 + ca * (i + 0.5);
      pp[c] = -size[c] / 2 + cc * (j + 0.5);
      pp[axis] = (size[axis] - t) / 2;
      pieces.push({ shape: "box", size: ps, pos: pp });
    }
  return pieces;
}

type StepOpts = { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] };
const stepper = (b: PlanBuilder) => (o: StepOpts, body: () => void = () => {}) =>
  b.step({ kind: "general", ...o, scene: o.scene ?? "main", warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const lay = layout(s);
  if (!lay) return false;
  const step = stepper(b);
  const H = Math.max(SEAT + 200, s.size.h * 10);
  const backH = H - SEAT;
  const legMat: PartMaterial = /corner/i.test(s.variant) ? "metal" : "wood";

  /* ---------- part types ---------- */
  const types = new Map<string, { type: string; mid: Vec3 }>();
  const comp = (name: string, pieces: PartPiece[], material: PartMaterial = "soft") => {
    const id = name + "|" + JSON.stringify(pieces.map((p) => [p.size, p.pos]));
    if (!types.has(id)) types.set(id, b.compound(name, pieces, { material }));
    return types.get(id)!;
  };
  const box = (size: Vec3, pos: Vec3): PartPiece => ({ shape: "box", size, pos });
  const legT = b.part("Leg", [LD, LEGH, LD], { shape: "cyl", material: legMat });
  const sleeveT = b.part("Leg sleeve", [LD + 4, 85, LD + 4], { shape: "cyl", material: "soft" });
  const armT = b.part("Armrest", [ARM, BACK - LEGH, D], { material: "soft" });

  /* ---------- modules ---------- */
  const mods: Mod[] = [];
  const mod = (cell: Cell | "K", ox: number, oz: number, yaw: 0 | 1, legEnd: 0 | 1 | -1 = 0): Mod => {
    const kind: Kind = cell === "arm" ? "arm" : cell === "C" ? "chaise" : cell === "K" ? "corner" : "sec";
    const w = cell === "K" ? K : widthOf(cell);
    const m: Mod = { kind, cell, w, ox, oz, yaw, legEnd, frame: { key: "", lp: [0, 0, 0] }, legs: [], sleeves: [], cush: [], backs: [] };
    mods.push(m);
    return m;
  };
  const putPart = (m: Mod, ref: string, lp: Vec3): Rec => ({ key: b.place(ref, W(m, lp), [0, rotY(m), 0]), lp });
  const putComp = (m: Mod, c: { type: string; mid: Vec3 }, at: Vec3 = [0, 0, 0]): Rec => putPart(m, c.type, plus(at, c.mid));
  const seatCush = (m: Mod, name: string, size: Vec3, at: Vec3) => m.cush.push(putComp(m, comp(name, tufted(size, 1)), at).key);
  const backCush = (m: Mod, name: string, size: Vec3, at: Vec3, axis: 0 | 2 = 2) => m.backs.push(putComp(m, comp(name, tufted(size, axis)), at).key);
  const leg = (m: Mod, x: number, z: number) => {
    m.legs.push(putPart(m, legT, [x, LEGH / 2, z]));
    m.sleeves.push(putPart(m, sleeveT, [x, LEGH - 42.5, z]));
  };
  const fill = (m: Mod) => {
    const w = m.w;
    if (m.kind === "arm") {
      m.frame = putPart(m, armT, [0, (LEGH + BACK) / 2, 0]);
      return;
    }
    if (m.kind === "sec") {
      const name = m.cell === "S1" ? "Armchair frame" : lay.back ? (m.cell === "S2" ? "2-seat section frame" : "3-seat section frame") : "Sofa frame";
      m.frame = putComp(m, comp(name, [box([w, BASE - LEGH, D], [0, (LEGH + BASE) / 2, 0]), box([w, BACK - BASE, BT], [0, (BASE + BACK) / 2, Z0 + BT / 2])]));
      const n = m.cell === "S1" ? 1 : 2;
      const cw = w / n;
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + cw * (i + 0.5);
        seatCush(m, "Seat cushion", [cw - 6, SEAT - BASE, D - BT - 4], [x, (BASE + SEAT) / 2, Z0 + BT + (D - BT) / 2]);
        backCush(m, "Back cushion", [cw - 10, backH, CB], [x, SEAT + backH / 2, Z0 + BT + CB / 2]);
      }
      const ends = m.legEnd === 0 ? [-1, 1] : [m.legEnd];
      for (const e of ends) for (const z of [-(D / 2 - 60), D / 2 - 60]) leg(m, e * (w / 2 - 50), z);
    } else if (m.kind === "chaise") {
      m.frame = putComp(m, comp("Chaise longue frame", [box([CW, BASE - LEGH, CL], [0, (LEGH + BASE) / 2, Z0 + CL / 2]), box([CW, BACK - BASE, BT], [0, (BASE + BACK) / 2, Z0 + BT / 2])]));
      seatCush(m, "Chaise seat cushion", [CW - 6, SEAT - BASE, CL - BT - 4], [0, (BASE + SEAT) / 2, Z0 + BT + (CL - BT) / 2]);
      backCush(m, "Back cushion", [CW - 10, backH, CB], [0, SEAT + backH / 2, Z0 + BT + CB / 2]);
      for (const z of [Z0 + 70, Z0 + CL - 90]) for (const x of [-(CW / 2 - 70), CW / 2 - 70]) leg(m, x, z);
    } else {
      // the corner: a square base with an L of backrest along its back and its left side
      m.frame = putComp(m, comp("Corner section frame", [
        box([K, BASE - LEGH, K], [0, (LEGH + BASE) / 2, 0]),
        box([K, BACK - BASE, BT], [0, (BASE + BACK) / 2, Z0 + BT / 2]),
        box([BT, BACK - BASE, K - BT], [-K / 2 + BT / 2, (BASE + BACK) / 2, Z0 + BT + (K - BT) / 2]),
      ]));
      const bw = K - BT;
      seatCush(m, "Corner seat cushion", [bw - 4, SEAT - BASE, bw - 4], [BT / 2, (BASE + SEAT) / 2, BT / 2]);
      backCush(m, "Corner back cushion", [bw, backH, CB], [BT / 2, SEAT + backH / 2, Z0 + BT + CB / 2]);
      backCush(m, "Corner back cushion", [CB, backH, bw - CB - 4], [-K / 2 + BT + CB / 2, SEAT + backH / 2, Z0 + BT + CB + (bw - CB) / 2], 0);
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) leg(m, x * (K / 2 - 60), z * (K / 2 - 60));
    }
  };

  // lay the modules out, centred on the origin
  let shift: Vec3 = [0, 0, 0];
  const plan: { cell: Cell | "K"; ox: number; oz: number; yaw: 0 | 1; legEnd: 0 | 1 | -1 }[] = [];
  const hasChaise = (lay.row ?? lay.back ?? []).includes("C") || !!lay.addOn;
  if (lay.addOn) plan.push({ cell: "C", ox: 0, oz: 0, yaw: 0, legEnd: 0 });
  else if (lay.row) {
    const total = lay.row.reduce((t, c) => t + widthOf(c), 0);
    let x = -total / 2;
    for (const c of lay.row) {
      plan.push({ cell: c, ox: x + widthOf(c) / 2, oz: 0, yaw: 0, legEnd: 0 });
      x += widthOf(c);
    }
  } else {
    plan.push({ cell: "K", ox: 0, oz: 0, yaw: 0, legEnd: 0 });
    let x = K / 2;
    for (const c of lay.back!) {
      plan.push({ cell: c, ox: x + widthOf(c) / 2, oz: 0, yaw: 0, legEnd: 1 }); // legs under the armrest end
      x += widthOf(c);
    }
    let z = K / 2;
    for (const c of lay.wing!) {
      plan.push({ cell: c, ox: 0, oz: z + widthOf(c) / 2, yaw: 1, legEnd: -1 }); // its armrest end is its own -x
      z += widthOf(c);
    }
    shift = [-(x - K / 2) / 2, 0, -(z - K / 2) / 2];
  }
  if (hasChaise && !lay.back) shift = [shift[0], 0, -(Z0 + CL / 2)];
  for (const p of plan) fill(mod(p.cell, p.ox + shift[0], p.oz + shift[2], p.yaw, p.legEnd));

  /* ---------- fittings ---------- */
  const fit = (def: HwDef, list: FitOpts[], gap = 0.08) => b.fits(def, list, gap);
  // the four holes in a frame's end, where an armrest's studs (or a chaise's bolts) go through
  const holes = (m: Mod, e: number): Vec3[] =>
    [[BASE - 80, -250], [BASE - 80, 250], [BASE + 110, Z0 + 80], [BACK - 60, Z0 + 80]].map(([y, z]) => [e * (m.w / 2), y, z]);
  const inside = (m: Mod, e: number, p: Vec3, d: number): Vec3 => W(m, [p[0] - e * d, p[1], p[2]]);
  const nutsIn = (m: Mod, e: number, wdef: HwDef, ndef: HwDef) => {
    const pts = holes(m, e);
    fit(wdef, pts.map((p) => ({ on: m.frame.key, at: inside(m, e, p, 40), dir: Wd(m, [e, 0, 0]), hole: false as const })), 0.06);
    b.then(0.05);
    fit(ndef, pts.map((p) => ({ on: m.frame.key, at: inside(m, e, p, 44), dir: Wd(m, [e, 0, 0]), hole: false as const, spin: 3 })), 0.07);
  };
  /** Carriage bolts from inside chaise c, through its side into the end e of a (or, with no a, sticking out for the sofa). */
  const boltOn = (c: Mod, a: Mod | null, e: number) => {
    // c's side that meets a is its own -e end
    const pts = holes(c, -e);
    fit(CBOLT, pts.map((p) => ({ on: c.frame.key, at: W(c, [p[0] + e * 40, p[1], p[2]]), dir: Wd(c, [-e, 0, 0]), mate: a?.frame.key, travel: 120, spin: 2 })), 0.1);
    b.then(0.1);
    if (a) nutsIn(a, e, WASH, NUT);
    else {
      // no sofa drawn: the washers and nuts go onto the bolt ends, where they sit inside the sofa's end
      fit(WASH, pts.map((p) => ({ on: c.frame.key, at: W(c, [p[0] - e * 36, p[1], p[2]]), dir: Wd(c, [e, 0, 0]), hole: false as const })), 0.06);
      b.then(0.05);
      fit(NUT, pts.map((p) => ({ on: c.frame.key, at: W(c, [p[0] - e * 40, p[1], p[2]]), dir: Wd(c, [e, 0, 0]), hole: false as const, spin: 3 })), 0.07);
    }
  };

  /* ---------- shared steps ---------- */
  type Put = (r: Rec, m: Mod, o?: { from?: Vec3; dx?: number }) => void;
  const putMain: Put = (r, m, o = {}) => (o.dx ? b.stage(r.key, W(m, plus(r.lp, [o.dx, 0, 0])), [0, rotY(m), 0], o.from) : b.add(r.key, o.from));
  const legsPrep = (list: Mod[], scene = "legs") => {
    const legs = list.flatMap((m) => m.legs.map((r, i) => ({ m, r, sl: m.sleeves[i] })));
    const n = legs.length;
    const cols = Math.min(n, 4);
    step({ title: n > 4 ? `Pull a sleeve over each of the ${n} legs` : "Pull a sleeve over each leg", detail: "Lift the washer off the bolt in the top of the leg, pull the sleeve down over its top half, then put the washer back on top.", scene, kind: "legs", warnings: ["hand"] }, () => {
      const spot = (i: number): Vec3 => [(i % cols - (cols - 1) / 2) * 140, 0, Math.floor(i / cols) * 140];
      b.stagger(0.06);
      legs.forEach((l, i) => b.stage(l.r.key, plus(spot(i), [0, LEGH / 2, 0]), [0, 0, 0]));
      b.then(0.1);
      b.stagger(0.12);
      legs.forEach((l, i) => b.stage(l.sl.key, plus(spot(i), [0, LEGH - 42.5, 0]), [0, 0, 0], [0, 220, 0]));
      b.then(0.1);
      fit(LWASH, legs.map((l) => ({ on: l.r.key, at: W(l.m, [l.r.lp[0], LEGH, l.r.lp[2]]), dir: [0, -1, 0] as Vec3, hole: false as const })), 0.08);
    });
  };
  const screwLegs = (list: Mod[], put: Put, title: string, detail: string, scene: string, pose: Pose, people: 1 | 2 = 1) => {
    step({ title, detail, scene, pose, kind: "legs", people, warnings: people === 2 ? ["two", "hand"] : ["hand"] }, () => {
      for (const m of list)
        m.legs.forEach((r, i) => {
          b.stagger(0);
          const from = Wd(m, [0, -220, 0]);
          put(r, m, { from });
          put(m.sleeves[i], m, { from });
          b.stagger(0.25);
          b.wait(0.25);
        });
    });
  };
  const cushions = () => {
    const seats = mods.flatMap((m) => m.cush);
    const backs = mods.flatMap((m) => m.backs.map((k) => ({ k, m })));
    step({ title: "Press on the seat cushions and fit the back cushions", detail: "Press each seat cushion down so the strips underneath grip. Tuck each back cushion's flap into the slot along the top of the backrest.", kind: "cushions" }, () => {
      b.stagger(0.15);
      for (const k of seats) b.add(k, [0, 320, 0]);
      b.then(0.15);
      for (const { k, m } of backs) b.add(k, Wd(m, [0, 200, 300]));
    });
  };
  /** The chaise longue manual on a sofa (or section) host lying on its back: armrest off, chaises bolted on, legs, armrest back. */
  const chaiseSeq = (host: Mod, chs: Mod[], e: number, arm: Mod, put: Put, scene: string) => {
    const two = chs.length > 1;
    const what = lay.back ? "section" : "sofa";
    step({ title: "Take the armrest off the end where the chaise goes", detail: "Undo the four nuts inside the frame with the box spanner. Keep the nuts and washers: the armrest goes back on at the end of the chaise.", scene, pose: "+z", tools: ["wrench"] }, () => {
      put(arm.frame, arm, { dx: e * 600 });
    });
    chs.forEach((c, i) => {
      const prev = i ? chs[i - 1] : host;
      step({ title: i ? "Lay the second chaise on its back against the first" : "Lay the chaise on its back against the open end", detail: "On the rug, its side tight against the end, with the four holes lined up.", scene, pose: "+z", kind: "join", warnings: ["floor"] }, () => {
        put(c.frame, c, { from: [e * 700, 0, 0] });
      });
      step({ title: i ? "Bolt the second chaise on the same way" : `Bolt the chaise to the ${what}`, detail: "Push the four carriage bolts through from inside the chaise. Put a washer and nut on each and tighten them with the box spanner.", scene, pose: "+z", kind: "bolts", tools: ["wrench"] }, () => boltOn(c, prev, e));
    });
    legsPrep(chs);
    screwLegs(chs, put, two ? "Screw four legs into each chaise" : "Screw the four legs into the chaise", "Turn each one clockwise by hand until it sits tight against its washer.", scene, "+z");
    step({ title: two ? "Bolt the armrest onto the outer chaise" : "Bolt the armrest onto the chaise's outer side", detail: "Push its four studs through the holes, then tighten the washers and nuts you took off with the box spanner.", scene, pose: "+z", kind: "bolts", tools: ["wrench"] }, () => {
      put(arm.frame, arm, { from: [e * 400, 0, 0] });
      b.then(0.15);
      nutsIn(chs[chs.length - 1], e, AWASH, ANUT);
    });
  };

  /* ---------- the chaise longue on its own ---------- */
  if (lay.addOn) {
    const c = mods[0];
    const e = -1; // the sofa stands to the right of the chaise, so its joint face is in view
    step({ title: "Lay your sofa on its back and take off one armrest", detail: "On a rug. Undo the four nuts inside the frame with the box spanner and keep them with their washers.", pose: "+z", tools: ["wrench"], warnings: ["floor"] });
    step({ title: "Lay the chaise on its back against the open end", detail: "On the rug, its side tight against the sofa's end, with the four holes lined up.", pose: "+z", kind: "join", warnings: ["floor"] }, () => b.add(c.frame.key, [e * 700, 0, 0]));
    step({ title: "Bolt the chaise to the sofa", detail: "Push the four carriage bolts through from inside the chaise. Put a washer and nut on each inside the sofa and tighten them with the box spanner.", pose: "+z", kind: "bolts", tools: ["wrench"] }, () => boltOn(c, null, e));
    legsPrep([c]);
    screwLegs([c], putMain, "Screw the four legs into the chaise", "Turn each one clockwise by hand until it sits tight against its washer.", "main", "+z");
    step({ title: "Bolt the armrest onto the chaise's outer side", detail: "Push its four studs through the holes, then tighten the washers and nuts you took off with the box spanner.", pose: "+z", kind: "bolts", tools: ["wrench"] });
    step({ title: "Tip the sofa and chaise up onto their legs", detail: "Together, slowly, so the joint takes no knocks.", kind: "standup", people: 2 });
    cushions();
    return true;
  }

  /* ---------- a sofa or armchair, with any chaise longues on one end ---------- */
  if (lay.row) {
    const sec = mods.find((m) => m.kind === "sec")!;
    const chs = mods.filter((m) => m.kind === "chaise").sort((p, q) => Math.abs(p.ox - sec.ox) - Math.abs(q.ox - sec.ox));
    const e = chs.length ? Math.sign(chs[0].ox - sec.ox) : 0;
    const arms = mods.filter((m) => m.kind === "arm");
    const far = chs.length ? arms.find((a) => Math.sign(a.ox - sec.ox) === e) : undefined;
    const what = sec.cell === "S1" ? "armchair" : "sofa";
    legsPrep([sec]);
    step({ title: `Lay the ${what} on its back on a rug`, detail: "The armrests come bolted on. A rug or the flattened box keeps the fabric clean.", pose: "+z", kind: "flip", warnings: ["floor"] }, () => {
      b.add(sec.frame.key, [0, 300, 0]);
      for (const a of arms) {
        if (a === far) putMain(a.frame, a, { dx: -e * CW * chs.length });
        else b.add(a.frame.key);
      }
    });
    screwLegs([sec], putMain, "Screw a leg into each corner of the frame", "Turn each one clockwise by hand until it sits tight against its washer.", "main", "+z");
    if (far) chaiseSeq(sec, chs, e, far, putMain, "main");
    step({ title: `Stand the ${what} up on its legs`, detail: chs.length ? "Together, slowly, so the joint to the chaise takes no knocks." : "Tip it forward by the backrest, not by the legs.", kind: "standup", people: chs.length ? 2 : 1, warnings: chs.length ? ["two"] : [] });
    cushions();
    return true;
  }

  /* ---------- the corner sofa ---------- */
  const corner = mods.find((m) => m.kind === "corner")!;
  const secs = mods.filter((m) => m.kind === "sec");
  const back = secs.find((m) => m.yaw === 0)!, wing = secs.find((m) => m.yaw === 1)!;
  const chs = mods.filter((m) => m.kind === "chaise" && m.yaw === 0);
  const armOf = (m: Mod) => mods.filter((a) => a.kind === "arm" && a.yaw === m.yaw).sort((p, q) => Math.hypot(p.ox - m.ox, p.oz - m.oz) - Math.hypot(q.ox - m.ox, q.oz - m.oz))[0];
  const backArm = armOf(back), wingArm = armOf(wing);
  // the two sections lie side by side on their backs in their own scene
  const off = new Map<Mod, Vec3>([[back, [1150, 0, 0]], [wing, [-1150, 0, 0]]]);
  const hostOf = (m: Mod) => (m.yaw === 1 ? wing : back);
  const putSec: Put = (r, m, o = {}) => {
    const h = hostOf(m);
    b.stage(r.key, plus(off.get(h)!, plus(rel(h, m), plus(r.lp, [o.dx ?? 0, 0, 0]))), [0, 0, 0], o.from);
  };
  const putCorner: Put = (r, _m, o = {}) => b.stage(r.key, r.lp, [0, 0, 0], o.from);

  legsPrep([corner, back, wing]);
  step({ title: "Turn the corner section upside down", detail: "On a rug or the flattened box, so the fabric stays clean.", scene: "corner", pose: "-y", kind: "flip", warnings: ["floor"] }, () => putCorner(corner.frame, corner, { from: [0, 300, 0] }));
  screwLegs([corner], putCorner, "Screw a leg into each corner", "Turn each one clockwise by hand until it sits tight against its washer.", "corner", "-y");
  // three U brackets low on each open side: the right end (toward the long section) and the front (toward the wing)
  const brk: { p: Vec3; d: Vec3 }[] = [
    ...[-280, 0, 280].map((t) => ({ p: [K / 2, LEGH + 40, t] as Vec3, d: [-1, 0, 0] as Vec3 })),
    ...[-200, 80, 330].map((t) => ({ p: [t, LEGH + 40, K / 2] as Vec3, d: [0, 0, -1] as Vec3 })),
  ];
  step({ title: "Turn it over and screw on the six U brackets", detail: "Three low down on each open side, the loops facing out, with the Allen key.", scene: "corner", kind: "screws", tools: ["allen"] }, () => {
    fit(UBRK, brk.map((q) => ({ on: corner.frame.key, at: W(corner, q.p), dir: Wd(corner, q.d), hole: false as const, twist: Math.PI / 2 })), 0.12);
    b.then(0.1);
    fit(BSCREW, brk.map((q) => ({ on: corner.frame.key, at: W(corner, [q.p[0] - q.d[0] * 4, q.p[1] + 15, q.p[2] - q.d[2] * 4]), dir: Wd(corner, q.d), travel: 40 })), 0.1);
  });
  step({ title: "Lay both sections on their backs and screw in their legs", detail: "Two legs under each armrest end; the open ends hang on the corner. Turn each leg clockwise by hand until it sits tight.", scene: "sections", pose: "+z", kind: "legs", warnings: ["floor", "hand"] }, () => {
    b.stagger(0.3);
    for (const m of [wing, back]) {
      putSec(m.frame, m, { from: [0, 300, 0] });
      const a = m === back ? backArm : wingArm;
      putSec(a.frame, a, chs.length && m === back ? { from: [0, 300, 0], dx: -CW * chs.length } : { from: [0, 300, 0] });
    }
    b.then(0.15);
    for (const m of [wing, back])
      m.legs.forEach((r, i) => {
        b.stagger(0);
        putSec(r, m, { from: [0, -220, 0] });
        putSec(m.sleeves[i], m, { from: [0, -220, 0] });
        b.stagger(0.25);
        b.wait(0.25);
      });
  });
  if (chs.length) chaiseSeq(back, chs, 1, backArm, putSec, "sections");
  step({ title: "Stand the corner section where the sofa will go", detail: "Leave room behind it to walk round while you hang the sections on.", kind: "join", people: 2 }, () => {
    for (const r of [corner.frame, ...corner.legs, ...corner.sleeves]) b.add(r.key, [0, 250, 0]);
  });
  const hang = (m: Mod, title: string, people: 1 | 2) => {
    const group = mods.filter((x) => x === m || (x.kind !== "corner" && x.kind !== "sec" && hostOf(x) === m && x.yaw === m.yaw));
    const e = m.yaw === 1 ? 1 : -1; // the open end, in the section's own frame
    step({ title, detail: "Push the pin into the hole at the top of the open end. Tilt the section, lower the pin into the slot in the corner's side, and let the frame drop into the brackets.", kind: "join", people }, () => {
      for (const x of group) for (const r of [x.frame, ...x.legs, ...x.sleeves]) b.add(r.key, [0, 300, 0]);
      b.then(0.15);
      fit(PIN, [{ on: m.frame.key, at: W(m, [e * (m.w / 2), BACK - 80, Z0 + BT / 2]), dir: Wd(m, [e, 0, 0]), mate: corner.frame.key, travel: 70 }]);
    });
  };
  hang(back, chs.length ? "Hang the long section and chaise on the corner" : "Hang the long section on the corner", chs.length ? 2 : 1);
  hang(wing, "Hang the short section on the corner's other side", 1);
  cushions();
  return true;
}

const family: Family = { names: ["LANDSKRONA"], build };
export default family;
