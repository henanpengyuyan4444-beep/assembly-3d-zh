import type { Family } from "./family";
import type { PartMaterial, PartPiece, ProductSpec, StepKind, ToolId, Vec3, WarnId, Pose } from "../../types";
import type { HwDef, PlanBuilder } from "../builder";

/*
 * LINNMON tops, read from the manuals of the legs they stand on (the top comes ready drilled, so it has none).
 *   ADILS and OLOV: a round plate screwed under the upside-down top with five screws, the leg turned into it.
 *   KRILLE: a castor screwed into each leg with the spanner, then the leg's own plate screwed under the top.
 *   SPÄND: each leg frame is two legs joined by two crossbars on threaded rods and barrel nuts, feet in, a plate
 *   bolted on each leg; the frame is screwed under one end of the top, then the rods are tightened.
 * The 120 cm top with legs has no IKEA page; its round legs on plates are drawn as ADILS.
 */

type Leg = "adils" | "olov" | "krille" | "spand";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const TT = 34; // LINNMON top

const SCREW_TOP: HwDef = { kind: "screw", len: 30, dia: 4 };
const PLATE: HwDef = { kind: "plate", len: 4, dia: 90 };

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
  private types = new Map<string, string>();
  private pose: Pose = "+y";
  constructor(public b: PlanBuilder) {}

  part(id: string, name: string, size: Vec3, pos: Vec3, o: { mat?: PartMaterial; shape?: "box" | "cyl"; pieces?: PartPiece[]; rot?: Vec3 } = {}) {
    const tk = [name, size.map(Math.round).join("x"), o.shape ?? "box", o.mat ?? "board", o.pieces ? JSON.stringify(o.pieces) : ""].join("|");
    let t = this.types.get(tk);
    if (!t) {
      t = this.b.part(name, size, { shape: o.shape ?? "box", material: o.mat ?? "board" });
      if (o.pieces) this.b.parts[this.b.parts.length - 1].pieces = o.pieces;
      this.types.set(tk, t);
    }
    this.keys.set(id, this.b.place(t, pos, o.rot ?? [0, 0, 0]));
  }
  key(id: string) {
    const k = this.keys.get(id);
    if (!k) throw new Error(`LINNMON: no part ${id}`);
    return k;
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
  fit(def: HwDef, pts: Vec3[], dir: Vec3, on?: string | ((p: Vec3, i: number) => string), o: { mate?: string; hole?: false; spin?: number } = {}) {
    if (!pts.length) return;
    this.b.stagger(0.05);
    this.b.fits(
      def,
      pts.map((at, i) => ({ at, dir, on: on ? this.key(typeof on === "function" ? on(at, i) : on) : undefined, mate: o.mate ? this.key(o.mate) : undefined, hole: o.hole, spin: o.spin })),
      Math.min(0.07, 2.4 / Math.max(1, pts.length)),
    );
    this.b.then(0.1);
  }
}

/** Five screws on a plate: one in the middle, four around it. */
const fivePoints = (x: number, y: number, z: number, r: number): Vec3[] => [[x, y, z], ...range(4).map((i) => [x + r * Math.cos((i * Math.PI) / 2 + Math.PI / 4), y, z + r * Math.sin((i * Math.PI) / 2 + Math.PI / 4)] as Vec3)];

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
    }
  }
}

function plateLegSteps(k: Kit, kind: Leg, legs: LegAt[], H: number) {
  const yTop = H - TT;
  k.step(
    {
      title: "Screw the leg plates under the top",
      detail: "Centre each plate on the pre-drilled holes in a corner, five screws each. The screws need a top at least 25 mm thick.",
      tools: ["screwdriver"],
      kind: "screws",
    },
    () => {
      for (const l of legs) {
        k.fit(PLATE, [[l.x, yTop, l.z]], [0, 1, 0], "TOP", { hole: false });
        k.fit(SCREW_TOP, fivePoints(l.x, yTop, l.z, 34), [0, 1, 0], "TOP");
      }
    },
  );
  k.step(
    { title: "Screw the legs into the plates", detail: kind === "olov" ? "Turn each leg in by hand until it stops. You set the height once the desk stands." : "Turn each leg in by hand until it stops.", kind: "legs" },
    () => k.add(legs.map((l) => l.id), [0, -260, 0], 2),
  );
}

function krilleSteps(k: Kit, legs: LegAt[], H: number) {
  const yTop = H - TT;
  k.step(
    { title: "Screw a castor into each leg", detail: "Turn the castor's stem into the bottom of the leg, then tighten it with the spanner.", tools: ["wrench"], kind: "legs" },
    () => {
      k.add(legs.map((l) => l.id), [0, -260, 0]);
      for (const l of legs) k.fit({ kind: "castor", len: 58, dia: 50 }, [[l.x, 62, l.z]], [0, 1, 0], l.id, { spin: 3 });
    },
  );
  k.step({ title: "Screw the legs under the top", detail: "Stand each leg on a corner of the upside-down top. Five screws through its plate into the pre-drilled holes.", tools: ["screwdriver"], kind: "screws" }, () => {
    for (const l of legs) k.fit(SCREW_TOP, fivePoints(l.x, yTop - 5, l.z, 32), [0, 1, 0], l.id, { mate: "TOP" });
  });
}

/* ---------- SPÄND: a leg frame at each end ---------- */

function spandFrame(k: Kit, p: string, x: number, D: number, H: number) {
  const yTop = H - TT;
  const zl = D / 2 - 50;
  const h = yTop - 6;
  for (const s of [-1, 1]) k.part(`${p}L${s}`, "Leg", [30, h - 20, 30], [x, 20 + (h - 20) / 2, s * zl], { shape: "cyl", mat: "metal" });
  for (const [i, y] of [[0, yTop - 90], [1, 160]] as const) k.part(`${p}C${i}`, "Crossbar", [20, 2 * zl - 30, 20], [x, y, 0], { shape: "cyl", mat: "metal", rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) k.part(`${p}P${s}`, "Leg plate", [100, 6, 100], [x, yTop - 3, s * zl], { shape: "cyl", mat: "metal" });
}

function spandSteps(k: Kit, frames: { p: string; x: number }[], D: number, H: number) {
  const yTop = H - TT;
  const zl = D / 2 - 50;
  const ids = (f: (p: string) => string[]) => frames.flatMap((q) => f(q.p));
  const ys = [yTop - 90, 160];
  k.step(
    { title: "Join the crossbars to the legs", detail: "Turn a threaded rod into each barrel nut, push the nuts into the legs and the rods into the crossbar ends. Don't tighten yet.", tools: ["allen"], kind: "join" },
    () => {
      k.add(ids((p) => [`${p}L-1`, `${p}L1`, `${p}C0`, `${p}C1`]), [0, -200, 0]);
      for (const q of frames)
        for (const [i, y] of ys.entries())
          for (const s of [-1, 1]) {
            k.fit({ kind: "stud", len: 40, dia: 6, name: "Threaded rod" }, [[q.x, y, s * (zl - 15)]], [0, 0, s], `${q.p}C${i}`);
            k.fit({ kind: "nut", len: 12, dia: 10, name: "Barrel nut" }, [[q.x - 15, y, s * zl]], [1, 0, 0], `${q.p}L${s}`);
          }
    },
  );
  k.step({ title: "Screw in the feet", detail: "One into the bottom of each leg, by hand, all the way in.", kind: "legs" }, () => {
    for (const q of frames) k.fit({ kind: "foot", len: 20, dia: 30 }, [-1, 1].map((s) => [q.x, 20, s * zl] as Vec3), [0, 1, 0], (_p, i) => `${q.p}L${i ? 1 : -1}`, { spin: 2 });
  });
  k.step({ title: "Bolt a plate onto the top of each leg", detail: "Two bolts through each plate with the Allen key. Turn the plates so their holes point in towards the crossbar.", tools: ["allen"], kind: "bolts" }, () => {
    k.add(ids((p) => [`${p}P-1`, `${p}P1`]), [0, 120, 0]);
    for (const q of frames) for (const s of [-1, 1]) k.fit({ kind: "bolt", len: 12, dia: 6 }, [[q.x - 10, yTop - 6, s * zl], [q.x + 10, yTop - 6, s * zl]], [0, -1, 0], `${q.p}P${s}`, { mate: `${q.p}L${s}` });
  });
  k.step(
    { title: "Screw the frames under the ends of the top", detail: "Stand each frame upside down at one end of the top. Five screws through each plate, until the heads sit flat.", tools: ["screwdriver"], pose: "-y", kind: "screws" },
    () => {
      for (const q of frames) for (const s of [-1, 1]) k.fit(SCREW_TOP, fivePoints(q.x, yTop - 6, s * zl, 38), [0, 1, 0], `${q.p}P${s}`, { mate: "TOP" });
    },
  );
  k.step({ title: "Tighten the top crossbars", detail: "Two barrel nuts on each frame, firmly, with the Allen key. The nut must sit flush with the leg.", tools: ["allen"], kind: "bolts" }, () => {});
  k.step({ title: "Tighten the bottom crossbars", detail: "The last two nuts on each frame, the same way.", tools: ["allen"], kind: "bolts" }, () => {});
}

/* ---------- which desk ---------- */

function build(b: PlanBuilder, s: ProductSpec) {
  const slug = s.slug ?? "";
  if (!/^linnmon-/.test(slug)) return false;
  const kind: Leg | null = /olov/.test(slug) ? "olov" : /krille/.test(slug) ? "krille" : /spand/.test(slug) ? "spand" : /adils|table-top-legs/.test(slug) ? "adils" : null;
  if (!kind) return false;
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const what = /desk/.test(slug) ? "desk" : "table";
  const k = new Kit(b);
  k.part("TOP", "Table top", [W, TT, D], [0, H - TT / 2, 0]);
  k.step({ title: "Lay the top upside down on a rug", detail: "The rug keeps the top surface from scratching.", pose: "-y", warnings: ["floor"], kind: "general" }, () => k.add(["TOP"], [0, -300, 0]));

  if (kind === "spand") {
    const frames = [-1, 1].map((sx) => ({ p: `F${sx}`, x: sx * (W / 2 - 60) }));
    for (const f of frames) spandFrame(k, f.p, f.x, D, H);
    spandSteps(k, frames, D, H);
    k.step({ title: `Turn the ${what} over together`, detail: "Lift it onto its feet, don't drag it. Turn the feet to stop it rocking.", people: 2, pose: "+y", kind: "standup" }, () => {});
    k.step({ title: "Wrap the cable straps round a leg", detail: "The touch-and-close straps hold cables against the leg.", kind: "general" }, () => {
      for (const f of frames) k.fit({ kind: "strap", len: 30, dia: 34, name: "Touch-and-close fastening" }, [H * 0.35, H * 0.55].map((y) => [f.x, y, -(D / 2 - 50)] as Vec3), [0, 0, 1], `${f.p}L-1`, { hole: false });
    });
    return true;
  }

  const inset = 60;
  const legs: LegAt[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ id: `L${sx}${sz}`, x: sx * (W / 2 - inset), z: sz * (D / 2 - inset) })));
  legParts(k, kind, legs, H);
  if (kind === "krille") krilleSteps(k, legs, H);
  else plateLegSteps(k, kind, legs, H);
  const detail =
    kind === "olov"
      ? "Lift it onto its legs, don't drag it. Twist the lower part of each leg to set the height between 60 and 90 cm."
      : kind === "krille"
        ? "Lift it onto its castors. Press the castor brakes down where you want it to stay."
        : "Lift it onto its legs, don't drag it. Turn the feet to stop it rocking.";
  k.step({ title: `Turn the ${what} over together`, detail, people: 2, pose: "+y", kind: "standup" }, () => {});
  return true;
}

const family: Family = {
  names: ["LINNMON"],
  build,
};
export default family;
