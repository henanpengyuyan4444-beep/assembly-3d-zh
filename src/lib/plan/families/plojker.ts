import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartItem, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * PLÖJKER bedside table, read from its manual. The runners and the corner brackets go on the two sides, the sides
 * take cam bolts, and the cabinet is built lying on its left side: bottom, top and the two back rails onto dowels,
 * cams locked, then the right side on top. It stands on four feet or hangs on four wall screws by the brackets.
 * Two drawers are built standing on their backs: the back board takes cam bolts, the sides slide on, the hardboard
 * bottom slides down their grooves and the front board closes them. The small upper drawer hides behind the tall
 * front, which hooks onto the lower drawer last.
 */

const W = 410, H = 500, D = 410, T = 18;
const XI = W / 2 - T; // inside face of a side
const Y0 = 20; // the sides stand on the feet
const ZB = -D / 2, ZF = D / 2;
const HUNG = [[-1, 78], [1, 78], [-1, 422], [1, 422]] as const;

const panel = (id: string, name: string, lo: Vec3, hi: Vec3, material: CustomPart["material"] = "board"): CustomPart => ({
  id,
  name,
  size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
  pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
  material,
});
const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });
const side = (sx: number) => (sx < 0 ? "SL" : "SR");

/** One drawer box between the runners, from y0 to y1; its parts are prefixed with p. */
function drawer(p: string, y0: number, y1: number) {
  const xo = 173, t = 14, zb = -175, zf = 165;
  const parts: CustomPart[] = [
    panel(`${p}K`, "Drawer back", [-xo + t, y0, zb], [xo - t, y1, zb + 16]),
    panel(`${p}L`, "Drawer side", [-xo, y0, zb], [-xo + t, y1, zf]),
    panel(`${p}R`, "Drawer side", [xo - t, y0, zb], [xo, y1, zf]),
    panel(`${p}B`, "Drawer bottom", [-xo + 6, y0 + 10, zb + 16], [xo - 6, y0 + 13, zf - 16], "fiber"),
    panel(`${p}F`, "Drawer front board", [-xo + t, y0, zf - 16], [xo - t, y1, zf]),
  ];
  const yc = (y0 + y1) / 2, dy = (y1 - y0) / 4;
  const ends = (z: number): Vec3[] => [-1, 1].flatMap((sx) => [yc - dy, yc + dy].map((y): Vec3 => [sx * (xo - t), y, z]));
  const steps = (big: boolean): CustomStep[] => [
    {
      title: "Screw the cam bolts into the drawer back",
      detail: "Four small ones into its ends. The drawer is built standing on this board.",
      fix: [-1, 1].map((sx) => fx("camScrew", ends(zb + 8).filter((q) => q[0] * sx > 0), [sx, 0, 0], `${p}K`, { mate: sx < 0 ? `${p}L` : `${p}R` })),
      add: [`${p}K`],
      tools: ["screwdriver"],
      pose: "+z",
    },
    { title: "Slide the drawer sides on", detail: "Grooves facing in, the runner holes to the outside.", add: [`${p}L`, `${p}R`], from: { [`${p}L`]: [0, 0, 260], [`${p}R`]: [0, 0, 260] } },
    {
      title: "Lock the sides with four cams",
      detail: "Arrow towards the bolt, then turn clockwise.",
      fix: [-1, 1].map((sx) => fx("cam", ends(zb + 8).filter((q) => q[0] * sx > 0).map((q): Vec3 => [sx * (xo - 7), q[1], zb + 40]), [-sx, 0, 0], sx < 0 ? `${p}L` : `${p}R`)),
      tools: ["screwdriver"],
    },
    { title: "Slide the bottom down the grooves", detail: "Smooth side in, all the way to the back board.", add: [`${p}B`], from: { [`${p}B`]: [0, 0, 300] } },
    {
      title: "Put the front board on",
      detail: "Four long cam bolts into the sides' edges first, then lay the board over them.",
      add: [`${p}F`],
      fix: [-1, 1].map((sx) => fx("camScrew", ends(zf).filter((q) => q[0] * sx > 0), [0, 0, -1], sx < 0 ? `${p}L` : `${p}R`, { name: "Long cam bolt", len: 40, dia: 8, mate: `${p}F` })),
      from: { [`${p}F`]: [0, 0, 220] },
      tools: ["screwdriver"],
    },
    {
      title: "Lock the front board",
      detail: "Four cams into the board, turned until they grip.",
      fix: [fx("cam", ends(zf).map((q): Vec3 => [q[0] * 0.8, q[1], zf]), [0, 0, -1], `${p}F`)],
      tools: ["screwdriver"],
    },
    {
      title: "Screw the rails onto the drawer",
      detail: "One along the bottom of each side, two screws each. Use a hand screwdriver, not a drill.",
      fix: [
        ...[-1, 1].map((sx) => fx("runner", [[sx * xo, y0 + 8, (zb + zf) / 2]], [sx, 0, 0], sx < 0 ? `${p}L` : `${p}R`, { len: 330 })),
        ...[-1, 1].map((sx) => fx("screw", [[sx * xo, y0 + 8, zb + 60], [sx * xo, y0 + 8, zf - 60]], [-sx, 0, 0], sx < 0 ? `${p}L` : `${p}R`, { len: 12, dia: 3.5 })),
      ],
      tools: ["screwdriver"],
      pose: "+y",
    },
    {
      title: big ? "Screw the front fittings into the board" : "Screw in the two catches",
      detail: big ? "Two of them, in the front board's top corners. The tall front hooks onto them." : "Into the front board, near the top. They lock the drawer onto its runners.",
      fix: [fx("connector", [[-120, y1 - 20, zf], [120, y1 - 20, zf]], [0, 0, -1], `${p}F`, { name: "Front fitting", len: 12, dia: 10 })],
      tools: ["screwdriver"],
    },
  ];
  return { parts, steps };
}

function table(): CustomParams {
  const yBt = Y0 + T, yTp = 462; // bottom panel's top, top panel's underside (the top sits 20 below the edge)
  const zC = [-120, 120];
  const A = drawer("A", 300, 400);
  const B = drawer("B", 50, 260);
  const parts: CustomPart[] = [
    panel("SL", "Side panel", [-W / 2, Y0, ZB], [-XI, H, ZF]),
    panel("SR", "Side panel", [XI, Y0, ZB], [W / 2, H, ZF]),
    panel("BOT", "Bottom panel", [-XI, Y0, ZB], [XI, yBt, ZF - T]),
    panel("TOP", "Top panel", [-XI, yTp, ZB + T], [XI, yTp + T, ZF - T]),
    panel("BR1", "Back rail", [-XI, yBt, ZB], [XI, yBt + 80, ZB + T]),
    panel("BR2", "Back rail", [-XI, yTp - 80, ZB], [XI, yTp, ZB + T]),
    ...A.parts,
    ...B.parts,
    panel("FRONT", "Drawer front", [-XI + 2, Y0 + 5, ZF - T], [XI - 2, H - 2, ZF]),
  ];
  // what each side's cam bolts go into: bottom (three), top (two), each back rail (one)
  const camPts = (sx: number) => ({
    BOT: [...zC, 0].map((z): Vec3 => [sx * XI, Y0 + T / 2, z]),
    TOP: zC.map((z): Vec3 => [sx * XI, yTp + T / 2, z]),
    BR1: [[sx * XI, yBt + 40, ZB + T / 2] as Vec3],
    BR2: [[sx * XI, yTp - 40, ZB + T / 2] as Vec3],
  });
  const cams = (sx: number, ids: ("BOT" | "TOP" | "BR1" | "BR2")[], only?: number) =>
    ids.map((id) => {
      const pts = camPts(sx)[id];
      const use = only !== undefined ? pts.slice(only, only + 1) : pts;
      const face: Vec3 = id === "BOT" ? [0, 1, 0] : id === "TOP" ? [0, -1, 0] : [0, 0, 1];
      return fx("cam", use.map((q): Vec3 => [sx * (XI - 34), q[1] + face[1] * (T / 2), q[2] + face[2] * (T / 2)]), [-face[0], -face[1], -face[2]], id);
    });
  const dowels = (id: string, y: number) => [-1, 1].map((sx) => fx("dowel", [-150, 0, 150].map((z): Vec3 => [sx * XI, y, z + (id === "TOP" ? 0 : -9)]), [sx, 0, 0], id, { len: 30, dia: 8, mate: side(sx) }));
  const runnerScrews = (sx: number) => fx("screw", [-150, -50, 50, 150].map((z): Vec3 => [sx * XI, 290, z]), [sx, 0, 0], side(sx), { len: 13, dia: 4 });
  const brackets = (sx: number): CustomFix[] => [
    fx("angle", HUNG.filter((h) => h[0] === sx).map((h): Vec3 => [sx * (XI - 20), h[1], ZB + T + 2]), [sx, 0, 0], side(sx), { name: "Corner bracket" }),
    fx("screw", HUNG.filter((h) => h[0] === sx).flatMap((h) => [-14, 14].map((dy): Vec3 => [sx * XI, h[1] + dy, ZB + T + 22])), [sx, 0, 0], side(sx), { len: 12, dia: 4 }),
  ];
  const feet: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * 150, Y0, sz * 150]));
  const wallPts: Vec3[] = HUNG.map(([sx, y]) => [sx * (XI - 20), y, ZB]);
  const steps: CustomStep[] = [
    {
      title: "Screw a runner onto the left side",
      detail: "Lay both sides on a rug, inside up. The runner marked L goes on the left side, its open end to the front.",
      add: ["SL"],
      fix: [fx("runner", [[-XI, 290, 0]], [-1, 0, 0], "SL", { len: 380 }), runnerScrews(-1)],
      pose: "+x",
      warnings: ["floor"],
    },
    {
      title: "Screw the other runner onto the right side",
      detail: "The one marked R, the same way.",
      fix: [fx("runner", [[XI, 290, 0]], [1, 0, 0], "SR", { len: 380 }), runnerScrews(1)],
      wait: ["SR"],
      from: { SR: [0, 0, -560] },
    },
    { title: "Screw on the corner brackets", detail: "Two at the back edge of each side, two screws each.", fix: [...brackets(-1), ...brackets(1)], tools: ["screwdriver"] },
    {
      title: "Screw the cam bolts into the sides",
      detail: "Seven into each side, by hand until they stop.",
      fix: [-1, 1].map((sx) => {
        const c = camPts(sx);
        return fx("camScrew", [...c.BOT, ...c.TOP, ...c.BR1, ...c.BR2], [sx, 0, 0], side(sx));
      }),
      tools: ["screwdriver"],
    },
    {
      title: "Tap the dowels into the top and bottom",
      detail: "Three into each end of both panels.",
      fix: [...dowels("BOT", Y0 + T / 2), ...dowels("TOP", yTp + T / 2)],
      wait: ["BOT", "TOP"],
      tools: ["hammer"],
    },
    { title: "Push the bottom panel onto the left side", detail: "Its dowels and the side's cam bolts go into the holes together.", add: ["BOT"] },
    { title: "Lock it with two cams", detail: "Arrow towards the bolt, then turn clockwise.", fix: cams(-1, ["BOT"]).map((f) => ({ ...f, count: 2, at: f.at!.slice(0, 2) })), tools: ["screwdriver"] },
    { title: "Push the top panel on", detail: "At the other end of the side, set 2 cm in from the edge.", add: ["TOP"] },
    { title: "Lock the top with two cams", detail: "Turn each one until it's tight.", fix: cams(-1, ["TOP"]), tools: ["screwdriver"] },
    {
      title: "Tap the dowels into the back rails",
      detail: "One into each end of both rails.",
      fix: ["BR1", "BR2"].flatMap((id, i) => [-1, 1].map((sx) => fx("dowel", [[sx * XI, i ? yTp - 40 : yBt + 40, ZB + T / 2 + 40]], [sx, 0, 0], id, { len: 30, dia: 8, mate: side(sx) }))),
      wait: ["BR1", "BR2"],
      tools: ["hammer"],
    },
    { title: "Push the back rails in", detail: "Along the back edge, one under the top and one over the bottom.", add: ["BR1", "BR2"] },
    {
      title: "Lock the rails and the bottom",
      detail: "Three more cams: one in each rail and the middle one in the bottom.",
      fix: [...cams(-1, ["BR1", "BR2"]), ...cams(-1, ["BOT"], 2)],
      tools: ["screwdriver"],
    },
    { title: "Lay the right side on top", detail: "Runner inside, over all the dowels and panels at once.", add: ["SR"] },
    { title: "Lock the right side with seven cams", detail: "Every cam turned clockwise until it grips.", fix: cams(1, ["BOT", "TOP", "BR1", "BR2"]), tools: ["screwdriver"] },
    {
      title: "Stand it up and screw in the feet",
      detail: "For a table that stands on the floor: one foot into each corner of the bottom. Turn them to level it.",
      fix: [-1, 1].map((sx) => fx("foot", feet.filter((q) => q[0] * sx > 0), [0, 1, 0], "BOT", { len: 15, dia: 30 })),
      pose: "+y",
    },
    {
      title: "Or hang it on the wall",
      detail: "Mark the four brackets' holes on the wall at the height you want, drill and screw in screws made for your wall, then hang it on them and tighten.",
      fix: ["BR1", "BR2"].flatMap((id, i) => {
        const pts = wallPts.filter((q) => (q[1] > 250) === (i === 1));
        return [
          fx("plug", pts, [0, 0, -1], id, { len: 35, dia: 8 }),
          fx("screw", pts, [0, 0, -1], id, { len: 50, dia: 5 }),
          fx("bracket", pts.map((q): Vec3 => [q[0], q[1], ZB + T + 4]), [0, 0, -1], id, { name: "Keyhole plate", included: true }),
        ];
      }),
      tools: ["drill", "pencil", "level", "screwdriver"],
      wall: true,
      warnings: ["wall"],
    },
    ...A.steps(false),
    { title: "Slide the small drawer in", detail: "Onto the upper runners, pushed until it clicks onto them." },
    { title: "Lock the drawer on", detail: "Give the two catches a turn so the drawer can't lift off its runners.", tools: ["screwdriver"] },
    ...B.steps(true),
    { title: "Slide the big drawer in", detail: "Onto the lower runners, then hook the tall front onto its fittings.", add: ["FRONT"], from: { FRONT: [0, 0, 300] } },
    { title: "Lock the front on", detail: "Turn its two fittings until the front sits tight and even with the sides.", tools: ["screwdriver"] },
  ];
  return { parts, steps };
}

/** Parts built on their own are shown in their own scene for steps `from` to `until`, and come in at `join`. */
function apart(b: PlanBuilder, r: CustomParams, ids: string[], scene: string, from: number, until: number, join: number, off: Vec3) {
  for (let i = from; i < until; i++) if (b.steps[i]) b.steps[i].scene = scene;
  for (const id of ids) {
    const p = r.parts.find((q) => q.id === id)!;
    const it = b.items.find((x): x is PartItem => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - p.pos[k]) < 0.5));
    if (!it) continue;
    it.states = it.states.filter((st) => st.step < join).map((st) => ({ ...st, scene }));
    it.states.push({ step: join, scene: "main", pos: it.final.pos, rot: it.final.rot, from: off, delay: 0.2 });
  }
}

const family: Family = {
  names: ["PLÖJKER", "PLOJKER"],
  build(b: PlanBuilder, s: ProductSpec) {
    if (!/bedside/i.test(`${s.variant} ${s.slug ?? ""}`)) return false;
    const r = table();
    buildCustom(b, { ...s, custom: r });
    const at = (re: RegExp, from = 0) => r.steps.findIndex((x, i) => i >= from && re.test(x.title));
    const a0 = at(/cam bolts into the drawer back/), a1 = at(/small drawer in/);
    const b0 = at(/cam bolts into the drawer back/, a1), b1 = at(/big drawer in/);
    const ids = (p: string) => ["K", "L", "R", "B", "F"].map((k) => p + k);
    apart(b, r, ids("A"), "drawer", a0, a1, a1, [0, 0, 380]);
    apart(b, r, ids("B"), "drawer2", b0, b1, b1, [0, 0, 380]);
    return true;
  },
};
export default family;
