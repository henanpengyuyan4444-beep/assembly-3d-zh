import type { Family } from "./family";
import type { PartMaterial, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { HwDef, PlanBuilder } from "../builder";
import { rotate } from "../math";

/*
 * MÖRBYLÅNGA, read from its four manuals (tables 140 x 85 and 220 x 100, the round table 145 and the bench 180).
 * Everything is built upside down on a rug.
 * Long tables: the top comes in two halves along its length; each half gets its apron on two dowels and three
 * screws. The two leg frames (two legs and two rails each, already jointed) lie flat for two cam bolts and two big
 * dowels each, are pushed onto the aprons' ends and locked with the cams, then screwed to both halves: four screws,
 * then twelve more. Four glides go into the frames' feet.
 * Round table: the two halves are pushed together on two pins, the square underframe is screwed on (eight screws),
 * the two leg pieces (a foot rail with two splayed legs each) are bolted together where they cross, set into the
 * underframe's corner brackets and bolted (four bolts, five washers in all), four glides go under the feet.
 * Bench: the two leg frames are bolted under the seat (eight bolts with washers), four glides are tapped in.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const DOWEL: HwDef = { kind: "dowel", len: 30, dia: 8 };
const DOWEL_L: HwDef = { kind: "dowel", len: 40, dia: 10 };
const SCREW: HwDef = { kind: "screw", len: 70, dia: 6 };
const CAM_BOLT: HwDef = { kind: "camScrew", len: 34, dia: 7 };
const CAM: HwDef = { kind: "cam", len: 13, dia: 15 };
const GLIDE: HwDef = { kind: "glide", len: 6, dia: 30, name: "Glide" };
const WASHER: HwDef = { kind: "washer", len: 2, dia: 14 };
const PIN: HwDef = { kind: "dowel", len: 50, dia: 10, name: "Alignment pin" };

interface StepIn {
  title: string;
  detail?: string;
  tools?: ToolId[];
  people?: 1 | 2;
  pose?: Pose;
  warnings?: WarnId[];
  kind?: StepKind;
  scene?: string;
}

/** Bounding box of some pieces, and the pieces moved so the box is centred on 0. */
function shape(pieces: PartPiece[]): { size: Vec3; mid: Vec3; pieces: PartPiece[] } {
  const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of pieces) {
    const [sx, sy, sz] = p.size;
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        for (const c of [-1, 1]) {
          const v = rotate([(a * sx) / 2, (b * sy) / 2, (c * sz) / 2], p.rot ?? [0, 0, 0]);
          for (let i = 0; i < 3; i++) {
            lo[i] = Math.min(lo[i], p.pos[i] + v[i]);
            hi[i] = Math.max(hi[i], p.pos[i] + v[i]);
          }
        }
  }
  const r = (n: number) => Math.round(n * 10) / 10;
  const mid: Vec3 = [r((lo[0] + hi[0]) / 2), r((lo[1] + hi[1]) / 2), r((lo[2] + hi[2]) / 2)];
  return {
    size: [r(hi[0] - lo[0]), r(hi[1] - lo[1]), r(hi[2] - lo[2])],
    mid,
    pieces: pieces.map((p) => ({ ...p, pos: [r(p.pos[0] - mid[0]), r(p.pos[1] - mid[1]), r(p.pos[2] - mid[2])] })),
  };
}

/** Parts placed where they end up; steps bring them in, in the main scene or shown on their own in another. */
class Kit {
  private keys = new Map<string, string>();
  private boxes = new Map<string, { pos: Vec3; rot: Vec3 }>();
  private types = new Map<string, string>();
  private pose: Pose = "+y";
  constructor(public b: PlanBuilder) {}

  /** A part drawn from pieces given where they sit in the finished product. */
  welded(id: string, name: string, abs: PartPiece[], mat: PartMaterial = "wood") {
    const sh = shape(abs);
    this.put(id, name, sh.size, sh.mid, mat, sh.pieces);
  }
  box(id: string, name: string, size: Vec3, pos: Vec3, mat: PartMaterial = "wood") {
    this.put(id, name, size, pos, mat);
  }
  /** The same part as `of`, turned by `rot` about its own middle and set at `pos`. */
  turned(id: string, of: string, pos: Vec3, rot: Vec3) {
    this.keys.set(id, this.b.place(this.b.partItem(this.key(of)).ref, pos, rot));
    this.boxes.set(id, { pos, rot });
  }
  mid(id: string) {
    return this.boxes.get(id)!.pos;
  }
  private put(id: string, name: string, size: Vec3, pos: Vec3, mat: PartMaterial, pieces?: PartPiece[]) {
    const tk = [name, size.map(Math.round).join("x"), mat, pieces ? JSON.stringify(pieces) : ""].join("|");
    let t = this.types.get(tk);
    if (!t) {
      t = this.b.part(name, size, { material: mat });
      if (pieces) this.b.parts[this.b.parts.length - 1].pieces = pieces;
      this.types.set(tk, t);
    }
    this.keys.set(id, this.b.place(t, pos));
    this.boxes.set(id, { pos, rot: [0, 0, 0] });
  }
  key(id: string) {
    const k = this.keys.get(id);
    if (!k) throw new Error(`MÖRBYLÅNGA: no part ${id}`);
    return k;
  }
  step(s: StepIn, body: () => void) {
    const side = !!s.scene && s.scene !== "main";
    if (s.pose && !side) this.pose = s.pose;
    const warnings = new Set<WarnId>(s.warnings ?? []);
    if (s.people === 2) warnings.add("two");
    this.b.step({ title: s.title, detail: s.detail, tools: s.tools ?? [], people: s.people ?? 1, pose: side ? (s.pose ?? "+y") : this.pose, warnings: [...warnings].slice(0, 3), kind: s.kind ?? "general", scene: s.scene }, body);
  }
  add(ids: string[], from?: Vec3 | ((id: string) => Vec3)) {
    this.b.stagger(ids.length > 4 ? 0.14 : 0.24);
    for (const id of ids) this.b.add(this.key(id), typeof from === "function" ? from(id) : from);
    this.b.then(0.12);
  }
  /** Shown in a step's own scene, where it will end up or moved by `at`. */
  stage(ids: string[], from?: Vec3, at?: (pos: Vec3, rot: Vec3) => { pos: Vec3; rot: Vec3 }) {
    this.b.stagger(0.24);
    for (const id of ids) {
      const p = this.boxes.get(id)!;
      const q = at ? at(p.pos, p.rot) : p;
      this.b.stage(this.key(id), q.pos, q.rot, from);
    }
    this.b.then(0.12);
  }
  fit(def: HwDef, pts: Vec3[], dir: Vec3 | ((p: Vec3) => Vec3), on: string | ((p: Vec3) => string), o: { mate?: string | ((p: Vec3) => string); hole?: false } = {}) {
    if (!pts.length) return;
    const id = (f: string | ((p: Vec3) => string) | undefined, p: Vec3) => (f === undefined ? undefined : this.key(typeof f === "function" ? f(p) : f));
    this.b.stagger(0.05);
    this.b.fits(def, pts.map((at) => ({ at, dir: typeof dir === "function" ? dir(at) : dir, on: id(on, at), mate: id(o.mate, at), hole: o.hole })), Math.min(0.07, 2.4 / Math.max(1, pts.length)));
    this.b.then(0.1);
  }
}

const UP: Vec3 = [0, 1, 0];
const sides = [-1, 1];
const turnOver = (k: Kit) =>
  k.step({ title: "Turn the table over", detail: "Together, lifting it by the top, not the legs, and stand it on its feet.", pose: "+y", people: 2, kind: "standup" }, () => {});

/** A leg frame: two legs between a top rail and a foot rail, jointed at the corners, standing across the product. */
function frame(x: number, H: number, span: number, fw: number, lw: number, rh: number): PartPiece[] {
  return [
    { shape: "box", size: [fw, rh, span], pos: [x, H - rh / 2, 0] },
    { shape: "box", size: [fw, rh, span], pos: [x, rh / 2, 0] },
    ...sides.map((sz): PartPiece => ({ shape: "box", size: [fw, H - 2 * rh, lw], pos: [x, H / 2, sz * (span / 2 - lw / 2)] })),
  ];
}

function longTable(b: PlanBuilder, s: ProductSpec) {
  const L = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const tt = 40; // the top
  const yU = H - tt; // its underside
  const ins = 40, insEnd = 50; // the frames stand in from the long edges and the ends
  const fw = 60, lw = 60, rh = 70; // frame timbers; the aprons are as tall as the frames' top rails
  const at = 25;
  const k = new Kit(b);
  const xf = L / 2 - insEnd - fw / 2; // frame middles
  const xi = xf - fw / 2; // their inner faces
  const zA = D / 2 - ins - at / 2; // apron middles
  const yA = yU - rh / 2;

  k.box("T1", "Table top half", [L, tt, D / 2], [0, H - tt / 2, D / 4]);
  k.box("T-1", "Table top half", [L, tt, D / 2], [0, H - tt / 2, -D / 4]);
  for (const sz of sides) k.box(`A${sz}`, "Apron", [2 * xi, rh, at], [0, yA, sz * zA]);
  k.welded("F-1", "Leg frame", frame(-xf, yU, D - 2 * ins, fw, lw, rh));
  const fm = k.mid("F-1");
  k.turned("F1", "F-1", [-fm[0], fm[1], fm[2]], [0, Math.PI, 0]);

  const top = (p: Vec3) => (p[2] < 0 ? "T-1" : "T1");
  const apron = (p: Vec3) => (p[2] < 0 ? "A-1" : "A1");
  const fr = (p: Vec3) => (p[0] < 0 ? "F-1" : "F1");
  const xs = (n: number, w: number) => range(n).map((i) => -w / 2 + (w * (i + 0.5)) / n);

  k.step(
    { title: "Tap the dowels in and lay the aprons on", detail: "Lay both top halves face down on a rug, side by side. Two dowels along the outer edge of each, then an apron onto them.", pose: "-y", warnings: ["floor"], tools: ["hammer"], kind: "dowels" },
    () => {
      k.add(["T1", "T-1"], [0, -200, 0]);
      k.fit(DOWEL, sides.flatMap((sz) => [-0.3, 0.3].map((f) => [f * 2 * xi, yU, sz * zA] as Vec3)), UP, top, { mate: apron });
      k.add(["A1", "A-1"], [0, -250, 0]);
    },
  );
  k.step({ title: "Screw the aprons to the top", detail: "Three screws down through each apron. Fit the Allen key into the handle to turn them.", tools: ["allen"], kind: "screws" }, () =>
    k.fit(SCREW, sides.flatMap((sz) => xs(3, 2 * xi).map((x) => [x, yU - rh, sz * zA] as Vec3)), UP, apron, { mate: top }),
  );

  // the leg frames lie flat side by side, inside faces up
  const beside = (pos: Vec3, rot: Vec3) => ({ pos: [-pos[0], pos[1] - (H + 100), pos[2]] as Vec3, rot: [rot[0], rot[1] + Math.PI, rot[2]] as Vec3 });
  const framePts = (dy: number) => sides.flatMap((sx) => sides.map((sz) => [sx * xi, yA + dy, sz * zA] as Vec3));
  const into = (p: Vec3): Vec3 => [Math.sign(p[0]), 0, 0];
  k.step({ title: "Turn the cam bolts into the leg frames", detail: "Lay both frames flat. Two in the inside face of each top rail, one at each end.", pose: "+x", scene: "frames", tools: ["screwdriver"], warnings: ["floor"], kind: "cams" }, () => {
    k.stage(["F-1"]);
    k.stage(["F1"], undefined, beside);
    k.fit(CAM_BOLT, framePts(16), into, fr, { mate: apron });
  });
  k.step({ title: "Tap in the big dowels", detail: "One beside each cam bolt.", pose: "+x", scene: "frames", tools: ["hammer"], kind: "dowels" }, () =>
    k.fit(DOWEL_L, framePts(-16), into, fr, { mate: apron }),
  );
  k.step({ title: "Push the leg frames onto the aprons", detail: "Stand each frame on the top halves, its bolts and dowels into the ends of both aprons.", kind: "join" }, () =>
    k.add(["F-1", "F1"], (id) => [id === "F1" ? 300 : -300, 0, 0]),
  );
  k.step({ title: "Lock the cams", detail: "Push a cam into each apron end, arrow towards the bolt, and turn it clockwise. Check the two halves meet flush.", tools: ["screwdriver"], kind: "cams" }, () =>
    k.fit(CAM, sides.flatMap((sx) => sides.map((sz) => [sx * (xi - 32), yA + 16, sz * (zA - at / 2)] as Vec3)), (p) => [0, 0, Math.sign(p[2])], apron),
  );
  const railZ = (D - 2 * ins) / 2 - lw;
  k.step({ title: "Screw the frames to the top", detail: "Two screws through each frame's top rail, one into each half.", tools: ["allen"], kind: "screws" }, () =>
    k.fit(SCREW, sides.flatMap((sx) => [-0.5, 0.5].map((f) => [sx * xf, yU - rh, f * railZ] as Vec3)), UP, fr, { mate: top }),
  );
  k.step({ title: "Fit the rest of the screws", detail: "Six more through each top rail, spread across both halves.", tools: ["allen"], kind: "screws" }, () =>
    k.fit(SCREW, sides.flatMap((sx) => [-0.85, -0.65, -0.2, 0.2, 0.65, 0.85].map((f) => [sx * xf, yU - rh, f * railZ] as Vec3)), UP, fr, { mate: top }),
  );
  k.step({ title: "Tap in the glides", detail: "One under each end of both foot rails.", tools: L > 1800 ? ["hammer"] : [], kind: "legs" }, () =>
    k.fit(GLIDE, sides.flatMap((sx) => sides.map((sz) => [sx * xf, 0, sz * (railZ + lw / 2)] as Vec3)), UP, fr, { hole: false }),
  );
  turnOver(k);
  return true;
}

function roundTable(b: PlanBuilder, s: ProductSpec) {
  const Dm = s.size.w * 10, H = s.size.h * 10;
  const tt = 40, yU = H - tt;
  const a = 900, at = 25, ah = 80; // the square underframe
  const k = new Kit(b);

  const half = (sz: number): PartPiece[] => [{ shape: "halfcyl", size: [Dm, tt, Dm / 2], pos: [0, H - tt / 2, sz * (Dm / 4)], rot: [0, sz < 0 ? Math.PI : 0, 0] }];
  k.welded("T1", "Table top half", half(1));
  const tm = k.mid("T1");
  k.turned("T-1", "T1", [tm[0], tm[1], -tm[2]], [0, Math.PI, 0]);

  // the underframe: four rails jointed at the corners, a steel bracket inside each corner
  const yR = yU - ah / 2;
  const cb = (sx: number, sz: number): PartPiece => ({ shape: "box", size: [90, 70, 6], pos: [sx * (a / 2 - at - 32), yR, sz * (a / 2 - at - 32)], rot: [0, sx * sz > 0 ? -Math.PI / 4 : Math.PI / 4, 0], material: "metal" });
  k.welded("U", "Underframe", [
    ...sides.map((sz): PartPiece => ({ shape: "box", size: [a, ah, at], pos: [0, yR, sz * (a / 2 - at / 2)] })),
    ...sides.map((sx): PartPiece => ({ shape: "box", size: [at, ah, a - 2 * at], pos: [sx * (a / 2 - at / 2), yR, 0] })),
    ...sides.flatMap((sx) => sides.map((sz) => cb(sx, sz))),
  ]);

  // the base: two leg pieces, each a foot rail along a diagonal with a splayed leg up from each end
  const lw = 60, fh = 70;
  const rTop = a / Math.SQRT2 - at * Math.SQRT2 - 60; // leg tops, in the underframe's corners
  const rFoot = Dm / 2 - 90; // feet
  const legH = yU - fh;
  const lean = Math.atan2(rFoot - rTop, legH);
  const legLen = Math.hypot(legH, rFoot - rTop);
  const unit = (phi: number): PartPiece[] => {
    const local: PartPiece[] = [
      { shape: "box", size: [2 * rFoot + lw, fh, lw], pos: [0, fh / 2, 0] },
      ...sides.map((sx): PartPiece => ({ shape: "box", size: [lw, legLen, lw], pos: [sx * (rFoot + rTop) / 2, fh + legH / 2, 0], rot: [0, 0, sx * lean] })),
    ];
    return local.map((p) => ({ ...p, pos: rotate(p.pos, [0, phi, 0]), rot: [0, phi, p.rot?.[2] ?? 0] }));
  };
  k.welded("LA", "Leg piece", unit(-Math.PI / 4));
  const la = k.mid("LA");
  k.turned("LB", "LA", [la[0], la[1], -la[2]], [0, Math.PI / 2, 0]);

  const diag = (r: number, i: number): Vec3 => {
    const ang = Math.PI / 4 + (i * Math.PI) / 2;
    return [r * Math.cos(ang), 0, r * Math.sin(ang)];
  };
  const leg = (p: Vec3) => (p[0] * p[2] > 0 ? "LA" : "LB");
  const top = (p: Vec3) => (p[2] < 0 ? "T-1" : "T1");

  k.step(
    { title: "Push the top halves together", detail: "Face down on a rug. Two pins in the edge of one half, then slide the other onto them until the joint closes.", pose: "-y", warnings: ["floor"], kind: "dowels" },
    () => {
      k.add(["T-1"], [0, -200, 0]);
      k.fit(PIN, [-0.28, 0.28].map((f) => [f * Dm, H - tt / 2, 0] as Vec3), [0, 0, -1], "T-1", { mate: "T1" });
      k.add(["T1"], [0, 0, 300]);
    },
  );
  k.step({ title: "Screw the underframe onto the top", detail: "Centred over the joint. Two screws down through each rail; fit the Allen key into the handle to turn them.", tools: ["allen"], kind: "screws" }, () => {
    k.add(["U"], [0, -300, 0]);
    const pts = [
      ...sides.flatMap((sz) => [-0.22, 0.22].map((f) => [f * a, yU - ah, sz * (a / 2 - at / 2)] as Vec3)),
      ...sides.flatMap((sx) => [-0.22, 0.22].map((f) => [sx * (a / 2 - at / 2), yU - ah, f * a] as Vec3)),
    ];
    k.fit(SCREW, pts, UP, "U", { mate: top });
  });
  k.step({ title: "Bolt the two leg pieces together", detail: "Cross the foot rails so the notches fit into each other, then one bolt with a washer through the middle.", pose: "-y", scene: "base", tools: ["allen"], kind: "bolts" }, () => {
    k.stage(["LA"]);
    k.stage(["LB"], [0, -300, 0]);
    k.fit(WASHER, [[0, 0, 0]], UP, "LA", { hole: false });
    k.fit({ kind: "bolt", len: 40, dia: 6 }, [[0, 0, 0]], UP, "LA", { mate: "LB" });
  });
  k.step({ title: "Set the base into the underframe", detail: "Each leg top goes into the bracket in a corner.", kind: "join" }, () => k.add(["LA", "LB"], [0, -300, 0]));
  k.step({ title: "Bolt the legs to the corner brackets", detail: "A bolt and washer through each bracket into its leg. Tighten all four firmly.", tools: ["allen"], kind: "bolts" }, () => {
    const pts = range(4).map((i) => {
      const p = diag(rTop - 45, i);
      return [p[0], yU - ah / 2, p[2]] as Vec3;
    });
    const out = (p: Vec3): Vec3 => [p[0] / Math.hypot(p[0], p[2]), 0, p[2] / Math.hypot(p[0], p[2])];
    k.fit(WASHER, pts, out, leg, { hole: false });
    k.fit({ kind: "bolt", len: 90, dia: 8 }, pts, out, leg, { mate: "U" });
  });
  k.step({ title: "Tap in the glides", detail: "One under each end of the foot rails.", tools: ["hammer"], kind: "legs" }, () =>
    k.fit(GLIDE, range(4).map((i) => diag(rFoot, i)), UP, leg, { hole: false }),
  );
  turnOver(k);
  return true;
}

function bench(b: PlanBuilder, s: ProductSpec) {
  const L = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const tt = 40, yU = H - tt;
  const fw = 70, lw = 65, rh = 70, insEnd = 110, ins = 15;
  const xf = L / 2 - insEnd - fw / 2;
  const k = new Kit(b);
  k.box("T", "Seat", [L, tt, D], [0, H - tt / 2, 0]);
  k.welded("F-1", "Leg frame", frame(-xf, yU, D - 2 * ins, fw, lw, rh));
  const fm = k.mid("F-1");
  k.turned("F1", "F-1", [-fm[0], fm[1], fm[2]], [0, Math.PI, 0]);
  const fr = (p: Vec3) => (p[0] < 0 ? "F-1" : "F1");
  const pts = sides.flatMap((sx) => sides.flatMap((sz) => sides.map((dx) => [sx * xf + dx * 18, yU - rh, sz * (D / 2 - ins - lw / 2)] as Vec3)));
  k.step(
    { title: "Bolt the leg frames under the seat", detail: "Lay the seat face down on a rug and stand a frame near each end. Four bolts with washers down through each top rail.", pose: "-y", tools: ["allen"], warnings: ["floor"], kind: "bolts" },
    () => {
      k.add(["T"], [0, -200, 0]);
      k.add(["F-1", "F1"], [0, -300, 0]);
      k.fit(WASHER, pts, UP, fr, { hole: false });
      k.fit({ kind: "bolt", len: 90, dia: 6 }, pts, UP, fr, { mate: "T" });
    },
  );
  k.step({ title: "Tap in the glides", detail: "One under each end of both foot rails.", tools: ["hammer"], kind: "legs" }, () =>
    k.fit(GLIDE, sides.flatMap((sx) => sides.map((sz) => [sx * xf, 0, sz * (D / 2 - ins - lw / 2)] as Vec3)), UP, fr, { hole: false }),
  );
  k.step({ title: "Turn the bench over", detail: "Stand it on its feet and check it doesn't rock.", pose: "+y", kind: "standup" }, () => {});
  return true;
}

function build(b: PlanBuilder, s: ProductSpec) {
  const slug = s.slug ?? "";
  if (/^morbylanga-bench/.test(slug)) return bench(b, s);
  if (/^morbylanga-table/.test(slug)) return s.table?.round ? roundTable(b, s) : longTable(b, s);
  return false;
}

const family: Family = {
  names: ["MÖRBYLÅNGA"],
  build,
};
export default family;
