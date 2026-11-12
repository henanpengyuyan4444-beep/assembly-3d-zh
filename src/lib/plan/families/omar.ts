import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PartItem } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/*
 * OMAR, read from IKEA's manuals (the 94 cm shelving unit, the bottle shelf, the 60x25x40 unit and the unit with a
 * clothes rail). Everything is galvanised steel and goes together by hand: four round posts, open wire shelves with a
 * tapered ring at each corner, and plastic sleeves in two halves that snap into a groove on each post. A foot is
 * screwed into the bottom of each post, sleeves go on for the bottom shelf, and the shelf is slid onto the posts with
 * the unit lying on its back. Stood up, each further level is sleeves first, then a shelf pushed down onto them, and
 * caps go on top. Two clamps hold the back posts to the wall (the small unit is tied to it with a strap).
 * The clothes rail unit joins three lengths of post and hangs its rail under the third shelf on two holders.
 * The 181 cm column is the bottle shelf unit with a 3-shelf unit stacked on top, posts pushed into posts.
 */

const POST = 25; // post diameter
const RING = 34; // the corner rings of a shelf
const FOOT = 25; // adjustable foot under each post
const ST = 30; // a wire shelf's depth
const IN = 16; // post centre in from the outside

type Kind = "wire" | "bottle";
interface Unit {
  key: string; // id prefix
  W: number;
  D: number;
  dx: number; // where it stands in the set
  y0: number; // bottom of its posts (stacked units start on the posts below)
  posts: number[]; // post lengths, bottom up (the clothes rail joins three)
  levels: number[]; // shelf centres, bottom up
  kinds: Kind[];
  feet: boolean;
  caps: boolean;
  rail: boolean;
  lying: boolean; // the bottom shelf goes on with the unit lying on its back (alone on the floor)
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const spread = (a: number, c: number, n: number) => range(n).map((i) => (n === 1 ? (a + c) / 2 : a + ((c - a) * i) / (n - 1)));

/** An open wire shelf: corner rings round the posts, a rim of rod, and cross wires (or bottle cradles) between. */
function shelfPieces(W: number, D: number, kind: Kind): PartPiece[] {
  const px = W / 2 - IN, pz = D / 2 - IN;
  const rodX = (z: number, y = 0, d = 6): PartPiece => ({ shape: "cyl", size: [d, 2 * px, d], pos: [0, y, z], rot: [0, 0, Math.PI / 2], material: "metal" });
  const rodZ = (x: number, y = 0, d = 6): PartPiece => ({ shape: "cyl", size: [d, 2 * pz, d], pos: [x, y, 0], rot: [Math.PI / 2, 0, 0], material: "metal" });
  const out: PartPiece[] = [];
  for (const x of [-px, px]) for (const z of [-pz, pz]) out.push({ shape: "cyl", size: [RING, ST + 8, RING], pos: [x, 0, z], material: "metal" });
  out.push(rodX(-pz, ST / 2 - 4), rodX(pz, ST / 2 - 4), rodZ(-px, ST / 2 - 4), rodZ(px, ST / 2 - 4));
  out.push(rodX(-pz, -ST / 2 + 4, 5), rodX(pz, -ST / 2 + 4, 5));
  if (kind === "wire") {
    const n = Math.max(6, Math.round((2 * px) / 26));
    for (const x of spread(-px + 22, px - 22, n)) out.push(rodZ(x, ST / 2 - 6, 4));
    for (const z of [-pz / 2, pz / 2]) out.push(rodX(z, ST / 2 - 10, 5));
  } else {
    // bottle cradles: wires running front to back, dipping between the bottles
    const n = Math.max(3, Math.round((2 * px) / 100));
    for (const [i, x] of spread(-px + 40, px - 40, 2 * n + 1).entries()) out.push(rodZ(x, i % 2 ? -ST / 2 + 2 : ST / 2 - 6, 4));
  }
  return out;
}

const sleeveName = "Shelf sleeve";
const W_SCREW = { kind: "screw" as const, len: 50, dia: 5 };

interface Laid {
  first: number; // step the posts come out in
  shelf: number; // step the bottom shelf goes onto two of them (the other two follow in the next)
  posts: string[];
  standing?: boolean; // all four come in at once, stood up round the shelf
}

function unitRecipe(u: Unit): { parts: CustomPart[]; steps: CustomStep[]; backTop: Vec3[]; laid: Laid } {
  const { key, W, D, dx, y0 } = u;
  const px = W / 2 - IN, pz = D / 2 - IN;
  const corners: [number, number][] = [
    [-px, -pz],
    [px, -pz],
    [-px, pz],
    [px, pz],
  ];
  const parts: CustomPart[] = [];
  const id = (s: string) => `${key}${s}`;
  // posts: one length, or three joined end to end
  let y = y0;
  const segs = u.posts.map((len, si) => {
    const ids = corners.map((c, ci) => {
      const pid = id(`P${si}${ci}`);
      parts.push({ id: pid, name: u.posts.length > 1 ? ["Lower post", "Upper post", "Top post"][si] : "Post", size: [POST, len, POST], pos: [dx + c[0], y + len / 2, c[1]], shape: "cyl", material: "metal" });
      return pid;
    });
    const seg = { ids, y0: y, y1: y + len };
    y += len;
    return seg;
  });
  const top = y;
  const postAt = (yy: number, ci: number) => segs.find((s) => yy >= s.y0 && yy <= s.y1)?.ids[ci] ?? segs[segs.length - 1].ids[ci];
  const shelves = u.levels.map((ly, i) => {
    const sid = id(`S${i}`);
    parts.push({ id: sid, name: u.kinds[i] === "bottle" ? "Bottle shelf" : "Shelf", size: [2 * px + RING, ST + 8, 2 * pz + RING], pos: [dx, ly, 0], pieces: shelfPieces(W, D, u.kinds[i]), material: "metal" });
    return sid;
  });
  // the clothes rail hangs on two holders under the third shelf
  const railY = u.rail ? u.levels[2] - 170 : 0;
  if (u.rail) {
    for (const g of [-1, 1]) parts.push({ id: id(`H${g < 0 ? 0 : 1}`), name: "Rail holder", size: [4, 160, 22], pos: [dx + g * (px - 30), u.levels[2] - ST / 2 - 80, 0], material: "metal" });
    parts.push({ id: id("R"), name: "Clothes rail", size: [2 * px - 64, POST, POST], pos: [dx, railY, 0], shape: "cyl", material: "metal" });
  }

  // two sleeve halves snap round each post, just under where the shelf's ring will sit
  const sleeves = (level: number): CustomFix[] => {
    const yy = u.levels[level] - ST / 2 - 14;
    return [-1, 1].map((g) => ({
      kind: "clip",
      name: sleeveName,
      count: 4,
      len: 40,
      dia: 14,
      at: corners.map((c): Vec3 => [dx + c[0] + g * (POST / 2 + 2), yy, c[1]]),
      dir: [-g, 0, 0],
    }));
  };
  const feet: CustomFix = { kind: "foot", name: "Adjustable foot", count: 4, len: FOOT, dia: 26, at: corners.map((c): Vec3 => [dx + c[0], y0, c[1]]), dir: [0, 1, 0] };
  const caps: CustomFix = { kind: "cap", name: "Post cap", count: 4, len: 8, dia: POST, at: corners.map((c): Vec3 => [dx + c[0], top, c[1]]), dir: [0, -1, 0] };
  const steps: CustomStep[] = [];
  const lower = segs[0].ids;
  const many = u.levels.length;
  // the posts lie on the floor for their feet and first sleeves (laid out by relay() after the guide is built)
  const fresh = (st: CustomStep, first: boolean): CustomStep => (first ? { ...st, add: lower } : st);
  if (u.feet) steps.push(fresh({ title: "Screw a foot into each post", detail: "Into the end without the joint, by hand. Leave them screwed right in; you level the unit at the end.", fix: [feet] }, true));
  steps.push(fresh({ title: "Snap the sleeves on for the bottom shelf", detail: "Two halves round each post, in the same groove on all four. The narrow end of the sleeve points up.", fix: sleeves(0) }, !u.feet));
  const laid: Laid = { first: 0, shelf: steps.length, posts: lower, standing: !u.lying };
  if (u.lying) {
    steps.push({ title: "Slide the bottom shelf onto two posts", detail: "With the posts on the floor, push the shelf's corner rings over the sleeves of two of them until they wedge tight.", add: [shelves[0]], pose: "+z", warnings: ["floor"], from: { [shelves[0]]: [0, 0, 300] } });
    steps.push({ title: "Push the other two posts in", detail: "The same at the other two corners of the shelf.", kind: "join" });
  } else {
    steps.push({ title: "Push the bottom shelf onto the posts", detail: "As before: corner rings over the sleeves of all four posts until they wedge tight.", add: [shelves[0]], from: { [shelves[0]]: [0, 400, 0] } });
  }
  for (let i = 1; i < many; i++) {
    const turned = u.lying && i === 1;
    // the clothes rail unit joins the next length of post before the levels above it
    const seg = segs.findIndex((s, si) => si > 0 && u.levels[i] > s.y0 && u.levels[i] <= s.y1 + 40);
    if (seg > 0 && !steps.some((st) => st.add?.includes(segs[seg].ids[0]))) {
      if (seg === 2) {
        steps.push({ title: "Snap sleeves onto the four short posts", detail: "At the top end of each one, for the top shelf. Then push them into the tops of the posts, joint end down.", fix: sleeves(i), add: segs[seg].ids, from: Object.fromEntries(segs[seg].ids.map((k) => [k, [0, 500, 0] as Vec3])) });
        if (u.caps) steps.push({ title: "Press a cap into each short post", detail: "By hand, into the top end.", fix: [caps] });
        steps.push({ title: "Push the top shelf down onto its sleeves", detail: "Press each corner down evenly until the rings sit tight.", add: [shelves[i]], from: { [shelves[i]]: [0, 400, 0] } });
        continue;
      }
      steps.push({ title: "Push the upper posts into the lower ones", detail: "The joint end goes down into each lower post. Press until the shoulder meets the post.", add: segs[seg].ids, from: Object.fromEntries(segs[seg].ids.map((k) => [k, [0, 500, 0] as Vec3])) });
    }
    steps.push({ title: turned ? "Stand it up and snap on the next sleeves" : i === many - 1 ? "Snap on the sleeves for the top shelf" : "Snap on the sleeves for the next shelf", detail: turned ? "Stand the unit on its feet. Two halves round each post, at the height you want the shelf, the same groove on all four." : "Same groove on all four posts, so the shelf sits level.", fix: sleeves(i), pose: turned ? "+y" : undefined });
    steps.push({ title: i === many - 1 ? "Push the top shelf down onto the posts" : "Push the next shelf down onto the posts", detail: "Over the tops of the posts and down onto the sleeves. Press each corner until the rings wedge tight.", add: [shelves[i]], from: { [shelves[i]]: [0, Math.max(300, top - u.levels[i] + 200), 0] } });
  }
  if (u.caps && !u.rail) steps.push({ title: "Press a cap onto each post", detail: "Into the top of every post, by hand.", fix: [caps] });
  if (u.rail) {
    const hs = [id("H0"), id("H1")];
    steps.push({ title: "Hang the rail holders on the third shelf", detail: "One near each side, hooked over the front and back wires. A screw in each locks it on.", add: hs, fix: [{ kind: "screw", count: 2, len: 10, dia: 4, at: [-1, 1].map((g): Vec3 => [dx + g * (px - 30), u.levels[2] - ST / 2 - 4, 0]), dir: [0, 0, -1] }], tools: ["screwdriver"] });
    steps.push({ title: "Screw the clothes rail between the holders", detail: "Lift it up between the holders and put a screw through each one into the end of the rail.", add: [id("R")], fix: [-1, 1].map((g): CustomFix => ({ kind: "screw", count: 1, len: 10, dia: 4, at: [[dx + g * (px - 30 + 2), railY, 0]], dir: [-g, 0, 0] })), tools: ["screwdriver"], from: { [id("R")]: [0, -300, 0] } });
    steps.push({ title: "Hang the hooks on the top shelf", detail: "Four S-hooks over the front wire, for bags and hangers.", fix: [{ kind: "hook", name: "S-hook", count: 4, len: 60, dia: 20, at: spread(-px + 60, px - 60, 4).map((x): Vec3 => [dx + x, u.levels[many - 1] + ST / 2, pz]), dir: [0, -1, 0] }] });
  }
  const backTop: Vec3[] = [-1, 1].map((g) => [dx + g * px, top - 150, -pz]);
  return { parts, steps, backTop, laid };
}

/** Two clamps round the back posts near the top, screwed to the wall; spacers only behind a skirting board. */
function wallStep(backTop: Vec3[], D: number, strap = false): CustomStep {
  const wz = -D / 2 - 6;
  if (strap)
    return {
      title: "Strap it to the wall",
      detail: "Thread the strap round the top shelf's back wire and screw it to the wall. Never cut or burn the strap. Wall screws aren't included: pick ones made for your wall.",
      fix: [
        { kind: "strap", count: 1, at: [[0, backTop[0][1] + 120, wz]], dir: [0, -1, 0] },
        { kind: "plug", count: 1, at: [[0, backTop[0][1] + 100, wz - 20]], dir: [0, 0, -1] },
        { ...W_SCREW, count: 1, at: [[0, backTop[0][1] + 100, wz - 16]], dir: [0, 0, -1] },
      ],
      tools: ["drill", "screwdriver", "pencil"],
      wall: true,
      warnings: ["wall", "tip"],
    };
  return {
    title: "Clamp the back posts to the wall",
    detail: "Snap a clamp round each back post near the top and screw it to the wall. Against a skirting board, put a spacer behind each clamp. Wall screws aren't included: pick ones made for your wall.",
    fix: [
      { kind: "bracket", name: "Wall clamp", count: 2, len: 50, dia: 30, at: backTop.map((p): Vec3 => [p[0], p[1], p[2] - POST / 2]), dir: [0, 0, 1] },
      { kind: "spacer", count: 2, len: 15, dia: 30, at: backTop.map((p): Vec3 => [p[0], p[1], wz + 4]), dir: [0, 0, 1] },
      { kind: "plug", count: 2, at: backTop.map((p): Vec3 => [p[0], p[1], wz - 20]), dir: [0, 0, -1] },
      { ...W_SCREW, count: 2, at: backTop.map((p): Vec3 => [p[0], p[1], wz - 16]), dir: [0, 0, -1] },
    ],
    tools: ["drill", "screwdriver", "pencil"],
    wall: true,
    warnings: ["wall", "tip"],
  };
}

/** Shelf centres for a run of shelves on a post, bottom just above the feet and top level with the post's top. */
const levelsOf = (bottom: number, top: number, n: number) => spread(bottom, top, n);

const isRail = (s: ProductSpec) => !!s.shelf?.rail || /clothes rail/i.test(s.variant);

function railUnit(key: string, W: number, D: number, dx: number, lying: boolean): Unit {
  // posts of about 94 + 78 + 26 cm; two low shelves, a third with the rail under it and one on top
  return { key, W, D, dx, y0: FOOT, posts: [905, 780, 298], levels: [150, 420, 1690, 1990 - ST / 2], kinds: ["wire", "wire", "wire", "wire"], feet: true, caps: true, rail: true, lying };
}
function plainUnit(key: string, W: number, H: number, D: number, dx: number, n: number, lying: boolean, kind: Kind = "wire", y0 = FOOT, feet = true, caps = true): Unit {
  const len = H - y0 - 2;
  const bottom = y0 === FOOT ? (H < 500 ? 110 : 140) : y0 + 260;
  return { key, W, D, dx, y0, posts: [len], levels: levelsOf(bottom, H - 2 - ST / 2 - 4, n), kinds: range(n).map(() => kind), feet, caps, rail: false, lying };
}

/**
 * The custom builder adds parts where they end up, so the loose posts would stand in place for their feet and
 * sleeves. Show them lying side by side on the floor instead, and bring them in as the bottom shelf goes on.
 */
function relay(b: PlanBuilder, r: Built) {
  const items = b.items.filter((it): it is PartItem => it.kind === "part");
  for (const l of r.laid ?? []) {
    const keys = l.posts.map((pid) => items[r.parts.findIndex((p) => p.id === pid)]);
    if (keys.some((k) => !k) || !b.steps[l.shelf + 1]) continue;
    for (let n = l.first; n < l.shelf; n++) b.steps[n].scene = "floor";
    keys.forEach((it, i) => {
      const st = it.states.find((x) => x.step === l.first);
      if (!st) return;
      st.scene = "floor";
      st.pos = [0, POST / 2, (i - 1.5) * 110];
      st.rot = [0, 0, Math.PI / 2];
      const late = !l.standing && i >= 2;
      it.states.push({ step: late ? l.shelf + 1 : l.shelf, scene: "main", pos: it.final.pos, rot: it.final.rot, from: l.standing ? [0, 400, 0] : [0, -500, 0], delay: l.standing ? 0.1 + i * 0.15 : (late ? 0.2 : 1.2) + (i % 2) * 0.3 });
    });
  }
}

const shift = (l: Laid, n: number): Laid => ({ ...l, first: l.first + n, shelf: l.shelf + n });

interface Built extends CustomParams {
  laid?: Laid[];
}

function recipe(s: ProductSpec): Built | null {
  if (s.archetype !== "shelf") return null;
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const slug = s.slug ?? "";
  if (isRail(s)) {
    if (W > 1200) return null; // the set is drawn by row()
    const u = unitRecipe(railUnit("", W, D, 0, true));
    return { parts: u.parts, steps: [...u.steps, wallStep(u.backTop, D)], laid: [u.laid] };
  }
  if (/46-x-36-x-181/.test(slug)) {
    // the bottle shelf unit below, a 3-shelf unit stacked on its posts
    const lowH = 940;
    const lo = unitRecipe(plainUnit("L", W, lowH, D, 0, 6, true, "bottle", FOOT, true, false));
    const hi = unitRecipe(plainUnit("U", W, H, D, 0, 3, false, "wire", lowH - 10, false, true));
    const hiSteps = hi.steps.map((st, i) =>
      i === 0
        ? { ...st, title: "Snap the sleeves on for the first shelf of the top unit", detail: "Leave the caps off the bottle unit. The second unit's posts go without feet: their joint end pushes into the posts below." }
        : i === 1
          ? { ...st, title: "Push the top unit's posts into the bottle unit", detail: "Joint end down into each post, then push its first shelf down onto the sleeves." }
          : st,
    );
    return { parts: [...lo.parts, ...hi.parts], steps: [...lo.steps, ...hiSteps, wallStep(hi.backTop, D)], laid: [lo.laid, shift(hi.laid, lo.steps.length)] };
  }
  const small = H < 500;
  const n = small ? 2 : H > 1500 ? 4 : 3;
  // no manual for the 181 cm shelf section; it is the same system on longer posts
  const u = unitRecipe(plainUnit("", W, H, D, 0, n, true));
  return { parts: u.parts, steps: [...u.steps, wallStep(u.backTop, D, small)], laid: [u.laid] };
}

/** The clothes rail unit with a 3-shelf unit beside it: two separate units, each on its own posts. */
function row(b: PlanBuilder, s: ProductSpec) {
  if (s.archetype !== "shelf" || !isRail(s) || s.size.w * 10 < 1200) return false;
  const W = s.size.w * 10, D = s.size.d * 10;
  const uw = (W - 20) / 2;
  const a = unitRecipe(railUnit("A", uw, D, -W / 2 + uw / 2, true));
  const c = unitRecipe(plainUnit("B", uw, 940, D, W / 2 - uw / 2, 3, false));
  const bSteps = c.steps.map((st, i) => (i === 0 ? { ...st, title: "Screw the feet into the shelving unit's posts" } : st));
  const steps: CustomStep[] = [
    ...a.steps,
    wallStep(a.backTop, D),
    { title: "Now build the shelving unit", detail: "It stands on its own posts beside the clothes rail unit. The steps are the same as before." },
    ...bSteps,
    { ...wallStep(c.backTop, D), title: "Clamp the shelving unit to the wall" },
  ];
  const parts = [...a.parts, ...c.parts];
  buildCustom(b, { ...s, custom: { parts, steps } });
  relay(b, { parts, steps, laid: [a.laid, shift(c.laid, a.steps.length + 2)] });
  return true;
}

const family: Family = {
  names: ["OMAR"],
  build(b, s) {
    const r = recipe(s);
    if (!r) return false;
    buildCustom(b, { ...s, custom: { parts: r.parts, steps: r.steps } });
    relay(b, r);
    return true;
  },
  row,
};
export default family;
