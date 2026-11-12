import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartItem, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * VITTERYD, read from the adjustable coffee table's manual. Two end frames first: cam bolts into the four legs,
 * dowels into the two end panels, legs onto the panels, cams, more cam bolts and the feet. Then the storage tray:
 * the bottom (with the cable hole) between the front and back aprons, on its back. One end frame goes on, the
 * lower shelf is built with its two rails and slid in, and the other end frame closes it, all lying on its back.
 * Upright, the last cams and the cable grommet go in. Inside, two short and two long lift arms are fixed to the end
 * panels with inserts and bolts, the cross bar joins the long arms, the two gas springs click on, and the top is
 * set on and fixed through the arms' brackets.
 */

const T = 18; // board
const CAM_BOLT = { len: 34, dia: 7 };

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

/** A round tube from a to b. */
function tube(a: Vec3, b: Vec3, dia: number): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))] };
}

function table(s: ProductSpec): CustomParams {
  // IKEA: 97 long, 59 deep with the top down (62 raised), 49 high with the top down; 7 cm free under the shelf
  const L = s.size.w * 10, H = 490, D = 590;
  const topT = 25, legT = 45, legH = H - topT;
  const cl = L - 50, cd = D - 30; // the carcass inside the top's overhang
  const lx = cl / 2 - legT / 2, lz = cd / 2 - legT / 2;
  const boxLo = legH - 230; // the end panels and the aprons are 23 cm deep
  const inX = lx - T / 2; // inner face of an end panel
  const az = cd / 2 - T / 2; // the aprons and rails, flush with the legs
  const shelfY = 83, railH = 50;
  const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ sx, sz, id: `LEG${sx}${sz}` })));
  const L_ = (sx: number) => (sx < 0 ? "L" : "R");
  const parts: CustomPart[] = [
    ...legs.map(({ sx, sz, id }): CustomPart => ({ id, name: "Leg", size: [legT, legH, legT], pos: [sx * lx, legH / 2, sz * lz], material: "wood" })),
    ...[-1, 1].map((sx): CustomPart => ({ id: `END${L_(sx)}`, name: "End panel", size: [T, legH - boxLo, cd - 2 * legT], pos: [sx * lx, (boxLo + legH) / 2, 0] })),
    ...[-1, 1].map((sz): CustomPart => ({ id: sz < 0 ? "BACK" : "FRONT", name: "Apron", size: [2 * inX, legH - boxLo, T], pos: [0, (boxLo + legH) / 2, sz * az] })),
    { id: "BOTTOM", name: "Storage bottom", size: [2 * inX, T, cd - 2 * T], pos: [0, boxLo + T / 2, 0] },
    { id: "SHELF", name: "Shelf", size: [2 * inX, T, cd - 2 * T], pos: [0, shelfY, 0] },
    ...[-1, 1].map((sz): CustomPart => ({ id: sz < 0 ? "RAIL_B" : "RAIL_F", name: "Shelf rail", size: [2 * inX, railH, T], pos: [0, shelfY - T / 2 + railH / 2 - 10, sz * az] })),
    { id: "GROMMET", name: "Cable grommet", size: [70, 8, 70], pos: [-inX + 110, boxLo + T + 4, -cd / 2 + 110], shape: "cyl", material: "board" },
  ];
  // the lift: on each end panel a short arm at the front and a long one at the back, folded down with the top closed
  const zF = 150, zB = -150, armY = legH - 70;
  const arm = (sx: number, z: number, long: boolean): CustomPart => {
    const x = sx * (inX - 5);
    const pieces: PartPiece[] = [
      { shape: "box", size: [8, long ? 110 : 80, 70], pos: [0, -20, 0] },
      { shape: "box", size: [8, 25, long ? 240 : 180], pos: [-sx * 8, 25, long ? 40 : -30] },
      { shape: "box", size: [50, 5, 60], pos: [-sx * 25, 67, long ? 140 : -100] },
    ];
    return { id: `ARM${long ? "B" : "F"}${L_(sx)}`, name: long ? "Long lift arm" : "Short lift arm", size: [60, 160, 300], pos: [x, armY, z], pieces, material: "metal" };
  };
  const arms = [-1, 1].flatMap((sx) => [arm(sx, zF, false), arm(sx, zB, true)]);
  parts.push(
    ...arms,
    { id: "BAR", name: "Cross bar", size: [2 * inX - 30, 16, 16], pos: [0, armY + 25, zB + 40], shape: "cyl", material: "metal" },
    ...[-1, 1].map((sx): CustomPart => ({
      id: `GAS${L_(sx)}`,
      name: "Gas spring",
      size: [24, 120, 240],
      pos: [sx * (inX - 40), boxLo + 120, 0],
      pieces: [tube([0, -50, -110], [0, 50, 110], 22)],
      material: "metal",
    })),
    { id: "TOP", name: "Table top", size: [L, topT, D], pos: [0, legH + topT / 2, 0] },
  );

  const cam = (at: Vec3[], dir: Vec3, on: string) => fx("cam", at, dir, on, { dia: 15 });
  const steps: CustomStep[] = [
    {
      title: "Screw the cam bolts into the legs",
      detail: "Lay the legs on a rug. Two in each leg, turned in until they stop.",
      fix: legs.flatMap(({ sx, sz, id }) => [
        fx("camScrew", [[sx * lx, (boxLo + legH) / 2, sz * (lz - legT / 2)]], [0, 0, sz], id, CAM_BOLT),
        fx("camScrew", [[sx * (lx - legT / 2), shelfY, sz * az]], [sx, 0, 0], id, CAM_BOLT),
      ]),
      tools: ["screwdriver"],
      pose: "+x",
      warnings: ["floor"],
      wait: legs.map((l) => l.id),
    },
    {
      title: "Tap the dowels into the end panels",
      detail: "Three in each short edge of both panels.",
      fix: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => fx("dowel", [boxLo + 50, (boxLo + legH) / 2, legH - 50].map((y): Vec3 => [sx * lx, y, sz * (lz - legT / 2)]), [0, 0, sz], `END${L_(sx)}`, { len: 30, dia: 8 }))),
      tools: ["hammer"],
      wait: ["ENDL", "ENDR"],
    },
    { title: "Push the legs onto the end panels", detail: "A leg on each edge of both panels, over the dowels, the cam bolts facing in.", add: [...legs.map((l) => l.id), "ENDL", "ENDR"] },
    {
      title: "Lock the end frames with cams",
      detail: "Four cams, two in each panel. Turn each one clockwise until it pulls the leg tight.",
      fix: [-1, 1].map((sx) => cam([-1, 1].map((sz): Vec3 => [sx * inX, (boxLo + legH) / 2, sz * (lz - legT / 2 - 30)]), [sx, 0, 0], `END${L_(sx)}`)),
      tools: ["screwdriver"],
    },
    {
      title: "Screw in the cam bolts for the tray",
      detail: "Three along the bottom edge of each end panel's inside.",
      fix: [-1, 1].map((sx) => fx("camScrew", [-150, 0, 150].map((z): Vec3 => [sx * inX, boxLo + T / 2, z]), [sx, 0, 0], `END${L_(sx)}`, CAM_BOLT)),
      tools: ["screwdriver"],
    },
    {
      title: "Press a foot into each leg",
      detail: "Into the hole in the bottom end of the leg, all the way in.",
      fix: legs.map(({ sx, sz, id }) => fx("glide", [[sx * lx, 0, sz * lz]], [0, 1, 0], id, { name: "Foot", dia: 30 })),
    },
    {
      title: "Screw the cam bolts into the aprons",
      detail: "Two in each apron, along the edge the bottom will sit on.",
      fix: [-1, 1].map((sz) => fx("camScrew", [-300, 300].map((x): Vec3 => [x, boxLo + T / 2, sz * (az - T / 2)]), [0, 0, sz], sz < 0 ? "BACK" : "FRONT", CAM_BOLT)),
      tools: ["screwdriver"],
      pose: "+z",
      wait: ["BACK", "FRONT"],
    },
    {
      title: "Tap a dowel into each end of the aprons",
      detail: "Four in all.",
      fix: [-1, 1].map((sz) => fx("dowel", [-1, 1].map((sx): Vec3 => [sx * inX, (boxLo + legH) / 2, sz * az]), [1, 0, 0], sz < 0 ? "BACK" : "FRONT", { len: 30, dia: 8 })),
      tools: ["hammer"],
    },
    {
      title: "Tap the dowels into the storage bottom",
      detail: "Four along each long edge. The cable hole goes at the back.",
      fix: [-1, 1].map((sz) => fx("dowel", [-300, -100, 100, 300].map((x): Vec3 => [x, boxLo + T / 2, sz * (az - T / 2)]), [0, 0, sz], "BOTTOM", { len: 30, dia: 8 })),
      tools: ["hammer"],
      wait: ["BOTTOM"],
    },
    { title: "Stand the bottom on the back apron", detail: "Lay the back apron flat and press the bottom down onto its dowels.", add: ["BACK", "BOTTOM"] },
    {
      title: "Lock it with two cams",
      detail: "Turn each one clockwise until it pulls the joint tight.",
      fix: [cam([-300, 300].map((x): Vec3 => [x, boxLo + T, -az + 40]), [0, -1, 0], "BOTTOM")],
      tools: ["screwdriver"],
    },
    { title: "Press the front apron on", detail: "Down onto the bottom's other edge.", add: ["FRONT"] },
    { title: "Lock the front apron", detail: "Two more cams.", fix: [cam([-300, 300].map((x): Vec3 => [x, boxLo + T, az - 40]), [0, -1, 0], "BOTTOM")], tools: ["screwdriver"] },
    {
      title: "Fit one end frame onto the tray",
      detail: "Lay the tray on its back and push the end frame onto the dowels and bolts.",
      add: legs.filter((l) => l.sx < 0).map((l) => l.id).concat("ENDL"),
    },
    { title: "Lock it with a cam", detail: "In the bottom, near the end frame.", fix: [cam([[-inX + 40, boxLo + T, 0]], [0, -1, 0], "BOTTOM")], tools: ["screwdriver"] },
    {
      title: "Tap the dowels into the shelf",
      detail: "Two in each short edge.",
      fix: [-1, 1].map((sx) => fx("dowel", [-150, 150].map((z): Vec3 => [sx * inX, shelfY, z]), [sx, 0, 0], "SHELF", { len: 30, dia: 8 })),
      tools: ["hammer"],
      wait: ["SHELF"],
    },
    {
      title: "Screw the cam bolts into the shelf rails",
      detail: "Three in each rail, on the side that meets the shelf.",
      fix: [-1, 1].map((sz) => fx("camScrew", [-300, 0, 300].map((x): Vec3 => [x, shelfY, sz * (az - T / 2)]), [0, 0, sz], sz < 0 ? "RAIL_B" : "RAIL_F", CAM_BOLT)),
      tools: ["screwdriver"],
      wait: ["RAIL_B", "RAIL_F"],
    },
    { title: "Push the rails onto the shelf", detail: "One on each long edge, bolts into the holes.", wait: ["SHELF", "RAIL_B", "RAIL_F"] },
    {
      title: "Lock the rails with cams",
      detail: "Six cams in the underside of the shelf.",
      fix: [-1, 1].map((sz) => cam([-300, 0, 300].map((x): Vec3 => [x, shelfY - T / 2, sz * (az - 40)]), [0, 1, 0], "SHELF")),
      tools: ["screwdriver"],
      wait: ["SHELF", "RAIL_B", "RAIL_F"],
    },
    {
      title: "Tap the dowels into the rails' ends",
      detail: "Two in each end of both rails.",
      fix: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => fx("dowel", [shelfY - 10, shelfY + 20].map((y): Vec3 => [sx * inX, y, sz * az]), [sx, 0, 0], sz < 0 ? "RAIL_B" : "RAIL_F", { len: 30, dia: 8 }))),
      tools: ["hammer"],
    },
    { title: "Slide the shelf into the end frame", detail: "Its dowels go into the legs, at the open end of the frame.", add: ["SHELF", "RAIL_B", "RAIL_F"], from: { SHELF: [400, 0, 0], RAIL_B: [400, 0, 0], RAIL_F: [400, 0, 0] } },
    {
      title: "Lock the shelf to the legs",
      detail: "One cam in each rail at that end.",
      fix: [-1, 1].map((sz) => cam([[-inX + 30, shelfY, sz * (az - T / 2)]], [0, 0, sz], sz < 0 ? "RAIL_B" : "RAIL_F")),
      tools: ["screwdriver"],
    },
    { title: "Push on the other end frame", detail: "Over all the dowels and bolts at the open end.", add: legs.filter((l) => l.sx > 0).map((l) => l.id).concat("ENDR") },
    {
      title: "Lock the end frame",
      detail: "Three cams: one in each shelf rail and one in the bottom.",
      fix: [cam([-1, 1].map((sz): Vec3 => [inX - 30, shelfY, sz * (az - T / 2)]), [0, 0, 1], "RAIL_F"), cam([[inX - 40, boxLo + T, 0]], [0, -1, 0], "BOTTOM")],
      tools: ["screwdriver"],
    },
    {
      title: "Stand it up and turn the last cams",
      detail: "Four cams in the aprons, at the end frames.",
      fix: [-1, 1].map((sz) => cam([-1, 1].map((sx): Vec3 => [sx * (inX - 30), legH - 60, sz * (az - T / 2)]), [0, 0, sz], sz < 0 ? "BACK" : "FRONT")),
      tools: ["screwdriver"],
      pose: "+y",
    },
    { title: "Fit the cable grommet", detail: "Press the ring into the hole in the bottom and lay the lid in it, the slot toward the back.", add: ["GROMMET"] },
    {
      title: "Hang the short lift arms at the front",
      detail: "Turn the table so the front faces you. The short arms go on the end panels' inside, toward the front.",
      add: arms.filter((a) => a.id.startsWith("ARMF")).map((a) => a.id),
    },
    {
      title: "Fix the short arms",
      detail: "Two inserts into each end panel through the arm's plate, then a bolt into each insert.",
      fix: [-1, 1].flatMap((sx) => {
        const at = [armY - 45, armY + 5].map((y): Vec3 => [sx * inX, y, zF]);
        return [fx("nut", at, [sx, 0, 0], `END${L_(sx)}`, { name: "Threaded insert", dia: 10 }), fx("bolt", at, [sx, 0, 0], `ARMF${L_(sx)}`, { len: 15, dia: 6 })];
      }),
      tools: ["allen"],
    },
    { title: "Hang the long lift arms at the back", detail: "The two arms with the long bent plates, one on each end panel.", add: arms.filter((a) => a.id.startsWith("ARMB")).map((a) => a.id) },
    {
      title: "Fix the long arms",
      detail: "Two inserts and two bolts again on each side.",
      fix: [-1, 1].flatMap((sx) => {
        const at = [armY - 50, armY + 10].map((y): Vec3 => [sx * inX, y, zB]);
        return [fx("nut", at, [sx, 0, 0], `END${L_(sx)}`, { name: "Threaded insert", dia: 10 }), fx("bolt", at, [sx, 0, 0], `ARMB${L_(sx)}`, { len: 15, dia: 6 })];
      }),
      tools: ["allen"],
    },
    {
      title: "Screw the long plates to the end panels",
      detail: "Two screws in the lower end of each long plate.",
      fix: [-1, 1].map((sx) => fx("screw", [zB - 25, zB + 25].map((z): Vec3 => [sx * inX, armY - 65, z]), [sx, 0, 0], `ARMB${L_(sx)}`, { len: 12, dia: 4 })),
      tools: ["screwdriver"],
    },
    {
      title: "Bolt the cross bar between the long arms",
      detail: "A bolt and a washer at each corner of its end plates, two at each end.",
      fix: [-1, 1].flatMap((sx) => {
        const at = [zB + 25, zB + 55].map((z): Vec3 => [sx * (inX - 15), armY + 25, z]);
        return [fx("bolt", at, [sx, 0, 0], "BAR", { len: 10, dia: 6 }), fx("washer", at, [sx, 0, 0], "BAR", { dia: 6 })];
      }),
      add: ["BAR"],
      tools: ["allen"],
    },
    { title: "Fold the arms down", detail: "Press the arms down toward the back until they rest on the cross bar side." },
    {
      title: "Click the gas springs on",
      detail: "Thin end up, each end pressed onto its ball until it clicks. Hold the arms up while you do it.",
      add: ["GASL", "GASR"],
      warnings: ["hand"],
    },
    {
      title: "Lay the top on and fix it with one screw",
      detail: "Its front edge toward the short arms. One screw through a front bracket holds it in place.",
      add: ["TOP"],
      fix: [fx("screw", [[-(inX - 30), legH, zF - 100]], [0, 1, 0], "ARMFL", { len: 12, dia: 4, mate: "TOP" })],
      tools: ["screwdriver"],
    },
    {
      title: "Fix the top through the brackets",
      detail: "Raise the top. Seven inserts into its underside through the brackets, a bolt in each.",
      fix: (() => {
        const pts: Vec3[] = [-1, 1].flatMap((sx) => [zF - 100, zB + 140].flatMap((z) => [-15, 15].map((dz): Vec3 => [sx * (inX - 30), legH, z + dz]))).slice(1);
        return [fx("nut", pts, [0, 1, 0], "TOP", { name: "Threaded insert", dia: 10 }), fx("bolt", pts, [0, 1, 0], "TOP", { len: 15, dia: 6 })];
      })(),
      tools: ["allen"],
    },
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
  names: ["VITTERYD"],
  build(b, s) {
    if (!/coffee table/i.test(`${s.variant} ${s.slug ?? ""}`.replace(/-/g, " "))) return false;
    const r = table(s);
    buildCustom(b, { ...s, custom: r });
    // the two end frames are built first and wait aside until the tray and the shelf are ready for them
    const idx = (re: RegExp) => r.steps.findIndex((x) => re.test(x.title));
    const end = (sx: number) => [`LEG${sx}-1`, `LEG${sx}1`, sx < 0 ? "ENDL" : "ENDR"];
    const until = idx(/cam bolts into the aprons/);
    apart(b, r, end(-1), "ends", 0, until, idx(/one end frame onto the tray/), [-500, 0, 0]);
    apart(b, r, end(1), "ends", 0, until, idx(/other end frame/), [500, 0, 0]);
    return true;
  },
};
export default family;
