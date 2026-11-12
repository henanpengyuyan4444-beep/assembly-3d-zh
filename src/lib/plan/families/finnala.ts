import type { Family } from "./family";
import type { Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/**
 * FINNALA, from IKEA's manuals. Every module is its own frame. A seat section (the DARETORP frame) has no legs:
 * its backrest frame and then its top panel are each lowered onto threaded rods and nutted from inside, and it
 * hangs between its neighbours. The armrests carry the legs and are held on by three rods with nuts from inside
 * the section. A chaise or a corner section stands on its own legs and has U brackets a section is lowered into,
 * on a pin screwed into the section's end. The sofa-bed section stands on its own legs too and is bolted to its
 * neighbours with knob bolts from inside. Fabric versions get their covers on before the modules are joined; the
 * Grann/Bomstad leather ones come covered, and their corner section comes in one piece.
 */

type Kind = "seat" | "sleeper" | "arm" | "chaise" | "corner";
type Cell = number | "sleeper" | "chaise" | "arm";
interface Rec {
  key: string;
  lp: Vec3; // centre in the module's own frame
}
interface Mod {
  kind: Kind;
  w: number; // along the module's own x
  n: number; // seat cushions
  ox: number;
  oz: number;
  yaw: 0 | 1; // 1: turned a quarter, its front facing +x (the wing coming forward from the corner)
  recs: Rec[];
  legs: Rec[];
  cush: string[];
  backs: string[];
  k: Record<string, string>;
  scene: string; // where its frame is built
}
type JK = "arm3" | "armK" | "armc" | "hook" | "slpCorner" | "slpChaise";
interface J {
  kind: JK;
  a: Mod; // the module whose end the joint is on
  b: Mod; // the armrest, corner or chaise on that end
  s: 1 | -1; // which end of a, in a's own frame
}
interface Layout {
  leather: boolean;
  row?: Cell[];
  corner?: boolean;
  back?: Cell[];
  wing?: Cell[];
}

const D = 980, Z0 = -490, DB = 930, BT = 150, CAP = 40, LEG = 60;
const ARM = 150, CW = 810, CL = 1640, KW = 930, SW = 1730;
const W1 = 710, W2 = 1410, W3 = 2110;

const ROD: HwDef = { kind: "stud", len: 100, dia: 8, name: "Threaded rod" };
const NUT: HwDef = { kind: "nut", len: 6.5, dia: 8 };
const W16: HwDef = { kind: "washer", len: 1.6, dia: 16 };
const W24: HwDef = { kind: "washer", len: 2, dia: 24 };
const BIGW: HwDef = { kind: "washer", len: 8, dia: 50, name: "Big washer" };
const PIN: HwDef = { kind: "stud", len: 120, dia: 10, name: "Hanging pin" };
const BRK: HwDef = { kind: "hook", len: 60, dia: 40, name: "U bracket" };
const BSCREW: HwDef = { kind: "screw", len: 16, dia: 8 };
const HEAD: HwDef = { kind: "nut", len: 14, dia: 14, name: "Bolt head" };
const HROD: HwDef = { kind: "bolt", len: 100, dia: 8, name: "Rod with bolt head" };
const CBOLT: HwDef = { kind: "bolt", len: 100, dia: 8, name: "Carriage bolt" };
const HEX: HwDef = { kind: "bolt", len: 90, dia: 8, name: "Hex bolt" };
const JBOLT: HwDef = { kind: "bolt", len: 60, dia: 8, name: "Joining bolt" };
const KBOLT: HwDef = { kind: "bolt", len: 100, dia: 8, name: "Knob bolt" };
const KNOB: HwDef = { kind: "nut", len: 20, dia: 40, name: "Knob" };
const SSTUD: HwDef = { kind: "stud", len: 35, dia: 8 };
const ABOLT: HwDef = { kind: "bolt", len: 16, dia: 8 };
const FNUT: HwDef = { kind: "nut", len: 7, dia: 8, name: "Flange nut" };
const WINGB: HwDef = { kind: "bolt", len: 20, dia: 6, name: "Wing bolt" };
const BARSCREW: HwDef = { kind: "screw", len: 16, dia: 4 };

const W = (m: Mod, v: Vec3): Vec3 => (m.yaw ? [m.ox + v[2], v[1], m.oz - v[0]] : [m.ox + v[0], v[1], m.oz + v[2]]);
const Wd = (m: Mod, d: Vec3): Vec3 => (m.yaw ? [d[2], d[1], -d[0]] : d);
// where a module sits in another one's frame (they share a yaw when they are joined)
const rel = (m: Mod, a: Mod): Vec3 => {
  const dx = m.ox - a.ox, dz = m.oz - a.oz;
  return a.yaw ? [-dz, 0, dx] : [dx, 0, dz];
};
const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** What the product is made of, from its name: null for anything these manuals don't cover. */
function layout(s: ProductSpec): Layout | null {
  const v = s.variant.toLowerCase();
  // the Grann/Bomstad leather guides; their names don't say so
  const leather = s.slug === "finnala-corner-sleeper-sofa-5-seat" || s.slug === "finnala-sectional-4-seat-chaise" || /leather|grann|bomstad/.test(v);
  if (/^armchair/.test(v)) return { leather, row: ["arm", W1, "arm"] };
  if (/^loveseat/.test(v)) return { leather, row: ["arm", W2, "arm"] };
  if (/^sleeper sofa/.test(v)) return { leather, row: ["arm", "sleeper", "arm"] };
  if (/^chaise section/.test(v)) return { leather, row: ["chaise"] };
  if (/^corner section/.test(v)) return { leather, corner: true, back: [], wing: [] };
  if (/^3-seat sleeper sofa with chaise/.test(v)) return { leather, row: ["arm", "sleeper", "chaise", "arm"] };
  if (/^sectional, 4-seat with chaise/.test(v)) return { leather, row: ["arm", W3, "chaise", "arm"] };
  if (/^sectional, 4-seat corner/.test(v)) return { leather, corner: true, back: [W2, "arm"], wing: [W2, "arm"] };
  if (/^(corner|crnr) sleeper sofa, 5-seat/.test(v)) return { leather, corner: true, back: ["sleeper", "chaise", "arm"], wing: [W2, "arm"] };
  return null;
}

type StepOpts = { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] };

/** The ottoman: a box on four legs with a loose padded lid; its cover goes on with the legs off. */
function ottoman(b: PlanBuilder) {
  const step = (o: StepOpts, body: () => void = () => {}) => b.step({ kind: "general", ...o, warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
  const w = 980, h = 480, d = 730, lt = 130;
  const box = b.place(b.part("Storage box", [w, h - lt - LEG, d], { material: "soft" }), [0, LEG + (h - lt - LEG) / 2, 0]);
  const lid = b.place(b.part("Padded lid", [w, lt, d], { material: "soft" }), [0, h - lt / 2, 0]);
  const legT = b.part("Leg", [60, LEG, 60], { shape: "cyl", material: "wood" });
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * (w / 2 - 70), z * (d / 2 - 70)]);
  const legs = pts.map(([x, z]) => b.place(legT, [x, LEG / 2, z]));
  step({ title: "Lay the box on its back and screw in the legs", detail: "On something soft, with the bottom facing you. Clockwise by hand until each one is snug.", pose: "+z", kind: "legs", warnings: ["hand", "floor"] }, () => {
    b.add(box, [0, 200, 0]);
    b.then(0.1);
    b.stagger(0.2);
    for (const l of legs) b.add(l, [0, -220, 0], { spin: 2 });
  });
  step({ title: "Stick a felt pad under each leg", pose: "+z" }, () => {
    b.fits(HW.glide, legs.map((l, i) => ({ on: l, at: [pts[i][0], 0, pts[i][1]] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })), 0.12);
  });
  step({ title: "Stand it up and lay the lid on", detail: "The frame is done. The lid just sits on the box.", kind: "standup" }, () => b.add(lid, [0, 240, 0]));
  step({ title: "Fasten the cover along the inside of the rim", detail: "Lift the lid off. One of you on each side: press the cover's strip all the way round inside the top edge, then pull the cover down the sides.", people: 2 }, () => b.stage(lid, [0, lt / 2, d + 250], [0, 0, 0]));
  step({ title: "Pull the cover down and fasten it under the bottom edge", detail: "Smooth it over the corners so the seams sit on the edges." });
  step({ title: "Turn the box over and unscrew the legs", detail: "The cover pulls tight underneath with the legs out of the way.", pose: "-y", kind: "legs", warnings: ["floor", "hand"] }, () => {
    b.stagger(0.15);
    legs.forEach((l, i) => b.stage(l, [pts[i][0], LEG / 2 - 220, pts[i][1]], [0, 0, 0]));
  });
  step({ title: "Pull the cover over the lid and zip it closed", detail: "Stand the lid on its edge to work the cover down, then lay it flat and close the zip underneath.", scene: "lid" }, () => b.stage(lid, [0, lt / 2, 0], [0, 0, 0], [0, 200, 0]));
  step({ title: "Screw the legs back in through the cover", detail: "Through the holes in the cover, by hand. The cover's edge should sit round each leg, not under it.", pose: "-y", kind: "legs", warnings: ["hand"] }, () => {
    b.stagger(0.2);
    for (const l of legs) b.add(l, [0, -220, 0], { spin: 2 });
  });
  step({ title: "Stand the box up and lay the lid on top", detail: "You can lift the lid off to reach inside.", kind: "cushions" }, () => b.add(lid, [0, 240, 0]));
  return true;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  if (/^ottoman/i.test(s.variant)) return ottoman(b);
  const lay = layout(s);
  if (!lay) return false;
  const leather = lay.leather, fabric = !leather;
  const p = s.sofa ?? {};
  const H = s.size.h * 10;
  const seatTop = (p.seatH ?? 48) * 10;
  const baseTop = seatTop - 170;
  const backH = (p.backH ?? Math.min(71, s.size.h - 14)) * 10;
  const armH = (p.armH ?? 71) * 10;
  const cushH = H - seatTop - 10;
  const slTop = 160; // top of the sofa-bed's base; the folded bed and mattress lie on it

  const mods: Mod[] = [];
  const legT = b.part("Leg", [60, LEG, 60], { shape: "cyl", material: "wood" });
  const types = new Map<string, string>();
  const typeOf = (name: string, size: Vec3, material: "soft" | "board" | "metal" | "wood" = "soft") => {
    const id = `${name}|${size.map(Math.round).join("x")}`;
    if (!types.has(id)) types.set(id, b.part(name, size, { material }));
    return types.get(id)!;
  };
  const compounds = new Map<string, { type: string; mid: Vec3 }>();
  const comp = (id: string, make: () => { type: string; mid: Vec3 }) => {
    if (!compounds.has(id)) compounds.set(id, make());
    return compounds.get(id)!;
  };
  const put = (m: Mod, ref: string, lp: Vec3, list: Rec[] = m.recs) => {
    const key = b.place(ref, W(m, lp), [0, m.yaw ? Math.PI / 2 : 0, 0]);
    list.push({ key, lp });
    return key;
  };
  const leg = (m: Mod, x: number, z: number) => {
    put(m, legT, [x, LEG / 2, z], m.legs);
    m.recs.push(m.legs[m.legs.length - 1]);
  };
  const cushions = (m: Mod, x0: number, w: number, n: number, top: number) => {
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      const x = x0 - w / 2 + cw * (i + 0.5);
      const ref = (name: string, size: Vec3) => typeOf(name, size);
      m.cush.push(b.place(ref("Seat cushion", [cw - 8, seatTop - top, D - BT - 10]), W(m, [x, (top + seatTop) / 2, Z0 + BT + (D - BT) / 2 - 2]), [0, m.yaw ? Math.PI / 2 : 0, 0]));
      m.backs.push(b.place(ref("Back cushion", [cw - 14, cushH, 200]), W(m, [x, seatTop + cushH / 2, Z0 + BT + 104]), [0, m.yaw ? Math.PI / 2 : 0, 0]));
    }
  };
  const mod = (kind: Kind, w: number, ox: number, oz: number, yaw: 0 | 1): Mod => {
    const m: Mod = { kind, w, n: kind === "seat" ? Math.round(w / 700) : kind === "sleeper" ? 2 : kind === "arm" ? 0 : 1, ox, oz, yaw, recs: [], legs: [], cush: [], backs: [], k: {}, scene: "main" };
    mods.push(m);
    if (kind === "seat") {
      m.k.base = put(m, typeOf("Seat frame", [w, baseTop - LEG, DB], "board"), [0, LEG + (baseTop - LEG) / 2, Z0 + DB / 2]);
      m.k.back = put(m, typeOf("Backrest frame", [w, backH - CAP - baseTop, BT], "board"), [0, baseTop + (backH - CAP - baseTop) / 2, Z0 + BT / 2]);
      m.k.top = put(m, typeOf("Top panel", [w, CAP, BT + 40], "board"), [0, backH - CAP / 2, Z0 + (BT + 40) / 2]);
      cushions(m, 0, w, m.n, baseTop);
    } else if (kind === "sleeper") {
      const base = comp("slbase", () => {
        const pieces: { shape: "box" | "cyl"; size: Vec3; pos: Vec3; material?: "wood" }[] = [
          { shape: "box", size: [w, slTop - LEG, DB - 40], pos: [0, (LEG + slTop) / 2, Z0 + 40 + (DB - 40) / 2] },
        ];
        for (const x of [-w / 2 + 60, w / 2 - 60]) for (const z of [Z0 + 100, Z0 + DB - 60]) pieces.push({ shape: "cyl", size: [50, LEG, 50], pos: [x, LEG / 2, z], material: "wood" });
        return b.compound("Sofa-bed base", pieces, { material: "soft" });
      });
      m.k.base = put(m, base.type, base.mid);
      m.k.rail = put(m, typeOf("Back rail", [w, slTop - LEG, 40], "board"), [0, (LEG + slTop) / 2, Z0 + 20]);
      const bz = Z0 + BT + 10, bd = DB - BT - 20;
      m.k.bed = put(m, typeOf("Folded bed", [w - 80, 30, bd], "metal"), [0, slTop + 15, bz + bd / 2]);
      m.k.bar = put(m, typeOf("Mattress bar", [w - 160, 20, 20], "metal"), [0, slTop + 40, bz + 20]);
      m.k.mat = put(m, typeOf("Mattress", [w - 200, baseTop - slTop - 30, bd - 40], "soft"), [0, (slTop + 30 + baseTop) / 2, bz + 20 + (bd - 40) / 2]);
      m.k.back = put(m, typeOf("Backrest", [w, backH - slTop, BT]), [0, (slTop + backH) / 2, Z0 + BT / 2]);
      cushions(m, 0, w, 2, baseTop);
    } else if (kind === "arm") {
      m.k.body = put(m, typeOf("Armrest", [w, armH - LEG, D], fabric ? "board" : "soft"), [0, LEG + (armH - LEG) / 2, 0]);
      for (const z of [-400, 400]) leg(m, 0, z);
    } else if (kind === "chaise") {
      const be = BT + 120; // the back end: its backrest and a short piece of seat
      const block = comp("block", () => b.compound("Chaise back end", [
        { shape: "box", size: [CW, backH - LEG, BT], pos: [0, LEG + (backH - LEG) / 2, Z0 + BT / 2] },
        { shape: "box", size: [CW, seatTop - LEG, 120], pos: [0, LEG + (seatTop - LEG) / 2, Z0 + BT + 60] },
      ], { material: "soft" }));
      const z1 = Z0 + be, L = CL - be;
      const body = comp("body", () => b.compound("Chaise storage seat", [
        { shape: "box", size: [CW, 250, L], pos: [0, LEG + 125, z1 + L / 2] },
        { shape: "box", size: [CW, seatTop - LEG - 250, L], pos: [0, (LEG + 250 + seatTop) / 2, z1 + L / 2] },
      ], { material: "soft" }));
      m.k.body = put(m, body.type, body.mid);
      m.k.block = put(m, block.type, block.mid);
      for (const z of [Z0 + 80, z1 + L / 2 - 120, z1 + L - 80]) for (const x of [-CW / 2 + 80, CW / 2 - 80]) leg(m, x, z);
      m.backs.push(b.place(typeOf("Back cushion", [CW - 14, cushH, 200]), W(m, [0, seatTop + cushH / 2, Z0 + BT + 104]), [0, m.yaw ? Math.PI / 2 : 0, 0]));
    } else {
      // the corner: a square seat frame under an L of two backrest halves, its back along -z and its left side along -x
      const h = KW / 2, bw = KW - BT;
      if (fabric) {
        m.k.base = put(m, typeOf("Corner seat frame", [KW, baseTop - LEG, KW], "board"), [0, LEG + (baseTop - LEG) / 2, 0]);
        m.k.backB = put(m, typeOf("Backrest half", [BT, backH - baseTop, bw], "board"), [-h + BT / 2, baseTop + (backH - baseTop) / 2, -h + BT + bw / 2]);
        m.k.backA = put(m, typeOf("Backrest half", [KW, backH - baseTop, BT], "board"), [0, baseTop + (backH - baseTop) / 2, -h + BT / 2]);
      } else {
        const one = comp("corner", () => b.compound("Corner section", [
          { shape: "box", size: [KW, baseTop - LEG, KW], pos: [0, LEG + (baseTop - LEG) / 2, 0] },
          { shape: "box", size: [KW, backH - baseTop, BT], pos: [0, baseTop + (backH - baseTop) / 2, -h + BT / 2] },
          { shape: "box", size: [BT, backH - baseTop, bw], pos: [-h + BT / 2, baseTop + (backH - baseTop) / 2, -h + BT + bw / 2] },
        ], { material: "soft" }));
        m.k.base = put(m, one.type, one.mid);
        m.k.backA = m.k.backB = m.k.base;
      }
      for (const [x, z] of [[-h + 70, -h + 70], [h - 70, -h + 70], [h - 70, h - 70], [-h + 70, h - 70]]) leg(m, x, z);
      const cz = -h + BT + bw / 2;
      m.cush.push(b.place(typeOf("Corner seat cushion", [bw - 10, seatTop - baseTop, bw - 10]), W(m, [cz, (baseTop + seatTop) / 2, cz]), [0, 0, 0]));
      m.backs.push(b.place(typeOf("Corner back cushion", [bw - 204, cushH, 200]), W(m, [-h + BT + 200 + (bw - 200) / 2 + 2, seatTop + cushH / 2, -h + BT + 104]), [0, 0, 0]));
      m.backs.push(b.place(typeOf("Corner back cushion", [200, cushH, bw]), W(m, [-h + BT + 104, seatTop + cushH / 2, cz]), [0, 0, 0]));
    }
    return m;
  };

  /* ---------- the layout: a row from left to right, or a corner at the back left with a row to its right and a wing coming forward ---------- */
  const joints: J[] = [];
  const widthOf = (x: Cell) => (x === "arm" ? ARM : x === "chaise" ? CW : x === "sleeper" ? SW : x);
  const kindOf = (x: Cell): Kind => (x === "arm" ? "arm" : x === "chaise" ? "chaise" : x === "sleeper" ? "sleeper" : "seat");
  const link = (prev: Mod, m: Mod, out: 1 | -1) => {
    const back = (-out) as 1 | -1;
    const sec = (k: Kind) => k === "seat" || k === "sleeper";
    if (prev.kind === "corner") joints.push({ kind: m.kind === "sleeper" ? "slpCorner" : "hook", a: m, b: prev, s: back });
    else if (m.kind === "arm") joints.push({ kind: prev.kind === "chaise" ? "armc" : prev.kind === "sleeper" ? "armK" : "arm3", a: prev, b: m, s: out });
    else if (prev.kind === "arm") joints.push({ kind: m.kind === "chaise" ? "armc" : m.kind === "sleeper" ? "armK" : "arm3", a: m, b: prev, s: back });
    else if (m.kind === "chaise" && sec(prev.kind)) joints.push({ kind: prev.kind === "sleeper" ? "slpChaise" : "hook", a: prev, b: m, s: out });
    else if (prev.kind === "chaise" && sec(m.kind)) joints.push({ kind: m.kind === "sleeper" ? "slpChaise" : "hook", a: m, b: prev, s: back });
  };
  const chain = (list: Cell[], start: number, off: number, yaw: 0 | 1, first?: Mod) => {
    let c = start;
    let prev = first;
    for (const x of list) {
      const w = widthOf(x);
      const m = yaw ? mod(kindOf(x), w, off, c + w / 2, 1) : mod(kindOf(x), w, c + w / 2, off, 0);
      c += w;
      if (prev) link(prev, m, yaw ? -1 : 1);
      prev = m;
    }
  };
  let corner: Mod | undefined;
  if (lay.corner) {
    corner = mod("corner", KW, 0, 0, 0);
    const off = -KW / 2 - Z0; // the sections' backs in line with the corner's
    chain(lay.back ?? [], KW / 2, off, 0, corner);
    chain(lay.wing ?? [], KW / 2, off, 1, corner);
  } else {
    const row = lay.row ?? [];
    const total = row.reduce<number>((t, x) => t + widthOf(x), 0);
    chain(row, -total / 2, 0, 0);
  }
  // centre the whole sofa on the origin
  {
    const xs: number[] = [], zs: number[] = [];
    for (const m of mods) {
      const lo: Vec3 = m.kind === "corner" ? [-KW / 2, 0, -KW / 2] : [-m.w / 2, 0, Z0];
      const hi: Vec3 = m.kind === "corner" ? [KW / 2, 0, KW / 2] : [m.w / 2, 0, Z0 + (m.kind === "chaise" ? CL : D)];
      for (const v of [W(m, lo), W(m, hi)]) {
        xs.push(v[0]);
        zs.push(v[2]);
      }
    }
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const shift: Vec3 = [-cx, 0, -cz];
    for (const it of b.items) if (it.kind === "part") it.final = { pos: plus(it.final.pos, shift), rot: it.final.rot };
    for (const m of mods) {
      m.ox -= cx;
      m.oz -= cz;
    }
  }

  const seats = mods.filter((m) => m.kind === "seat");
  const sleepers = mods.filter((m) => m.kind === "sleeper");
  const arms = mods.filter((m) => m.kind === "arm");
  const chaise = mods.find((m) => m.kind === "chaise");
  const alone = mods.length === 1;
  const hooked = joints.some((j) => j.kind === "hook");
  // the module built where the sofa will stand: the others are built on their own and brought to it
  const anchor = corner ?? (hooked ? chaise! : sleepers[0] ?? seats[0] ?? chaise!);
  for (const m of mods) m.scene = alone || m === anchor ? "main" : m.kind === "arm" ? "arms" : m.kind === "seat" ? "sections" : m.kind;

  const step = (o: StepOpts, body: () => void = () => {}) =>
    b.step({ kind: "general", ...o, scene: o.scene ?? "main", warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
  const fit = (def: HwDef, list: FitOpts[], gap = 0.08) => b.fits(def, list, gap);
  const at = (m: Mod, lp: Vec3, d: Vec3, on: string, mate?: string, hole?: false): FitOpts => ({ on, at: W(m, lp), dir: Wd(m, d), mate, hole });
  const loose = (m: Mod, lp: Vec3, d: Vec3, on: string): FitOpts => ({ ...at(m, lp, d, on), hole: false });
  const pl = (n: number, one: string, many: string) => (n > 1 ? many : one);
  const word = (n: number) => ["no", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

  // where each module stands in its own scene while it's built: side by side
  const stageOff = new Map<Mod, Vec3>();
  const stageRef = new Map<Mod, Mod>();
  for (const sc of new Set(mods.map((m) => m.scene))) {
    if (sc === "main") continue;
    const list = mods.filter((m) => m.scene === sc);
    const widths = list.map((m) => (m.kind === "corner" ? KW : m.w) + 2 * ARM + 400);
    const total = widths.reduce((a, w) => a + w, 0);
    let x = 0;
    list.forEach((m, i) => {
      stageOff.set(m, [-total / 2 + x + widths[i] / 2, 0, 0]);
      x += widths[i];
    });
  }
  const sceneOf = (m: Mod) => (stageRef.get(m) ?? m).scene;
  const stage = (m: Mod, recs: Rec[], from?: Vec3, away: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0]) => {
    const ref = stageRef.get(m) ?? m;
    const off = plus(stageOff.get(ref) ?? [0, 0, 0], away);
    for (const r of recs) b.stage(r.key, plus(plus(rel(m, ref), r.lp), off), rot, from);
  };
  // in "main" a part goes straight to its place; in a scene it is staged where the module stands there
  const show = (m: Mod, recs: Rec[], from?: Vec3) => {
    if (sceneOf(m) === "main") for (const r of recs) b.add(r.key, from);
    else stage(m, recs, from);
  };
  // shown away from its place (on the floor beside it, or pulled out): in "main" offset in the module's own frame
  const aside = (m: Mod, recs: Rec[], away: Vec3, from?: Vec3, rot: Vec3 = [0, 0, 0]) => {
    if (sceneOf(m) === "main") for (const r of recs) b.stage(r.key, W(m, plus(r.lp, away)), [rot[0], rot[1] + (m.yaw ? Math.PI / 2 : 0), rot[2]], from);
    else stage(m, recs, from, away, rot);
  };
  const rec = (m: Mod, key: string) => m.recs.find((r) => r.key === key)!;
  const recs = (m: Mod, ...keys: string[]) => keys.map((k) => rec(m, k));
  const scenes = (list: Mod[]) => [...new Set(list.map((m) => m.scene))];
  const felt = (list: Mod[]) => {
    for (const m of list) fit(HW.glide, m.legs.map((l) => ({ on: l.key, at: W(m, [l.lp[0], 0, l.lp[2]]), dir: [0, 1, 0] as Vec3, hole: false as const })), 0.1);
  };

  /* ---------- the seat sections' frames ---------- */
  const studX = (m: Mod) => {
    const n = m.w < 1000 ? 2 : m.w < 1800 ? 4 : 5;
    return Array.from({ length: n }, (_, i) => -m.w / 2 + 110 + ((m.w - 220) * i) / (n - 1));
  };
  for (const sc of scenes(seats)) {
    const list = seats.filter((m) => m.scene === sc);
    const many = list.length > 1;
    const n = studX(list[0]).length;
    step({ title: many ? "Screw the rods into the seat frames" : "Screw the rods into the seat frame", detail: `${cap(word(n))} into the holes along the back of the frame's top, by hand until they stop.`, scene: sc, kind: "bolts", warnings: ["hand"] }, () => {
      b.stagger(0.2);
      for (const m of list) show(m, [rec(m, m.k.base)], [0, 200, 0]);
      b.then(0.15);
      for (const m of list) fit(ROD, studX(m).map((x) => ({ ...at(m, [x, baseTop + 40, Z0 + BT / 2], [0, -1, 0], m.k.base), travel: 120, spin: 3 })));
    });
    step({ title: many ? "Lower the backrest frames onto the rods" : "Lower the backrest frame onto the rods", detail: "Springs facing the front and the padded edge at the top. Guide every rod into its hole.", scene: sc, kind: "join" }, () => {
      b.stagger(0.3);
      for (const m of list) show(m, [rec(m, m.k.back)], [0, 380, 0]);
    });
    step({ title: "Tighten a washer and nut onto each rod", detail: "Inside the bottom of the backrest frame, with the box spanner.", scene: sc, kind: "bolts", tools: ["wrench"] }, () => {
      for (const m of list) fit(W16, studX(m).map((x) => loose(m, [x, baseTop + 30, Z0 + BT / 2], [0, -1, 0], m.k.back)), 0.05);
      b.then(0.05);
      for (const m of list) fit(NUT, studX(m).map((x) => loose(m, [x, baseTop + 34, Z0 + BT / 2], [0, -1, 0], m.k.back)), 0.06);
    });
    step({ title: many ? "Screw the rods into the top panels" : "Screw the rods into the top panel", detail: `Lay it upside down on the floor. ${cap(word(n))} into the holes along its middle, by hand.`, scene: sc, kind: "bolts", warnings: ["hand"] }, () => {
      for (const m of list) aside(m, [rec(m, m.k.top)], [0, CAP / 2 - (backH - CAP / 2), 900], [0, 200, 0], [Math.PI, 0, 0]);
      b.then(0.15);
      for (const m of list) fit(ROD, studX(m).map((x) => ({ ...at(m, [x, backH - CAP - 40, Z0 + BT / 2], [0, 1, 0], m.k.top), travel: 120, spin: 3 })));
    });
    step({ title: many ? "Lower the top panels onto the backrests" : "Lower the top panel onto the backrest", detail: "Rods down, through the holes in the top of the frame. It sticks out a little at the front.", scene: sc, kind: "join" }, () => {
      b.stagger(0.3);
      for (const m of list) show(m, [rec(m, m.k.top)], [0, 300, 0]);
    });
    step({ title: "Tighten a washer and nut onto each rod", detail: "From inside the top of the backrest frame, with the box spanner.", scene: sc, kind: "bolts", tools: ["wrench"] }, () => {
      for (const m of list) fit(W16, studX(m).map((x) => loose(m, [x, backH - CAP - 30, Z0 + BT / 2], [0, 1, 0], m.k.back)), 0.05);
      b.then(0.05);
      for (const m of list) fit(NUT, studX(m).map((x) => loose(m, [x, backH - CAP - 34, Z0 + BT / 2], [0, 1, 0], m.k.back)), 0.06);
    });
  }

  /* ---------- the sofa-bed section ---------- */
  const pull: Vec3 = [0, 0, 950]; // the bed pulled out
  for (const m of sleepers) {
    const sc = m.scene;
    step({ title: "Cut the two cable ties holding the bed", detail: "Lay the frame on its feet out of the box. Cut only the ties, not the fabric or the straps.", scene: sc, tools: ["knife"] }, () => {
      show(m, recs(m, m.k.base, m.k.bed), [0, 200, 0]);
    });
    step({ title: "Hang the back rail on its two hooks", detail: "One of you at each end. Lower it straight down until it sits on the hooks.", scene: sc, kind: "join", people: 2 }, () => show(m, [rec(m, m.k.rail)], [0, 260, 0]));
    step({ title: "Lift the bed and screw in the wing bolt", detail: "One of you lifts the folded bed a little, the other screws the bolt in by hand to lock the mechanism to the frame.", scene: sc, kind: "bolts", people: 2, warnings: ["two", "hand"] }, () => {
      fit(WINGB, [{ ...at(m, [0, LEG + 50, Z0 + DB], [0, 0, -1], m.k.base), spin: 3 }]);
    });
    step({ title: "Unfold the bed", detail: "Lift the front edge up, pull it towards you and fold the end section out onto its legs.", scene: sc, people: 2 }, () => aside(m, [rec(m, m.k.bed)], pull));
    step({ title: "Lower the backrest onto the side plates", detail: "One of you at each end. Its slots go down over the pins on the plates at both ends.", scene: sc, kind: "join", people: 2 }, () => show(m, [rec(m, m.k.back)], [0, 400, 0]));
    const bp = (sx: 1 | -1): Vec3[] => [slTop + 60, slTop + 140].map((y) => [sx * (m.w / 2 - 10), y, Z0 + BT / 2]);
    step({ title: "Bolt the backrest to the side plates", detail: "Two bolts at each end with the Allen key, a flange nut on each with the box spanner.", scene: sc, kind: "bolts", tools: ["allen", "wrench"], people: 2 }, () => {
      for (const sx of [-1, 1] as const) fit(ABOLT, bp(sx).map((q) => at(m, q, [-sx, 0, 0], m.k.back)), 0.12);
      b.then(0.08);
      for (const sx of [-1, 1] as const) fit(FNUT, bp(sx).map((q) => loose(m, [q[0] - sx * 40, q[1], q[2]], [sx, 0, 0], m.k.back)), 0.1);
    });
    step({ title: "Lift out the loose bar", detail: "It comes packed on the bed. Lay it to one side for now.", scene: sc }, () => aside(m, [rec(m, m.k.bar)], [0, -(slTop + 40) + 10, 1900], [0, 200, 0]));
    step({ title: "Hook the bed fabric over the back of the frame", detail: "Pull the fabric's edge over the rail at the head of the bed and clip it on, all along." , scene: sc });
    step({ title: "Push the bar into the fabric's pocket", detail: "At the head of the bed, so the fabric is held tight. Its ends sit in the brackets on the frame.", scene: sc }, () => aside(m, [rec(m, m.k.bar)], pull, [0, 150, 0]));
    step({ title: "Screw the bar's ends to the frame", detail: "One screw at each end with the Allen key.", scene: sc, kind: "screws", tools: ["allen"] }, () => {
      fit(BARSCREW, ([-1, 1] as const).map((sx) => ({ ...at(m, [sx * ((m.w - 160) / 2 - 20), slTop + 50, Z0 + BT + 30], [0, -1, 0], m.k.bar), hole: false as const })), 0.15);
    });
    step({ title: "Unroll the mattress and lay it on the bed", detail: "Cut the plastic away from the mattress, not into it. Tuck its end under the bar. It takes up to 72 hours to reach its full shape.", scene: sc, kind: "cushions" }, () => aside(m, [rec(m, m.k.mat)], pull, [0, 300, 0]));
    step({ title: "Fold the bed back in", detail: "Lift the end section, fold it over and push the whole bed back into the frame.", scene: sc, warnings: [] }, () => show(m, recs(m, m.k.bed, m.k.bar, m.k.mat)));
  }

  /* ---------- the chaise ---------- */
  if (chaise) {
    const c = chaise, sc = c.scene;
    const body = rec(c, c.k.body), block = rec(c, c.k.block);
    step({ title: "Open the lid and lift out what's inside", detail: "The lid rises on its struts and stays open. Inside are the back end of the chaise and its cushion.", scene: sc }, () => show(c, [body], [0, 160, 0]));
    const bz = Z0 + BT + 120;
    const bpts: Vec3[] = [[-260, 130], [260, 130], [-260, 280], [260, 280]].map(([x, y]) => [x, LEG + y, bz]);
    step({ title: "Tip the box onto its side and push the back end against it", detail: "Close the lid first. Line the holes in the back end up with the ones in the end of the box.", scene: sc, pose: "+x", kind: "join", warnings: ["floor"] }, () => {
      if (sc === "main") b.add(block.key, [0, 0, -500]);
      else stage(c, [block], [0, 0, -500]);
    });
    step({ title: "Bolt them together", detail: "Four carriage bolts through both, a washer and nut on each inside the box. Tighten with the box spanner.", scene: sc, pose: "+x", kind: "bolts", tools: ["wrench"] }, () => {
      fit(CBOLT, bpts.map((q) => at(c, [q[0], q[1], q[2] - 30], [0, 0, 1], c.k.block, c.k.body)), 0.12);
      b.then(0.08);
      fit(W16, bpts.map((q) => loose(c, [q[0], q[1], q[2] + 40], [0, 0, -1], c.k.body)), 0.06);
      b.then(0.04);
      fit(NUT, bpts.map((q) => loose(c, [q[0], q[1], q[2] + 44], [0, 0, -1], c.k.body)), 0.08);
    });
    step({ title: "Screw in the six legs", detail: "Clockwise by hand until each one is snug.", scene: sc, pose: "+x", kind: "legs", warnings: ["hand"] }, () => {
      b.stagger(0.2);
      show(c, c.legs, [0, -240, 0]);
    });
    step({ title: "Stick a felt pad under each leg", scene: sc, pose: "+x" }, () => felt([c]));
    step({ title: "Stand the chaise up", detail: "Tip it back onto its legs. Lift the lid to check it opens freely.", scene: sc, kind: "standup" });
  }

  /* ---------- the corner section ---------- */
  if (corner) {
    const c = corner, sc = c.scene, h = KW / 2;
    // the hooks the sections hang on: two on each open side (the sofa-bed bolts on instead, so its side gets none)
    const sides = joints.filter((j) => j.b === c).map((j) => ({ j, right: !j.a.yaw }));
    const hookSides = sides.length ? sides.filter((x) => x.j.kind === "hook").map((x) => x.right) : [true, false];
    const hk: [Vec3, Vec3][] = [];
    for (const right of hookSides) {
      if (right) hk.push([[h, LEG + 90, 355], [-1, 0, 0]], [[h, LEG + 90, -200], [-1, 0, 0]]);
      else hk.push([[355, LEG + 90, h], [0, 0, -1]], [[-200, LEG + 90, h], [0, 0, -1]]);
    }
    if (fabric) {
      step({ title: "Screw the joining bolt into one backrest half", detail: "Screw the stud into the round head first. Then a washer on, and into the hole in the end of the half with the Allen key.", scene: sc, kind: "bolts", tools: ["allen"] }, () => {
        show(c, [rec(c, c.k.backB)], [0, 200, 0]);
        b.then(0.15);
        fit(W24, [loose(c, [-h + BT / 2, baseTop + 250, -h + BT + 4], [0, 0, 1], c.k.backB)]);
        fit(JBOLT, [at(c, [-h + BT / 2, baseTop + 250, -h + BT - 20], [0, 0, 1], c.k.backB)]);
      });
      step({ title: "Hook the other half onto the bolt head", detail: "Push its keyhole slot over the head, then let it drop so the two halves lock together.", scene: sc, kind: "join" }, () => show(c, [rec(c, c.k.backA)], [300, 120, 0]));
      step({ title: "Turn the backrest upside down and lay the seat frame on it", detail: "On something soft. The seat frame goes on upside down too, its holes over the holes in the backrest.", scene: sc, pose: "-y", kind: "join", warnings: ["floor"] }, () => show(c, [rec(c, c.k.base)], [0, -300, 0]));
      const cb: [Vec3, string][] = [
        [[-100, baseTop + 10, -h + BT / 2], c.k.backA],
        [[h - 90, baseTop + 10, -h + BT / 2], c.k.backA],
        [[-h + BT / 2, baseTop + 10, 60], c.k.backB],
        [[-h + BT / 2, baseTop + 10, h - 90], c.k.backB],
      ];
      step({ title: "Bolt the seat frame to the backrest", detail: "Four bolts with a washer each, through the frame into the backrest. Tighten with the box spanner.", scene: sc, pose: "-y", kind: "bolts", tools: ["wrench"] }, () => {
        fit(W24, cb.map(([q]) => loose(c, [q[0], q[1] - 60, q[2]], [0, 1, 0], c.k.base)), 0.06);
        b.then(0.05);
        fit(HEX, cb.map(([q, on]) => at(c, q, [0, 1, 0], c.k.base, on)), 0.12);
      });
      step({ title: "Screw in the four legs", detail: "Clockwise by hand until each one is snug.", scene: sc, pose: "-y", kind: "legs", warnings: ["hand"] }, () => {
        b.stagger(0.2);
        show(c, c.legs, [0, -240, 0]);
      });
    } else {
      step({ title: "Turn the corner section upside down and screw in the legs", detail: "On something soft. Clockwise by hand until each one is snug.", scene: sc, pose: "-y", kind: "legs", warnings: ["hand", "floor"] }, () => {
        show(c, [rec(c, c.k.base)], [0, -300, 0]);
        b.then(0.1);
        b.stagger(0.2);
        show(c, c.legs, [0, -240, 0]);
      });
    }
    step({ title: "Stick a felt pad under each leg", scene: sc, pose: "-y" }, () => felt([c]));
    step({ title: `Turn it over and screw on the ${hk.length === 4 ? "four" : "two"} U brackets`, detail: hk.length === 4 ? "Two on each open side, low down, with the Allen key. The sections hang on these." : "On the side the section hangs on, with the Allen key. The sofa-bed's side gets none: it bolts on instead.", scene: sc, kind: "screws", tools: ["allen"] }, () => {
      fit(BRK, hk.map(([q, d]) => ({ ...loose(c, q, d, c.k.base), twist: Math.PI / 2 })), 0.12);
      b.then(0.1);
      fit(BSCREW, hk.map(([q, d]) => at(c, [q[0] - d[0] * 4, q[1] + 10, q[2] - d[2] * 4], d, c.k.base)), 0.12);
    });
  }

  /* ---------- the armrests ---------- */
  if (arms.length) {
    const sc = arms[0].scene;
    step({ title: pl(arms.length, "Turn the armrest over and screw in the legs", "Turn the armrests over and screw in the legs"), detail: "Two legs in each, clockwise by hand until snug.", scene: sc, pose: "-y", kind: "legs", warnings: ["hand", "floor"] }, () => {
      b.stagger(0.25);
      for (const m of arms) show(m, [rec(m, m.k.body)], [0, 200, 0]);
      b.then(0.1);
      for (const m of arms) show(m, m.legs, [0, -220, 0]);
    });
    step({ title: "Stick a felt pad under each leg", scene: sc, pose: "-y" }, () => felt(arms));
  }

  /* ---------- the covers (fabric only) ---------- */
  if (fabric) {
    for (const sc of scenes(seats)) {
      const many = seats.filter((m) => m.scene === sc).length > 1;
      step({ title: many ? "Fit the covers over the top panels" : "Fit the cover over the top panel", detail: "One of you at each end. Pull the padded top of the cover over the panel so its seams sit on the edges, and fasten the strip at the back.", scene: sc, people: 2 });
      step({ title: many ? "Pull the covers down over the backrests" : "Pull the cover down over the backrest", detail: "Work it down evenly over the frame and the ends, then press the strips along the bottom of the backrest.", scene: sc, people: 2 });
      step({ title: "Pull the cover over the seat frame and fasten it", detail: "Over the front edge and round the ends, then fasten it under the frame all along.", scene: sc });
    }
    for (const m of sleepers) {
      step({ title: "Pull the cover down over the backrest", detail: "Fold the bed in first. One of you at each end: work the cover down over the backrest and its ends.", scene: m.scene, people: 2 });
      step({ title: "Fasten the cover along the back and the ends", detail: "Press the strips along the bottom edge of the backrest, then down each end of the frame.", scene: m.scene });
      step({ title: "Fit the cover's front panel and fasten it underneath", detail: "Pull it over the front of the frame and fasten it under the edge, all along and round the corners.", scene: m.scene });
    }
    if (chaise) {
      const sc = chaise.scene;
      step({ title: "Fit the cover around the storage box", detail: "With the lid open, fasten the cover along the inside of the box's top edge, then pull it down the sides and fasten it underneath.", scene: sc });
      step({ title: "Pull the cover over the lid and zip it closed", detail: "One of you holds the lid up. Work the cover over the corners, then close the zips under the lid.", scene: sc, people: 2 });
      step({ title: "Pull the cover down over the back end", detail: "One of you on each side. Work it down evenly and fasten it along the bottom and up the edges.", scene: sc, people: 2 });
    }
    if (corner) {
      const sc = corner.scene;
      step({ title: "Fit the cover on the corner post", detail: "The small cover goes on the front corner of the seat frame first. Fasten its edge underneath.", scene: sc });
      step({ title: "Pull the cover down over the corner backrest", detail: "Work it over both ends so the seams sit on the edges, then fasten it along the inside and down the ends.", scene: sc, people: 2 });
    }
    if (arms.length) {
      step({ title: pl(arms.length, "Pull the cover over the armrest", "Pull the covers over the armrests"), detail: "One of you on each side. Work it down evenly so the seams sit on the edges.", scene: arms[0].scene, people: 2 });
      step({ title: "Turn it over and fasten the cover underneath", detail: "Pull it tight under the bottom edge and fasten it round the legs.", scene: arms[0].scene, pose: "-y", warnings: ["floor"] });
    }
  }

  /* ---------- joining the modules ---------- */
  const armSide = (j: J) => j.s * (j.a.w / 2);
  const pushFrom = (j: J): Vec3 => Wd(j.a, [j.s * 360, 0, 0]);
  // the armrest goes into its host's scene, or straight to its place in "main"
  const pushArm = (j: J) => {
    stageRef.set(j.b, stageRef.get(j.a) ?? j.a);
    if (sceneOf(j.a) === "main") for (const r of j.b.recs) b.add(r.key, pushFrom(j));
    else stage(j.b, j.b.recs, pushFrom(j));
  };
  const a3 = joints.filter((j) => j.kind === "arm3");
  if (a3.length) {
    const rodPts = (j: J) => {
      const x = armSide(j);
      return [
        { lp: [x, LEG + 120, 330] as Vec3, on: j.a.k.base },
        { lp: [x, LEG + 120, -360] as Vec3, on: j.a.k.base },
        { lp: [x, baseTop + 120, Z0 + BT / 2] as Vec3, on: j.a.k.back },
      ];
    };
    for (const sc of [...new Set(a3.map((j) => sceneOf(j.a)))]) {
      const list = a3.filter((j) => sceneOf(j.a) === sc);
      const many = list.length > 1;
      step({ title: many ? "Screw the rods into the armrests" : "Screw the rods into the armrest", detail: "Three into the holes on the inner side, by hand until they stop.", scene: "arms", kind: "bolts", warnings: ["hand"] }, () => {
        for (const j of list) fit(ROD, rodPts(j).map((r) => ({ ...at(j.a, r.lp, [-j.s, 0, 0] as Vec3, j.b.k.body, r.on), travel: 140, spin: 3 })), 0.1);
      });
      step({ title: many ? "Push the armrests onto the ends of the sections" : "Push the armrest onto the end of the section", detail: fabric ? "Slide the big washer onto the front rod first, then guide the rods through the holes in the frame." : "Guide the rods through the holes in the end of the frame and push it tight.", scene: sc, kind: "join" }, () => {
        b.stagger(0.3);
        for (const j of list) pushArm(j);
        if (fabric) {
          b.then(0.15);
          for (const j of list) fit(BIGW, [loose(j.a, rodPts(j)[0].lp, [-j.s, 0, 0], j.b.k.body)]);
        }
      });
      step({ title: "Tighten a washer and nut onto each rod", detail: "From inside the section, with the box spanner. Tighten them all firmly.", scene: sc, kind: "bolts", tools: ["wrench"] }, () => {
        for (const j of list) fit(W16, rodPts(j).map((r) => loose(j.a, [r.lp[0] - j.s * 40, r.lp[1], r.lp[2]], [j.s, 0, 0], r.on)), 0.06);
        b.then(0.05);
        for (const j of list) fit(NUT, rodPts(j).map((r) => loose(j.a, [r.lp[0] - j.s * 44, r.lp[1], r.lp[2]], [j.s, 0, 0], r.on)), 0.08);
      });
    }
  }
  // armrest to the chaise: the chaise stood on its back end, one rod with a nut and two bolts from inside
  for (const j of joints.filter((x) => x.kind === "armc")) {
    const c = j.a, sc = sceneOf(c), x = armSide(j);
    const rod: Vec3 = [x, LEG + 120, 300];
    const bolts: [Vec3, string][] = [[[x, LEG + 120, -300], c.k.block], [[x, seatTop - 90, 150], c.k.body]];
    step({ title: "Screw a rod into the armrest", detail: "Into the hole low down at the front of its inner side, by hand.", scene: "arms", kind: "bolts", warnings: ["hand"] }, () => {
      fit(ROD, [{ ...at(c, rod, [-j.s, 0, 0], j.b.k.body, c.k.body), travel: 140, spin: 3 }]);
    });
    step({ title: "Stand the chaise on its back end and push the armrest on", detail: fabric ? "Slide the big washer onto the rod, then guide it through the hole in the side of the chaise." : "Guide the rod through the hole in the side of the chaise and push the armrest tight.", scene: sc, pose: "+z", kind: "join" }, () => {
      pushArm(j);
      if (fabric) {
        b.then(0.15);
        fit(BIGW, [loose(c, rod, [-j.s, 0, 0], j.b.k.body)]);
      }
    });
    step({ title: "Bolt the armrest on from inside the chaise", detail: "Screw a bolt head onto each of two rods first. Then push them through the frame into the armrest and tighten with the Allen key.", scene: sc, pose: "+z", kind: "bolts", tools: ["allen"] }, () => {
      fit(HROD, bolts.map(([q, on]) => at(c, [q[0] - j.s * 30, q[1], q[2]], [j.s, 0, 0], on, j.b.k.body)), 0.15);
    });
    step({ title: "Tighten a washer and nut onto the rod", detail: "From inside the storage box, with the box spanner. Then stand the chaise back on its legs.", scene: sc, pose: "+z", kind: "bolts", tools: ["wrench"] }, () => {
      fit(W16, [loose(c, [rod[0] - j.s * 40, rod[1], rod[2]], [j.s, 0, 0], c.k.body)]);
      b.then(0.05);
      fit(NUT, [loose(c, [rod[0] - j.s * 44, rod[1], rod[2]], [j.s, 0, 0], c.k.body)]);
    });
  }
  // armrest to the sofa-bed: three knob bolts from inside the frame
  const ak = joints.filter((j) => j.kind === "armK");
  if (ak.length) {
    const kp = (j: J) => {
      const x = armSide(j);
      return [
        { lp: [x - j.s * 30, LEG + 50, 300] as Vec3, on: j.a.k.base },
        { lp: [x - j.s * 30, LEG + 50, -300] as Vec3, on: j.a.k.base },
        { lp: [x - j.s * 30, slTop + 200, Z0 + BT / 2] as Vec3, on: j.a.k.back },
      ];
    };
    const sc = sceneOf(ak[0].a);
    step({ title: "Screw a knob onto each of the rods", detail: `${cap(word(ak.length * 3))} rods, a knob screwed onto one end of each by hand. These are the bolts that hold the armrests on.`, scene: "arms", warnings: ["hand"] });
    step({ title: pl(ak.length, "Pull out the bed and hold the armrest against the end", "Pull out the bed and hold an armrest against each end"), detail: "Line the holes up. Screw one knob bolt through the frame at the front into the armrest, by hand.", scene: sc, kind: "join" }, () => {
      for (const j of ak) aside(j.a, [rec(j.a, j.a.k.bed), rec(j.a, j.a.k.bar), rec(j.a, j.a.k.mat)], pull);
      b.then(0.1);
      b.stagger(0.3);
      for (const j of ak) pushArm(j);
      b.then(0.15);
      for (const j of ak) fit(KBOLT, [{ ...at(j.a, kp(j)[0].lp, [j.s, 0, 0], kp(j)[0].on, j.b.k.body), spin: 3 }]);
    });
    step({ title: "Screw in the other two knob bolts", detail: "At the back and higher up in the backrest, by hand until tight. Then fold the bed back in.", scene: sc, kind: "bolts", warnings: ["hand"] }, () => {
      for (const j of ak) fit(KBOLT, kp(j).slice(1).map((r) => ({ ...at(j.a, r.lp, [j.s, 0, 0], r.on, j.b.k.body), spin: 3 })), 0.15);
      b.then(0.1);
      for (const j of ak) show(j.a, [rec(j.a, j.a.k.bed), rec(j.a, j.a.k.bar), rec(j.a, j.a.k.mat)]);
    });
  }

  /* ---------- into place ---------- */
  // a module and the armrest already on it go together
  const groupOf = (m: Mod) => [m, ...joints.filter((j) => (j.kind === "arm3" || j.kind === "armc" || j.kind === "armK") && j.a === m).map((j) => j.b)];
  const addGroup = (m: Mod, from: Vec3) => {
    for (const g of groupOf(m)) for (const r of g.recs) b.add(r.key, from);
  };
  const placed = new Set<Mod>([anchor]);
  const linking = joints.filter((j) => j.kind === "hook" || j.kind === "slpCorner" || j.kind === "slpChaise");
  if (linking.length && anchor.kind !== "corner" && anchor.kind !== "sleeper") {
    step({ title: "Stand the chaise where the sofa will go", detail: "Leave room behind it to walk round while you hang the section on.", kind: "join" }, () => {
      if (sceneOf(anchor) !== "main") addGroup(anchor, [0, 200, 0]);
    });
  }
  if (corner && linking.length) step({ title: "Stand the corner section where the sofa will go", detail: "Leave room behind it to walk round while you bring the other sections to it.", kind: "join" });
  // hanging sections first, as the manual does, then whatever bolts on
  const order = [...linking].sort((x, y) => Number(x.kind !== "hook") - Number(y.kind !== "hook"));
  const pins = order.filter((j) => j.kind === "hook");
  for (const j of pins) {
    const m = j.a, anc = j.b, x = j.s * (m.w / 2);
    if (anc.kind === "chaise") {
      const hx = -j.s * (CW / 2);
      const hk: [Vec3, string][] = [[[hx, LEG + 90, 330], anc.k.body], [[hx, LEG + 90, Z0 + 140], anc.k.block]];
      step({ title: "Screw the U brackets onto the side of the chaise", detail: "Open the lid. Two brackets low down on the side the section hangs on: a screw through each into a bolt head inside, with the two Allen keys.", kind: "screws", tools: ["allen"] }, () => {
        fit(BRK, hk.map(([q, on]) => ({ ...loose(anc, q, [j.s, 0, 0], on), twist: Math.PI / 2 })), 0.15);
        b.then(0.05);
        fit(BSCREW, hk.map(([q, on]) => at(anc, [q[0], q[1] + 10, q[2]], [j.s, 0, 0], on)), 0.12);
        b.then(0.05);
        fit(HEAD, hk.map(([q, on]) => loose(anc, [q[0] + j.s * 30, q[1] + 10, q[2]], [-j.s, 0, 0], on)), 0.12);
      });
    }
    const pinAt = (dx: number): Vec3 => [x + dx, LEG + 90, 330];
    step({ title: "Screw a hanging pin into the end of the section", detail: "Low down at the front of the end that meets the brackets. A washer each side of the frame and the nut inside, with the box spanner.", scene: sceneOf(m), kind: "bolts", tools: ["wrench"] }, () => {
      fit(PIN, [{ ...at(m, pinAt(j.s * 50), [-j.s, 0, 0], m.k.base), travel: 150, spin: 3 }]);
      fit(W24, [loose(m, pinAt(j.s * 2), [-j.s, 0, 0], m.k.base), loose(m, pinAt(-j.s * 30), [j.s, 0, 0], m.k.base)], 0.06);
      fit(NUT, [loose(m, pinAt(-j.s * 34), [j.s, 0, 0], m.k.base)]);
    });
    step({ title: anc.kind === "corner" ? "Lift the section onto the corner's brackets" : "Lift the section onto the chaise's brackets", detail: "One of you at each end. Lower the pin straight down into the bracket until the section hangs level.", kind: "join", people: 2, warnings: ["two"] }, () => addGroup(m, [0, 280, 0]));
    placed.add(m);
  }
  for (const j of order.filter((x) => x.kind === "slpCorner")) {
    const m = j.a, c = j.b, x = j.s * (m.w / 2);
    const sp: Vec3[] = [-150, 250].map((z) => [x + j.s * 15, LEG + 50, z]);
    step({ title: "Screw two short studs into the side of the corner", detail: "Into the holes low down on the side the sofa-bed goes, by hand. Leave half of each stud sticking out.", kind: "bolts", warnings: ["hand"] }, () => {
      fit(SSTUD, sp.map((q) => ({ ...at(m, q, [j.s, 0, 0], c.k.base), spin: 3 })), 0.15);
    });
    step({ title: "Pull out the bed and push the sofa-bed onto the studs", detail: "One of you at each end. Guide the studs through the holes in the end of the frame, then screw a knob onto each from inside.", kind: "join", people: 2, warnings: ["two", "hand"] }, () => {
      addGroup(m, Wd(m, [-j.s * 450, 0, 0]));
      b.then(0.15);
      fit(KNOB, sp.map((q) => loose(m, [q[0] - j.s * 40, q[1], q[2]], [j.s, 0, 0], m.k.base)), 0.15);
    });
    placed.add(m);
  }
  for (const j of order.filter((x) => x.kind === "slpChaise")) {
    const sl = j.a, c = j.b, x = j.s * (sl.w / 2);
    const moving = placed.has(sl) ? c : sl;
    const sp: [Vec3, string][] = [[[x + j.s * 20, LEG + 50, -150], c.k.block], [[x + j.s * 20, LEG + 50, 300], c.k.body]];
    step({ title: "Screw a bolt head onto each short stud", detail: "Two of them, by hand. They bolt the chaise to the sofa-bed from inside the storage box.", scene: sceneOf(c), warnings: ["hand"] });
    step({ title: moving === c ? "Push the chaise against the end of the sofa-bed" : "Push the sofa-bed against the side of the chaise", detail: "Open the lid and pull out the bed. Push the studs through the chaise's side into the sofa-bed's frame and tighten them with the Allen key.", kind: "join", tools: ["allen"], people: 2 }, () => {
      addGroup(moving, Wd(moving, [(moving === c ? j.s : -j.s) * 500, 0, 0]));
      b.then(0.15);
      fit(HEAD, sp.map(([q, on]) => loose(sl, [q[0] + j.s * 40, q[1], q[2]], [-j.s, 0, 0], on)), 0.12);
      fit(SSTUD, sp.map(([q, on]) => at(sl, [q[0] + j.s * 20, q[1], q[2]], [-j.s, 0, 0], on, sl.k.base)), 0.15);
    });
    step({ title: "Screw a knob onto each stud", detail: "From inside the sofa-bed's frame, by hand until tight. Then fold the bed back in and close the lid.", kind: "bolts", warnings: ["hand"] }, () => {
      fit(KNOB, sp.map(([q]) => loose(sl, [q[0] - j.s * 50, q[1], q[2]], [j.s, 0, 0], sl.k.base)), 0.15);
    });
    placed.add(moving);
  }

  /* ---------- cushions ---------- */
  const cush = mods.flatMap((m) => m.cush);
  const backs = mods.flatMap((m) => m.backs);
  if (cush.length) {
    step({ title: fabric ? pl(cush.length, "Zip the cover onto the seat cushion and lay it in", "Zip the covers onto the seat cushions and lay them in") : pl(cush.length, "Lay the seat cushion in", "Lay the seat cushions in"), detail: fabric ? "Fold the cushion to get it in, then smooth the cover over it. Zips face the back." : "Zips face the back.", kind: "cushions" }, () => {
      b.stagger(0.18);
      for (const k of cush) b.add(k, [0, 320, 0]);
    });
  }
  step({ title: pl(backs.length, "Fill the back cushion and stand it in place", "Fill the back cushions and stand them in place"), detail: "Push the filling into the corners of each cover, zip it closed, then lean it on the backrest.", kind: "cushions" }, () => {
    b.stagger(0.18);
    for (const k of backs) b.add(k, [0, 160, 360]);
  });
  return true;
}

const family: Family = { names: ["FINNALA"], build };
export default family;
