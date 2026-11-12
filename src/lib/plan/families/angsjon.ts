import type { Family } from "./family";
import type { PartMaterial, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/**
 * ÄNGSJÖN, read from its manuals. Every cabinet hangs on a suspension rail that comes in the box, screwed level to
 * the wall with a spacer behind each screw. A wash-stand has two sides, a bottom, a narrow front rail along the
 * bottom (and a middle panel with two drawers) and no top or back, so the pipes can come up behind it: brackets and
 * suspension fittings are screwed onto the sides lying flat, the runners go on, then the frame is built lying on its
 * front: the panels click into the sides and are locked with wedge clips pushed into their back edges. The drawers
 * slide together without tools (sides onto the bottom, the front down into the sides, the back hooked on) and are
 * locked with plastic plugs and turn clips; wide ones get a support on the back and dividers. A pair of wash-stands,
 * or a wash-stand with HAGAÅN open cabinets beside it, are hung one by one and screwed together, then the
 * countertop (on battens screwed to the wall) and the basin go on. The high and wall cabinets are built lying on
 * their fronts too, with a back panel slid in down grooves, and the door clips onto hinge plates.
 */

const T = 16;
const SCREW: HwDef = { kind: "screw", len: 13, dia: 3.5 }; // the small screws for brackets, fittings and hinge plates
const RUNNER_SCREW: HwDef = { kind: "screw", len: 15, dia: 3.5 };
const SUPPORT_SCREW: HwDef = { kind: "screw", len: 10, dia: 4 };
const LOCK: HwDef = { kind: "screw", len: 12, dia: 6 }; // through each suspension fitting into the rail
const FIT_LOCK: HwDef = { kind: "screw", len: 30, dia: 4 }; // tightens a high or wall cabinet's suspension fitting
const JOIN: HwDef = { kind: "screw", len: 40, dia: 5 };
const WASHER: HwDef = { kind: "washer", len: 2, dia: 24 };
const BRACKET: HwDef = { kind: "angle", len: 40, dia: 30 };
const SUSPENSION: HwDef = { kind: "hook", len: 60, dia: 40 };
const CLIP_WHITE: HwDef = { kind: "clip", len: 40, dia: 12 }; // the white wedge clips, one at each end of a panel
const CLIP_GREY: HwDef = { kind: "clip", len: 50, dia: 14 }; // the grey ones, two at each end of the front rail
const SPACER: HwDef = { kind: "spacer", len: 8, dia: 20 };
const BUMPER: HwDef = { kind: "glide", len: 3, dia: 12 };
const STAY: HwDef = { kind: "hook", len: 40, dia: 6 }; // the bent wires in a drawer
const PLUG: HwDef = { kind: "clip", len: 30, dia: 8 }; // the plastic plugs that lock a drawer's sides
const TURN: HwDef = { kind: "cam", len: 10, dia: 18 }; // the turn clips on a drawer's sides
const SUPPORT: HwDef = { kind: "angle", len: 200, dia: 24 }; // the metal support on the back of a wide drawer
const RIVET: HwDef = { kind: "clip", len: 12, dia: 8 }; // a sleeve and its pin, through the back
const BACK_CLIP: HwDef = { kind: "clip", len: 16, dia: 12 };
const STOP: HwDef = { kind: "glide", len: 3, dia: 10 }; // the door bumpers
const SHELF_LOCK: HwDef = { kind: "pin", len: 16, dia: 5 }; // with a screw-in peg, it locks the shelf
const SHELF_PIN: HwDef = { kind: "pin", len: 12, dia: 5 };
const COVER: HwDef = { kind: "cap", len: 10, dia: 40 };
const FOOT: HwDef = { kind: "spacer", len: 20, dia: 30 }; // the high cabinet's spacers at the bottom back
const TRAP: HwDef = { kind: "connector", len: 200, dia: 40 };
const BATTEN_SCREW: HwDef = { kind: "screw", len: 50, dia: 5, notIncluded: true };

const r = (n: number) => Math.round(n * 10) / 10;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const spread = (a: number, b: number, n: number) => (n === 1 ? [(a + b) / 2] : range(n).map((i) => r(a + ((b - a) * i) / (n - 1))));

/* ---------- what each guide is made of ---------- */

type Kind = "drawers" | "drawer" | "open" | "openLow";
interface Unit {
  kind: Kind;
  w: number;
  x0: number;
  H: number;
  D: number;
}
type Basin = "on" | "orrsjon" | "double" | "semi";
interface Layout {
  units: Unit[];
  us: boolean;
  counter: boolean;
  basin?: Basin;
  basinX?: number; // the semi-recessed basin's centre, as a fraction from the middle (-0.5 left end)
}

/** The cabinets in each guide, left to right, from IKEA's photo of it (the US ones are a little deeper and taller). */
function layoutOf(s: ProductSpec): Layout | null {
  const slug = s.slug ?? "";
  const us = /bathroom-vanity|-6-2$|122-x-53|124-5|155-x|170-x/.test(slug);
  const D = us ? 535 : 480;
  const hi = us ? 640 : 630, lo = us ? 335 : 330;
  const u = (kind: Kind, w: number): Unit => ({ kind, w, x0: 0, H: kind === "drawers" || kind === "open" ? hi : lo, D });
  const pick = (): [Unit[], boolean, Basin | undefined, number?] | null => {
    if (/wash-stand-drawers-40-x-48/.test(slug)) return [[u("drawers", 400)], false, undefined];
    if (/bathroom-vanity-drawers-45-5/.test(slug)) return [[u("drawers", 455)], false, undefined];
    if (/wash-stand-drawer-60-x-48/.test(slug)) return [[u("drawer", 600)], false, undefined];
    if (/bathroom-vanity-drawer-76/.test(slug)) return [[u("drawer", 760)], false, undefined];
    if (/wash-stnd-w-drawer-wash-basin-6-2$/.test(slug)) return [[u("drawer", 615)], false, "on"];
    if (/wash-stnd-w-drawer-wash-basin-6$/.test(slug)) return [[u("drawer", 600)], false, "on"];
    if (/backsjon-wash-stnd-w-drawers-wash-basin$/.test(slug)) return [[u("drawers", 600)], false, "on"];
    if (/orrsjon-wash-stnd-w-drawers-wash-basin/.test(slug)) return [[u("drawers", 600)], false, "orrsjon"];
    if (/wash-stnd-w-drawers-wash-basin-2$/.test(slug)) return [[u("drawers", 1000)], true, "semi", -0.2];
    if (/wash-stand-wash-basin-102-x-49$/.test(slug)) return [[u("drawers", 600), u("open", 400)], true, "semi", -0.2];
    if (/wash-stand-wash-basin-122-x-53/.test(slug)) return [[u("drawers", 610), u("drawers", 610)], false, "double"];
    if (/wash-stand-wash-basin-124-5-x-5$/.test(slug)) return [[u("drawer", 760), u("openLow", 455)], true, "semi", -0.19];
    if (/wash-stand-wash-basin-124-5-x-5-2$/.test(slug)) return [[u("drawers", 615), u("drawers", 615)], true, "semi", -0.25];
    if (/wash-stand-wash-basin-155-x-54/.test(slug)) return [[u("open", 455), u("drawers", 615), u("open", 455)], true, "semi", 0];
    if (/wash-stand-wash-basin-170-x-54/.test(slug)) return [[u("openLow", 455), u("drawer", 760), u("openLow", 455)], true, "semi", 0];
    return null;
  };
  const p = pick();
  if (!p) return null;
  const [units, counter, basin, basinX] = p;
  const total = units.reduce((a, x) => a + x.w, 0);
  let x = -total / 2;
  for (const un of units) {
    un.x0 = r(x + un.w / 2);
    x += un.w;
  }
  return { units, us, counter, basin, basinX };
}

/** Counts that change with a wash-stand's width, from the table at the front of its manual. */
function countsOf(u: Unit) {
  const w = u.w;
  const cls = w < 500 ? 40 : w < 700 ? 60 : w < 850 ? 80 : w < 1100 ? 100 : 120;
  return {
    spacers: { 40: 4, 60: 5, 80: 6, 100: 8, 120: 8 }[cls]!,
    stays: cls === 40 ? 1 : 2,
    dividers: cls === 40 ? 0 : cls <= 80 ? 1 : 2,
    support: cls >= 80,
  };
}

/* ---------- a small layer over the builder ---------- */

interface StepO {
  detail?: string;
  kind?: StepKind;
  tools?: ToolId[];
  pose?: Pose;
  scene?: string;
  people?: 1 | 2;
  warnings?: WarnId[];
  repeat?: number;
  check?: "square";
  wall?: boolean;
}

class Guide {
  private types = new Map<string, string>();
  private poses = new Map<string, Pose>();
  constructor(public b: PlanBuilder) {}

  part(name: string, size: Vec3, pos: Vec3, o: { material?: PartMaterial; pieces?: PartPiece[]; rot?: Vec3 } = {}) {
    const sz = size.map(r) as Vec3;
    const key = `${name}|${sz.join("x")}|${o.material ?? "board"}`;
    let t = this.types.get(key);
    if (!t) {
      t = this.b.part(name, sz, { material: o.material });
      if (o.pieces) this.b.parts[this.b.parts.length - 1].pieces = o.pieces;
      this.types.set(key, t);
    }
    return this.b.place(t, pos.map(r) as Vec3, o.rot ?? [0, 0, 0]);
  }
  /** The pose stays until a later step in the same scene changes it, as the manual's drawings do. */
  step(title: string, o: StepO, body: () => void) {
    const scene = o.scene ?? "main";
    const pose = o.pose ?? this.poses.get(scene) ?? "+y";
    this.poses.set(scene, pose);
    this.b.step({ title, detail: o.detail, kind: o.kind ?? "general", tools: o.tools, pose, scene, people: o.people, warnings: o.warnings, repeat: o.repeat, check: o.check, wall: o.wall }, body);
  }
  fits(def: HwDef, list: FitOpts[], gap = 0.08) {
    if (list.length) this.b.fits(def, list.map((f) => ({ ...f, at: f.at.map(r) as Vec3 })), gap);
  }
  /** Parts arriving together, each from its own offset. */
  adds(list: [string, Vec3][], gap = 0.2) {
    this.b.stagger(gap);
    for (const [k, from] of list) this.b.add(k, from);
    this.b.then(0.12);
  }
}

/** Both sides of a cabinet lying flat on a rug, inside up, tops pointing away from each other. */
function laySides(g: Guide, sides: [string, string], H: number) {
  g.b.stagger(0.2);
  sides.forEach((k, i) => {
    const sx = i ? 1 : -1;
    g.b.stage(k, [sx * (H / 2 + 40), T / 2, 0], [0, 0, sx < 0 ? Math.PI / 2 : -Math.PI / 2], [0, 220, 0]);
  });
  g.b.then(0.15);
}

/* ---------- the wash-stands and HAGAÅN open cabinets ---------- */

interface Drawer {
  front: string;
  sides: [string, string];
  bottom: string;
  back: string;
  dividers: string[];
  x0: number;
  yb: number; // bottom of the box
  hb: number;
  bw: number; // box width outside
  dd: number; // box depth
  zf: number; // back face of the front
  u: Unit;
}

interface Built {
  u: Unit;
  sides: [string, string];
  panels: string[];
  rail: string;
  railY: number;
  drawers: Drawer[];
  prepFits: [HwDef, FitOpts][];
  frameFits: [HwDef, FitOpts][];
}

const RAIL_DROP = { wash: 115, open: 109 };

function buildWash(g: Guide, u: Unit): Built {
  const { x0, w, H, D } = u;
  const n = u.kind === "drawers" ? 2 : 1;
  const iw = w - 2 * T;
  const xs = (sx: number) => x0 + sx * (w / 2 - T / 2);
  const sides: [string, string] = [-1, 1].map((sx) => g.part("Side panel", [T, H, D], [xs(sx), H / 2, 0])) as [string, string];
  const strip = 24;
  const bottom = g.part("Bottom panel", [iw, T, D - T], [x0, T / 2, -T / 2]);
  const fh = n === 2 ? (H - 33) / 2 : H - 30;
  const fronts = n === 2 ? [27, 27 + fh + 3] : [27];
  const panels = [bottom];
  if (n === 2) panels.push(g.part("Middle panel", [iw, T, D - 40], [x0, 27 + fh + 1.5, -20]));
  const frontRail = g.part("Front rail", [iw, strip, T], [x0, strip / 2, D / 2 - T / 2]);
  const railY = H - RAIL_DROP.wash;
  const rail = g.part("Suspension rail", [iw - 4, 40, 8], [x0, railY, -D / 2 + 4], { material: "metal" });

  // the drawers, in place
  const zf = D / 2 - 18;
  const dd = Math.floor((D - 18 - 60) / 50) * 50;
  const bw = iw - 26;
  const hb = r(fh - 90);
  const fw = iw - 4;
  const c = countsOf(u);
  const frontPieces: PartPiece[] = [
    { shape: "box", size: [r(fw), r(fh - 20), 18], pos: [0, -10, 0] },
    { shape: "box", size: [r(fw), 20, 10], pos: [0, r(fh / 2 - 10), -4] },
  ];
  const drawers: Drawer[] = fronts.map((y0) => {
    const yb = y0 + 30;
    const zc = zf - dd / 2;
    const divW = r(bw / 3);
    const divXs = c.dividers === 1 ? [x0] : c.dividers === 2 ? [x0 - bw / 4, x0 + bw / 4] : [];
    return {
      front: g.part("Drawer front", [fw, fh, 18], [x0, y0 + fh / 2, D / 2 - 9], { pieces: frontPieces }),
      sides: [-1, 1].map((sx) => g.part("Drawer side", [T, hb, dd], [x0 + sx * (bw / 2 - T / 2), yb + hb / 2, zc])) as [string, string],
      bottom: g.part("Drawer bottom", [bw - 2 * T, T, dd - T], [x0, yb + T / 2, zf - (dd - T) / 2]),
      back: g.part("Drawer back", [bw - 2 * T, hb - 30, T], [x0, yb + T + (hb - 30) / 2, zf - dd + T / 2]),
      dividers: divXs.map((x) => g.part("Divider", [divW, hb - 60, 12], [x, yb + T + (hb - 60) / 2, zf - dd * 0.62])),
      x0,
      yb,
      hb,
      bw,
      dd,
      zf,
      u,
    };
  });

  const inner = (sx: number) => x0 + sx * (w / 2 - T);
  const prepFits: [HwDef, FitOpts][] = [];
  const frameFits: [HwDef, FitOpts][] = [];
  for (const [i, sx] of [-1, 1].entries()) {
    const on = sides[i];
    prepFits.push([BRACKET, { on, at: [inner(sx), 70, -D / 2 + 22], dir: [sx, 0, 0], hole: false }]);
    for (const [dy, dz] of [[-10, -8], [10, 8]]) prepFits.push([SCREW, { on, at: [inner(sx), 70 + dy, -D / 2 + 22 + dz], dir: [sx, 0, 0] }]);
  }
  for (const [i, sx] of [-1, 1].entries()) {
    const on = sides[i];
    prepFits.push([SUSPENSION, { on, at: [inner(sx), H - 70, -D / 2 + 30], dir: [sx, 0, 0], hole: false }]);
    for (const y of [H - 40, H - 70, H - 100]) prepFits.push([SCREW, { on, at: [inner(sx), y, -D / 2 + 52], dir: [sx, 0, 0] }]);
  }
  const runner: HwDef = { kind: "runner", len: dd, dia: 40 };
  for (const d of drawers)
    for (const [i, sx] of [-1, 1].entries()) {
      const on = sides[i];
      const zc = zf - dd / 2;
      prepFits.push([runner, { on, at: [inner(sx), d.yb + 20, zc], dir: [sx, 0, 0], hole: false }]);
      for (const dz of [-dd / 2 + 40, dd / 2 - 40]) prepFits.push([RUNNER_SCREW, { on, at: [inner(sx), d.yb + 20, zc + dz], dir: [sx, 0, 0] }]);
    }
  // wedge clips: white ones into the back edge of each panel by the sides, grey ones into the back of the front rail
  for (const p of panels) {
    const y = g.b.partItem(p).final.pos[1];
    for (const sx of [-1, 1]) frameFits.push([CLIP_WHITE, { on: p, at: [inner(sx) - sx * 22, y, -D / 2], dir: [0, 0, 1], hole: false }]);
  }
  for (const sx of [-1, 1]) for (const dx of [18, 48]) frameFits.push([CLIP_GREY, { on: frontRail, at: [inner(sx) - sx * dx, strip / 2, D / 2 - T], dir: [0, 0, 1], hole: false }]);
  return { u, sides, panels: [...panels, frontRail], rail, railY, drawers, prepFits, frameFits };
}

function buildOpen(g: Guide, u: Unit): Built {
  const { x0, w, H, D } = u;
  const iw = w - 2 * T;
  const sides: [string, string] = [-1, 1].map((sx) => g.part("Side panel", [T, H, D], [x0 + sx * (w / 2 - T / 2), H / 2, 0])) as [string, string];
  const pd = D - 14;
  const bottom = g.part("Top and bottom", [iw, T, pd], [x0, T / 2, 7]);
  const top = g.part("Top and bottom", [iw, T, pd], [x0, H - T / 2, 7]);
  const panels = [bottom];
  if (u.kind === "open") panels.push(g.part("Shelf", [iw, T, pd], [x0, H / 2, 7]));
  panels.push(top);
  const back = g.part("Back panel", [iw, H - 2 * T, 4], [x0, H / 2, -D / 2 + 9], { material: "fiber" });
  const railY = H - RAIL_DROP.open;
  const rail = g.part("Suspension rail", [iw - 4, 40, 6], [x0, railY, -D / 2 + 3], { material: "metal" });
  const inner = (sx: number) => x0 + sx * (w / 2 - T);
  const prepFits: [HwDef, FitOpts][] = [];
  for (const [i, sx] of [-1, 1].entries()) {
    prepFits.push([SUSPENSION, { on: sides[i], at: [inner(sx), H - 70, -D / 2 + 30], dir: [sx, 0, 0], hole: false }]);
    for (const y of [H - 40, H - 70, H - 100]) prepFits.push([SCREW, { on: sides[i], at: [inner(sx), y, -D / 2 + 52], dir: [sx, 0, 0] }]);
  }
  const frameFits: [HwDef, FitOpts][] = [];
  for (const p of [bottom, top]) {
    const y = g.b.partItem(p).final.pos[1];
    for (const sx of [-1, 1]) frameFits.push([RIVET, { on: back, at: [x0 + (sx * iw) / 4, y, -D / 2 + 7], dir: [0, 0, 1], mate: p }]);
  }
  return { u, sides, panels: [...panels, back], rail, railY, drawers: [], prepFits, frameFits };
}

const fitAll = (g: Guide, list: [HwDef, FitOpts][], gap = 0.07) => {
  // one call per kind keeps the timing tidy
  const by = new Map<HwDef, FitOpts[]>();
  for (const [d, o] of list) by.set(d, [...(by.get(d) ?? []), o]);
  for (const [d, os] of by) {
    g.fits(d, os, gap);
    g.b.then(0.08);
  }
};
const presetAll = (g: Guide, list: [HwDef, FitOpts][]) => {
  for (const [d, o] of list) g.b.preset(d, { ...o, at: o.at.map(r) as Vec3 });
};

/** A wash-stand's frame, from its manual: brackets, fittings and runners on the flat sides, then the panels click in with it lying on its front. */
function washFrameSteps(g: Guide, f: Built, scene: string) {
  const { u } = f;
  const prep = `${scene}-prep`;
  const n = f.drawers.length;
  const brackets = f.prepFits.slice(0, 6);
  const suspension = f.prepFits.slice(6, 14);
  const runners = f.prepFits.slice(14);
  g.step("Screw the small brackets onto the sides", { detail: "Lay both sides on a rug, inside up. One bracket near the bottom back corner of each, two screws each.", kind: "screws", tools: ["screwdriver"], scene: prep, warnings: ["floor"] }, () => {
    laySides(g, f.sides, u.H);
    fitAll(g, brackets);
  });
  g.step("Screw the suspension fittings into the top back corners", { detail: "Left and right are marked. Three small screws each, with the hook sticking out past the back edge.", kind: "screws", tools: ["screwdriver"], scene: prep }, () => fitAll(g, suspension));
  g.step(n === 2 ? "Screw the runners onto the sides" : "Screw a runner onto each side", { detail: "Each runner sits on its row of holes, front end to the front edge. Two screws each.", kind: "runners", tools: ["screwdriver"], scene: prep }, () => fitAll(g, runners, 0.12));

  const [bottom, ...others] = f.panels;
  const mid = n === 2 ? others[0] : undefined;
  const frontRail = others[others.length - 1];
  const up: Vec3 = [0, 0, -260]; // lying on its front, "from above" is from the back
  g.step("Click the bottom onto one side", { detail: "Stand a side on its front edge on the rug. Push the pins on the bottom's end into the keyholes, slide it along and press down until it clicks.", kind: "join", pose: "-z", warnings: ["floor"], scene }, () => {
    g.adds([[f.sides[1], [220, 0, 0]], [bottom, up]]);
  });
  if (mid) g.step("Click the middle panel on", { detail: "The same way, into the keyholes halfway up the side.", kind: "join", scene }, () => g.adds([[mid, up]]));
  g.step("Click the front rail on", { detail: "The narrow rail goes along the bottom front edge, its pins in the holes at the very front.", kind: "join", scene }, () => g.adds([[frontRail, up]]));
  g.step("Press the other side on", { detail: "Line its keyholes up with every pin, then press down along the panels until they all click.", kind: "join", scene }, () => g.adds([[f.sides[0], [-260, 0, 0]]]));
  const white = f.frameFits.filter(([d]) => d === CLIP_WHITE);
  const grey = f.frameFits.filter(([d]) => d === CLIP_GREY);
  g.step(mid ? "Lock the bottom and the middle panel with the white clips" : "Lock the bottom with the white clips", { detail: "One at each end, in the hole next to the side. Push it in and fold it down flat into its groove.", kind: "general", warnings: ["hand"], scene }, () => fitAll(g, white, 0.15));
  g.step("Lock the front rail with the grey clips", { detail: "Two at each end. The grey ones are longer; don't mix them up with the white ones.", kind: "general", scene }, () => fitAll(g, grey, 0.15));
  g.step("Stand it up and check it's square", { detail: "The corners should be right angles. Push it gently until they are.", kind: "standup", pose: "+y", check: "square", scene }, () => {});
}

function openFrameSteps(g: Guide, f: Built, scene: string) {
  const { u } = f;
  const prep = `${scene}-prep`;
  const tall = u.kind === "open";
  const [bottom, ...rest] = f.panels;
  const back = rest[rest.length - 1];
  const top = rest[rest.length - 2];
  const shelf = tall ? rest[0] : undefined;
  const up: Vec3 = [0, 0, -260];
  g.step("Screw the suspension fittings onto the open cabinet's sides", { detail: "Lay both sides on a rug, inside up. Left and right are marked; three small screws each, in the top back corner.", kind: "screws", tools: ["screwdriver"], scene: prep, warnings: ["floor"] }, () => {
    laySides(g, f.sides, u.H);
    fitAll(g, f.prepFits);
  });
  if (tall) {
    g.step("Click the bottom onto one side", { detail: "Stand the side on its front edge. Pins into the keyholes, slide it along and press down until it clicks.", kind: "join", scene, pose: "-z", warnings: ["floor"] }, () => g.adds([[f.sides[1], [220, 0, 0]], [bottom, up]]));
    g.step("Click on the shelf and the top", { detail: "The same way, two clicks for each.", kind: "join", scene }, () => g.adds([[shelf!, up], [top, up]]));
  } else {
    g.step("Click the top and bottom onto one side", { detail: "Stand the side on its front edge. Pins into the keyholes, slide each along and press down until it clicks.", kind: "join", scene, pose: "-z", warnings: ["floor"] }, () => g.adds([[f.sides[1], [220, 0, 0]], [bottom, up], [top, up]]));
  }
  g.step("Press the other side on", { detail: "Line up all its keyholes, then press down until every panel clicks.", kind: "join", scene }, () => g.adds([[f.sides[0], [-260, 0, 0]]]));
  g.step("Slide the back panel in", { detail: "Smooth side in. It runs down the grooves in both sides from the top end.", kind: "join", scene }, () => g.adds([[back, [0, 520, 0]]]));
  g.step("Push the rivets through the back", { detail: "Two into the top and two into the bottom: the sleeve first, then press its pin in.", kind: "general", scene }, () => fitAll(g, f.frameFits, 0.15));
  g.step("Stand it up", { detail: "Check that it stands square.", kind: "standup", scene, pose: "+y", check: "square" }, () => {});
}

/** The suspension rail on the wall, the cabinet hooked on and locked, and on a wash-stand its bottom screwed to the wall. */
function hangSteps(g: Guide, f: Built, i: number, all: Built[]) {
  const { u } = f;
  const wash = u.kind === "drawers" || u.kind === "drawer";
  const what = wash ? "wash-stand" : "open cabinet";
  const n = wash ? countsOf(u).spacers : 4;
  const L = u.w - 2 * T - 4;
  const zr = g.b.partItem(f.rail).final.pos[2];
  const xsR = spread(u.x0 - L / 2 + 30, u.x0 + L / 2 - 30, n);
  g.step(i ? "Screw the next rail to the wall" : "Screw the suspension rail to the wall", {
    detail: `Mark a level line for the top of the ${what}; the rail's screw holes sit ${wash ? 13 : 11} cm below it.${i ? " Line it up with the first rail." : ""} A spacer goes behind each screw. Wall screws and plugs aren't included: pick ones made for your wall.`,
    kind: "anchor",
    tools: ["drill", "level", "pencil", "screwdriver"],
    pose: "+y",
    wall: true,
    warnings: ["wall"],
  }, () => {
    g.adds([[f.rail, [0, 0, 160]]]);
    g.fits(HW.plug, xsR.map((x) => ({ at: [x, f.railY, -u.D / 2 - 1], dir: [0, 0, -1] })), 0.1);
    g.b.then(0.05);
    g.fits(SPACER, xsR.map((x) => ({ on: f.rail, at: [x, f.railY, zr - 4], dir: [0, 0, -1], hole: false })), 0.1);
    g.b.then(0.05);
    g.fits(HW.wallScrew, xsR.map((x) => ({ on: f.rail, at: [x, f.railY, zr + 4], dir: [0, 0, -1] })), 0.1);
  });
  const big = u.w >= 750 || u.kind === "drawer";
  g.step(i ? `Hang the ${what} beside it` : `Hang the ${what} on the rail`, {
    detail: "Lift it so both suspension fittings hook over the rail. Then turn their screws with the Allen key until it hangs level.",
    kind: "anchor",
    tools: ["allen", "level"],
    people: big ? 2 : 1,
    wall: true,
    warnings: big ? ["two", "wall"] : ["wall"],
  }, () => {
    if (i) g.adds([...f.sides, ...f.panels].map((k): [string, Vec3] => [k, [0, 0, 320]]), 0);
  });
  if (i) {
    const prev = all[i - 1];
    const xb = u.x0 - u.w / 2;
    const yTop = Math.min(u.H, prev.u.H);
    g.step("Screw it to the cabinet beside it", { detail: "Two screws through the side, 4 cm in from the front edge: one near the top, one near the bottom.", kind: "screws", tools: ["screwdriver", "drill"] }, () =>
      g.fits(JOIN, [yTop - 60, 60].map((y) => ({ on: f.sides[0], at: [xb + T, y, u.D / 2 - 40], dir: [-1, 0, 0], mate: prev.sides[1] })), 0.2),
    );
  }
  const fx = (sx: number) => u.x0 + sx * (u.w / 2 - T - 16);
  g.step("Lock it to the rail", { detail: "A screw and a washer through each suspension fitting into the rail, so it can't be lifted off.", kind: "screws", tools: ["screwdriver"] }, () => {
    g.fits(WASHER, [-1, 1].map((sx) => ({ on: f.sides[sx < 0 ? 0 : 1], at: [fx(sx), f.railY, zr + 8], dir: [0, 0, -1], hole: false })), 0.15);
    g.b.then(0.05);
    g.fits(LOCK, [-1, 1].map((sx) => ({ on: f.sides[sx < 0 ? 0 : 1], at: [fx(sx), f.railY, zr + 9], dir: [0, 0, -1], mate: f.rail })), 0.15);
  });
  if (wash) {
    const bx = (sx: number) => u.x0 + sx * (u.w / 2 - T - 22);
    g.step("Screw the bottom to the wall", { detail: "Through the hole in each small bracket, with a washer. Drill and plug the wall first; screws and plugs aren't included.", kind: "anchor", tools: ["drill", "screwdriver"], wall: true, warnings: ["wall"] }, () => {
      g.fits(HW.plug, [-1, 1].map((sx) => ({ at: [bx(sx), 70, -u.D / 2 - 1], dir: [0, 0, -1] })), 0.15);
      g.b.then(0.05);
      g.fits(WASHER, [-1, 1].map((sx) => ({ on: f.sides[sx < 0 ? 0 : 1], at: [bx(sx), 70, -u.D / 2 + 5], dir: [0, 0, -1], hole: false })), 0.15);
      g.b.then(0.05);
      g.fits(HW.wallScrew, [-1, 1].map((sx) => ({ on: f.sides[sx < 0 ? 0 : 1], at: [bx(sx), 70, -u.D / 2 + 6], dir: [0, 0, -1] })), 0.15);
    });
  }
}

/** The drawers, from the second half of the manual: built once (the rest the same way), then clicked onto the runners. */
function drawerSteps(g: Guide, ds: Drawer[]) {
  if (!ds.length) return;
  const b = g.b;
  const d0 = ds[0];
  const c = countsOf(d0.u);
  const rep = ds.length > 1 ? ds.length : undefined;
  const fitsOf = (d: Drawer) => {
    const xi = (sx: number) => d.x0 + sx * (d.bw / 2 - T);
    const zBack = d.zf - d.dd;
    const yIn = d.yb + T;
    const stayXs = c.stays === 1 ? [d.x0] : [d.x0 - d.bw / 4, d.x0 + d.bw / 4];
    const divs = d.dividers.map((k) => b.partItem(k).final.pos);
    return {
      bumpers: [-1, 1].map((sx): [HwDef, FitOpts] => [BUMPER, { on: d.bottom, at: [d.x0 + sx * (d.bw / 2 - T - 30), yIn, d.zf - 12], dir: [0, -1, 0], hole: false }]),
      stays: stayXs.map((x): [HwDef, FitOpts] => [STAY, { on: d.bottom, at: [x, yIn, zBack + 60], dir: [0, -1, 0] }]),
      plugs: [-1, 1].flatMap((sx, i) => [zBack + 60, d.zf - 60].map((z): [HwDef, FitOpts] => [PLUG, { on: d.sides[i], at: [d.x0 + sx * (d.bw / 2), d.yb + T / 2, z], dir: [-sx, 0, 0], mate: d.bottom }])),
      turns: [-1, 1].flatMap((sx, i) => [zBack + 30, d.zf - 30].map((z): [HwDef, FitOpts] => [TURN, { on: d.sides[i], at: [xi(sx) + (sx * T) / 2, d.yb + d.hb, z], dir: [0, -1, 0] }])),
      support: c.support ? [[SUPPORT, { on: d.back, at: [d.x0, d.yb + d.hb / 2, zBack], dir: [0, 0, 1], hole: false }] as [HwDef, FitOpts]] : [],
      supportScrews: c.support ? [d.yb + 25, d.yb + d.hb / 2, d.yb + d.hb - 30].map((y): [HwDef, FitOpts] => [SUPPORT_SCREW, { on: d.back, at: [d.x0, y, zBack - 2], dir: [0, 0, 1] }]) : [],
      holders: divs.flatMap((p) => [-1, 1].map((sx): [HwDef, FitOpts] => [STAY, { on: d.bottom, at: [p[0] + sx * (d.bw / 6 + 8), yIn, p[2]], dir: [0, -1, 0] }])),
    };
  };
  const all = (f: ReturnType<typeof fitsOf>) => [...f.bumpers, ...f.stays, ...f.plugs, ...f.turns, ...f.support, ...f.supportScrews, ...f.holders];
  const c0: Vec3 = [d0.x0, d0.yb + d0.hb / 2, d0.zf - d0.dd / 2];
  const stage = (k: string, from: Vec3) => {
    const p = b.partItem(k).final.pos;
    b.stage(k, [p[0] - c0[0], p[1] - c0[1], p[2] - c0[2]], [0, 0, 0], from);
  };
  const f0 = fitsOf(d0);
  const dstep = (title: string, detail: string, body: () => void, kind: StepKind = "drawer", tools?: ToolId[]) => g.step(title, { detail, kind, tools, scene: "drawer", repeat: rep }, body);
  dstep("Stick the bumpers onto the drawer bottom", "Lay the bottom on a rug, holes up. One soft bumper in each front corner.", () => {
    stage(d0.bottom, [0, 200, 0]);
    b.then(0.15);
    fitAll(g, f0.bumpers, 0.15);
  });
  dstep(c.stays > 1 ? "Push the wire stays into the bottom" : "Push the wire stay into the bottom", "Into the holes near the back edge, both legs down.", () => fitAll(g, f0.stays, 0.15));
  dstep("Push the sides onto the bottom", "Grooves facing in. Each one slides over the end of the bottom.", () => {
    b.stagger(0.25);
    stage(d0.sides[0], [-200, 0, 0]);
    stage(d0.sides[1], [200, 0, 0]);
  });
  dstep("Slide the front down into the sides", "Its edges run down the grooves at the front ends of the sides, all the way to the bottom.", () => stage(d0.front, [0, 300, 0]));
  dstep("Hook the back on", "Lower it between the back ends of the sides so its hooks catch in their slots.", () => stage(d0.back, [0, 260, 0]));
  dstep("Lock it with the plugs and the turn clips", "Push two plugs through each side into the bottom. Then drop the clips into the holes on top of the sides and turn each one a quarter turn.", () => {
    fitAll(g, f0.plugs, 0.1);
    fitAll(g, f0.turns, 0.12);
  }, "general", ["screwdriver"]);
  if (c.support)
    dstep("Screw the support onto the back", "The metal support runs up the middle of the back, outside. Three screws.", () => {
      fitAll(g, f0.support, 0.1);
      fitAll(g, f0.supportScrews, 0.12);
    }, "screws", ["screwdriver"]);
  if (d0.dividers.length)
    dstep(d0.dividers.length > 1 ? "Drop in the dividers" : "Drop in the divider", "Push two wire holders into the bottom for each, then lower the divider between them.", () => {
      fitAll(g, f0.holders, 0.12);
      b.stagger(0.25);
      for (const k of d0.dividers) stage(k, [0, 220, 0]);
    });
  g.step(ds.length > 2 ? `Pull the runners out and click on all ${ds.length} drawers` : ds.length === 2 ? "Pull the runners out and click on both drawers" : "Pull the runner out and click on the drawer", {
    detail: "Lay each drawer on its pair of runners and push it back until both catches click. The fronts can be adjusted up and down with the levers under them.",
    kind: "drawer",
    warnings: ["tip"],
  }, () => {
    for (const [i, d] of ds.entries()) {
      b.stagger(0);
      for (const k of [d.front, ...d.sides, d.bottom, d.back, ...d.dividers]) b.add(k, [0, 0, 460]);
      if (i > 0) presetAll(g, all(fitsOf(d)));
      b.wait(0.22);
    }
  });
  b.steps[b.steps.length - 1].quiet = true;
}

/** A basin drawn as its rim round a bowl (or two), open at the top. */
function bowl(w: number, h: number, d: number, bowls: 1 | 2, deck = 80, rim = 25): PartPiece[] {
  const zc = r((deck - rim) / 2);
  const inD = r(d - rim - deck);
  const out: PartPiece[] = [
    { shape: "box", size: [r(w), r(h), rim], pos: [0, 0, r(d / 2 - rim / 2)] },
    { shape: "box", size: [r(w), r(h), deck], pos: [0, 0, r(-d / 2 + deck / 2)] },
    { shape: "box", size: [rim, r(h), inD], pos: [r(-w / 2 + rim / 2), 0, zc] },
    { shape: "box", size: [rim, r(h), inD], pos: [r(w / 2 - rim / 2), 0, zc] },
    { shape: "box", size: [r(w - 2 * rim), 10, inD], pos: [0, r(-h / 2 + 5), zc] },
  ];
  if (bowls === 2) out.push({ shape: "box", size: [60, r(h), inD], pos: [0, 0, zc] });
  return out;
}

function topSteps(g: Guide, s: ProductSpec, lay: Layout, built: Built[]) {
  const units = lay.units;
  const Hc = Math.max(...units.map((u) => u.H));
  const Htot = s.size.h * 10;
  const sumW = units.reduce((a, u) => a + u.w, 0);
  const D = units[0].D;
  const wide = sumW >= 1000;
  if (lay.counter) {
    const Wc = Math.max(sumW + 10, Math.min(sumW + 40, s.size.w * 10));
    const Dc = Math.max(D + 10, s.size.d * 10);
    // the support battens: one inside the back of each wash-stand, under the countertop
    const washes = built.filter((f) => f.drawers.length);
    const battens = washes.map((f) => g.part("Support batten", [f.u.w - 2 * T - 10, 40, 18], [f.u.x0, Hc - 20, -D / 2 + 9], { material: "wood" }));
    g.step(battens.length > 1 ? "Screw the support battens to the wall" : "Screw the support batten to the wall", {
      detail: "From the countertop's box. Level with the top of the sides, inside the back of the wash-stand. Wall screws and plugs aren't included.",
      kind: "anchor",
      tools: ["drill", "level", "screwdriver"],
      wall: true,
      warnings: ["wall"],
    }, () => {
      g.adds(battens.map((k): [string, Vec3] => [k, [0, 0, 220]]));
      const pts = washes.flatMap((f) => spread(f.u.x0 - f.u.w / 2 + 80, f.u.x0 + f.u.w / 2 - 80, 3).map((x, j) => ({ x, k: battens[washes.indexOf(f)], j })));
      g.fits(HW.plug, pts.map((p) => ({ at: [p.x, Hc - 20, -D / 2 - 1], dir: [0, 0, -1] })), 0.08);
      g.b.then(0.05);
      g.fits(BATTEN_SCREW, pts.map((p) => ({ on: p.k, at: [p.x, Hc - 20, -D / 2 + 18], dir: [0, 0, -1] })), 0.08);
    });
    const top = g.part("Countertop", [Wc, 18, Dc], [0, Hc + 9, -D / 2 + Dc / 2]);
    g.step("Lay the countertop on", {
      detail: "Run a thin bead of silicone along the tops of the sides and the batten first (not included). Lower it on square, against the wall, and leave weights on it while the silicone sets.",
      kind: "join",
      people: wide ? 2 : 1,
      warnings: wide ? ["two"] : [],
    }, () => g.adds([[top, [0, 300, 0]]]));
    const bw = 470, bd = 380, bh = Math.max(50, Htot - Hc - 18);
    const bx = r((lay.basinX ?? 0) * Wc);
    const basin = g.part("Wash-basin", [bw, bh, bd], [bx, Hc + 18 + bh / 2, -D / 2 + Dc - 30 - bd / 2], { pieces: bowl(bw, bh, bd, 1, 70, 20) });
    g.step("Cut the hole and set the wash-basin in", {
      detail: "The basin has its own box and instructions: draw round its template on the countertop, drill and saw out the hole, seal the edge and lower the basin in on a bead of silicone.",
      kind: "join",
      tools: ["drill", "pencil", "tape"],
    }, () => g.adds([[basin, [0, 260, 0]]]));
    trapStep(g, basin, [bx, Hc + 18, -D / 2 + Dc - 30 - bd / 2]);
    return;
  }
  // a basin that sits right on the wash-stand
  const u = units[0];
  const bh = Math.max(50, Htot - Hc);
  const bw = lay.basin === "orrsjon" ? 620 : lay.basin === "double" ? sumW : Math.max(u.w, s.size.w * 10);
  const bd = lay.basin === "orrsjon" ? 490 : D;
  const basin = g.part(lay.basin === "double" ? "Double wash-basin" : "Wash-basin", [bw, bh, bd], [0, Hc + bh / 2, -D / 2 + bd / 2], {
    pieces: bowl(bw, bh, bd, lay.basin === "double" ? 2 : 1),
  });
  g.step(lay.basin === "double" ? "Lay the double wash-basin on" : "Lay the wash-basin on", {
    detail: "It comes in its own box with its own instructions: fit the tap first if you can, run a bead of silicone along the tops of the sides and lower it on square.",
    kind: "join",
    people: 2,
    warnings: ["two"],
  }, () => g.adds([[basin, [0, 300, 0]]]));
  trapStep(g, basin, [0, Hc, 0], lay.basin === "double");
}

function trapStep(g: Guide, basin: string, at: Vec3, two = false) {
  g.step("Fit the water trap", { detail: two ? "From its own box: one trap takes both outlets. Screw it on and push its pipe into the drain in the wall." : "From its own box: screw it to the basin's outlet and push its pipe into the drain in the wall.", kind: "general", tools: ["wrench"] }, () =>
    g.fits(TRAP, [{ on: basin, at, dir: [0, 1, 0], hole: false }]),
  );
}

function washStands(b: PlanBuilder, s: ProductSpec, lay: Layout) {
  const g = new Guide(b);
  const built = lay.units.map((u) => (u.kind === "drawers" || u.kind === "drawer" ? buildWash(g, u) : buildOpen(g, u)));
  const sameAs = (i: number) => built.findIndex((f, j) => j < i && f.u.kind === built[i].u.kind && f.u.w === built[i].u.w);
  built.forEach((f, i) => {
    const scene = i ? `u${i}` : "main";
    const twin = sameAs(i);
    if (twin >= 0) {
      const wash = f.drawers.length > 0;
      g.step(wash ? "Build the other wash-stand the same way" : "Build the other open cabinet the same way", { detail: wash ? "Brackets, suspension fittings and runners on its sides, then click it together lying on its front and lock the clips." : "Suspension fittings on its sides, then click it together lying on its front, slide in the back and push in the rivets.", kind: "join", scene, tools: ["screwdriver"] }, () => {
        g.adds([...f.sides, ...f.panels].map((k): [string, Vec3] => [k, [0, 160, 0]]), 0.06);
        presetAll(g, [...f.prepFits, ...f.frameFits]);
      });
    } else if (f.drawers.length) washFrameSteps(g, f, scene);
    else openFrameSteps(g, f, scene);
    hangSteps(g, f, i, built);
  });
  drawerSteps(g, built.flatMap((f) => f.drawers));
  if (lay.basin) topSteps(g, s, lay, built);
}

/* ---------- the high cabinet and the wall cabinet ---------- */

function doorCabinet(b: PlanBuilder, s: ProductSpec, high: boolean) {
  const g = new Guide(b);
  const us = /45-5/.test(s.slug ?? "");
  const W = high ? (us ? 455 : 400) : us ? 455 : 400;
  const H = high ? (us ? 1955 : 1950) : us ? 940 : 950;
  const D = high ? (us ? 380 : 350) : 150;
  const Dc = D - 18;
  const z0 = -D / 2, cz = z0 + Dc / 2;
  const iw = W - 2 * T;
  const pd = Dc - 12, pz = cz + 6;
  const sides: [string, string] = [-1, 1].map((sx) => g.part("Side panel", [T, H, Dc], [sx * (W / 2 - T / 2), H / 2, cz])) as [string, string];
  const top = g.part("Top and bottom", [iw, T, pd], [0, H - T / 2, pz]);
  const bottom = g.part("Top and bottom", [iw, T, pd], [0, T / 2, pz]);
  const yMid = r(H * 0.5);
  const mid = high ? g.part("Fixed shelf", [iw, T, pd], [0, yMid, pz]) : "";
  const back = g.part("Back panel", [iw, H - 2 * T, 4], [0, H / 2, z0 + 8], { material: "fiber" });
  const door = g.part("Door", [W - 4, H - 4, 18], [0, H / 2, D / 2 - 9]);
  const sd = Dc - 30, sz = cz + 6 + 6;
  const lowYs = high ? spread(T, yMid, 4).slice(1, 3) : [];
  const upYs = high ? spread(yMid, H - T, 5).slice(1, 4) : spread(T, H - T, 6).slice(1, 5);
  const lowShelves = lowYs.map((y) => g.part("Shelf", [iw - 2, T, sd], [0, y, sz]));
  const upShelves = upYs.map((y) => g.part("Shelf", [iw - 2, T, sd], [0, y, sz]));
  const railY = H - (high ? 60 : 55);
  const rail = g.part("Suspension rail", [iw - 4, 40, 6], [0, railY, z0 + 3], { material: "metal" });

  const inner = (sx: number) => sx * (W / 2 - T);
  const side = (sx: number) => sides[sx < 0 ? 0 : 1];
  const bracketYs = high ? [H - 60, 60] : [H - 60];
  const brackets: [HwDef, FitOpts][] = [];
  for (const sx of [-1, 1])
    for (const y of bracketYs) {
      brackets.push([BRACKET, { on: side(sx), at: [inner(sx), y, z0 + 22], dir: [sx, 0, 0], hole: false }]);
      for (const [dy, dz] of [[-10, -8], [10, 8]]) brackets.push([SCREW, { on: side(sx), at: [inner(sx), y + dy, z0 + 22 + dz], dir: [sx, 0, 0] }]);
    }
  const hingeYs = high ? [120, yMid + 40, H - 120] : [100, H - 100];
  const plateScrews: [HwDef, FitOpts][] = hingeYs.flatMap((y) => [-16, 16].map((dy): [HwDef, FitOpts] => [SCREW, { on: sides[0], at: [inner(-1), y + dy, z0 + Dc - 37], dir: [-1, 0, 0] }]));
  const up: Vec3 = [0, 0, -260];

  g.step(high ? "Screw the small brackets onto the sides" : "Screw a small bracket onto each side", {
    detail: high ? "Lay both sides on a rug, inside up. One near the top back corner and one near the bottom back corner of each, two screws each." : "Lay both sides on a rug, inside up. One near the top back corner of each, two screws each.",
    kind: "screws",
    tools: ["screwdriver"],
    scene: "prep",
    warnings: ["floor"],
  }, () => {
    laySides(g, sides, H);
    fitAll(g, brackets);
  });
  g.step("Screw the hinge plates onto one side", { detail: `On the side the door should hang from, at the front edge: ${hingeYs.length} plates, two screws each. We show them on the left; either side works.`, kind: "screws", tools: ["screwdriver"], scene: "prep" }, () => fitAll(g, plateScrews, 0.1));
  g.step("Click the top and bottom onto one side", { detail: "Stand a side on its front edge on the rug. Pins into the keyholes, slide each along and press down until it clicks.", kind: "join", pose: "-z", warnings: ["floor"] }, () =>
    g.adds([[sides[1], [220, 0, 0]], [top, up], [bottom, up]]),
  );
  if (high) g.step("Click the fixed shelf on", { detail: "Into the keyholes halfway up the side.", kind: "join" }, () => g.adds([[mid, up]]));
  g.step("Press the other side on", { detail: "Line up all its keyholes, then press down until every panel clicks.", kind: "join" }, () => g.adds([[sides[0], [-260, 0, 0]]]));
  g.step("Slide the back panel in", { detail: "Smooth side in. It runs down the grooves in both sides from the bottom end.", kind: "join" }, () => g.adds([[back, [0, -Math.min(900, H * 0.6), 0]]]));
  const rivetYs = high ? [H - T / 2, yMid, T / 2] : [H - T / 2, T / 2];
  const rivetMate = (y: number) => (y > H - 30 ? top : y < 30 ? bottom : mid);
  g.step("Push the rivets through the back", { detail: `Two into the top, two into the bottom${high ? " and two into the fixed shelf" : ""}: the sleeve first, then press its pin in.`, kind: "general" }, () =>
    fitAll(g, rivetYs.flatMap((y) => [-1, 1].map((sx): [HwDef, FitOpts] => [RIVET, { on: back, at: [(sx * iw) / 4, y, z0 + 6], dir: [0, 0, 1], mate: rivetMate(y) }])), 0.15),
  );
  if (!high)
    g.step("Press in the back clips", { detail: "Three down each side, over the edge of the back panel. Press them in by hand, not with a hammer.", kind: "general", warnings: ["hand"] }, () =>
      fitAll(g, [-1, 1].flatMap((sx) => spread(H * 0.2, H * 0.8, 3).map((y): [HwDef, FitOpts] => [BACK_CLIP, { on: side(sx), at: [inner(sx) - sx * 6, y, z0 + 4], dir: [0, 0, 1], hole: false }])), 0.1),
    );
  // they sit in the top's back corners with their hooks reaching back over the rail
  const sus: [HwDef, FitOpts][] = [-1, 1].map((sx) => [SUSPENSION, { on: top, at: [sx * (W / 2 - T - 30), H - T / 2, z0 + 12], dir: [0, 0, 1], hole: false }]);
  const susLock: [HwDef, FitOpts][] = [-1, 1].map((sx) => [FIT_LOCK, { on: top, at: [sx * (W / 2 - T - 30), H, z0 + 40], dir: [0, -1, 0] }]);
  const feet: [HwDef, FitOpts][] = [-1, 1].map((sx) => [FOOT, { on: side(sx), at: [sx * (W / 2 - T / 2), 50, z0], dir: [0, 0, 1], hole: false }]);
  const fitSus = () => g.step("Clip in the suspension fittings", { detail: "Left and right are marked. Each one clicks into the top at a back corner; check it sits flush with the edge.", kind: "general" }, () => fitAll(g, sus, 0.2));
  const lockSus = () => g.step("Screw the suspension fittings tight", { detail: "One screw in each. Don't overtighten it.", kind: "screws", tools: ["screwdriver"], warnings: ["hand"] }, () => fitAll(g, susLock, 0.2));
  const fitFeet = () => g.step("Screw on the wall spacers", { detail: "One at each bottom corner on the back edge, so the cabinet hangs straight.", kind: "screws", tools: ["screwdriver"] }, () => fitAll(g, feet, 0.2));
  if (high && !us) {
    fitFeet();
    fitSus();
    lockSus();
  } else {
    fitSus();
    lockSus();
    if (high) fitFeet();
  }
  const xsR = spread(-(iw - 4) / 2 + 30, (iw - 4) / 2 - 30, 4);
  g.step("Screw the suspension rail to the wall", {
    detail: `Mark a level line for the top of the cabinet; the rail's screw holes sit 3.5 cm below it. A spacer goes behind each screw. Wall screws and plugs aren't included: pick ones made for your wall.`,
    kind: "anchor",
    tools: ["drill", "level", "pencil", "screwdriver"],
    pose: "+y",
    wall: true,
    warnings: ["wall"],
  }, () => {
    g.adds([[rail, [0, 0, 160]]]);
    g.fits(HW.plug, xsR.map((x) => ({ at: [x, railY, z0 - 1], dir: [0, 0, -1] })), 0.1);
    g.b.then(0.05);
    g.fits(SPACER, xsR.map((x) => ({ on: rail, at: [x, railY, z0 - 1], dir: [0, 0, -1], hole: false })), 0.1);
    g.b.then(0.05);
    g.fits(HW.wallScrew, xsR.map((x) => ({ on: rail, at: [x, railY, z0 + 6], dir: [0, 0, -1] })), 0.1);
  });
  g.step("Hang the cabinet on the rail", { detail: "Lift it together so both fittings hook over the rail, then turn their screws with the Allen key until it hangs level.", kind: "anchor", tools: ["allen", "level"], people: 2, wall: true, warnings: ["two", "wall"] }, () => {});
  const bx = (sx: number) => sx * (W / 2 - T - 22);
  g.step("Lock it to the rail", { detail: "A screw and a washer through each top bracket into the rail, then click a cover over each bracket.", kind: "screws", tools: ["screwdriver"] }, () => {
    g.fits(WASHER, [-1, 1].map((sx) => ({ on: side(sx), at: [bx(sx), railY, z0 + 8], dir: [0, 0, -1], hole: false })), 0.15);
    g.b.then(0.05);
    g.fits(LOCK, [-1, 1].map((sx) => ({ on: side(sx), at: [bx(sx), railY, z0 + 9], dir: [0, 0, -1], mate: rail })), 0.15);
    g.b.then(0.05);
    g.fits(COVER, [-1, 1].map((sx) => ({ on: side(sx), at: [bx(sx), H - 60, z0 + 30], dir: [0, 0, -1], hole: false })), 0.15);
  });
  if (high)
    g.step("Screw the bottom to the wall", { detail: "Through each bottom bracket with a washer, then click on the covers. Drill and plug the wall first; screws and plugs aren't included.", kind: "anchor", tools: ["drill", "screwdriver"], wall: true, warnings: ["wall"] }, () => {
      g.fits(HW.plug, [-1, 1].map((sx) => ({ at: [bx(sx), 60, z0 - 1], dir: [0, 0, -1] })), 0.15);
      g.b.then(0.05);
      g.fits(WASHER, [-1, 1].map((sx) => ({ on: side(sx), at: [bx(sx), 60, z0 + 8], dir: [0, 0, -1], hole: false })), 0.15);
      g.b.then(0.05);
      g.fits(HW.wallScrew, [-1, 1].map((sx) => ({ on: side(sx), at: [bx(sx), 60, z0 + 9], dir: [0, 0, -1] })), 0.15);
      g.b.then(0.05);
      g.fits(COVER, [-1, 1].map((sx) => ({ on: side(sx), at: [bx(sx), 60, z0 + 30], dir: [0, 0, -1], hole: false })), 0.15);
    });
  // the door: hinges screwed on with it face down on a rug, then clicked onto the plates
  const hinges: FitOpts[] = hingeYs.map((y) => ({ on: door, at: [-(W / 2 - 24), y, D / 2 - 18], dir: [0, 0, 1] }));
  g.step(`Fit the ${hingeYs.length} hinges into the door`, { detail: "Lay the door face down on a rug. Press each hinge into its round hole and screw it in.", kind: "hinges", tools: ["screwdriver"], scene: "door", warnings: ["floor"] }, () => {
    g.b.stage(door, [0, 9, 0], [Math.PI / 2, 0, 0], [0, 200, 0]);
    g.b.then(0.15);
    g.fits(HW.hinge, hinges, 0.2);
  });
  // it stays open on its hinges while the shelves go in, and closes at the end
  const swing = -1.75;
  const hx = -W / 2 + 2, hz = D / 2;
  const vx = W / 2 - 4, vz = -9;
  const openPos: Vec3 = [r(hx + vx * Math.cos(swing) + vz * Math.sin(swing)), H / 2, r(hz - vx * Math.sin(swing) + vz * Math.cos(swing))];
  g.step("Click the door onto the hinge plates", { detail: "Hook each hinge onto its plate and press until it clicks. The screws on the hinges set the gaps even.", kind: "doors", people: high ? 2 : 1, warnings: high ? ["two"] : [] }, () =>
    g.b.stage(door, openPos, [0, swing, 0], [0, 0, 320]),
  );
  const pins = (ys: number[]): FitOpts[] => ys.flatMap((y) => [-1, 1].flatMap((sx) => [sz - sd / 2 + 30, sz + sd / 2 - 30].map((z): FitOpts => ({ on: side(sx), at: [inner(sx), y - T / 2 - 3, z], dir: [sx, 0, 0] }))));
  if (high) {
    g.step("Put in the lower shelves", { detail: "Below the fixed shelf: four locking supports for each, then lay the shelf on and turn the pegs into it.", kind: "shelves" }, () => {
      g.fits(SHELF_LOCK, pins(lowYs), 0.05);
      g.b.then(0.1);
      g.adds(lowShelves.map((k): [string, Vec3] => [k, [0, 0, 300]]));
    });
    g.step("Put in the upper shelves", { detail: "Above the fixed shelf: four clip-in supports for each, at the heights you want. Press the shelf down until it clicks.", kind: "shelves" }, () => {
      g.fits(SHELF_PIN, pins(upYs), 0.04);
      g.b.then(0.1);
      g.adds(upShelves.map((k): [string, Vec3] => [k, [0, 0, 300]]));
    });
  } else {
    g.step("Put in the shelves", { detail: "Four clip-in supports for each shelf, at the heights you want. Press each shelf down until it clicks.", kind: "shelves" }, () => {
      g.fits(SHELF_PIN, pins(upYs), 0.04);
      g.b.then(0.1);
      g.adds(upShelves.map((k): [string, Vec3] => [k, [0, 0, 220]]));
    });
  }
  g.step("Stick on the door bumpers", { detail: `${hingeYs.length === 3 ? "Three" : "Two"} along the front edge of the side opposite the hinges, then close the door: it shuts quietly against them.`, kind: "general" }, () => {
    g.fits(STOP, hingeYs.map((y) => ({ on: sides[1], at: [W / 2 - T / 2, y, z0 + Dc], dir: [0, 0, -1], hole: false })), 0.15);
    g.b.then(0.2);
    g.b.add(door);
  });
  return true;
}

const family: Family = {
  names: ["ÄNGSJÖN"],
  build(b, s) {
    const slug = s.slug ?? "";
    if (/angsjon-high-cabinet/.test(slug)) return doorCabinet(b, s, true);
    if (/angsjon-wall-cabinet/.test(slug)) return doorCabinet(b, s, false);
    const lay = layoutOf(s);
    if (!lay) return false;
    washStands(b, s, lay);
    return true;
  },
};
export default family;
