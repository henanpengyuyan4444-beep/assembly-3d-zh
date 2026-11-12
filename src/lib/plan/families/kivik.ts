import type { Family } from "./family";
import type { Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";

/**
 * KIVIK, from IKEA's manuals. A sofa is a seat section with no legs of its own: its backrest is bolted down onto the
 * seat base, and it hangs between two armrests, each held on by four threaded rods with a washer and nut from inside
 * the section; the legs go under the armrests. A corner section stands on four legs and has U brackets on its two
 * open sides: a section gets a pin in its end and is lowered into them. A chaise longue stands on four legs and is
 * joined to the end of a sofa with a connecting rail and bar, two angle brackets and a clamp bracket. Every
 * combination starts from a finished sofa: an armrest comes off the end that meets a corner or the chaise and goes
 * on the far end of the corner's section or the outer side of the chaise. Fabric versions get their covers on as
 * they are built; the leather ones come covered, and their corner and chaise come in one piece.
 */

type Kind = "seat" | "arm" | "chaise" | "corner";
type Cell = "S2" | "S3" | "arm" | "chaise";
type Yaw = 0 | 1 | 3; // 1: front facing +x (a wing on the left), 3: front facing -x (a wing on the right)
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
  yaw: Yaw;
  f: 1 | -1; // a corner's backrest runs along its left side (1) or its right side (-1)
  recs: Rec[];
  legs: Rec[];
  cush: string[];
  backs: string[];
  k: Record<string, string>;
  kit?: "sofa" | "corner";
  corner?: Mod; // a corner section's own sofa section: the corner it comes with
}
interface Joint {
  kind: "arm" | "armc" | "hang" | "chaise";
  a: Mod; // the section (or chaise) whose end the joint is on
  b: Mod; // the armrest, corner or chaise on that end
  s: 1 | -1; // which end of a, in a's own frame
}

const D = 950, Z0 = -475, BT = 200, LEG = 50;
const ARM = 250, K = 950, CW = 900, CL = 1630, RG = 30;
const SEC = { S2: 1380, S3: 1780 };

const BOLT: HwDef = { kind: "bolt", len: 110, dia: 8, name: "Carriage bolt" };
const ROD: HwDef = { kind: "stud", len: 100, dia: 8, name: "Threaded rod" };
const NUT: HwDef = { kind: "nut", len: 6.5, dia: 8 };
const WASH: HwDef = { kind: "washer", len: 1.6, dia: 24 };
const HEX: HwDef = { kind: "bolt", len: 60, dia: 8, name: "Hex bolt" };
const CROD: HwDef = { kind: "stud", len: 80, dia: 8, name: "Threaded rod" };
const CONN: HwDef = { kind: "connector", len: 20, dia: 22, name: "Connector nut" };
const CSK: HwDef = { kind: "bolt", len: 30, dia: 6 };
const BRK: HwDef = { kind: "hook", len: 60, dia: 40, name: "U bracket" };
const PIN: HwDef = { kind: "stud", len: 120, dia: 12, name: "Hanging pin" };
const RBOLT: HwDef = { kind: "bolt", len: 50, dia: 8 };
const ASCREW: HwDef = { kind: "screw", len: 20, dia: 6 };
const TOOTH: HwDef = { kind: "washer", len: 1, dia: 17, name: "Lock washer" };
const ANG: HwDef = { kind: "angle", len: 80, dia: 40 };
const CLAMP: HwDef = { kind: "clamp", len: 60, dia: 30, name: "Clamp bracket" };
const STOP: HwDef = { kind: "foot", len: 15, dia: 30, name: "Lid stop" };

const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (m: Mod, v: Vec3): Vec3 =>
  m.yaw === 1 ? [m.ox + v[2], v[1], m.oz - v[0]] : m.yaw === 3 ? [m.ox - v[2], v[1], m.oz + v[0]] : [m.ox + v[0], v[1], m.oz + v[2]];
const Wd = (m: Mod, d: Vec3): Vec3 => (m.yaw === 1 ? [d[2], d[1], -d[0]] : m.yaw === 3 ? [-d[2], d[1], d[0]] : d);
const rotY = (m: Mod) => (m.yaw === 1 ? Math.PI / 2 : m.yaw === 3 ? -Math.PI / 2 : 0);

interface Layout {
  leather: boolean;
  row?: Cell[]; // a sofa, left to right
  back?: Cell[]; // to the right of the corner at the back left
  wingL?: Cell[]; // coming forward from that corner
  wingR?: Cell[]; // a second corner at the right end of `back`, with a wing coming forward from it
}

/** What the product is made of, from its name; null for the KIVIK products these manuals don't cover. */
function layout(s: ProductSpec): Layout | null {
  const v = s.variant.toLowerCase();
  // the Grann/Bomstad leather guides: their corner and chaise come in one piece and need no covers
  const leather = s.slug === "kivik-4-seat-sofa" || s.slug === "kivik-corner-sofa-6-seat" || /leather|grann|bomstad/.test(v);
  if (/^2-seat sofa$/.test(v)) return { leather, row: ["arm", "S2", "arm"] };
  if (/^3-seat sofa$/.test(v)) return { leather, row: ["arm", "S3", "arm"] };
  if (/^3-seat sofa with chaise/.test(v)) return { leather, row: ["arm", "S2", "chaise", "arm"] };
  // the leather "4-seat sofa" guide is the 4-seat sofa with chaise longue (163 cm deep)
  if (/^4-seat sofa with chaise/.test(v) || (/^4-seat sofa$/.test(v) && s.size.d > 120)) return { leather, row: ["arm", "S3", "chaise", "arm"] };
  if (/^corner section/.test(v)) return { leather, back: ["S2"], wingL: [] };
  if (/^corner sofa, 4-seat$/.test(v)) return { leather, back: ["S2", "arm"], wingL: ["S2", "arm"] };
  if (/^corner sofa, 5-seat$/.test(v)) return { leather, back: ["S2", "arm"], wingL: ["S3", "arm"] };
  if (/^corner sofa, 5-seat w/.test(v)) return { leather, back: ["S2", "chaise", "arm"], wingL: ["S2", "arm"] };
  if (/^corner sofa, 6-seat/.test(v)) return { leather, back: ["S3", "chaise", "arm"], wingL: ["S2", "arm"] };
  if (/^u-shaped sofa, 6/.test(v)) return { leather, back: ["S2"], wingL: ["S2", "arm"], wingR: ["S2", "arm"] };
  if (/^u-shaped sofa, 7/.test(v)) return { leather, back: ["S3"], wingL: ["S2", "arm"], wingR: ["S2", "arm"] };
  return null;
}

type StepOpts = { title: string; detail?: string; scene?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] };
const stepper = (b: PlanBuilder) => (o: StepOpts, body: () => void = () => {}) =>
  b.step({ kind: "general", ...o, scene: o.scene ?? "main", warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);

/** The ottoman: a padded box on four legs, its cover fastened inside the rim and underneath, and a loose lid. */
function ottoman(b: PlanBuilder, s: ProductSpec) {
  const step = stepper(b);
  const w = s.size.w * 10, h = s.size.h * 10, d = s.size.d * 10;
  const lt = 120;
  const box = b.place(b.part("Storage box", [w, h - lt - LEG, d], { material: "soft" }), [0, LEG + (h - lt - LEG) / 2, 0]);
  const lid = b.place(b.part("Padded lid", [w, lt, d], { material: "soft" }), [0, h - lt / 2, 0]);
  const legT = b.part("Leg", [55, LEG, 55], { material: "metal" });
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * (w / 2 - 60), z * (d / 2 - 60)]);
  const legs = pts.map(([x, z]) => b.place(legT, [x, LEG / 2, z]));
  step({ title: "Turn the box upside down and fit the legs", detail: "On something soft. Press each leg into its hole and turn it until it sits tight.", pose: "-y", kind: "legs", warnings: ["hand", "floor"] }, () => {
    b.add(box, [0, -200, 0]);
    b.then(0.1);
    b.stagger(0.2);
    for (const l of legs) b.add(l, [0, -200, 0], { spin: 1 });
  });
  step({ title: "Fasten the cover inside the top edge of the box", detail: "Stand the box up. Pull the cover over it and press the strip along the inside of the rim all the way round." });
  step({ title: "Turn it over and fasten the cover underneath", detail: "Pull the cover tight and fasten it round the bottom edge, around the legs.", pose: "-y", warnings: ["floor"] });
  step({ title: "Pull the cover over the lid", detail: "Work it over the corners first, then fasten it underneath.", scene: "lid" }, () => b.stage(lid, [0, lt / 2, 0], [0, 0, 0], [0, 200, 0]));
  const stops: FitOpts[] = pts.map(([x, z]) => ({ on: lid, at: [x * 0.92, h - lt, z * 0.92] as Vec3, dir: [0, 1, 0] as Vec3 }));
  step({ title: "Turn the lid over and screw in the four lid stops", detail: "One in each corner, by hand. They keep the lid in place on the box.", scene: "lid", pose: "-y", kind: "screws", warnings: ["hand"] }, () => b.fits(STOP, stops, 0.12));
  step({ title: "Lay the lid on the box", detail: "It just sits on top, so you can lift it off to reach inside.", kind: "cushions" }, () => b.add(lid, [0, 240, 0]));
  return true;
}

/** The 1-seat sofa-bed: the frame and its pull-out bed come in one piece; the manual is all cover and cushions. */
function sofaBed(b: PlanBuilder, s: ProductSpec) {
  const step = stepper(b);
  const w = s.size.w * 10, H = s.size.h * 10, d = s.size.d * 10;
  const z0 = -d / 2;
  const seatTop = (s.sofa?.seatH ?? 43) * 10;
  const bedTop = seatTop - 200;
  const backTop = 640;
  const frame = b.compound("Sofa-bed frame", [
    { shape: "box", size: [w, backTop - LEG, BT], pos: [0, (LEG + backTop) / 2, z0 + BT / 2] },
    { shape: "box", size: [w, 80, d - BT], pos: [0, LEG + 40, z0 + BT + (d - BT) / 2] },
  ], { material: "soft" });
  const fk = b.place(frame.type, frame.mid);
  const bedH = bedTop - LEG - 80;
  const bed = b.place(b.part("Pull-out bed", [w - 20, bedH, d - BT - 10], { material: "wood" }), [0, LEG + 80 + bedH / 2, z0 + BT + (d - BT) / 2 + 5]);
  const pad = b.place(b.part("Bed pad", [w - 30, 40, d - BT - 20], { material: "soft" }), [0, bedTop + 20, z0 + BT + (d - BT) / 2 + 5]);
  const mat = b.place(b.part("Folding mattress", [w - 10, seatTop - bedTop - 40, d - BT - 10], { material: "soft" }), [0, (bedTop + 40 + seatTop) / 2, z0 + BT + (d - BT) / 2 + 5]);
  const cushH = H - seatTop - 5;
  const back = b.place(b.part("Back cushion", [w - 12, cushH, 200], { material: "soft" }), [0, seatTop + cushH / 2, z0 + BT + 100]);
  const legT = b.part("Leg", [55, LEG, 55], { material: "metal" });
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b.place(legT, [x * (w / 2 - 60), LEG / 2, z * (d / 2 - 60)]));
  const out = 700;
  step({ title: "Pull the bed out of the frame", detail: "Pull it all the way out so you can reach every edge of the frame.", kind: "general" }, () => {
    b.add(fk);
    for (const l of legs) b.add(l);
    b.then(0.1);
    b.stage(bed, plus(b.partItem(bed).final.pos, [0, 0, out]), [0, 0, 0]);
  });
  step({ title: "Pull the cover down over the backrest", detail: "Seams on the edges. Fasten the two tabs under the back of the seat." });
  step({ title: "Fasten the cover along both sides", detail: "Press the strips onto the sides of the frame, smoothing out the fabric as you go." });
  step({ title: "Cover the front of the bed frame", detail: "Pull the cover over the front panel and fasten it underneath at both corners." });
  step({ title: "Lay the thin pad on the slats and slide it in", detail: "Push it back along the slats until it meets the backrest.", kind: "cushions" }, () => {
    b.stage(pad, plus(b.partItem(pad).final.pos, [0, 0, out]), [0, 0, 0], [0, 200, 0]);
  });
  step({ title: "Zip the cover onto the folding mattress", detail: "Push the mattress into the corners of the cover first, then close the zip." });
  step({ title: "Push the bed in and lay the mattress on the seat", detail: "Fold the mattress in half; it is the seat cushion. Zip faces the back.", kind: "cushions" }, () => {
    b.add(bed);
    b.add(pad);
    b.then(0.1);
    b.add(mat, [0, 300, 0]);
  });
  step({ title: "Fill the back cushion and stand it in place", detail: "Push the filling into the corners of the cover, zip it closed and lean it on the backrest.", kind: "cushions" }, () => b.add(back, [0, 160, 360]));
  return true;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  if (/^ottoman/i.test(s.variant)) return ottoman(b, s);
  if (/sofa-bed/i.test(s.variant)) return sofaBed(b, s);
  const lay = layout(s);
  if (!lay) return false;
  const leather = lay.leather;
  const step = stepper(b);
  const H = s.size.h * 10;
  const seatTop = (s.sofa?.seatH ?? 45) * 10;
  const baseTop = seatTop - 180;
  const backTop = 620, armH = 640;
  const cushH = H - seatTop - 5;
  const bh = backTop - baseTop;

  const mods: Mod[] = [];
  const joints: Joint[] = [];
  const legT = b.part("Leg", [55, LEG, 55], { material: "metal" });
  const types = new Map<string, string>();
  const typeOf = (name: string, size: Vec3, material: "soft" | "metal" = "soft") => {
    const id = `${name}|${size.map(Math.round).join("x")}`;
    if (!types.has(id)) types.set(id, b.part(name, size, { material }));
    return types.get(id)!;
  };
  const compounds = new Map<string, { type: string; mid: Vec3 }>();
  const put = (m: Mod, ref: string, lp: Vec3, list: Rec[] = m.recs) => {
    const key = b.place(ref, W(m, lp), [0, rotY(m), 0]);
    list.push({ key, lp });
    return key;
  };
  const leg = (m: Mod, x: number, z: number) => {
    put(m, legT, [x, LEG / 2, z], m.legs);
    m.recs.push(m.legs[m.legs.length - 1]);
  };
  const mod = (kind: Kind, w: number, ox: number, oz: number, yaw: Yaw, f: 1 | -1 = 1, seats = 2): Mod => {
    const m: Mod = { kind, w, n: seats, ox, oz, yaw, f, recs: [], legs: [], cush: [], backs: [], k: {} };
    mods.push(m);
    const cushion = (name: string, size: Vec3, lp: Vec3) => b.place(typeOf(name, size), W(m, lp), [0, rotY(m), 0]);
    const backCush = (name: string, size: Vec3, lp: Vec3) => m.backs.push(cushion(name, size, lp));
    if (kind === "seat") {
      m.k.base = put(m, typeOf("Seat base", [w, baseTop - LEG, D]), [0, (LEG + baseTop) / 2, 0]);
      m.k.back = put(m, typeOf("Backrest frame", [w, bh, BT]), [0, baseTop + bh / 2, Z0 + BT / 2]);
      const cw = w / m.n;
      for (let i = 0; i < m.n; i++) {
        const x = -w / 2 + cw * (i + 0.5);
        m.cush.push(cushion("Seat cushion", [cw - 8, 180, D - BT - 10], [x, baseTop + 90, Z0 + BT + (D - BT) / 2]));
        backCush("Back cushion", [cw - 12, cushH, 190], [x, seatTop + cushH / 2, Z0 + BT + 95]);
      }
    } else if (kind === "arm") {
      m.k.body = put(m, typeOf("Armrest", [ARM, armH - LEG, D]), [0, (LEG + armH) / 2, 0]);
      for (const z of [-(D / 2 - 90), D / 2 - 90]) leg(m, 0, z);
    } else if (kind === "chaise") {
      const frameP = { shape: "box" as const, size: [CW, baseTop - LEG, CL - BT] as Vec3, pos: [0, (LEG + baseTop) / 2, Z0 + BT + (CL - BT) / 2] as Vec3 };
      const backP = { shape: "box" as const, size: [CW, backTop - LEG, BT] as Vec3, pos: [0, (LEG + backTop) / 2, Z0 + BT / 2] as Vec3 };
      if (leather) {
        const c = compounds.get("chaise") ?? b.compound("Chaise longue frame", [frameP, backP], { material: "soft" });
        compounds.set("chaise", c);
        m.k.frame = m.k.back = put(m, c.type, c.mid);
      } else {
        m.k.frame = put(m, typeOf("Chaise seat base", frameP.size), frameP.pos);
        m.k.back = put(m, typeOf("Chaise backrest", backP.size), backP.pos);
      }
      for (const z of [Z0 + BT + 80, Z0 + CL - 80]) for (const x of [-(CW / 2 - 80), CW / 2 - 80]) leg(m, x, z);
      m.cush.push(cushion("Chaise seat cushion", [CW - 10, 180, CL - BT - 10], [0, baseTop + 90, Z0 + BT + (CL - BT) / 2]));
      backCush("Back cushion", [CW - 12, cushH, 190], [0, seatTop + cushH / 2, Z0 + BT + 95]);
    } else {
      // the corner: a square seat base with an L of backrest on it, along the back and one side
      const baseP = { shape: "box" as const, size: [K, baseTop - LEG, K] as Vec3, pos: [0, (LEG + baseTop) / 2, 0] as Vec3 };
      const aP = { shape: "box" as const, size: [K - BT, bh, BT] as Vec3, pos: [f * (BT / 2), baseTop + bh / 2, Z0 + BT / 2] as Vec3 };
      const bP = { shape: "box" as const, size: [BT, bh, K] as Vec3, pos: [f * (-K / 2 + BT / 2), baseTop + bh / 2, 0] as Vec3 };
      if (leather) {
        const key = `corner${f}`;
        const c = compounds.get(key) ?? b.compound("Corner section frame", [baseP, aP, bP], { material: "soft" });
        compounds.set(key, c);
        m.k.base = m.k.backA = m.k.backB = put(m, c.type, c.mid);
      } else {
        m.k.base = put(m, typeOf("Corner seat base", baseP.size), baseP.pos);
        m.k.backA = put(m, typeOf("Corner backrest half", aP.size), aP.pos);
        m.k.backB = put(m, typeOf("Corner backrest half", bP.size), bP.pos);
      }
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) leg(m, x * (K / 2 - 90), z * (K / 2 - 90));
      const bw = K - BT;
      m.cush.push(cushion("Corner seat cushion", [bw - 10, 180, bw - 10], [f * (BT / 2), baseTop + 90, Z0 + BT + bw / 2]));
      backCush("Corner back cushion", [bw - 4, cushH, 190], [f * (BT / 2), seatTop + cushH / 2, Z0 + BT + 95]);
      backCush("Corner back cushion", [190, cushH, bw - 194], [f * (-K / 2 + BT + 95), seatTop + cushH / 2, Z0 + BT + 190 + (bw - 190) / 2]);
    }
    return m;
  };

  // lay the modules out: a row from left to right, or a corner at the back left with a row to its right and a wing
  // coming forward from it (and for a U, a second corner at the end of the row with its own wing)
  const widthOf = (x: Cell) => (x === "arm" ? ARM : x === "chaise" ? CW + RG : SEC[x]);
  const chain = (list: Cell[], start: number, yaw: Yaw, first?: Mod) => {
    let c = start;
    let prev = first;
    for (const x of list) {
      const w = widthOf(x);
      const kind: Kind = x === "arm" ? "arm" : x === "chaise" ? "chaise" : "seat";
      const seats = x === "S3" && leather ? 3 : 2;
      // a chaise stands a rail's width away from the section it is joined to
      const mid = x === "chaise" ? c + RG + CW / 2 : c + w / 2;
      const m = yaw ? mod(kind, x === "chaise" ? CW : w, first!.ox, mid, yaw, 1, seats) : mod(kind, x === "chaise" ? CW : w, mid, 0, 0, 1, seats);
      c += w;
      if (prev) {
        const out: 1 | -1 = yaw === 1 ? -1 : 1; // which end of the earlier module the new one is on, in its own frame
        const back = (-out) as 1 | -1;
        if (prev.kind === "corner") joints.push({ kind: "hang", a: m, b: prev, s: back });
        else if (kind === "arm") joints.push({ kind: prev.kind === "chaise" ? "armc" : "arm", a: prev, b: m, s: out });
        else if (prev.kind === "arm") joints.push({ kind: "arm", a: m, b: prev, s: back });
        else if (kind === "chaise") joints.push({ kind: "chaise", a: prev, b: m, s: out });
      }
      prev = m;
    }
    return { end: c, last: prev };
  };
  const corners: Mod[] = [];
  if (lay.row) {
    const total = lay.row.reduce((t, x) => t + widthOf(x), 0);
    chain(lay.row, -total / 2, 0);
  } else {
    const cl = mod("corner", K, 0, 0, 0, 1);
    corners.push(cl);
    const r = chain(lay.back ?? [], K / 2, 0, cl);
    chain(lay.wingL ?? [], K / 2, 1, cl);
    if (lay.wingR) {
      const cr = mod("corner", K, r.end + K / 2, 0, 0, -1);
      corners.push(cr);
      joints.push({ kind: "hang", a: r.last!, b: cr, s: 1 });
      chain(lay.wingR, K / 2, 3, cr);
    }
  }
  // centre the whole sofa on the origin
  {
    const xs: number[] = [], zs: number[] = [];
    for (const m of mods) {
      const ext = m.kind === "chaise" ? CL : D;
      for (const v of [W(m, [-m.w / 2, 0, Z0]), W(m, [m.w / 2, 0, Z0 + ext])]) {
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
  const chaise = mods.find((m) => m.kind === "chaise");
  const armJ = joints.filter((j) => j.kind === "arm" || j.kind === "armc");
  const hangJ = joints.filter((j) => j.kind === "hang");
  const chJ = joints.find((j) => j.kind === "chaise");
  // which kit each section comes in: each corner brings one 2-seat section (the wing's, or the row's when the wing
  // is a 3-seat), and the rest is the sofa
  for (const c of corners) {
    const own = hangJ.filter((j) => j.b === c && SEC.S2 === j.a.w && !j.a.kit);
    const pick = own.find((j) => j.a.yaw !== 0) ?? own.find((j) => !hangJ.some((h) => h.a === j.a && h.b !== c)) ?? own[0];
    if (pick) {
      pick.a.kit = "corner";
      pick.a.corner = c;
    }
  }
  const sofa = seats.find((m) => !m.kit);
  if (sofa) sofa.kit = "sofa";
  const ckits = seats.filter((m) => m.kit === "corner");

  // the sofa's two armrests: one on each end while it is built, each moved later if that end meets a corner or the chaise
  const tempArm = new Map<Mod, 1 | -1>(); // armrest -> the end of the sofa it is first fitted to
  if (sofa) {
    for (const e of [-1, 1] as const) {
      const stay = armJ.find((j) => j.a === sofa && j.s === e);
      if (stay) {
        tempArm.set(stay.b, e);
        continue;
      }
      const h = hangJ.find((j) => j.a === sofa && j.s === e);
      const dest = h ? armJ.find((j) => j.a.kit === "corner" && j.a.corner === h.b) : chJ && chJ.a === sofa && chJ.s === e ? armJ.find((j) => j.kind === "armc") : undefined;
      if (dest) tempArm.set(dest.b, e);
    }
  }
  const armJoint = (arm: Mod) => armJ.find((j) => j.b === arm)!;
  const moved = (arm: Mod) => armJoint(arm).a !== sofa;

  const at = (m: Mod, lp: Vec3, d: Vec3, on: string, mate?: string, hole?: false): FitOpts => ({ on, at: W(m, lp), dir: Wd(m, d), mate, hole });
  const fit = (def: HwDef, list: FitOpts[], gap = 0.08) => b.fits(def, list, gap);

  /* ---------- where modules stand while they are built in their own scenes ---------- */
  const off = new Map<Mod, Vec3>();
  const stg = (recs: Rec[], o: Vec3, from?: Vec3) => {
    for (const r of recs) b.stage(r.key, plus(r.lp, o), [0, 0, 0], from);
  };
  const armOff = (arm: Mod, host: Mod, e: 1 | -1, aside = 0): Vec3 => plus(off.get(host) ?? [0, 0, 0], [e * (host.w / 2 + ARM / 2 + aside), 0, 0]);
  // an armrest still on the sofa's end in the finished room, before it is taken off
  const stageOnSofa = (arm: Mod, e: 1 | -1, aside = 0, from?: Vec3) => {
    for (const r of arm.recs) b.stage(r.key, W(sofa!, plus(r.lp, [e * (sofa!.w / 2 + ARM / 2 + aside), 0, 0])), [0, rotY(sofa!), 0], from);
  };

  /* ---------- fittings at each kind of joint ---------- */
  const partAt = (m: Mod, y: number, z: number) => (m.kind === "chaise" ? (z < Z0 + BT ? m.k.back : m.k.frame) : y > baseTop ? m.k.back : m.k.base);
  const rodPts = (j: Joint): Vec3[] => {
    const x = j.s * (j.a.w / 2);
    return [[x, LEG + 100, -330], [x, LEG + 100, 330], [x, baseTop + 100, Z0 + 100], [x, backTop - 90, Z0 + 100]];
  };
  const rods = (arm: Mod) => {
    const j = armJoint(arm);
    return rodPts(j).map((p) => ({ ...at(j.a, p, [-j.s, 0, 0], arm.k.body, partAt(j.a, p[1], p[2])), travel: 110, spin: 3 }));
  };
  const nuts = (arm: Mod) => {
    const j = armJoint(arm);
    const on = (p: Vec3) => (moved(arm) ? arm.k.body : partAt(j.a, p[1], p[2]));
    const pts = rodPts(j);
    fit(WASH, pts.map((p) => ({ ...at(j.a, [p[0] - j.s * 40, p[1], p[2]], [j.s, 0, 0], on(p)), hole: false as const })), 0.05);
    b.then(0.05);
    fit(NUT, pts.map((p) => ({ ...at(j.a, [p[0] - j.s * 44, p[1], p[2]], [j.s, 0, 0], on(p)), hole: false as const })), 0.07);
  };
  const boltX = (m: Mod) => [0, 1, 2, 3].map((i) => -m.w / 2 + (m.w * (i + 0.5)) / 4);
  const backBolts = (list: Mod[]) => {
    for (const m of list) fit(BOLT, boltX(m).map((x) => ({ ...at(m, [x, baseTop + 40, Z0 + BT / 2], [0, -1, 0], m.k.back, m.k.base), travel: 140 })), 0.1);
    b.then(0.1);
    for (const m of list) fit(WASH, boltX(m).map((x) => ({ ...at(m, [x, baseTop - 70, Z0 + BT / 2], [0, 1, 0], m.k.base), hole: false as const })), 0.05);
    b.then(0.05);
    for (const m of list) fit(NUT, boltX(m).map((x) => ({ ...at(m, [x, baseTop - 74, Z0 + BT / 2], [0, 1, 0], m.k.base), hole: false as const })), 0.06);
  };
  const sectionFrames = (list: Mod[], scene: string, many: boolean) => {
    step({ title: many ? "Bolt the backrests onto the seat bases" : "Bolt the backrest onto the seat base", detail: "Stand the backrest on the back of the base, push the four bolts down through it, and tighten a washer and nut onto each from underneath with the box spanner.", scene, kind: "bolts", tools: ["wrench"] }, () => {
      b.stagger(0.25);
      for (const m of list) {
        const recs = [m.recs.find((r) => r.key === m.k.base)!];
        if (scene === "main") b.add(recs[0].key, [0, 200, 0]);
        else stg(recs, off.get(m)!, [0, 200, 0]);
      }
      b.then(0.1);
      for (const m of list) {
        const r = m.recs.find((x) => x.key === m.k.back)!;
        if (scene === "main") b.add(r.key, [0, 380, 0]);
        else stg([r], off.get(m)!, [0, 380, 0]);
      }
      b.then(0.15);
      backBolts(list);
    });
    if (!leather) {
      step({ title: many ? "Pull the covers over the frames" : "Pull the cover over the frame", detail: "Over the backrest first, then down over the front of the seat. Seams sit on the edges; smooth out the creases.", scene });
      step({ title: "Tip it onto its back and fasten the cover underneath", detail: "Press the strips along the bottom edges so the cover sits tight.", scene, pose: "+z", warnings: ["floor"] });
    }
  };

  /* ---------- the sofa ---------- */
  const rowOnly = !!lay.row && !chaise;
  if (sofa) {
    const sc = rowOnly ? "main" : "sofa";
    off.set(sofa, [0, 0, 0]);
    const arms = [...tempArm.keys()];
    const showArm = (arm: Mod, recs: Rec[], aside: number, from?: Vec3) => {
      const e = tempArm.get(arm)!;
      if (sc === "main" && !aside) for (const r of recs) b.add(r.key, from);
      else if (sc === "main") for (const r of recs) b.stage(r.key, W(sofa, plus(r.lp, [e * (sofa.w / 2 + ARM / 2 + aside), 0, 0])), [0, rotY(sofa), 0], from);
      else stg(recs, armOff(arm, sofa, e, aside), from);
    };
    const body = (arm: Mod) => arm.recs.filter((r) => r.key === arm.k.body);
    sectionFrames([sofa], sc, false);
    if (!leather) {
      step({ title: "Pull the covers onto both armrests", detail: "Pull each cover down evenly, fasten it inside the top, then turn the armrest over and fasten it underneath.", scene: sc }, () => {
        b.stagger(0.3);
        for (const a of arms) showArm(a, body(a), 500, [0, 250, 0]);
      });
    }
    step({ title: "Screw four rods into each armrest", detail: "Into the holes on the inner side, by hand until they stop.", scene: sc, kind: "bolts", warnings: ["hand"] }, () => {
      if (leather) {
        b.stagger(0.3);
        for (const a of arms) showArm(a, body(a), 500, [0, 250, 0]);
        b.then(0.1);
      }
      for (const a of arms) fit(ROD, rods(a), 0.1);
    });
    step({ title: "Push the armrests onto the ends of the sofa", detail: "Guide the rods through the holes in the frame until the armrest sits tight against it.", scene: sc, kind: "join" }, () => {
      b.stagger(0.35);
      for (const a of arms) showArm(a, body(a), 0, [tempArm.get(a)! * 400, 0, 0]);
    });
    step({ title: "Tighten a washer and a nut onto each rod", detail: "From inside the frame, with the box spanner. Tighten them all firmly.", scene: sc, kind: "bolts", tools: ["wrench"] }, () => {
      for (const a of arms) nuts(a);
    });
    step({ title: "Tip it onto its back and fit the four legs", detail: "Lift it together. Press each leg into its hole under an armrest and turn it until it sits tight.", scene: sc, pose: "+z", kind: "legs", people: 2, warnings: ["two", "hand"] }, () => {
      b.stagger(0.2);
      for (const a of arms) showArm(a, a.legs, 0, [0, -200, 0]);
    });
  }

  /* ---------- the corner sections ---------- */
  if (corners.length) {
    // the corners stand side by side in one scene, their own sofa sections in another
    const lineUp = (list: Mod[], gap: number) => {
      let x = 0;
      for (const m of list) {
        off.set(m, [x + m.w / 2, 0, 0]);
        x += m.w + gap;
      }
      for (const m of list) off.set(m, plus(off.get(m)!, [-(x - gap) / 2, 0, 0]));
    };
    lineUp(corners, 500);
    lineUp(ckits, ARM * 2 + 600);
    const cs = "corner";
    const two = corners.length > 1;
    const rec = (m: Mod, key: string) => m.recs.find((r) => r.key === key)!;
    if (!leather) {
      const joint = (c: Mod): Vec3 => [c.f * (-K / 2 + BT), baseTop + bh / 2, Z0 + BT / 2];
      step({ title: two ? "Fix a connector to one half of each corner backrest" : "Fix the connector to one backrest half", detail: "Screw the connector nut onto the rod by hand, then put the washer on and screw it into the end of the half with the Allen key.", scene: cs, kind: "bolts", tools: ["allen"] }, () => {
        b.stagger(0.3);
        for (const c of corners) stg([rec(c, c.k.backA)], plus(off.get(c)!, [0, -baseTop + LEG, 300]), [0, 200, 0]);
        b.then(0.15);
        for (const c of corners) {
          const p = joint(c);
          fit(WASH, [{ ...at(c, p, [-c.f, 0, 0], c.k.backA), hole: false }]);
          fit(CROD, [{ ...at(c, p, [c.f, 0, 0], c.k.backA, c.k.backB), travel: 90, spin: 3 }]);
          fit(CONN, [{ ...at(c, [p[0] - c.f * 40, p[1], p[2]], [c.f, 0, 0], c.k.backA), hole: false, spin: 2 }]);
        }
      });
      step({ title: "Hook the other half onto the connector", detail: "Push its slot over the connector's head and slide it down until it locks.", scene: cs, kind: "join" }, () => {
        b.stagger(0.3);
        for (const c of corners) stg([rec(c, c.k.backB)], plus(off.get(c)!, [0, -baseTop + LEG, 300]), [-c.f * 300, 0, 0]);
      });
      step({ title: "Turn the backrest over and lower the seat base onto it", detail: "Upside down on something soft. The base drops in between the two halves.", scene: cs, pose: "-y", kind: "join", warnings: ["floor"] }, () => {
        b.stagger(0.3);
        for (const c of corners) stg([rec(c, c.k.backA), rec(c, c.k.backB)], off.get(c)!);
        b.then(0.1);
        for (const c of corners) stg([rec(c, c.k.base)], off.get(c)!, [0, -300, 0]);
      });
      step({ title: "Bolt the base to the backrest", detail: "Four bolts with a washer each, through the base into the backrest, tightened with the box spanner.", scene: cs, pose: "-y", kind: "bolts", tools: ["wrench"] }, () => {
        for (const c of corners) {
          const bw = K - BT;
          const pts: [Vec3, string][] = [
            [[c.f * (-K / 2 + BT + bw * 0.3), baseTop - 30, Z0 + BT / 2], c.k.backA],
            [[c.f * (-K / 2 + BT + bw * 0.8), baseTop - 30, Z0 + BT / 2], c.k.backA],
            [[c.f * (-K / 2 + BT / 2), baseTop - 30, Z0 + BT + bw * 0.35], c.k.backB],
            [[c.f * (-K / 2 + BT / 2), baseTop - 30, Z0 + BT + bw * 0.85], c.k.backB],
          ];
          fit(WASH, pts.map(([p]) => ({ ...at(c, [p[0], p[1] - 4, p[2]], [0, 1, 0], c.k.base), hole: false as const })), 0.05);
          b.then(0.05);
          fit(HEX, pts.map(([p, mate]) => ({ ...at(c, p, [0, 1, 0], c.k.base, mate), travel: 80 })), 0.1);
        }
      });
    }
    step({ title: leather ? (two ? "Turn the corner sections upside down and fit the legs" : "Turn the corner section upside down and fit the legs") : "Fit the four legs", detail: "Press each leg into its hole and turn it until it sits tight.", scene: cs, pose: "-y", kind: "legs", warnings: ["hand", "floor"] }, () => {
      if (leather) {
        b.stagger(0.3);
        for (const c of corners) stg([rec(c, c.k.base)], off.get(c)!, [0, -300, 0]);
        b.then(0.1);
      }
      b.stagger(0.18);
      for (const c of corners) stg(c.legs, off.get(c)!, [0, -200, 0]);
    });
    // the U brackets on the two open sides: the end face toward the row, and the front face toward the wing
    const sides = (c: Mod) => [
      { p: (t: number, y: number): Vec3 => [c.f * (K / 2), y, t], d: [-c.f, 0, 0] as Vec3 },
      { p: (t: number, y: number): Vec3 => [c.f * t, y, K / 2], d: [0, 0, -1] as Vec3 },
    ];
    const brk = (c: Mod, pts: Vec3[], ds: Vec3[], twist: number) => {
      fit(BRK, pts.map((p, i) => ({ ...at(c, p, ds[i], c.k.base), hole: false as const, twist })), 0.12);
      b.then(0.08);
      fit(CSK, pts.map((p, i) => ({ ...at(c, [p[0] - ds[i][0] * 4, p[1], p[2] - ds[i][2] * 4], ds[i], c.k.base), travel: 40 })), 0.1);
    };
    step({ title: "Turn it over and screw on two brackets, hooks down", detail: "One near the front of each open side, with the Allen key.", scene: cs, kind: "screws", tools: ["allen"] }, () => {
      for (const c of corners) {
        const sd = sides(c);
        brk(c, sd.map((q) => q.p(K / 2 - 140, baseTop - 70)), sd.map((q) => q.d), -Math.PI / 2);
      }
    });
    step({ title: "Screw on four more brackets, hooks up", detail: "Two low down on each open side. The sections hang in these.", scene: cs, kind: "screws", tools: ["allen"] }, () => {
      for (const c of corners) {
        const sd = sides(c);
        const pts = sd.flatMap((q) => [q.p(-200, LEG + 70), q.p(220, LEG + 70)]);
        brk(c, pts, sd.flatMap((q) => [q.d, q.d]), Math.PI / 2);
      }
    });
    if (!leather) {
      step({ title: two ? "Pull the covers over the corner sections" : "Pull the cover over the corner section", detail: "Over the backrest first, working it into the inside corner, then down over the seat edge.", scene: cs });
      step({ title: "Fasten the cover all round the base", detail: "Press the strips under the seat edge and around the brackets so the cover sits tight.", scene: cs });
    }
    if (ckits.length) sectionFrames(ckits, "sections", ckits.length > 1);
  }

  /* ---------- an armrest moves from the sofa to each corner's section ---------- */
  const toCkit = [...tempArm.keys()].filter((a) => armJoint(a).a.kit === "corner");
  if (toCkit.length) {
    step({ title: toCkit.length > 1 ? "Take both armrests off the sofa" : "Take an armrest off the sofa", detail: "The one on the end that meets the corner. Undo the nuts with the box spanner and keep them with their washers.", scene: "sofa", kind: "general", tools: ["wrench"] }, () => {
      b.stagger(0.3);
      for (const a of toCkit) stg(a.recs, armOff(a, sofa!, tempArm.get(a)!, 600), [0, 0, 0]);
    });
    step({ title: toCkit.length > 1 ? "Fit them onto the corner sections' sofa sections" : "Fit it onto the corner section's sofa section", detail: "On the open end, the same way: rods through the frame, then the same washers and nuts, tightened with the box spanner.", scene: "sections", kind: "join", tools: ["wrench"] }, () => {
      b.stagger(0.3);
      for (const a of toCkit) {
        const j = armJoint(a);
        stg(a.recs, armOff(a, j.a, j.s), [j.s * 400, 0, 0]);
      }
    });
  }

  /* ---------- the sections hang on the corners ---------- */
  const pin = (m: Mod) => {
    for (const j of hangJ.filter((h) => h.a === m)) {
      const mate = j.a.yaw === 0 ? j.b.k.backA : j.b.k.backB;
      fit(PIN, [{ ...at(m, [j.s * (m.w / 2), backTop - 120, Z0 + BT / 2], [-j.s, 0, 0], m.k.back, mate), travel: 70 }]);
    }
  };
  const chaiseArm = chaise ? armJ.find((j) => j.kind === "armc")!.b : undefined;
  if (corners.length) {
    step({ title: corners.length > 1 ? "Stand the two corner sections where the sofa will go" : "Stand the corner section where the sofa will go", detail: corners.length > 1 ? "Leave the sofa's length between them, and room behind to walk round." : "Leave room behind it to walk round while you hang the sections on.", kind: "join" }, () => {
      b.stagger(0.3);
      for (const c of corners) for (const r of c.recs) b.add(r.key, [0, 250, 0]);
    });
    for (const m of ckits) {
      const arm = toCkit.find((a) => armJoint(a).a === m);
      step({ title: "Push a pin into the section's end and hang it on the corner", detail: "One of you at each end. Lift it, lower the pin into the slot in the corner's side and let the frame drop into the brackets.", kind: "join", people: 2 }, () => {
        for (const r of m.recs) b.add(r.key, [0, 300, 0]);
        if (arm) for (const r of arm.recs) b.add(r.key, [0, 300, 0]);
        b.then(0.15);
        pin(m);
      });
    }
    if (sofa) {
      const hasChaiseArm = chaiseArm && tempArm.has(chaiseArm) && moved(chaiseArm);
      step({ title: hangJ.filter((j) => j.a === sofa).length > 1 ? "Push a pin into each end of the sofa and hang it between the corners" : "Push a pin into the sofa's end and hang it on the corner", detail: "Lift it together and lower the pin into the slot, the same way as the first section.", kind: "join", people: 2 }, () => {
        for (const r of sofa.recs) b.add(r.key, [0, 300, 0]);
        for (const [a] of tempArm) if (!moved(a)) for (const r of a.recs) b.add(r.key, [0, 300, 0]);
        if (hasChaiseArm) stageOnSofa(chaiseArm!, tempArm.get(chaiseArm!)!, 0, [0, 300, 0]);
        b.then(0.15);
        pin(sofa);
      });
    }
  }

  /* ---------- the chaise longue ---------- */
  if (chaise && chJ) {
    const c = chaise, sec = chJ.a, e = chJ.s;
    const cs = "chaise";
    off.set(c, [0, 0, -CL / 2 - Z0]);
    const frameRec = c.recs.find((r) => r.key === c.k.frame)!;
    const backRec = c.recs.find((r) => r.key === c.k.back)!;
    step({ title: "Turn the chaise upside down and fit the four legs", detail: "On something soft. Press each leg into its hole and turn it until it sits tight.", scene: cs, pose: "-y", kind: "legs", warnings: ["hand", "floor"] }, () => {
      stg([frameRec], off.get(c)!, [0, -300, 0]);
      b.then(0.1);
      b.stagger(0.18);
      stg(c.legs, off.get(c)!, [0, -200, 0]);
    });
    if (!leather) {
      const bp: Vec3[] = [[-(CW / 2 - 120), LEG + 70, Z0 + BT], [CW / 2 - 120, baseTop - 50, Z0 + BT]];
      step({ title: "Bolt the backrest onto the end of the frame", detail: "Two bolts with a washer each, from inside the frame, tightened with the box spanner.", scene: cs, pose: "-y", kind: "bolts", tools: ["wrench"] }, () => {
        stg([backRec], off.get(c)!, [0, 0, -300]);
        b.then(0.15);
        fit(WASH, bp.map((p) => ({ ...at(c, [p[0], p[1], p[2] + 40], [0, 0, -1], c.k.frame), hole: false as const })), 0.08);
        b.then(0.05);
        fit(HEX, bp.map((p) => ({ ...at(c, [p[0], p[1], p[2] + 42], [0, 0, -1], c.k.frame, c.k.back), travel: 90 })), 0.12);
      });
      step({ title: "Pull the cover over the chaise", detail: "Over the backrest first, then along the seat to the front. Seams sit on the edges.", scene: cs });
      step({ title: "Turn it over and fasten the cover underneath", detail: "Press the strips along the bottom edges all the way round.", scene: cs, pose: "-y", warnings: ["floor"] });
    }
    // the armrest on the sofa's end where the chaise goes comes off; it goes on the chaise's outer side at the end
    const sofaSc = corners.length ? "main" : "sofa";
    const armOff2 = chaiseArm && tempArm.has(chaiseArm) ? tempArm.get(chaiseArm)! : undefined;
    step({ title: "Take the armrest off the end where the chaise goes", detail: "Undo the four nuts with the box spanner and keep them with their washers. The armrest goes back on beside the chaise later.", scene: sofaSc, tools: ["wrench"] }, () => {
      if (chaiseArm && armOff2) {
        if (sofaSc === "main") stageOnSofa(chaiseArm, armOff2, 1300);
        else stg(chaiseArm.recs, armOff(chaiseArm, sofa!, armOff2, 1300));
      }
    });
    // the rail stands against the sofa's end at the front, the bar runs along the bottom of it
    const xj = e * (sec.w / 2 + RG / 2);
    const railLp: Vec3 = [xj, (LEG + baseTop) / 2, D / 2 - 150];
    const barLp: Vec3 = [xj, LEG + 25, 0];
    const rail = { key: b.place(typeOf("Connecting rail", [RG, baseTop - LEG, 40], "metal"), W(sec, railLp), [0, rotY(sec), 0]), lp: railLp };
    const bar = { key: b.place(typeOf("Connecting bar", [RG, 50, D - 300], "metal"), W(sec, barLp), [0, rotY(sec), 0]), lp: barLp };
    const showOnSec = (r: Rec, from: Vec3) => {
      if (sofaSc === "main") b.add(r.key, from);
      else stg([r], off.get(sofa!)!, from);
    };
    step({ title: "Bolt the connecting rail to the end of the sofa", detail: "Upright, at the front of the end. Screw the bolt in with the Allen key, then a washer and nut inside the frame with the box spanner.", scene: sofaSc, kind: "bolts", tools: ["allen", "wrench"] }, () => {
      showOnSec(rail, [e * 300, 0, 0]);
      b.then(0.15);
      const p: Vec3 = [e * (sec.w / 2), baseTop - 60, D / 2 - 150];
      fit(RBOLT, [{ ...at(sec, [xj, p[1], p[2]], [-e, 0, 0], rail.key, sec.k.base), travel: 60 }]);
      b.then(0.05);
      fit(WASH, [{ ...at(sec, [p[0] - e * 40, p[1], p[2]], [e, 0, 0], sec.k.base), hole: false }]);
      fit(NUT, [{ ...at(sec, [p[0] - e * 44, p[1], p[2]], [e, 0, 0], sec.k.base), hole: false }]);
    });
    step({ title: "Screw the connecting bar along the bottom of the end", detail: "Three bolts with the Allen key. Check the bar's holes line up before you tighten them.", scene: sofaSc, kind: "bolts", tools: ["allen"] }, () => {
      showOnSec(bar, [e * 300, -100, 0]);
      b.then(0.15);
      fit(RBOLT, [-300, 0, 300].map((z) => ({ ...at(sec, [xj, LEG + 25, z], [-e, 0, 0], bar.key, sec.k.base), travel: 60 })), 0.12);
    });
    // on the chaise's side that meets the sofa
    const cx = -e * (CW / 2);
    const angZ = [-260, 260];
    step({ title: "Stand the chaise on its back end and screw on the angle brackets", detail: "Low down on the side that meets the sofa, two screws each with the Allen key.", scene: cs, pose: "+z", kind: "screws", tools: ["allen"] }, () => {
      fit(ANG, angZ.map((z) => ({ ...at(c, [cx, LEG + 25, z], [e, 0, 0], c.k.frame), hole: false as const })), 0.15);
      b.then(0.1);
      fit(ASCREW, angZ.flatMap((z) => [-40, 40].map((dz) => at(c, [cx, LEG + 60, z + dz], [e, 0, 0], c.k.frame))), 0.08);
    });
    step({ title: "Hook the chaise onto the end of the sofa", detail: "Two of you, the chaise still on its back end. Hook the clamp bracket over the rail and let the angle brackets meet the bar.", kind: "join", people: 2 }, () => {
      if (sofaSc !== "main") {
        for (const r of sofa!.recs) b.add(r.key);
        for (const [a] of tempArm) if (!moved(a)) for (const r of a.recs) b.add(r.key);
        b.add(rail.key);
        b.add(bar.key);
      }
      b.then(0.1);
      for (const r of c.recs) b.add(r.key, Wd(sec, [e * 500, 300, 0]));
      b.then(0.15);
      fit(CLAMP, [{ ...at(c, [cx, baseTop - 60, D / 2 - 150], [e, 0, 0], c.k.frame), hole: false }]);
    });
    const tie = (z: number) => {
      const pts = [z - 40, z + 40];
      fit(TOOTH, pts.map((q) => ({ ...at(c, [cx + e * 6, LEG + 25, q], [-e, 0, 0], c.k.frame), hole: false as const })), 0.06);
      b.then(0.05);
      fit(HEX, pts.map((q) => ({ ...at(c, [cx + e * 8, LEG + 25, q], [-e, 0, 0], c.k.frame, bar.key), travel: 70 })), 0.1);
      b.then(0.05);
      fit(WASH, pts.map((q) => ({ ...at(sec, [e * (sec.w / 2 + 4), LEG + 25, q], [e, 0, 0], bar.key), hole: false as const })), 0.06);
      fit(NUT, pts.map((q) => ({ ...at(sec, [e * (sec.w / 2 + 6), LEG + 25, q], [e, 0, 0], bar.key), hole: false as const })), 0.06);
    };
    step({ title: "Bolt the front bracket to the bar", detail: "Two bolts, each with a lock washer, through the bracket and the bar. A washer and nut on the other side, with the box spanner.", kind: "bolts", tools: ["wrench"] }, () => tie(angZ[1]));
    step({ title: "Bolt the back bracket the same way", detail: "Check the clamp bracket is hooked right down on the rail first.", kind: "bolts", tools: ["wrench"] }, () => tie(angZ[0]));
    step({ title: "Tip the chaise down onto its legs", detail: "Together, slowly, so the joint to the sofa takes no knocks.", kind: "join", people: 2 });
    if (chaiseArm) {
      step({ title: "Fit the armrest onto the chaise's outer side", detail: "The one you took off the sofa: rods through the frame, then the same washers and nuts, tightened with the box spanner.", kind: "join", tools: ["wrench"] }, () => {
        const j = armJoint(chaiseArm);
        for (const r of chaiseArm.recs) b.add(r.key, Wd(c, [j.s * 400, 0, 0]));
      });
    }
  }

  /* ---------- cushions ---------- */
  const cush = mods.flatMap((m) => m.cush);
  const backs = mods.flatMap((m) => m.backs);
  step({ title: leather ? "Lay the seat cushions in" : "Zip the covers onto the seat cushions and lay them in", detail: leather ? "Zips face the back." : "Push each cushion into the corners of its cover, close the zip, and lay it in with the zip at the back.", kind: "cushions" }, () => {
    b.stagger(0.15);
    for (const k of cush) b.add(k, [0, 320, 0]);
  });
  step({ title: leather ? "Stand the back cushions in place" : "Fill the back cushions and stand them in place", detail: leather ? "Lean each one against the backrest and plump it up." : "Push the filling into the corners of each cover, zip it closed, then lean it on the backrest.", kind: "cushions" }, () => {
    b.stagger(0.15);
    for (const k of backs) b.add(k, [0, 160, 360]);
  });
  return true;
}

const family: Family = { names: ["KIVIK"], build };
export default family;
