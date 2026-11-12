import type { Family } from "./family";
import type { PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/**
 * EKTORP, from IKEA's manuals (UPPLAND's manuals are the same drawings, so uppland.ts uses this with its own sizes).
 * A seat section is a padded base that runs the full width, with the backrest hinged along its back: it comes folded
 * down and is lifted up. Each armrest gets two threaded rods in its underside and one, with a large washer, in its
 * inner side; it is lowered onto the end of the base so the side rod drops into a slot in the backrest's end. With
 * the frame on its back a washer and a nut go on every rod, then the four legs. A sofa with chaise longue is a
 * 2-seat section and a chaise section, each with one armrest, joined end to end by a wing bolt and a rod; a steel
 * support goes under the chaise section and the chaise part (a box on two legs with two brackets) hooks onto it once
 * the covers are on. A corner sofa is two sections with legs at their armrest ends only, hung on a corner section on
 * four legs: a pin in the top of each section's open end drops into a slot in the corner. The loose cover goes on
 * last, its skirt hiding the legs, then the cushions. The footstool is a box bolted together upside down.
 */

export interface Dims {
  D: number; // depth
  H: number; // to the top of the back cushions
  A: number; // armrest width
  OV: number; // how far an armrest's rolled top hangs out past the frame
  ARMH: number; // armrest height
  SEAT: number; // top of the seat cushions
  CUSH: number; // seat cushion thickness
  BACK: number; // top of the backrest frame
  LEG: number;
  BTH: number; // backrest frame depth
  BC: number; // back cushion depth
  W2: number; // seat width of the 2-seat section in the sofa with chaise longue
  CD: number; // how far the chaise part reaches out in front of the sofa
  chair: number; // armchair width
  stool: { w: number; h: number; d: number; leg: number; padded: boolean; name: string };
}

type Kind = "sec" | "corner";
interface Rec {
  key: string;
  lp: Vec3; // centre in the module's own frame
  ry: number; // turn about y in the module's own frame
}
interface Arm {
  e: -1 | 1;
  rec: Rec;
}
interface Mod {
  kind: Kind;
  w: number;
  ox: number;
  oz: number;
  yaw: 0 | 1; // 1: turned a quarter, its front facing +x (the wing coming forward from the corner)
  armL: boolean;
  armR: boolean;
  n: number; // seat cushions
  off: Vec3; // where it waits in "main" before it's joined on
  recs: Record<string, Rec>;
  arms: Arm[];
  legs: Rec[];
  extra: Rec[]; // the chaise part, its legs, brackets and support
  cush: string[];
  backs: string[];
}
type Lay = { kind: "sofa"; n: number; stool: boolean } | { kind: "chaise" } | { kind: "corner" };

const ROD: HwDef = { kind: "stud", len: 110, dia: 8, name: "Threaded rod" };
const BIGW: HwDef = { kind: "washer", len: 6, dia: 40, name: "Large washer" };
const WASH: HwDef = { kind: "washer", len: 1.6, dia: 20 };
const NUT: HwDef = { kind: "nut", len: 7, dia: 8 };
const WBOLT: HwDef = { kind: "bolt", len: 70, dia: 8, name: "Wing bolt" };
const WNUT: HwDef = { kind: "nut", len: 14, dia: 30, name: "Wing nut" };
const PIN: HwDef = { kind: "stud", len: 100, dia: 12, name: "Connecting pin" };
const SBOLT: HwDef = { kind: "bolt", len: 40, dia: 6 };
const BUF: HwDef = { kind: "foot", len: 12, dia: 30, name: "Buffer" };

const PI = Math.PI;
const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (m: Mod, v: Vec3): Vec3 => (m.yaw ? [m.ox + v[2], v[1], m.oz - v[0]] : [m.ox + v[0], v[1], m.oz + v[2]]);
const Wd = (m: Mod, d: Vec3): Vec3 => (m.yaw ? [d[2], d[1], -d[0]] : d);

function layout(s: ProductSpec): Lay | null {
  const v = `${s.variant} ${s.slug}`.toLowerCase();
  if (/bed|sleeper/.test(v)) return null;
  if (/chaise/.test(v)) return { kind: "chaise" };
  if (/corner/.test(v)) return { kind: "corner" };
  if (/armchair/.test(v)) return { kind: "sofa", n: 1, stool: /footstool|ottoman/.test(v) };
  if (/3-seat/.test(v)) return { kind: "sofa", n: 3, stool: false };
  if (/2-seat|loveseat/.test(v)) return { kind: "sofa", n: 2, stool: false };
  return null;
}

export function sofaBuilder(d: Dims) {
  return (b: PlanBuilder, s: ProductSpec): boolean => {
    const lay = layout(s);
    if (!lay) return false;
    const { D, A, OV, LEG, BTH, BC, H, ARMH, SEAT, BACK, CD } = d;
    const BT = SEAT - d.CUSH, BH = BACK - BT, Z0 = -D / 2, K = D, END = OV + A, R = (A + OV) / 2;
    const T = 10, SK = 25; // the cover's skirt: its thickness and how far it stops above the floor

    /* ---------- where the modules go ---------- */
    const mods: Mod[] = [];
    const mk = (kind: Kind, w: number, ox: number, oz: number, yaw: 0 | 1, armL: boolean, armR: boolean, n: number): Mod => {
      const m: Mod = { kind, w, ox, oz, yaw, armL, armR, n, off: [0, 0, 0], recs: {}, arms: [], legs: [], extra: [], cush: [], backs: [] };
      mods.push(m);
      return m;
    };
    let corner: Mod | undefined, chaise: Mod | undefined;
    const SW = s.size.w * 10;
    if (lay.kind === "sofa") mk("sec", lay.n === 1 ? d.chair : SW, 0, 0, 0, true, true, lay.n);
    else if (lay.kind === "chaise") {
      const wa = END + d.W2, wb = SW - wa;
      mk("sec", wa, -SW / 2 + wa / 2, 0, 0, true, false, 2);
      chaise = mk("sec", wb, SW / 2 - wb / 2, 0, 0, false, true, 1);
      chaise.off = [380, 0, 0];
    } else {
      const wr = SW - K, wl = s.size.d * 10 - K;
      corner = mk("corner", K, 0, 0, 0, false, false, 1);
      mk("sec", wr, K / 2 + wr / 2, 0, 0, false, true, 2);
      mk("sec", wl, 0, K / 2 + wl / 2, 1, true, false, 2);
    }
    {
      const xs: number[] = [], zs: number[] = [];
      for (const m of mods) {
        const h = m.kind === "corner" ? K / 2 : m.w / 2;
        for (const v of [W(m, [-h, 0, Z0]), W(m, [h, 0, m === chaise ? D / 2 + CD : -Z0])]) {
          xs.push(v[0]);
          zs.push(v[2]);
        }
      }
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      for (const m of mods) {
        m.ox -= cx;
        m.oz -= cz;
      }
    }
    const secs = mods.filter((m) => m.kind === "sec");
    const xb0 = (m: Mod) => -m.w / 2 + (m.armL ? OV : 0);
    const xb1 = (m: Mod) => m.w / 2 - (m.armR ? OV : 0);
    const xi0 = (m: Mod) => xb0(m) + (m.armL ? A : 0);
    const xi1 = (m: Mod) => xb1(m) - (m.armR ? A : 0);

    /* ---------- the parts ---------- */
    const types = new Map<string, { type: string; mid: Vec3 }>();
    const shape = (name: string, key: string, pieces: () => PartPiece[], material: "soft" | "metal" | "board" = "soft") => {
      const id = `${name}|${key}`;
      if (!types.has(id)) types.set(id, b.compound(name, pieces(), { material }));
      return types.get(id)!;
    };
    const simple = (name: string, size: Vec3, o: { shape?: "cyl"; material?: "soft" | "wood" | "metal" | "fiber" | "board" } = {}) => {
      const id = `${name}|${size.map(Math.round).join("x")}|${o.shape ?? ""}`;
      if (!types.has(id)) types.set(id, { type: b.part(name, size, { material: o.material ?? "soft", shape: o.shape }), mid: [0, 0, 0] });
      return types.get(id)!.type;
    };
    const put = (m: Mod, t: { type: string; mid: Vec3 }, at: Vec3, ry = 0): Rec => {
      // `at` is where the piece frame's origin goes; a compound is placed by the centre of its pieces
      const c = ry ? [-t.mid[0], t.mid[1], -t.mid[2]] : t.mid;
      const lp: Vec3 = [at[0] + c[0], at[1] + c[1], at[2] + c[2]];
      const key = b.place(t.type, W(m, lp), [0, ry + (m.yaw ? PI / 2 : 0), 0]);
      return { key, lp, ry };
    };
    const box = (size: Vec3, pos: Vec3, material?: "fiber" | "metal"): PartPiece => ({ shape: "box", size, pos, material });

    // a padded base: rails all round, a strip across each end for the armrest's rods, a sprung deck on top
    const basePieces = (wb: number, dep: number): PartPiece[] => {
      const bh = BT - LEG, y = LEG + bh / 2;
      return [
        box([wb, bh, 60], [0, y, dep / 2 - 30]),
        box([wb, bh, 60], [0, y, -dep / 2 + 30]),
        box([100, 90, dep - 120], [-(wb / 2 - 50), BT - 45, 0]),
        box([100, 90, dep - 120], [wb / 2 - 50, BT - 45, 0]),
        box([wb - 200, 25, dep - 120], [0, BT - 12.5, 0], "fiber"),
      ];
    };
    // a backrest frame: posts at the ends, a top rail, the padded front and a hardboard back, open underneath
    const backPieces = (bw: number): PartPiece[] => [
      box([60, BH, BTH], [-(bw / 2 - 30), BT + BH / 2, Z0 + BTH / 2]),
      box([60, BH, BTH], [bw / 2 - 30, BT + BH / 2, Z0 + BTH / 2]),
      box([bw - 120, 80, BTH], [0, BACK - 40, Z0 + BTH / 2]),
      box([bw - 120, BH - 80, 50], [0, BT + (BH - 80) / 2, Z0 + BTH - 25]),
      box([bw - 120, BH - 80, 20], [0, BT + (BH - 80) / 2, Z0 + 10], "fiber"),
    ];
    // an armrest with its rolled top, drawn as the right one (the roll hangs out to +x); the left one is turned round
    const bodyH = ARMH - R - BT;
    const armT = shape("Armrest", "", () => [
      box([A, bodyH, D], [0, BT + bodyH / 2, 0]),
      { shape: "cyl", size: [2 * R, D - 10, 2 * R], pos: [OV / 2, ARMH - R, 0], rot: [PI / 2, 0, 0] },
    ]);
    const legT = simple("Leg", [50, LEG, 50], { shape: "cyl", material: "wood" });
    const skirtH = BT - SK, skirtY = SK + skirtH / 2;

    for (const m of mods) {
      if (m.kind === "corner") {
        const bw = K - BTH;
        m.recs.frame = put(m, shape("Corner section", `${K}`, () => [
          ...basePieces(K, K),
          box([K, BH, BTH], [0, BT + BH / 2, Z0 + BTH / 2]),
          box([BTH, BH, bw], [Z0 + BTH / 2, BT + BH / 2, Z0 + BTH + bw / 2]),
        ]), [0, 0, 0]);
        for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) m.legs.push(put(m, { type: legT, mid: [0, 0, 0] }, [x * (K / 2 - 50), LEG / 2, z * (K / 2 - 35)]));
        m.recs.skirt = put(m, shape("Cover", `corner${K}`, () => [box([K + T, skirtH, T], [-T / 2, skirtY, Z0 - T / 2]), box([T, skirtH, K], [Z0 - T / 2, skirtY, 0])]), [0, 0, 0]);
        const c0 = Z0 + BTH;
        m.cush.push(put(m, { type: simple("Corner seat cushion", [K / 2 - c0 - 4, d.CUSH, K / 2 - c0 - 4]), mid: [0, 0, 0] }, [(c0 + K / 2) / 2, BT + d.CUSH / 2, (c0 + K / 2) / 2]).key);
        m.backs.push(put(m, { type: simple("Corner back cushion", [K / 2 - c0 - 4, H - SEAT, BC]), mid: [0, 0, 0] }, [(c0 + K / 2) / 2, (SEAT + H) / 2, c0 + BC / 2]).key);
        m.backs.push(put(m, { type: simple("Corner back cushion", [BC, H - SEAT, K / 2 - c0 - BC - 4]), mid: [0, 0, 0] }, [c0 + BC / 2, (SEAT + H) / 2, (c0 + BC + K / 2) / 2]).key);
        continue;
      }
      const b0 = xb0(m), b1 = xb1(m), i0 = xi0(m), i1 = xi1(m);
      m.recs.base = put(m, shape("Seat frame", `${Math.round(b1 - b0)}`, () => basePieces(b1 - b0, D)), [(b0 + b1) / 2, 0, 0]);
      m.recs.back = put(m, shape("Backrest", `${Math.round(i1 - i0)}`, () => backPieces(i1 - i0)), [(i0 + i1) / 2, 0, 0]);
      if (m.armL) m.arms.push({ e: -1, rec: put(m, armT, [b0 + A / 2, 0, 0], PI) });
      if (m.armR) m.arms.push({ e: 1, rec: put(m, armT, [b1 - A / 2, 0, 0]) });
      // legs at the corners; in a set only at the armrest ends (the support or the corner holds the other end)
      const legEnds = corner || chaise ? m.arms.map((a) => a.e) : [-1, 1];
      for (const e of legEnds) for (const z of [-1, 1]) m.legs.push(put(m, { type: legT, mid: [0, 0, 0] }, [e < 0 ? b0 + 50 : b1 - 50, LEG / 2, z * (D / 2 - 35)]));
      // the cover's skirt, hanging round the frame to just above the floor
      const l = b0 - (m.armL ? T : 0), r = b1 + (m.armR ? T : 0);
      const fl = m === chaise ? i1 : l;
      m.recs.skirt = put(m, shape("Cover", `${Math.round(l)}|${Math.round(r)}|${m === chaise}`, () => [
        box([r - l, skirtH, T], [(l + r) / 2, skirtY, Z0 - T / 2]),
        box([r - fl, skirtH, T], [(fl + r) / 2, skirtY, D / 2 + T / 2]),
        ...(m.armL ? [box([T, skirtH, D], [b0 - T / 2, skirtY, 0])] : []),
        ...(m.armR ? [box([T, skirtH, D], [b1 + T / 2, skirtY, 0])] : []),
      ]), [0, 0, 0]);
      // cushions
      const span = i1 - i0, sd = (m === chaise ? D / 2 + CD : D / 2) - (Z0 + BTH);
      for (let i = 0; i < m.n; i++) {
        const x = i0 + (span / m.n) * (i + 0.5);
        m.cush.push(put(m, { type: simple(m === chaise ? "Chaise cushion" : "Seat cushion", [span / m.n - 6, d.CUSH, sd - 4]), mid: [0, 0, 0] }, [x, BT + d.CUSH / 2, Z0 + BTH + sd / 2]).key);
        m.backs.push(put(m, { type: simple("Back cushion", [span / m.n - 8, H - SEAT, BC]), mid: [0, 0, 0] }, [x, (SEAT + H) / 2, Z0 + BTH + BC / 2 + 2]).key);
      }
    }

    // the chaise part: a padded box on two legs in front of the chaise section, with two brackets that hook onto a
    // steel support bolted under the section
    const ch = chaise;
    const chx = ch ? (xi0(ch) + xi1(ch)) / 2 : 0, CWID = ch ? xi1(ch) - xi0(ch) : 0;
    const cz0 = D / 2; // where the chaise part starts
    const xParts: Record<string, Rec> = {};
    const xLegs: Rec[] = [];
    if (ch) {
      const bw = CWID - 2 * T, bd = CD - T;
      xParts.block = put(ch, shape("Chaise part", `${Math.round(bw)}`, () => basePieces(bw, bd)), [chx, 0, cz0 + bd / 2]);
      for (const e of [-1, 1]) xLegs.push(put(ch, { type: legT, mid: [0, 0, 0] }, [chx + e * (bw / 2 - 50), LEG / 2, cz0 + bd - 35]));
      const brT = simple("Bracket", [60, 40, 80], { material: "metal" });
      xParts.brL = put(ch, { type: brT, mid: [0, 0, 0] }, [chx - 120, LEG - 20, cz0 + 40]);
      xParts.brR = put(ch, { type: brT, mid: [0, 0, 0] }, [chx + 120, LEG - 20, cz0 + 40]);
      xParts.skirt = put(ch, shape("Chaise cover", `${Math.round(CWID)}`, () => [
        box([CWID, skirtH, T], [0, skirtY, CD - T / 2]),
        box([T, skirtH, CD - T], [-(CWID / 2 - T / 2), skirtY, (CD - T) / 2]),
        box([T, skirtH, CD - T], [CWID / 2 - T / 2, skirtY, (CD - T) / 2]),
      ]), [chx, 0, cz0]);
      xParts.support = put(ch, shape("Chaise support", `${D}`, () => [
        box([50, 40, D + 130], [0, LEG - 20, (Z0 + 5 + cz0 + 135) / 2]),
        box([400, 40, 50], [0, LEG - 20, Z0 + 30]),
        box([300, 40, 50], [0, LEG - 20, cz0 - 30]),
        box([400, LEG - 44, 50], [0, 4 + (LEG - 44) / 2, cz0 + 115]),
      ], "metal"), [chx, 0, 0]);
    }

    /* ---------- scenes ---------- */
    const offs = new Map<string, Vec3>();
    const offKey = (scene: string, m: Mod) => `${scene}|${mods.indexOf(m)}`;
    const spot = (scene: string, m: Mod, lp: Vec3): Vec3 => (scene === "main" ? plus(W(m, lp), m.off) : plus(lp, offs.get(offKey(scene, m)) ?? [0, 0, 0]));
    const turn = (scene: string, m: Mod, r: Rec): Vec3 => [0, r.ry + (scene === "main" && m.yaw ? PI / 2 : 0), 0];
    const waiting = (scene: string, m: Mod) => scene !== "main" || m.off.some((v) => v !== 0);
    const show = (scene: string, m: Mod, recs: Rec[], from?: Vec3) => {
      for (const r of recs) {
        if (!waiting(scene, m)) b.add(r.key, from && Wd(m, from));
        else b.stage(r.key, spot(scene, m, r.lp), turn(scene, m, r), from);
      }
    };
    const step = (o: { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] }, body: () => void = () => {}) =>
      b.step({ kind: "general", ...o, scene: o.scene ?? "main", warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
    const fit = (def: HwDef, list: FitOpts[], gap = 0.08) => b.fits(def, list, gap);
    const at = (m: Mod, lp: Vec3, dir: Vec3, on: string, mate?: string, hole?: false): FitOpts => ({ on, at: W(m, lp), dir: Wd(m, dir), mate, hole });

    const what = lay.kind === "sofa" ? (lay.n === 1 ? "armchair" : "sofa") : "sections";
    const many = secs.length > 1;
    const big = s.size.w > 150 || many;
    const frameScene = corner ? "sections" : "main";
    if (corner) {
      // side by side with the armrests on the outside
      let x = 0;
      const row = [...secs].sort((a, c) => Number(c.armL) - Number(a.armL));
      const ws = row.map((m) => m.w + 400);
      const tot = ws.reduce((a, c) => a + c, 0);
      row.forEach((m, i) => {
        offs.set(offKey("sections", m), [-tot / 2 + x + ws[i] / 2, 0, 0]);
        x += ws[i];
      });
      offs.set(offKey("corner", corner), [0, 0, 0]);
    }
    if (ch) offs.set(offKey("chaise", ch), [-chx, 0, -(cz0 + CD / 2)]);

    /* ---------- the frames ---------- */
    step({ title: many ? "Take everything off the two seat frames" : "Take everything off the seat frame", detail: "The cushions and the fittings are packed on the seat, under the folded backrest. Unwrap them by hand, never with a knife, so the fabric stays whole.", scene: frameScene, people: big ? 2 : 1 }, () => {
      b.stagger(0.25);
      for (const m of secs) {
        show(frameScene, m, [m.recs.base], [0, 220, 0]);
        const r = m.recs.back;
        b.stage(r.key, spot(frameScene, m, [r.lp[0], BT + BTH / 2, Z0 + BH / 2]), [PI / 2, 0, 0], [0, 220, 0]);
      }
    });
    step({ title: many ? "Lift both backrests up" : "Lift the backrest up", detail: many ? "Each one is hinged along the back of its seat frame. Fold it up until it stands straight." : "It's hinged along the back of the seat frame. Fold it up until it stands straight.", scene: frameScene, kind: "join" }, () => {
      b.stagger(0.3);
      for (const m of secs) show(frameScene, m, [m.recs.back]);
    });

    // the armrests, lying on their outer sides while the rods go in
    const arms = secs.flatMap((m) => m.arms.map((a) => ({ m, ...a })));
    const rodX = (m: Mod, e: number) => (e < 0 ? xb0(m) + 50 : xb1(m) - 50);
    const rodZ = [-(D / 2 - 180), D / 2 - 180];
    const inX = (m: Mod, e: number) => (e < 0 ? xb0(m) + A : xb1(m) - A);
    const sideP = (m: Mod, e: number): Vec3 => [inX(m, e), BT + 70, Z0 + 70];
    step({ title: arms.length > 1 ? "Screw the rods into the armrests" : "Screw the rods into the armrest", detail: "Two into the underside of each armrest and one, with a large washer on it, into the hole low down at the back of its inner side. By hand, until they stop.", scene: "arms", kind: "bolts", warnings: ["hand"] }, () => {
      b.stagger(0.2);
      arms.forEach((a, i) => b.stage(a.rec.key, [(i - (arms.length - 1) / 2) * 720, R, 0], [0, 0, -PI / 2], [0, 200, 0]));
      b.then(0.15);
      for (const a of arms) fit(ROD, rodZ.map((z) => ({ ...at(a.m, [rodX(a.m, a.e), BT, z], [0, 1, 0], a.rec.key, a.m.recs.base.key), travel: 130, spin: 3 })), 0.12);
      b.then(0.1);
      for (const a of arms) {
        fit(BIGW, [at(a.m, sideP(a.m, a.e), [a.e, 0, 0], a.rec.key, undefined, false)]);
        fit(ROD, [{ ...at(a.m, sideP(a.m, a.e), [a.e, 0, 0], a.rec.key, a.m.recs.back.key), travel: 130, spin: 3 }]);
      }
    });
    step({ title: arms.length > 1 ? `Lower the armrests onto the ends of the ${many ? "frames" : "frame"}` : "Lower the armrest onto the end of the frame", detail: "Guide the rod on the inner side down into the slot in the end of the backrest, and the two bottom rods into the holes in the frame. Press it down until it sits flat.", scene: frameScene, kind: "join" }, () => {
      b.stagger(0.35);
      for (const a of arms) show(frameScene, a.m, [a.rec], [a.e * 100, 380, 0]);
    });
    const onBack = many ? "Tip the sections onto their backs" : `Tip the ${what} onto its back`;
    step({ title: `${onBack} and fasten the bottom rods`, detail: "On a rug or the flattened box. A washer and a nut on each rod, tightened with the box spanner until the end of the rod just shows past the nut.", scene: frameScene, pose: "+z", kind: "bolts", tools: ["wrench"], people: 2, warnings: ["two", "floor"] }, () => {
      for (const a of arms) {
        fit(WASH, rodZ.map((z) => at(a.m, [rodX(a.m, a.e), BT - 90, z], [0, 1, 0], a.m.recs.base.key, undefined, false)), 0.06);
        b.then(0.05);
        fit(NUT, rodZ.map((z) => at(a.m, [rodX(a.m, a.e), BT - 91.6, z], [0, 1, 0], a.m.recs.base.key, undefined, false)), 0.08);
      }
    });
    step({ title: many ? "Fasten the side rods inside the backrests" : "Fasten the side rods inside the backrest", detail: "Reach in under the backrest at the armrest end: a washer and a nut on the rod, tightened with the box spanner.", scene: frameScene, pose: "+z", kind: "bolts", tools: ["wrench"] }, () => {
      for (const a of arms) {
        const p = sideP(a.m, a.e);
        const q: Vec3 = [p[0] - a.e * 60, p[1], p[2]];
        fit(WASH, [at(a.m, q, [a.e, 0, 0], a.m.recs.back.key, undefined, false)]);
        b.then(0.05);
        fit(NUT, [at(a.m, [q[0] - a.e * 1.6, q[1], q[2]], [a.e, 0, 0], a.m.recs.back.key, undefined, false)]);
      }
    });
    step({ title: "Tighten all the nuts once more", detail: "Check that each armrest sits tight against the seat frame and the backrest with no gap, then give every nut a last turn.", scene: frameScene, pose: "+z", kind: "bolts", tools: ["wrench"] });

    /* ---------- the sofa with chaise longue: join the sections, fit the support ---------- */
    if (ch) {
      const A0 = secs[0];
      const jx = A0.w / 2; // the joint, in the 2-seat section's frame
      const cin = xb0(ch) + 100; // inside face of the chaise section's end strip, in its own frame
      step({ title: "Push the sections together and bolt them", detail: "Slide the large washer onto the rod in the end of the 2-seat section and push the chaise section up to it. From inside the chaise section: a washer and a wing nut on that rod, then a washer and a wing bolt through the hole nearer the front. Tighten both by hand.", pose: "+z", kind: "join", people: 2, warnings: ["two", "hand"] }, () => {
        fit(BIGW, [at(A0, [jx, BT - 45, Z0 + 150], [-1, 0, 0], A0.recs.base.key, undefined, false)]);
        b.then(0.1);
        ch.off = [0, 0, 0];
        b.stagger(0);
        show("main", ch, [ch.recs.base, ch.recs.back, ...ch.arms.map((a) => a.rec)]);
        b.then(0.1);
        b.stagger(0.1);
        fit(WASH, [at(ch, [cin, BT - 45, Z0 + 150], [-1, 0, 0], ch.recs.base.key, undefined, false), at(ch, [cin, BT - 45, D / 2 - 150], [-1, 0, 0], ch.recs.base.key, undefined, false)]);
        b.then(0.05);
        fit(WNUT, [at(ch, [cin + 1.6, BT - 45, Z0 + 150], [-1, 0, 0], ch.recs.base.key, undefined, false)]);
        fit(WBOLT, [{ ...at(ch, [cin + 1.6, BT - 45, D / 2 - 150], [-1, 0, 0], ch.recs.base.key, A0.recs.base.key), spin: 3 }]);
      });
      const sup = xParts.support;
      const sb: Vec3[] = [-150, 150].map((x) => [chx + x, LEG - 40, Z0 + 30]);
      const sn: Vec3[] = [-110, 110].map((x) => [chx + x, LEG - 40, cz0 - 30]);
      step({ title: "Bolt the chaise support under the chaise section", detail: "Its long arm points out to the front. A washer and a wing bolt through each hole at the back end, a washer and a wing nut on each rod at the front edge of the frame, all by hand.", pose: "+z", kind: "bolts", warnings: ["hand"] }, () => {
        b.add(sup.key, [0, -300, 0]);
        b.then(0.15);
        fit(WASH, [...sb, ...sn].map((p) => at(ch, p, [0, 1, 0], sup.key, undefined, false)), 0.06);
        b.then(0.05);
        fit(WBOLT, sb.map((p) => ({ ...at(ch, [p[0], p[1] - 1.6, p[2]], [0, 1, 0], sup.key, ch.recs.base.key), spin: 3 })), 0.1);
        fit(WNUT, sn.map((p) => at(ch, [p[0], p[1] - 1.6, p[2]], [0, 1, 0], sup.key, undefined, false)), 0.1);
      });
      step({ title: "Stick the felt pads under the support's foot", pose: "+z" }, () => {
        fit(HW.glide, [-170, 170].map((x) => at(ch, [chx + x, 4, cz0 + 115], [0, 1, 0], sup.key, undefined, false)), 0.15);
      });
    }

    step({ title: corner ? "Screw two legs into each section" : ch ? "Screw in the four legs" : "Screw in the four legs", detail: corner ? "At the end with the armrest, clockwise by hand until snug. The other end will hang on the corner section." : ch ? "Two at each end of the sofa, clockwise by hand until snug. The middle rests on the support." : "One in each corner, clockwise by hand until snug.", scene: frameScene, pose: "+z", kind: "legs", warnings: ["hand"] }, () => {
      b.stagger(0.2);
      for (const m of secs) show(frameScene, m, m.legs, [0, -240, 0]);
    });

    if (ch) {
      const block = xParts.block;
      step({ title: "Screw two legs into the chaise part", detail: "Stand it on the end that meets the sofa. The legs go in the two corners at the other end, clockwise by hand.", scene: "chaise", pose: "+z", kind: "legs", warnings: ["hand"] }, () => {
        show("chaise", ch, [block], [0, 220, 0]);
        b.then(0.15);
        show("chaise", ch, xLegs, [0, -240, 0]);
      });
      const bp: Vec3[] = [-120, 120].map((x) => [chx + x, LEG - 40, cz0 + 40]);
      step({ title: "Bolt the two brackets onto the chaise part", detail: "Under the end that meets the sofa, with their hooks pointing back. A washer and a wing bolt in each, by hand.", scene: "chaise", pose: "+z", kind: "bolts", warnings: ["hand"] }, () => {
        show("chaise", ch, [xParts.brL, xParts.brR], [0, -200, 0]);
        b.then(0.12);
        fit(WASH, [at(ch, bp[0], [0, 1, 0], xParts.brL.key, undefined, false), at(ch, bp[1], [0, 1, 0], xParts.brR.key, undefined, false)], 0.06);
        b.then(0.05);
        fit(WBOLT, [{ ...at(ch, [bp[0][0], bp[0][1] - 1.6, bp[0][2]], [0, 1, 0], xParts.brL.key, block.key), spin: 3 }, { ...at(ch, [bp[1][0], bp[1][1] - 1.6, bp[1][2]], [0, 1, 0], xParts.brR.key, block.key), spin: 3 }], 0.12);
      });
    }
    step({ title: corner ? "Stand the sections up" : `Stand the ${ch ? "sofa" : what} up`, detail: corner ? "Lift them by the frames, never by the legs or the armrests' rolled tops." : "Lift it by the frame, never by the legs or the armrests' rolled tops.", scene: frameScene, kind: "standup", people: big ? 2 : 1 });

    /* ---------- the corner sofa: the corner section, then the sections hung on it ---------- */
    if (corner) {
      const c = corner;
      step({ title: "Turn the corner section over and screw in its legs", detail: "Lay it on its back on a rug. Four legs, one in each corner, clockwise by hand.", scene: "corner", pose: "+z", kind: "legs", warnings: ["hand", "floor"] }, () => {
        show("corner", c, [c.recs.frame], [0, 220, 0]);
        b.then(0.15);
        show("corner", c, c.legs, [0, -240, 0]);
      });
      step({ title: "Stand the corner section where the sofa will go", detail: "Leave room on both open sides to lift the sections in.", kind: "join" }, () => {
        b.stagger(0);
        show("main", c, [c.recs.frame, ...c.legs], [0, 200, 0]);
      });
      step({ title: "Push a pin into the open end of each section", detail: "Into the hole near the top of the backrest's end, up to its collar.", scene: "sections", kind: "bolts", warnings: ["hand"] }, () => {
        for (const m of secs) {
          const eo = m.armR ? -1 : 1; // the open end
          fit(PIN, [{ ...at(m, [eo * (m.w / 2), BACK - 100, Z0 + BTH / 2], [-eo, 0, 0], m.recs.back.key, c.recs.frame.key), travel: 130 }], 0.2);
        }
      });
      secs.forEach((m, i) => {
        step({ title: i ? "Hang the other section on the corner" : "Lift a section onto the corner", detail: "One of you at each end. Lower it so the pin drops into the slot in the corner's backrest and the brackets under its open end slide down over the corner's.", kind: "join", people: 2 }, () => {
          b.stagger(0);
          show("main", m, [m.recs.base, m.recs.back, ...m.arms.map((a) => a.rec), ...m.legs], [0, 300, 0]);
        });
      });
      step({ title: "Press the sections down into the brackets", detail: "Push down on the backrests where they meet the corner until both sit level with it." });
    }

    /* ---------- the covers and cushions ---------- */
    step({ title: many || corner ? "Pull the cover over the frames" : "Pull the cover over the frame", detail: "Start over the backrest and the armrests, then pull it down over the front. Push the spare fabric well down into the gaps beside and behind the seat so it stays put.", kind: "general" }, () => {
      b.stagger(0.2);
      for (const m of mods) show("main", m, [m.recs.skirt], [0, 260, 0]);
    });
    if (ch) {
      step({ title: "Fit the cover on the chaise part", detail: "Turn it upside down. Pull the cover down over it, then close the zip and the strips underneath, around the legs.", scene: "chaise", pose: "-y", people: 2 }, () => {
        show("chaise", ch, [xParts.skirt], [0, -260, 0]);
      });
      step({ title: "Hook the chaise part onto the support", detail: "Stand it up, lift the end with the brackets and slide them over the support under the sofa, then lower it. Turn its legs until it sits level with the seat.", kind: "join", people: 2 }, () => {
        b.stagger(0);
        show("main", ch, [xParts.block, ...xLegs, xParts.brL, xParts.brR, xParts.skirt], [0, 0, 500]);
      });
    }
    const cush = mods.flatMap((m) => m.cush), backs = mods.flatMap((m) => m.backs);
    step({ title: cush.length > 1 ? "Zip the covers onto the seat cushions and lay them in" : "Zip the cover onto the seat cushion and lay it in", detail: "Fold the cushion to ease it into its cover, then smooth the corners out. Zips to the back.", kind: "cushions" }, () => {
      b.stagger(0.18);
      for (const m of mods) for (const k of m.cush) b.add(k, [0, 320, 0]);
    });
    step({ title: backs.length > 1 ? "Fill the back cushions and stand them in place" : "Fill the back cushion and stand it in place", detail: "Push the filling into the corners of each cover before you zip it, then stand it on the seat, leaning on the backrest.", kind: "cushions" }, () => {
      b.stagger(0.18);
      for (const m of mods) for (const k of m.backs) b.add(k, Wd(m, [0, 160, 360]));
    });
    step({ title: "Smooth the cover and plump up the cushions", detail: "Tuck the cover back in wherever it has pulled out. Turn and swap the cushions now and then so they wear evenly." });

    if (lay.kind === "sofa" && lay.stool) stool(b, d, secs[0], step, fit);
    return true;
  };
}

type StepFn = (o: { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] }, body?: () => void) => unknown;

/** The footstool (ottoman): two long sides with the legs on, two ends, bolted together upside down; a lid on top. */
function stool(b: PlanBuilder, d: Dims, chair: Mod, step: StepFn, fit: (def: HwDef, list: FitOpts[], gap?: number) => unknown) {
  const { w, h, d: dep, leg, padded, name } = d.stool;
  // a padded lid, or a plain one under the cover's padded top
  const LT = padded ? 100 : 18, PAD = padded ? 0 : 60, PT = 18, P = 45, T = 10;
  const top = h - PAD - LT - BUF.len; // top of the box
  const ph = top - leg;
  const px = w / 2 - PT - P / 2, pz = dep / 2 - PT - P / 2;
  const S0: Vec3 = [chair.ox - chair.w / 4, 0, chair.oz + d.D / 2 + 260 + dep / 2]; // in front of the armchair
  const recs: { key: string; lp: Vec3; rot: Vec3 }[] = [];
  const put = (type: string, lp: Vec3, rot: Vec3 = [0, 0, 0]) => {
    const r = { key: b.place(type, plus(S0, lp), rot), lp, rot };
    recs.push(r);
    return r;
  };
  const side = b.compound("Side panel", [
    { shape: "box", size: [w - 2 * PT, ph, PT], pos: [0, leg + ph / 2, 0] },
    { shape: "box", size: [P, top, P], pos: [-px, top / 2, -(PT + P) / 2], material: "wood" },
    { shape: "box", size: [P, top, P], pos: [px, top / 2, -(PT + P) / 2], material: "wood" },
  ], { material: "board" });
  const lpOf = (c: { mid: Vec3 }, z: number, turned: boolean): Vec3 => [0, c.mid[1], turned ? z - c.mid[2] : z + c.mid[2]];
  const back = put(side.type, lpOf(side, -(dep / 2 - PT / 2), true), [0, Math.PI, 0]);
  const front = put(side.type, lpOf(side, dep / 2 - PT / 2, false));
  const endT = b.part("End panel", [PT, ph, dep], { material: "board" });
  const ends = [-1, 1].map((e) => put(endT, [e * (w / 2 - PT / 2), leg + ph / 2, 0]));
  const bottom = padded ? put(b.part("Bottom panel", [w - 2 * PT - 2 * P, 12, dep - 2 * PT], { material: "board" }), [0, leg + 40, 0]) : null;
  const lid = put(b.part(padded ? "Padded lid" : "Lid", [w, LT, dep], { material: padded ? "soft" : "board" }), [0, h - PAD - LT / 2, 0]);
  const sy = 25 + (top - 25) / 2, sh = top - 25;
  const cover = b.compound(`${name[0].toUpperCase()}${name.slice(1)} cover`, [
    { shape: "box", size: [w + 2 * T, sh, T], pos: [0, sy, dep / 2 + T / 2] },
    { shape: "box", size: [w + 2 * T, sh, T], pos: [0, sy, -dep / 2 - T / 2] },
    { shape: "box", size: [T, sh, dep], pos: [-w / 2 - T / 2, sy, 0] },
    { shape: "box", size: [T, sh, dep], pos: [w / 2 + T / 2, sy, 0] },
    ...(PAD ? [{ shape: "box" as const, size: [w + 2 * T, PAD, dep + 2 * T] as Vec3, pos: [0, h - PAD / 2, 0] as Vec3 }] : []),
  ], { material: "soft" });
  const skirt = put(cover.type, cover.mid);
  const sc = "stool";
  const stage = (r: { key: string; lp: Vec3; rot: Vec3 }, from?: Vec3, lp = r.lp, rot = r.rot) => b.stage(r.key, lp, rot, from);
  const bolts = (zs: number) => [-1, 1].flatMap((e) => [leg + ph * 0.25, leg + ph * 0.75].map((y) => ({ on: ends[e < 0 ? 0 : 1].key, at: plus(S0, [e * (w / 2), y, zs * pz]) as Vec3, dir: [-e, 0, 0] as Vec3, mate: (zs < 0 ? back : front).key })));
  step({ title: `Bolt the ends onto the back of the ${name}`, detail: "Build it upside down, with the legs pointing up. Two bolts through each end into the legs, with the Allen key.", scene: sc, pose: "-y", kind: "bolts", tools: ["allen"] }, () => {
    b.stagger(0.2);
    stage(back, [0, 200, 0]);
    for (const e of ends) stage(e, [0, 200, 0]);
    b.then(0.15);
    fit(SBOLT, bolts(-1), 0.1);
  });
  step({ title: "Bolt on the front", detail: "Two more bolts through each end into the front legs.", scene: sc, pose: "-y", kind: "bolts", tools: ["allen"] }, () => {
    stage(front, [0, 200, 0]);
    b.then(0.15);
    fit(SBOLT, bolts(1), 0.1);
  });
  if (bottom) step({ title: "Turn it over and drop in the bottom panel", detail: "It rests on the strips inside, with the finger hole at the top.", scene: sc, kind: "general" }, () => stage(bottom, [0, 300, 0]));
  // with no bottom panel the box is still upside down here, and the lid lies upside down beside it
  const lidUp: Vec3 = [w + 300, LT / 2, 0];
  step({ title: "Screw the four buffers into the underside of the lid", detail: "Lay the lid upside down. One in each corner, by hand.", scene: sc, pose: bottom ? "+y" : "-y", kind: "screws", warnings: ["hand"] }, () => {
    stage(lid, [0, 200, 0], lidUp, bottom ? [Math.PI, 0, 0] : [0, 0, 0]);
    b.then(0.15);
    fit(BUF, [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ on: lid.key, at: plus(S0, [x * px, top + BUF.len, z * pz]) as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const }))), 0.1);
  });
  step({ title: bottom ? "Lay the lid on the box" : "Turn it over and lay the lid on", detail: "Buffers down, so they rest on the tops of the legs.", scene: sc, kind: "general" }, () => stage(lid, undefined));
  step({ title: `Pull the cover over the ${name}`, detail: padded ? "Fasten it along the top edge of the box, then pull it down over the sides. Zip the lid's cover on." : "Pull it down over the lid and the sides, then fasten it under the bottom edge of the box.", scene: sc, kind: "general" }, () => stage(skirt, [0, 260, 0]));
  step({ title: `Set the ${name} in front of the armchair`, kind: "general" }, () => {
    b.stagger(0);
    for (const r of recs) b.add(r.key, [0, 0, 300]);
  });
}

const family: Family = {
  names: ["EKTORP"],
  build: sofaBuilder({
    D: 880, H: 880, A: 240, OV: 30, ARMH: 650, SEAT: 450, CUSH: 170, BACK: 740, LEG: 110, BTH: 170, BC: 200,
    W2: 1280, CD: 750, chair: 1040,
    stool: { w: 800, h: 440, d: 560, leg: 40, padded: true, name: "footstool" },
  }),
};
export default family;
