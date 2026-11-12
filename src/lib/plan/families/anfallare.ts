import type { Family } from "./family";
import type { PartMaterial, PartPiece, ProductSpec, StepKind, ToolId, Vec3, WarnId, Pose } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";
import { carcassA, carcassParts, drawerParts, drawerSteps, drawersIn, slotsOf, stepper, type Unit } from "./alex";

/*
 * ANFALLARE bamboo tops, read from the manuals of what each top stands on (the top comes ready drilled).
 *   ADILS and OLOV: a round plate screwed under the upside-down top with five screws, the leg turned into it.
 *   KRILLE: a castor screwed into each leg with the spanner, then the leg's own plate screwed under the top.
 *   HILVER: each bamboo leg has its own mounting block; five screws through it into the upside-down top.
 *   ALEX: one drawer unit at the left, built as the ALEX manual (and alex.ts) builds it, two ADILS legs at the
 *   right; the top is set on it and screwed up through the ALEX top with four screws, then the drawers go in.
 * The legs and ALEX parts are drawn the way lagkapten.ts draws them, so the same legs look the same everywhere.
 */

type Leg = "adils" | "olov" | "krille" | "hilver";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const TT = 25; // ANFALLARE top

const SCREW_TOP: HwDef = { kind: "screw", len: 20, dia: 4 };
const PLATE: HwDef = { kind: "plate", len: 4, dia: 90 };
const fivePoints = (x: number, y: number, z: number, r: number): Vec3[] => [[x, y, z], ...range(4).map((i) => [x + r * Math.cos((i * Math.PI) / 2 + Math.PI / 4), y, z + r * Math.sin((i * Math.PI) / 2 + Math.PI / 4)] as Vec3)];

interface StepIn {
  title: string;
  detail?: string;
  tools?: ToolId[];
  people?: 1 | 2;
  pose?: Pose;
  warnings?: WarnId[];
  kind?: StepKind;
  repeat?: number;
}

/** Parts placed where they end up, then steps that bring them in and fit the hardware. */
class Kit {
  private keys = new Map<string, string>();
  private boxes = new Map<string, { pos: Vec3; size: Vec3 }>();
  private types = new Map<string, string>();
  private pose: Pose = "+y";
  constructor(public b: PlanBuilder) {}

  part(id: string, name: string, size: Vec3, pos: Vec3, o: { mat?: PartMaterial; shape?: "box" | "cyl"; pieces?: PartPiece[] } = {}) {
    const tk = [name, size.map(Math.round).join("x"), o.shape ?? "box", o.mat ?? "board", o.pieces ? JSON.stringify(o.pieces) : ""].join("|");
    let t = this.types.get(tk);
    if (!t) {
      t = this.b.part(name, size, { shape: o.shape ?? "box", material: o.mat ?? "board" });
      if (o.pieces) this.b.parts[this.b.parts.length - 1].pieces = o.pieces;
      this.types.set(tk, t);
    }
    this.keys.set(id, this.b.place(t, pos));
    this.boxes.set(id, { pos, size });
  }
  key(id: string) {
    const k = this.keys.get(id);
    if (!k) throw new Error(`ANFALLARE: no part ${id}`);
    return k;
  }
  pos(id: string) {
    return this.boxes.get(id)!.pos;
  }
  step(s: StepIn, body: () => void) {
    if (s.pose) this.pose = s.pose;
    const warnings = new Set<WarnId>(s.warnings ?? []);
    if (s.people === 2) warnings.add("two");
    this.b.step({ title: s.title, detail: s.detail, tools: s.tools ?? [], people: s.people ?? 1, pose: this.pose, warnings: [...warnings].slice(0, 3), kind: s.kind ?? "general", repeat: s.repeat }, body);
  }
  add(ids: string[], from?: Vec3, spin?: number) {
    this.b.stagger(ids.length > 4 ? 0.14 : 0.24);
    for (const id of ids) this.b.add(this.key(id), from, spin ? { spin } : {});
    this.b.then(0.12);
  }
  fit(def: HwDef, pts: Vec3[], dir: Vec3, on?: string, o: { mate?: string; hole?: false; spin?: number } = {}) {
    if (!pts.length) return;
    this.b.stagger(0.05);
    this.b.fits(def, pts.map((at) => ({ at, dir, on: on ? this.key(on) : undefined, mate: o.mate ? this.key(o.mate) : undefined, hole: o.hole, spin: o.spin })), Math.min(0.07, 2.4 / Math.max(1, pts.length)));
    this.b.then(0.1);
  }
}

/* ---------- legs that screw under the top ---------- */

interface LegAt {
  id: string;
  x: number;
  z: number;
}

function legParts(k: Kit, kind: Leg, legs: LegAt[], H: number) {
  const yTop = H - TT;
  for (const l of legs) {
    if (kind === "adils") k.part(l.id, "Leg", [34, yTop - 4, 34], [l.x, (yTop - 4) / 2, l.z], { shape: "cyl", mat: "metal" });
    else if (kind === "olov") {
      const h = yTop - 4;
      k.part(l.id, "Adjustable leg", [40, h, 40], [l.x, h / 2, l.z], {
        mat: "metal",
        pieces: [
          { shape: "cyl", size: [40, h * 0.62, 40], pos: [0, h * 0.19, 0] },
          { shape: "cyl", size: [32, h * 0.4, 32], pos: [0, -h * 0.3, 0] },
        ],
      });
    } else if (kind === "krille") {
      const h = yTop - 62; // over the castor
      k.part(l.id, "Leg", [90, h, 90], [l.x, 62 + h / 2, l.z], {
        mat: "metal",
        pieces: [
          { shape: "cyl", size: [90, 5, 90], pos: [0, h / 2 - 2.5, 0] },
          { shape: "cyl", size: [10, h, 10], pos: [-14, 0, 0], rot: [0, 0, -0.035] },
          { shape: "cyl", size: [10, h, 10], pos: [14, 0, 0], rot: [0, 0, 0.035] },
          { shape: "cyl", size: [22, 40, 22], pos: [0, -h / 2 + 20, 0] },
        ],
      });
    } else {
      // a bamboo cone with its own square block on top
      const h = yTop, bh = 22, ch = h - bh;
      k.part(l.id, "Cone-shaped leg", [80, h, 80], [l.x, h / 2, l.z], {
        mat: "wood",
        pieces: [
          { shape: "box", size: [80, bh, 80], pos: [0, h / 2 - bh / 2, 0] },
          { shape: "cyl", size: [52, ch * 0.34, 52], pos: [0, h / 2 - bh - ch * 0.17, 0] },
          { shape: "cyl", size: [44, ch * 0.33, 44], pos: [0, h / 2 - bh - ch * 0.505, 0] },
          { shape: "cyl", size: [36, ch * 0.33, 36], pos: [0, -h / 2 + ch * 0.165, 0] },
        ],
      });
    }
  }
}

/** Plate and five screws under the top for each ADILS or OLOV leg, then the legs screwed in. */
function plateLegSteps(k: Kit, kind: Leg, legs: LegAt[], H: number) {
  const yTop = H - TT;
  const n = legs.length;
  k.step(
    { title: n === 1 ? "Screw the leg plate under the top" : "Screw the leg plates under the top", detail: "Centre each plate on the pre-drilled holes, five screws each.", tools: ["screwdriver"], pose: "-y", kind: "screws" },
    () => {
      for (const l of legs) {
        k.fit(PLATE, [[l.x, yTop, l.z]], [0, 1, 0], "TOP", { hole: false });
        k.fit(SCREW_TOP, fivePoints(l.x, yTop, l.z, 34), [0, 1, 0], "TOP");
      }
    },
  );
  k.step(
    { title: n === 1 ? "Screw the leg into its plate" : "Screw the legs into the plates", detail: kind === "olov" ? "Turn each leg in by hand until it stops. You can set the height later." : "Turn each leg in by hand until it stops.", kind: "legs" },
    () => k.add(legs.map((l) => l.id), [0, -260, 0], 2),
  );
}

function krilleSteps(k: Kit, legs: LegAt[], H: number) {
  const yTop = H - TT;
  k.step(
    { title: "Screw a castor into each leg", detail: "Turn the castor's stem into the bottom of the leg and tighten it with the spanner. Then stand the legs on the top.", tools: ["wrench"], kind: "legs" },
    () => {
      k.add(legs.map((l) => l.id), [0, -260, 0]);
      for (const l of legs) k.fit({ kind: "castor", len: 58, dia: 50 }, [[l.x, 62, l.z]], [0, 1, 0], l.id, { spin: 3 });
    },
  );
  k.step({ title: "Screw the legs to the top", detail: "Five screws through each leg's plate into the pre-drilled holes.", tools: ["screwdriver"], kind: "screws" }, () => {
    for (const l of legs) k.fit(SCREW_TOP, fivePoints(l.x, yTop - 5, l.z, 32), [0, 1, 0], l.id, { mate: "TOP" });
  });
}

function hilverSteps(k: Kit, legs: LegAt[], H: number) {
  const yTop = H - TT;
  k.step(
    { title: "Screw the legs under the top", detail: "Stand each leg on a corner, its block on the pre-drilled holes. Five screws through each block, one in the middle first.", tools: ["screwdriver"], kind: "legs" },
    () => {
      k.add(legs.map((l) => l.id), [0, -260, 0]);
      for (const l of legs) k.fit({ kind: "screw", len: 25, dia: 4 }, fivePoints(l.x, yTop - 22, l.z, 28), [0, 1, 0], l.id, { mate: "TOP" });
    },
  );
}

function turnOver(k: Kit, kind: Leg) {
  const detail =
    kind === "olov"
      ? "Lift it onto its legs, don't drag it. Twist the lower part of each leg to set the height between 63 and 93 cm."
      : kind === "krille"
        ? "Lift it onto its castors. Press the castor brakes down where you want it to stay."
        : kind === "hilver"
          ? "Lift it onto its legs, don't drag it."
          : "Lift it onto its legs, don't drag it. Turn the feet to stop it rocking.";
  k.step({ title: "Turn the desk over together", detail, people: 2, pose: "+y", kind: "standup" }, () => {});
}

/* ---------- ALEX drawer unit, built as alex.ts builds it ---------- */

const AW = 360, AD = 580;

/** The builder seen from a drawer unit standing at `off`: the ALEX code draws a unit centred on x = z = 0. */
function shifted(b: PlanBuilder, off: Vec3): PlanBuilder {
  const mv = (o: FitOpts): FitOpts => ({ ...o, at: [o.at[0] + off[0], o.at[1] + off[1], o.at[2] + off[2]] });
  const over: Record<string, unknown> = {
    place: (ref: string, pos: Vec3, rot?: Vec3) => b.place(ref, [pos[0] + off[0], pos[1] + off[1], pos[2] + off[2]], rot),
    fit: (def: HwDef, o: FitOpts) => b.fit(def, mv(o)),
    fits: (def: HwDef, list: FitOpts[], gap?: number) => b.fits(def, list.map(mv), gap),
    preset: (def: HwDef, o: FitOpts) => b.preset(def, mv(o)),
  };
  return new Proxy(b, {
    get(t, p) {
      if (typeof p === "string" && p in over) return over[p];
      const v = Reflect.get(t, p);
      return typeof v === "function" ? v.bind(t) : v;
    },
  });
}

/** The ALEX 5-drawer unit's own layout, at the height that leaves room for the top. */
function alexUnit(Ha: number): Unit {
  const inner = Ha - 2 * 15;
  const sh = 115;
  return { W: AW, D: AD, Hc: Ha, y0: 0, slots: ["shallow", "shallow", "deep", "deep", "deep"], pitch: { shallow: sh, deep: (inner - 2 * sh) / 3 } };
}

/** The drawer unit on the left, two ADILS legs on the right: legs under the upside-down top, top set on the unit. */
function alexDesk(b: PlanBuilder, k: Kit, W: number, D: number, H: number) {
  const Ha = H - TT;
  const cx = -W / 2 + AW / 2, cz = D / 2 - AD / 2 - 16;
  k.part("TOP", "Table top", [W, TT, D], [0, H - TT / 2, 0], { mat: "wood" });
  const legs: LegAt[] = [-1, 1].map((sz) => ({ id: `L${sz}`, x: W / 2 - 60, z: sz * (D / 2 - 60) }));
  legParts(k, "adils", legs, H);

  const g = alexUnit(Ha);
  const c = carcassParts(shifted(b, [cx, 0, cz]), g);
  const ds = drawerParts(b, slotsOf(g).map((s) => ({ ...s, cx: s.cx + cx, zf: s.zf + cz, zb: s.zb + cz })), false);
  const st = stepper(b);
  carcassA(shifted(b, [cx, 0, cz]), st, c, "glides");
  drawerSteps(b, st, ds, "deep", {});
  drawerSteps(b, st, ds, "shallow", {});

  const yTop = H - TT, topY = H - TT / 2;
  const top = k.key("TOP");
  st({ title: "Screw the leg plates under the top", detail: "Lay the top upside down on a rug. Centre each plate on its pre-drilled holes at the right-hand end, five screws each.", tools: ["screwdriver"], pose: "-y", warnings: ["floor"], kind: "screws", scene: "top" }, () => {
    b.stage(top, [0, 0, 0], [0, 0, 0], [0, -160, 0]);
    b.then(0.15);
    for (const l of legs) {
      k.fit(PLATE, [[l.x, yTop, l.z]], [0, 1, 0], "TOP", { hole: false });
      k.fit(SCREW_TOP, fivePoints(l.x, yTop, l.z, 34), [0, 1, 0], "TOP");
    }
  });
  st({ title: "Screw the legs into the plates", detail: "By hand, until they stop.", pose: "-y", kind: "legs", scene: "top" }, () => {
    b.stagger(0.2);
    for (const l of legs) {
      const p = k.pos(l.id);
      b.stage(k.key(l.id), [p[0], p[1] - topY, p[2]], [0, 0, 0], [0, -260, 0]);
    }
  });
  st({ title: "Turn the top over and set it on the drawer unit together", detail: "Line it up with the back and the outer edge of the drawer unit. The drawers stay out for now.", people: 2, pose: "+y", kind: "join" }, () => k.add(["TOP", ...legs.map((l) => l.id)], [0, 220, 0]));
  st({ title: "Screw up through the drawer unit into the top", detail: "Four screws through the holes in the top of the drawer unit, with the Allen key, reaching in where the drawers go.", tools: ["allen"], kind: "screws" }, () => {
    b.fits({ kind: "screw", len: 30, dia: 5 }, [-1, 1].flatMap((s) => [-1, 1].map((t): FitOpts => ({ on: c.top, at: [cx + s * (AW / 2 - 60), c.yTop, cz + t * (AD / 2 - 80)], dir: [0, 1, 0], mate: top }))), 0.08);
  });
  drawersIn(b, st, ds, ["deep", "shallow"]);
}

/* ---------- which desk ---------- */

function build(b: PlanBuilder, s: ProductSpec) {
  const slug = s.slug ?? "";
  const m = /^anfallare-(adils|olov|krille|hilver|alex)-desk/.exec(slug);
  if (!m) return false;
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const k = new Kit(b);
  if (m[1] === "alex") {
    alexDesk(b, k, W, D, H);
    return true;
  }
  const kind = m[1] as Leg;
  const inset = kind === "hilver" ? 70 : 60;
  k.part("TOP", "Table top", [W, TT, D], [0, H - TT / 2, 0], { mat: "wood" });
  const legs: LegAt[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ id: `L${sx}${sz}`, x: sx * (W / 2 - inset), z: sz * (D / 2 - inset) })));
  legParts(k, kind, legs, H);
  k.step({ title: "Lay the top upside down on a rug", detail: "The rug keeps the bamboo surface from scratching.", pose: "-y", warnings: ["floor"], kind: "general" }, () => k.add(["TOP"], [0, -300, 0]));
  if (kind === "krille") krilleSteps(k, legs, H);
  else if (kind === "hilver") hilverSteps(k, legs, H);
  else plateLegSteps(k, kind, legs, H);
  turnOver(k, kind);
  return true;
}

const family: Family = {
  names: ["ANFALLARE"],
  build,
};
export default family;
