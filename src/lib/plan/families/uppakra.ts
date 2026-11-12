import type { Family } from "./family";
import type { PartMaterial, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";

/**
 * UPPÅKRA, from IKEA's manuals. Every module is a frame you bolt together yourself: corner fittings onto the side
 * rails, the side rails into the upholstered backrest, the front rail across, then a roll of slats clipped in. A
 * module with an armrest gets two hooks and an angle bracket on the armrest, which is hung on the frame's side
 * and bolted to the side rail. The corner module is two backrest panels hooked together with two front rails; the
 * chaise longue has a centre rail and two sets of slats. Every bolt is tightened at the end. The covers go on each
 * frame, then the frames are joined: legs in the frames' corner fittings, and joining plates with a leg under the
 * back where two frames meet. The cushions go in last.
 */

type Kind = "seat" | "chaise" | "corner";
interface Mod {
  kind: Kind;
  w: number; // along its own x
  depth: number; // along its own z, back (0) to front
  arm: -1 | 0 | 1; // which end has an armrest (-1 its left, seen from the front)
  side: -1 | 1; // a corner: which end has the second backrest (-1 left)
  ox: number;
  oz: number;
  yaw: -1 | 0 | 1; // 1: turned a quarter, front facing +x (a return on the left); -1: front facing -x
  parts: Record<string, string>; // name -> key
  lp: Record<string, Vec3>; // centre in the module's own frame
  off: Vec3; // where it lies in the frames scene
}

const D = 1070, K = 1020, CL = 1800, AW = 170, SW = 1080;
const LEG = 140, RH = 160, RT = 60, RY = LEG + RH / 2, BT = 160, BH = 580, BY = LEG + BH / 2, SEAT = 460, TOP = 950;
const ARMH = 500, ARMY = LEG + ARMH / 2;

const LONG: HwDef = { kind: "bolt", len: 50, dia: 8 };
const SHORT: HwDef = { kind: "bolt", len: 16, dia: 8 };
const WASH: HwDef = { kind: "washer", len: 2, dia: 20 };
const FITTING: HwDef = { kind: "angle", len: 90, dia: 70, name: "Corner fitting" };
const HOOK: HwDef = { kind: "hook", len: 70, dia: 30, name: "Armrest hook" };
const ABRK: HwDef = { kind: "angle", len: 60, dia: 30, name: "Angle bracket" };
const CLIP: HwDef = { kind: "clip", len: 20, dia: 16, name: "Slat holder" };
const STUD: HwDef = { kind: "stud", len: 30, dia: 8, name: "Leg stud" };
const SPACER: HwDef = { kind: "washer", len: 6, dia: 40, name: "Spacer" };
const PLATE: HwDef = { kind: "plate", len: 220, dia: 60, name: "Joining plate" };
const PSCREW: HwDef = { kind: "bolt", len: 12, dia: 8, name: "Plate screw" };

const W = (m: Mod, v: Vec3): Vec3 => (m.yaw === 1 ? [m.ox + v[2], v[1], m.oz - v[0]] : m.yaw === -1 ? [m.ox - v[2], v[1], m.oz + v[0]] : [m.ox + v[0], v[1], m.oz + v[2]]);
const Wd = (m: Mod, d: Vec3): Vec3 => (m.yaw === 1 ? [d[2], d[1], -d[0]] : m.yaw === -1 ? [-d[2], d[1], d[0]] : d);
const rotOf = (m: Mod): Vec3 => [0, (m.yaw * Math.PI) / 2, 0];
const LR = [-1, 1] as const;

interface Layout {
  row?: Cell[]; // a sofa, left to right
  corner?: -1 | 1; // a corner set: the corner at the back left (-1) or back right (1)
  back?: Cell[]; // from the corner outwards along the back
  wing?: Cell[]; // from the corner forwards
  chrome?: boolean;
}
type Cell = { kind: "seat" | "chaise"; arm: -1 | 0 | 1 } | "corner";
const S = (arm: -1 | 0 | 1): Cell => ({ kind: "seat", arm });
const C = (arm: -1 | 0 | 1): Cell => ({ kind: "chaise", arm });

/** What the product is made of, from its page: modules and where their armrests are. */
function layout(s: ProductSpec): Layout | null {
  const slug = s.slug ?? "";
  if (slug === "uppakra-corner-module") return { corner: -1 };
  if (slug === "uppakra-1-5-seat-module") return { row: [S(-1)] };
  if (slug === "uppakra-chaise-longue-module") return { row: [C(-1)], chrome: true };
  if (slug === "uppakra-3-seat-modular-sofa") return { row: [S(-1), S(1)] };
  if (slug === "uppakra-4-5-seat-modular-sofa") return { row: [C(-1), S(0), S(1)] };
  if (slug === "uppakra-modular-corner-sofa-3-seat") return { corner: -1, back: [S(1)], wing: [S(-1)], chrome: true };
  if (slug === "uppakra-modular-corner-sofa-6-seat") return { corner: 1, back: [S(0), S(0)], wing: [S(0), S(1)] };
  if (slug === "uppakra-u-shaped-sofa-4-5-seat") return { corner: 1, back: [S(0), C(-1)], wing: [S(1)] };
  return null;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const lay = layout(s);
  if (!lay) return false;
  const mods: Mod[] = [];
  const mk = (c: Cell, ox: number, oz: number, yaw: -1 | 0 | 1, side: -1 | 1 = -1): Mod => {
    const m: Mod =
      c === "corner"
        ? { kind: "corner", w: K, depth: K, arm: 0, side, ox, oz, yaw, parts: {}, lp: {}, off: [0, 0, 0] }
        : { kind: c.kind, w: c.arm ? SW + AW : SW, depth: c.kind === "chaise" ? CL : D, arm: c.arm, side, ox, oz, yaw, parts: {}, lp: {}, off: [0, 0, 0] };
    mods.push(m);
    return m;
  };
  const widthOf = (c: Cell) => (c === "corner" ? K : c.arm ? SW + AW : SW);
  // backs on z = 0; a row from x = 0 to the right
  if (lay.row) {
    let x = 0;
    for (const c of lay.row) {
      const w = widthOf(c);
      mk(c, x + w / 2, 0, 0);
      x += w;
    }
  } else {
    const e = lay.corner!;
    mk("corner", 0, 0, 0, e);
    let x = K / 2;
    for (const c of lay.back ?? []) {
      const w = widthOf(c);
      mk(c, -e * (x + w / 2), 0, 0);
      x += w;
    }
    let z = K;
    for (const c of lay.wing ?? []) {
      const w = widthOf(c);
      // a return's back runs along the corner's outer side; its own x runs back to front, against the world's
      mk(c, e * (K / 2), z + w / 2, e > 0 ? -1 : 1);
      z += w;
    }
  }
  // the footprint, centred on the origin
  const foot = (m: Mod) => [W(m, [-m.w / 2, 0, 0]), W(m, [m.w / 2, 0, m.depth])];
  {
    const pts = mods.flatMap(foot);
    const cx = (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
    const cz = (Math.min(...pts.map((p) => p[2])) + Math.max(...pts.map((p) => p[2]))) / 2;
    for (const m of mods) {
      m.ox -= cx;
      m.oz -= cz;
    }
  }
  // the frames scene: each frame unturned, side by side
  {
    let x = 0;
    const total = mods.reduce((t, m) => t + m.w, 0) + 450 * (mods.length - 1);
    for (const m of mods) {
      m.off = [-total / 2 + x + m.w / 2, 0, -m.depth / 2];
      x += m.w + 450;
    }
  }

  /* ---------- the parts ---------- */
  const types = new Map<string, { type: string; mid: Vec3 }>();
  const legMat: PartMaterial = lay.chrome ? "metal" : "wood";
  const part = (m: Mod, key: string, name: string, size: Vec3, lp: Vec3, material: PartMaterial = "soft") => {
    const id = `${name}|${size.map(Math.round).join("x")}|${material}`;
    if (!types.has(id)) types.set(id, { type: b.part(name, size, { material }), mid: [0, 0, 0] });
    m.parts[key] = b.place(types.get(id)!.type, W(m, lp), rotOf(m));
    m.lp[key] = lp;
  };
  // pieces drawn centred across, moved over by dx, so frames of the same width share a part
  const comp = (m: Mod, key: string, name: string, pieces: PartPiece[], material: PartMaterial, dx = 0) => {
    const id = `${name}|${JSON.stringify(pieces)}`;
    if (!types.has(id)) types.set(id, b.compound(name, pieces, { material }));
    const t = types.get(id)!;
    const lp: Vec3 = [t.mid[0] + dx, t.mid[1], t.mid[2]];
    m.parts[key] = b.place(t.type, W(m, lp), rotOf(m));
    m.lp[key] = lp;
  };
  const slats = (x0: number, x1: number, z0: number, z1: number): PartPiece[] => {
    const n = Math.max(6, Math.round((z1 - z0) / 75));
    return Array.from({ length: n }, (_, i) => ({ shape: "box", size: [x1 - x0, 12, 48], pos: [(x0 + x1) / 2, LEG + RH - 14, z0 + 30 + ((z1 - z0 - 60) * i) / (n - 1)] }) as PartPiece);
  };
  for (const m of mods) {
    if (m.kind === "corner") {
      const e = m.side, inner = K - BT;
      part(m, "back", "Corner backrest", [K, BH, BT], [0, BY, BT / 2]);
      part(m, "back2", "Corner backrest", [K - BT, BH, BT], [e * (K / 2 - BT / 2), BY, BT + inner / 2]);
      part(m, "rail", "Front rail", [RT, RH, inner], [-e * (K / 2 - RT / 2), RY, BT + inner / 2], "wood");
      part(m, "rail2", "Front rail", [inner - RT, RH, RT], [(e * (RT - BT)) / 2, RY, K - RT / 2], "wood");
      const xa = e > 0 ? -K / 2 + RT : -K / 2 + BT, xb = e > 0 ? K / 2 - BT : K / 2 - RT;
      comp(m, "slats", "Slats", slats(xa, xb, BT, K - RT), "wood");
      part(m, "cush", "Corner seat cushion", [inner - 20, SEAT - LEG - RH, inner - 20], [-e * (BT / 2) + 0, (LEG + RH + SEAT) / 2, BT + inner / 2]);
      part(m, "bc0", "Back cushion", [inner - 30, TOP - SEAT, 220], [-e * (BT / 2), (SEAT + TOP) / 2, BT + 110]);
      part(m, "bc1", "Back cushion", [220, TOP - SEAT, inner - 250], [e * (K / 2 - BT - 110), (SEAT + TOP) / 2, BT + 220 + (inner - 220) / 2]);
      continue;
    }
    // the seat part of the frame, beside the armrest
    const sx0 = m.arm < 0 ? -m.w / 2 + AW : -m.w / 2, sx1 = m.arm > 0 ? m.w / 2 - AW : m.w / 2, cx = (sx0 + sx1) / 2;
    const len = m.depth - BT;
    part(m, "back", "Backrest", [SW, BH, BT], [cx, BY, BT / 2]);
    LR.forEach((e, i) => part(m, `side${i}`, m.kind === "chaise" ? "Long side rail" : "Side rail", [RT, RH, len], [e > 0 ? sx1 - RT / 2 : sx0 + RT / 2, RY, BT + len / 2], "wood"));
    part(m, "front", "Front rail", [SW - 2 * RT, RH, RT], [cx, RY, m.depth - RT / 2], "wood");
    if (m.kind === "chaise") {
      const zc = BT + (len - RT) / 2;
      part(m, "mid", "Centre rail", [SW - 2 * RT, RH, RT], [cx, RY, zc], "wood");
      comp(m, "slats", "Slats", slats(-SW / 2 + RT, SW / 2 - RT, BT, zc - RT / 2), "wood", cx);
      comp(m, "slats2", "Slats", slats(-SW / 2 + RT, SW / 2 - RT, zc + RT / 2, m.depth - RT), "wood", cx);
    } else comp(m, "slats", "Slats", slats(-SW / 2 + RT, SW / 2 - RT, BT, m.depth - RT), "wood", cx);
    if (m.arm) {
      const ad = Math.min(m.depth, D);
      part(m, "arm", "Armrest", [AW, ARMH, ad], [m.arm * (m.w / 2 - AW / 2), ARMY, ad / 2]);
      part(m, "acush", "Armrest cushion", [140, 400, 480], [m.arm * (m.w / 2 - AW - 70), SEAT + 200, BT + 330]);
    }
    part(m, "cush", m.kind === "chaise" ? "Chaise seat cushion" : "Seat cushion", [SW - 20, SEAT - LEG - RH, len - 10], [cx, (LEG + RH + SEAT) / 2, BT + len / 2]);
    part(m, "bc0", "Back cushion", [SW - 30, TOP - SEAT, 220], [cx, (SEAT + TOP) / 2, BT + 110]);
  }

  /* ---------- the legs: in each frame's corner fittings at the front, on joining plates at the back ---------- */
  interface Leg { at: Vec3; on: Mod; lp: Vec3; plate?: Mod[]; key?: string }
  const legs: Leg[] = [];
  const own = (m: Mod, lp: Vec3) => legs.push({ at: W(m, lp), on: m, lp });
  const backs: { at: Vec3; m: Mod; lp: Vec3 }[] = [];
  for (const m of mods) {
    if (m.kind === "corner") {
      own(m, [-m.side * (K / 2 - 60), LEG / 2, K - 60]);
      for (const lp of [[-K / 2 + 60, LEG / 2, 60], [K / 2 - 60, LEG / 2, 60], [m.side * (K / 2 - 60), LEG / 2, K - 60]] as Vec3[]) backs.push({ at: W(m, lp), m, lp });
      continue;
    }
    // a chaise's armrest stops short of its front, so its front legs go under the seat frame's own corners
    const fx = (e: -1 | 1) => (m.kind === "chaise" && e === m.arm ? e * (m.w / 2 - AW - 40) : e * (m.w / 2 - 60));
    for (const e of LR) own(m, [fx(e), LEG / 2, m.depth - 60]);
    if (m.kind === "chaise") own(m, [-m.arm * (m.w / 2 - 60) || m.w / 2 - 60, LEG / 2, D + 80]);
    for (const e of LR) backs.push({ at: W(m, [e * (m.w / 2 - 60), LEG / 2, 60]), m, lp: [e * (m.w / 2 - 60), LEG / 2, 60] });
  }
  // back corners of neighbouring frames share a joining plate and its leg
  const used = new Set<number>();
  backs.forEach((p, i) => {
    if (used.has(i)) return;
    const group = [p];
    backs.forEach((q, j) => {
      if (j > i && !used.has(j) && q.m !== p.m && Math.hypot(q.at[0] - p.at[0], q.at[2] - p.at[2]) < 200) {
        group.push(q);
        used.add(j);
      }
    });
    const at: Vec3 = [group.reduce((t, g) => t + g.at[0], 0) / group.length, LEG / 2, group.reduce((t, g) => t + g.at[2], 0) / group.length];
    legs.push({ at, on: p.m, lp: p.lp, plate: group.map((g) => g.m) });
  });
  const legType = b.part(lay.chrome ? "Leg, chrome" : "Leg", [56, LEG, 56], { shape: "cyl", material: legMat });
  for (const l of legs) l.key = b.place(legType, l.at);

  /* ---------- steps ---------- */
  const step = (o: { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] }, body: () => void = () => {}) =>
    b.step({ kind: "general", ...o, scene: o.scene ?? "main", warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
  const FR = "frames";
  // a point in a module's frame: in the finished product (fittings follow their part into any scene)
  const P = (m: Mod, lp: Vec3) => W(m, lp);
  const lay_ = (m: Mod, keys: string[], from?: Vec3) => {
    b.stagger(0.12);
    for (const k of keys) if (m.parts[k]) b.stage(m.parts[k], [m.off[0] + m.lp[k][0], m.lp[k][1], m.off[2] + m.lp[k][2]], [0, 0, 0], from);
    b.then(0.1);
  };
  const fit = (def: HwDef, list: FitOpts[], gap = 0.05) => {
    if (list.length) b.fits(def, list, gap);
    b.then(0.08);
  };
  const on = (m: Mod, key: string, lp: Vec3, d: Vec3, o: Partial<FitOpts> = {}): FitOpts => ({ on: m.parts[key], at: P(m, lp), dir: Wd(m, d), ...o });
  const frames = mods.filter((m) => m.kind !== "corner");
  const corner = mods.find((m) => m.kind === "corner");
  const armed = frames.filter((m) => m.arm);
  const chaises = frames.filter((m) => m.kind === "chaise");
  const many = mods.length > 1;
  const each = (one: string, all: string) => (frames.length > 1 ? all : one);
  const edges = (m: Mod) => {
    const sx0 = m.arm < 0 ? -m.w / 2 + AW : -m.w / 2, sx1 = m.arm > 0 ? m.w / 2 - AW : m.w / 2;
    return [sx0 + RT / 2, sx1 - RT / 2];
  };

  if (frames.length) {
    step({ title: each("Bolt the corner fittings onto the side rails", "Bolt the corner fittings onto the side rails of each frame"), detail: "Rails on the floor, the right way round. Two bolts with washers through each fitting, only loosely for now.", scene: FR, kind: "bolts", tools: ["allen"], warnings: ["floor", "loose"] }, () => {
      for (const m of frames) lay_(m, ["side0", "side1"], [0, 200, 0]);
      for (const m of frames) {
        const ex = edges(m);
        fit(FITTING, ex.map((x, i) => on(m, `side${i}`, [x, RY, m.depth - RT - 20], [0, 0, -1], { hole: false })));
        const pts = ex.flatMap((x, i) => [-40, 40].map((dy) => on(m, `side${i}`, [x + (i ? -1 : 1) * 32, RY + dy, m.depth - RT - 50], [i ? 1 : -1, 0, 0])));
        fit(WASH, pts.map((p) => ({ ...p, hole: false as const })));
        fit(LONG, pts);
      }
    });
    step({ title: each("Bolt the side rails to the backrest", "Bolt the side rails to each backrest"), detail: "Stand the backrest up, push the rails' ends against its sides and fit three bolts with washers on each side. Leave them loose.", scene: FR, kind: "bolts", tools: ["allen"], warnings: ["loose"] }, () => {
      for (const m of frames) lay_(m, ["back"], [0, 250, 0]);
      for (const m of frames) {
        const ex = edges(m);
        const pts = ex.flatMap((x, i) => [-45, 0, 45].map((dy) => on(m, "back", [x + (i ? -1 : 1) * 32, RY + dy, BT - 30], [i ? 1 : -1, 0, 0], { mate: m.parts[`side${i}`] })));
        fit(WASH, pts.map((p) => ({ ...p, hole: false as const, mate: undefined })));
        fit(LONG, pts);
      }
    });
    step({ title: each("Bolt the front rail across", "Bolt the front rails across"), detail: "Between the corner fittings, with the holes facing in. Two bolts with washers at each end.", scene: FR, kind: "bolts", tools: ["allen"], warnings: ["loose"] }, () => {
      for (const m of frames) lay_(m, ["front"], [0, 0, 250]);
      for (const m of frames) {
        const ex = edges(m);
        const pts = ex.flatMap((x) => [-40, 40].map((dy) => on(m, "front", [x, RY + dy, m.depth - RT - 20], [0, 0, 1])));
        fit(WASH, pts.map((p) => ({ ...p, hole: false as const })));
        fit(LONG, pts);
      }
    });
    if (chaises.length)
      step({ title: "Screw the centre rail into the chaise longue", detail: "Two brackets on the side rails with four screws each, then push the centre rail in between them.", scene: FR, kind: "screws", tools: ["screwdriver"] }, () => {
        for (const m of chaises) {
          lay_(m, ["mid"], [0, 200, 0]);
          const ex = edges(m), z = m.lp.mid[2];
          fit({ kind: "angle", len: 70, dia: 40, name: "Rail bracket" }, ex.map((x, i) => on(m, `side${i}`, [x + (i ? -1 : 1) * 30, RY, z], [i ? 1 : -1, 0, 0], { hole: false })));
          fit({ kind: "screw", len: 20, dia: 5 }, ex.flatMap((x, i) => [-50, -20, 20, 50].map((dz) => on(m, `side${i}`, [x + (i ? -1 : 1) * 30, RY + (dz > 0 ? 40 : -40), z + dz], [i ? 1 : -1, 0, 0]))));
        }
      });
    step({ title: each("Lay in the slats", "Lay the slats into each frame"), detail: "Unroll them with the curve up. Push both ends of each strap into the holders on the rails until they click.", scene: FR, kind: "slats" }, () => {
      for (const m of frames) {
        lay_(m, ["slats"], [0, 250, 0]);
        if (m.parts.slats2) lay_(m, ["slats2"], [0, 250, 0]);
        const ex = edges(m);
        const zs = m.parts.slats2 ? [BT + 40, m.lp.mid[2] - 60, m.lp.mid[2] + 60, m.depth - RT - 40] : [BT + 40, m.depth - RT - 40];
        fit(CLIP, ex.flatMap((x, i) => zs.map((z) => on(m, `side${i}`, [x + (i ? -1 : 1) * 30, LEG + RH - 6, z], [i ? 1 : -1, 0, 0], { hole: false }))));
      }
    });
  }
  if (armed.length) {
    step({ title: armed.length > 1 ? "Screw two hooks onto each armrest" : "Screw two hooks onto the armrest", detail: "Armrest on its outside on the floor. Two short bolts through each hook.", scene: FR, kind: "bolts", tools: ["allen"], warnings: ["floor"] }, () => {
      for (const m of armed) {
        b.stage(m.parts.arm, [m.off[0] + m.lp.arm[0] + m.arm * 450, m.lp.arm[1], m.off[2] + m.lp.arm[2]], [0, 0, 0], [0, 250, 0]);
        const x = m.arm * (m.w / 2 - AW);
        fit(HOOK, [180, 520].map((z) => on(m, "arm", [x, ARMY + 120, z], [m.arm, 0, 0], { hole: false })));
        fit(SHORT, [180, 520].flatMap((z) => [-20, 20].map((dz) => on(m, "arm", [x, ARMY + 120, z + dz], [m.arm, 0, 0]))));
      }
    });
    step({ title: "Screw the angle bracket under the armrest", detail: "Two short bolts, near the front.", scene: FR, kind: "bolts", tools: ["allen"] }, () => {
      for (const m of armed) {
        const x = m.arm * (m.w / 2 - AW / 2), z = Math.min(m.depth, D) - 200;
        fit(ABRK, [on(m, "arm", [x, LEG, z], [0, 1, 0], { hole: false })]);
        fit(SHORT, [-25, 25].map((dz) => on(m, "arm", [x, LEG, z + dz], [0, 1, 0])));
      }
    });
    step({ title: armed.length > 1 ? "Hang the armrests on the frames" : "Hang the armrest on the frame", detail: "Lift it against the side of the backrest and the side rail and drop the hooks into the slots.", scene: FR, kind: "join" }, () => {
      for (const m of armed) {
        b.stage(m.parts.arm, [m.off[0] + m.lp.arm[0], m.lp.arm[1], m.off[2] + m.lp.arm[2]], [0, 0, 0]);
      }
      b.then(0.1);
    });
    step({ title: "Bolt the bracket to the side rail", detail: "One bolt with a washer.", scene: FR, kind: "bolts", tools: ["allen"] }, () => {
      for (const m of armed) {
        const ex = edges(m), x = m.arm < 0 ? ex[0] : ex[1], z = Math.min(m.depth, D) - 200;
        fit(WASH, [on(m, `side${m.arm < 0 ? 0 : 1}`, [x - m.arm * 32, LEG + 20, z], [m.arm, 0, 0], { hole: false })]);
        fit(LONG, [on(m, `side${m.arm < 0 ? 0 : 1}`, [x - m.arm * 32, LEG + 20, z], [m.arm, 0, 0], { mate: m.parts.arm })]);
      }
    });
  }
  if (corner) {
    const m = corner, e = m.side;
    step({ title: "Screw two hooks onto the end of one corner backrest", detail: "Two short bolts through each.", scene: FR, kind: "bolts", tools: ["allen"] }, () => {
      lay_(m, ["back2"], [0, 250, 0]);
      fit(HOOK, [BY - 120, BY + 120].map((y) => on(m, "back2", [e * (K / 2 - BT / 2), y, BT], [0, 0, 1], { hole: false })));
      fit(SHORT, [BY - 120, BY + 120].flatMap((y) => [-20, 20].map((dx) => on(m, "back2", [e * (K / 2 - BT / 2) + dx, y, BT], [0, 0, 1]))));
    });
    step({ title: "Hook the two corner backrests together", detail: "Lift the one with the hooks and lower them into the slots in the other.", scene: FR, kind: "join", people: 2 }, () => lay_(m, ["back"], [0, 250, 0]));
    step({ title: "Bolt the corner fitting at the bottom", detail: "Turn the backrests over. Four bolts with washers through the fitting into both backrests, then four short bolts.", scene: FR, kind: "bolts", tools: ["allen"] }, () => {
      const p: Vec3 = [e * (K / 2 - BT - 20), LEG + 30, BT + 20];
      fit(FITTING, [on(m, "back", p, [0, 0, -1], { hole: false })]);
      const lp = [...[-30, 30].map((dx) => on(m, "back", [p[0] + dx, p[1], BT], [0, 0, -1])), ...[-30, 30].map((dz) => on(m, "back2", [e * (K / 2 - BT), p[1], BT + 40 + dz], [e, 0, 0]))];
      fit(WASH, lp.map((q) => ({ ...q, hole: false as const })));
      fit(LONG, lp);
      fit(SHORT, [-20, 20].flatMap((dx) => [-15, 15].map((dy) => on(m, "back", [p[0] + dx, p[1] + 45 + dy, BT], [0, 0, -1]))));
    });
    step({ title: "Bolt the two front rails on", detail: "Each rail's end against a backrest, then the two rails' ends together in the front corner. Three bolts with washers in the first, five in the second.", scene: FR, kind: "bolts", tools: ["allen"], warnings: ["loose"] }, () => {
      lay_(m, ["rail", "rail2"], [0, 200, 0]);
      const a = [-40, 0, 40].map((dy) => on(m, "rail", [-e * (K / 2 - RT / 2), RY + dy, BT], [0, 0, -1]));
      const c = [...[-40, 40].map((dy) => on(m, "rail2", [e * (K / 2 - BT), RY + dy, K - RT / 2], [e, 0, 0])), ...[-40, 0, 40].map((dy) => on(m, "rail2", [-e * (K / 2 - RT), RY + dy, K - RT / 2], [-e, 0, 0]))];
      fit(WASH, [...a, ...c].map((p) => ({ ...p, hole: false as const })));
      fit(LONG, [...a, ...c]);
    });
    step({ title: "Lay the slats into the corner frame", detail: "Curve up, strap ends clicked into the holders.", scene: FR, kind: "slats" }, () => {
      lay_(m, ["slats"], [0, 250, 0]);
      fit(CLIP, [BT + 40, K - RT - 40].flatMap((z) => [on(m, "rail", [-e * (K / 2 - RT), LEG + RH - 6, z], [-e, 0, 0], { hole: false }), on(m, "back2", [e * (K / 2 - BT), LEG + RH - 6, z], [e, 0, 0], { hole: false })]));
    });
  }
  step({ title: many ? "Turn the frames over and tighten every bolt" : "Turn the frame over and tighten every bolt", detail: "Stand each frame on its rails. Go round all the bolts with the Allen key until they're tight.", scene: FR, kind: "bolts", tools: ["allen"] });

  // covers, on each frame in turn
  const hasArm = armed.length > 0;
  step({ title: many ? "Pull the covers over the backrests" : "Pull the cover over the backrest", detail: "From the top down, smoothing out the corners, then stretch the base cover over the seat and fasten it underneath.", scene: FR, kind: "cushions" });
  if (hasArm) step({ title: armed.length > 1 ? "Pull the covers over the armrests" : "Pull the cover over the armrest", detail: "Inside out at the bottom, rolled down over it, then close the zips underneath.", scene: FR, kind: "cushions" });
  step({ title: "Zip the covers onto the cushions", detail: "Push each cushion into its cover corners first, then close the zip all the way round.", scene: FR, kind: "cushions" });

  // the legs and the joins
  const studStep = () =>
    step({ title: "Screw a stud into each leg", detail: "With the Allen key, until it stops. Stick the felt pads under them.", scene: "legs", kind: "legs", tools: ["allen"] }, () => {
      const n = legs.length;
      b.stagger(0.04);
      legs.forEach((l, i) => b.stage(l.key!, [(i - (n - 1) / 2) * 140, LEG / 2, 0], [0, 0, 0]));
      b.then(0.1);
      fit(STUD, legs.map((l) => ({ on: l.key!, at: [l.at[0], LEG + 2, l.at[2]] as Vec3, dir: [0, -1, 0] as Vec3, travel: 25 })), 0.03);
    });
  studStep();
  const straight = !corner;
  const pose: Pose = straight ? "+z" : "+y";
  const ownLegs = legs.filter((l) => !l.plate);
  const plateLegs = legs.filter((l) => l.plate);
  step({ title: straight ? (many ? "Lay the frames on their backs and screw in the front legs" : "Lay the frame on its back and screw in the front legs") : "Set out the frames and screw in their front legs", detail: straight ? "On a rug. A spacer on each stud, then the leg into the corner fitting, clockwise by hand." : "Tip each frame back to reach under it. A spacer on each stud, then the leg into the corner fitting, by hand.", pose, kind: "legs", warnings: ["floor", "hand"] }, () => {
    b.stagger(0.05);
    for (const m of mods) for (const k of ["back", "back2", "side0", "side1", "front", "mid", "rail", "rail2", "slats", "slats2", "arm"]) if (m.parts[k]) b.add(m.parts[k], straight ? [0, 0, 0] : undefined);
    b.then(0.2);
    fit(SPACER, ownLegs.map((l) => ({ on: l.key!, at: [l.at[0], LEG + 3, l.at[2]] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })));
    b.stagger(0.15);
    for (const l of ownLegs) b.add(l.key!, [0, -220, 0]);
    b.then(0.1);
  });
  if (plateLegs.length)
    step({ title: many ? "Join the frames with the plates and their back legs" : "Fit the plates and the back legs", detail: many ? "Screw a leg into each joining plate, then lay the plate across the back corners where two frames meet and screw it to both." : "Screw a leg into each joining plate and screw the plates under the back corners.", pose, kind: "join", tools: ["allen"] }, () => {
      for (const l of plateLegs) {
        const ms = l.plate!;
        const a: Vec3 = [l.at[0], LEG + 1, l.at[2]];
        fit(PLATE, [{ on: l.key!, at: a, dir: [0, 1, 0], hole: false }]);
        fit(PSCREW, ms.map((m) => ({ on: m.parts.back ?? m.parts.side0, at: [l.at[0] + (W(m, [0, 0, 0])[0] - l.at[0] > 0 ? 50 : -50) * (ms.length > 1 ? 1 : 0), LEG + 1, l.at[2] + (W(m, [0, 0, 0])[2] - l.at[2] > 0 ? 50 : -50) * (ms.length > 1 && m.yaw ? 1 : 0)] as Vec3, dir: [0, 1, 0] as Vec3 })));
        b.add(l.key!, [0, -220, 0]);
      }
    });
  if (lay.row && chaises.length) {
    // the clamp that holds a chaise longue to its neighbour at the front
    const m = chaises[0], nb = mods[mods.indexOf(m) + 1] ?? mods[mods.indexOf(m) - 1];
    if (nb)
      step({ title: "Clamp the chaise longue to its neighbour", detail: "Hook the clamp over both side rails at the front and tighten its wing screw by hand.", pose, kind: "join", warnings: ["hand"] }, () => {
        const x = (W(m, [m.w / 2, 0, 0])[0] + W(nb, [-nb.w / 2, 0, 0])[0]) / 2;
        fit({ kind: "clamp", len: 80, dia: 30, name: "Clamp" }, [{ on: m.parts.side1, at: [x, LEG + 10, W(m, [0, 0, D - 120])[2]], dir: [0, 1, 0], hole: false }]);
      });
  }
  step({ title: many || mods[0].kind === "chaise" ? "Stand it up together" : "Stand it up", detail: "Lift by the frame, not by the legs.", kind: "standup", people: many || mods[0].kind === "chaise" ? 2 : 1, warnings: many ? ["two"] : [] });
  step({ title: "Lay in the seat cushions and stand the back cushions against the backrest", detail: hasArm ? "The armrest cushion goes in last, leaning in the corner against the armrest." : "Plump them up and push them back into the corners.", kind: "cushions" }, () => {
    b.stagger(0.12);
    for (const m of mods) b.add(m.parts.cush, [0, 300, 0]);
    b.then(0.1);
    for (const m of mods) for (const k of ["bc0", "bc1"]) if (m.parts[k]) b.add(m.parts[k], Wd(m, [0, 150, 300]));
    b.then(0.1);
    for (const m of mods) if (m.parts.acush) b.add(m.parts.acush, Wd(m, [0, 200, 200]));
  });
  return true;
}

const family: Family = { names: ["UPPÅKRA", "UPPAKRA"], build };
export default family;
