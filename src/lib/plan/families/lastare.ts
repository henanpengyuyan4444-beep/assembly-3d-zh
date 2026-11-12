import type { Family } from "./family";
import type { PartMaterial, Pose, ProductSpec, Vec3 } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/*
 * LÄSTARE, read from IKEA's manuals.
 *
 * Frames 100 high (40, 60 wide, with or without doors): the bottom goes upside down on a rug for its foot sockets,
 * feet and (60 wide) a middle glide, then cam bolts on its top face. The sides take dowels at both ends and stand
 * on it with cam locks, the back slides down their grooves, the top goes on with cam bolts and locks, and plastic
 * clips hold the back. Two spring wall fittings sit in the top back corners and are screwed to the wall through
 * the back, with covers over them. Doors take bumpers and hinges lying down, then hang on the sides.
 * The 200 high frame is screwed instead: it lies on one side, the top and bottom go on with dowels and long screws,
 * then the back and the other side, and it is turned on its front for the clips and stood up by two people.
 * The height extension has no bottom: a U of two sides and a solid back, a top, and it locks onto the tall frame's
 * top. The wall mounted frame hangs on a rail screwed to the wall, with two brackets low down. The bench and the
 * table are open: sides on glides, a back panel (and under the table's top two rails) on dowels and cam locks.
 */

const T = 16;
const FOOT_H = 7;

const SOCKET: HwDef = { kind: "stud", len: 10, dia: 12, name: "Foot socket" };
const FOOT: HwDef = { kind: "foot", len: FOOT_H, dia: 30 };
const MID_GLIDE: HwDef = { kind: "glide", len: FOOT_H, dia: 24, name: "Glide" };
const GLIDE: HwDef = { kind: "glide", len: 4, dia: 24, name: "Glide" };
const CLIP: HwDef = { kind: "clip", len: 12, dia: 10, name: "Back clip" };
const WALL_FIT: HwDef = { kind: "bracket", len: 50, dia: 34, name: "Wall fitting" };
const SPACER: HwDef = { kind: "spacer", len: 20, dia: 30 };
const WALL_SCREW: HwDef = { kind: "screw", len: 80, dia: 5 };
const PLUG: HwDef = { kind: "plug", len: 35, dia: 8 };
const COVER: HwDef = { kind: "cap", len: 4, dia: 30, name: "Cover cap" };
const HOLE_CAP: HwDef = { kind: "cap", len: 2, dia: 10, name: "Hole cap" };
const BUMPER: HwDef = { kind: "glide", len: 2, dia: 8, name: "Door bumper" };
const FRAME_SCREW: HwDef = { kind: "screw", len: 50, dia: 7 };
const ROUND_CAM: HwDef = { kind: "cam", len: 13, dia: 20, name: "Round cam lock" };
const RAIL_SCREW: HwDef = { kind: "screw", len: 60, dia: 5 };
const RAIL_WASHER: HwDef = { kind: "washer", len: 2, dia: 14, name: "Square washer" };
const HANGER: HwDef = { kind: "bracket", len: 60, dia: 40, name: "Hanging fitting" };
const BRACKET: HwDef = { kind: "angle", len: 40, dia: 30, name: "Wall bracket" };
const BRACKET_SCREW: HwDef = { kind: "screw", len: 12, dia: 4 };
const HANGER_SCREW: HwDef = { kind: "screw", len: 16, dia: 4 };
const BRACKET_WALL_SCREW: HwDef = { kind: "screw", len: 40, dia: 5 };
const BIG_WASHER: HwDef = { kind: "washer", len: 2, dia: 24 };
const BRACKET_COVER: HwDef = { kind: "cap", len: 20, dia: 34, name: "Bracket cover" };
const RAIL_TO_TOP: HwDef = { kind: "screw", len: 30, dia: 6 };

const WALL_WORDS = "The screws and plugs in the bag suit most solid walls. For a hollow or wooden wall, use fittings made for it.";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const spread = (a: number, c: number, n: number) => range(n).map((i) => (n === 1 ? (a + c) / 2 : a + ((c - a) * i) / (n - 1)));
const SG = [-1, 1] as const;

/* ---------- small helpers ---------- */

function put(b: PlanBuilder, name: string, size: Vec3, pos: Vec3, o: { material?: PartMaterial; extra?: boolean } = {}) {
  return b.place(b.part(name, size, o), pos);
}
function putMany(b: PlanBuilder, name: string, size: Vec3, at: Vec3[], material?: PartMaterial) {
  const t = b.part(name, size, { material });
  return at.map((p) => b.place(t, p));
}
const pt = (on: string, at: Vec3, dir: Vec3, o: Partial<FitOpts> = {}): FitOpts => ({ on, at, dir, ...o });
const fin = (b: PlanBuilder, key: string) => b.partItem(key).final.pos;

/** Lay a part flat in a scene of its own: sides on their face, panels upside down. */
const FLAT_SIDE: Vec3 = [0, 0, Math.PI / 2];
const UPSIDE: Vec3 = [0, 0, Math.PI];
const FACE_DOWN: Vec3 = [Math.PI / 2, 0, 0];

/* ---------- the frames ---------- */

interface Box {
  W: number;
  H: number;
  D: number;
  y0: number; // underside of the bottom
}
interface Carcass {
  bottom: string;
  top: string;
  L: string;
  R: string;
  back: string;
  zBack: number; // back face of the back panel
}

function carcass(b: PlanBuilder, g: Box, inset = 10): Carcass {
  const { W, H, D, y0 } = g;
  const bottom = put(b, "Bottom panel", [W, T, D], [0, y0 + T / 2, 0]);
  const top = put(b, "Top panel", [W, T, D], [0, y0 + H - T / 2, 0]);
  const [L, R] = putMany(b, "Side panel", [T, H - 2 * T, D], SG.map((s) => [s * (W / 2 - T / 2), y0 + H / 2, 0] as Vec3));
  const zb = -D / 2 + inset;
  const back = put(b, "Back panel", [W - 2 * T, H - 2 * T, 3], [0, y0 + H / 2, zb + 1.5], { material: "fiber" });
  return { bottom, top, L, R, back, zBack: zb };
}

/** Steps 1 to 3 of every standing frame: the bottom upside down on a rug for its sockets, feet and middle glide. */
function bottomSteps(b: PlanBuilder, g: Box, c: Carcass, glide: boolean) {
  const { W, D, y0 } = g;
  const feet = SG.flatMap((sx) => SG.map((sz) => [sx * (W / 2 - 40), y0, sz * (D / 2 - 40)] as Vec3));
  b.step(
    { title: "Tap the foot sockets into the bottom", detail: "Lay the bottom panel upside down on a rug, then tap a socket into each corner hole until it sits flush.", tools: ["hammer"], scene: "bottom", kind: "general", warnings: ["floor"] },
    () => {
      b.stage(c.bottom, [0, T / 2, 0], UPSIDE, [0, 160, 0]);
      b.then(0.15);
      b.fits(SOCKET, feet.map((at) => pt(c.bottom, at, [0, 1, 0])), 0.12);
    },
  );
  b.step({ title: "Screw the feet into the sockets", detail: "By hand, all the way in. You can turn them out later to level the frame.", scene: "bottom", kind: "legs" }, () =>
    b.fits(FOOT, feet.map((at) => pt(c.bottom, at, [0, 1, 0], { hole: false })), 0.12),
  );
  if (glide)
    b.step({ title: "Press the glide into the middle", detail: "Its two pegs go into the holes in the middle of the front edge. It keeps the bottom from sagging.", scene: "bottom", kind: "general" }, () =>
      b.fit(MID_GLIDE, pt(c.bottom, [0, y0, D / 2 - 40], [0, 1, 0])),
    );
}

/** A frame 100 high: everything on cam locks, built standing on its feet. */
function camFrame(b: PlanBuilder, g: Box, c: Carcass, glide: boolean) {
  const { W, H, D, y0 } = g;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const zc = D / 2 - 40, zd = D / 2 - 110;
  const sideOf = (sx: number) => (sx < 0 ? c.L : c.R);
  bottomSteps(b, g, c, glide);
  b.step(
    { title: "Turn the bottom over and screw in the cam bolts", detail: "Four bolts in its top face, by hand until they stop.", tools: ["screwdriver"], scene: "bottom", kind: "cams" },
    () => {
      b.stage(c.bottom, [0, T / 2 + FOOT_H, 0], [0, 0, 0]);
      b.then(0.15);
      b.fits(HW.camScrew, SG.flatMap((sx) => SG.map((sz) => pt(c.bottom, [sx * xs, y0 + T, sz * zc], [0, -1, 0], { mate: sideOf(sx), mateHole: 4 }))), 0.1);
    },
  );
  b.step(
    { title: "Tap the dowels into both ends of the sides", detail: "Two at each end of both sides. Tap them gently until they stop.", tools: ["hammer"], scene: "sides", kind: "dowels" },
    () => {
      b.stagger(0.2);
      SG.forEach((sx, i) => b.stage(sideOf(sx), [0, T / 2, (i - 0.5) * (D + 60)], FLAT_SIDE, [0, 160, 0]));
      b.then(0.15);
      const list: FitOpts[] = [];
      for (const sx of SG)
        for (const sz of SG) {
          list.push(pt(sideOf(sx), [sx * xs, y0 + T, sz * zd], [0, 1, 0], { mate: c.bottom }));
          list.push(pt(sideOf(sx), [sx * xs, y0 + H - T, sz * zd], [0, -1, 0], { mate: c.top }));
        }
      b.fits(HW.dowel, list, 0.06);
    },
  );
  b.step({ title: "Stand the sides on the bottom", detail: "Holes facing in, onto the dowels and cam bolts. The grooves for the back go at the back.", kind: "join" }, () => {
    b.add(c.bottom, [0, 120, 0]);
    b.then(0.15);
    b.add(c.L, [0, 300, 0]);
    b.add(c.R, [0, 300, 0]);
  });
  b.step({ title: "Lock the cam locks", detail: "Arrow towards the bolt, then turn each one clockwise until it pulls the side tight.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => SG.map((sz) => pt(sideOf(sx), [sx * xi, y0 + T + 25, sz * zc], [sx, 0, 0]))), 0.12),
  );
  b.step({ title: "Slide the back panel down the grooves", detail: "White side to the front. Push it down until it sits in the groove in the bottom.", kind: "join" }, () => b.add(c.back, [0, H, 0]));
  b.step(
    { title: "Screw the cam bolts into the top", detail: "Lay the top upside down. Four bolts, by hand until they stop.", tools: ["screwdriver"], scene: "top", kind: "cams" },
    () => {
      b.stage(c.top, [0, T / 2, 0], UPSIDE, [0, 160, 0]);
      b.then(0.15);
      b.fits(HW.camScrew, SG.flatMap((sx) => SG.map((sz) => pt(c.top, [sx * xs, y0 + H - T, sz * zc], [0, 1, 0], { mate: sideOf(sx), mateHole: 4 }))), 0.1);
    },
  );
  b.step({ title: "Lower the top onto the sides", detail: "Onto the dowels, with the top edge of the back going into its groove.", kind: "join" }, () => b.add(c.top, [0, 300, 0]));
  b.step({ title: "Lock the cam locks under the top", detail: "Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => SG.map((sz) => pt(sideOf(sx), [sx * xi, y0 + H - T - 25, sz * zc], [sx, 0, 0]))), 0.12),
  );
  clipStep(b, g, c, 10, "Turn it round and press in the back clips", "+y");
}

/** The 200 high frame: lying on one side, top and bottom screwed on, then the back and the other side. */
function screwFrame(b: PlanBuilder, g: Box, c: Carcass) {
  const { W, H, D, y0 } = g;
  const xs = W / 2 - T / 2;
  const zc = D / 2 - 40, zd = D / 2 - 110;
  bottomSteps(b, g, c, true);
  b.step(
    { title: "Tap the dowels into both ends of the sides", detail: "Two at each end of both sides. Tap them gently until they stop.", tools: ["hammer"], scene: "sides", kind: "dowels" },
    () => {
      b.stagger(0.2);
      SG.forEach((sx, i) => b.stage(sx < 0 ? c.L : c.R, [0, T / 2, (i - 0.5) * (D + 60)], FLAT_SIDE, [0, 160, 0]));
      b.then(0.15);
      const list: FitOpts[] = [];
      for (const sx of SG)
        for (const sz of SG) {
          list.push(pt(sx < 0 ? c.L : c.R, [sx * xs, y0 + T, sz * zd], [0, 1, 0], { mate: c.bottom }));
          list.push(pt(sx < 0 ? c.L : c.R, [sx * xs, y0 + H - T, sz * zd], [0, -1, 0], { mate: c.top }));
        }
      b.fits(HW.dowel, list, 0.06);
    },
  );
  const screws = (on: string, sx: number, y: number, dir: Vec3, mate: string) => SG.map((sz) => pt(on, [sx * xs, y, sz * zc], dir, { mate }));
  b.step(
    { title: "Lay one side down and push the bottom onto it", detail: "Holes up and the groove at the back. The bottom goes onto the dowels with its feet facing out.", pose: "+x", kind: "join", warnings: ["floor"] },
    () => {
      b.add(c.L, [300, 0, 0]);
      b.then(0.15);
      b.add(c.bottom, [0, -260, 0]);
    },
  );
  b.step({ title: "Screw the bottom to the side", detail: "Two long screws through the bottom into the end of the side, with the Allen key.", tools: ["allen"], pose: "+x", kind: "screws" }, () =>
    b.fits(FRAME_SCREW, screws(c.bottom, -1, y0, [0, 1, 0], c.L), 0.15),
  );
  b.step({ title: "Fit the top the same way", detail: "Onto the dowels at the other end, then two long screws.", tools: ["allen"], pose: "+x", kind: "screws" }, () => {
    b.add(c.top, [0, 260, 0]);
    b.then(0.15);
    b.fits(FRAME_SCREW, screws(c.top, -1, y0 + H, [0, -1, 0], c.L), 0.15);
  });
  b.step({ title: "Slide the back panel into the grooves", detail: "White side in. Keep it straight so it doesn't jam.", pose: "+x", kind: "join" }, () => b.add(c.back, [400, 0, 0]));
  b.step({ title: "Lay the other side on top", detail: "Its dowels go into the top and bottom and the back goes into its groove.", pose: "+x", kind: "join" }, () => b.add(c.R, [300, 0, 0]));
  b.step({ title: "Screw the other side on", detail: "Two long screws through the bottom and two through the top.", tools: ["allen"], pose: "+x", kind: "screws" }, () =>
    b.fits(FRAME_SCREW, [...screws(c.bottom, 1, y0, [0, 1, 0], c.R), ...screws(c.top, 1, y0 + H, [0, -1, 0], c.R)], 0.12),
  );
  clipStep(b, g, c, 18, "Turn it onto its front and press in the back clips", "-z");
  b.step({ title: "Stand it up together", detail: "Lift it from the top end, one of you at each corner, and don't drag it up by one corner.", pose: "+y", people: 2, kind: "standup", warnings: ["two"] }, () => {});
}

function clipStep(b: PlanBuilder, g: Box, c: Carcass, n: number, title: string, pose: Pose) {
  const { W, H, y0 } = g;
  const rows = n / 2;
  const ys = spread(y0 + T + 80, y0 + H - T - 80, rows);
  const list: FitOpts[] = SG.flatMap((sx) => ys.map((y) => pt(c.back, [sx * (W / 2 - T - 30), y, c.zBack], [0, 0, 1], { hole: false })));
  b.step({ title, detail: "Push each clip through its hole in the back, then press its wedge in so it grips.", pose, kind: "general" }, () => b.fits(CLIP, list, 0.06));
}

/** Two spring fittings in the top back corners, screwed to the wall through the back, and covers over them. */
function wallSteps(b: PlanBuilder, g: Box, c: Carcass) {
  const { W, H, D, y0 } = g;
  const xi = W / 2 - T;
  const y = y0 + H - T - 40;
  const zf = c.zBack + 22;
  const sideOf = (sx: number) => (sx < 0 ? c.L : c.R);
  const tall = H > 1500;
  b.step({ title: "Press the wall fittings into the top corners", detail: "One inside each side, at the back just under the top, in the two holes there.", kind: "general" }, () =>
    b.fits(WALL_FIT, SG.map((sx) => pt(sideOf(sx), [sx * xi, y, zf], [sx, 0, 0], { travel: 60 })), 0.2),
  );
  b.step(
    { title: "Screw on the spacers if there's a skirting board", detail: "They hold the frame straight when the skirting board keeps its foot off the wall. Leave them out on a flat wall.", kind: "general" },
    () => b.fits(SPACER, SG.map((sx) => pt(c.back, [sx * (xi - 20), y, c.zBack], [0, 0, 1], { hole: false })), 0.2),
  );
  b.step(
    { title: tall ? "Push it to the wall and level it together" : "Push it to the wall and level it", detail: "Turn the feet in or out until it stands level and steady. Mark through the fittings onto the wall.", tools: ["level", "pencil"], people: tall ? 2 : 1, kind: "general", warnings: tall ? ["two"] : [] },
    () => {},
  );
  b.step(
    { title: "Screw it to the wall", detail: `Drill at the marks and push in the plugs, then a screw and washer through each fitting. ${WALL_WORDS}`, tools: ["drill", "screwdriver", "pencil"], kind: "anchor", wall: true, warnings: ["wall", "tip"] },
    () => {
      b.stagger(0.2);
      for (const sx of SG) b.fit(PLUG, { at: [sx * (xi - 20), y, -D / 2 - 30], dir: [0, 0, -1] });
      b.then(0.1);
      b.fits(BIG_WASHER, SG.map((sx) => pt(sideOf(sx), [sx * (xi - 20), y, zf + 20], [0, 0, -1], { hole: false })), 0.15);
      b.fits(WALL_SCREW, SG.map((sx) => pt(sideOf(sx), [sx * (xi - 20), y, zf + 22], [0, 0, -1], { hole: false, travel: 90 })), 0.15);
    },
  );
  b.step({ title: "Snap the covers over the fittings", detail: "They click on from the front.", kind: "general" }, () =>
    b.fits(COVER, SG.map((sx) => pt(sideOf(sx), [sx * (xi - 20), y, zf + 26], [0, 0, -1], { hole: false })), 0.2),
  );
}

function holeCapStep(b: PlanBuilder, g: { W: number; H: number; D: number; y0: number }, L: string, R: string, n: number) {
  const { W, H, D, y0 } = g;
  const zs = n >= 8 ? [-(D / 2 - 37), D / 2 - 37] : [0];
  const ys = spread(y0 + H * 0.25, y0 + H * 0.75, Math.max(1, n / 2 / zs.length));
  const list = SG.flatMap((sx) => zs.flatMap((z) => ys.map((y) => pt(sx < 0 ? L : R, [sx * (W / 2), y, z], [-sx, 0, 0], { hole: false }))));
  b.step({ title: "Press the hole caps into the sides", detail: "Into the holes on the outside, unless you join another frame there.", kind: "general" }, () => b.fits(HOLE_CAP, list, 0.08));
}

/* ---------- doors ---------- */

interface DoorSet {
  W: number;
  D: number; // front face of the carcass is at D / 2
  y0: number; // bottom of the doors
  h: number; // height of the doors
  hinges: number; // per door
  bumpers: number; // per door
  people: 1 | 2;
}

function doorSteps(b: PlanBuilder, o: DoorSet) {
  const { W, D, y0, h } = o;
  const dw = W / 2 - 3;
  const zd = D / 2 + 1 + T / 2;
  const t = b.part("Door", [dw, h, T]);
  const doors = SG.map((sx) => ({ key: b.place(t, [sx * (W / 4 + 0.5), y0 + h / 2, zd]), sx, cx: sx * (W / 4 + 0.5) }));
  const zIn = D / 2 + 1;
  const hingeYs = spread(y0 + 100, y0 + h - 100, o.hinges);
  const bumpYs = o.bumpers === 1 ? [y0 + h - 60] : [y0 + 60, y0 + h - 60];
  b.step(
    { title: "Press the bumpers into the doors", detail: "Lay the doors face down on a rug. One small bumper in each hole near the edge without hinge holes.", scene: "doors", kind: "general", warnings: ["floor"] },
    () => {
      b.stagger(0.2);
      doors.forEach((d, i) => b.stage(d.key, [(i - 0.5) * (dw + 80), T / 2, 0], FACE_DOWN, [0, 160, 0]));
      b.then(0.15);
      b.fits(BUMPER, doors.flatMap((d) => bumpYs.map((y) => pt(d.key, [d.cx - d.sx * (dw / 2 - 25), y, zIn], [0, 0, 1], { hole: false }))), 0.12);
    },
  );
  b.step({ title: "Press the hinges into the doors", detail: "Each hinge cup goes into its round hole, then tighten its two screws.", tools: ["screwdriver"], scene: "doors", kind: "hinges" }, () =>
    b.fits(HW.hinge, doors.flatMap((d) => hingeYs.map((y) => pt(d.key, [d.cx + d.sx * (dw / 2 - 22), y, zIn], [0, 0, 1], { twist: d.sx < 0 ? 0 : Math.PI }))), 0.12),
  );
  b.step(
    {
      title: o.people === 2 ? "Hang the doors together" : "Hang the doors",
      detail: "One of you holds the door while the other screws each hinge plate to the front holes of the side. Then turn the hinge screws until the gaps are even.",
      tools: ["screwdriver"],
      people: o.people,
      kind: "doors",
      warnings: o.people === 2 ? ["two"] : [],
    },
    () => {
      b.stagger(0.35);
      for (const d of doors) b.add(d.key, [0, 0, 380]);
    },
  );
}

/* ---------- the products ---------- */

function buildFrame(b: PlanBuilder, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const g: Box = { W, H, D, y0: FOOT_H };
  const c = carcass(b, g);
  const doors = /doors/.test(s.slug ?? "");
  if (H > 1500) screwFrame(b, g, c);
  else camFrame(b, g, c, W >= 600);
  wallSteps(b, g, c);
  if (doors) doorSteps(b, { W, D, y0: FOOT_H + 1, h: H - 2, hinges: H > 1500 ? 3 : 2, bumpers: 2, people: 2 });
  holeCapStep(b, g, c.L, c.R, H > 1500 ? 16 : D >= 400 ? 8 : 4);
  return true;
}

/** The height extension: a U of sides and a solid back, a top, and no bottom. It locks onto the tall frame's top. */
function buildExtension(b: PlanBuilder, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const y0 = T; // the tall frame's top, under it
  const Hs = H - T;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const ym = y0 + Hs / 2, yt = y0 + Hs;
  const zb = -D / 2 + T / 2;
  const frameTop = put(b, "Top of the tall frame", [W, T, D], [0, T / 2, 0], { extra: true });
  const [L, R] = putMany(b, "Side panel", [T, Hs, D], SG.map((sx) => [sx * xs, ym, 0] as Vec3));
  const back = put(b, "Back panel", [W - 2 * T, Hs, T], [0, ym, zb]);
  const top = put(b, "Top panel", [W, T, D], [0, yt + T / 2, 0]);
  const sideOf = (sx: number) => (sx < 0 ? L : R);
  const unit = [L, R, back, top];
  b.step(
    { title: "Screw a cam bolt into each side", detail: "Lay the sides on a rug, holes up. One bolt in each, by hand until it stops.", tools: ["screwdriver"], scene: "unit", kind: "cams", warnings: ["floor"] },
    () => {
      b.stagger(0.2);
      SG.forEach((sx, i) => b.stage(sideOf(sx), [0, T / 2, (i - 0.5) * (D + 60)], FLAT_SIDE, [0, 160, 0]));
      b.then(0.15);
      b.fits(HW.camScrew, SG.map((sx) => pt(sideOf(sx), [sx * xi, ym, zb], [sx, 0, 0], { mate: back, mateHole: 4 })), 0.15);
    },
  );
  b.step({ title: "Tap the dowels into the ends of the back panel", detail: "Two at each end.", tools: ["hammer"], scene: "unit", kind: "dowels" }, () => {
    b.stage(back, [0, T / 2, D + 60 + Hs / 2 + 40], FACE_DOWN, [0, 160, 0]);
    b.then(0.15);
    b.fits(HW.dowel, SG.flatMap((sx) => [-90, 90].map((dy) => pt(back, [sx * xi, ym + dy, zb], [-sx, 0, 0], { mate: sideOf(sx) }))), 0.08);
  });
  b.step({ title: "Stand the back panel in one side", detail: "Lay one side flat, holes up, and push the back down onto its dowels and bolt.", scene: "box", pose: "+x", kind: "join" }, () => {
    b.add(L, [300, 0, 0]);
    b.then(0.15);
    b.add(back, [300, 0, 0]);
  });
  b.step({ title: "Lock it with a round cam lock", detail: "In the back panel, next to the side. Arrow towards the bolt, then turn clockwise.", tools: ["screwdriver"], scene: "box", pose: "+x", kind: "cams" }, () =>
    b.fit(ROUND_CAM, pt(back, [-xi + 25, ym, zb + T / 2], [0, 0, -1])),
  );
  b.step({ title: "Fit the other side", detail: "Stand the two up on their edges and push the second side onto the back.", scene: "box", pose: "+y", kind: "join" }, () => b.add(R, [300, 0, 0]));
  b.step({ title: "Lock it with the other round cam lock", detail: "Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], scene: "box", kind: "cams" }, () =>
    b.fit(ROUND_CAM, pt(back, [xi - 25, ym, zb + T / 2], [0, 0, -1])),
  );
  const sideZ = [D / 2 - 40, -D / 2 + 90];
  b.step({ title: "Tap the dowels into the top edges", detail: "Two in each side and two in the back.", tools: ["hammer"], scene: "box", kind: "dowels" }, () =>
    b.fits(
      HW.dowel,
      [
        ...SG.flatMap((sx) => [D / 2 - 90, -D / 2 + 60].map((z) => pt(sideOf(sx), [sx * xs, yt, z], [0, -1, 0], { mate: top }))),
        ...SG.map((sx) => pt(back, [sx * (W / 4), yt, zb], [0, -1, 0], { mate: top })),
      ],
      0.08,
    ),
  );
  b.step({ title: "Screw the cam bolts into the top", detail: "Lay it upside down. Six bolts, by hand until they stop.", tools: ["screwdriver"], scene: "top", kind: "cams" }, () => {
    b.stage(top, [0, T / 2, 0], UPSIDE, [0, 160, 0]);
    b.then(0.15);
    b.fits(
      HW.camScrew,
      [
        ...SG.flatMap((sx) => sideZ.map((z) => pt(top, [sx * xs, yt, z], [0, 1, 0], { mate: sideOf(sx), mateHole: 4 }))),
        ...SG.map((sx) => pt(top, [sx * (W / 4 + 60), yt, zb], [0, 1, 0], { mate: back, mateHole: 4 })),
      ],
      0.08,
    );
  });
  b.step({ title: "Lower the top on", detail: "Onto the dowels and bolts, front edges flush.", scene: "box", kind: "join" }, () => b.add(top, [0, 300, 0]));
  b.step({ title: "Lock the cam locks in the sides", detail: "Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], scene: "box", kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => sideZ.map((z) => pt(sideOf(sx), [sx * xi, yt - 25, z], [sx, 0, 0]))), 0.12),
  );
  b.step({ title: "Lock the round cam locks in the back", detail: "The two near the top of the back panel.", tools: ["screwdriver"], scene: "box", kind: "cams" }, () =>
    b.fits(ROUND_CAM, SG.map((sx) => pt(back, [sx * (W / 4 + 60), yt - 25, zb + T / 2], [0, 0, -1])), 0.15),
  );
  const zc = [D / 2 - 40, -D / 2 + 90];
  b.step(
    { title: "Screw cam bolts into the top of the tall frame", detail: "Four, into the holes in its top. Stand on a step ladder.", tools: ["screwdriver"], kind: "cams" },
    () => {
      b.add(frameTop, [0, 0, 0]);
      b.then(0.15);
      b.fits(HW.camScrew, SG.flatMap((sx) => zc.map((z) => pt(frameTop, [sx * xs, T, z], [0, -1, 0], { mate: sideOf(sx), mateHole: 4 }))), 0.1);
    },
  );
  b.step({ title: "Lift the unit onto the frame", detail: "The sides go down onto the bolts, flush with the frame's sides and front.", kind: "join" }, () => {
    b.stagger(0);
    for (const k of unit) b.add(k, [0, 300, 0]);
  });
  b.step({ title: "Lock it with the cam locks", detail: "Four at the bottom of the sides. Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => zc.map((z) => pt(sideOf(sx), [sx * xi, y0 + 25, z], [sx, 0, 0]))), 0.12),
  );
  doorSteps(b, { W, D, y0: y0 + 1, h: H - 2, hinges: 2, bumpers: 1, people: 1 });
  return true;
}

/** The wall mounted frame: built like a frame, then hung on a rail screwed to the wall, two brackets low down. */
function buildWallFrame(b: PlanBuilder, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const g: Box = { W, H, D, y0: 0 };
  const c = carcass(b, g, 12);
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const zc = D / 2 - 40, zd = D / 2 - 100;
  const sideOf = (sx: number) => (sx < 0 ? c.L : c.R);
  const yRail = H - T - 45;
  const rail = put(b, "Wall rail", [W - 2 * T - 40, 30, 8], [0, yRail, -D / 2 + 4], { material: "metal" });
  const xb = (sx: number) => sx * (W / 2 - T - 60);
  const zBr = c.zBack + 3 + 15;
  b.step(
    { title: "Screw the cam bolts into the top and bottom", detail: "Lay both panels on a rug, holes up. Four bolts in each.", tools: ["screwdriver"], scene: "panels", kind: "cams", warnings: ["floor"] },
    () => {
      b.stagger(0.2);
      b.stage(c.bottom, [0, T / 2, -(D / 2 + 30)], [0, 0, 0], [0, 160, 0]);
      b.stage(c.top, [0, T / 2, D / 2 + 30], UPSIDE, [0, 160, 0]);
      b.then(0.15);
      b.fits(
        HW.camScrew,
        [
          ...SG.flatMap((sx) => SG.map((sz) => pt(c.bottom, [sx * xs, T, sz * zc], [0, -1, 0], { mate: sideOf(sx), mateHole: 4 }))),
          ...SG.flatMap((sx) => SG.map((sz) => pt(c.top, [sx * xs, H - T, sz * zc], [0, 1, 0], { mate: sideOf(sx), mateHole: 4 }))),
        ],
        0.06,
      );
    },
  );
  b.step({ title: "Screw the wall brackets onto the bottom", detail: "At the back corners, the round hole standing up at the back edge. Two screws in each.", tools: ["screwdriver"], scene: "panels", kind: "screws" }, () => {
    b.fits(BRACKET, SG.map((sx) => pt(c.bottom, [xb(sx), T, zBr], [0, -1, 0], { hole: false })), 0.2);
    b.then(0.1);
    b.fits(BRACKET_SCREW, SG.flatMap((sx) => [-9, 9].map((dx) => pt(c.bottom, [xb(sx) + dx, T + 2, zBr + 14], [0, -1, 0]))), 0.1);
  });
  b.step({ title: "Tap the dowels into both ends of the sides", detail: "Two at each end of both sides.", tools: ["hammer"], scene: "sides", kind: "dowels" }, () => {
    b.stagger(0.2);
    SG.forEach((sx, i) => b.stage(sideOf(sx), [0, T / 2, (i - 0.5) * (D + 60)], FLAT_SIDE, [0, 160, 0]));
    b.then(0.15);
    const list: FitOpts[] = [];
    for (const sx of SG)
      for (const sz of SG) {
        list.push(pt(sideOf(sx), [sx * xs, T, sz * zd], [0, 1, 0], { mate: c.bottom }));
        list.push(pt(sideOf(sx), [sx * xs, H - T, sz * zd], [0, -1, 0], { mate: c.top }));
      }
    b.fits(HW.dowel, list, 0.06);
  });
  b.step({ title: "Stand the sides on the bottom", detail: "Grooves at the back, onto the dowels and cam bolts.", scene: "cab", kind: "join" }, () => {
    b.add(c.bottom, [0, 120, 0]);
    b.then(0.15);
    b.add(c.L, [0, 300, 0]);
    b.add(c.R, [0, 300, 0]);
  });
  b.step({ title: "Lock the cam locks", detail: "Arrow towards the bolt, then turn clockwise until it bites.", tools: ["screwdriver"], scene: "cab", kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => SG.map((sz) => pt(sideOf(sx), [sx * xi, T + 25, sz * zc], [sx, 0, 0]))), 0.12),
  );
  b.step({ title: "Slide the back panel down the grooves", detail: "White side in, in front of the wall brackets.", scene: "cab", kind: "join" }, () => b.add(c.back, [0, H, 0]));
  b.step({ title: "Lower the top onto the sides", detail: "Onto the dowels, the back going into its groove.", scene: "cab", kind: "join" }, () => b.add(c.top, [0, 300, 0]));
  b.step({ title: "Lock the cam locks under the top", detail: "Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], scene: "cab", kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => SG.map((sz) => pt(sideOf(sx), [sx * xi, H - T - 25, sz * zc], [sx, 0, 0]))), 0.12),
  );
  const ys = spread(T + 70, H - T - 70, 4);
  b.step({ title: "Turn it round and press in the back clips", detail: "Push each clip through its hole in the back, then press its wedge in.", scene: "cab", kind: "general" }, () =>
    b.fits(CLIP, SG.flatMap((sx) => ys.map((y) => pt(c.back, [sx * (W / 2 - T - 30), y, c.zBack], [0, 0, 1], { hole: false }))), 0.06),
  );
  const yh = H - T - 40, zh = c.zBack + 30;
  b.step({ title: "Clip the hanging fittings into the top corners", detail: "The one marked R on the right, L on the left. Push each onto its pegs inside the side until it clicks.", scene: "cab", kind: "general" }, () =>
    b.fits(HANGER, SG.map((sx) => pt(sideOf(sx), [sx * xi, yh, zh], [sx, 0, 0], { travel: 60 })), 0.2),
  );
  b.step({ title: "Lock each fitting with a screw", detail: "One screw each, so they can't come off the side.", tools: ["screwdriver"], scene: "cab", kind: "screws" }, () =>
    b.fits(HANGER_SCREW, SG.map((sx) => pt(sideOf(sx), [sx * xi, yh - 25, zh], [sx, 0, 0])), 0.2),
  );
  const railXs = spread(-(W / 2 - T - 40), W / 2 - T - 40, 5);
  b.step(
    { title: "Mark and drill the holes for the rail", detail: "Hold the rail level where the top of the frame will be, mark its five holes, drill them and push in the plugs.", tools: ["level", "pencil", "drill"], kind: "general", wall: true, warnings: ["wall"] },
    () => {
      b.add(rail, [0, 0, 200]);
      b.then(0.15);
      b.stagger(0.1);
      for (const x of railXs) b.fit(PLUG, { at: [x, yRail, -D / 2 - 1], dir: [0, 0, -1] });
    },
  );
  b.step({ title: "Screw the rail to the wall", detail: `A square washer under each screw. ${WALL_WORDS}`, tools: ["screwdriver"], kind: "anchor", wall: true, warnings: ["wall"] }, () => {
    b.fits(RAIL_WASHER, railXs.map((x) => pt(rail, [x, yRail, -D / 2 + 8], [0, 0, -1], { hole: false })), 0.08);
    b.fits(RAIL_SCREW, railXs.map((x) => pt(rail, [x, yRail, -D / 2 + 10], [0, 0, -1], { hole: false })), 0.08);
  });
  b.step({ title: "Hang the frame on the rail", detail: "Lift it so both fittings hook over the rail, then let it down. The Allen key turns the fittings to raise it or pull it to the wall.", tools: ["allen"], kind: "join", warnings: ["wall"] }, () => {
    b.stagger(0);
    for (const k of [c.bottom, c.L, c.R, c.back, c.top]) b.add(k, [0, 60, 260]);
  });
  b.step(
    { title: "Screw the brackets to the wall", detail: "A washer and a screw through each bracket at the bottom, so the frame can't swing out.", tools: ["drill", "screwdriver"], kind: "anchor", wall: true, warnings: ["wall", "tip"] },
    () => {
      b.fits(BIG_WASHER, SG.map((sx) => pt(c.bottom, [xb(sx), T + 22, zBr + 3], [0, 0, -1], { hole: false })), 0.15);
      b.fits(BRACKET_WALL_SCREW, SG.map((sx) => pt(c.bottom, [xb(sx), T + 22, zBr + 5], [0, 0, -1], { hole: false })), 0.15);
    },
  );
  b.step({ title: "Snap the covers over the brackets", detail: "They push on from the front.", kind: "general" }, () =>
    b.fits(BRACKET_COVER, SG.map((sx) => pt(c.bottom, [xb(sx), T + 20, zBr + 22], [0, 0, -1], { hole: false })), 0.2),
  );
  doorSteps(b, { W, D, y0: 1, h: H - 2, hinges: 2, bumpers: 2, people: 2 });
  holeCapStep(b, g, c.L, c.R, 4);
  return true;
}

/** The bench: two sides on glides, a back panel between them and the top, all on dowels and cam locks. */
function buildBench(b: PlanBuilder, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const Hs = H - T;
  const RH = 220;
  const yr = Hs - RH / 2, zr = -D / 2 + T / 2;
  const [L, R] = putMany(b, "Side panel", [T, Hs, D], SG.map((sx) => [sx * xs, Hs / 2, 0] as Vec3));
  const panel = put(b, "Back panel", [W - 2 * T, RH, T], [0, yr, zr]);
  const top = put(b, "Top panel", [W, T, D], [0, H - T / 2, 0]);
  const sideOf = (sx: number) => (sx < 0 ? L : R);
  const boltY = [yr - 70, yr, yr + 70];
  b.step({ title: "Tap the dowels into the ends of the back panel", detail: "Lay it on a rug. Two dowels at each end.", tools: ["hammer"], scene: "panel", kind: "dowels", warnings: ["floor"] }, () => {
    b.stage(panel, [0, T / 2, 0], FACE_DOWN, [0, 160, 0]);
    b.then(0.15);
    b.fits(HW.dowel, SG.flatMap((sx) => [-35, 35].map((dy) => pt(panel, [sx * xi, yr + dy, zr], [-sx, 0, 0], { mate: sideOf(sx) }))), 0.1);
  });
  b.step({ title: "Push the glides into the sides", detail: "Two in the bottom edge of each side.", scene: "sides", kind: "general" }, () => {
    b.stagger(0.2);
    SG.forEach((sx, i) => b.stage(sideOf(sx), [0, T / 2, (i - 0.5) * (D + 60)], FLAT_SIDE, [0, 160, 0]));
    b.then(0.15);
    b.fits(GLIDE, SG.flatMap((sx) => SG.map((sz) => pt(sideOf(sx), [sx * xs, 0, sz * (D / 2 - 60)], [0, 1, 0]))), 0.1);
  });
  b.step({ title: "Screw the cam bolts into the sides", detail: "Three in each, in the holes along the back edge.", tools: ["screwdriver"], scene: "sides", kind: "cams" }, () =>
    b.fits(HW.camScrew, SG.flatMap((sx) => boltY.map((y) => pt(sideOf(sx), [sx * xi, y, zr], [sx, 0, 0], { mate: panel, mateHole: 4 }))), 0.08),
  );
  b.step({ title: "Push the sides onto the back panel", detail: "Lay the panel on its back on the rug and push a side onto each end.", pose: "+z", kind: "join", warnings: ["floor"] }, () => {
    b.add(panel, [0, 0, 200]);
    b.then(0.15);
    b.add(L, [-300, 0, 0]);
    b.add(R, [300, 0, 0]);
  });
  b.step({ title: "Lock the cam locks in the back panel", detail: "Three at each end. Arrow towards the bolt, then turn clockwise.", tools: ["screwdriver"], pose: "+z", kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => boltY.map((y) => pt(panel, [sx * (xi - 25), y, zr + T / 2], [0, 0, -1]))), 0.1),
  );
  const pz = [-W / 4, W / 4];
  b.step({ title: "Stand it up and tap dowels into the top edges", detail: "Two in each side and two in the back panel.", tools: ["hammer"], pose: "+y", kind: "dowels" }, () =>
    b.fits(
      HW.dowel,
      [...SG.flatMap((sx) => [D / 2 - 90, -D / 2 + 90].map((z) => pt(sideOf(sx), [sx * xs, Hs, z], [0, -1, 0], { mate: top }))), ...pz.map((x) => pt(panel, [x, Hs, zr], [0, -1, 0], { mate: top }))],
      0.08,
    ),
  );
  const camZ = [D / 2 - 45, -D / 2 + 45];
  b.step({ title: "Screw the cam bolts into the top", detail: "Lay it upside down. Six bolts, by hand until they stop.", tools: ["screwdriver"], scene: "top", kind: "cams" }, () => {
    b.stage(top, [0, T / 2, 0], UPSIDE, [0, 160, 0]);
    b.then(0.15);
    b.fits(
      HW.camScrew,
      [...SG.flatMap((sx) => camZ.map((z) => pt(top, [sx * xs, Hs, z], [0, 1, 0], { mate: sideOf(sx), mateHole: 4 }))), ...pz.map((x) => pt(top, [x + 60, Hs, zr], [0, 1, 0], { mate: panel, mateHole: 4 }))],
      0.08,
    );
  });
  b.step({ title: "Lower the top on", detail: "Onto the dowels and bolts, edges flush all round.", kind: "join" }, () => b.add(top, [0, 300, 0]));
  b.step({ title: "Lock the cam locks in the back panel", detail: "The two just under the top.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, pz.map((x) => pt(panel, [x + 60, Hs - 25, zr + T / 2], [0, 0, -1])), 0.15),
  );
  b.step({ title: "Lock the cam locks in the sides", detail: "Two in each side, just under the top. Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => camZ.map((z) => pt(sideOf(sx), [sx * xi, Hs - 25, z], [sx, 0, 0]))), 0.12),
  );
  return true;
}

/** The table: built lying on one side, the low back panel and two rails between the sides, then the top. */
function buildTable(b: PlanBuilder, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const Hs = H - T;
  const SH = 140, AH = 80, FD = 80;
  const ys = 357, zb = -D / 2 + T / 2;
  const ya = Hs - AH / 2;
  const yf = Hs - T / 2, zf = D / 2 - 30 - FD / 2;
  const [L, R] = putMany(b, "Side panel", [T, Hs, D], SG.map((sx) => [sx * xs, Hs / 2, 0] as Vec3));
  const panel = put(b, "Back panel", [W - 2 * T, SH, T], [0, ys, zb]);
  const apron = put(b, "Back rail", [W - 2 * T, AH, T], [0, ya, zb]);
  const front = put(b, "Front rail", [W - 2 * T, T, FD], [0, yf, zf]);
  const top = put(b, "Top panel", [W, T, D], [0, H - T / 2, 0]);
  const sideOf = (sx: number) => (sx < 0 ? L : R);
  const topDowelZ = [D / 2 - 90, -D / 2 + 90];
  const topBoltZ = [D / 2 - 140, -D / 2 + 140];
  // each end of each rail: where its cam bolt goes into the side, and its two dowels
  const ends = [
    { key: panel, bolts: [ys - 50, ys, ys + 50].map((y) => [y, zb] as [number, number]), dowels: [ys - 25, ys + 25].map((y) => [y, zb] as [number, number]), face: [0, 0, -1] as Vec3, at: (y: number, z: number): [number, number] => [y, z + T / 2] },
    { key: apron, bolts: [[ya, zb]] as [number, number][], dowels: [ya - 25, ya + 25].map((y) => [y, zb] as [number, number]), face: [0, 0, -1] as Vec3, at: (y: number, z: number): [number, number] => [y, z + T / 2] },
    { key: front, bolts: [[yf, zf]] as [number, number][], dowels: [zf - 25, zf + 25].map((z) => [yf, z] as [number, number]), face: [0, 1, 0] as Vec3, at: (_y: number, z: number): [number, number] => [Hs - T, z] },
  ];
  b.step({ title: "Tap the dowels into the tops of the sides", detail: "Lay both sides on a rug. Two dowels in the top edge of each.", tools: ["hammer"], scene: "sides", kind: "dowels", warnings: ["floor"] }, () => {
    b.stagger(0.2);
    SG.forEach((sx, i) => b.stage(sideOf(sx), [0, T / 2, (i - 0.5) * (D + 60)], FLAT_SIDE, [0, 160, 0]));
    b.then(0.15);
    b.fits(HW.dowel, SG.flatMap((sx) => topDowelZ.map((z) => pt(sideOf(sx), [sx * xs, Hs, z], [0, -1, 0], { mate: top }))), 0.1);
  });
  b.step({ title: "Push the glides into the bottom edges", detail: "Two in each side.", scene: "sides", kind: "general" }, () =>
    b.fits(GLIDE, SG.flatMap((sx) => SG.map((sz) => pt(sideOf(sx), [sx * xs, 0, sz * (D / 2 - 60)], [0, 1, 0]))), 0.1),
  );
  b.step({ title: "Screw the cam bolts into the sides", detail: "Five in each, on the inside face. Turn them by hand, not with a drill.", tools: ["screwdriver"], scene: "sides", kind: "cams" }, () =>
    b.fits(HW.camScrew, SG.flatMap((sx) => ends.flatMap((e) => e.bolts.map(([y, z]) => pt(sideOf(sx), [sx * xi, y, z], [sx, 0, 0], { mate: e.key, mateHole: 4 })))), 0.06),
  );
  b.step({ title: "Tap the dowels into the ends of the rails", detail: "Two at each end of the back panel and of both rails.", tools: ["hammer"], scene: "rails", kind: "dowels" }, () => {
    b.stagger(0.15);
    b.stage(panel, [0, T / 2, -150], FACE_DOWN, [0, 160, 0]);
    b.stage(apron, [0, T / 2, 0], FACE_DOWN, [0, 160, 0]);
    b.stage(front, [0, T / 2, 130], [0, 0, 0], [0, 160, 0]);
    b.then(0.15);
    b.fits(HW.dowel, SG.flatMap((sx) => ends.flatMap((e) => e.dowels.map(([y, z]) => pt(e.key, [sx * xi, y, z], [-sx, 0, 0], { mate: sideOf(sx) })))), 0.05);
  });
  b.step({ title: "Lay one side down and stand the rails in it", detail: "Holes up. Push each one down onto its dowels and cam bolts.", pose: "+x", kind: "join", warnings: ["floor"] }, () => {
    b.add(L, [300, 0, 0]);
    b.then(0.15);
    for (const e of ends) b.add(e.key, [300, 0, 0]);
  });
  const cams = (sx: number) => ends.flatMap((e) => e.bolts.map(([y, z]) => {
    const [y2, z2] = e.at(y, z);
    return pt(e.key, [sx * (xi - 25), y2, z2], e.face);
  }));
  b.step({ title: "Lock the cam locks", detail: "Five at this end. Arrow towards the bolt, then turn clockwise.", tools: ["screwdriver"], pose: "+x", kind: "cams" }, () => b.fits(HW.cam, cams(-1), 0.12));
  b.step({ title: "Lay the other side on top", detail: "Onto the dowels and bolts at the free ends.", pose: "+x", kind: "join" }, () => b.add(R, [300, 0, 0]));
  b.step({ title: "Lock the cam locks at this end", detail: "Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], pose: "+x", kind: "cams" }, () => b.fits(HW.cam, cams(1), 0.12));
  b.step({ title: "Screw the cam bolts into the top", detail: "Lay it upside down. Four bolts, by hand.", tools: ["screwdriver"], scene: "top", kind: "cams" }, () => {
    b.stage(top, [0, T / 2, 0], UPSIDE, [0, 160, 0]);
    b.then(0.15);
    b.fits(HW.camScrew, SG.flatMap((sx) => topBoltZ.map((z) => pt(top, [sx * xs, Hs, z], [0, 1, 0], { mate: sideOf(sx), mateHole: 4 }))), 0.1);
  });
  b.step({ title: "Stand it up and lower the top on", detail: "Onto the dowels and bolts, edges flush.", pose: "+y", kind: "join" }, () => b.add(top, [0, 300, 0]));
  b.step({ title: "Lock the cam locks under the top", detail: "Two in each side. Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => topBoltZ.map((z) => pt(sideOf(sx), [sx * xi, Hs - 25, z], [sx, 0, 0]))), 0.12),
  );
  b.step({ title: "Screw the front rail to the top", detail: "Four screws up through the rail with the Allen key. Turn them by hand, not with a drill.", tools: ["allen"], kind: "screws" }, () =>
    b.fits(RAIL_TO_TOP, spread(-(W / 2 - T - 90), W / 2 - T - 90, 4).map((x) => pt(front, [x, Hs - T, zf], [0, 1, 0], { mate: top })), 0.12),
  );
  holeCapStep(b, { W, H: Hs, D, y0: 0 }, L, R, 4);
  return true;
}

/* ---------- the chest of drawers ---------- */

const DRAWER_BUMPER: HwDef = { kind: "glide", len: 2, dia: 8, name: "Bumper" };
const CAB_RUNNER: HwDef = { kind: "runner", len: 350, dia: 20, name: "Cabinet runner" };
const DRAWER_RUNNER: HwDef = { kind: "runner", len: 350, dia: 18 };
const RUNNER_SCREW: HwDef = { kind: "screw", len: 12, dia: 4 };
const DRAWER_RUNNER_SCREW: HwDef = { kind: "screw", len: 10, dia: 3.5 };
const PLINTH_ANGLE: HwDef = { kind: "angle", len: 40, dia: 40 };
const ANGLE_SCREW: HwDef = { kind: "screw", len: 13, dia: 5 };
const DRAWER_BOLT: HwDef = { kind: "camScrew", len: 24, dia: 7 };
const PLASTIC_DOWEL: HwDef = { kind: "dowel", len: 40, dia: 8, name: "Plastic dowel" };
const CATCH: HwDef = { kind: "clip", len: 20, dia: 16, name: "Interlock catch" };
const WIRE: HwDef = { kind: "clip", len: 40, dia: 8, name: "Wire stop" };
const ROD_CLIP: HwDef = { kind: "clip", len: 12, dia: 10, name: "Interlock clip" };
const STOP: HwDef = { kind: "clip", len: 10, dia: 12, name: "Drawer stop" };
const TOP_BRACKET: HwDef = { kind: "bracket", len: 90, dia: 30, name: "Wall bracket" };
const TOP_BRACKET_SCREW: HwDef = { kind: "screw", len: 14, dia: 4 };
const CHEST_WALL_SCREW: HwDef = { kind: "screw", len: 60, dia: 5 };

/**
 * The chest of 4 drawers: sides with their runners, a wooden plinth rail on L brackets and feet, a steel bottom
 * rail that carries three counterweights and a steel rail across the back, built with the left side lying down,
 * stood up for the right side. Then the back, the top on dowels and cam locks with two wall brackets under it,
 * clips, the drawer interlock up the right side, the wall, and four drawers built on their fronts.
 */
function buildChest(b: PlanBuilder, s: ProductSpec) {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  if (W < 700 || W > 900 || H < 900 || H > 1100) return false;
  const y0 = FOOT_H;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const Hs = H - T, ytop = y0 + Hs;
  const P = 60, zp = D / 2 - 30 - T / 2;
  const zIn = D / 2 - T; // back face of the drawer fronts
  const sideOf = (sx: number) => (sx < 0 ? L : R);
  const [L, R] = putMany(b, "Side panel", [T, Hs, D], SG.map((sx) => [sx * xs, y0 + Hs / 2, 0] as Vec3));
  const top = put(b, "Top panel", [W, T, D], [0, y0 + H - T / 2, 0]);
  const plinth = put(b, "Plinth rail", [W - 2 * T, P, T], [0, y0 + P / 2, zp]);
  // the steel bottom rail is a channel, open at the top, with the counterweights in it
  const cw = W - 2 * T, chD = 60, chH = 40, zch = -D / 2 + 13 + chD / 2, ych = y0 + chH / 2;
  const { type: chT, mid: chMid } = b.compound(
    "Bottom rail",
    [
      { shape: "box", size: [cw, 2, chD], pos: [0, -chH / 2 + 1, 0] },
      { shape: "box", size: [cw, chH, 2], pos: [0, 0, -chD / 2 + 1] },
      { shape: "box", size: [cw, chH, 2], pos: [0, 0, chD / 2 - 1] },
    ],
    { material: "metal" },
  );
  const channel = b.place(chT, [chMid[0], ych + chMid[1], zch + chMid[2]]);
  const weights = putMany(b, "Counterweight", [220, 30, chD - 6], [-250, 0, 250].map((x) => [x, y0 + 2 + 15, zch] as Vec3), "metal");
  const yMid = y0 + 480;
  const midRail = put(b, "Back rail", [cw, 40, 20], [0, yMid, -D / 2 + 13 + 10], { material: "metal" });
  const backH = Hs - chH;
  const back = put(b, "Back panel", [cw, backH, 3], [0, y0 + chH + backH / 2, -D / 2 + 11.5], { material: "fiber" });
  const rod = put(b, "Interlock rod", [10, Hs - P - 60, 8], [xi - 8, y0 + P + 30 + (Hs - P - 60) / 2, D / 2 - T - 6], { material: "metal" });

  // drawers: three deep ones and a shallow one at the top, fronts between the sides
  const gap = 3;
  const room = Hs - P - 5 * gap;
  const deep = Math.round(room / 3.8), shallow = room - 3 * deep;
  const hs = [deep, deep, deep, shallow];
  const fy = hs.map((_, i) => y0 + P + gap + hs.slice(0, i).reduce((a, h) => a + h + gap, 0));
  const fw = W - 2 * T - 4;
  const dt = 12, xo = (W - 2 * T - 26) / 2, xd = xo - dt / 2;
  const dd = 370, zs = zIn - dd / 2, zBk = zIn - dd + 6;
  const runLen = 350;
  interface Drawer {
    front: string;
    sides: string[];
    bottom: string;
    back: string;
    y: number; // underside of the box
    sh: number;
  }
  const frontT = new Map<number, string>(), sideT = new Map<number, string>(), backT = new Map<number, string>();
  const typeOf = (m: Map<number, string>, h: number, name: string, size: Vec3) => {
    if (!m.has(h)) m.set(h, b.part(name, size));
    return m.get(h)!;
  };
  const bottomT = b.part("Drawer bottom", [2 * xd, 3, dd - 12], { material: "fiber" });
  // the shallow drawer goes in first, at the top
  const order = [3, 2, 1, 0];
  const drawers: Drawer[] = order.map((i) => {
    const h = hs[i], sh = h - 50, y = fy[i] + 20;
    return {
      y,
      sh,
      front: b.place(typeOf(frontT, h, "Drawer front", [fw, h, T]), [0, fy[i] + h / 2, D / 2 - T / 2]),
      sides: SG.map((g) => b.place(typeOf(sideT, sh, "Drawer side", [dt, sh, dd]), [g * xd, y + sh / 2, zs])),
      bottom: b.place(bottomT, [0, y + 10, zIn - (dd - 12) / 2]),
      back: b.place(typeOf(backT, sh, "Drawer back", [2 * xd - 2 * dt, sh - 14, dt]), [0, y + 14 + (sh - 14) / 2, zBk]),
    };
  });
  const fitsOf = (d: Drawer) => {
    const per = (fn: (g: number, side: string) => FitOpts[]) => SG.flatMap((g) => fn(g, d.sides[g < 0 ? 0 : 1]));
    return {
      bumpers: SG.map((g) => pt(d.front, [g * (fw / 2 - 30), d.y + d.sh / 2, zIn], [0, 0, 1], { hole: false })),
      bolts: per((g, sd) => [d.y + 25, d.y + d.sh - 25].map((y) => pt(d.front, [g * xd, y, zIn], [0, 0, 1], { mate: sd, mateHole: 4 }))),
      cams: per((g, sd) => [d.y + 25, d.y + d.sh - 25].map((y) => pt(sd, [g * (xd - dt / 2), y, zIn - 30], [g, 0, 0]))),
      wire: [pt(d.bottom, [0, d.y + 12, zBk + 8], [0, -1, 0], { hole: false })],
      dowels: per((g, sd) => (g < 0 ? [0.25, 0.75] : [0.5]).map((k) => pt(sd, [g * xo, d.y + 14 + (d.sh - 14) * k, zBk], [-g, 0, 0], { mate: d.back }))),
      catchDowel: [pt(d.sides[1], [xo, d.y + 14 + (d.sh - 14) * 0.85, zBk], [-1, 0, 0], { mate: d.back })],
      catch: [pt(d.sides[1], [xo + 4, d.y + 14 + (d.sh - 14) * 0.85, zBk], [-1, 0, 0], { hole: false })],
      backCams: SG.flatMap((g) => [0.25, 0.75].map((k) => pt(d.back, [g * (xd - dt - 25), d.y + 14 + (d.sh - 14) * k, zBk - dt / 2], [0, 0, 1]))),
      runners: per((g, sd) => [pt(sd, [g * xo, d.y, zIn - 10 - runLen / 2], [0, 1, 0], { hole: false })]),
      runnerScrews: per((g, sd) => [zIn - 40, zIn - runLen / 2, zIn - runLen + 20].map((z) => pt(sd, [g * xo, d.y - 2, z], [0, 1, 0]))),
    };
  };

  /* the carcass */
  const backFeet = SG.map((sx) => [sx * xs, y0, -D / 2 + 40] as Vec3);
  b.step(
    { title: "Tap the foot sockets into the sides and screw in the feet", detail: "Lay both sides on a rug. One socket and foot in the bottom end of each side, at the back.", tools: ["hammer"], scene: "sides", kind: "legs", warnings: ["floor"] },
    () => {
      b.stagger(0.2);
      SG.forEach((sx, i) => b.stage(sideOf(sx), [0, T / 2, (i - 0.5) * (D + 60)], [0, 0, (-sx * Math.PI) / 2], [0, 160, 0]));
      b.then(0.15);
      b.fits(SOCKET, backFeet.map((at, i) => pt(sideOf(SG[i]), at, [0, 1, 0])), 0.15);
      b.then(0.1);
      b.fits(FOOT, backFeet.map((at, i) => pt(sideOf(SG[i]), at, [0, 1, 0], { hole: false })), 0.15);
    },
  );
  const runnerY = drawers.map((d) => d.y - 5);
  for (const sx of [1, -1])
    b.step(
      { title: `Screw the runners to the ${sx > 0 ? "right" : "left"} side`, detail: `Four runners marked ${sx > 0 ? "CR" : "CL"}, three screws in each. The wheel end goes at the front.`, tools: ["screwdriver"], scene: "sides", kind: "runners" },
      () => {
        b.fits(CAB_RUNNER, runnerY.map((y) => pt(sideOf(sx), [sx * xi, y, zIn - 10 - runLen / 2], [sx, 0, 0], { hole: false })), 0.12);
        b.then(0.1);
        b.fits(RUNNER_SCREW, runnerY.flatMap((y) => [zIn - 30, zIn - runLen / 2, zIn - runLen + 10].map((z) => pt(sideOf(sx), [sx * xi, y, z], [sx, 0, 0]))), 0.04);
      },
    );
  const plinthFeet = SG.map((sx) => [sx * (xi - 40), y0, zp] as Vec3);
  b.step(
    { title: "Fit sockets and feet to the plinth rail", detail: "Tap a socket into each hole in its bottom edge, then screw a foot into each by hand.", tools: ["hammer"], scene: "plinth", kind: "legs" },
    () => {
      b.stage(plinth, [0, P / 2, 0], [0, 0, 0], [0, 160, 0]);
      b.then(0.15);
      b.fits(SOCKET, plinthFeet.map((at) => pt(plinth, at, [0, 1, 0])), 0.15);
      b.then(0.1);
      b.fits(FOOT, plinthFeet.map((at) => pt(plinth, at, [0, 1, 0], { hole: false })), 0.15);
    },
  );
  b.step({ title: "Screw the L brackets onto the ends of the plinth rail", detail: "On its back face, flush with each end. Two screws in each.", tools: ["screwdriver"], scene: "plinth", kind: "screws" }, () => {
    b.fits(PLINTH_ANGLE, SG.map((sx) => pt(plinth, [sx * (xi - 20), y0 + P / 2, zp - T / 2], [0, 0, 1], { hole: false, twist: sx < 0 ? Math.PI : 0 })), 0.2);
    b.then(0.1);
    b.fits(ANGLE_SCREW, SG.flatMap((sx) => [-12, 12].map((dy) => pt(plinth, [sx * (xi - 28), y0 + P / 2 + dy, zp - T / 2], [0, 0, 1]))), 0.1);
  });
  b.step(
    { title: "Lay the left side down and screw the plinth rail to it", detail: "Runners up. The plinth stands at the front, one screw through its bracket into the side.", tools: ["screwdriver"], pose: "+x", kind: "screws", warnings: ["floor"] },
    () => {
      b.add(L, [300, 0, 0]);
      b.then(0.15);
      b.add(plinth, [300, 0, 0]);
      b.then(0.1);
      b.fit(RUNNER_SCREW, pt(L, [-xi, y0 + P / 2, zp - T / 2 - 20], [-1, 0, 0]));
    },
  );
  b.step({ title: "Take the weights out of the bottom rail", detail: "Lift the three weights out of the steel rail for now, so it's light to work with.", scene: "channel", kind: "general" }, () => {
    b.stage(channel, [0, chH / 2, 0], [0, 0, 0], [0, 160, 0]);
    weights.forEach((k, i) => b.stage(k, [(i - 1) * 250, 17, 0], [0, 0, 0], [0, 160, 0]));
    b.then(0.3);
    weights.forEach((k, i) => b.stage(k, [(i - 1) * 250, 17, chD + 80], [0, 0, 0], [0, 0, -(chD + 80)]));
  });
  b.step(
    { title: "Screw the steel rails to the side", detail: "The bottom rail at the bottom back, the flat rail halfway up at the back. Two screws at each end.", tools: ["screwdriver"], pose: "+x", kind: "screws" },
    () => {
      b.add(channel, [300, 0, 0]);
      b.add(midRail, [300, 0, 0]);
      b.then(0.15);
      b.fits(ANGLE_SCREW, [...[-15, 15].map((dz) => pt(L, [-xi, ych, zch + dz], [-1, 0, 0])), ...[-10, 10].map((dy) => pt(L, [-xi, yMid + dy, -D / 2 + 23], [-1, 0, 0]))], 0.1);
    },
  );
  b.step({ title: "Stand it up and fit the right side together", detail: "One of you holds the side up while the other screws the plinth bracket and both steel rails to it.", tools: ["screwdriver"], pose: "+y", people: 2, kind: "screws", warnings: ["two"] }, () => {
    b.add(R, [300, 0, 0]);
    b.then(0.15);
    b.fit(RUNNER_SCREW, pt(R, [xi, y0 + P / 2, zp - T / 2 - 20], [1, 0, 0]));
    b.fits(ANGLE_SCREW, [...[-15, 15].map((dz) => pt(R, [xi, ych, zch + dz], [1, 0, 0])), ...[-10, 10].map((dy) => pt(R, [xi, yMid + dy, -D / 2 + 23], [1, 0, 0]))], 0.1);
  });
  b.step({ title: "Put the weights back in the bottom rail", detail: "Press each one down into the rail until it sits flat. They keep the chest from tipping.", kind: "general", warnings: ["tip"] }, () => {
    b.stagger(0.2);
    for (const k of weights) b.add(k, [0, 200, 0]);
  });
  b.step({ title: "Slide the back panel down the grooves", detail: "White side in, down into the groove in the bottom rail.", kind: "join" }, () => b.add(back, [0, H, 0]));
  b.step({ title: "Tap the dowels into the tops of the sides", detail: "Two in each.", tools: ["hammer"], kind: "dowels" }, () =>
    b.fits(HW.dowel, SG.flatMap((sx) => [D / 2 - 90, -D / 2 + 90].map((z) => pt(sideOf(sx), [sx * xs, ytop, z], [0, -1, 0], { mate: top }))), 0.1),
  );
  const bx = [-W / 4, W / 4];
  b.step({ title: "Screw the wall brackets under the top", detail: "Lay the top upside down. A washer and a screw in each bracket, at the back edge.", tools: ["screwdriver"], scene: "top", kind: "screws", warnings: ["face"] }, () => {
    b.stage(top, [0, T / 2, 0], UPSIDE, [0, 160, 0]);
    b.then(0.15);
    b.fits(TOP_BRACKET, bx.map((x) => pt(top, [x, ytop, -D / 2 + 6], [0, 1, 0], { hole: false, travel: 80 })), 0.2);
    b.then(0.1);
    b.fits(HW.washer, bx.map((x) => pt(top, [x, ytop - 2, -D / 2 + 30], [0, 1, 0], { hole: false })), 0.15);
    b.fits(TOP_BRACKET_SCREW, bx.map((x) => pt(top, [x, ytop - 3, -D / 2 + 30], [0, 1, 0])), 0.15);
  });
  const camZ = [D / 2 - 45, -D / 2 + 45];
  b.step({ title: "Screw the cam bolts into the top", detail: "Four, by hand until they stop.", tools: ["screwdriver"], scene: "top", kind: "cams" }, () =>
    b.fits(HW.camScrew, SG.flatMap((sx) => camZ.map((z) => pt(top, [sx * xs, ytop, z], [0, 1, 0], { mate: sideOf(sx), mateHole: 4 }))), 0.1),
  );
  b.step({ title: "Lower the top on", detail: "Onto the dowels and bolts, the back's top edge going into its groove.", kind: "join" }, () => b.add(top, [0, 300, 0]));
  b.step({ title: "Lock the cam locks under the top", detail: "Arrow towards the bolt, then a clockwise turn.", tools: ["screwdriver"], kind: "cams" }, () =>
    b.fits(HW.cam, SG.flatMap((sx) => camZ.map((z) => pt(sideOf(sx), [sx * xi, ytop - 25, z], [sx, 0, 0]))), 0.12),
  );
  const zb = -D / 2 + 10;
  b.step({ title: "Clip the back to the back rail", detail: "Three clips through the back into the steel rail, from behind. Push each in, then press its wedge in.", kind: "general" }, () =>
    b.fits(CLIP, [-W / 4, 0, W / 4].map((x) => pt(back, [x, yMid, zb], [0, 0, 1], { hole: false })), 0.12),
  );
  b.step({ title: "Clip the back under the top", detail: "Four clips along the top edge of the back. Check the corners are square first.", kind: "general", check: "square" }, () =>
    b.fits(CLIP, spread(-(W / 2 - T - 60), W / 2 - T - 60, 4).map((x) => pt(back, [x, ytop - 30, zb], [0, 0, 1], { hole: false })), 0.12),
  );
  b.step({ title: "Fit the drawer interlock", detail: "It stands inside the right side at the front. Hook it in at the top and screw its foot in at the bottom.", tools: ["screwdriver"], kind: "screws" }, () => {
    b.add(rod, [-120, 0, 120]);
    b.then(0.15);
    b.fit({ kind: "screw", len: 10, dia: 4 }, pt(R, [xi, y0 + P + 40, D / 2 - T - 6], [1, 0, 0]));
  });
  const rodYs = spread(y0 + P + 80, ytop - 60, 7);
  b.step({ title: "Clip the interlock to the side", detail: "Seven clips hold it against the side, all the way up.", kind: "general" }, () =>
    b.fits(ROD_CLIP, rodYs.map((y) => pt(R, [xi - 4, y, D / 2 - T - 16], [1, 0, 0], { hole: false })), 0.08),
  );
  b.step({ title: "Press the drawer stops into the side", detail: "Eight, in the holes by the interlock. They let only one drawer open at a time.", kind: "general" }, () =>
    b.fits(STOP, drawers.flatMap((d) => [d.y + 10, d.y + d.sh - 10].map((y) => pt(R, [xi, y, D / 2 - T - 26], [1, 0, 0], { hole: false }))), 0.06),
  );
  const wy = ytop - 60;
  b.step(
    { title: "Mark, drill and plug the wall", detail: "Push the chest to the wall and mark through the brackets. Move it away to drill, then push in the plugs.", tools: ["pencil", "drill", "hammer"], kind: "anchor", wall: true, warnings: ["wall", "tip"] },
    () => b.fits(PLUG, bx.map((x) => ({ at: [x, wy, -D / 2 - 1] as Vec3, dir: [0, 0, -1] as Vec3 })), 0.2),
  );
  b.step({ title: "Screw it to the wall", detail: `Push it back and put a washer and screw through each bracket. ${WALL_WORDS}`, tools: ["screwdriver"], kind: "anchor", wall: true, warnings: ["tip"] }, () => {
    b.fits(HW.washer, bx.map((x) => ({ at: [x, wy, -D / 2 + 4] as Vec3, dir: [0, 0, -1] as Vec3 })), 0.15);
    b.fits(CHEST_WALL_SCREW, bx.map((x) => ({ at: [x, wy, -D / 2 + 6] as Vec3, dir: [0, 0, -1] as Vec3 })), 0.2);
  });

  /* the drawers, built on their fronts */
  const d0 = drawers[0];
  const c0: Vec3 = [0, d0.y + d0.sh / 2, zs];
  const rel = (k: string): Vec3 => {
    const p = fin(b, k);
    return [p[0] - c0[0], p[1] - c0[1], p[2] - c0[2]];
  };
  const stage = (k: string, from: Vec3) => b.stage(k, rel(k), [0, 0, 0], from);
  const f0 = fitsOf(d0);
  const dstep = (title: string, detail: string, body: () => void, o: { tools?: ("screwdriver" | "hammer")[]; kind?: "cams" | "dowels" | "drawer" | "screws" | "runners"; pose?: Pose } = {}) =>
    b.step({ title, detail, tools: o.tools, scene: "drawer", pose: o.pose ?? "-z", repeat: 4, kind: o.kind ?? "drawer" }, body);
  dstep("Fit the bumpers and cam bolts into a drawer front", "Lay the front face down on a rug. Two bumpers near the ends, four cam bolts by hand.", () => {
    stage(d0.front, [0, 0, -160]);
    b.then(0.15);
    b.fits(DRAWER_BUMPER, f0.bumpers, 0.15);
    b.fits(DRAWER_BOLT, f0.bolts, 0.1);
  }, { tools: ["screwdriver"], kind: "cams" });
  dstep("Push the sides onto the front", "Grooves inwards and at the bottom.", () => {
    b.stagger(0.25);
    for (const sd of d0.sides) stage(sd, [0, 0, -300]);
  });
  dstep("Lock the sides with round cam locks", "Two in each side. Arrow towards the bolt, then a clockwise turn.", () => b.fits(ROUND_CAM, f0.cams, 0.12), { tools: ["screwdriver"], kind: "cams" });
  dstep("Slide in the drawer bottom", "Smooth side in, down the grooves until it reaches the front.", () => stage(d0.bottom, [0, 0, -420]));
  dstep("Clip the wire stop onto the bottom", "Onto the back edge of the bottom, its hooks into the two holes.", () => b.fits(WIRE, f0.wire, 0.1));
  dstep("Put the drawer back on", "Its groove goes over the edge of the bottom.", () => stage(d0.back, [0, 0, -260]));
  dstep("Push in the plastic dowels and the catch", "Three dowels through the sides into the back. The fourth goes through the interlock catch on the right side.", () => {
    b.fits(PLASTIC_DOWEL, f0.dowels, 0.12);
    b.then(0.1);
    b.fits(CATCH, f0.catch, 0.1);
    b.fits(PLASTIC_DOWEL, f0.catchDowel, 0.1);
  }, { tools: ["hammer"], kind: "dowels" });
  dstep("Lock the back with round cam locks", "Four in the back, then a clockwise turn each.", () => b.fits(ROUND_CAM, f0.backCams, 0.12), { tools: ["screwdriver"], kind: "cams" });
  dstep("Turn it over and screw on the runners", "The runners are marked left and right. Three screws in each.", () => {
    b.fits(DRAWER_RUNNER, f0.runners, 0.25);
    b.then(0.1);
    b.fits(DRAWER_RUNNER_SCREW, f0.runnerScrews, 0.08);
  }, { tools: ["screwdriver"], kind: "runners", pose: "-y" });
  b.step({ title: "Slide in the drawers", detail: "The shallow one goes at the top. Rest each on the runners in the chest and push until it closes.", kind: "drawer", warnings: ["tip"] }, () => {
    for (const [i, d] of drawers.entries()) {
      b.stagger(0);
      for (const k of [d.front, ...d.sides, d.bottom, d.back]) b.add(k, [0, 0, 520]);
      if (i > 0) {
        const f = fitsOf(d);
        const all: [HwDef, FitOpts[]][] = [
          [DRAWER_BUMPER, f.bumpers],
          [DRAWER_BOLT, f.bolts],
          [ROUND_CAM, f.cams],
          [WIRE, f.wire],
          [PLASTIC_DOWEL, [...f.dowels, ...f.catchDowel]],
          [CATCH, f.catch],
          [ROUND_CAM, f.backCams],
          [DRAWER_RUNNER, f.runners],
          [DRAWER_RUNNER_SCREW, f.runnerScrews],
        ];
        for (const [def, list] of all) for (const o of list) b.preset(def, o);
      }
      b.wait(0.22);
    }
  });
  holeCapStep(b, { W, H: Hs, D, y0 }, L, R, 8);
  return true;
}

const family: Family = {
  names: ["LASTARE", "LÄSTARE"],
  build(b, s) {
    const slug = s.slug ?? "";
    if (/lastare-frame/.test(slug)) return buildFrame(b, s);
    if (/height-extension/.test(slug)) return buildExtension(b, s);
    if (/wall-mounted-frame/.test(slug)) return buildWallFrame(b, s);
    if (/lastare-bench/.test(slug)) return buildBench(b, s);
    if (/lastare-table/.test(slug)) return buildTable(b, s);
    if (/chest-4-drawers/.test(slug)) return buildChest(b, s);
    return false;
  },
};
export default family;
