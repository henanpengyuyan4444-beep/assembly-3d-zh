import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * JÄTTESTA, read from its manuals. The boards are built into one block first: connector bolts screwed into the
 * shelves, dividers on dowels between them, held by cam locks at one end and long screws through the next shelf at
 * the other. The block then goes onto its end and drops into a steel side frame, whose rails sit under the shelf
 * edges and take two or three flat screws each, and the second frame goes on top. Adjustable feet go into the legs.
 * The TV bench adds a pair of middle legs that hook onto the shelf edges, and two wall fittings at the back.
 */

const T = 18; // board
const TUBE = 25;
const r = (n: number) => Math.round(n * 10) / 10;
const fx = (kind: CustomFix["kind"], on: string, dir: Vec3, at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({
  kind,
  count: at.length,
  on,
  dir,
  at: at.map((p) => p.map(r) as Vec3),
  ...o,
});
const CONNECTOR: Partial<CustomFix> = { len: 40, dia: 7, name: "Connector bolt" };
const LONG: Partial<CustomFix> = { len: 50, dia: 7 };
const FLAT: Partial<CustomFix> = { len: 10, dia: 6, name: "Flat screw" };
const FOOT: Partial<CustomFix> = { len: 20, dia: 18, name: "Adjustable foot" };

interface Div {
  id: string;
  x: number;
  z: number;
  w: number; // along x
  d: number; // along z
  lo: number; // shelf index under it
}

interface Box {
  W: number;
  H: number;
  D: number;
  ys: number[]; // shelf bottoms, from the floor up
  divs: Div[];
}

function partsOf(g: Box, metal: string): CustomPart[] {
  const { W, H, D, ys } = g;
  const parts: CustomPart[] = ys.map((y, i) => ({ id: `S${i}`, name: "Shelf", size: [W - TUBE, T, D - 2 * TUBE], pos: [0, y + T / 2, 0], material: "board" }));
  for (const v of g.divs) {
    const y0 = ys[v.lo] + T, y1 = ys[v.lo + 1];
    parts.push({ id: v.id, name: v.w > v.d ? "Divider" : "Long divider", size: [v.w, y1 - y0, v.d], pos: [v.x, (y0 + y1) / 2, v.z], material: "board" });
  }
  const frame: PartPiece[] = [
    ...[-1, 1].map((sz) => ({ shape: "cyl" as const, size: [TUBE, H, TUBE] as Vec3, pos: [0, 0, sz * (D / 2 - TUBE / 2)] as Vec3 })),
    ...ys.map((y) => ({ shape: "box" as const, size: [TUBE, 20, D - 2 * TUBE] as Vec3, pos: [0, y - 10 - H / 2, 0] as Vec3 })),
  ];
  [-1, 1].forEach((sx, i) => parts.push({ id: i ? "FR" : "FL", name: `${metal} frame`, size: [TUBE, H, D], pos: [sx * (W / 2 - TUBE / 2), H / 2, 0], pieces: frame, material: "metal" }));
  return parts;
}

const divOf = (g: Box, id: string) => g.divs.find((v) => v.id === id)!;
const yTopOf = (g: Box, i: number) => g.ys[i] + T;

/** Points along a divider's long side, `n` of them. */
function along(v: Div, n: number, y: number, inset = 0.25): Vec3[] {
  const long = v.w >= v.d;
  const L = long ? v.w : v.d;
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : -L / 2 + L * inset + ((L * (1 - 2 * inset)) * i) / (n - 1);
    return long ? ([v.x + t, y, v.z] as Vec3) : ([v.x, y, v.z + t] as Vec3);
  });
}

const connectors = (g: Box, v: Div) => fx("camScrew", `S${v.lo}`, [0, -1, 0], along(v, 2, yTopOf(g, v.lo)), { ...CONNECTOR, mate: v.id });
const dowelsDown = (g: Box, v: Div, n = 2) => fx("dowel", v.id, [0, -1, 0], along(v, n, yTopOf(g, v.lo), 0.15), { mate: `S${v.lo}` });
const dowelsUp = (g: Box, v: Div, n = 2) => fx("dowel", v.id, [0, 1, 0], along(v, n, g.ys[v.lo + 1], 0.15), { mate: `S${v.lo + 1}` });
const cams = (g: Box, v: Div) => {
  const long = v.w >= v.d;
  const off: Vec3 = long ? [0, 0, v.d / 2] : [v.d === 0 ? 0 : v.w / 2, 0, 0];
  const dir: Vec3 = long ? [0, 0, -1] : [-1, 0, 0];
  return fx("cam", v.id, dir, along(v, 2, yTopOf(g, v.lo) + 34).map((p) => [p[0] + off[0], p[1], p[2] + off[2]] as Vec3), { dia: 15 });
};
const longScrews = (g: Box, v: Div, n = 2) => fx("screw", `S${v.lo + 1}`, [0, -1, 0], along(v, n, g.ys[v.lo + 1] + T, 0.25), { ...LONG, mate: v.id });

/** Flat screws up through a frame's rails into the shelf edges, `n` along each rail. */
function frameScrews(g: Box, id: "FL" | "FR", n: number): CustomFix[] {
  const sx = id === "FL" ? -1 : 1;
  const x = sx * (g.W / 2 - TUBE / 2);
  const span = g.D - 2 * TUBE - 120;
  return g.ys.map((y, i) =>
    fx("screw", id, [0, 1, 0], Array.from({ length: n }, (_, k) => [x, y - 20, n === 1 ? 0 : -span / 2 + (span * k) / (n - 1)] as Vec3), { ...FLAT, mate: `S${i}` }),
  );
}

function feet(g: Box, extra: Vec3[] = []): CustomFix[] {
  const legs: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (g.W / 2 - TUBE / 2), 0, sz * (g.D / 2 - TUBE / 2)] as Vec3));
  return [
    fx("foot", "FL", [0, 1, 0], legs.filter((p) => p[0] < 0), FOOT),
    fx("foot", "FR", [0, 1, 0], legs.filter((p) => p[0] > 0), FOOT),
    ...extra.map((p) => fx("foot", "C", [0, 1, 0], [p], FOOT)),
  ];
}

function framesSteps(g: Box, n: number, feetFix: CustomFix[], turnDetail: string): CustomStep[] {
  return [
    {
      title: "Lower it into a side frame",
      detail: "Stand the block on its end and set it into the frame on the rug, each shelf edge resting on a rail.",
      add: ["FL"],
      pose: "+x",
      warnings: ["floor"],
    },
    { title: "Screw the frame to the shelves", detail: "Up through each rail into the shelf edge. Turn them in with the Allen key until they're tight.", fix: frameScrews(g, "FL", n), tools: ["allen"] },
    { title: "Lay the other frame on top", detail: "Line its rails up under the shelf edges.", add: ["FR"] },
    { title: "Screw on the second frame", detail: "The same screws, the same way.", fix: frameScrews(g, "FR", n), tools: ["allen"] },
    { title: "Screw in the feet", detail: "One into the end of each leg, by hand. Leave them turned right in for now.", fix: feetFix },
    { title: "Stand it up and level it", detail: turnDetail, pose: "+y", warnings: ["floor"] },
  ];
}

function coffee(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const ys = [100, H - T];
  const half = 220;
  const g: Box = {
    W,
    H,
    D,
    ys,
    divs: [
      { id: "V", x: 0, z: 0, w: T, d: 440, lo: 0 },
      { id: "H0", x: -(T / 2 + half / 2), z: 0, w: half, d: T, lo: 0 },
      { id: "H1", x: T / 2 + half / 2, z: 0, w: half, d: T, lo: 0 },
    ],
  };
  const parts = partsOf(g, "Side");
  parts.push({ id: "C", name: "Centre leg", size: [30, ys[0], 30], pos: [0, ys[0] / 2, 0], shape: "cyl", material: "metal" });
  const V = divOf(g, "V"), H0 = divOf(g, "H0"), H1 = divOf(g, "H1");
  const steps: CustomStep[] = [
    {
      title: "Screw two connector bolts into the bottom shelf",
      detail: "Lay it on a rug, holes up. Turn them in by hand until the collar meets the board.",
      fix: [connectors(g, V)],
      warnings: ["floor"],
    },
    { title: "Stand the long divider on it", detail: "Tap two dowels into each long edge first, then lower it over the connector bolts.", add: ["V"], fix: [dowelsDown(g, V), dowelsUp(g, V)], tools: ["hammer"] },
    { title: "Lock the divider with the cam locks", detail: "Arrow towards the bolt, then turn each one clockwise until it pulls tight.", fix: [cams(g, V)], tools: ["screwdriver"] },
    {
      title: "Fit the two short dividers",
      detail: "Four dowels in each, two along the top edge and two along the bottom. Push them in on either side of the long divider.",
      add: ["H0", "H1"],
      fix: [dowelsDown(g, H0), dowelsUp(g, H0), dowelsDown(g, H1), dowelsUp(g, H1)],
      tools: ["hammer"],
    },
    { title: "Press the top shelf on", detail: "Line every hole up with its dowel, then press down evenly.", add: ["S1"] },
    {
      title: "Screw the top to the dividers",
      detail: "Six long screws through the top, two into each divider. Then turn the block over onto its side.",
      fix: [longScrews(g, V), longScrews(g, H0), longScrews(g, H1)],
      tools: ["allen"],
    },
    { title: "Screw the centre leg under the bottom shelf", detail: "Turn it in by hand, into the middle of the bottom shelf.", add: ["C"], pose: "+x", from: { C: [0, -200, 0] } },
    ...framesSteps(g, 3, feet(g, [[0, 0, 0]]), "Turn it upright and turn the feet out until it stands steady, the centre one too."),
  ];
  return { parts, steps };
}

function side(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const ys = [100, Math.round(0.56 * H) - T, H - T];
  const dd = D - 2 * TUBE;
  const g: Box = {
    W,
    H,
    D,
    ys,
    divs: [
      { id: "V1", x: -W * 0.14, z: -dd / 2 + 60, w: 340, d: T, lo: 0 },
      { id: "V2", x: W * 0.24, z: -dd / 2 + 60, w: 240, d: T, lo: 1 },
    ],
  };
  const parts = partsOf(g, "Side");
  const V1 = divOf(g, "V1"), V2 = divOf(g, "V2");
  const steps: CustomStep[] = [
    {
      title: "Screw the connector bolts into two shelves",
      detail: "Two in the bottom shelf and two in the middle one, on a rug, holes up. Turn them in by hand until the collar meets the board.",
      fix: [connectors(g, V1), connectors(g, V2)],
      warnings: ["floor"],
    },
    {
      title: "Fit the lower divider between them",
      detail: "Stand both shelves on their front edges. Tap two dowels into each long edge of the divider and push it in between.",
      add: ["V1"],
      fix: [dowelsDown(g, V1), dowelsUp(g, V1)],
      tools: ["hammer"],
      pose: "-z",
    },
    { title: "Screw the middle shelf to it", detail: "Two long screws through the shelf into the divider's edge.", fix: [longScrews(g, V1)], tools: ["allen"] },
    { title: "Lock the divider to the bottom shelf", detail: "Arrow towards the bolt, then turn the cam locks clockwise until they pull tight.", fix: [cams(g, V1)], tools: ["screwdriver"] },
    {
      title: "Add the top shelf and the upper divider",
      detail: "Four dowels in the divider, two along each long edge. Push it onto the middle shelf's bolts, then the top shelf on.",
      add: ["V2", "S2"],
      fix: [dowelsDown(g, V2), dowelsUp(g, V2)],
      tools: ["hammer"],
    },
    { title: "Lock the upper divider", detail: "The two cam locks at its lower end, clockwise until tight.", fix: [cams(g, V2)], tools: ["screwdriver"] },
    { title: "Screw the top shelf to the divider", detail: "Two long screws through the top shelf.", fix: [longScrews(g, V2)], tools: ["allen"] },
    ...framesSteps(g, 2, feet(g), "Turn it upright against the wall it will stand by, and turn the feet out until it stands steady."),
  ];
  return { parts, steps };
}

function tv(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const ys = [90, Math.round(0.55 * H) - T, H - T];
  const dd = D - 2 * TUBE;
  const g: Box = {
    W,
    H,
    D,
    ys,
    divs: [
      { id: "V1", x: -170, z: -dd / 2 + 70, w: 300, d: T, lo: 0 },
      { id: "V2", x: 170, z: -dd / 2 + 70, w: 300, d: T, lo: 1 },
    ],
  };
  const parts = partsOf(g, "End");
  // middle legs: a tube with three hooks, one onto each shelf edge
  const zl = D / 2 - TUBE / 2;
  const legPieces: PartPiece[] = [
    { shape: "cyl", size: [TUBE, H, TUBE], pos: [0, 0, 0] },
    ...ys.map((y) => ({ shape: "box" as const, size: [40, 50, 4] as Vec3, pos: [0, y + T / 2 - H / 2, 0] as Vec3 })),
  ];
  [-1, 1].forEach((sz, i) => parts.push({ id: i ? "MF" : "MB", name: "Middle leg", size: [40, H, TUBE], pos: [0, H / 2, sz * zl], pieces: legPieces, material: "metal" }));
  const V1 = divOf(g, "V1"), V2 = divOf(g, "V2");
  const legScrews = (id: "MF" | "MB"): CustomFix[] => {
    const sz = id === "MF" ? 1 : -1;
    return ys.map((y, i) => fx("screw", id, [0, 0, -sz], [-1, 1].map((sx) => [sx * 10, y + T / 2, sz * (dd / 2)] as Vec3), { ...FLAT, mate: `S${i}` }));
  };
  const capAt: Vec3[] = [V1, V2].flatMap((v) => [-1, 1].flatMap((sx) => [0, 1].map((k) => [v.x + sx * (v.w / 2 + 40), yTopOf(g, v.lo + k) - (k ? T : 0), v.z + 40] as Vec3)));
  const wallX = W / 2 - 90, yW = H - 40, zW = -D / 2;
  const steps: CustomStep[] = [
    {
      title: "Screw the connector bolts into two shelves",
      detail: "Two in the bottom shelf and two in the middle one, on a rug, holes up. Turn them in by hand until the collar meets the board.",
      fix: [connectors(g, V1), connectors(g, V2)],
      warnings: ["floor"],
    },
    {
      title: "Fit the lower divider between them",
      detail: "Stand both shelves on their front edges. Tap two dowels into each long edge of the divider and push it in between.",
      add: ["V1"],
      fix: [dowelsDown(g, V1), dowelsUp(g, V1)],
      tools: ["hammer"],
      pose: "-z",
    },
    { title: "Lock the divider to the bottom shelf", detail: "Arrow towards the bolt, then turn the cam locks clockwise until they pull tight.", fix: [cams(g, V1)], tools: ["screwdriver"] },
    { title: "Screw the middle shelf to it", detail: "Two long screws through the shelf into the divider's edge.", fix: [longScrews(g, V1)], tools: ["allen"] },
    {
      title: "Add the top shelf and the upper divider",
      detail: "Four dowels in the divider, two along each long edge. Push it onto the middle shelf's bolts, then the top shelf on.",
      add: ["V2", "S2"],
      fix: [dowelsDown(g, V2), dowelsUp(g, V2)],
      tools: ["hammer"],
    },
    { title: "Lock the upper divider", detail: "The two cam locks at its lower end, clockwise until tight.", fix: [cams(g, V2)], tools: ["screwdriver"] },
    { title: "Screw the top shelf to the divider", detail: "Two long screws through the top shelf.", fix: [longScrews(g, V2)], tools: ["allen"] },
    { title: "Slide on the end frames", detail: "One at each end, the shelf edges in the frames' rails.", add: ["FL", "FR"], people: 2, warnings: ["two"] },
    { title: "Screw the end frames to the shelves", detail: "Two flat screws up through each rail into its shelf.", fix: [...frameScrews(g, "FL", 2), ...frameScrews(g, "FR", 2)], tools: ["allen"] },
    { title: "Hook a middle leg onto the back edges", detail: "Its three hooks drop over the shelf edges in the middle.", add: ["MB"] },
    { title: "Screw the middle leg on", detail: "Two screws through each hook into the shelf. Then turn the bench over onto its back.", fix: legScrews("MB"), tools: ["allen"], people: 2 },
    { title: "Hook the other middle leg on at the front", detail: "The same way, opposite the first.", add: ["MF"], pose: "+z", people: 2, warnings: ["two"] },
    { title: "Screw the front middle leg on", detail: "Two screws through each hook.", fix: legScrews("MF"), tools: ["allen"] },
    {
      title: "Screw in the feet",
      detail: "One under each of the six legs, by hand.",
      fix: [...feet(g), fx("foot", "MF", [0, 1, 0], [[0, 0, zl]], FOOT), fx("foot", "MB", [0, 1, 0], [[0, 0, -zl]], FOOT)],
    },
    {
      title: "Stand it up and press in the caps",
      detail: "Lift it upright together. Push a sleeve into each spare hole beside the dividers, then press a cap into it.",
      fix: [fx("cap", "S0", [0, -1, 0], capAt, { len: 6, dia: 10, name: "Cap sleeve" }), fx("cap", "S0", [0, -1, 0], capAt.map((p) => [p[0], p[1] + 1, p[2]] as Vec3), { len: 3, dia: 14, name: "Cover cap" })],
      pose: "+y",
      people: 2,
      warnings: ["two"],
    },
    { title: "Level it", detail: "Turn the feet out until all six touch the floor and the top is level." },
    {
      title: "Clip the wall fittings onto the frames",
      detail: "One on each end frame, on the top rail at the back. Push it on until it clicks.",
      fix: [-1, 1].map((sx) => fx("bracket", sx < 0 ? "FL" : "FR", [0, 0, -1], [[sx * wallX, yW, zW + 10]], { len: 40, dia: 24, name: "Wall fitting", included: true })),
      wall: true,
    },
    {
      title: "Fix it to the wall",
      detail: "Cut the spacers to fill the gap to the wall, then screw through each fitting. Wall screws aren't included: pick ones made for your wall.",
      fix: [
        ...[-1, 1].map((sx) => fx("spacer", sx < 0 ? "FL" : "FR", [0, 0, -1], [[sx * wallX, yW, zW - 6]], { len: 18, dia: 24 })),
        { kind: "plug", count: 2, at: [-1, 1].map((sx) => [sx * wallX, yW, zW - 20] as Vec3), dir: [0, 0, -1] },
        { kind: "screw", count: 2, len: 50, dia: 5, at: [-1, 1].map((sx) => [sx * wallX, yW, zW + 12] as Vec3), dir: [0, 0, -1] },
      ],
      tools: ["drill", "screwdriver", "pencil"],
      wall: true,
      warnings: ["wall", "tip"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["JÄTTESTA"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/coffee-table/.test(slug)) return coffee(s);
    if (/side-table/.test(slug)) return side(s);
    if (/tv-bench/.test(slug)) return tv(s);
    return null;
  },
};
export default family;
