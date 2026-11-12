import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * ÄLVDALEN, read from the sofa-bed's and the sofa-bed with chaise longue's manuals. The seat section (bed base with
 * the fold-out seat on top) gets its legs and pads upside down, is turned over, and two people push the backrest onto
 * it and bolt its brackets on. On the chaise version the chaise is built standing on its back end: threaded rods in
 * the back block, the chaise frame lowered onto them and nutted, legs in; then the sofa is laid on its back beside it,
 * the two are joined with two angle brackets, and the whole sofa is stood up. Back cushions last.
 */

function fx(kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix {
  return { kind, count: at.length, at, dir, on, ...o };
}

const LEG = 100, BASE = 180, TOP = 140; // legs, bed base, fold-out seat
const BACK = 120; // backrest panel, front to back
const ySeat = LEG + BASE + TOP;

/** A seat section: the bed base and the fold-out seat lying on it. */
function section(id: string, name: string, w: number, d: number, x: number, z0: number): CustomPart {
  const h = BASE + TOP;
  const pieces: PartPiece[] = [
    { shape: "box", size: [w - 20, BASE, d - 20], pos: [0, -h / 2 + BASE / 2, -10], material: "soft" },
    { shape: "box", size: [w, TOP, d], pos: [0, h / 2 - TOP / 2, 0], material: "soft" },
  ];
  return { id, name, size: [w, h, d], pos: [x, LEG + h / 2, z0 + d / 2], pieces, material: "soft" };
}

function legsUnder(prefix: string, x0: number, x1: number, z0: number, z1: number, mid: boolean): CustomPart[] {
  const xs = mid ? [x0 + 70, (x0 + x1) / 2, x1 - 70] : [x0 + 70, x1 - 70];
  const out: CustomPart[] = [];
  for (const z of [z0 + 70, z1 - 90]) for (const x of xs) out.push({ id: `${prefix}${out.length}`, name: "Leg", size: [45, LEG, 45], pos: [x, LEG / 2, z], shape: "cyl", material: "wood" });
  return out;
}

const glides = (legs: CustomPart[]) => fx("glide", legs.map((l): Vec3 => [l.pos[0], 0, l.pos[2]]), [0, 1, 0], undefined, { dia: 40 });

function recipeOf(s: ProductSpec): { recipe: CustomParams; chaise?: { ids: string[]; at: number; xc: number } } {
  const chaise = !!s.sofa?.chaise || /chaise/i.test(`${s.slug ?? ""} ${s.variant}`);
  const W = s.size.w * 10, H = s.size.h * 10;
  const Dl = chaise ? s.size.d * 10 : 0; // the chaise's length
  const D = 820; // the sofa's depth
  const zb = -D / 2; // back
  const zs = zb + BACK; // back of the seat section
  const CW = chaise ? 680 : 0; // the chaise's width
  const sx0 = -W / 2, sx1 = W / 2 - CW; // the sofa section
  const parts: CustomPart[] = [section("SEC", "Seat section", sx1 - sx0, D - BACK, (sx0 + sx1) / 2, zs)];
  const legs = legsUnder("L", sx0, sx1, zs, D / 2, true);
  parts.push(...legs);
  parts.push({ id: "BK", name: "Backrest", size: [sx1 - sx0, H - 60 - LEG, BACK], pos: [(sx0 + sx1) / 2, LEG + (H - 60 - LEG) / 2, zb + BACK / 2], material: "soft" });
  const cx0 = sx1, cx1 = W / 2, xc = (cx0 + cx1) / 2;
  const CB = 180; // the chaise's back block
  let cLegs: CustomPart[] = [];
  if (chaise) {
    parts.push({ id: "CB", name: "Chaise back", size: [CW, H - 60 - LEG, CB], pos: [xc, LEG + (H - 60 - LEG) / 2, zb + CB / 2], material: "soft" });
    parts.push(section("CH", "Chaise longue", CW, Dl - CB, xc, zb + CB));
    cLegs = legsUnder("C", cx0, cx1, zb + CB, zb + Dl, false);
    parts.push(...cLegs);
  }
  // back cushions: two on the sofa and one on the chaise, or three along the sofa
  const nC = 3;
  const cw = chaise ? (sx1 - sx0) / 2 - 20 : (sx1 - sx0) / nC - 20;
  const cushX = chaise ? [sx0 + (sx1 - sx0) / 4, sx0 + (3 * (sx1 - sx0)) / 4, xc] : [0, 1, 2].map((i) => sx0 + ((sx1 - sx0) * (i + 0.5)) / nC);
  cushX.forEach((x, i) => {
    const onChaise = chaise && i === 2;
    const z = (onChaise ? zb + CB : zs) + 80;
    parts.push({ id: `K${i}`, name: "Back cushion", size: [onChaise ? CW - 40 : cw, H - ySeat - 10, 150], pos: [x, (ySeat + H) / 2 - 5, z], rot: [-0.14, 0, 0], material: "soft" });
  });

  const xe = (sx1 - sx0) / 2 - 50;
  const steps: CustomStep[] = [
    {
      title: "Screw the legs into the seat section",
      detail: "Lay it upside down on its packaging, then turn each leg in by hand until it's tight.",
      add: ["SEC", ...legs.map((l) => l.id)],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Stick a pad under each leg", detail: "Peel the pads off their sheet and press one onto the end of every leg.", fix: [glides(legs)] },
    { title: "Turn it the right way up", detail: "Lift it over, don't drag it on the new pads.", pose: "+y" },
    {
      title: "Bolt the backrest on together",
      detail: "One of you holds the backrest against the back of the seat section while the other bolts its two brackets on, two bolts each.",
      add: ["BK"],
      from: { BK: [0, 0, -400] },
      fix: [-1, 1].map((sx) =>
        fx("bolt", [170, 250].map((y): Vec3 => [(sx0 + sx1) / 2 + sx * xe, y, zs]), [0, 0, 1], "BK", { len: 35, dia: 6, mate: "SEC" }),
      ),
      tools: ["allen"],
      people: 2,
      warnings: ["two"],
    },
  ];
  let at = -1;
  if (chaise) {
    const yR = LEG + 210;
    const rods = [-1, 1].map((k): Vec3 => [xc + k * 160, yR, zb + CB]);
    steps.push(
      {
        title: "Screw the threaded rods into the chaise back",
        detail: "Lay the back block flat on its packaging and turn both rods in by hand until they stop.",
        add: ["CB"],
        fix: [fx("stud", rods, [0, 0, -1], "CB", { len: 80, dia: 8, name: "Threaded rod" })],
        warnings: ["floor"],
      },
      {
        title: "Lower the chaise onto the rods together",
        detail: "Stand the chaise on its back end, underside towards you, and let both rods come through the holes in its frame.",
        add: ["CH"],
        people: 2,
        warnings: ["two"],
      },
      { title: "Tighten the wing nuts", detail: "One on each rod, inside the frame, turned by hand until it's tight.", fix: [fx("nut", rods.map((p): Vec3 => [p[0], p[1], p[2] + 30]), [0, 0, -1], "CH", { dia: 8, name: "Wing nut" })] },
      { title: "Screw the legs into the chaise", detail: "Four legs, each with a pad stuck on its end.", add: cLegs.map((l) => l.id), fix: [glides(cLegs)] },
      {
        title: "Lay the sofa on its back next to the chaise",
        detail: "Two of you tip it over onto its backrest, legs towards the chaise, and push the two sides together.",
        pose: "+z",
        people: 2,
        warnings: ["two", "floor"],
      },
    );
    at = steps.length - 1;
    const yJ = LEG + 60;
    const zJ = [zs + 120, D / 2 - 120];
    steps.push({
      title: "Join them with the angle brackets",
      detail: "One bracket near each end of the joint: a bolt with the Allen key into the sofa, a washer and a screw into the chaise.",
      fix: [
        fx("angle", zJ.map((z): Vec3 => [sx1, yJ, z]), [0, 1, 0], "SEC", { len: 70, dia: 40, name: "Angle bracket" }),
        fx("bolt", zJ.map((z): Vec3 => [sx1 - 25, yJ, z]), [0, 1, 0], "SEC", { len: 20, dia: 6 }),
        fx("washer", zJ.map((z): Vec3 => [sx1 + 25, yJ, z]), [0, 1, 0], "CH", { dia: 14 }),
        fx("screw", zJ.map((z): Vec3 => [sx1 + 25, yJ - 1, z]), [0, 1, 0], "CH", { len: 30, dia: 5 }),
      ],
      tools: ["allen"],
    });
    steps.push({ title: "Stand the sofa up together", detail: "Tip it forward onto its legs in one go, one of you at each end.", pose: "+y", people: 2, warnings: ["two"] });
  }
  steps.push(
    { title: "Put the back cushions on", detail: chaise ? "Two along the sofa's backrest and one on the chaise." : "Three in a row along the backrest.", add: parts.filter((p) => p.id.startsWith("K")).map((p) => p.id) },
    {
      title: "Fold it out into a bed",
      detail: "Take the back cushions off, lift the front of the seat and fold it forward onto the floor side. Fold it back the same way.",
    },
  );
  return { recipe: { parts, steps }, chaise: chaise ? { ids: ["CB", "CH", ...cLegs.map((l) => l.id)], at, xc } : undefined };
}

/** The chaise stands on its back end beside the sofa while it is built, then is laid down against it. */
function standChaise(b: PlanBuilder, recipe: CustomParams, ids: string[], at: number, xc: number, D: number) {
  const zb = -D / 2;
  const c: Vec3 = [xc, LEG, zb], o: Vec3 = [xc + 900, 0, 260];
  for (const id of ids) {
    const p = recipe.parts.find((q) => q.id === id)!.pos;
    const it = b.items.find((x) => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - p[k]) < 0.5));
    if (!it || it.kind !== "part") continue;
    const r: Vec3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const pos: Vec3 = [r[0] + o[0], r[2] + o[1], -r[1] + o[2]];
    const first = it.states[0];
    it.states = [
      { ...first, pos, rot: [-Math.PI / 2, 0, 0], from: [0, 300, 0] },
      { step: at, scene: "main", pos: it.final.pos, rot: it.final.rot, from: [500, 0, 0], delay: 0.2 },
    ];
  }
}

const family: Family = {
  names: ["ÄLVDALEN", "ALVDALEN"],
  build(b, s) {
    if (!/sofa-bed|sofa bed/i.test(`${s.slug ?? ""} ${s.variant}`)) return false;
    const { recipe, chaise } = recipeOf(s);
    buildCustom(b, { ...s, custom: recipe });
    if (chaise) standChaise(b, recipe, chaise.ids, chaise.at, chaise.xc, 820);
    return true;
  },
};
export default family;
