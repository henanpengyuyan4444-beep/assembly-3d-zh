import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * STRANDMON, read from the wing chair's and the footstool's manuals.
 * The wing chair comes as four padded parts: the seat, the tall back and two sides (arm and wing in one). Two threaded
 * rods go into the back of the seat, the back drops onto them and is nutted on with the box spanner. Lying on its
 * back, the chair gets its two front and two splayed back legs, each over a big washer. A hook bracket is screwed
 * inside each side, the side hangs on the back and is pulled tight to the seat with two bolts from underneath.
 * Felt pads go under the legs and the loose seat cushion goes in last. The footstool is one padded box: legs over
 * washers while it lies upside down, felt pads, then the lid with its four bumpers sits on top.
 */

type Kind = "chair" | "chairFoot" | "stool";
function kindOf(s: ProductSpec): Kind | null {
  const t = `${s.slug ?? ""} ${s.variant}`.toLowerCase();
  if (/wing.chair/.test(t)) return /footstool/.test(t) ? "chairFoot" : "chair";
  if (/ottoman|footstool/.test(t)) return "stool";
  return null;
}

function fx(kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix {
  return { kind, count: at.length, at, dir, on, ...o };
}
const BIG_WASHER = { name: "Large washer", len: 3, dia: 40 };

// ---------- the wing chair ----------

function chair(s: ProductSpec): { parts: CustomPart[]; steps: CustomStep[]; sides: string[] } {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const xo = W / 2; // outside of the arms
  const xs = 250; // seat and back, half width
  const legH = 150;
  const zF = D / 2 - 30; // front of the seat
  const seatTop = 360;
  const parts: CustomPart[] = [];
  parts.push({ id: "SEAT", name: "Seat", size: [2 * xs, seatTop - legH, zF - 10 + 140], pos: [0, (legH + seatTop) / 2, (zF - 10 - 140) / 2], material: "soft" });
  parts.push({ id: "CUSH", name: "Seat cushion", size: [2 * xs - 6, 110, zF + 130], pos: [0, seatTop + 55, (zF - 130) / 2], material: "soft" });
  // the back: a straight foot behind the seat, then the tall part leaning back, with buttons across it
  const lean = 0.22;
  const upY0 = 460, upH = H - upY0, upC: Vec3 = [0, upY0 + upH / 2, -235];
  const backC: Vec3 = [0, (legH + H) / 2, -235];
  const rel = (p: Vec3): Vec3 => [p[0] - backC[0], p[1] - backC[1], p[2] - backC[2]];
  const bY = upY0 + upH * 0.55;
  const bZ = upC[2] + 85 + (bY - upC[1]) * Math.tan(-lean) + 4;
  const backPieces: PartPiece[] = [
    { shape: "box", size: [2 * xs, upY0 - legH + 10, 170], pos: rel([0, (legH + upY0 + 10) / 2, -225]) },
    { shape: "box", size: [2 * xs, upH, 170], pos: rel(upC), rot: [-lean, 0, 0] },
    ...[-2, -1, 0, 1, 2].map((k): PartPiece => ({ shape: "cyl", size: [22, 10, 22], pos: rel([k * 90, bY, bZ]), rot: [Math.PI / 2 - lean, 0, 0] })),
  ];
  parts.push({ id: "BACK", name: "Back", size: [2 * xs, H - legH, 300], pos: backC, pieces: backPieces, material: "soft" });
  // each side: a panel along the seat, the rolled arm on top and the wing rising behind it
  const sideC = (sx: number): Vec3 => [sx * (xs + (xo - xs) / 2), (legH + H - 20) / 2, (zF + 20 - 440) / 2];
  const sidePieces = (sx: number): PartPiece[] => {
    const c = sideC(sx);
    const r = (p: Vec3): Vec3 => [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    return [
      { shape: "box", size: [80, 470, zF + 300], pos: r([sx * (xs + 45), legH + 235, (zF - 300) / 2]) },
      { shape: "cyl", size: [150, zF + 320, 150], pos: r([sx * (xo - 80), 610, (zF + 20 - 300) / 2]), rot: [Math.PI / 2, 0, 0] },
      { shape: "box", size: [90, H - 20 - 560, 320], pos: r([sx * (xs + 95), (560 + H - 20) / 2, -280]), rot: [0, 0, -sx * 0.1] },
      { shape: "cyl", size: [110, 320, 110], pos: r([sx * (xs + 120), H - 70, -280]), rot: [Math.PI / 2, 0, 0] },
    ];
  };
  const sideIds = ["SIDE_R", "SIDE_L"];
  for (const [i, sx] of [1, -1].entries()) parts.push({ id: sideIds[i], name: "Side", size: [xo - xs, H - 20 - legH, zF + 20 + 440], pos: sideC(sx), pieces: sidePieces(sx), material: "soft" });
  const legs = [
    { id: "LF0", sx: -1, z: zF - 70, front: true },
    { id: "LF1", sx: 1, z: zF - 70, front: true },
    { id: "LB0", sx: -1, z: -90, front: false },
    { id: "LB1", sx: 1, z: -90, front: false },
  ];
  for (const g of legs) {
    const splay = g.front ? 0.06 : 0.2;
    parts.push({ id: g.id, name: g.front ? "Front leg" : "Back leg", size: [44, legH + 8, 44], pos: [g.sx * (xs - 40), legH / 2, g.z - (g.front ? -1 : 1) * Math.sin(splay) * legH * 0.5], shape: "cyl", rot: [g.front ? -splay : splay, 0, 0], material: "wood" });
  }

  const rods = [-150, 150].map((x): Vec3 => [x, 260, -140]);
  const legAt = (g: (typeof legs)[number]): Vec3 => [g.sx * (xs - 40), legH, g.z];
  const footAt = (g: (typeof legs)[number]): Vec3 => {
    const p = parts.find((q) => q.id === g.id)!;
    return [p.pos[0], 0, p.pos[2] + (g.front ? 1 : -1) * Math.sin(g.front ? 0.06 : 0.2) * legH * 0.5];
  };
  const boltPts = (sx: number) => [-20, zF - 160].map((z): Vec3 => [sx * xs, legH + 60, z]);
  const hookAt = (sx: number): Vec3 => [sx * (xs + 5), 520, -150];
  const sideSteps = (sx: number, id: string, first: boolean): CustomStep[] => [
    {
      title: first ? "Hang a side on the back" : "Hang the other side on the back",
      detail: "Stand the chair up. Lift the side in from the outside so its bracket hooks over the edge of the back's frame.",
      add: [id],
      from: { [id]: [sx * 300, 120, 0] },
      pose: "+y",
    },
    { title: "Press the side down", detail: "Push down on the top of the arm until it sits tight against the seat all the way along." },
    {
      title: "Turn the bolts in by hand",
      detail: "Lay the chair on its back. Two bolts with washers go up through the seat frame into the side: start them by hand so they don't cross-thread.",
      fix: [fx("washer", boltPts(sx), [sx, 0, 0], "SEAT"), fx("bolt", boltPts(sx).map((p): Vec3 => [p[0] - sx * 2, p[1], p[2]]), [sx, 0, 0], "SEAT", { len: 100, dia: 8, mate: id })],
      pose: "+z",
    },
    { title: "Tighten them with the box spanner", detail: "Firmly, until the side can't move.", tools: ["wrench"] },
  ];
  const steps: CustomStep[] = [
    {
      title: "Screw the two rods into the back of the seat",
      detail: "Stand the seat on a rug. Turn the threaded rods in by hand until they stop.",
      add: ["SEAT"],
      fix: [fx("stud", rods, [0, 0, 1], "SEAT", { name: "Threaded rod", len: 60, dia: 8 })],
      warnings: ["floor"],
    },
    { title: "Lower the back onto the rods", detail: "From above, so both rods go through the holes in the bottom of its frame.", add: ["BACK"], from: { BACK: [0, 300, -60] } },
    {
      title: "Nut the back on",
      detail: "A washer and a nut on each rod, tightened with the box spanner.",
      fix: [fx("washer", rods.map((p): Vec3 => [p[0], p[1], -310]), [0, 0, 1], "BACK"), fx("nut", rods.map((p): Vec3 => [p[0], p[1], -312]), [0, 0, 1], "BACK")],
      tools: ["wrench"],
    },
    {
      title: "Screw in the front legs",
      detail: "Tip the chair onto its back. A big washer on each leg bolt, then turn the legs in by hand. The straighter legs go at the front.",
      add: ["LF0", "LF1"],
      fix: [fx("washer", legs.filter((g) => g.front).map(legAt), [0, 1, 0], "SEAT", BIG_WASHER)],
      pose: "+z",
    },
    { title: "Screw in the back legs", detail: "The same way. They lean outwards to the back.", add: ["LB0", "LB1"], fix: [fx("washer", legs.filter((g) => !g.front).map(legAt), [0, 1, 0], "SEAT", BIG_WASHER)] },
    {
      title: "Screw a bracket inside each side",
      detail: "Stand the chair up. Lay the sides down, inside up, and screw a hook bracket into the holes near the back of each.",
      fix: [1, -1].flatMap((sx, i) => [fx("angle", [hookAt(sx)], [sx, 0, 0], sideIds[i], { name: "Hook bracket" }), fx("screw", [[hookAt(sx)[0], 500, -150]], [sx, 0, 0], sideIds[i], { len: 16, dia: 5 })]),
      tools: ["screwdriver"],
      pose: "+y",
    },
    ...sideSteps(1, "SIDE_R", true),
    ...sideSteps(-1, "SIDE_L", false),
    { title: "Stick felt pads under the legs", detail: "While it lies on its back, one on the end of each leg.", fix: [fx("glide", legs.map(footAt), [0, 1, 0])] },
    { title: "Stand it up and put the seat cushion in", detail: "Push it in until it meets the back. Plump the back and the arms with your hands to shape them.", add: ["CUSH"], pose: "+y" },
  ];
  return { parts, steps, sides: sideIds };
}

// ---------- the footstool ----------

function stool(s: ProductSpec, z0 = 0, idp = ""): { parts: CustomPart[]; steps: CustomStep[] } {
  const W = 600, D = 400, H = 440;
  void s;
  const legH = 100, lidH = 70;
  const id = (k: string) => idp + k;
  const parts: CustomPart[] = [
    { id: id("BOX"), name: "Footstool box", size: [W, H - lidH - legH, D], pos: [0, (legH + H - lidH) / 2, z0], material: "soft" },
    { id: id("LID"), name: "Padded lid", size: [W + 10, lidH, D + 10], pos: [0, H - lidH / 2, z0], material: "soft" },
  ];
  const legPts = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (W / 2 - 60), legH, z0 + sz * (D / 2 - 60)]));
  legPts.forEach((p, k) => parts.push({ id: id(`L${k}`), name: "Footstool leg", size: [40, legH, 40], pos: [p[0], legH / 2, p[2]], shape: "cyl", material: "wood" }));
  const steps: CustomStep[] = [
    {
      title: "Screw in the footstool's legs",
      detail: "Lay the box upside down on a rug. A washer on each leg bolt, then turn the legs in by hand.",
      add: [id("BOX"), ...legPts.map((_, k) => id(`L${k}`))],
      fix: [fx("washer", legPts, [0, 1, 0], id("BOX"), BIG_WASHER)],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Stick felt pads under its legs", detail: "One on the end of each.", fix: [fx("glide", legPts.map((p): Vec3 => [p[0], 0, p[2]]), [0, 1, 0])] },
    {
      title: "Turn it over and put the lid on",
      detail: "Press the four bumpers into the corners under the lid, then lay it on the box.",
      add: [id("LID")],
      fix: [fx("clip", legPts.map((p): Vec3 => [p[0], H - lidH, p[2]]), [0, 1, 0], id("LID"), { name: "Lid bumper" })],
      pose: "+y",
    },
  ];
  return { parts, steps };
}

// ---------- building, with the sides laid on the floor while their brackets go on ----------

function buildChair(b: PlanBuilder, s: ProductSpec, withStool: boolean) {
  const c = chair(s);
  const recipe: CustomParams = { parts: [...c.parts], steps: [...c.steps] };
  if (withStool) {
    const f = stool(s, s.size.d * 5 + 450, "F_");
    recipe.parts.push(...f.parts);
    recipe.steps.push(...f.steps);
  }
  const bracketStep = recipe.steps.findIndex((x) => /bracket inside each side/.test(x.title));
  const boltStep = recipe.steps.findIndex((x) => /bolts in by hand/.test(x.title));
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const lay = c.sides.map((id, i) => {
    const p = recipe.parts.find((q) => q.id === id)!;
    // on its outside face, beside the chair
    const sx = i ? -1 : 1;
    return { id, pos: [sx * (W / 2 + 120 + p.size[1] / 2), p.size[0] / 2, D / 2 + 100] as Vec3, rot: [0, 0, sx * (Math.PI / 2)] as Vec3 };
  });
  // while the chair lies on its back, the loose side lies flat beside it
  const layBack = [{ id: c.sides[1], pos: [-W / 2 - 500, H / 2, -360] as Vec3, rot: [0, Math.PI / 2, 0] as Vec3 }];
  const stages: Record<number, typeof lay> = { [bracketStep]: lay, [boltStep]: layBack };
  const keyOf = (id: string) => {
    const p = recipe.parts.find((q) => q.id === id)!.pos;
    return b.items.find((it) => it.kind === "part" && it.final.pos.every((v, i) => Math.abs(v - p[i]) < 0.5))?.key;
  };
  const step = b.step.bind(b);
  // the footstool is built on its own, away from the chair
  b.step = (def, body) =>
    step(b.steps.length >= c.steps.length ? { ...def, scene: "stool" } : def, () => {
      const list = stages[b.steps.length - 1];
      if (list) {
        b.stagger(0.15);
        for (const g of list) {
          const k = keyOf(g.id);
          if (k) b.stage(k, g.pos, g.rot, [0, 200, 0]);
        }
        b.then(0.15);
      }
      body();
    });
  try {
    buildCustom(b, { ...s, custom: recipe });
  } finally {
    b.step = step;
  }
}

const family: Family = {
  names: ["STRANDMON"],
  build(b, s) {
    const k = kindOf(s);
    if (k === "chair" || k === "chairFoot") {
      buildChair(b, s, k === "chairFoot");
      return true;
    }
    return false;
  },
  recipe(s) {
    if (kindOf(s) !== "stool") return null;
    return stool(s);
  },
};
export default family;
