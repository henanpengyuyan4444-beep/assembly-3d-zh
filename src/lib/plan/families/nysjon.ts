import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";
import { HW, type HwDef, type PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * NYSJÖN, read from its manuals. Every cabinet is a cam-lock box built lying on its side on a rug: wall fittings
 * screwed inside the sides first, cam bolts in the sides, the bottom and shelf (or top and bottom) on dowels stood
 * in one side, the other side on, cams turned. Sink cabinets have no back: the base cabinet gets a top with a notch
 * for the pipe and four steel legs, the tall sink cabinet a shaped front rail on two brackets and two front legs.
 * The high and mirror cabinets get a hardboard back, squared and nailed on while they lie on their front. All of them
 * hang on screws in the wall through the fittings and keyhole plates, adjusted, then the covers snap on. Doors get
 * their hinges lying down and click onto the plates already in the sides; the mirror cabinet has two sliding mirror
 * doors that slide into its grooves during the build. In the sets a BJÖRKÅN basin either sits on the tall cabinet on
 * silicone or hangs on two wall bolts above the base cabinet, then the plug, the tap and the water trap.
 */

type Kind = CustomFix["kind"];
const fx = (kind: Kind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

const T = 16; // boards
const DOOR = 16;

const FIT = { name: "Wall fitting", len: 12, dia: 46 }; // the suspension fitting inside each side
const FIT_SCREW = { len: 12, dia: 4 };
const PLATE = { name: "Wall plate", len: 12, dia: 34 }; // the keyhole plate hooked on the wall screw
const COVER = { name: "Cover", len: 2, dia: 50 };
const LEG_SCREW = { len: 16, dia: 4 };
const FOOT = { name: "Adjustable foot", len: 16, dia: 24 };
const BRACKET_SCREW = { len: 13, dia: 4.5 };

const KNOB: HwDef = { kind: "knob", len: 22, dia: 22 };
const KNOB_SCREW: HwDef = { kind: "bolt", len: 25, dia: 4, name: "Knob screw" };
const BUMPER: HwDef = { kind: "glide", len: 3, dia: 10, name: "Bumper" };
const TRAP: HwDef = { kind: "connector", len: 200, dia: 40, name: "Water trap" };
const WASTE: HwDef = { kind: "connector", len: 80, dia: 30, name: "Waste plug" };
const BASIN_BOLT: HwDef = { kind: "screw", len: 100, dia: 8, notIncluded: true, name: "Wall bolt" };
const SLEEVE: HwDef = { kind: "spacer", len: 15, dia: 14, name: "Spacer sleeve" };
const BASIN_PLATE: HwDef = { kind: "clip", len: 12, dia: 30, name: "Keyhole plate" };

type Model = "base" | "wash" | "high" | "mirror";
type BasinKind = "on" | "wall";

interface Door {
  w: number;
  h: number;
  x: number;
  y: number; // centre
  z: number; // centre
  hinge: -1 | 1; // which side the hinges are on
  knob: Vec3;
  drill?: boolean; // the knob hole is drilled by you
}

interface Cab {
  parts: CustomPart[];
  steps: CustomStep[];
  doors: Door[];
  W: number;
  H: number;
  zBack: number;
}

const side = (sx: number) => (sx < 0 ? "SL" : "SR");

/** A leg: a square steel tube on a plate that screws under the bottom. */
function leg(h: number): PartPiece[] {
  return [
    { shape: "box", size: [22, h - 3, 22], pos: [0, -1.5, 0], material: "metal" },
    { shape: "box", size: [44, 3, 44], pos: [0, h / 2 - 1.5, 0], material: "metal" },
  ];
}

/** Mark through the fittings, screw into the wall, hook the plates on and snap the covers over. */
function wallSteps(fits: Vec3[], wallZ: number, people: 1 | 2 = 1): CustomStep[] {
  const wall = fits.map((p) => [p[0] - Math.sign(p[0]) * 26, p[1], wallZ] as Vec3);
  return [
    {
      title: "Mark the wall through the fittings",
      detail: "Push it against the wall where it will hang and mark through the hole in each fitting. Move it away again.",
      tools: ["pencil", "level"],
      wall: true,
      people,
    },
    {
      title: "Screw the wall screws in",
      detail: "One at each mark. Leave the heads standing out a little. Screws and plugs aren't included: use ones made for your wall.",
      fix: [fx("plug", wall.map((p) => [p[0], p[1], wallZ - 40] as Vec3), [0, 0, -1]), fx("screw", wall.map((p) => [p[0], p[1], wallZ + 2] as Vec3), [0, 0, -1], { len: 50, dia: 5 })],
      tools: ["drill", "screwdriver"],
      wall: true,
      warnings: ["wall"],
    },
    {
      title: "Hang it on the wall plates",
      detail: "Hook a plate over each screw and push the cabinet back so the fittings grip them. Turn the adjusting screws until it sits level and tight to the wall.",
      fix: [fx("washer", wall.map((p) => [p[0], p[1], wallZ + 4] as Vec3), [0, 0, -1], { ...PLATE })],
      tools: ["screwdriver", "level"],
      wall: true,
      people,
    },
    {
      title: "Snap the covers on",
      detail: "One over each fitting.",
      fix: [-1, 1].map((sx) => fx("cap", fits.filter((p) => p[0] * sx > 0).map((p) => [p[0], p[1], p[2] + 12] as Vec3), [sx, 0, 0], { ...COVER, on: side(sx) })),
    },
  ];
}

/* ---------- the sink cabinets ---------- */

function sinkCab(model: "base" | "wash", W: number, H: number, D: number, zBack: number): Cab {
  const base = model === "base";
  const legH = base ? 110 : 130;
  const Dc = D - DOOR - 2;
  const zc = zBack + Dc / 2;
  const zF = zBack + Dc; // front edge of the carcass
  const top = base ? H - T : H; // where the sides stop
  const sh = top - legH;
  const yB = legH + T / 2;
  const yS = legH + (top - legH) * (base ? 0.48 : 0.45);
  const shD = Dc - 60;
  const zS = zF - shD / 2;
  const xs = W / 2 - T / 2;
  const xi = W / 2 - T; // inside faces
  const parts: CustomPart[] = [
    ...[-1, 1].map((sx): CustomPart => ({ id: side(sx), name: "Side", size: [T, sh, Dc], pos: [sx * xs, legH + sh / 2, zc] })),
    { id: "B", name: "Bottom", size: [W - 2 * T, T, Dc], pos: [0, yB, zc] },
    { id: "S", name: "Shelf", size: [W - 2 * T, T, shD], pos: [0, yS, zS] },
  ];
  const lx = W / 2 - 44;
  const legZ = base ? [zBack + 22, zF - 22] : [zF - 22];
  const legs = [-1, 1].flatMap((sx) => legZ.map((z) => [sx * lx, z] as const));
  const legPieces = leg(legH - FOOT.len);
  legs.forEach(([x, z], i) => parts.push({ id: `G${i}`, name: "Leg", size: [44, legH - FOOT.len, 44], pos: [x, FOOT.len + (legH - FOOT.len) / 2, z], pieces: legPieces, material: "metal" }));
  const legIds = legs.map((_, i) => `G${i}`);

  // the wall fittings: one at the top of each side in the base cabinet, two in the tall one
  const fitYs = base ? [top - 45] : [top - 60, legH + 160];
  const fits = [-1, 1].flatMap((sx) => fitYs.map((y) => [sx * xi, y, zBack + 30] as Vec3));
  const panelY = [yB, yS];
  const panelZ = (i: number) => (i === 0 ? [zc - Dc / 2 + 40, zc + Dc / 2 - 40] : [zS - shD / 2 + 40, zS + shD / 2 - 40]);
  const boltsA = (sx: number) => fx("camScrew", panelY.flatMap((y, i) => panelZ(i).map((z) => [sx * xi, y, z] as Vec3)), [sx, 0, 0], { on: side(sx) });
  const camsFor = (sx: number): CustomFix =>
    fx("cam", panelY.flatMap((y, i) => panelZ(i).map((z) => [sx * (xi - 26), y + T / 2, z] as Vec3)), [0, -1, 0]);

  const steps: CustomStep[] = [
    {
      title: "Screw the wall fittings into the sides",
      detail: base
        ? "Lay both sides on a rug, inner faces up. One fitting at the top back corner of each, two screws, the arrow pointing up."
        : "Lay both sides on a rug, inner faces up. Two fittings on each, at the back near the top and near the bottom, two screws each, arrows pointing up.",
      add: ["SL"],
      fix: [
        ...[-1, 1].map((sx) => fx("clip", fits.filter((p) => p[0] * sx > 0), [sx, 0, 0], { ...FIT, on: side(sx) })),
        ...[-1, 1].map((sx) => fx("screw", fits.filter((p) => p[0] * sx > 0).flatMap((p) => [-1, 1].map((k) => [p[0], p[1] + k * 24, p[2]] as Vec3)), [sx, 0, 0], { ...FIT_SCREW, on: side(sx) })),
      ],
      pose: "+x",
      tools: ["screwdriver"],
      warnings: ["floor"],
    },
  ];
  // the tall cabinet's shaped front rail hangs on two brackets screwed in next
  const brk = [-1, 1].map((sx) => [sx * xi, H - 55, zF - 30] as Vec3);
  if (!base)
    steps.push({
      title: "Screw the brackets for the front rail into the sides",
      detail: "At the top front corner of each side, two screws each. Use the shorter screws here.",
      fix: [
        ...[-1, 1].map((sx, i) => fx("angle", [brk[i]], [sx, 0, 0], { name: "Bracket", len: 40, dia: 40, on: side(sx) })),
        ...[-1, 1].map((sx, i) => fx("screw", [-1, 1].map((k) => [brk[i][0], brk[i][1], brk[i][2] + k * 24] as Vec3), [sx, 0, 0], { ...BRACKET_SCREW, on: side(sx) })),
      ],
      tools: ["screwdriver"],
    });
  steps.push(
    {
      title: "Screw the cam bolts into the sides",
      detail: "Four in the side on the rug, until the collar meets the surface. The other side gets its own when it goes on.",
      fix: [boltsA(-1)],
      tools: ["screwdriver"],
    },
    {
      title: "Tap the dowels in and stand the bottom and shelf in a side",
      detail: "Two dowels in each end of both panels. Push them onto the side lying on the rug, the cam holes facing the way the drawing shows.",
      add: ["B", "S"],
      fix: [
        ...[-1, 1].flatMap((sx) => [0, 1].map((i) => fx("dowel", [-1, 1].map((k) => [sx * xi, panelY[i], (i ? zS : zc) + k * (i ? shD : Dc) * 0.25] as Vec3), [-sx, 0, 0], { on: i ? "S" : "B" }))),
      ],
      from: { B: [300, 0, 0], S: [300, 0, 0] },
    },
    { title: "Lock the cam locks", detail: "Arrow towards the bolt, then turn clockwise until it pulls tight.", fix: [camsFor(-1)], tools: ["screwdriver"] },
    { title: "Lay the other side on", detail: "Screw its four cam bolts in first, then lay it onto the dowels, fittings at the back.", add: ["SR"], fix: [boltsA(1)], from: { SR: [300, 0, 0] } },
    { title: "Lock the cam locks", detail: "The same on this side.", fix: [camsFor(1)], tools: ["screwdriver"] },
  );
  if (base) {
    // the top, with its notch at the back for the pipe
    const nw = 170, nd = 130;
    const topPieces: PartPiece[] = [
      ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [(W - nw) / 2, T, D], pos: [sx * (nw / 2 + (W - nw) / 4), 0, 0] })),
      { shape: "box", size: [nw, T, D - nd], pos: [0, 0, nd / 2] },
    ];
    parts.push({ id: "U", name: "Top", size: [W, T, D], pos: [0, H - T / 2, zBack + D / 2], pieces: topPieces });
    const topZ = [zc - Dc / 4, zc + Dc / 4];
    steps.push(
      {
        title: "Tap the dowels into the top edges",
        detail: "Two in the top edge of each side.",
        fix: [-1, 1].map((sx) => fx("dowel", topZ.map((z) => [sx * xs, top, z] as Vec3), [0, -1, 0], { on: side(sx) })),
      },
      {
        title: "Screw the cam bolts into the top and fit it",
        detail: "Four bolts in the underside of the top, then push it onto the dowels, the notch at the back.",
        add: ["U"],
        fix: [fx("camScrew", [-1, 1].flatMap((sx) => [zc - Dc / 2 + 40, zc + Dc / 2 - 40].map((z) => [sx * xs, top, z] as Vec3)), [0, 1, 0], { on: "U" })],
        from: { U: [0, 300, 0] },
        tools: ["screwdriver"],
      },
      {
        title: "Lock the cam locks",
        detail: "Two in each side, just under the top.",
        fix: [-1, 1].map((sx) => fx("cam", [zc - Dc / 2 + 40, zc + Dc / 2 - 40].map((z) => [sx * xi, top - 26, z] as Vec3), [sx, 0, 0], { on: side(sx) })),
        tools: ["screwdriver"],
      },
    );
  }
  steps.push(
    {
      title: base ? "Screw on the legs" : "Screw on the two front legs",
      detail: "Two screws through each leg plate into the bottom.",
      add: legIds,
      fix: [fx("screw", legs.flatMap(([x, z]) => [-1, 1].map((k) => [x + k * 12, legH, z] as Vec3)), [0, 1, 0], { ...LEG_SCREW })],
      from: Object.fromEntries(legIds.map((id) => [id, [0, -220, 0] as Vec3])),
      tools: ["screwdriver"],
    },
    {
      title: "Screw the feet into the legs",
      detail: "Turn each one in by hand, all the same amount.",
      fix: [fx("foot", legs.map(([x, z]) => [x, FOOT.len, z] as Vec3), [0, 1, 0], { ...FOOT })],
      warnings: ["hand"],
    },
    {
      title: "Stand it up and level it",
      detail: base ? "Stand it where it will go, against the wall. Turn the feet until it stands level, front to back and side to side." : "Stand it against the wall. Turn the two feet until the shelf is level.",
      pose: "+y",
      tools: ["level"],
    },
    ...wallSteps(fits, zBack),
  );
  if (!base) {
    // the shaped front rail: two raised ends and a lower middle
    const rw = W - 2 * T;
    const railPieces: PartPiece[] = [
      ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [50, 90, 18], pos: [sx * (rw / 2 - 25), 0, 0] })),
      { shape: "box", size: [rw - 100, 50, 18], pos: [0, -20, 0] },
    ];
    parts.push({ id: "FR", name: "Front rail", size: [rw, 90, 18], pos: [0, H - 55, zF - 9], pieces: railPieces });
    steps.push({
      title: "Screw on the front rail",
      detail: "Between the sides at the top front, curved edge up. Two screws through each bracket into the rail.",
      add: ["FR"],
      fix: [-1, 1].map((sx, i) => fx("screw", [-1, 1].map((k) => [brk[i][0] - sx * 30, brk[i][1] + k * 12, zF - 18] as Vec3), [0, 0, 1], { ...BRACKET_SCREW, on: "FR" })),
      from: { FR: [0, 0, 260] },
      tools: ["screwdriver"],
    });
  }
  const dy0 = legH + 2;
  const dh = (base ? top : H - 100) - dy0 - 2;
  const zD = zF + 1 + DOOR / 2;
  const doors: Door[] = base
    ? [-1, 1].map((sx) => ({ w: W / 2 - 3, h: dh, x: (sx * W) / 4, y: dy0 + dh / 2, z: zD, hinge: sx as -1 | 1, knob: [sx * 24, dy0 + dh - 45, zD + DOOR / 2] as Vec3 }))
    : [{ w: W - 4, h: dh, x: 0, y: dy0 + dh / 2, z: zD, hinge: -1, knob: [W / 2 - 2 - 30, dy0 + dh - 30, zD + DOOR / 2], drill: true }];
  return { parts, steps, doors, W, H, zBack };
}

/* ---------- the high cabinet ---------- */

function backNails(W: number, y0: number, y1: number, zB: number) {
  const pts: Vec3[] = [];
  const xs = W / 2 - T / 2;
  const n = 12;
  for (const sx of [-1, 1]) for (let i = 0; i < n; i++) pts.push([sx * xs, y0 + 30 + ((y1 - y0 - 60) * i) / (n - 1), zB]);
  for (const y of [y0 + T / 2, y1 - T / 2]) for (const k of [-1, 0, 1]) pts.push([k * (W / 4), y, zB]);
  return pts;
}

function mirrorNails(W: number, H: number, zB: number): Vec3[] {
  const xs = W / 2 - T / 2;
  return [
    ...[-1, 1].flatMap((sx) => [0, 1, 2, 3, 4].map((i) => [sx * xs, 40 + ((H - 80) * i) / 4, zB] as Vec3)),
    ...[-1, 0, 1].map((k) => [k * (W / 4), H - T / 2, zB] as Vec3),
    ...[-1, 1].map((k) => [k * (W / 4), T / 2, zB] as Vec3),
  ];
}

function highCab(s: ProductSpec): Cab {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const legH = 130;
  const zBack = -D / 2;
  const Dc = D - DOOR - 2 - 3;
  const zB = zBack + 3; // back edge of the carcass, behind it the hardboard
  const zc = zB + Dc / 2;
  const zF = zB + Dc;
  const sh = H - legH;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const yT = H - T / 2, yBo = legH + T / 2;
  const nShelf = 4;
  const shelfY = Array.from({ length: nShelf }, (_, i) => legH + T + ((sh - 2 * T) * (i + 1)) / (nShelf + 1));
  const parts: CustomPart[] = [
    ...[-1, 1].map((sx): CustomPart => ({ id: side(sx), name: "Side", size: [T, sh, Dc], pos: [sx * xs, legH + sh / 2, zc] })),
    { id: "TP", name: "Top", size: [W - 2 * T, T, Dc], pos: [0, yT, zc] },
    { id: "BO", name: "Bottom", size: [W - 2 * T, T, Dc], pos: [0, yBo, zc] },
    { id: "BK", name: "Back panel", size: [W - 4, sh - 4, 3], pos: [0, legH + sh / 2, zBack + 1.5], material: "fiber" },
    ...shelfY.map((y, i): CustomPart => ({ id: `P${i}`, name: "Shelf", size: [W - 2 * T - 2, T, Dc - 20], pos: [0, y + T / 2, zc - 10] })),
  ];
  const lx = W / 2 - 44;
  const legs = [-1, 1].map((sx) => [sx * lx, zF - 22] as const);
  legs.forEach(([x, z], i) => parts.push({ id: `G${i}`, name: "Leg", size: [44, legH - FOOT.len, 44], pos: [x, FOOT.len + (legH - FOOT.len) / 2, z], pieces: leg(legH - FOOT.len), material: "metal" }));
  const fits = [-1, 1].flatMap((sx) => [H - 70, legH + 200].map((y) => [sx * xi, y, zB + 30] as Vec3));
  const panelY = [yBo, yT];
  const jz = [zc - Dc / 2 + 40, zc + Dc / 2 - 40];
  const boltsB = (sx: number) => fx("camScrew", panelY.flatMap((y) => jz.map((z) => [sx * xi, y, z] as Vec3)), [sx, 0, 0], { on: side(sx) });
  // the cam locks sit in the inside faces: the bottom's facing up, the top's facing down
  const cams = (sx: number): CustomFix[] => [
    fx("cam", jz.map((z) => [sx * (xi - 26), yBo + T / 2, z] as Vec3), [0, -1, 0], { on: "BO" }),
    fx("cam", jz.map((z) => [sx * (xi - 26), yT - T / 2, z] as Vec3), [0, 1, 0], { on: "TP" }),
  ];
  const nails = backNails(W, legH, H, zBack);
  const corner = (i: number) => nails[i];
  const steps: CustomStep[] = [
    {
      title: "Screw the wall fittings into the sides",
      detail: "Lay both sides on a rug, inner faces up. Two fittings at the back of each, near the top and near the bottom, two screws each.",
      add: ["SL"],
      fix: [
        ...[-1, 1].map((sx) => fx("clip", fits.filter((p) => p[0] * sx > 0), [sx, 0, 0], { ...FIT, on: side(sx) })),
        ...[-1, 1].map((sx) => fx("screw", fits.filter((p) => p[0] * sx > 0).flatMap((p) => [-1, 1].map((k) => [p[0], p[1] + k * 24, p[2]] as Vec3)), [sx, 0, 0], { ...FIT_SCREW, on: side(sx) })),
      ],
      pose: "+x",
      tools: ["screwdriver"],
      warnings: ["floor"],
    },
    {
      title: "Screw the cam bolts into the sides",
      detail: "Four in the side on the rug, two at each end. The other side gets its own when it goes on.",
      fix: [boltsB(-1)],
      tools: ["screwdriver"],
    },
    {
      title: "Tap the dowels in and stand the top and bottom in a side",
      detail: "Two dowels in each end of both panels, then push them onto the side lying on the rug.",
      add: ["TP", "BO"],
      fix: [-1, 1].flatMap((sx) => panelY.map((y, i) => fx("dowel", [-1, 1].map((k) => [sx * xi, y, zc + k * Dc * 0.2] as Vec3), [-sx, 0, 0], { on: i ? "TP" : "BO" }))),
      from: { TP: [300, 0, 0], BO: [300, 0, 0] },
    },
    { title: "Lock the cam locks", detail: "Arrow towards the bolt, then turn clockwise until it pulls tight.", fix: cams(-1), tools: ["screwdriver"] },
    { title: "Lay the other side on", detail: "Screw its four cam bolts in first, then lay it onto the dowels, fittings at the back.", add: ["SR"], fix: [boltsB(1)], from: { SR: [300, 0, 0] }, people: 2 },
    { title: "Lock the cam locks", detail: "The same on this side.", fix: cams(1), tools: ["screwdriver"] },
    {
      title: "Turn it onto its front and lay the back on",
      detail: "Lay the hardboard back on, smooth side in, lined up with the edges.",
      add: ["BK"],
      pose: "-z",
      people: 2,
      from: { BK: [0, 0, -260] },
    },
    {
      title: "Nail one corner",
      detail: "Hold the nail in the nail holder and tap it in through the back into the top corner.",
      fix: [fx("nail", [corner(11)], [0, 0, 1])],
      tools: ["hammer"],
    },
    {
      title: "Square it and nail the opposite corner",
      detail: "Push the cabinet until the back lines up with the edges all round, then one nail in the opposite corner.",
      fix: [fx("nail", [corner(12)], [0, 0, 1])],
      tools: ["hammer"],
      check: "square",
    },
    { title: "Nail a third corner", detail: "Check the edges still line up first.", fix: [fx("nail", [corner(0)], [0, 0, 1])], tools: ["hammer"] },
    {
      title: "Nail the back all round",
      detail: "The rest of the nails, evenly along the sides, the top and the bottom.",
      fix: [fx("nail", nails.filter((_, i) => ![0, 11, 12].includes(i)), [0, 0, 1])],
      tools: ["hammer"],
    },
    {
      title: "Turn it over and screw on the legs",
      detail: "Lying on its back now. Two screws through each leg plate into the bottom, at the front.",
      add: ["G0", "G1"],
      fix: [fx("screw", legs.flatMap(([x, z]) => [-1, 1].map((k) => [x + k * 12, legH, z] as Vec3)), [0, 1, 0], { ...LEG_SCREW })],
      pose: "+z",
      people: 2,
      from: { G0: [0, -220, 0], G1: [0, -220, 0] },
      tools: ["screwdriver"],
    },
    { title: "Screw the feet into the legs", detail: "Turn each one in by hand, the same amount.", fix: [fx("foot", legs.map(([x, z]) => [x, FOOT.len, z] as Vec3), [0, 1, 0], { ...FOOT })], warnings: ["hand"] },
    { title: "Stand it up and level it", detail: "Together, against the wall where it will hang. Turn the feet until it stands straight.", pose: "+y", people: 2, tools: ["level"] },
    ...wallSteps(fits, zBack, 2),
    {
      title: "Push the shelf pins in",
      detail: "Four for each shelf, at the same height in both sides.",
      fix: [-1, 1].map((sx) => fx("pin", shelfY.flatMap((y) => [zc - Dc / 2 + 40, zc + Dc / 2 - 60].map((z) => [sx * xi, y - 3, z] as Vec3)), [sx, 0, 0], { on: side(sx) })),
    },
    { title: "Lay the shelves in", detail: "One on each set of four pins.", add: shelfY.map((_, i) => `P${i}`), from: Object.fromEntries(shelfY.map((_, i) => [`P${i}`, [0, 0, 300] as Vec3])) },
  ];
  const dh = sh - 4;
  const zD = zF + 1 + DOOR / 2;
  const doors: Door[] = [{ w: W - 4, h: dh, x: 0, y: legH + 2 + dh / 2, z: zD, hinge: -1, knob: [W / 2 - 2 - 30, legH + 2 + dh * 0.55, zD + DOOR / 2], drill: true }];
  return { parts, steps, doors, W, H, zBack };
}

/* ---------- the mirror cabinet ---------- */

function mirrorCab(s: ProductSpec): Cab {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const zBack = -D / 2;
  const Dc = D - 3;
  const zB = zBack + 3;
  const zc = zB + Dc / 2;
  const zF = zB + Dc;
  const xs = W / 2 - T / 2, xi = W / 2 - T;
  const yT = H - T / 2, yBo = T / 2;
  const iw = W - 2 * T;
  const mw = iw / 2 + 15, mh = H - 2 * T + 16;
  const zM = [zF - 9, zF - 19]; // front and back groove
  const parts: CustomPart[] = [
    ...[-1, 1].map((sx): CustomPart => ({ id: side(sx), name: "Side", size: [T, H, Dc], pos: [sx * xs, H / 2, zc] })),
    { id: "TP", name: "Top", size: [iw, T, Dc], pos: [0, yT, zc] },
    { id: "BO", name: "Bottom", size: [iw, T, Dc], pos: [0, yBo, zc] },
    { id: "M0", name: "Mirror door", size: [mw, mh, 5], pos: [-(iw / 2 - mw / 2), H / 2, zM[1]], material: "glass" },
    { id: "M1", name: "Mirror door", size: [mw, mh, 5], pos: [iw / 2 - mw / 2, H / 2, zM[0]], material: "glass" },
    { id: "BK", name: "Back panel", size: [W - 4, H - 4, 3], pos: [0, H / 2, zBack + 1.5], material: "fiber" },
    { id: "GS", name: "Glass shelf", size: [iw - 2, 6, Dc - 40], pos: [0, H * 0.52, zB + (Dc - 40) / 2], material: "glass" },
  ];
  const fits = [-1, 1].map((sx) => [sx * xi, H - T - 60, zB + 15] as Vec3);
  const panelY = [yBo, yT];
  const jz = [zc - 30, zc + 30];
  const boltsB = (sx: number) => fx("camScrew", panelY.flatMap((y) => jz.map((z) => [sx * xi, y, z] as Vec3)), [sx, 0, 0], { on: side(sx) });
  const cams = (sx: number): CustomFix => fx("cam", [-1, 1].flatMap((k) => jz.map((z) => [sx * (xi - 26), k < 0 ? yBo + T / 2 : yT - T / 2, z] as Vec3)), [0, -1, 0]);
  const knobs = [-1, 1].map((sx) => [sx * (iw / 2 - 30), 70, zM[sx < 0 ? 1 : 0] + 2.5] as Vec3);
  const steps: CustomStep[] = [
    {
      title: "Screw the wall fittings into the sides",
      detail: "Lay both sides on a rug, inner faces up. One fitting at the top back corner of each, two screws.",
      add: ["SL"],
      fix: [
        ...[-1, 1].map((sx, i) => fx("clip", [fits[i]], [sx, 0, 0], { ...FIT, on: side(sx) })),
        ...[-1, 1].map((sx, i) => fx("screw", [-1, 1].map((k) => [fits[i][0], fits[i][1] + k * 24, fits[i][2]] as Vec3), [sx, 0, 0], { ...FIT_SCREW, on: side(sx) })),
      ],
      pose: "+x",
      tools: ["screwdriver"],
      warnings: ["floor"],
    },
    {
      title: "Screw the cam bolts into the sides",
      detail: "Four in the side on the rug, two at each end. The other side gets its own when it goes on.",
      fix: [boltsB(-1)],
      tools: ["screwdriver"],
    },
    {
      title: "Tap the dowels in and stand the top and bottom in a side",
      detail: "One dowel in each end of both panels. The grooves for the mirrors face each other, at the front.",
      add: ["TP", "BO"],
      fix: [-1, 1].flatMap((sx) => panelY.map((y, i) => fx("dowel", [[sx * xi, y, zc]], [-sx, 0, 0], { on: i ? "TP" : "BO" }))),
      from: { TP: [300, 0, 0], BO: [300, 0, 0] },
    },
    { title: "Lock the cam locks", detail: "Arrow towards the bolt, then turn clockwise until it pulls tight.", fix: [cams(-1)], tools: ["screwdriver"] },
    {
      title: "Slide the first mirror door in",
      detail: "Into the back grooves, safety film inwards, all the way down to the side on the rug.",
      add: ["M0"],
      from: { M0: [420, 0, 0] },
      warnings: ["hand"],
    },
    { title: "Slide the second mirror door in", detail: "Into the front grooves, the same way.", add: ["M1"], from: { M1: [420, 0, 0] }, warnings: ["hand"] },
    { title: "Lay the other side on", detail: "Screw its four cam bolts in first, then lay it onto the dowels, fitting at the back.", add: ["SR"], fix: [boltsB(1)], from: { SR: [300, 0, 0] } },
    { title: "Lock the cam locks", detail: "The same on this side.", fix: [cams(1)], tools: ["screwdriver"] },
    { title: "Turn it onto its front and lay the back on", detail: "Lay the hardboard back on, lined up with the edges.", add: ["BK"], pose: "-z", from: { BK: [0, 0, -240] } },
    {
      title: "Square it and nail the back on",
      detail: "Check the corners are square, then nail all round with the nail holder.",
      fix: [fx("nail", mirrorNails(W, H, zBack), [0, 0, 1])],
      tools: ["hammer"],
      check: "square",
    },
    ...wallSteps(fits, zBack).map((st, i) => (i === 0 ? { ...st, pose: "+y" as const } : st)),
    {
      title: "Screw the knobs onto the mirrors",
      detail: "Through the hole near the bottom outer corner of each mirror: a disc behind the mirror, the screw from inside, a washer and the knob in front. Hand tight with the screwdriver from the box.",
      fix: [
        fx("cap", knobs.map((p) => [p[0], p[1], p[2] - 5] as Vec3), [0, 0, 1], { name: "Disc", len: 2, dia: 40 }),
        fx("washer", knobs, [0, 0, -1], { dia: 12 }),
        fx("knob", knobs.map((p) => [p[0], p[1], p[2] + 1] as Vec3), [0, 0, -1], { len: 18, dia: 18 }),
        fx("screw", knobs.map((p) => [p[0], p[1], p[2] - 24] as Vec3), [0, 0, 1], { name: "Knob screw", len: 30, dia: 4 }),
      ],
      tools: ["screwdriver"],
    },
    {
      title: "Push the shelf supports in",
      detail: "Four, at the same height in both sides.",
      fix: [-1, 1].map((sx) => fx("pin", [zB + 25, zB + Dc - 65].map((z) => [sx * xi, H * 0.52 - 6, z] as Vec3), [sx, 0, 0], { name: "Shelf support", on: side(sx) })),
    },
    { title: "Lay the glass shelf in", detail: "Slide the mirrors aside and lower it onto the supports.", add: ["GS"], from: { GS: [0, 200, 0] } },
  ];
  return { parts, steps, doors: [], W, H, zBack };
}

/* ---------- doors, basins and the order of a whole guide ---------- */

function doorSteps(b: PlanBuilder, c: Cab) {
  if (!c.doors.length) return;
  const one = c.doors.length === 1;
  const keys = c.doors.map((d) => b.place(b.part("Door", [d.w, d.h, DOOR]), [d.x, d.y, d.z]));
  const n = (d: Door) => (d.h > 1200 ? 3 : 2);
  const hingeYs = (d: Door) => Array.from({ length: n(d) }, (_, i) => d.y - d.h / 2 + 100 + (i * (d.h - 200)) / (n(d) - 1));
  b.step(
    { title: one ? "Screw the hinges onto the door" : "Screw the hinges onto the doors", detail: "Lay the door face down on a rug. Press each hinge cup into its hole and tighten its two screws.", tools: ["screwdriver"], scene: "doors", kind: "hinges", pose: "+y", warnings: ["floor"] },
    () => {
      b.stagger(0.2);
      keys.forEach((k, i) => b.stage(k, [(i - (keys.length - 1) / 2) * (c.doors[i].w + 80), DOOR / 2, 0], [Math.PI / 2, 0, 0], [0, 160, 0]));
      b.then(0.1);
      b.fits(
        HW.hinge,
        c.doors.flatMap((d, i) => hingeYs(d).map((y) => ({ on: keys[i], at: [d.x + d.hinge * (d.w / 2 - 22), y, d.z - DOOR / 2] as Vec3, dir: [0, 0, 1] as Vec3, twist: d.hinge > 0 ? Math.PI : 0 }))),
        0.1,
      );
    },
  );
  b.step(
    { title: one ? "Hang the door" : "Hang the doors", detail: "Hook each hinge arm onto its plate in the side and press until it clicks.", kind: "doors", pose: "+y", people: c.doors[0].h > 1200 ? 2 : 1 },
    () => {
      b.stagger(0.35);
      keys.forEach((k) => b.add(k, [0, 0, 380]));
    },
  );
  const drill = c.doors.some((d) => d.drill);
  if (drill)
    b.step(
      { title: "Drill the hole for the knob", detail: "On the side away from the hinges, 30 mm in from the edge. Drill from the front with a 5 mm bit, with a scrap of wood behind so it doesn't split.", kind: "general", pose: "+y", tools: ["tape", "pencil", "drill"] },
      () => {},
    );
  b.step(
    { title: one ? "Screw on the knob" : "Screw on the knobs", detail: "The screw goes in from the inside of the door. Snug is enough.", kind: "screws", pose: "+y", tools: ["screwdriver"] },
    () => {
      b.stagger(0.2);
      c.doors.forEach((d, i) => {
        b.fit(KNOB, { on: keys[i], at: d.knob, dir: [0, 0, -1], hole: false });
        b.fit(KNOB_SCREW, { on: keys[i], at: [d.knob[0], d.knob[1], d.z - DOOR / 2], dir: [0, 0, 1], hole: false });
      });
    },
  );
  b.step({ title: "Stick on the bumpers", detail: "Two small pads inside, near the free edge, so the door closes quietly.", kind: "general", pose: "+y" }, () => {
    b.stagger(0.15);
    const pads = one ? [0, 0] : [0, 1];
    pads.forEach((di, k) => {
      const d = c.doors[di];
      const x = d.x - d.hinge * (d.w / 2 - 20);
      const y = one ? d.y + (k ? 1 : -1) * (d.h / 2 - 30) : d.y - d.h / 2 + 30;
      b.fit(BUMPER, { on: keys[di], at: [x, y, d.z - DOOR / 2], dir: [0, 0, 1], hole: false });
    });
  });
  b.step(
    { title: one ? "Line up the door" : "Line up the doors", detail: "Turn the hinge screws to move the door sideways, in and out, or up and down until the gaps are even.", kind: "general", pose: "+y", tools: ["screwdriver"] },
    () => {},
  );
}

function basinSteps(b: PlanBuilder, s: ProductSpec, c: Cab, kind: BasinKind) {
  const Wb = s.size.w * 10, Db = s.size.d * 10, Hb = s.size.h * 10;
  const zB = c.zBack;
  const zc = zB + Db / 2;
  const rim = 50;
  const yRim = Hb - rim;
  const pieces: PartPiece[] =
    kind === "on"
      ? [
          { shape: "box", size: [Wb, rim, Db], pos: [0, rim / 2, 0] },
          { shape: "box", size: [Wb, 90, 40], pos: [0, -45, Db / 2 - 20] },
          { shape: "box", size: [c.W - 2 * T - 70, 110, Db - 200], pos: [0, -55, -Db / 2 + 30 + (Db - 200) / 2] },
        ]
      : [
          { shape: "box", size: [Wb, rim, Db], pos: [0, rim / 2, 0] },
          { shape: "box", size: [Wb - 120, Math.max(40, yRim - c.H - 30), Db - 100], pos: [0, -Math.max(40, yRim - c.H - 30) / 2, 0] },
        ];
  const { type, mid } = b.compound("Wash-basin", pieces, { material: "board" });
  const basin = b.place(type, [mid[0], yRim + mid[1], zc + mid[2]]);
  if (kind === "on") {
    b.step({ title: "Run silicone along the top edges", detail: "Along the top of both sides and the front rail. Silicone isn't included.", kind: "general", pose: "+y" }, () => {});
    b.step({ title: "Lower the basin on", detail: "Set it down straight onto the cabinet, pushed back against the wall.", kind: "join", pose: "+y", people: 2, warnings: ["two"] }, () => b.add(basin, [0, 260, 0]));
    b.step({ title: "Centre it and let it set", detail: "Check it overhangs the same on both sides. Leave the silicone a few hours before you load the basin.", kind: "general", pose: "+y", tools: ["tape"] }, () => {});
    b.step({ title: "Seal the joint at the wall", detail: "Run silicone along the back edge where the basin meets the wall.", kind: "general", pose: "+y" }, () => {});
  } else {
    const bx = [-140, 140];
    const by = Hb - 60;
    b.step({ title: "Mark the holes for the basin", detail: "Two marks 280 mm apart, 60 mm below where the top of the basin will be, centred over the cabinet and level.", kind: "anchor", pose: "+y", wall: true, tools: ["tape", "pencil", "level"], warnings: ["wall"] }, () => {});
    b.step(
      { title: "Screw in the basin bolts", detail: "Drill, plug and screw in two wall bolts with a spacer sleeve on each, leaving 15 mm standing out. Bolts and plugs aren't included: use ones made for your wall and a basin's weight.", kind: "anchor", pose: "+y", wall: true, tools: ["drill", "wrench"], warnings: ["wall"] },
      () => {
        b.stagger(0.15);
        for (const x of bx) b.fit(HW.plug, { at: [x, by, zB - 2], dir: [0, 0, -1] });
        b.then(0.05);
        for (const x of bx) b.fit(BASIN_BOLT, { at: [x, by, zB + 15], dir: [0, 0, -1] });
        b.then(0.05);
        for (const x of bx) b.fit(SLEEVE, { at: [x, by, zB], dir: [0, 0, -1], hole: false });
      },
    );
    b.step({ title: "Hang the basin on the bolts", detail: "Lift it together and push it back onto the two bolts.", kind: "join", pose: "+y", people: 2, warnings: ["two"] }, () => b.add(basin, [0, 0, 300]));
    b.step(
      { title: "Lock it with the keyhole plates", detail: "Push a plate into each pocket at the back of the basin over the bolt head, then tighten until the basin sits level and firm.", kind: "anchor", pose: "+y", tools: ["wrench", "level"] },
      () => {
        b.stagger(0.15);
        for (const x of bx) b.fit(BASIN_PLATE, { on: basin, at: [x, by, zB + 30], dir: [0, 0, -1], hole: false });
      },
    );
    b.step({ title: "Seal the joint at the wall", detail: "Run silicone along the back edge where the basin meets the wall. Silicone isn't included.", kind: "general", pose: "+y" }, () => {});
  }
  b.step({ title: "Fit the plug", detail: "Push the plug into the waste hole and turn its rod until it opens and closes.", kind: "general", pose: "+y" }, () => b.fit(WASTE, { on: basin, at: [0, yRim, zc + 20], dir: [0, -1, 0], hole: false }));
  const tap = b.place(b.part("Mixer tap", [40, 180, 40], { material: "metal", shape: "cyl" }), [0, Hb + 90, zB + 60]);
  b.step({ title: "Fit the tap", detail: "It comes with its own instructions. Fix it in the tap hole and connect its hoses to the water.", kind: "general", pose: "+y", tools: ["wrench"] }, () => b.add(tap, [0, 200, 0]));
  b.step(
    { title: "Fit the water trap", detail: "From its own box. Screw it to the waste under the basin and run the pipe to the drain in the wall. Get a plumber if you're unsure.", kind: "general", pose: "+y", tools: ["wrench"] },
    () => b.fit(TRAP, { on: basin, at: [0, yRim - 120, zc - 40], dir: [0, 1, 0], hole: false }),
  );
}

function modelOf(s: ProductSpec): { model: Model; basin?: BasinKind } | null {
  const slug = s.slug ?? "";
  if (/^nysjon-wash-basin-base-cabinet-w-2-doors/.test(slug)) return { model: "base" };
  if (/^nysjon-wash-basin-cabinet/.test(slug)) return { model: "wash" };
  if (/^nysjon-bjorkan-wash-basin-base-cabinet-w-2-doors/.test(slug)) return { model: "base", basin: "wall" };
  if (/^nysjon-bjorkan-wash-stnd-w-door/.test(slug)) return { model: "wash", basin: "on" };
  if (/^nysjon-high-cabinet/.test(slug)) return { model: "high" };
  if (/^nysjon-mirror-cabinet/.test(slug)) return { model: "mirror" };
  return null;
}

const family: Family = {
  names: ["NYSJÖN", "NYSJON"],
  build(b, s) {
    const m = modelOf(s);
    if (!m) return false;
    let c: Cab;
    if (m.model === "base" || m.model === "wash") {
      // the sets are this cabinet with a basin: the cabinet keeps its own size, against the wall behind the basin
      const H = m.model === "base" ? 650 : 830;
      const D = 320;
      const zBack = -Math.max(D, s.size.d * 10) / 2;
      c = sinkCab(m.model, 500, H, D, zBack);
    } else c = m.model === "high" ? highCab(s) : mirrorCab(s);
    buildCustom(b, { ...s, custom: { parts: c.parts, steps: c.steps } });
    doorSteps(b, c);
    if (m.basin) basinSteps(b, s, c, m.basin);
    return true;
  },
};
export default family;
