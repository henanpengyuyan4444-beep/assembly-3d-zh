import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * ÄMMARYD, read from the coffee table's and the side table's manuals (the two build alike). Cam bolts and dowels go
 * into the four legs on a rug, and the two long aprons are locked onto them with big cam wheels to make the front and
 * the back. The short aprons (and, on the side table, the shelf on its two rails) are pushed into the front upside
 * down and locked, then the back goes on. Cam bolts go into the underside of the top, the frame is laid on it, locked
 * with small cams and bolted down through the aprons. Plastic feet last, then it is turned over.
 */

function fx(kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix {
  return { kind, count: at.length, at, dir, on, ...o };
}

interface Stage {
  id: string;
  shown: { step: number; pos: Vec3; rot?: Vec3 }[]; // where it lies before it goes on
  at: number; // the step it reaches its place
  from?: Vec3;
}

/** Parts the recipe adds early (so fittings can go into them) lie loose on the floor until the step they really go on. */
function restage(b: PlanBuilder, recipe: CustomParams, stages: Stage[]) {
  stages.forEach((st, i) => {
    const p = recipe.parts.find((q) => q.id === st.id)!.pos;
    const it = b.items.find((x) => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - p[k]) < 0.5));
    if (!it || it.kind !== "part") return;
    const shown = st.shown.map((s) => ({ step: s.step, scene: "main", pos: s.pos, rot: s.rot ?? it.final.rot, delay: 0.15 + 0.08 * (i % 4) }));
    it.states = [...shown, { step: st.at, scene: "main", pos: it.final.pos, rot: it.final.rot, from: st.from, delay: 0.15 + 0.2 * (i % 3) }];
  });
}

function recipeOf(s: ProductSpec): { recipe: CustomParams; stages: Stage[] } {
  const shelf = /side/i.test(`${s.slug ?? ""} ${s.variant}`);
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const TT = 22, OV = 30, L = 45, AT = 18;
  const AH = shelf ? 80 : 90;
  const yU = H - TT;
  const xl = W / 2 - OV - L / 2, zl = D / 2 - OV - L / 2; // leg centres
  const xa = xl + L / 2 - AT / 2, za = zl + L / 2 - AT / 2; // aprons, flush with the legs' outer faces
  const yA = yU - AH / 2;
  const parts: CustomPart[] = [];
  const legs = ["LF0", "LF1", "LB0", "LB1"];
  const legPos = (id: string): Vec3 => [(id.endsWith("0") ? -1 : 1) * xl, yU / 2, (id[1] === "F" ? 1 : -1) * zl];
  for (const id of legs) parts.push({ id, name: "Leg", size: [L, yU, L], pos: legPos(id), material: "board" });
  parts.push({ id: "AF", name: "Long apron", size: [2 * (xl - L / 2), AH, AT], pos: [0, yA, za], material: "board" });
  parts.push({ id: "AB", name: "Long apron", size: [2 * (xl - L / 2), AH, AT], pos: [0, yA, -za], material: "board" });
  parts.push({ id: "C0", name: "Short apron", size: [AT, AH, 2 * (zl - L / 2)], pos: [-xa, yA, 0], material: "board" });
  parts.push({ id: "C1", name: "Short apron", size: [AT, AH, 2 * (zl - L / 2)], pos: [xa, yA, 0], material: "board" });
  const RH = 60, ST = 18, yR = 180;
  const yS = yR + RH / 2 + ST / 2;
  if (shelf) {
    parts.push({ id: "R0", name: "Shelf rail", size: [AT, RH, 2 * (zl - L / 2)], pos: [-xa, yR, 0], material: "board" });
    parts.push({ id: "R1", name: "Shelf rail", size: [AT, RH, 2 * (zl - L / 2)], pos: [xa, yR, 0], material: "board" });
    parts.push({ id: "S", name: "Shelf", size: [2 * (xl + L / 2), ST, 2 * (zl - L / 2)], pos: [0, yS, 0], material: "board" });
  }
  parts.push({ id: "T", name: "Table top", size: [W, TT, D], pos: [0, H - TT / 2, 0], material: "wood" });

  const xIn = xl - L / 2, zIn = zl - L / 2; // the legs' inner faces
  const sgn = (id: string) => ({ x: id.endsWith("0") ? -1 : 1, z: id[1] === "F" ? 1 : -1 });
  // each leg: a cam bolt and two dowels for its long apron, a cam bolt (and on the side table one more for the shelf rail) for the short one
  const legBolts = (id: string) => {
    const { x, z } = sgn(id);
    const pts: Vec3[] = [[x * xIn, yA, z * za], [x * xa, yA, z * zIn]];
    if (shelf) pts.push([x * xa, yR, z * zIn]);
    return fx("camScrew", pts.slice(0, 1), [x, 0, 0], id, { len: 30 });
  };
  const legBoltsZ = (id: string) => {
    const { x, z } = sgn(id);
    const pts: Vec3[] = [[x * xa, yA, z * zIn]];
    if (shelf) pts.push([x * xa, yR, z * zIn]);
    return fx("camScrew", pts, [0, 0, z], id, { len: 30 });
  };
  const legDowels = (id: string) => {
    const { x, z } = sgn(id);
    return fx("dowel", [-25, 25].map((dy): Vec3 => [x * xIn, yA + dy, z * za]), [x, 0, 0], id);
  };
  const CAM = { dia: 25, name: "Cam wheel" };
  const longCams = (id: "AF" | "AB") => {
    const z = id === "AF" ? 1 : -1;
    return fx("cam", [-1, 1].map((sx): Vec3 => [sx * (xIn - 35), yA, z * (za - AT / 2)]), [0, 0, z], id, CAM);
  };
  const crossCams = (ids: string[], sz: number) =>
    ids.map((id) => {
      const x = id.endsWith("0") ? -1 : 1;
      const y = id[0] === "R" ? yR : yA;
      return fx("cam", [[x * (xa - AT / 2), y, sz * (zIn - 35)]], [x, 0, 0], id, CAM);
    });
  const crossDowels = (ids: string[]) =>
    ids.flatMap((id) => {
      const x = id.endsWith("0") ? -1 : 1;
      return [-1, 1].map((sz) => fx("dowel", [-25, 25].map((dy): Vec3 => [x * xa, yA + dy, sz * zIn]), [0, 0, -sz], id));
    });
  const small: Vec3[] = shelf
    ? [[0, yU, za - AT / 2 - 14], [0, yU, -za + AT / 2 + 14], [-xa + AT / 2 + 14, yU, 0], [xa - AT / 2 - 14, yU, 0]]
    : [-1, 1].flatMap((sz) => [-1, 1].map((sx): Vec3 => [(sx * W) / 5, yU, sz * (za - AT / 2 - 14)]));
  const apronAt = (p: Vec3) => (Math.abs(p[0]) > 1 ? (p[0] < 0 ? "C0" : "C1") : p[2] > 0 ? "AF" : "AB");
  const smallCams = small.map((p) => {
    const host = apronAt(p);
    const dir: Vec3 = host[0] === "C" ? [Math.sign(p[0]), 0, 0] : [0, 0, Math.sign(p[2])];
    const at: Vec3 = host[0] === "C" ? [Math.sign(p[0]) * (xa - AT / 2), yU - 16, p[2]] : [p[0], yU - 16, Math.sign(p[2]) * (za - AT / 2)];
    return fx("cam", [at], dir, host, { dia: 15, name: "Small cam lock" });
  });
  const longBolts = [
    ...[-1, 1].flatMap((sz) => [-1, 1].map((sx): Vec3 => [sx * (xIn - 70), yU - AH, sz * za])),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xa, yU - AH, sz * (zIn - 70)])),
  ].map((p) => fx("bolt", [p], [0, 1, 0], apronAt(p), { len: 100, dia: 6, name: "Long bolt" }));

  const cross = shelf ? ["C0", "C1", "R0", "R1"] : ["C0", "C1"];
  const steps: CustomStep[] = [
    {
      title: "Screw the cam bolts into the legs",
      detail: shelf ? "Three in each leg, turned in until they stop. Lay the legs on a rug." : "Two in each leg, turned in until they stop. Lay the legs on a rug.",
      add: legs,
      fix: [...legs.map(legBolts), ...legs.map(legBoltsZ)],
      tools: ["screwdriver"],
      pose: "-z",
      warnings: ["floor"],
    },
    { title: "Tap the dowels into the legs", detail: "Two in each leg, next to the cam bolt for the long apron.", fix: legs.map(legDowels), tools: ["hammer"] },
    {
      title: "Press the cam wheels into the long aprons",
      detail: "One at each end, arrow pointing to the end. Check you have the long aprons, not the short ones.",
      add: ["AF", "AB"],
      fix: [longCams("AF"), longCams("AB")],
    },
    {
      title: "Join each long apron to two legs",
      detail: "Push the legs onto the apron's ends, then turn the cam wheels with the Allen key until they pull tight. That makes the front and the back.",
      tools: ["allen"],
    },
    { title: "Tap the dowels into the short aprons", detail: "Two in each end.", add: ["C0", "C1"], fix: crossDowels(["C0", "C1"]), tools: ["hammer"] },
    { title: "Press a cam wheel into one end of each", detail: "The ends that go into the front first.", fix: crossCams(["C0", "C1"], 1) },
    {
      title: "Push the short aprons into the front",
      detail: "With the front upside down, legs in the air. Lock both cam wheels with the Allen key.",
      pose: "-y",
      tools: ["allen"],
    },
  ];
  if (shelf) {
    steps.push(
      {
        title: "Bolt the two rails under the shelf",
        detail: "Lay the shelf face down and the rails along its short ends, the same distance in from each side. Don't overtighten the bolts.",
        add: ["S", "R0", "R1"],
        fix: [-1, 1].map((sx) => fx("bolt", [-1, 1].map((sz): Vec3 => [sx * xa, yR - RH / 2, sz * (zIn - 60)]), [0, 1, 0], sx < 0 ? "R0" : "R1", { len: 40, dia: 6, mate: "S", name: "Short bolt" })),
        tools: ["allen"],
      },
      { title: "Press a cam wheel into each rail", detail: "In the ends that go into the front legs.", fix: crossCams(["R0", "R1"], 1) },
      { title: "Push the shelf into the front", detail: "Its rails go onto the lowest cam bolts in the legs. Lock both cam wheels.", tools: ["allen"] },
    );
  }
  steps.push(
    { title: shelf ? "Press cam wheels into the free ends" : "Press cam wheels into the other ends", detail: shelf ? "Four of them: in the short aprons and the shelf rails." : "One in the free end of each short apron.", fix: crossCams(cross, -1) },
    { title: "Fit the back", detail: "Push its legs onto the free ends and lock every cam wheel with the Allen key.", tools: ["allen"], check: "square" },
    { title: "Screw the cam bolts into the top", detail: "Four of them, by hand, into the holes in its underside. Lay the top face down on a rug.", add: ["T"], fix: [fx("camScrew", small, [0, 1, 0], "T", { len: 24, dia: 6 })], warnings: ["floor"] },
    { title: "Lay the frame on the top", detail: "Upside down, so the cam bolts go up into the aprons." },
    { title: "Lock the small cams", detail: "One in each hole by a cam bolt, turned clockwise until it holds.", fix: smallCams, tools: ["screwdriver"] },
    {
      title: "Bolt the aprons to the top",
      detail: "Eight long bolts down through the aprons. Stop when they are snug: too tight and they come through the top.",
      fix: longBolts,
      tools: ["allen"],
      warnings: ["hand"],
    },
    { title: "Press a foot into each leg", detail: "Into the holes in the leg ends.", fix: [fx("glide", legs.map((id): Vec3 => [legPos(id)[0], 0, legPos(id)[2]]), [0, 1, 0], undefined, { name: "Foot", dia: 30 })] },
    { title: "Turn it the right way up", detail: "Lift it, don't drag it across the floor on its new feet.", pose: "+y" },
  );

  // where each part lies before it goes on: the back's legs and apron beside the front, the short pieces beside
  // them, and once the front is upside down, the back waiting behind it
  const n = (t: string) => steps.findIndex((x) => x.title === t);
  const upside = n("Push the short aprons into the front");
  const backOn = n("Fit the back");
  const shelfIn = n("Push the shelf into the front");
  const topOn = n("Lay the frame on the top");
  const shelfStep = steps.findIndex((x) => x.add?.includes("S"));
  const beside = (p: Vec3, dx: number, z: number): Vec3 => [p[0] + dx, p[1], z];
  const parts0 = Object.fromEntries(parts.map((p) => [p.id, p.pos]));
  const flatX: Vec3 = [0, Math.PI / 2, 0];
  const stages: Stage[] = [
    ...["LB0", "LB1"].map((id): Stage => ({
      id,
      shown: [{ step: 0, pos: beside(parts0[id], W + 200, zl) }, { step: upside, pos: [parts0[id][0], parts0[id][1], parts0[id][2] - 600] }],
      at: backOn,
      from: [0, 0, -300],
    })),
    { id: "AF", shown: [{ step: 2, pos: [0, yA - 260, za] }], at: 3, from: [0, -200, 0] },
    {
      id: "AB",
      shown: [{ step: 2, pos: [W + 200, yA - 260, za] }, { step: 3, pos: [W + 200, yA, za] }, { step: upside, pos: [0, yA, -za - 600] }],
      at: backOn,
      from: [0, 0, -300],
    },
    ...["C0", "C1"].map((id, i): Stage => ({ id, shown: [{ step: 4, pos: [0, -260 - i * 140, D / 2 - AT / 2], rot: flatX }], at: upside, from: [0, 300, 0] })),
    // the shelf and its rails are bolted together face down in front of the frame, then go in as one
    ...(shelf ? ["S", "R0", "R1"] : []).map((id): Stage => ({ id, shown: [{ step: shelfStep, pos: [parts0[id][0], parts0[id][1], parts0[id][2] + D + 300] }], at: shelfIn, from: [0, 0, 300] })),
    { id: "T", shown: [{ step: topOn - 1, pos: [0, H - TT / 2, D + 250] }], at: topOn, from: [0, 0, 300] },
  ];
  return { recipe: { parts, steps }, stages };
}

const family: Family = {
  names: ["ÄMMARYD", "AMMARYD"],
  build(b, s) {
    if (!/coffee|side/i.test(`${s.slug ?? ""} ${s.variant}`)) return false;
    const { recipe, stages } = recipeOf(s);
    buildCustom(b, { ...s, custom: recipe });
    restage(b, recipe, stages);
    return true;
  },
};
export default family;
