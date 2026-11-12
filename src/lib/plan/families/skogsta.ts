import type { Family } from "./family";
import type { PartMaterial, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { HwDef, PlanBuilder } from "../builder";
import { POSE_EULER, unrotate } from "../math";

/**
 * SKOGSTA, solid acacia with black legs, read from its seven manuals.
 * - Dining tables 235x100 and 160x81: a top in two halves joined on alignment pins, two trestle frames (built from
 *   loose legs and rails for the 235, ready made for the 160) dowelled and bolted under it, a stretcher between the
 *   frames and a V brace from the stretcher up to the top rails.
 * - Round table 120: a square frame of four rails and corner brackets bolted under the two halves of the top, legs
 *   on threaded rods through the brackets, two stretchers crossing between opposite legs, a block on each leg.
 * - Counter height tables 74x74 and 150x74: the same frame and bracketed legs, a footrest rail at each end and a
 *   stretcher between them.
 * - Bench 235: a ready made seat with its frame, six legs, three cross rails and two stretchers.
 * - Bench with storage: a shelf on a rail between two end frames, edge rails, then the seat on top.
 * - Dining chair and bar stool: a seat with its spindle back, two leg frames bolted on, then the stretchers.
 * Every one is built upside down and turned over at the end, as the manuals show.
 */

type V = Vec3;
const r1 = (n: number) => Math.round(n * 10) / 10;
const G = [-1, 1] as const;

const DOWEL: HwDef = { kind: "dowel", len: 30, dia: 8 };
const SHORT_DOWEL: HwDef = { kind: "dowel", len: 20, dia: 8 };
const PIN: HwDef = { kind: "dowel", len: 50, dia: 10, name: "Alignment pin" };
const BARREL: HwDef = { kind: "nut", len: 22, dia: 10, name: "Barrel nut" };
const BARREL_S: HwDef = { kind: "nut", len: 16, dia: 8, name: "Small barrel nut" };
const BARREL_2: HwDef = { kind: "nut", len: 45, dia: 10, name: "Double barrel nut" };
const ROD: HwDef = { kind: "stud", len: 100, dia: 8, name: "Threaded rod" };
const NUT: HwDef = { kind: "nut", len: 7, dia: 8 };
const LOCK: HwDef = { kind: "washer", len: 2, dia: 14, name: "Spring washer" };
const WASHER: HwDef = { kind: "washer", len: 2, dia: 20 };
const CORNER: HwDef = { kind: "angle", len: 110, dia: 40, name: "Corner bracket" };
const BRACKET_SCREW: HwDef = { kind: "screw", len: 14, dia: 5 };
const PAD: HwDef = { kind: "glide", len: 4, dia: 28, name: "Felt pad" };

interface StepOpts {
  title: string;
  detail?: string;
  tools?: ToolId[];
  people?: 1 | 2;
  pose?: Pose;
  scene?: string;
  warnings?: WarnId[];
  kind: StepKind;
}

/** Parts by id, placed where they sit in the finished product, and steps that bring them in and fit the hardware. */
class Kit {
  private types = new Map<string, string>();
  private keys = new Map<string, string>();
  private pose: Pose = "+y";
  constructor(readonly b: PlanBuilder) {}

  part(id: string, name: string, size: V, pos: V, o: { rot?: V; shape?: "box" | "cyl"; material?: PartMaterial; pieces?: PartPiece[] } = {}) {
    const material = o.material ?? "wood";
    const tk = `${name}|${size.map((n) => Math.round(n)).join("x")}|${material}|${o.shape ?? "box"}|${o.pieces ? JSON.stringify(o.pieces) : ""}`;
    let t = this.types.get(tk);
    if (!t) {
      t = this.b.part(name, size.map(r1) as V, { material, shape: o.shape });
      if (o.pieces) this.b.parts[this.b.parts.length - 1].pieces = o.pieces;
      this.types.set(tk, t);
    }
    this.keys.set(id, this.b.place(t, pos.map(r1) as V, o.rot ?? [0, 0, 0]));
  }
  k(id: string) {
    const key = this.keys.get(id);
    if (!key) throw new Error("skogsta: no part " + id);
    return key;
  }
  step(o: StepOpts, body?: () => void) {
    this.pose = o.pose ?? this.pose;
    const warnings = [...(o.warnings ?? [])];
    if (o.people === 2 && !warnings.includes("two")) warnings.unshift("two");
    this.b.step({ ...o, pose: this.pose, scene: o.scene ?? "main", warnings: warnings.slice(0, 3) }, () => body?.());
  }
  /** Straight down onto the work as it lies now: up on screen, turned back into the product's own frame. */
  up(d = 320): V {
    return unrotate([0, d, 0], POSE_EULER[this.pose]).map((n) => Math.round(n)) as V;
  }
  add(ids: string[], from?: V | ((id: string) => V)) {
    this.b.stagger(ids.length > 3 ? 0.16 : 0.26);
    for (const id of ids) this.b.add(this.k(id), typeof from === "function" ? from(id) : (from ?? this.up()));
    this.b.then(0.12);
  }
  /** Shown moved by `shift` (and turned by `rot`) until it is added. */
  stage(ids: string[], shift: V, rot?: V) {
    this.b.stagger(0.2);
    for (const id of ids) {
      const f = this.b.partItem(this.k(id)).final;
      this.b.stage(this.k(id), [f.pos[0] + shift[0], f.pos[1] + shift[1], f.pos[2] + shift[2]], rot ?? f.rot);
    }
    this.b.then(0.12);
  }
  fit(def: HwDef, pts: V[], dir: V, on: string, mate?: string, o: { hole?: false } = {}) {
    if (!pts.length) return;
    this.b.fits(
      def,
      pts.map((at) => ({ at: at.map(r1) as V, dir, on: this.k(on), mate: mate ? this.k(mate) : undefined, hole: o.hole })),
      Math.min(0.08, 2 / pts.length),
    );
    this.b.then(0.1);
  }
}

/** Pieces drawn in the finished product's frame, recentred on their bounding box. */
function rel(pieces: PartPiece[]) {
  const lo: V = [Infinity, Infinity, Infinity], hi: V = [-Infinity, -Infinity, -Infinity];
  for (const p of pieces) {
    const h = p.size.map((n) => n / 2);
    const [rx, ry, rz] = p.rot ?? [0, 0, 0];
    // a turned piece: bound it by its corners
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        for (const c of [-1, 1]) {
          let v: V = [a * h[0], b * h[1], c * h[2]];
          v = [v[0] * Math.cos(rz) - v[1] * Math.sin(rz), v[0] * Math.sin(rz) + v[1] * Math.cos(rz), v[2]];
          v = [v[0] * Math.cos(ry) + v[2] * Math.sin(ry), v[1], -v[0] * Math.sin(ry) + v[2] * Math.cos(ry)];
          v = [v[0], v[1] * Math.cos(rx) - v[2] * Math.sin(rx), v[1] * Math.sin(rx) + v[2] * Math.cos(rx)];
          for (let i = 0; i < 3; i++) {
            lo[i] = Math.min(lo[i], p.pos[i] + v[i]);
            hi[i] = Math.max(hi[i], p.pos[i] + v[i]);
          }
        }
  }
  const mid: V = [r1((lo[0] + hi[0]) / 2), r1((lo[1] + hi[1]) / 2), r1((lo[2] + hi[2]) / 2)];
  const size: V = [r1(hi[0] - lo[0]), r1(hi[1] - lo[1]), r1(hi[2] - lo[2])];
  return { mid, size, pieces: pieces.map((p) => ({ ...p, pos: [r1(p.pos[0] - mid[0]), r1(p.pos[1] - mid[1]), r1(p.pos[2] - mid[2])] as V })) };
}

const box = (size: V, pos: V, rot?: V, material?: PartMaterial): PartPiece => ({ shape: "box", size, pos, ...(rot ? { rot } : {}), ...(material ? { material } : {}) });
const cyl = (dia: number, len: number, pos: V, rot?: V): PartPiece => ({ shape: "cyl", size: [dia, len, dia], pos, ...(rot ? { rot } : {}) });
const spread = (a: number, b: number, n: number) => (n === 1 ? [(a + b) / 2] : Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1)));
const TURN: V = [0, Math.PI, 0];

/** A rod or leg from `a` to `b`: its centre, length and the turn that stands a y-long part along it. */
function strut(a: V, b: V) {
  const d: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const u = d.map((n) => (n / len) * (d[1] < 0 ? -1 : 1)); // a cylinder runs both ways: keep it pointing up
  const rz = -Math.asin(u[0]);
  const rx = Math.asin(u[2] / Math.cos(rz));
  return { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as V, len, rot: [rx, 0, rz] as V };
}

/* ---------- dining tables 235x100 and 160x81: trestle frames and a V brace ---------- */

function trestle(k: Kit, s: ProductSpec) {
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const big = W > 2000; // the 235 comes with loose legs and rails; the 160's frames are ready made
  const T = 38, yU = H - T;
  const lw = 70, a = 0.065, rt = 45;
  const xf = W / 2 - (big ? 300 : 220);
  const zt = D / 2 - 120, zb = zt + Math.tan(a) * yU;
  const zc = (y: number) => zb + ((zt - zb) * y) / yU;
  const y1 = yU - 55, h1 = 110, y2 = big ? 260 : 240, h2 = 70;
  const half1 = zc(y1) - lw / 2, half2 = zc(y2) - lw / 2;
  const ySt = y2 + h2 / 2 + 35, yS1 = ySt + 35;
  const xk = xf * 0.45;

  // the top, in two halves along its length
  k.part("TA", "Table top half", [W, T, D / 2], [0, H - T / 2, -D / 4]);
  k.part("TB", "Table top half", [W, T, D / 2], [0, H - T / 2, D / 4]);

  const legPiece = (g: number, sz: number) => box([lw, yU / Math.cos(a), lw], [g * xf, yU / 2, (sz * (zt + zb)) / 2], [-sz * a, 0, 0]);
  const zo = zc(y2) + lw / 2; // outer face of a leg at the lower rail
  const blockPieces = [box([36, 110, 18], [0, 0, -20]), box([36, 36, 40], [0, 0, 9])];
  const blockAt = (g: number, sz: number): V => [g * xf, y2, sz * (zo + 29)];
  const fid = (g: number) => (g < 0 ? 0 : 1);
  const legId = (g: number, sz: number) => (big ? `L${fid(g)}${sz < 0 ? 0 : 1}` : `F${fid(g)}`);
  const railId = (g: number, top: boolean) => (big ? `${top ? "U" : "R"}${fid(g)}` : `F${fid(g)}`);
  const blockId = (g: number, sz: number) => (big ? `B${fid(g)}${sz < 0 ? 0 : 1}` : `F${fid(g)}`);

  if (big) {
    for (const g of G) {
      for (const sz of G) {
        const L = legPiece(g, sz);
        k.part(legId(g, sz), "Leg", L.size, L.pos, { rot: L.rot });
        k.part(blockId(g, sz), "Block", [36, 110, 58], blockAt(g, sz), { pieces: blockPieces, rot: sz < 0 ? TURN : undefined });
      }
      k.part(railId(g, true), "Top rail", [rt, h1, 2 * half1], [g * xf, y1, 0]);
      k.part(railId(g, false), "Lower rail", [rt, h2, 2 * half2], [g * xf, y2, 0]);
    }
  } else {
    const fr = rel([
      ...G.map((sz) => legPiece(1, sz)),
      box([rt, h1, 2 * half1], [xf, y1, 0]),
      box([rt, h2, 2 * half2], [xf, y2, 0]),
      ...G.flatMap((sz) => [box([36, 110, 18], [xf, y2, sz * (zo + 9)]), box([36, 36, 40], [xf, y2, sz * (zo + 38)])]),
    ]);
    for (const g of G) k.part(`F${fid(g)}`, "Leg frame", fr.size, [g * fr.mid[0], fr.mid[1], 0], { pieces: fr.pieces, rot: g < 0 ? TURN : undefined });
  }
  k.part("ST", "Stretcher", [2 * xf + rt + 120, 70, 45], [0, ySt, 0]);
  // a brace arm: flat under the top from the top rail inwards, then down to the middle of the stretcher
  const p0: V = [15, yS1 + 30, 0], p1: V = [xk + 20, yU - 30, 0];
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const arm = rel([
    box([xf - rt / 2 - xk, 60, 45], [(xk + xf - rt / 2) / 2, yU - 30, 0]),
    box([Math.hypot(dx, dy) + 40, 60, 45], [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0], [0, 0, Math.atan2(dy, dx)]),
  ]);
  for (const g of G) k.part(`A${fid(g)}`, "Brace arm", arm.size, [g * arm.mid[0], arm.mid[1], 0], { pieces: arm.pieces, rot: g < 0 ? TURN : undefined });
  const half = (z: number) => (z < 0 ? "TA" : "TB");

  k.step({ title: "Push the alignment pins into one top half", detail: "Lay both halves face down on a rug. Four pins go into the long edge of one half.", pose: "-y", warnings: ["floor", "face"], kind: "dowels" }, () => {
    k.add(["TA"], k.up());
    k.fit(PIN, [-0.36, -0.12, 0.12, 0.36].map((f): V => [f * W, H - T / 2, 0]), [0, 0, 1], "TA", "TB");
  });
  k.step({ title: "Push the two halves together", detail: "Slide the other half onto the pins until the joint closes all along.", kind: "join" }, () => k.add(["TB"], [0, 0, 300]));

  if (big) {
    const rails = G.flatMap((g) => [railId(g, true), railId(g, false)]);
    k.step({ title: "Tap the dowels into the rails", detail: "Two in each end of all four rails, two rails for each frame.", tools: ["hammer"], pose: "+y", scene: "frames", kind: "dowels" }, () => {
      k.add(rails, k.up(200));
      for (const g of G)
        for (const [top, yc, h, dy] of [[true, y1, half1, 30], [false, y2, half2, 18]] as const)
          for (const e of G) k.fit(DOWEL, [[g * xf, yc - dy, e * h], [g * xf, yc + dy, e * h]], [0, 0, e], railId(g, top), legId(g, e));
    });
    k.step({ title: "Push the legs onto the rails", detail: "Two legs and two rails make each frame. The legs lean in towards the top.", scene: "frames", kind: "join" }, () =>
      k.add(G.flatMap((g) => G.map((sz) => legId(g, sz))), (id) => [0, 0, id.endsWith("0") ? -260 : 260]),
    );
    k.step({ title: "Bolt the legs to the rails", detail: "A barrel nut in each rail end, slot turned towards the bolt. Then the long bolts through the legs, not the shorter ones.", tools: ["flathead", "allen"], scene: "frames", kind: "bolts" }, () => {
      for (const g of G)
        for (const [top, yc, h] of [[true, y1, half1], [false, y2, half2]] as const) k.fit(BARREL, G.map((e): V => [g * (xf - rt / 2), yc, e * (h - 35)]), [g, 0, 0], railId(g, top), undefined, { hole: false });
      for (const g of G)
        for (const sz of G) k.fit({ kind: "bolt", len: 110, dia: 8 }, [y1, y2].map((y): V => [g * xf, y, sz * (zc(y) + lw / 2)]), [0, 0, -sz], legId(g, sz));
    });
    k.step({ title: "Tap a dowel into each block", detail: "One in the back of each of the four blocks.", tools: ["hammer"], scene: "frames", kind: "dowels" }, () => {
      for (const sz of G) k.stage(G.map((g) => blockId(g, sz)), [0, 0, sz * 160]);
      for (const g of G) for (const sz of G) k.fit(DOWEL, [[g * xf, y2, sz * zo]], [0, 0, -sz], blockId(g, sz), legId(g, sz));
    });
    k.step({ title: "Screw the blocks onto the legs", detail: "On the outside of each leg, level with the lower rail. One screw each.", tools: ["allen"], scene: "frames", kind: "screws" }, () => {
      k.add(G.flatMap((g) => G.map((sz) => blockId(g, sz))), (id) => [0, 0, id.endsWith("0") ? -160 : 160]);
      for (const g of G) for (const sz of G) k.fit({ kind: "screw", len: 40, dia: 5 }, [[g * xf, y2 + 38, sz * (zo + 18)]], [0, 0, -sz], blockId(g, sz), legId(g, sz));
    });
    k.step({ title: "Tap the dowels into the top rails", detail: "Two on top of each frame, into the holes nearest the middle.", tools: ["hammer"], scene: "frames", kind: "dowels" }, () => {
      for (const g of G) for (const sz of G) k.fit(DOWEL, [[g * xf, yU, sz * D * 0.17]], [0, 1, 0], railId(g, true), half(sz));
    });
  } else {
    k.step({ title: "Tap the dowels into the leg frames", detail: "Two on top of each frame.", tools: ["hammer"], pose: "+y", scene: "frames", kind: "dowels" }, () => {
      k.add(["F0", "F1"], k.up(200));
      for (const g of G) for (const sz of G) k.fit(DOWEL, [[g * xf, yU, sz * D * 0.17]], [0, 1, 0], railId(g, true), half(sz));
    });
  }
  const frameParts = big ? G.flatMap((g) => [railId(g, true), railId(g, false), ...G.map((sz) => legId(g, sz)), ...G.map((sz) => blockId(g, sz))]) : ["F0", "F1"];
  k.step({ title: "Stand the frames on the top", detail: "Upside down onto the dowels, one near each end. Check the legs lean in towards the top, as the drawing shows.", pose: "-y", kind: "join" }, () => k.add(frameParts, k.up(360)));
  k.step({ title: "Bolt the frames to the top", detail: "A washer on each bolt, through the slots in the top rails. Four in each frame.", tools: ["allen"], kind: "bolts" }, () => {
    for (const g of G) {
      const pts = [-0.75, -0.3, 0.3, 0.75].map((f): V => [g * xf, y1 - h1 / 2, f * half1]);
      k.fit(WASHER, pts, [0, 1, 0], railId(g, true), undefined, { hole: false });
      for (const sz of G) k.fit({ kind: "bolt", len: 100, dia: 6 }, pts.filter((p) => Math.sign(p[2]) === sz), [0, 1, 0], railId(g, true), half(sz));
    }
  });
  k.step({ title: "Bolt the stretcher between the frames", detail: "It sits on the lower rails. One bolt up through each rail into it.", tools: ["allen"], kind: "bolts" }, () => {
    k.add(["ST"], k.up());
    for (const g of G) k.fit({ kind: "bolt", len: 100, dia: 6 }, [[g * xf, y2 - h2 / 2, 0]], [0, 1, 0], railId(g, false), "ST");
  });
  k.step({ title: "Join the two brace arms with a dowel", detail: "Tap the dowel into the end of one arm and push the other onto it, so they make a V.", tools: ["hammer"], pose: "+y", scene: "brace", kind: "dowels" }, () => {
    k.add(["A0", "A1"], k.up(200));
    k.fit(DOWEL, [[0, yS1 + 30, 0]], [-1, 0, 0], "A1", "A0");
  });
  k.step({ title: "Slide the brace in under the stretcher", detail: "The point of the V rests on the middle of the stretcher, the arms reach the top rails.", pose: "-y", kind: "join" }, () => k.add(["A0", "A1"], [0, 0, D * 0.7]));
  k.step({ title: "Bolt the stretcher to the brace", detail: "Two bolts through the stretcher into the point of the V.", tools: ["allen"], kind: "bolts" }, () => {
    for (const g of G) k.fit({ kind: "bolt", len: 100, dia: 6 }, [[g * 30, ySt - 35, 0]], [0, 1, 0], "ST", `A${fid(g)}`);
  });
  k.step({ title: "Bolt the brace arms to the top rails", detail: "One bolt through each top rail into the end of its arm.", tools: ["allen"], kind: "bolts" }, () => {
    for (const g of G) k.fit({ kind: "bolt", len: 100, dia: 6 }, [[g * (xf + rt / 2), yU - 30, 0]], [-g, 0, 0], railId(g, true), `A${fid(g)}`);
  });
  k.step({ title: "Stick on the felt pads", detail: "One under each leg.", kind: "legs" }, () => {
    for (const g of G) for (const sz of G) k.fit(PAD, [[g * xf, 0, sz * zb]], [0, 1, 0], legId(g, sz), undefined, { hole: false });
  });
  k.step({ title: "Tighten the top bolts again", detail: "Go round the eight bolts in the top rails once more, now that everything sits right.", tools: ["allen"], kind: "bolts" });
  k.step({ title: "Turn the table over together", detail: "One at each end. Lift it by the top, don't roll it over on its legs.", pose: "+y", people: 2, kind: "standup" });
}

/* ---------- round table 120: square frame, bracketed legs, crossed stretchers ---------- */

function roundTable(k: Kit, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, R = W / 2;
  const T = 35, yU = H - T;
  const lw = 70, a = 0.06;
  const rT = R * 0.55, rB = rT + Math.tan(a) * yU;
  const rc = (y: number) => rB + ((rT - rB) * y) / yU;
  const ah = 90, yA = yU - ah / 2, at = 30, rA = rT - lw / 2;
  const yS = 280, hS = 60;
  const U: V[] = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  const tan = (u: V): V => [-u[2], 0, u[0]];
  const mulv = (u: V, n: number, y = 0): V => [u[0] * n, y, u[2] * n];
  const plus = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];

  // the top comes in two halves; drawn as one disc, since a part can't be half a cylinder yet
  k.part("TOP", "Table top", [W, T, W], [0, H - T / 2, 0], { shape: "cyl" });
  U.forEach((u, i) => k.part(`L${i}`, "Leg", [lw, yU / Math.cos(a), lw], mulv(u, (rT + rB) / 2, yU / 2), { rot: [-u[2] * a, 0, u[0] * a] }));
  // the frame: four rails round a square whose corners meet the legs
  const rails = [0, 1, 2, 3].map((i) => {
    const phi = (i + 0.5) * (Math.PI / 2);
    const n: V = [Math.cos(phi), 0, Math.sin(phi)];
    const len = rA * Math.SQRT2 - 20;
    const c = mulv(n, rA / Math.SQRT2 - at / 2, yA);
    k.part(`AR${i}`, "Frame rail", [len, ah, at], c, { rot: [0, Math.PI / 2 - phi, 0] });
    return { n, c, len };
  });
  k.part("SX", "Stretcher", [2 * (rc(yS) - lw / 2), hS, 45], [0, yS, 0]);
  k.part("SZ", "Stretcher, notched", [45, hS, 2 * (rc(yS) - lw / 2)], [0, yS, 0]);
  const zo = rc(yS) + lw / 2;
  U.forEach((u, i) => k.part(`B${i}`, "Block", [58, 110, 36], mulv(u, zo + 29, yS), { pieces: [box([18, 110, 36], [-20, 0, 0]), box([40, 36, 36], [9, 0, 0])], rot: [0, -Math.atan2(u[2], u[0]), 0] }));
  const sOf = (i: number) => (i % 2 === 0 ? "SX" : "SZ");
  const nearRails = (i: number) => [i, (i + 3) % 4];
  const corner = (i: number) => mulv(U[i], rA, yA);
  const bracketAt = (i: number) => mulv(U[i], rA - 70, yA);
  const legBolt = (i: number) => {
    k.fit(BARREL_S, [mulv(U[i], rc(yS) - lw / 2 - 35, yS + hS / 2)], [0, -1, 0], sOf(i), undefined, { hole: false });
    k.fit({ kind: "bolt", len: 110, dia: 8 }, [mulv(U[i], zo, yS)], mulv(U[i], -1), `L${i}`, sOf(i));
  };
  const legNut = (i: number) => {
    k.fit(LOCK, [bracketAt(i)], U[i], `L${i}`, undefined, { hole: false });
    k.fit(NUT, [plus(bracketAt(i), mulv(U[i], -4))], U[i], `L${i}`, undefined, { hole: false });
  };

  k.step({ title: "Tap the dowels into the stretchers", detail: "Two in each end of both stretchers.", tools: ["hammer"], scene: "parts", kind: "dowels" }, () => {
    k.stage(["SX"], [0, 0, -160]);
    k.stage(["SZ"], [0, 0, 160], [0, Math.PI / 2, 0]);
    U.forEach((u, i) => k.fit(DOWEL, [-18, 18].map((dy) => mulv(u, rc(yS) - lw / 2, yS + dy)), u, sOf(i), `L${i}`));
  });
  k.step({ title: "Tap a dowel into each block", detail: "One in the back of each of the four blocks.", tools: ["hammer"], scene: "blocks", kind: "dowels" }, () => {
    k.add(["B0", "B1", "B2", "B3"], k.up(200));
    U.forEach((u, i) => k.fit(DOWEL, [mulv(u, zo, yS)], mulv(u, -1), `B${i}`, `L${i}`));
  });
  k.step({ title: "Fit the barrel nuts and threaded rods in the legs", detail: "Use the big barrel nuts here. Screw each rod in by hand until it stops in the nut.", tools: ["flathead"], scene: "legs", kind: "bolts" }, () => {
    k.add(["L0", "L1", "L2", "L3"], k.up(200));
    U.forEach((u, i) => k.fit(BARREL, [plus(mulv(u, rc(yA), yA), mulv(tan(u), lw / 2))], mulv(tan(u), -1), `L${i}`, undefined, { hole: false }));
    U.forEach((u, i) => k.fit(ROD, [corner(i)], u, `L${i}`));
  });
  k.step({ title: "Screw the corner brackets into the frame", detail: "Lay the four rails out in a square. The brackets hook into the slots at the rail ends, four screws each.", tools: ["screwdriver"], scene: "apron", warnings: ["floor"], kind: "screws" }, () => {
    k.add(["AR0", "AR1", "AR2", "AR3"], (id) => mulv(rails[Number(id.slice(2))].n, 220));
    U.forEach((u, i) => k.fit(CORNER, [bracketAt(i)], u, `AR${i}`, undefined, { hole: false }));
    U.forEach((_, i) => {
      for (const ri of nearRails(i)) {
        const { n, c } = rails[ri];
        const C = corner(i);
        const t0: V = [c[0] - C[0], 0, c[2] - C[2]];
        const tl = Math.hypot(t0[0], t0[2]);
        const t: V = [t0[0] / tl, 0, t0[2] / tl];
        const p = plus(plus(C, mulv(t, 70)), mulv(n, -at)); // on the rail's inside face
        k.fit(BRACKET_SCREW, [-22, 22].map((dy): V => [p[0], yA + dy, p[2]]), n, `AR${ri}`);
      }
    });
  });
  k.step({ title: "Join the two halves of the top", detail: "Face down on a rug. Three alignment pins in the straight edge of one half, then push the other half onto them until the joint closes.", pose: "-y", warnings: ["floor", "face"], kind: "dowels" }, () => {
    k.add(["TOP"], k.up());
    k.fit(PIN, [-0.5, 0, 0.5].map((f): V => [f * R, H - T / 2, 0]), [0, 0, 1], "TOP", undefined, { hole: false });
  });
  k.step({ title: "Bolt the frame onto the top", detail: "Two bolts through each rail. Only by hand for now, so you can still move the frame.", tools: ["allen"], warnings: ["loose"], kind: "bolts" }, () => {
    k.add(["AR0", "AR1", "AR2", "AR3"], k.up());
    rails.forEach(({ n, c, len }, i) => {
      const t: V = [-n[2], 0, n[0]];
      const pts = [-0.25, 0.25].map((f): V => [c[0] + t[0] * f * len, yU - ah, c[2] + t[2] * f * len]);
      k.fit({ kind: "bolt", len: 110, dia: 6 }, pts, [0, 1, 0], `AR${i}`, "TOP");
    });
  });
  k.step({ title: "Tighten the eight bolts", detail: "With the frame square on the top, go round and tighten them all with the Allen key.", tools: ["allen"], kind: "bolts" });
  k.step({ title: "Tap the dowels into the corners", detail: "Two at each corner of the frame, for the legs.", tools: ["hammer"], kind: "dowels" }, () => {
    U.forEach((u, i) => k.fit(DOWEL, [-25, 25].map((dy) => mulv(u, rA, yA + dy)), u, `AR${i}`, `L${i}`));
  });
  k.step({ title: "Fit the first leg", detail: "Its rod goes through the bracket. A spring washer and a nut on the rod, tightened with the spanner.", tools: ["wrench"], kind: "legs" }, () => {
    k.add(["L0"], mulv(U[0], 320));
    legNut(0);
  });
  k.step({ title: "Bolt a stretcher to the leg", detail: "One of you holds the stretcher. A small barrel nut in its end, then the long bolt through the leg.", tools: ["flathead", "allen"], people: 2, kind: "bolts" }, () => {
    k.add(["SX"], k.up());
    legBolt(0);
  });
  k.step({ title: "Fit the opposite leg", detail: "Onto the other end of the stretcher and the bracket. Washer and nut on the rod.", tools: ["wrench"], people: 2, kind: "legs" }, () => {
    k.add(["L2"], mulv(U[2], 320));
    legNut(2);
  });
  k.step({ title: "Bolt the stretcher to that leg", detail: "A small barrel nut and the long bolt, as before.", tools: ["flathead", "allen"], kind: "bolts" }, () => legBolt(2));
  k.step({ title: "Lay the second stretcher across", detail: "Its notch drops over the first one. One bolt through the middle.", tools: ["allen"], kind: "bolts" }, () => {
    k.add(["SZ"], k.up());
    k.fit({ kind: "bolt", len: 50, dia: 6 }, [[0, yS - hS / 2, 0]], [0, 1, 0], "SZ", "SX");
  });
  k.step({ title: "Fit the last two legs", detail: "Onto the stretcher ends and the brackets. Washer and nut on each rod.", tools: ["wrench"], kind: "legs" }, () => {
    k.add(["L1", "L3"], (id) => mulv(U[Number(id.slice(1))], 320));
    legNut(1);
    legNut(3);
  });
  k.step({ title: "Bolt the stretcher to them", detail: "A small barrel nut in each end, then a long bolt through each leg.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
    legBolt(1);
    legBolt(3);
  });
  k.step({ title: "Tighten the five bolts", detail: "The four through the legs and the one in the middle of the stretchers.", tools: ["allen"], kind: "bolts" });
  k.step({ title: "Screw the blocks onto the legs", detail: "On the outside of each leg, over the stretcher bolt. One screw each.", tools: ["allen"], kind: "screws" }, () => {
    k.add(["B0", "B1", "B2", "B3"], (id) => mulv(U[Number(id.slice(1))], 200));
    U.forEach((u, i) => k.fit({ kind: "screw", len: 40, dia: 5 }, [mulv(u, zo + 18, yS + 38)], mulv(u, -1), `B${i}`, `L${i}`));
  });
  k.step({ title: "Turn the table over together", detail: "Lift it by the top, one on each side.", pose: "+y", people: 2, kind: "standup" });
}

/* ---------- counter height tables 74x74 and 150x74 ---------- */

function counter(k: Kit, s: ProductSpec) {
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const long = W > 1000;
  const T = 35, yU = H - T;
  const e = 50, rt = 25, ah = 90, yA = yU - ah / 2;
  const lw = 60, a = 0.05;
  const xr = W / 2 - e - rt / 2, zr = D / 2 - e - rt / 2;
  const xt = W / 2 - e - rt - lw / 2, zl = D / 2 - e - rt - lw / 2;
  const xb = xt + Math.tan(a) * yU;
  const xc = (y: number) => xb + ((xt - xb) * y) / yU;
  const yF = 250, hF = 60, tF = 40;
  const ids = (g: number) => (g < 0 ? 0 : 1);
  const L = (g: number, sz: number) => `LG${ids(g)}${ids(sz)}`;
  const half = (z: number) => (z < 0 ? "TA" : "TB");

  k.part("TA", "Table top half", [W, T, D / 2], [0, H - T / 2, -D / 4]);
  k.part("TB", "Table top half", [W, T, D / 2], [0, H - T / 2, D / 4]);
  for (const sz of G) k.part(`AL${ids(sz)}`, "Frame rail", [W - 2 * e, ah, rt], [0, yA, sz * zr]);
  for (const g of G) k.part(`AS${ids(g)}`, "Frame rail", [rt, ah, D - 2 * e - 2 * rt], [g * xr, yA, 0]);
  for (const g of G) for (const sz of G) k.part(L(g, sz), "Leg", [lw, yU / Math.cos(a), lw], [(g * (xt + xb)) / 2, yU / 2, sz * zl], { rot: [0, 0, g * a] });
  for (const g of G) k.part(`SR${ids(g)}`, "Footrest rail", [tF, hF, 2 * (zl - lw / 2)], [g * xc(yF), yF, 0]);
  k.part("ST", "Stretcher", [2 * (xc(yF) + tF / 2 + 40), 50, 40], [0, yF + hF / 2 + 25, 0]);

  const inner = (g: number, sz: number, y: number): V => [g * (xt - lw / 2), y, sz * (zl - lw / 2)];
  const diag = (g: number, sz: number): V => [g * Math.SQRT1_2, 0, sz * Math.SQRT1_2];
  const bracketAt = (g: number, sz: number): V => [g * (xt - lw / 2 - 30), yA, sz * (zl - lw / 2 - 30)];
  const rodYs = long ? [yA - 20, yA + 20] : [yA];
  const legNut = (g: number, sz: number) => {
    const b = bracketAt(g, sz);
    const pts = rodYs.map((y): V => [b[0], y, b[2]]);
    k.fit(LOCK, pts, diag(g, sz), L(g, sz), undefined, { hole: false });
    k.fit(NUT, pts.map((p): V => [p[0] - g * 3, p[1], p[2] - sz * 3]), diag(g, sz), L(g, sz), undefined, { hole: false });
  };
  const railBolt = (g: number, sz: number) => {
    k.fit(BARREL_S, [[g * xc(yF), yF + hF / 2, sz * (zl - lw / 2 - 30)]], [0, -1, 0], `SR${ids(g)}`, undefined, { hole: false });
    k.fit({ kind: "bolt", len: 110, dia: 8 }, [[g * xc(yF), yF + 5, sz * (zl + lw / 2)]], [0, 0, -sz], L(g, sz), `SR${ids(g)}`);
  };
  const fromSide = (g: number, sz: number): V => [g * 260, 0, sz * 260];

  k.step({ title: "Push the alignment pins into one top half", detail: `Lay both halves face down on a rug. ${long ? "Four pins" : "Two pins"} go into the long edge of one half.`, pose: "-y", warnings: ["floor", "face"], kind: "dowels" }, () => {
    k.add(["TA"], k.up());
    k.fit(PIN, (long ? [-0.38, -0.15, 0.15, 0.38] : [-0.25, 0.25]).map((f): V => [f * W, H - T / 2, 0]), [0, 0, 1], "TA", "TB");
  });
  k.step({ title: "Push the two halves together", detail: "Slide the other half onto the pins until the joint closes all along.", kind: "join" }, () => k.add(["TB"], [0, 0, 300]));
  k.step({ title: `Screw the corner brackets onto the ${long ? "long" : "first two"} rails`, detail: "Two brackets on each rail, two screws in each. The holes for the top face up.", tools: ["screwdriver"], pose: "+y", scene: "apron", warnings: ["floor"], kind: "screws" }, () => {
    k.add(["AL0", "AL1"], k.up(200));
    for (const g of G)
      for (const sz of G) {
        k.fit(CORNER, [bracketAt(g, sz)], diag(g, sz), `AL${ids(sz)}`, undefined, { hole: false });
        k.fit(BRACKET_SCREW, [-22, 22].map((dy): V => [g * (xt - lw / 2 - 70), yA + dy, sz * (zr - rt / 2)]), [0, 0, sz], `AL${ids(sz)}`);
      }
  });
  k.step({ title: "Screw on the other two rails", detail: "The ends sit flush with the long rails. Two screws through each bracket.", tools: ["screwdriver"], scene: "apron", kind: "screws" }, () => {
    k.add(["AS0", "AS1"], (id) => [id.endsWith("0") ? -240 : 240, 0, 0]);
    for (const g of G) for (const sz of G) k.fit(BRACKET_SCREW, [-22, 22].map((dy): V => [g * (xr - rt / 2), yA + dy, sz * (zl - lw / 2 - 70)]), [g, 0, 0], `AS${ids(g)}`);
  });
  k.step({ title: "Tap the dowels into the frame", detail: `${long ? "Four" : "Two"} on top of the long rails, then turn the frame over.`, tools: ["hammer"], scene: "apron", kind: "dowels" }, () => {
    for (const sz of G) k.fit(DOWEL, (long ? [-0.3, 0.3] : [sz * 0.1]).map((f): V => [f * W, yU, sz * zr]), [0, 1, 0], `AL${ids(sz)}`, half(sz));
  });
  k.step({ title: "Lay the frame on the top", detail: "Upside down onto the dowels, the same distance in from every edge.", pose: "-y", kind: "join" }, () => k.add(["AL0", "AL1", "AS0", "AS1"], k.up()));
  k.step({ title: "Screw the frame to the top", detail: "A washer on every screw. By hand with a screwdriver, not a drill.", tools: ["screwdriver"], kind: "screws" }, () => {
    const nl = long ? 5 : 3;
    for (const sz of G) {
      const pts = spread(-(W / 2 - e - 110), W / 2 - e - 110, nl).map((x): V => [x, yU - 70, sz * zr]);
      k.fit(WASHER, pts, [0, 1, 0], `AL${ids(sz)}`, undefined, { hole: false });
      k.fit({ kind: "screw", len: 90, dia: 5 }, pts, [0, 1, 0], `AL${ids(sz)}`, half(sz));
    }
    for (const g of G) {
      const pts = [-0.25, 0, 0.25].map((f): V => [g * xr, yU - 70, f * D]);
      k.fit(WASHER, pts, [0, 1, 0], `AS${ids(g)}`, undefined, { hole: false });
      for (const p of pts) k.fit({ kind: "screw", len: 90, dia: 5 }, [p], [0, 1, 0], `AS${ids(g)}`, half(p[2] || -1));
    }
  });
  k.step({ title: "Fit the barrel nuts and threaded rods in the legs", detail: `${long ? "A double barrel nut" : "A barrel nut"} in the top of each leg, then screw ${long ? "the two rods" : "the rod"} in by hand until ${long ? "they stop" : "it stops"}.`, tools: ["flathead"], pose: "+y", scene: "legs", kind: "bolts" }, () => {
    k.add(G.flatMap((g) => G.map((sz) => L(g, sz))), k.up(200));
    for (const g of G) for (const sz of G) k.fit(long ? BARREL_2 : BARREL, [[g * xt, yU, sz * zl]], [0, -1, 0], L(g, sz), undefined, { hole: false });
    for (const g of G) for (const sz of G) k.fit(ROD, rodYs.map((y) => inner(g, sz, y)), diag(g, sz), L(g, sz));
  });
  const steps: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const [l1, l2, l3, l4] = steps;
  const legStep = (n: string, [g, sz]: [number, number]) =>
    k.step({ title: `Fit the ${n} leg`, detail: "Into the corner, its rods through the bracket. A spring washer and a nut on each rod, tightened with the spanner.", tools: ["wrench"], pose: "-y", kind: "legs" }, () => {
      k.add([L(g, sz)], fromSide(g, sz));
      legNut(g, sz);
    });
  legStep("first", l1);
  k.step({ title: "Tap the dowels into the footrest rails", detail: "One in each end.", tools: ["hammer"], pose: "+y", scene: "rails", kind: "dowels" }, () => {
    k.add(["SR0", "SR1"], k.up(200));
    for (const g of G) for (const sz of G) k.fit(DOWEL, [[g * xc(yF), yF - 18, sz * (zl - lw / 2)]], [0, 0, sz], `SR${ids(g)}`, L(g, sz));
  });
  k.step({ title: "Bolt a footrest rail to the first leg", detail: "A barrel nut in the rail end, slot towards the bolt, then the long bolt through the leg.", tools: ["flathead", "allen"], pose: "-y", kind: "bolts" }, () => {
    k.add(["SR0"], k.up());
    railBolt(...l1);
  });
  legStep("second", l2);
  k.step({ title: "Bolt the second leg to the rail", detail: "Barrel nut first, then the long bolt.", tools: ["flathead", "allen"], kind: "bolts" }, () => railBolt(...l2));
  legStep("third", l3);
  k.step({ title: "Bolt the other footrest rail to it", detail: "Barrel nut in the rail end, then the long bolt through the leg.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
    k.add(["SR1"], k.up());
    railBolt(...l3);
  });
  legStep("last", l4);
  k.step({ title: "Bolt the last leg to the rail", detail: "Barrel nut first, then the long bolt.", tools: ["flathead", "allen"], kind: "bolts" }, () => railBolt(...l4));
  k.step({ title: "Bolt the stretcher between the footrest rails", detail: "It rests on both rails. One bolt up through each rail into it.", tools: ["allen"], kind: "bolts" }, () => {
    k.add(["ST"], k.up());
    for (const g of G) k.fit({ kind: "bolt", len: 90, dia: 6 }, [[g * xc(yF), yF - hF / 2, 0]], [0, 1, 0], `SR${ids(g)}`, "ST");
  });
  k.step({ title: "Stick on the felt pads", detail: "One under each leg.", kind: "legs" }, () => {
    for (const g of G) for (const sz of G) k.fit(PAD, [[g * xb, 0, sz * zl]], [0, 1, 0], L(g, sz), undefined, { hole: false });
  });
  k.step({ title: long ? "Turn the table over together" : "Turn the table over", detail: "Lift it by the top, don't roll it over on its legs.", pose: "+y", people: long ? 2 : 1, kind: "standup" });
}

/* ---------- bench 235: six legs under a ready made seat ---------- */

function bench(k: Kit, s: ProductSpec) {
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const T = 40, yU = H - T;
  const ah = 80, yA = yU - ah / 2, rt = 25, e = 60, ez = 20;
  const zr = D / 2 - ez - rt / 2, xr = W / 2 - e - rt / 2;
  const lw = 60, xt = W / 2 - e - rt - lw / 2, zl = D / 2 - ez - rt - lw / 2;
  const xm = -(rt / 2 + lw / 2); // the middle legs sit against the seat frame's middle rail
  const yC = 170, hC = 70, tC = 40;
  const yS = yC + hC / 2 + 25;
  const inZ = D - 2 * ez - 2 * rt;
  const ids = (n: number) => (n < 0 ? 0 : 1);
  const L = (g: number, sz: number) => `LG${ids(g)}${ids(sz)}`;
  const M = (sz: number) => `LM${ids(sz)}`;
  const crX = { CR0: -xt, CR1: xt, CRM: xm } as Record<string, number>;
  const legOf = (rail: string, sz: number) => (rail === "CRM" ? M(sz) : L(rail === "CR0" ? -1 : 1, sz));

  const seat = rel([
    box([W, T, D], [0, H - T / 2, 0]),
    ...G.map((sz) => box([W - 2 * e, ah, rt], [0, yA, sz * zr])),
    ...G.map((g) => box([rt, ah, inZ], [g * xr, yA, 0])),
    box([rt, ah, inZ], [0, yA, 0]),
    ...G.flatMap((g) => G.map((sz) => box([100, 60, 6], [g * (xt - lw / 2 - 30), yA, sz * (zl - lw / 2 - 30)], [0, (g * sz * Math.PI) / 4, 0], "metal"))),
  ]);
  k.part("SEAT", "Seat with frame", seat.size, seat.mid, { pieces: seat.pieces });
  for (const g of G) for (const sz of G) k.part(L(g, sz), "Leg", [lw, yU, lw], [g * xt, yU / 2, sz * zl]);
  for (const sz of G) k.part(M(sz), "Leg", [lw, yU, lw], [xm, yU / 2, sz * zl]);
  for (const id of ["CR0", "CR1", "CRM"]) k.part(id, "Cross rail", [tC, hC, 2 * (zl - lw / 2)], [crX[id], yC, 0]);
  k.part("S1", "Stretcher", [xt + 40, 50, 40], [-(xt + 20) / 2 + 10, yS, 0]);
  k.part("S2", "Stretcher, with dowels", [xt, 50, 40], [20 + xt / 2, yS, 0]);
  const s2End = 20;

  const diag = (g: number, sz: number): V => [g * Math.SQRT1_2, 0, sz * Math.SQRT1_2];
  const bracketAt = (g: number, sz: number): V => [g * (xt - lw / 2 - 30), yA, sz * (zl - lw / 2 - 30)];
  const legNut = (g: number, sz: number) => {
    k.fit(LOCK, [bracketAt(g, sz)], diag(g, sz), L(g, sz), undefined, { hole: false });
    k.fit(NUT, [[bracketAt(g, sz)[0] - g * 3, yA, bracketAt(g, sz)[2] - sz * 3]], diag(g, sz), L(g, sz), undefined, { hole: false });
  };
  const railBolt = (rail: string, sz: number, y = yC) => {
    const x = crX[rail];
    k.fit(BARREL_S, [[x, yC + hC / 2, sz * (zl - lw / 2 - 30)]], [0, -1, 0], rail, undefined, { hole: false });
    k.fit({ kind: "bolt", len: 110, dia: 8 }, [[x, y, sz * (zl + lw / 2)]], [0, 0, -sz], legOf(rail, sz), rail);
  };

  k.step({ title: "Fit the barrel nuts and threaded rods in the end legs", detail: "A barrel nut in the top of each of the four end legs, then screw a rod in by hand until it stops.", tools: ["flathead"], pose: "+y", scene: "legs", kind: "bolts" }, () => {
    k.add(G.flatMap((g) => G.map((sz) => L(g, sz))), k.up(200));
    for (const g of G) for (const sz of G) k.fit(BARREL, [[g * xt, yU, sz * zl]], [0, -1, 0], L(g, sz), undefined, { hole: false });
    for (const g of G) for (const sz of G) k.fit(ROD, [[g * (xt - lw / 2), yA, sz * (zl - lw / 2)]], diag(g, sz), L(g, sz));
  });
  k.step({ title: "Tap the dowels into the cross rails", detail: "Two in each end of all three rails.", tools: ["hammer"], scene: "rails", kind: "dowels" }, () => {
    k.add(["CR0", "CR1", "CRM"], k.up(200));
    for (const id of ["CR0", "CR1", "CRM"]) for (const sz of G) k.fit(DOWEL, [-20, 20].map((dy): V => [crX[id], yC + dy, sz * (zl - lw / 2)]), [0, 0, sz], id, legOf(id, sz));
  });
  k.step({ title: "Fit a leg at each end", detail: "Lay the seat upside down on a rug. One leg in a corner at each end, on the same side, rod through the bracket. Spring washer and nut, tightened with the spanner.", tools: ["wrench"], pose: "-y", warnings: ["floor", "face"], kind: "legs" }, () => {
    k.add(["SEAT"], [0, 300, 0]);
    k.add([L(-1, -1), L(1, -1)], (id) => [id.startsWith("LG0") ? -260 : 260, 0, -260]);
    legNut(-1, -1);
    legNut(1, -1);
  });
  k.step({ title: "Bolt a cross rail to each of them", detail: "A barrel nut in the rail end, slot towards the bolt, then the long bolt through the leg.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
    k.add(["CR0", "CR1"], k.up());
    railBolt("CR0", -1);
    railBolt("CR1", -1);
  });
  k.step({ title: "Fit the other two end legs", detail: "Onto the free rail ends: barrel nut, then the long bolt through each leg.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
    k.add([L(-1, 1), L(1, 1)], (id) => [id.startsWith("LG0") ? -260 : 260, 0, 260]);
    railBolt("CR0", 1);
    railBolt("CR1", 1);
  });
  k.step({ title: "Fix them to the brackets", detail: "Spring washer and nut on each rod, tightened with the spanner.", tools: ["wrench"], kind: "bolts" }, () => {
    legNut(-1, 1);
    legNut(1, 1);
  });
  k.step({ title: "Tap a dowel into each middle leg", detail: "Near the top, in the side that goes against the seat frame.", tools: ["hammer"], pose: "+y", scene: "middle", kind: "dowels" }, () => {
    k.add([M(-1), M(1)], k.up(200));
    for (const sz of G) k.fit(DOWEL, [[xm + lw / 2, yA, sz * zl]], [1, 0, 0], M(sz), "SEAT");
  });
  k.step({ title: "Fit the middle legs and their cross rail", detail: "A barrel nut in each rail end, then a long bolt through each leg into it.", tools: ["flathead", "allen"], pose: "-y", kind: "bolts" }, () => {
    k.add([M(-1), M(1), "CRM"], k.up());
    railBolt("CRM", -1);
    railBolt("CRM", 1);
  });
  k.step({ title: "Bolt the middle legs to the seat frame", detail: "A barrel nut in the frame's middle rail, then a long bolt through each leg.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
    k.fit(BARREL_S, G.map((sz): V => [0, yA - ah / 2, sz * zl]), [0, 1, 0], "SEAT", undefined, { hole: false });
    for (const sz of G) k.fit({ kind: "bolt", len: 110, dia: 8 }, [[xm - lw / 2, yA, sz * zl]], [1, 0, 0], M(sz), "SEAT");
  });
  k.step({ title: "Fit the first stretcher", detail: "One of you holds it against the cross rails. One bolt up through the end rail into it.", tools: ["allen"], people: 2, kind: "bolts" }, () => {
    k.add(["S1"], k.up());
    k.fit({ kind: "bolt", len: 90, dia: 6 }, [[-xt, yC - hC / 2, 0]], [0, 1, 0], "CR0", "S1");
  });
  k.step({ title: "Tap two dowels into the second stretcher", detail: "In the end that meets the first stretcher.", tools: ["hammer"], pose: "+y", scene: "stretcher", kind: "dowels" }, () => {
    k.add(["S2"], k.up(200));
    k.fit(DOWEL, [-12, 12].map((dy): V => [s2End, yS + dy, 0]), [-1, 0, 0], "S2", "S1");
  });
  k.step({ title: "Fit the second stretcher", detail: "Its dowels go into the end of the first one. One screw up through the middle rail.", tools: ["allen"], people: 2, pose: "-y", kind: "bolts" }, () => {
    k.add(["S2"], k.up());
    k.fit({ kind: "screw", len: 90, dia: 6 }, [[xm, yC - hC / 2, 0]], [0, 1, 0], "CRM", "S1");
  });
  k.step({ title: "Bolt its far end", detail: "One bolt up through the other end rail.", tools: ["allen"], kind: "bolts" }, () => {
    k.fit({ kind: "bolt", len: 90, dia: 6 }, [[xt, yC - hC / 2, 0]], [0, 1, 0], "CR1", "S2");
  });
  k.step({ title: "Tighten the four nuts", detail: "On the rods in the corner brackets, with the spanner.", tools: ["wrench"], kind: "bolts" });
  k.step({ title: "Tighten every bolt", detail: "The three up into the stretchers and the eight through the legs.", tools: ["allen"], kind: "bolts" });
  k.step({ title: "Tap in the glides", detail: "One into the bottom of each leg, with a hammer.", tools: ["hammer"], kind: "legs" }, () => {
    for (const g of G) for (const sz of G) k.fit({ kind: "glide", len: 8, dia: 30, name: "Glide" }, [[g * xt, 0, sz * zl]], [0, 1, 0], L(g, sz), undefined, { hole: false });
    for (const sz of G) k.fit({ kind: "glide", len: 8, dia: 30, name: "Glide" }, [[xm, 0, sz * zl]], [0, 1, 0], M(sz), undefined, { hole: false });
  });
  k.step({ title: "Turn the bench over together", detail: "One at each end. Lift it by the seat.", pose: "+y", people: 2, kind: "standup" });
}

/* ---------- bench with storage 120: a shelf between two end frames, the seat on top ---------- */

function storageBench(k: Kit, s: ProductSpec) {
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const T = 35, yU = H - T;
  const lw = 55, a = 0.1;
  const xt = W / 2 - 120, xb = xt + Math.tan(a) * yU;
  const xc = (y: number) => xb + ((xt - xb) * y) / yU;
  const zl = D / 2 - 60;
  const yL = 150, yT = yU - 30;
  const xi = xc(yL) - lw / 2;
  const zlip = zl - lw / 2 - 15;

  const fr = rel([
    ...G.map((sz) => box([lw, yU / Math.cos(a), lw], [(xt + xb) / 2, yU / 2, sz * zl], [0, 0, a])),
    box([lw, 60, 2 * zl - lw], [xc(yT), yT, 0]),
    box([lw, 60, 2 * zl - lw], [xc(yL), yL, 0]),
  ]);
  for (const g of G) k.part(`F${g < 0 ? 0 : 1}`, "End frame", fr.size, [g * fr.mid[0], fr.mid[1], 0], { pieces: fr.pieces, rot: g < 0 ? TURN : undefined });
  k.part("SEAT", "Seat", [W, T, D], [0, H - T / 2, 0]);
  k.part("RL", "Shelf rail", [2 * xi, 50, 40], [0, yL, 0]);
  k.part("SH", "Shelf", [2 * xi - 10, 20, 2 * (zlip - 15)], [0, yL + 35, 0]);
  for (const sz of G) k.part(`LP${sz < 0 ? 0 : 1}`, "Shelf edge", [2 * xi, 70, 30], [0, yL + 20, sz * zlip]);
  const ax = xc(yU - 35) - lw / 2;
  for (const sz of G) k.part(`AP${sz < 0 ? 0 : 1}`, "Seat rail", [2 * ax, 70, 25], [0, yU - 35, sz * zl]);
  const F = (g: number) => `F${g < 0 ? 0 : 1}`;
  const frameBolt = (g: number) => {
    k.fit(BARREL_S, [[g * (xi - 35), yL, -20]], [0, 0, 1], "RL", undefined, { hole: false });
    k.fit({ kind: "bolt", len: 110, dia: 6 }, [[g * (xc(yL) + lw / 2), yL, 0]], [-g, 0, 0], F(g), "RL");
  };

  k.step({ title: "Tap two dowels into the shelf", detail: "Lay the shelf upside down on a rug. Use the short dowels here.", tools: ["hammer"], pose: "-y", warnings: ["floor"], kind: "dowels" }, () => {
    k.add(["SH"], k.up());
    k.fit(SHORT_DOWEL, G.map((g): V => [g * W * 0.2, yL + 25, 0]), [0, -1, 0], "SH", "RL");
  });
  k.step({ title: "Screw the rail onto the shelf", detail: "Down the middle, onto the dowels. Three screws.", tools: ["allen"], kind: "screws" }, () => {
    k.add(["RL"], k.up());
    k.fit({ kind: "screw", len: 50, dia: 5 }, [-0.3, 0, 0.3].map((f): V => [f * W, yL - 25, 0]), [0, 1, 0], "RL", "SH");
  });
  k.step({ title: "Bolt an end frame to the rail", detail: "Stand the shelf on its long edge. A barrel nut in the rail end, then a bolt through the frame into it.", tools: ["flathead", "allen"], pose: "+z", kind: "bolts" }, () => {
    k.add(["F0"], [-300, 0, 0]);
    frameBolt(-1);
  });
  k.step({ title: "Tap the dowels into the shelf edges", detail: "Two in each end of both edges. Use the long dowels.", tools: ["hammer"], pose: "+y", scene: "edges", kind: "dowels" }, () => {
    k.add(["LP0", "LP1"], k.up(200));
    for (const sz of G) for (const g of G) k.fit(DOWEL, [-18, 18].map((dy): V => [g * xi, yL + 20 + dy, sz * zlip]), [g, 0, 0], `LP${sz < 0 ? 0 : 1}`, F(g));
  });
  k.step({ title: "Stand it on the frame and fit the edges", detail: "Turn it up so the frame is on the floor. Push both edges into the frame, one each side of the shelf.", pose: "+x", kind: "join" }, () => k.add(["LP0", "LP1"], k.up()));
  k.step({ title: "Bolt on the second end frame", detail: "Down onto the dowels in the edges. Barrel nut in the rail end, then the bolt.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
    k.add(["F1"], k.up());
    frameBolt(1);
  });
  k.step({ title: "Turn it over onto the seat", detail: "Lay the seat upside down on the rug and lower the frames onto it. Two bolts down through the top of each frame.", tools: ["allen"], pose: "-y", warnings: ["face"], kind: "bolts" }, () => {
    k.add(["SEAT"], [0, 300, 0]);
    for (const g of G) k.fit({ kind: "bolt", len: 90, dia: 6 }, G.map((sz): V => [g * xc(yT), yT - 30, sz * zl * 0.5]), [0, 1, 0], F(g), "SEAT");
  });
  k.step({ title: "Tap the dowels into the seat", detail: "Two along each long side, for the seat rails. Short dowels.", tools: ["hammer"], kind: "dowels" }, () => {
    for (const sz of G) k.fit(SHORT_DOWEL, G.map((g): V => [g * xt * 0.5, yU, sz * zl]), [0, -1, 0], "SEAT", `AP${sz < 0 ? 0 : 1}`);
  });
  k.step({ title: "Bolt on the two seat rails", detail: "Between the frames, onto the dowels. Three bolts in each.", tools: ["allen"], kind: "bolts" }, () => {
    k.add(["AP0", "AP1"], k.up());
    for (const sz of G) k.fit({ kind: "bolt", len: 90, dia: 6 }, [-0.6, 0, 0.6].map((f): V => [f * ax, yU - 70, sz * zl]), [0, 1, 0], `AP${sz < 0 ? 0 : 1}`, "SEAT");
  });
  k.step({ title: "Tighten the frame bolts", detail: "The four through the tops of the frames, once more.", tools: ["allen"], kind: "bolts" });
  k.step({ title: "Turn the bench over", detail: "Lift it by the seat.", pose: "+y", kind: "standup" });
}

/* ---------- dining chair and bar stool: spindle back seat, two leg frames ---------- */

function windsor(k: Kit, s: ProductSpec, stool: boolean) {
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const ySeat = stool ? 620 : 460, ts = 40, yB = ySeat - ts;
  const dia = stool ? 400 : 430, zs = stool ? 10 : 20;
  const zBack = zs - dia / 2 + 45;
  const rh = stool ? 165 : 185, yh = H - rh - 14;
  const yCl = yB - 15, yT = yB - 30;
  const xT = stool ? 115 : 135, zT = stool ? 115 : 135;
  const xB = W / 2 - 25, zB = D * 0.43;
  const lg = 38;
  const yR1 = stool ? 330 : 200; // the rung in each leg frame
  const yR2 = 230; // the bar stool's front and back footrests
  const t = (y: number) => y / yT;
  const xc = (y: number) => xB + (xT - xB) * t(y);
  const zc = (y: number) => zB + (zT - zB) * t(y);

  // the seat comes with its back fitted: spindles under a bent hoop
  const pieces: PartPiece[] = [cyl(dia, ts, [0, ySeat - ts / 2, zs])];
  for (const g of G) pieces.push(cyl(26, yh - ySeat, [g * rh, (ySeat + yh) / 2, zBack]));
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * i) / n, a1 = (Math.PI * (i + 1)) / n;
    const p = strut([rh * Math.cos(a0), yh + rh * Math.sin(a0), zBack], [rh * Math.cos(a1), yh + rh * Math.sin(a1), zBack]);
    pieces.push({ shape: "cyl", size: [26, p.len + 4, 26], pos: p.pos, rot: p.rot });
  }
  for (const x of spread(-(rh - 55), rh - 55, stool ? 4 : 6)) {
    const top = yh + Math.sqrt(rh * rh - x * x);
    pieces.push(cyl(16, top - ySeat, [x, (ySeat + top) / 2, zBack]));
  }
  const seat = rel(pieces);
  k.part("SEAT", "Seat with back", seat.size, seat.mid, { pieces: seat.pieces });

  const leg = (sz: number) => {
    const p = strut([xB, 0, sz * zB], [xT, yT, sz * zT]);
    return { shape: "cyl" as const, size: [lg, p.len, lg] as V, pos: p.pos, rot: p.rot };
  };
  const fr = rel([...G.map(leg), box([40, 30, 2 * zT + 60], [xT, yCl, 0]), cyl(26, 2 * zc(yR1), [xc(yR1), yR1, 0], [Math.PI / 2, 0, 0])]);
  for (const g of G) k.part(`F${g < 0 ? 0 : 1}`, "Leg frame", fr.size, [g * fr.mid[0], fr.mid[1], 0], { pieces: fr.pieces, rot: g < 0 ? TURN : undefined });
  const F = (g: number) => `F${g < 0 ? 0 : 1}`;
  const seatBolts = (g: number, def: HwDef, washer: boolean) => {
    const pts = [-0.55, 0, 0.55].map((f): V => [g * xT, yCl - 15, f * zT]);
    if (washer) k.fit(LOCK, pts, [0, 1, 0], F(g), undefined, { hole: false });
    k.fit(def, pts, [0, 1, 0], F(g), "SEAT");
  };

  if (!stool) {
    k.part("X", "Cross stretcher", [28, 2 * xc(yR1) - 26, 28], [0, yR1, 0], { shape: "cyl", rot: [0, 0, Math.PI / 2] });
    const bolt: HwDef = { kind: "bolt", len: 40, dia: 6 };
    k.step({ title: "Lay the seat upside down on a table", detail: "On a cloth, with the back hanging over the edge so it stays scratch free.", pose: "-y", warnings: ["face"], kind: "join" }, () => k.add(["SEAT"], k.up()));
    k.step({ title: "Bolt on one leg frame", detail: "A spring washer on each bolt, three through the frame into the seat. Use the short bolts.", tools: ["allen"], kind: "bolts" }, () => {
      k.add(["F0"], k.up());
      seatBolts(-1, bolt, true);
    });
    k.step({ title: "Bolt on the other leg frame", detail: "The same way, three bolts with spring washers.", tools: ["allen"], kind: "bolts" }, () => {
      k.add(["F1"], k.up());
      seatBolts(1, bolt, true);
    });
    k.step({ title: "Bolt in the cross stretcher", detail: "A barrel nut in each end, slot towards the bolt, then a long bolt through each side rung into it.", tools: ["flathead", "allen"], kind: "bolts" }, () => {
      k.add(["X"], k.up());
      for (const g of G) k.fit(BARREL_S, [[g * (xc(yR1) - 13 - 30), yR1 + 14, 0]], [0, -1, 0], "X", undefined, { hole: false });
      for (const g of G) k.fit({ kind: "bolt", len: 80, dia: 6 }, [[g * (xc(yR1) + 13), yR1, 0]], [-g, 0, 0], F(g), "X");
    });
    k.step({ title: "Tighten all six seat bolts", detail: "Now that the stretcher holds the frames square. Tighten them again after two weeks.", tools: ["allen"], kind: "bolts" });
    k.step({ title: "Stand the chair up", detail: "Lift it off the table onto its legs.", pose: "+y", kind: "standup" });
    return;
  }

  for (const sz of G) k.part(`R${sz < 0 ? 0 : 1}`, "Footrest", [28, 2 * xc(yR2) - lg, 28], [0, yR2, sz * zc(yR2)], { shape: "cyl", rot: [0, 0, Math.PI / 2] });
  const rungs = (g: number) => {
    for (const sz of G) k.fit(BARREL_S, [[g * (xc(yR2) - lg / 2 - 30), yR2 + 14, sz * zc(yR2)]], [0, -1, 0], `R${sz < 0 ? 0 : 1}`, undefined, { hole: false });
    for (const sz of G) k.fit({ kind: "bolt", len: 70, dia: 6 }, [[g * (xc(yR2) + lg / 2), yR2, sz * zc(yR2)]], [-g, 0, 0], F(g), `R${sz < 0 ? 0 : 1}`);
  };
  k.step({ title: "Bolt the footrests to one leg frame", detail: "Stand the frame upside down. A barrel nut in each footrest end, then a long bolt through each leg.", tools: ["flathead", "allen"], pose: "-y", scene: "base", kind: "bolts" }, () => {
    k.add(["F0"], k.up(200));
    k.add(["R0", "R1"], [260, 0, 0]);
    rungs(-1);
  });
  k.step({ title: "Bolt on the other leg frame", detail: "Barrel nuts in the free footrest ends, then the two long bolts.", tools: ["flathead", "allen"], scene: "base", kind: "bolts" }, () => {
    k.add(["F1"], [260, 0, 0]);
    rungs(1);
  });
  k.step({ title: "Lay the seat upside down on a table", detail: "On a cloth, with the back hanging over the edge so it stays scratch free.", warnings: ["face"], kind: "join" }, () => k.add(["SEAT"], k.up()));
  k.step({ title: "Bolt the legs to the seat", detail: "Match the letters on the frames to the ones under the seat. Three short bolts in each frame, by hand: no drill.", tools: ["allen"], kind: "bolts" }, () => {
    k.add(["F0", "F1", "R0", "R1"], k.up());
    for (const g of G) seatBolts(g, { kind: "bolt", len: 40, dia: 6 }, false);
  });
  k.step({ title: "Tighten all the bolts", detail: "The four in the footrests and the six in the seat. Tighten them again after two weeks.", tools: ["allen"], kind: "bolts" });
  k.step({ title: "Turn the stool over", detail: "Lift it off the table onto its legs.", pose: "+y", kind: "standup" });
}

const family: Family = {
  names: ["SKOGSTA"],
  build(b, s) {
    const v = `${s.slug ?? ""} ${s.variant}`.toLowerCase();
    const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
    const k = new Kit(b);
    if (/bar.stool/.test(v)) windsor(k, s, true);
    else if (/chair/.test(v)) windsor(k, s, false);
    else if (/bench/.test(v)) {
      if (/storage/.test(v)) storageBench(k, s);
      else bench(k, s);
    } else if (/table/.test(v)) {
      if (H > 850) counter(k, s);
      else if (Math.abs(W - D) < 20) roundTable(k, s);
      else trestle(k, s);
    } else return false;
    return true;
  },
};
export default family;
