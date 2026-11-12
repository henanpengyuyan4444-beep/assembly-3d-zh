import type { Family } from "./family";
import type { Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/**
 * JÄTTEBO, from IKEA's manuals: every module is a storage seat box with a lid on struts and a separate backrest.
 * The seat box gets its legs while it lies on its back (four, seven on the chaise longue), then the covers go on:
 * the box, the lid, and the backrest after its two legs and two peg brackets. The backrest's pegs drop into holes
 * in the back of the frame and a link arm is bolted on underneath. An armrest is built like a backrest and hooks
 * onto the end of a module the same way (on a chaise longue it stands in the notch beside the backrest). The
 * modules are then locked together with connecting fittings, two at each join, pegged into the frames under the
 * lids. A corner is a 1-seat module with an armrest standing along its side as the second backrest. The U-shaped
 * sofa is a corner sofa with a chaise longue closing the back row; its two headrest cushions hang on the backrests.
 */

type Cell = { k: "seat"; w: number } | { k: "chaise"; o: 1 | -1; arm: boolean } | { k: "arm" };
interface Rec {
  key: string;
  lp: Vec3; // centre in the module's own frame
}
interface Arm {
  s: 1 | -1; // the side of the module it stands on, in the module's own frame
  face: number; // module x of its inner face
  body: Rec;
  legs: Rec[];
}
interface Mod {
  kind: "seat" | "chaise";
  w: number;
  o: 1 | -1; // a chaise's outer side
  ox: number;
  oz: number;
  yaw: 0 | 1; // 1: turned a quarter, its front facing +x (the return of a corner sofa)
  bx: number; // backrest centre and length, module x
  bw: number;
  box?: Rec;
  back?: Rec;
  legs: Rec[];
  blegs: Rec[];
  arm?: Arm;
  armSide?: 1 | -1;
}

const D = 950, Z0 = -475, BT = 250, LEG = 40, BOX = 290, LID = 460, TOP = 710, AW = 250, CD = 1600;
const S1 = 700, S15 = 950;
const BRACKET: HwDef = { kind: "angle", len: 60, dia: 50, name: "Bracket with peg" };
const BSCREW: HwDef = { kind: "screw", len: 30, dia: 6 };
const LINK: HwDef = { kind: "connector", len: 160, dia: 30, name: "Link arm" };
const LBOLT: HwDef = { kind: "bolt", len: 40, dia: 8 };
const CONN: HwDef = { kind: "connector", len: 120, dia: 30, name: "Connecting fitting" };

const W = (m: Mod, v: Vec3): Vec3 => (m.yaw ? [m.ox + v[2], v[1], m.oz - v[0]] : [m.ox + v[0], v[1], m.oz + v[2]]);
const Wd = (m: Mod, d: Vec3): Vec3 => (m.yaw ? [d[2], d[1], -d[0]] : d);
const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const seat = (w: number): Cell => ({ k: "seat", w });
const ARM: Cell = { k: "arm" };

interface Layout {
  row?: Cell[];
  corner?: boolean;
  back?: Cell[];
  wing?: Cell[];
  heads?: number; // headrest cushions, on the first back-row seats after the corner
}

/** What the product is made of, from its name; null for a product these manuals don't cover. */
function layout(s: ProductSpec): Layout | null {
  const v = s.variant.toLowerCase().trim();
  if (/^2-seat modular sofa/.test(v)) return { row: [ARM, seat(S1), seat(S1), ARM] };
  if (/^3-seat modular sofa/.test(v)) return { row: [ARM, seat(S15), seat(S15), ARM] };
  if (/^4,5-seat modular sofa/.test(v)) return { row: [seat(S15), seat(S15), seat(S15)] };
  if (/^2,5-seat mod sofa w chaise/.test(v)) return { row: [{ k: "chaise", o: -1, arm: true }, seat(S15)] };
  if (/^4-seat mod sofa w chaise/.test(v)) return { row: [ARM, seat(S15), seat(S15), { k: "chaise", o: 1, arm: true }] };
  if (/^3,5-seat mod sofa w chaise longues/.test(v)) return { row: [{ k: "chaise", o: -1, arm: true }, seat(S15), { k: "chaise", o: 1, arm: false }] };
  if (/^4,5-seat mod sofa w chaise/.test(v)) return { row: [seat(S15), seat(S1), seat(S1), { k: "chaise", o: 1, arm: true }] };
  if (/^mod crnr sofa 2,5-seat w chaise/.test(v)) return { corner: true, back: [{ k: "chaise", o: 1, arm: false }], wing: [seat(S15)] };
  // 380 cm along the back (corner, two 1,5-seat modules, the chaise with its armrest), 310 down the side
  if (/^u-shaped sofa, 7-seat/.test(v)) return { corner: true, back: [seat(S15), seat(S15), { k: "chaise", o: 1, arm: true }], wing: [seat(S15), seat(S15), ARM], heads: 2 };
  if (/^modular corner sofa, 6/.test(v)) return { corner: true, back: [seat(S15), seat(S15), ARM], wing: [seat(S15), seat(S15), ARM] };
  if (/^chaise longue module, left/.test(v)) return { row: [{ k: "chaise", o: -1, arm: false }] };
  if (/^chaise longue module, right/.test(v)) return { row: [{ k: "chaise", o: 1, arm: true }] };
  return null;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const lay = layout(s);
  if (!lay) return false;

  /* ---------- where every module stands ---------- */
  const mods: Mod[] = [];
  const joins: { a: Mod; b: Mod; pts: Vec3[]; alongZ: boolean }[] = [];
  const mk = (c: Cell, ox: number, oz: number, yaw: 0 | 1): Mod => {
    const chaise = c.k === "chaise";
    const w = c.k === "seat" ? c.w : S15;
    const o = chaise ? c.o : 1;
    const m: Mod = { kind: chaise ? "chaise" : "seat", w, o, ox, oz, yaw, bx: chaise ? -o * (AW / 2) : 0, bw: chaise ? S15 - AW : w, legs: [], blegs: [] };
    if (chaise && c.arm) m.armSide = o;
    mods.push(m);
    return m;
  };
  // the frames of two modules side by side: two fittings pegged into the top edges, across the join
  const join = (a: Mod, bm: Mod, bx: number) => joins.push({ a, b: bm, pts: [-75, 325].map((z) => W(a, [bx, BOX, z])), alongZ: !!a.yaw });
  const chain = (list: Cell[], start: number, yaw: 0 | 1, first?: Mod) => {
    let c = start;
    let prev = first;
    let pendingArm = false;
    for (const x of list) {
      if (x.k === "arm") {
        if (prev) prev.armSide = yaw ? -1 : 1;
        else pendingArm = true;
        c += AW;
        continue;
      }
      const w = x.k === "seat" ? x.w : S15;
      const m = yaw ? mk(x, D / 2, c + w / 2, 1) : mk(x, c + w / 2, 0, 0);
      if (pendingArm) m.armSide = -1;
      pendingArm = false;
      if (prev && prev !== first) join(prev, m, yaw ? -prev.w / 2 : prev.w / 2);
      c += w;
      prev = m;
    }
  };
  let corner: Mod | undefined;
  if (lay.corner) {
    corner = mk(seat(S1), AW + S1 / 2, 0, 0);
    corner.armSide = -1;
    chain(lay.back ?? [], D, 0, corner);
    for (const m of mods.slice(1)) {
      if (!m.yaw) {
        join(corner, m, S1 / 2);
        break;
      }
    }
    const before = mods.length;
    chain(lay.wing ?? [], Z0 + D, 1, corner);
    const w0 = mods[before];
    if (w0) joins.push({ a: corner, b: w0, pts: [AW + 150, D - 150].map((x) => [x, BOX, Z0 + D] as Vec3), alongZ: true });
  } else {
    const total = (lay.row ?? []).reduce((t, x) => t + (x.k === "arm" ? AW : x.k === "seat" ? x.w : S15), 0);
    chain(lay.row ?? [], -total / 2, 0);
  }
  // centre the footprint on the origin
  {
    const xs: number[] = [], zs: number[] = [];
    for (const m of mods) {
      const dep = m.kind === "chaise" ? CD : D;
      const ext = m.armSide && m.kind === "seat" ? AW : 0;
      const lo = m.armSide === -1 ? -m.w / 2 - ext : -m.w / 2, hi = m.armSide === 1 ? m.w / 2 + ext : m.w / 2;
      for (const v of [W(m, [lo, 0, Z0]), W(m, [hi, 0, Z0 + dep])]) {
        xs.push(v[0]);
        zs.push(v[2]);
      }
    }
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    for (const m of mods) {
      m.ox -= cx;
      m.oz -= cz;
    }
    for (const j of joins) j.pts = j.pts.map((p) => [p[0] - cx, p[1], p[2] - cz] as Vec3);
  }

  /* ---------- the parts ---------- */
  const legT = b.part("Leg", [55, LEG, 55], { shape: "cyl", material: "wood" });
  const types = new Map<string, string>();
  const typeOf = (name: string, size: Vec3) => {
    const id = `${name}|${size.join("x")}`;
    if (!types.has(id)) types.set(id, b.part(name, size, { material: "soft" }));
    return types.get(id)!;
  };
  const boxes = new Map<string, { type: string; mid: Vec3 }>();
  const rot = (m: Mod): Vec3 => [0, m.yaw ? Math.PI / 2 : 0, 0];
  const put = (m: Mod, ref: string, lp: Vec3): Rec => ({ key: b.place(ref, W(m, lp), rot(m)), lp });
  const leg = (m: Mod, x: number, z: number) => put(m, legT, [x, LEG / 2, z]);
  const hb = (BOX - LEG) / 2 + LEG, hl = (LID - BOX) / 2 + BOX, hb2 = BOX - LEG, hl2 = LID - BOX;
  for (const m of mods) {
    if (m.kind === "seat") {
      const id = `seat${m.w}`;
      const zc = Z0 + BT + (D - BT) / 2;
      const c = boxes.get(id) ?? b.compound(m.w === S1 ? "Seat box, 1-seat" : "Seat box, 1,5-seat", [
        { shape: "box", size: [m.w, hb2, D - BT], pos: [0, hb, zc] },
        { shape: "box", size: [m.w - 6, hl2, D - BT - 6], pos: [0, hl, zc] },
      ], { material: "soft" });
      boxes.set(id, c);
      m.box = put(m, c.type, c.mid);
      for (const x of [-1, 1]) for (const z of [Z0 + BT + 70, Z0 + D - 70]) m.legs.push(leg(m, x * (m.w / 2 - 70), z));
    } else {
      const o = m.o;
      const id = `chaise${o}`;
      // an L: a 70 cm wide part in front of the backrest and the full-width front of the chaise
      const zb = Z0 + BT + (D - BT) / 2, zf = Z0 + D + (CD - D) / 2;
      const c = boxes.get(id) ?? b.compound(o < 0 ? "Chaise longue box, left" : "Chaise longue box, right", [
        { shape: "box", size: [S15 - AW, hb2, D - BT], pos: [m.bx, hb, zb] },
        { shape: "box", size: [S15, hb2, CD - D], pos: [0, hb, zf] },
        { shape: "box", size: [S15 - AW - 6, hl2, D - BT], pos: [m.bx, hl, zb] },
        { shape: "box", size: [S15 - 6, hl2, CD - D - 6], pos: [0, hl, zf - 3] },
      ], { material: "soft" });
      boxes.set(id, c);
      m.box = put(m, c.type, c.mid);
      const pts: [number, number][] = [
        [-o * 405, Z0 + BT + 70], [o * 155, Z0 + BT + 70], [o * 155, Z0 + D - 70], [o * 405, Z0 + D + 70],
        [o * 405, Z0 + CD - 70], [-o * 405, Z0 + CD - 70], [-o * 405, Z0 + D + 100],
      ];
      for (const [x, z] of pts) m.legs.push(leg(m, x, z));
    }
    m.back = put(m, typeOf("Backrest", [m.bw, TOP - LEG, BT]), [m.bx, (LEG + TOP) / 2, Z0 + BT / 2]);
    for (const x of [-1, 1]) m.blegs.push(leg(m, m.bx + x * (m.bw / 2 - 70), Z0 + BT / 2));
    if (m.armSide) {
      const sd = m.armSide;
      const ax = m.kind === "chaise" ? sd * (S15 / 2 - AW / 2) : sd * (m.w / 2 + AW / 2);
      const body = put(m, typeOf("Armrest", [AW, TOP - LEG, D]), [ax, (LEG + TOP) / 2, 0]);
      m.arm = { s: sd, face: ax - (sd * AW) / 2, body, legs: [Z0 + 70, Z0 + D - 70].map((z) => leg(m, ax, z)) };
    }
  }

  /* ---------- the steps ---------- */
  const alone = mods.length === 1;
  const M = alone ? "main" : "modules";
  const seats = mods.filter((m) => m.kind === "seat");
  const chaises = mods.filter((m) => m.kind === "chaise");
  const armed = mods.filter((m) => m.arm);
  const pl = (n: number, one: string, many: string) => (n > 1 ? many : one);
  const step = (o: { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] }, body: () => void = () => {}) =>
    b.step({ kind: "general", ...o, scene: o.scene ?? "main", warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
  const at = (m: Mod, lp: Vec3, d: Vec3, on: string, mate?: string, hole?: false): FitOpts => ({ on, at: W(m, lp), dir: Wd(m, d), mate, hole });

  // each module has its own spot in the scenes where it is built, side by side
  const offs = new Map<Mod, number>();
  {
    const widths = mods.map((m) => m.w + 2 * AW + 350);
    const total = widths.reduce((a, w) => a + w, 0);
    let x = -total / 2;
    mods.forEach((m, i) => {
      offs.set(m, x + widths[i] / 2);
      x += widths[i];
    });
  }
  const off = (m: Mod): Vec3 => [offs.get(m)!, 0, 0];
  const show = (scene: string, m: Mod, recs: Rec[], from?: Vec3) => {
    for (const r of recs) {
      if (scene === "main") b.add(r.key, from);
      else b.stage(r.key, plus(off(m), r.lp), [0, 0, 0], from);
    }
  };
  const pads = (m: Mod, legs: Rec[]) => b.fits(HW.glide, legs.map((l) => at(m, [l.lp[0], 0, l.lp[2]], [0, 1, 0], l.key, undefined, false)), 0.06);

  const nBox = mods.length;
  const boxWord = seats.length && chaises.length ? "seat boxes" : seats.length ? pl(nBox, "seat box", "seat boxes") : pl(nBox, "chaise longue", "chaise longues");
  const oneBox = seats.length ? "seat box" : "chaise longue";
  const legWords = [
    seats.length ? pl(seats.length, "four legs in the seat box", "four legs in each seat box") : "",
    chaises.length ? `seven${seats.length ? "" : " legs"} in ${chaises.length > 1 ? "each" : "the"} chaise longue` : "",
  ].filter(Boolean).join(", ");
  const its = nBox > 1 ? "them" : "it";

  /* the seat boxes, with their lids */
  step({ title: nBox > 1 ? `Tip the ${boxWord} onto their backs and screw in the legs` : `Tip the ${oneBox} onto its back and screw in the legs`, detail: `${legWords.charAt(0).toUpperCase()}${legWords.slice(1)}. Clockwise by hand until each one is snug.`, scene: M, pose: "+z", kind: "legs", warnings: ["hand", "floor"] }, () => {
    b.stagger(0.25);
    for (const m of mods) show(M, m, [m.box!], [0, 220, 0]);
    b.then(0.15);
    b.stagger(0.12);
    for (const m of mods) show(M, m, m.legs, [0, -220, 0]);
  });
  step({ title: "Stick a felt pad under each leg", detail: "Break the pads off the sheet and press one onto the end of every leg.", scene: M, pose: "+z" }, () => {
    for (const m of mods) pads(m, m.legs);
  });
  step({ title: `Stand ${its} up and pull the cover over the ${nBox > 1 ? "boxes" : "box"}`, detail: "Lift the lid first. One of you on each side: work the cover down evenly so the seams sit on the corners.", scene: M, kind: "general", people: 2 });
  step({ title: "Fasten the cover inside the top edge and underneath", detail: `Fold each corner flat (${chaises.length ? (seats.length ? "four on a seat box, five on the chaise" : "five of them") : "four of them"}), press the strip down inside the top of the frame, then pull the cover under the box and fasten it there.`, scene: M });
  step({ title: nBox > 1 ? "Pull the covers over the lids and fasten them underneath" : "Pull the cover over the lid and fasten it underneath", detail: "With the lid still up, fold the cover neatly round its corners and press the strip under its edge.", scene: M, people: 2 });

  /* the backrests */
  const backs = (m: Mod) => [m.back!, ...m.blegs];
  const nb = mods.length;
  step({ title: nb > 1 ? "Lay the backrests on their backs and screw in the legs" : "Lay the backrest on its back and screw in the legs", detail: nb > 1 ? "Two legs in the bottom of each, clockwise by hand." : "Two legs in its bottom, clockwise by hand.", scene: "backrests", pose: "+z", kind: "legs", warnings: ["hand", "floor"] }, () => {
    b.stagger(0.25);
    for (const m of mods) b.stage(m.back!.key, plus(off(m), m.back!.lp), [0, 0, 0], [0, 220, 0]);
    b.then(0.15);
    for (const m of mods) for (const l of m.blegs) b.stage(l.key, plus(off(m), l.lp), [0, 0, 0], [0, -220, 0]);
  });
  step({ title: "Stick a felt pad under each leg", scene: "backrests", pose: "+z" }, () => {
    for (const m of mods) pads(m, m.blegs);
  });
  const bPts = (m: Mod) => [-1, 1].map((k) => m.bx + (k * m.bw) / 4);
  step({ title: nb > 1 ? "Screw two brackets onto the front of each backrest" : "Screw two brackets onto the front of the backrest", detail: "Low down, with the pegs pointing down. Two screws in each bracket, with the Allen key.", scene: "backrests", pose: "+z", kind: "screws", tools: ["allen"] }, () => {
    for (const m of mods) b.fits(BRACKET, bPts(m).map((x) => ({ ...at(m, [x, BOX + 30, Z0 + BT], [0, -1, 0], m.back!.key, m.box!.key), mateHole: 5 })), 0.12);
    b.then(0.1);
    for (const m of mods) b.fits(BSCREW, bPts(m).flatMap((x) => [-35, 35].map((dx) => at(m, [x + dx, BOX + 55, Z0 + BT], [0, 0, -1], m.back!.key))), 0.08);
  });
  step({ title: nb > 1 ? "Stand them up and pull the covers down over them" : "Stand it up and pull the cover down over it", detail: "One of you at each end, working the cover down evenly.", scene: "backrests", people: 2 });
  step({ title: "Fasten the cover underneath and along the top", detail: "Pull it tight under the bottom edge and fasten the strips, then do the same along the top.", scene: "backrests" });

  step({ title: nb > 1 ? `Lower the backrests onto the ${boxWord}` : `Lower the backrest onto the ${oneBox}`, detail: "Lift the lid. Guide both pegs into the holes along the back of the frame, pressing on the plastic rings, not the fabric.", scene: M, kind: "join" }, () => {
    b.stagger(0.3);
    for (const m of mods) show(M, m, backs(m), [0, 320, 0]);
  });
  step({ title: nBox > 1 ? "Tip each module onto its side and bolt on the link arm" : "Tip it onto its side and bolt on the link arm", detail: "Underneath, at the join: the arm's peg goes into the frame of the box and the bolt through it into the backrest. Tighten with the Allen key and stand it up again.", scene: M, pose: "+x", kind: "bolts", tools: ["allen"], warnings: ["floor"] }, () => {
    for (const m of mods) {
      const x = m.bx - m.bw / 2 + 160;
      b.fits(LINK, [{ ...at(m, [x, LEG, Z0 + BT + 40], [0, 1, 0], m.box!.key, m.back!.key), hole: false }]);
    }
    b.then(0.1);
    for (const m of mods) b.fits(LBOLT, [at(m, [m.bx - m.bw / 2 + 160, LEG, Z0 + BT - 60], [0, 1, 0], m.back!.key)]);
  });

  /* the armrests */
  if (armed.length) {
    const na = armed.length;
    // laid on their outer sides, the inner side up (the right-hand ones turned round)
    const stageArm = (m: Mod, from?: Vec3) => {
      const a = m.arm!;
      const flip = a.s === 1;
      const base = plus(off(m), [0, 0, 0]);
      b.stage(a.body.key, plus(base, [0, a.body.lp[1], 0]), [0, flip ? Math.PI : 0, 0], from);
      return { a, flip, base };
    };
    const brk = (_m: Mod) => [Z0 + BT + 150, Z0 + D - 150];
    step({ title: na > 1 ? "Lay the armrests on their sides and screw in the legs" : "Lay the armrest on its side and screw in the legs", detail: "Inner side up. Two legs in the bottom, clockwise by hand.", scene: "arms", pose: "+x", kind: "legs", warnings: ["hand", "floor"] }, () => {
      b.stagger(0.25);
      const st = armed.map((m) => stageArm(m, [0, 220, 0]));
      b.then(0.15);
      for (const { a, flip, base } of st) {
        for (const l of a.legs) {
          const r: Vec3 = [l.lp[0] - a.body.lp[0], l.lp[1], l.lp[2] - a.body.lp[2]];
          b.stage(l.key, plus(base, flip ? [-r[0], r[1], -r[2]] : r), [0, 0, 0], [0, -220, 0]);
        }
      }
    });
    step({ title: "Stick a felt pad under each leg", scene: "arms", pose: "+x" }, () => {
      for (const m of armed) pads(m, m.arm!.legs);
    });
    step({ title: na > 1 ? "Screw two brackets onto the inner side of each armrest" : "Screw two brackets onto the inner side of the armrest", detail: "Low down, pegs pointing down, two screws in each with the Allen key.", scene: "arms", pose: "+x", kind: "screws", tools: ["allen"] }, () => {
      for (const m of armed) {
        const a = m.arm!;
        b.fits(BRACKET, brk(m).map((z) => ({ ...at(m, [a.face, BOX + 30, z], [0, -1, 0], a.body.key, m.box!.key), mateHole: 5 })), 0.12);
      }
      b.then(0.1);
      for (const m of armed) {
        const a = m.arm!;
        b.fits(BSCREW, brk(m).flatMap((z) => [-35, 35].map((dz) => at(m, [a.face, BOX + 55, z + dz], [a.s, 0, 0], a.body.key))), 0.08);
      }
    });
    step({ title: na > 1 ? "Stand them up and pull the covers down over them" : "Stand it up and pull the cover down over it", detail: "One of you at each end, working the cover down evenly.", scene: "arms", people: 2 });
    step({ title: "Fasten the cover underneath and along the top", detail: "Pull it tight under the bottom edge and fasten the strips, then along the top.", scene: "arms" });
    const where = armed.every((m) => m.kind === "chaise") ? "into the corner of the chaise longue" : armed.every((m) => m.kind === "seat") ? (na > 1 ? "onto the ends of the modules" : "onto the end of the module") : "onto the ends of the modules";
    step({ title: `${na > 1 ? "Lower the armrests" : "Lower the armrest"} ${where}`, detail: "Lift the lid and guide both pegs into the holes in the side of the frame, pressing on the plastic rings.", scene: M, kind: "join" }, () => {
      b.stagger(0.3);
      for (const m of armed) show(M, m, [m.arm!.body, ...m.arm!.legs], Wd(m, [m.arm!.s * 300, 200, 0]));
    });
    step({ title: armed.length > 1 ? "Tip each one onto its side and bolt on the link arm" : "Tip it onto its side and bolt on the link arm", detail: "Underneath, at the join, the same way as on the backrest. Tighten with the Allen key and stand it up.", scene: M, pose: "+x", kind: "bolts", tools: ["allen"], warnings: ["floor"] }, () => {
      for (const m of armed) {
        const a = m.arm!;
        b.fits(LINK, [{ ...at(m, [a.face, LEG, Z0 + BT + 40], [0, 1, 0], m.box!.key, a.body.key), hole: false }]);
      }
      b.then(0.1);
      for (const m of armed) {
        const a = m.arm!;
        b.fits(LBOLT, [at(m, [a.face + a.s * 110, LEG, Z0 + BT + 40], [0, 1, 0], a.body.key)]);
      }
    });
  }

  /* joining the modules */
  if (!alone) {
    const recs = (m: Mod) => [m.box!, ...m.legs, ...backs(m), ...(m.arm ? [m.arm.body, ...m.arm.legs] : [])];
    const order = corner ? [corner, ...mods.filter((m) => m !== corner)] : mods;
    step({ title: corner ? "Stand the corner module in place, then the others beside it" : "Stand the modules in place side by side", detail: "Lift each one by its frame, together, and push it up tight against the one before.", kind: "join", people: 2 }, () => {
      b.stagger(0.05);
      order.forEach((m, i) => {
        b.then(i ? 0.1 : 0);
        for (const r of recs(m)) b.add(r.key, m.yaw ? [0, 0, 400] : [i ? 400 : 0, i ? 0 : 200, 0]);
      });
    });
    step({ title: "Lock the modules together with the connecting fittings", detail: "Lift the lids. Push the two pegs of a fitting into the holes on the edges of both frames, two fittings at each join, then close the lids.", kind: "join" }, () => {
      for (const j of joins) b.fits(CONN, j.pts.map((p) => ({ on: j.a.box!.key, at: p, dir: [0, -1, 0] as Vec3, mate: j.b.box!.key, hole: false as const, twist: j.alongZ ? Math.PI / 2 : 0 })), 0.15);
    });
  }
  if (lay.heads) {
    const hosts = mods.filter((m) => m.kind === "seat" && !m.yaw && m !== corner).slice(0, lay.heads);
    const hT = b.part("Headrest", [500, 140, 220], { material: "soft" });
    const heads = hosts.map((m) => b.place(hT, W(m, [m.bx, TOP + 70, Z0 + BT / 2]), rot(m)));
    step({ title: heads.length > 1 ? "Zip the covers onto the headrests and hang them on" : "Zip the cover onto the headrest and hang it on", detail: "Push each cushion into its cover and close the zip, then hook it over the top of a backrest where you want it.", kind: "cushions" }, () => {
      b.stagger(0.2);
      for (const k of heads) b.add(k, [0, 250, -150]);
    });
  }
  return true;
}

const family: Family = { names: ["JÄTTEBO"], build };
export default family;
