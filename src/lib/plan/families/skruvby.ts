import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3 } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * SKRUVBY, read from its manuals. The cabinets, the bookcase, the TV bench and the sideboard share one frame: the
 * bottom gets push-in feet while it lies upside down, then cam bolts; the sides (and dividers) go onto it on dowels
 * and cam locks, the fibreboard back slides down into grooves, the top goes on with cam bolts and cam locks, and the
 * back is clipped on from behind. Every one of them is fixed to the wall with two brackets inside the top corners
 * (spacers for a skirting board, then screws through the brackets and covers over them), before the shelves, doors
 * and drawer. The bookcase is put together lying on its back. The side table is its own build: shelf and back
 * screwed together, sides on dowels, the bottom screwed on with connector screws, four corner feet, then the top on
 * cam bolts.
 */

type Fx = Omit<CustomFix, "count" | "at"> & { at: Vec3[] };
const fx = (f: Fx): CustomFix => ({ ...f, count: f.at.length });

const T = 18; // panels
const TT = 25; // top
const FT = 12; // feet under the bottom
const BK = 3; // fibreboard back

interface Bay {
  shelves: number;
  doors?: "panel" | "glass";
  drawer?: boolean;
}
interface Opts {
  W: number;
  H: number;
  D: number;
  bays: Bay[];
  inner?: number[]; // inner widths of the bays, when they differ (sum fills the frame)
  feet: number;
  clips: { k: number; top: number; bottom: number }[]; // back clips per bay: k down each side, along the top and bottom
  fasteners?: number; // push fasteners through the back into the dividers (TV bench)
  shelfAt?: number; // shelf height as a share of the opening, one shelf per bay
}

function frame(o: Opts) {
  const { W, H, D } = o;
  const Wc = W - 20; // the top overhangs 1 cm at each end
  const Dc = D - 12; // and at the front
  const z0 = -D / 2, zF = z0 + Dc, zc = (z0 + zF) / 2;
  const yB0 = FT, yB1 = FT + T; // bottom panel
  const yT = H - TT; // underside of the top
  const n = o.bays.length;
  const room = Wc - (n + 1) * T;
  const inner = o.inner ?? o.bays.map(() => room / n);
  const ux: number[] = [-Wc / 2 + T / 2]; // upright centres, left to right
  for (const w of inner) ux.push(ux[ux.length - 1] + T / 2 + w + T / 2);
  const ids = ux.map((_, i) => (i === 0 ? "L" : i === n ? "R" : `V${i}`));
  const sideIds = ["L", "R"];
  const divIds = ids.slice(1, -1);
  const zBack = z0 + 8 + BK / 2;
  const bayX = (i: number): [number, number] => [ux[i] + T / 2, ux[i + 1] - T / 2];

  const parts: CustomPart[] = [{ id: "bottom", name: "Bottom", size: [Wc, T, Dc], pos: [0, (yB0 + yB1) / 2, zc] }];
  ux.forEach((x, i) => {
    const div = i > 0 && i < n;
    // dividers stop in front of the back, the sides run to the back edge with the back in their grooves
    const d = div ? zF - (zBack + BK / 2) : Dc;
    parts.push({ id: ids[i], name: div ? "Divider" : "Side panel", size: [T, yT - yB1, d], pos: [x, (yB1 + yT) / 2, zF - d / 2] });
  });
  const backs: string[] = [];
  const oneBack = !!o.fasteners;
  if (oneBack) {
    const [a] = bayX(0), [, b] = bayX(n - 1);
    parts.push({ id: "back0", name: "Back panel", size: [b - a, yT - yB1, BK], pos: [(a + b) / 2, (yB1 + yT) / 2, zBack], material: "fiber" });
    backs.push("back0");
  } else
    o.bays.forEach((_, i) => {
      const [a, b] = bayX(i);
      parts.push({ id: `back${i}`, name: "Back panel", size: [b - a, yT - yB1, BK], pos: [(a + b) / 2, (yB1 + yT) / 2, zBack], material: "fiber" });
      backs.push(`back${i}`);
    });
  parts.push({ id: "top", name: "Top", size: [W, TT, D], pos: [0, H - TT / 2, 0] });

  // fittings at each upright's two ends: cam bolts near the edges, dowels further in
  const zBolt = (sz: number) => zc + sz * (Dc / 2 - 45);
  const zDowel = (sz: number) => zc + sz * (Dc / 2 - 100);
  const sz2 = [-1, 1];
  const boltsIn = (which: "bottom" | "top", list: number[]) =>
    fx({ kind: "camScrew", at: list.flatMap((i) => sz2.map((k) => [ux[i], which === "bottom" ? yB1 : yT, zBolt(k)] as Vec3)), dir: [0, which === "bottom" ? -1 : 1, 0], on: which });
  const dowelsIn = (i: number, at: ("lo" | "hi")[]): CustomFix[] =>
    at.map((e) => fx({ kind: "dowel", at: sz2.map((k) => [ux[i], e === "lo" ? yB1 : yT, zDowel(k)] as Vec3), dir: [0, e === "lo" ? 1 : -1, 0], on: ids[i] }));
  // cam locks sit in the upright's inner face (a divider's right face), just inside its end
  const camFix = (list: number[], end: "lo" | "hi"): CustomFix[] =>
    list.map((i) => {
      const left = i === 0;
      const x = left ? ux[i] + T / 2 : i === n ? ux[i] - T / 2 : ux[i] + T / 2;
      const dir: Vec3 = [left || (i > 0 && i < n) ? -1 : 1, 0, 0];
      return fx({ kind: "cam", dia: 15, at: sz2.map((k) => [x, end === "lo" ? yB1 + 30 : yT - 30, zBolt(k)] as Vec3), dir, on: ids[i] });
    });

  const feet = (() => {
    const xs = o.feet === 4 ? [-Wc / 2 + 50, Wc / 2 - 50] : o.feet === 5 ? [-Wc / 2 + 50, ux[1], Wc / 2 - 50] : [-Wc / 2 + 50, 0, Wc / 2 - 50];
    const pts: Vec3[] = [];
    for (const x of xs) for (const sz of [-1, 1]) pts.push([x, yB0, zc + sz * (Dc / 2 - 50)]);
    // the sideboard's fifth foot sits under the divider at the front
    return o.feet === 5 ? pts.filter((p, i) => !(i === 2)) : pts;
  })();

  // back clips round the edge of each back, from behind; a wedge locks each one
  const clipPts: { at: Vec3; on: string }[] = [];
  const yIn0 = yB1 + 60, yIn1 = yT - 60;
  o.clips.forEach((c, bi) => {
    const [a, b] = oneBack ? [bayX(0)[0], bayX(n - 1)[1]] : bayX(bi);
    const onL = oneBack ? "L" : ids[bi], onR = oneBack ? "R" : ids[bi + 1];
    for (let j = 0; j < c.k; j++) {
      const y = c.k === 1 ? (yIn0 + yIn1) / 2 : yIn0 + ((yIn1 - yIn0) * j) / (c.k - 1);
      clipPts.push({ at: [a + 10, y, z0 + 8], on: onL }, { at: [b - 10, y, z0 + 8], on: onR });
    }
    const row = (m: number, y: number, on: string) => {
      for (let j = 0; j < m; j++) clipPts.push({ at: [a + ((b - a) * (j + 1)) / (m + 1), y, z0 + 8], on });
    };
    row(c.top, yT - 10, "top");
    row(c.bottom, yB1 + 10, "bottom");
  });
  const clipFix: CustomFix[] = [
    fx({ kind: "clip", name: "Back clip", len: 14, dia: 12, at: clipPts.map((c) => c.at), dir: [0, 0, 1] }),
    fx({ kind: "cap", name: "Clip wedge", len: 8, dia: 10, at: clipPts.map((c) => c.at), dir: [0, 0, 1] }),
  ];

  // wall: a bracket inside each top back corner
  const wx = [ux[0] + T / 2 + 30, ux[n] - T / 2 - 30];
  const wy = yT - 45;
  const wallSteps: CustomStep[] = [
    {
      title: "Fit the wall brackets",
      detail: "One inside each top back corner, pegs pushed into the holes in the side.",
      fix: [fx({ kind: "bracket", len: 50, dia: 36, at: wx.map((x) => [x, wy, z0 + 25] as Vec3), dir: [0, 0, -1] })],
      wall: false,
    },
    {
      title: "Screw the spacers onto the brackets",
      detail: "Only if there is a skirting board. Turn them out until they touch the wall, so it stands straight.",
      fix: [fx({ kind: "spacer", name: "Wall spacer", len: 20, dia: 30, at: wx.map((x) => [x, wy, z0] as Vec3), dir: [0, 0, 1] })],
    },
    {
      title: "Push it against the wall and level it",
      detail: "Turn the feet under it until it stands level and steady.",
      warnings: ["floor"],
    },
    {
      title: "Mark the wall through the brackets",
      detail: "Then move it away to drill. Pick plugs made for your wall if the ones in the bag don't suit it.",
      fix: [fx({ kind: "plug", at: wx.map((x) => [x, wy, z0 - 2] as Vec3), dir: [0, 0, -1] })],
      tools: ["pencil", "drill"],
      wall: true,
    },
    {
      title: "Screw it to the wall",
      detail: "A washer on each screw. Use the long screws if you fitted the spacers.",
      fix: [
        fx({ kind: "washer", at: wx.map((x) => [x, wy, z0 + 40] as Vec3), dir: [0, 0, -1] }),
        fx({ kind: "screw", len: 50, dia: 5, at: wx.map((x) => [x, wy, z0 + 41] as Vec3), dir: [0, 0, -1] }),
      ],
      tools: ["screwdriver"],
      wall: true,
      warnings: ["tip"],
    },
    {
      title: "Snap the covers over the brackets",
      fix: [fx({ kind: "cap", name: "Bracket cover", len: 16, dia: 40, at: wx.map((x) => [x, wy, z0 + 44] as Vec3), dir: [0, 0, -1] })],
    },
  ];

  // shelves on shelf supports, set back from the doors
  const shelfSteps = (bays: number[], ys: (bi: number) => number[]) => {
    const pts: { at: Vec3; on: string }[] = [];
    const add: string[] = [];
    for (const bi of bays) {
      const bay = o.bays[bi];
      const [a, b] = bayX(bi);
      const front = bay.doors ? zF - T - 4 : zF - 10;
      const back = zBack + BK / 2 + 2;
      ys(bi).forEach((y, k) => {
        const id = `S${bi}_${k}`;
        parts.push({ id, name: "Shelf", size: [b - a - 2, T, front - back], pos: [(a + b) / 2, y, (front + back) / 2] });
        add.push(id);
        for (const x of [a, b]) for (const z of [back + 40, front - 40]) pts.push({ at: [x, y - T / 2 - 4, z], on: x === a ? ids[bi] : ids[bi + 1] });
      });
    }
    const pins: CustomFix[] = ids.map((id, i) => {
      const at = pts.filter((p) => p.on === id).map((p) => p.at);
      return fx({ kind: "pin", name: "Shelf support", len: 16, dia: 12, at, dir: [i === 0 ? -1 : 1, 0, 0], on: id });
    }).filter((f) => f.count);
    // one support row per upright face: dividers carry them on both faces
    const fixes: CustomFix[] = [];
    for (const f of pins) {
      const i = ids.indexOf(f.on!);
      if (i > 0 && i < n) {
        const l = f.at!.filter((p) => p[0] > ux[i]), r = f.at!.filter((p) => p[0] < ux[i]);
        if (l.length) fixes.push({ ...f, at: l, count: l.length, dir: [-1, 0, 0] });
        if (r.length) fixes.push({ ...f, at: r, count: r.length, dir: [1, 0, 0] });
      } else fixes.push(f);
    }
    return { pins: fixes, add, count: pts.length };
  };

  return { parts, ids, sideIds, divIds, ux, bayX, Wc, Dc, z0, zF, zc, yB0, yB1, yT, zBack, backs, n, feet, boltsIn, dowelsIn, camFix, clipFix, wallSteps, shelfSteps, clipCount: clipPts.length };
}

const evenly = (lo: number, hi: number, k: number) => Array.from({ length: k }, (_, i) => lo + ((hi - lo) * (i + 1)) / (k + 1));

function feetStep(f: ReturnType<typeof frame>): CustomStep {
  return {
    title: "Push the feet into the bottom",
    detail: "Lay the bottom upside down on a rug and press each foot into its hole.",
    add: ["bottom"],
    fix: [fx({ kind: "foot", len: FT, dia: 40, at: f.feet, dir: [0, 1, 0], on: "bottom" })],
    pose: "-y",
    warnings: ["floor"],
  };
}

/** Doors: hinges pressed into the doors, two people hang them, handles, buffers on the shelf edges. */
function doorSteps(f: ReturnType<typeof frame>, bi: number, glass: boolean, buffers: string[]): { parts: CustomPart[]; steps: CustomStep[] } {
  const [a, b] = f.bayX(bi);
  const y0 = f.yB1 + 2, y1 = f.yT - 2, dh = y1 - y0;
  const dw = (b - a - 9) / 2;
  const dz = f.zF - T / 2;
  const xs = [a + 3 + dw / 2, b - 3 - dw / 2];
  const rail = 55;
  const pieces: PartPiece[] | undefined = glass
    ? [
        { shape: "box", size: [dw, rail, T], pos: [0, dh / 2 - rail / 2, 0] },
        { shape: "box", size: [dw, rail, T], pos: [0, -dh / 2 + rail / 2, 0] },
        { shape: "box", size: [rail, dh - 2 * rail, T], pos: [-dw / 2 + rail / 2, 0, 0] },
        { shape: "box", size: [rail, dh - 2 * rail, T], pos: [dw / 2 - rail / 2, 0, 0] },
        { shape: "box", size: [dw - 2 * rail, dh - 2 * rail, 4], pos: [0, 0, 0], material: "glass" },
      ]
    : // the panel doors are grooved top to bottom
      [
        { shape: "box", size: [dw, dh, T - 3], pos: [0, 0, -1.5] },
        ...[0, 1, 2, 3, 4].map((k): PartPiece => ({ shape: "box", size: [dw / 5 - 3, dh, 3], pos: [-dw / 2 + (dw / 5) * (k + 0.5), 0, T / 2 - 1.5] })),
      ];
  const ids = [`D${bi}a`, `D${bi}b`];
  const parts: CustomPart[] = xs.map((x, i) => ({ id: ids[i], name: glass ? "Glass door" : "Door", size: [dw, dh, T], pos: [x, (y0 + y1) / 2, dz], pieces }));
  const hy = [y1 - 110, y0 + 110];
  const hingeX = (i: number) => (i === 0 ? xs[0] - dw / 2 + 25 : xs[1] + dw / 2 - 25);
  const handleX = (i: number) => (i === 0 ? xs[0] + dw / 2 - 40 : xs[1] - dw / 2 + 40);
  const hyH = y0 + dh * 0.56;
  const steps: CustomStep[] = [
    {
      title: "Press the hinges into the doors",
      detail: "Lay the doors face down on a rug. Press each hinge cup into its hole until the pegs sit flush.",
      add: ids,
      from: Object.fromEntries(ids.map((id) => [id, [0, 0, 450] as Vec3])),
      fix: ids.map((id, i) => fx({ kind: "hinge", at: hy.map((y) => [hingeX(i), y, f.zF - T] as Vec3), dir: [0, 0, 1], on: id })),
      warnings: ["floor"],
    },
    {
      title: "Hang the doors together",
      detail: "One of you holds the door while the other screws each hinge plate to the side with the screws already in it.",
      people: 2,
      tools: ["screwdriver"],
      kind: "hinges",
      warnings: ["two"],
    },
    {
      title: "Screw on the handles",
      detail: "Two screws from inside each door, near the edges where the doors meet.",
      fix: [
        ...ids.map((id, i) => fx({ kind: "handle", len: 150, dia: 12, at: [[handleX(i), hyH, f.zF]], dir: [0, 0, -1], on: id, twist: Math.PI / 2 })),
        ...ids.map((id, i) => fx({ kind: "screw", len: 25, dia: 4, at: [-66, 66].map((dy) => [handleX(i), hyH + dy, f.zF - T] as Vec3), dir: [0, 0, 1], on: id })),
      ],
      tools: ["screwdriver"],
    },
  ];
  if (buffers.length)
    steps.push({
      title: buffers.length > 1 ? "Stick the buffers on the shelves" : "Stick the buffer on the shelf",
      detail: "Peel them off the sheet and press one onto the middle of each shelf's front edge, where the doors close.",
      fix: [fx({ kind: "glide", name: "Door buffer", len: 3, dia: 10, at: buffers.map((id) => [0, 0, 0] as Vec3), dir: [0, 0, -1] })],
    });
  return { parts, steps };
}

function cabinet(s: ProductSpec, kind: "doors" | "glass" | "bookcase"): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = 375;
  const book = kind === "bookcase";
  const f = frame({ W, H, D, bays: [{ shelves: book ? 3 : 2, doors: book ? undefined : kind === "glass" ? "glass" : "panel" }], feet: 4, clips: [book ? { k: 4, top: 2, bottom: 2 } : { k: 3, top: 2, bottom: 2 }] });
  const ys = evenly(f.yB1, f.yT, book ? 3 : 2);
  const sh = f.shelfSteps([0], () => ys);
  const steps: CustomStep[] = [
    feetStep(f),
    { title: "Turn it over and push in the cam bolts", detail: "Four, into the holes at the ends. Push them straight down until they click.", fix: [f.boltsIn("bottom", [0, 1])], pose: "+y" },
  ];
  if (book) {
    steps.push(
      {
        title: "Fit one side to the bottom",
        detail: "Tap two dowels into the side's bottom end. Lay it on its back edge on the rug, push the bottom onto it and turn the two cam locks.",
        add: ["L"],
        fix: [...f.dowelsIn(0, ["lo"]), ...f.camFix([0], "lo")],
        tools: ["hammer", "screwdriver"],
        pose: "+z",
        warnings: ["floor"],
      },
      { title: "Fit the other side", detail: "Two dowels into its bottom end, onto the other end of the bottom, then turn its two cam locks.", add: ["R"], fix: [...f.dowelsIn(1, ["lo"]), ...f.camFix([1], "lo")], tools: ["hammer", "screwdriver"] },
      { title: "Slide the back into the grooves", detail: "From the open end, smooth side facing in, all the way to the bottom.", add: f.backs, from: { back0: [0, 700, 0] } },
      { title: "Stand it up and tap dowels into the tops of the sides", detail: "Two into each side.", fix: [...f.dowelsIn(0, ["hi"]), ...f.dowelsIn(1, ["hi"])], tools: ["hammer"], pose: "+y", people: 2, warnings: ["two"] },
    );
  } else {
    steps.push(
      { title: "Tap dowels into the sides and stand them on the bottom", detail: "Two dowels into each end. Push the sides onto the cam bolts, holes for the cam locks facing in.", add: ["L", "R"], fix: [...f.dowelsIn(0, ["lo", "hi"]), ...f.dowelsIn(1, ["lo", "hi"])], tools: ["hammer"] },
      { title: "Turn the cam locks", detail: "Four, at the bottom of the sides. Arrow towards the bolt, then turn clockwise until it pulls tight.", fix: f.camFix([0, 1], "lo"), tools: ["screwdriver"] },
      { title: "Slide the back down into the grooves", detail: "From the top, smooth side facing in, until it sits in the groove in the bottom.", add: f.backs, from: { back0: [0, 700, 0] } },
    );
  }
  steps.push(
    { title: "Push the cam bolts into the top", detail: "Four, into the holes on its underside.", fix: [f.boltsIn("top", [0, 1])] },
    { title: "Put the top on and lock it", detail: "Down onto the dowels and bolts, then turn the four cam locks inside the sides.", add: ["top"], fix: f.camFix([0, 1], "hi"), tools: ["screwdriver"] },
  );
  const clips: CustomStep = { title: "Clip the back on", detail: `Turn it round. Push the ${f.clipCount} clips through the back into the frame, then press a wedge into each one.`, fix: f.clipFix };
  const shelves: CustomStep[] = [
    { title: "Fit the shelf supports", detail: `${sh.count} of them, four for each shelf, at the height you want. Screw them in by hand.`, fix: sh.pins },
    { title: "Lay the shelves on the supports", detail: "Press each shelf down so the supports lock into the holes underneath.", add: sh.add },
  ];
  if (book) steps.push(...shelves, clips, ...f.wallSteps);
  else steps.push(clips, ...f.wallSteps, ...shelves);
  const parts = f.parts;
  if (!book) {
    const d = doorSteps(f, 0, kind === "glass", sh.add);
    parts.push(...d.parts);
    const buf = d.steps[d.steps.length - 1];
    if (buf.fix) buf.fix = [fx({ kind: "glide", name: "Door buffer", len: 3, dia: 10, at: sh.add.map((id) => { const p = parts.find((x) => x.id === id)!; return [0, p.pos[1], p.pos[2] + p.size[2] / 2] as Vec3; }), dir: [0, 0, -1] })];
    steps.push(...d.steps);
  }
  return { parts, steps };
}

function tvBench(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = 375;
  const Wc = W - 20;
  const mid = 380;
  const outer = (Wc - 4 * T - mid) / 2;
  const f = frame({ W, H, D, bays: [{ shelves: 1 }, { shelves: 1 }, { shelves: 1 }], inner: [outer, mid, outer], feet: 6, clips: [{ k: 2, top: 4, bottom: 4 }], fasteners: 8 });
  // the back has two cable notches at the top, over the middle
  const back = f.parts.find((p) => p.id === "back0")!;
  const bw = back.size[0], bh = back.size[1], nw = 90, nh = 50;
  const xn = [f.ux[1] + 60, f.ux[2] - 60].map((x) => x - back.pos[0]);
  const segs: [number, number][] = [[-bw / 2, xn[0] - nw / 2], [xn[0] + nw / 2, xn[1] - nw / 2], [xn[1] + nw / 2, bw / 2]];
  back.pieces = [
    { shape: "box", size: [bw, bh - nh, BK], pos: [0, -nh / 2, 0] },
    ...segs.map(([a, b]): PartPiece => ({ shape: "box", size: [b - a, nh, BK], pos: [(a + b) / 2, bh / 2 - nh / 2, 0] })),
  ];
  const ys = (bi: number) => [f.yB1 + (f.yT - f.yB1) * 0.62 + (bi === 1 ? 0 : 0)];
  const sh = f.shelfSteps([0, 1, 2], ys);
  const fasteners: Vec3[] = [1, 2].flatMap((i) => [0.2, 0.45, 0.7, 0.9].map((t) => [f.ux[i], f.yB1 + (f.yT - f.yB1) * t, f.z0 + 8] as Vec3));
  const steps: CustomStep[] = [
    feetStep(f),
    { title: "Turn it over and push in the cam bolts", detail: "Eight, into the holes along the bottom. Push them straight down until they click.", fix: [f.boltsIn("bottom", [0, 3, 1, 2])], pose: "+y" },
    { title: "Tap dowels into the sides and stand them on the bottom", detail: "Two dowels into each end, then push the sides onto the cam bolts at the ends.", add: ["L", "R"], fix: [...f.dowelsIn(0, ["lo", "hi"]), ...f.dowelsIn(3, ["lo", "hi"])], tools: ["hammer"] },
    { title: "Turn the cam locks in the sides", detail: "Four, arrow towards the bolt, then clockwise until tight.", fix: f.camFix([0, 3], "lo"), tools: ["screwdriver"] },
    { title: "Tap dowels into the dividers and stand them on the bottom", detail: "Two dowels into each end, then onto their cam bolts.", add: ["V1", "V2"], fix: [...f.dowelsIn(1, ["lo", "hi"]), ...f.dowelsIn(2, ["lo", "hi"])], tools: ["hammer"] },
    { title: "Turn the cam locks in the dividers", detail: "Four more, the same way.", fix: f.camFix([1, 2], "lo"), tools: ["screwdriver"] },
    { title: "Slide the back down into the grooves", detail: "From the top, cable notches up, behind the dividers and into the groove in the bottom.", add: ["back0"], from: { back0: [0, 500, 0] }, people: 2, warnings: ["two"] },
    { title: "Push the cam bolts into the top", detail: "Eight, into the holes on its underside.", fix: [f.boltsIn("top", [0, 3, 1, 2])] },
    { title: "Put the top on and lock it", detail: "Down onto the dowels and bolts, then turn the eight cam locks.", add: ["top"], fix: f.camFix([0, 3, 1, 2], "hi"), tools: ["screwdriver"], people: 2, warnings: ["two"] },
    { title: "Clip the back on", detail: `Turn it round. Push the ${f.clipCount} clips through the back into the frame, then press a wedge into each one.`, fix: f.clipFix },
    {
      title: "Fix the back to the dividers",
      detail: "Push a plastic fastener through each hole in the back, then press its pin in to spread it.",
      fix: [fx({ kind: "clip", name: "Push fastener", len: 20, dia: 8, at: fasteners, dir: [0, 0, 1] }), fx({ kind: "cap", name: "Fastener pin", len: 18, dia: 5, at: fasteners, dir: [0, 0, 1] })],
    },
    ...f.wallSteps,
    { title: "Fit the shelf supports", detail: `${sh.count} of them, four for each shelf, at the height you want.`, fix: sh.pins },
    { title: "Lay the shelves on the supports", detail: "Press each shelf down so the supports lock into the holes underneath.", add: sh.add },
  ];
  return { parts: f.parts, steps };
}

function sideboard(s: ProductSpec): { recipe: CustomParams; dr: Drawer } {
  const W = 1201, H = 899, D = 375;
  const Wc = W - 20;
  const right = 460; // the drawer is 41 cm wide inside
  const left = Wc - 3 * T - right;
  const f = frame({ W, H, D, bays: [{ shelves: 2, doors: "panel" }, { shelves: 2, drawer: true }], inner: [left, right], feet: 5, clips: [{ k: 3, top: 3, bottom: 2 }, { k: 3, top: 3, bottom: 2 }] });
  const [ra, rb] = f.bayX(1);
  // the drawer, under the top of the open bay
  const fh = 150, dTop = f.yT - 3, dBot = dTop - fh;
  const bw = rb - ra - 26, bt = 12, bh = 115, bd = 330;
  const xc = (ra + rb) / 2;
  const zf0 = f.zF - T; // back face of the drawer front
  const yb0 = dBot + 12;
  const parts = f.parts;
  const yS = f.yB1 + (dBot - f.yB1) * 0.33, yS2 = f.yB1 + (dBot - f.yB1) * 0.66;
  const sh = f.shelfSteps([0, 1], (bi) => (bi === 0 ? evenly(f.yB1, f.yT, 2) : [yS, yS2]));
  const yRun = yb0 + 20, zRun = zf0 - bd / 2;
  const runnerPts = [[ra, yRun, zRun] as Vec3, [rb, yRun, zRun] as Vec3];
  const d = doorSteps(f, 0, false, []);
  parts.push(...d.parts);
  const leftShelves = sh.add.filter((id) => id.startsWith("S0_"));
  const bufferPts: Vec3[] = [
    ...leftShelves.map((id) => {
      const p = parts.find((x) => x.id === id)!;
      return [p.pos[0], p.pos[1], p.pos[2] + p.size[2] / 2] as Vec3;
    }),
    [f.ux[1], (f.yB1 + f.yT) / 2, f.zF],
  ];
  const sx = [-1, 1];
  const steps: CustomStep[] = [
    feetStep(f),
    { title: "Turn it over and push in the cam bolts", detail: "Six, into the holes for the sides and the divider. Push them straight down until they click.", fix: [f.boltsIn("bottom", [0, 2, 1])], pose: "+y" },
    {
      title: "Tap dowels into the sides and the divider and stand them on the bottom",
      detail: "Two dowels into each end, then push them onto the cam bolts. The divider goes at the holes nearer the right end.",
      add: ["L", "V1", "R"],
      fix: [...f.dowelsIn(0, ["lo", "hi"]), ...f.dowelsIn(1, ["lo", "hi"]), ...f.dowelsIn(2, ["lo", "hi"])],
      tools: ["hammer"],
    },
    {
      title: "Screw the runner rails to the divider and the right side",
      detail: "The rail marked for the left goes on the divider, the right one on the side, in the holes near the top. Three screws each.",
      fix: [
        fx({ kind: "runner", name: "Runner rail", len: bd - 10, dia: 30, at: [runnerPts[0]], dir: [-1, 0, 0], on: "V1" }),
        fx({ kind: "runner", name: "Runner rail", len: bd - 10, dia: 30, at: [runnerPts[1]], dir: [1, 0, 0], on: "R" }),
        fx({ kind: "screw", len: 12, dia: 4, at: [-120, 0, 120].map((dz) => [ra, yRun, zRun + dz] as Vec3), dir: [-1, 0, 0], on: "V1" }),
        fx({ kind: "screw", len: 12, dia: 4, at: [-120, 0, 120].map((dz) => [rb, yRun, zRun + dz] as Vec3), dir: [1, 0, 0], on: "R" }),
      ],
      tools: ["screwdriver"],
    },
    { title: "Turn the cam locks", detail: "Six, at the bottom of the sides and the divider. Arrow towards the bolt, then clockwise until tight.", fix: f.camFix([0, 2, 1], "lo"), tools: ["screwdriver"] },
    { title: "Slide the backs down into the grooves", detail: "One into each section, from the top, smooth side facing in.", add: f.backs, from: { back0: [0, 600, 0], back1: [0, 600, 0] } },
    { title: "Push the cam bolts into the top", detail: "Six, into the holes on its underside.", fix: [f.boltsIn("top", [0, 2, 1])] },
    { title: "Put the top on and lock it", detail: "Down onto the dowels and bolts, then turn the six cam locks.", add: ["top"], fix: f.camFix([0, 2, 1], "hi"), tools: ["screwdriver"] },
    { title: "Clip the backs on", detail: `Turn it round. Push the ${f.clipCount} clips through the backs into the frame, then press a wedge into each one.`, fix: f.clipFix },
    ...f.wallSteps,
    { title: "Fit the shelf supports", detail: `${sh.count} of them, four for each shelf, below the drawer on the right.`, fix: sh.pins },
    { title: "Lay the shelves on the supports", detail: "Two in each section. Press each shelf down so the supports lock into the holes underneath.", add: sh.add },
    ...d.steps,
    {
      title: "Stick the buffers on",
      detail: "One on the front edge of each shelf behind the doors and one on the front edge of the divider, where the doors close.",
      fix: [fx({ kind: "glide", name: "Door buffer", len: 3, dia: 10, at: bufferPts, dir: [0, 0, -1] })],
    },
  ];
  void s;
  const dr: Drawer = { xc, fw: rb - ra - 4, fh, dTop, dBot, bw, bt, bh, bd, yb0, zF: f.zF, yRun, zRun };
  return { recipe: { parts, steps }, dr };
}

interface Drawer {
  xc: number;
  fw: number;
  fh: number;
  dTop: number;
  dBot: number;
  bw: number;
  bt: number;
  bh: number;
  bd: number;
  yb0: number;
  zF: number;
  yRun: number;
  zRun: number;
}

/** The sideboard's drawer, built face down beside the cabinet as the manual does, then slid in on its runners. */
function drawerSteps(b: PlanBuilder, d: Drawer) {
  const { xc, fw, fh, dTop, dBot, bw, bt, bh, bd, yb0, zF, yRun, zRun } = d;
  const zf0 = zF - T;
  const sx = [-1, 1];
  const front = b.place(b.part("Drawer front", [fw, fh, T]), [xc, (dTop + dBot) / 2, zF - T / 2]);
  const sideT = b.part("Drawer side", [bt, bh, bd]);
  const sides = sx.map((k) => b.place(sideT, [xc + k * (bw / 2 - bt / 2), yb0 + bh / 2, zf0 - bd / 2]));
  const bottom = b.place(b.part("Drawer bottom", [bw - 2 * bt + 10, 3, bd - bt], { material: "fiber" }), [xc, yb0 + 12, zf0 - (bd - bt) / 2]);
  const back = b.place(b.part("Drawer back", [bw - 2 * bt, bh - 20, bt]), [xc, yb0 + 14 + (bh - 20) / 2, zf0 - bd + bt / 2]);
  const all = [front, ...sides, bottom, back];
  const c0: Vec3 = [xc, yb0 + bh / 2, zf0 - bd / 2];
  const stage = (k: string, from: Vec3) => {
    const it = b.partItem(k);
    b.stage(k, [it.final.pos[0] - c0[0], it.final.pos[1] - c0[1], it.final.pos[2] - c0[2]], it.final.rot, from);
  };
  const xs = (k: number) => xc + k * (bw / 2 - bt / 2);
  const dstep = (title: string, detail: string, body: () => void, o: { tools?: ToolId[]; kind?: StepKind; pose?: Pose } = {}) =>
    b.step({ title, detail, tools: o.tools, scene: "drawer", pose: o.pose ?? "-z", kind: o.kind ?? "drawer" }, body);
  const ys = [yb0 + 30, yb0 + bh - 30];
  dstep(
    "Screw the cam bolts into the drawer front",
    "Lay the front face down on a rug. Two bolts at each end of its back face.",
    () => {
      stage(front, [0, 0, -160]);
      b.then(0.15);
      b.fits(DR_BOLT, sx.flatMap((k) => ys.map((y): FitOpts => ({ on: front, at: [xs(k), y, zf0], dir: [0, 0, 1], mate: sides[k < 0 ? 0 : 1] }))), 0.1);
    },
    { tools: ["screwdriver"], kind: "cams" },
  );
  dstep(
    "Tap a dowel into each side and fit them",
    "Grooves facing in. Push each side onto the bolts and its dowel.",
    () => {
      b.fits(HW.dowel, sx.map((k): FitOpts => ({ on: sides[k < 0 ? 0 : 1], at: [xs(k), yb0 + bh / 2, zf0], dir: [0, 0, -1], mate: front })), 0.1);
      b.then(0.15);
      b.stagger(0.25);
      for (const sd of sides) stage(sd, [0, 0, -300]);
    },
    { tools: ["hammer"], kind: "dowels" },
  );
  dstep("Lock the sides to the front", "Four small cam locks, arrow towards the bolt, then clockwise.", () =>
    b.fits(DR_CAM, sx.flatMap((k) => ys.map((y): FitOpts => ({ on: sides[k < 0 ? 0 : 1], at: [xc + k * (bw / 2 - bt), y, zf0 - 25], dir: [k, 0, 0] }))), 0.12),
    { tools: ["screwdriver"], kind: "cams" },
  );
  dstep("Slide in the drawer bottom", "Smooth side in, down the grooves until it reaches the front.", () => stage(bottom, [0, 0, -420]));
  dstep("Tap the wire stop into the drawer back", "Both legs into the holes along its edge, until it sits down flat.", () => {
    stage(back, [0, 0, -260]);
    b.then(0.15);
    b.fit(WIRE, { on: back, at: [xc, yb0 + bh - 6, zf0 - bd + bt / 2], dir: [0, -1, 0] });
  }, { tools: ["hammer"] });
  dstep(
    "Lock the back between the sides",
    "Push the four plastic pins through the sides into the back, then turn the four cam locks in the back.",
    () => {
      b.fits(PIN, sx.flatMap((k) => [yb0 + 40, yb0 + bh - 40].map((y): FitOpts => ({ on: sides[k < 0 ? 0 : 1], at: [xc + k * (bw / 2), y, zf0 - bd + bt / 2], dir: [-k, 0, 0], mate: back }))), 0.1);
      b.then(0.1);
      b.fits(DR_CAM, sx.flatMap((k) => [yb0 + 40, yb0 + bh - 40].map((y): FitOpts => ({ on: back, at: [xc + k * (bw / 2 - bt - 25), y, zf0 - bd], dir: [0, 0, 1] }))), 0.1);
    },
    { tools: ["screwdriver"], kind: "cams" },
  );
  dstep(
    "Turn it over and screw on the runners",
    "Left runner on the left side, right on the right, along the bottom edge. Two screws each.",
    () => {
      b.fits(RUNNER, sx.map((k): FitOpts => ({ on: sides[k < 0 ? 0 : 1], at: [xc + k * (bw / 2), yRun, zRun], dir: [-k, 0, 0], hole: false })), 0.2);
      b.then(0.1);
      b.fits(RUN_SCREW, sx.flatMap((k) => [-100, 100].map((dz): FitOpts => ({ on: sides[k < 0 ? 0 : 1], at: [xc + k * (bw / 2 + 4), yRun, zRun + dz], dir: [-k, 0, 0] }))), 0.08);
    },
    { tools: ["screwdriver"], kind: "screws", pose: "+y" },
  );
  dstep(
    "Screw the handle on the drawer",
    "Two screws from inside the front.",
    () => {
      const y = (dTop + dBot) / 2 + 20;
      b.fit({ ...HW.handle, len: 150 }, { on: front, at: [xc, y, zF], dir: [0, 0, -1], hole: false });
      b.then(0.1);
      b.fits(HANDLE_SCREW, [-66, 66].map((dx): FitOpts => ({ on: front, at: [xc + dx, y, zf0], dir: [0, 0, 1] })), 0.1);
    },
    { tools: ["screwdriver"], kind: "screws", pose: "+y" },
  );
  b.step({ title: "Slide the drawer in", detail: "Rest its runners on the rails in the cabinet and push it in until it closes.", kind: "drawer" }, () => {
    b.stagger(0);
    for (const k of all) b.add(k, [0, 0, 520]);
  });
}

const DR_BOLT: HwDef = { kind: "camScrew", len: 30, dia: 8 };
const DR_CAM: HwDef = { kind: "cam", len: 11, dia: 12 };
const PIN: HwDef = { kind: "camScrew", len: 30, dia: 8, name: "Plastic cam pin" };
const WIRE: HwDef = { kind: "clip", len: 30, dia: 6, name: "Wire stop" };
const RUNNER: HwDef = { kind: "runner", len: 320, dia: 30, name: "Drawer runner" };
const RUN_SCREW: HwDef = { kind: "screw", len: 12, dia: 4 };
const HANDLE_SCREW: HwDef = { kind: "screw", len: 25, dia: 4 };


/** The side table: front 32 wide, 40 deep, an open space under a shelf with a short back above it. */
function sideTable(s: ProductSpec): CustomParams {
  const W = 320, D = 400, H = s.size.h * 10 || 580;
  const t = 16, tt = 22, ft = 20;
  const Wc = W - 12, Dc = D - 8; // the top overhangs a little at the sides and front
  const z0 = -D / 2, zF = z0 + Dc, zc = (z0 + zF) / 2;
  const xs = Wc / 2 - t / 2, iw = Wc - 2 * t;
  const yB1 = ft + t, yT = H - tt;
  const yS = yT - 140; // shelf centre
  const parts: CustomPart[] = [
    { id: "shelf", name: "Shelf", size: [iw, t, Dc], pos: [0, yS, zc] },
    { id: "back", name: "Back panel", size: [iw, yT - yS - t / 2, t], pos: [0, (yS + t / 2 + yT) / 2, z0 + t / 2] },
    { id: "L", name: "Side panel", size: [t, yT - yB1, Dc], pos: [-xs, (yB1 + yT) / 2, zc] },
    { id: "R", name: "Side panel", size: [t, yT - yB1, Dc], pos: [xs, (yB1 + yT) / 2, zc] },
    { id: "bottom", name: "Bottom", size: [Wc, t, Dc], pos: [0, ft + t / 2, zc] },
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz): CustomPart => ({ id: `F${sx}${sz}`, name: "Foot", size: [56, ft, 56], pos: [sx * (Wc / 2 - 28), ft / 2, zc + sz * (Dc / 2 - 28)], material: "board" })),
    ),
    { id: "top", name: "Top", size: [W, tt, D], pos: [0, H - tt / 2, 0], material: "wood" },
  ];
  const sx2 = [-1, 1];
  const feet = parts.filter((p) => p.name === "Foot").map((p) => p.id);
  const zEnd = (k: number) => zc + k * (Dc / 2 - 45);
  const zBolt = (k: number) => zc + k * (Dc / 2 - 100);
  const steps: CustomStep[] = [
    {
      title: "Screw the back onto the shelf",
      detail: "Stand the back on its edge on a rug and screw through the shelf into it with the Allen key.",
      add: ["shelf", "back"],
      fix: [fx({ kind: "bolt", name: "Connector screw", len: 50, dia: 5, at: [-1, 1].map((k) => [k * (iw / 2 - 50), yS + t / 2, z0 + t / 2] as Vec3), dir: [0, 1, 0], on: "shelf", mate: "back" })],
      tools: ["allen"],
      warnings: ["floor"],
    },
    {
      title: "Tap dowels into the ends",
      detail: "Two into each end of the back and one into each end of the shelf.",
      fix: [
        ...sx2.map((k) => fx({ kind: "dowel", at: [yS + 50, yT - 30].map((y) => [k * (iw / 2), y, z0 + t / 2] as Vec3), dir: [-k, 0, 0], on: "back" })),
        ...sx2.map((k) => fx({ kind: "dowel", at: [[k * (iw / 2), yS, zc + 40]], dir: [-k, 0, 0], on: "shelf" })),
      ],
      tools: ["hammer"],
    },
    { title: "Push the sides on", detail: "One from each end, onto the dowels.", add: ["L", "R"] },
    {
      title: "Tap dowels into the ends of the sides",
      detail: "Lay it on its back. Two into the top end and two into the bottom end of each side.",
      fix: sx2.map((k) => fx({ kind: "dowel", at: [yB1, yT].flatMap((y) => sx2.map((j) => [k * xs, y, zEnd(j)] as Vec3)), on: k < 0 ? "L" : "R" })).map((f) => ({ ...f, dir: undefined })),
      tools: ["hammer"],
      pose: "+z",
      warnings: ["floor"],
    },
    {
      title: "Screw the bottom on",
      detail: "Press it onto the dowels, then four connector screws through it into the sides with the big Allen key.",
      add: ["bottom"],
      fix: [fx({ kind: "bolt", name: "Connector screw", len: 50, dia: 7, at: sx2.flatMap((k) => sx2.map((j) => [k * xs, ft, zBolt(j)] as Vec3)), dir: [0, 1, 0], on: "bottom" })],
      tools: ["allen"],
    },
    {
      title: "Tap the thick dowels into the bottom",
      detail: "Turn it upside down. One near each corner, for the feet.",
      fix: [fx({ kind: "dowel", len: 30, dia: 10, at: feet.map((id) => { const p = parts.find((x) => x.id === id)!; return [p.pos[0] + 10, ft, p.pos[2]] as Vec3; }), dir: [0, 1, 0], on: "bottom" })],
      tools: ["hammer"],
      pose: "-y",
    },
    {
      title: "Fit the feet and screw them on",
      detail: "Press a foot onto each dowel, its shaped edges facing out, then one screw through each.",
      add: feet,
      fix: [fx({ kind: "screw", len: 16, dia: 4, at: feet.map((id) => { const p = parts.find((x) => x.id === id)!; return [p.pos[0] - 10, 0, p.pos[2]] as Vec3; }), dir: [0, 1, 0] })],
      tools: ["screwdriver"],
    },
    {
      title: "Turn it over and push the cam bolts into the top",
      detail: "Stand it on its feet. Four bolts into the holes on the underside of the top, pushed in until they click.",
      fix: [fx({ kind: "camScrew", at: sx2.flatMap((k) => sx2.map((j) => [k * xs, yT, zc + j * (Dc / 2 - 80)] as Vec3)), dir: [0, 1, 0], on: "top" })],
      pose: "+y",
    },
    { title: "Lower the top on", detail: "Onto the dowels and cam bolts.", add: ["top"] },
    {
      title: "Turn the cam locks",
      detail: "Four, inside the sides just under the top. Arrow towards the bolt, then turn clockwise until it pulls tight.",
      fix: sx2.map((k) => fx({ kind: "cam", dia: 15, at: sx2.map((j) => [k * (xs - t / 2), yT - 30, zc + j * (Dc / 2 - 80)] as Vec3), dir: [k, 0, 0], on: k < 0 ? "L" : "R" })),
      tools: ["screwdriver"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["SKRUVBY"],
  build(b, s) {
    if (!/skruvby-sideboard/.test(s.slug ?? "")) return false;
    const { recipe, dr } = sideboard(s);
    buildCustom(b, { ...s, custom: recipe });
    drawerSteps(b, dr);
    return true;
  },
  recipe(s) {
    const slug = s.slug ?? "";
    if (/skruvby-cabinet-glass-doors/.test(slug)) return cabinet(s, "glass");
    if (/skruvby-cabinet-doors/.test(slug)) return cabinet(s, "doors");
    if (/skruvby-bookcase/.test(slug)) return cabinet(s, "bookcase");
    if (/skruvby-tv-bench/.test(slug)) return tvBench(s);
    if (/skruvby-side-table/.test(slug)) return sideTable(s);
    return null;
  },
};
export default family;
