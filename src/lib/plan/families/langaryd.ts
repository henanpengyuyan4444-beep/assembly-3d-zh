import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, HwKind, PartPiece, Pose, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * LÅNGARYD, read from its frame manuals. Every section is built lying on its back on a rug: the backrest goes down
 * first, the armrests are hooked onto its ends (a hook screwed onto each armrest), threaded rods are screwed by hand
 * into the front of the backrest and the seat is lowered onto them, then nuts with the box spanner and bolts through
 * the seat into the armrests. The legs have studs and screw into the bottom, a pad clicks into each, and it is stood
 * up. The three-seat sofa has two backrests on a joining pin and two seats bolted together over two middle legs on
 * brackets. The sofa with chaise is two sections: the chaise is built lying on its inner side (backrest, seat, then
 * the armrest hooked on from above) and gets two brackets on its side, then the sofa section is built on its back on
 * its own and lifted onto them.
 */

const LEG = 150; // room under it
const SEAT = 430; // top of the seat frame
const ARM_H = 590;
const BACK_H = 820;
const AW = 170; // armrest
const MD = 900; // depth of a sofa section
const BT = 270; // backrest, front to back at the seat
const r = (n: number) => Math.round(n * 10) / 10;

const ROD = { len: 150, dia: 8, name: "Threaded rod" };
const JOIN_ROD = { len: 120, dia: 8, name: "Joining rod" };
const BOLT = { len: 90, dia: 8, name: "Bolt" };
const WASHER = { len: 2, dia: 24 };
const NUT = { len: 6, dia: 8 };
const WING = { len: 14, dia: 30, name: "Wing nut" };

type Layout = { kind: "two" | "three" | "chaise"; W: number; D: number; side: -1 | 1 }; // side: where the chaise is

function layoutOf(s: ProductSpec): Layout | null {
  const slug = s.slug ?? "";
  if (!/^langaryd-/.test(slug)) return null;
  const W = s.size.w * 10;
  if (/chaise/.test(slug)) return { kind: "chaise", W, D: 1620, side: /right/.test(slug) ? 1 : -1 };
  if (/loveseat/.test(slug)) return { kind: "two", W, D: MD, side: -1 };
  if (slug === "langaryd-sofa") return { kind: "three", W, D: MD, side: -1 };
  return null;
}

const fx = (kind: HwKind, on: string, dir: Vec3, at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, on, dir, at: at.map((p) => p.map(r) as Vec3), ...o });

class Sofa {
  parts: CustomPart[] = [];
  steps: CustomStep[] = [];
  z0: number; // the back of the sofa
  zf: number; // front of the backrests, where the seats start
  constructor(public L: Layout) {
    this.z0 = -L.D / 2;
    this.zf = this.z0 + BT;
  }
  part(id: string, name: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, o: Partial<CustomPart> = {}) {
    const size: Vec3 = [r(x1 - x0), r(y1 - y0), r(z1 - z0)];
    const pos: Vec3 = [r((x0 + x1) / 2), r((y0 + y1) / 2), r((z0 + z1) / 2)];
    this.parts.push({ id, name, size, pos, material: "soft", ...o });
    return id;
  }
  /** A backrest: the low frame behind the seat and the padded back above it. */
  back(id: string, x0: number, x1: number) {
    const w = x1 - x0, cy = (LEG + BACK_H) / 2;
    const pieces: PartPiece[] = [
      { shape: "box", size: [w, SEAT - LEG, BT], pos: [0, (LEG + SEAT) / 2 - cy, 0] },
      { shape: "box", size: [w, BACK_H - SEAT - 40, 210], pos: [0, (SEAT + BACK_H - 40) / 2 - cy, -BT / 2 + 105] },
      { shape: "cyl", size: [80, w, 80], pos: [0, BACK_H - 40 - cy, -BT / 2 + 125], rot: [0, 0, Math.PI / 2] },
    ];
    return this.part(id, "Backrest", x0, x1, LEG, BACK_H, this.z0, this.zf, { pieces });
  }
  /** A seat: its frame with the rounded front edge. */
  seat(id: string, x0: number, x1: number, z1: number, name = "Seat") {
    const w = x1 - x0, d = z1 - this.zf, h = SEAT - LEG;
    const pieces: PartPiece[] = [
      { shape: "box", size: [w, h, d - h / 2], pos: [0, 0, -h / 4] },
      { shape: "cyl", size: [h, w, h], pos: [0, 0, d / 2 - h / 2], rot: [0, 0, Math.PI / 2] },
    ];
    return this.part(id, name, x0, x1, LEG, SEAT, this.zf, z1, { pieces });
  }
  /** An armrest, rounded at the front. */
  arm(id: string, x0: number) {
    const h = ARM_H - LEG;
    const pieces: PartPiece[] = [
      { shape: "box", size: [AW, h, MD - AW / 2], pos: [0, 0, -AW / 4] },
      { shape: "cyl", size: [AW, h, AW], pos: [0, 0, MD / 2 - AW / 2] },
    ];
    return this.part(id, "Armrest", x0, x0 + AW, LEG, ARM_H, this.z0, this.z0 + MD, { pieces });
  }
  leg(id: string, x: number, z: number) {
    this.parts.push({ id, name: "Leg", size: [40, LEG, 40], pos: [r(x), LEG / 2, r(z)], shape: "cyl", material: "metal" });
    return id;
  }

  /* ---------- fittings, in the finished product ---------- */
  armIn(arm: string) {
    const p = this.parts.find((x) => x.id === arm)!;
    const sx = p.pos[0] < 0 ? -1 : 1;
    return { sx, x: p.pos[0] - sx * (AW / 2) };
  }
  hooks(arm: string): CustomFix[] {
    const { sx, x } = this.armIn(arm);
    return [
      fx("hook", arm, [sx, 0, 0], [[x, 360, this.z0 + 140]], { len: 40, dia: 24, name: "Hook" }),
      fx("screw", arm, [sx, 0, 0], [[x, 410, this.z0 + 180]], { len: 16, dia: 6 }),
    ];
  }
  rods(back: string, xs: number[]): CustomFix {
    return fx("stud", back, [0, 0, -1], xs.map((x) => [x, 270, this.zf]), ROD);
  }
  nuts(seat: string, xs: number[]): CustomFix[] {
    const pts: Vec3[] = xs.map((x) => [x, 270, this.zf + 110]);
    return [fx("washer", seat, [0, 0, -1], pts, WASHER), fx("nut", seat, [0, 0, -1], pts, NUT)];
  }
  /** Bolts from inside the seat frame out through its end into the armrest beside it. */
  armBolts(seat: string, arm: string): CustomFix[] {
    const { sx, x } = this.armIn(arm);
    const zs = [this.zf + 120, this.z0 + MD - 160];
    const pts: Vec3[] = zs.map((z) => [x - sx * 50, 300, z]);
    return [{ ...fx("bolt", seat, [sx, 0, 0], pts, BOLT), mate: arm }, fx("washer", seat, [sx, 0, 0], pts, WASHER)];
  }
  legFits(legs: string[], studs = true): CustomFix[] {
    return legs.map((id) => {
      const p = this.parts.find((x) => x.id === id)!;
      return studs ? fx("legScrew", id, [0, -1, 0], [[p.pos[0], LEG, p.pos[2]]], { len: 40, dia: 8, name: "Stud" }) : fx("glide", id, [0, 1, 0], [[p.pos[0], 0, p.pos[2]]], { len: 4, dia: 24, name: "Foot pad" });
    });
  }
}

const legZ = (S: Sofa, front: number) => [S.z0 + 80, front - 90];

/** The loveseat and the three-seat sofa: one section, built lying on its back. */
function sofaRecipe(L: Layout) {
  const S = new Sofa(L);
  const iw = L.W - 2 * AW;
  const xl = -L.W / 2, xr = L.W / 2;
  const three = L.kind === "three";
  const backs = three ? [S.back("B1", -iw / 2, 0), S.back("B2", 0, iw / 2)] : [S.back("B1", -iw / 2, iw / 2)];
  const seats = three ? [S.seat("S1", -iw / 2, 0, S.z0 + MD), S.seat("S2", 0, iw / 2, S.z0 + MD)] : [S.seat("S1", -iw / 2, iw / 2, S.z0 + MD)];
  S.arm("AL", xl);
  S.arm("AR", xr - AW);
  const lz = legZ(S, S.z0 + MD);
  const lx = iw / 2 - 50;
  const legs = [-1, 1].flatMap((sx) => lz.map((z, i) => S.leg(`L${sx < 0 ? "l" : "r"}${i}`, sx * lx, z)));
  const mids = three ? lz.map((z, i) => S.leg(`Lm${i}`, 0, z)) : [];
  // two rods into each backrest on the sofa, four across the loveseat's
  const rodX = (x0: number, x1: number, n: number) => Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * (i + 0.5)) / n);
  const rodsOf = three ? [rodX(-iw / 2, 0, 2), rodX(0, iw / 2, 2)] : [rodX(-iw / 2, iw / 2, 4)];
  const st = S.steps;
  const P: Pose = "+z";
  if (three) {
    st.push({ title: "Screw the threaded rods into the first backrest", detail: "Lay it on its back on a rug. Two rods go into the holes along its front, by hand until they stop.", add: ["B1"], fix: [S.rods("B1", rodsOf[0])], pose: P, warnings: ["floor", "hand"] });
    st.push({
      title: "Push the joining pin into its end",
      detail: "Into the hole in the end that meets the other backrest, until its collar sits against the frame.",
      fix: [{ ...fx("dowel", "B1", [-1, 0, 0], [[0, 300, S.z0 + 150]], { len: 80, dia: 12, name: "Joining pin" }), mate: "B2" }],
    });
    st.push({
      title: "Push the second backrest onto the pin",
      detail: "Screw its two rods in first. Then slide it on until the two ends meet along their whole height.",
      add: ["B2"],
      fix: [S.rods("B2", rodsOf[1])],
      from: { B2: [420, 0, 0] },
    });
  } else st.push({ title: "Lay the backrest on its back", detail: "On a rug, its front facing up, with room at both ends for the armrests.", add: ["B1"], pose: P, warnings: ["floor"] });
  st.push({
    title: "Screw on the hooks and hook the armrests on",
    detail: "One hook on the inside of each armrest, at the back. Then stand each armrest on its back and drop the hook into the slot in the backrest's end.",
    add: ["AL", "AR"],
    fix: [...S.hooks("AL"), ...S.hooks("AR")],
    from: { AL: [-420, 0, 0], AR: [420, 0, 0] },
    tools: ["screwdriver"],
    people: 2,
  });
  if (!three) st.push({ title: "Screw the threaded rods into the backrest", detail: "Four of them, into the holes along its front, by hand until they stop.", fix: [S.rods("B1", rodsOf[0])], warnings: ["hand"] });
  seats.forEach((id, i) =>
    st.push({
      title: three ? (i ? "Lower the second seat on" : "Lower the first seat onto its rods") : "Lower the seat onto the rods",
      detail: i ? "Onto the other two rods, tight against the first seat." : "Springs facing up. Guide each rod into its hole and let the seat sit flat against the backrest.",
      add: [id],
      from: { [id]: [0, 0, 420] },
    }),
  );
  st.push({
    title: "Tighten a nut on each rod",
    detail: "From inside the seat frame: a washer, then a nut, turned tight with the box spanner.",
    fix: seats.flatMap((id, i) => S.nuts(id, rodsOf[i])),
    tools: ["wrench"],
  });
  st.push({
    title: "Bolt the seat to the armrests",
    detail: "Two bolts with washers at each end, through the seat frame into the armrest. Tighten them with the box spanner.",
    fix: [...S.armBolts(seats[0], "AL"), ...S.armBolts(seats[seats.length - 1], "AR")],
    tools: ["wrench"],
  });
  if (three) {
    const zs = [S.zf + 160, S.z0 + MD - 220];
    st.push({
      title: "Join the two seats",
      detail: "Two long rods through the holes where the seats meet, with a wing nut tightened by hand on each end.",
      fix: [
        { ...fx("stud", "S2", [1, 0, 0], zs.map((z) => [0, 330, z]), JOIN_ROD), mate: "S1" },
        fx("nut", "S1", [1, 0, 0], zs.map((z) => [-60, 330, z]), WING),
        fx("nut", "S2", [-1, 0, 0], zs.map((z) => [60, 330, z]), WING),
      ],
      warnings: ["hand"],
    });
    st.push({
      title: "Fit the two middle legs on their brackets",
      detail: "Screw a bracket onto the top of each leg, slide it over the joined frames, and bolt it through with a washer and a wing nut.",
      add: mids,
      fix: [
        ...mids.map((id, i) => fx("clamp", id, [0, -1, 0], [[0, LEG, lz[i]]], { len: 60, dia: 40, name: "Leg bracket" })),
        { ...fx("bolt", "S1", [1, 0, 0], lz.map((z) => [-60, 220, z]), BOLT), mate: "S2" },
        fx("washer", "S1", [1, 0, 0], lz.map((z) => [-60, 220, z]), WASHER),
        fx("nut", "S2", [-1, 0, 0], lz.map((z) => [60, 220, z]), WING),
      ],
      from: Object.fromEntries(mids.map((id) => [id, [0, -300, 0] as Vec3])),
      tools: ["wrench"],
    });
  }
  st.push({
    title: three ? "Screw in the four corner legs" : "Screw in the legs",
    detail: "Screw a stud into the top of each leg first, then turn the leg into its plate under the frame by hand.",
    add: legs,
    fix: S.legFits(legs),
    from: Object.fromEntries(legs.map((id) => [id, [0, -300, 0] as Vec3])),
    warnings: ["hand"],
  });
  st.push({ title: "Press a pad into the foot of each leg", detail: "The flat side down. It keeps the legs from marking the floor.", fix: S.legFits([...legs, ...mids], false) });
  st.push({ title: "Stand it up together", detail: "Tip it forward onto its legs, one of you at each end.", pose: "+y", people: 2, warnings: ["two"] });
  return { S, bolsters: true };
}

/** The sofa with chaise: the chaise section, built on its inner side, then the sofa section on its back on its own. */
function chaiseRecipe(L: Layout) {
  const S = new Sofa(L);
  const sd = L.side; // the chaise end
  const X = (x: number) => sd * x; // positions drawn for a chaise on the right (+x), mirrored for the left
  // from the chaise end inwards: its armrest, the chaise seat 900 wide, the sofa seat, the other armrest
  const xa = L.W / 2 - AW, xc = xa - 900, xo = -L.W / 2 + AW;
  const span = (a: number, b: number) => [Math.min(X(a), X(b)), Math.max(X(a), X(b))] as const;
  const [cb0, cb1] = span(xc, xa);
  S.back("CB", cb0, cb1);
  // the chaise seat and the storage box in front of its armrest, one frame
  {
    const w = cb1 - cb0, d = L.D / 2 - S.zf, h = SEAT - LEG;
    const boxD = L.D / 2 - (S.z0 + MD);
    const cx = (cb0 + cb1) / 2;
    const ax = X(xa + AW / 2) - cx;
    const pieces: PartPiece[] = [
      { shape: "box", size: [w, h, d - h / 2], pos: [0, 0, -h / 4] },
      { shape: "cyl", size: [h, w, h], pos: [0, 0, d / 2 - h / 2], rot: [0, 0, Math.PI / 2] },
      { shape: "box", size: [AW, h, boxD], pos: [ax, 0, d / 2 - boxD / 2], material: "wood" },
    ];
    const x0 = Math.min(cb0, cx + ax - AW / 2), x1 = Math.max(cb1, cx + ax + AW / 2);
    const bx = (x0 + x1) / 2;
    for (const p of pieces) p.pos = [r(p.pos[0] + cx - bx), p.pos[1], p.pos[2]];
    S.part("CS", "Chaise longue", x0, x1, LEG, SEAT, S.zf, L.D / 2, { pieces });
  }
  S.arm("CA", sd > 0 ? xa : -xa - AW);
  const [sb0, sb1] = span(xo, xc);
  S.back("SB", sb0, sb1);
  S.seat("SS", sb0, sb1, S.z0 + MD);
  S.arm("SA", sd > 0 ? -L.W / 2 : L.W / 2 - AW);
  // six legs under the chaise, two under the sofa section's armrest end
  const cl = [X(xa + AW - 60), X(xc + 60)].flatMap((x, i) => [S.z0 + 80, 0, L.D / 2 - 90].map((z, j) => S.leg(`C${i}${j}`, x, z)));
  const sl = legZ(S, S.z0 + MD).map((z, i) => S.leg(`S${i}`, X(xo + 50), z));

  const st = S.steps;
  const pose: Pose = sd < 0 ? "-x" : "+x"; // lying on its inner side
  const cRods = [cb0 + 200, cb1 - 200];
  const sRods = Array.from({ length: 4 }, (_, i) => sb0 + ((sb1 - sb0) * (i + 0.5)) / 4);
  const inner = X(xc); // the chaise's side that meets the sofa section
  st.push({
    title: "Screw two threaded rods into the chaise backrest",
    detail: "Stand it on its end on a rug, front facing you. Turn the rods in by hand until they stop.",
    add: ["CB"],
    fix: [S.rods("CB", cRods)],
    pose,
    warnings: ["floor", "hand"],
  });
  st.push({ title: "Push the chaise longue onto the rods", detail: "Lay it on its side, bottom towards you, and slide it on until it meets the backrest.", add: ["CS"], from: { CS: [0, 0, 500] } });
  st.push({ title: "Tighten a nut on each rod", detail: "Inside the frame: a washer, then a nut, tightened with the box spanner.", fix: S.nuts("CS", cRods), tools: ["wrench"] });
  st.push({
    title: "Screw a hook onto the chaise armrest",
    detail: "On its inside, near the back. The second hook goes on the sofa section's armrest later.",
    add: ["CA"],
    fix: S.hooks("CA"),
    from: { CA: [X(500), 0, 0] },
    tools: ["screwdriver"],
  });
  st.push({
    title: "Bolt the armrest to the chaise",
    detail: "Check its hook sits in the backrest's slot. Then two bolts with washers through the chaise frame into it, tightened with the box spanner.",
    fix: S.armBolts("CS", "CA"),
    tools: ["wrench"],
  });
  st.push({ title: "Screw in the six legs", detail: "A stud into the top of each leg first, then turn each leg into the frame by hand.", add: cl, fix: S.legFits(cl), from: Object.fromEntries(cl.map((id) => [id, [0, -300, 0] as Vec3])), warnings: ["hand"] });
  st.push({ title: "Press a pad into each leg", fix: S.legFits(cl, false) });
  const brk: Vec3[] = [S.zf + 160, S.z0 + MD - 140].map((z) => [inner, 290, z]);
  st.push({
    title: "Stand it up and fit the two brackets",
    detail: "On the side that meets the sofa section, one Allen screw each. The sofa section hangs on them.",
    pose: "+y",
    fix: [
      fx("angle", "CS", [sd, 0, 0], brk, { len: 50, dia: 40, name: "Hanging bracket", twist: Math.PI / 2 }),
      fx("bolt", "CS", [sd, 0, 0], brk.map((p) => [p[0], p[1] + 30, p[2]]), { len: 20, dia: 8, name: "Allen screw" }),
    ],
    tools: ["allen"],
  });
  const chaiseSteps = st.length;
  st.push({
    title: "Hook the armrest onto the sofa backrest",
    detail: "Lay the backrest on its back on a rug. Screw the second hook onto the armrest, stand it on its back and drop the hook into the slot in the backrest's end.",
    add: ["SB", "SA"],
    fix: S.hooks("SA"),
    from: { SA: [X(-420), 0, 0] },
    pose: "+z",
    tools: ["screwdriver"],
    people: 2,
    warnings: ["floor", "two"],
  });
  st.push({ title: "Screw the threaded rods into the backrest", detail: "Four of them, into the holes along its front, by hand until they stop.", fix: [S.rods("SB", sRods)], warnings: ["hand"] });
  st.push({ title: "Lower the seat onto the rods", detail: "Guide each rod into its hole and let the seat sit flat against the backrest.", add: ["SS"], from: { SS: [0, 0, 420] } });
  st.push({ title: "Tighten a nut on each rod", detail: "A washer, then a nut, tight with the box spanner.", fix: S.nuts("SS", sRods), tools: ["wrench"] });
  st.push({ title: "Bolt the seat to the armrest", detail: "Two bolts with washers through the seat frame into the armrest.", fix: S.armBolts("SS", "SA"), tools: ["wrench"] });
  st.push({ title: "Screw in the two legs", detail: "At the armrest end only: a stud into each leg, then the leg into the frame. The open end hangs on the chaise.", add: sl, fix: S.legFits(sl), from: Object.fromEntries(sl.map((id) => [id, [0, -300, 0] as Vec3])), warnings: ["hand"] });
  st.push({ title: "Press a pad into each leg", fix: S.legFits(sl, false) });
  st.push({
    title: "Push the joining pin into the open end",
    detail: "Into the hole in the backrest's end, until its collar sits against the frame.",
    fix: [{ ...fx("dowel", "SB", [-sd, 0, 0], [[inner, 300, S.z0 + 150]], { len: 80, dia: 12, name: "Joining pin" }), mate: "CB" }],
  });
  return { S, chaiseSteps };
}

const keyAt = (b: PlanBuilder, pos: Vec3) => b.items.find((x) => x.kind === "part" && x.final.pos.every((v, i) => Math.abs(v - pos[i]) < 0.5))?.key;

/** The two bolster cushions, on the seat against each armrest. */
function bolsterStep(b: PlanBuilder, L: Layout, S: Sofa) {
  const t = b.part("Bolster cushion", [160, 460, 160], { shape: "cyl", material: "soft" });
  const xs = [-1, 1].map((sx) => sx * (L.W / 2 - AW - 90));
  const keys = xs.map((x) => b.place(t, [x, SEAT + 80, S.zf + 260], [Math.PI / 2, 0, 0]));
  b.step({ title: "Put the bolster cushions on", detail: "One against each armrest, along it at the back of the seat.", kind: "cushions" }, () => {
    b.stagger(0.3);
    for (const k of keys) b.add(k, [0, 260, 0]);
  });
}

const family: Family = {
  names: ["LÅNGARYD", "LANGARYD"],
  build(b, s) {
    const L = layoutOf(s);
    if (!L) return false;
    if (L.kind !== "chaise") {
      const { S } = sofaRecipe(L);
      buildCustom(b, { ...s, custom: { parts: S.parts, steps: S.steps } });
      bolsterStep(b, L, S);
      return true;
    }
    const { S, chaiseSteps } = chaiseRecipe(L);
    const first = b.steps.length;
    buildCustom(b, { ...s, custom: { parts: S.parts, steps: S.steps } });
    // the sofa section is built on its own, away from the chaise, then lifted onto it
    const sofaIds = ["SB", "SA", "SS", ...S.parts.filter((p) => /^S\d$/.test(p.id)).map((p) => p.id)];
    const keys = sofaIds.map((id) => keyAt(b, S.parts.find((p) => p.id === id)!.pos)).filter((k): k is string => !!k);
    for (let i = first + chaiseSteps; i < b.steps.length; i++) b.steps[i].scene = "sofa";
    for (const k of keys) for (const stt of b.partItem(k).states) if (stt.step >= first + chaiseSteps) stt.scene = "sofa";
    b.step(
      {
        title: "Lift the sofa section onto the chaise together",
        detail: "Stand it up and carry it over. Lower its open end so it hooks onto both brackets, with the pin in the chaise backrest's hole.",
        kind: "join",
        people: 2,
        warnings: ["two"],
      },
      () => {
        b.stagger(0);
        for (const k of keys) b.add(k, [-L.side * 400, 200, 0]);
      },
    );
    // the lid of the storage box in front of the chaise armrest
    const boxD = L.D / 2 - (S.z0 + MD);
    const lid = b.part("Lid", [AW - 16, 18, boxD - 16], { material: "wood" });
    const lk = b.place(lid, [L.side * (L.W / 2 - AW / 2), SEAT - 9, L.D / 2 - boxD / 2]);
    b.step({ title: "Lay the lid on the storage box", detail: "It rests in the box in front of the chaise armrest; lift it off to use the space.", kind: "general" }, () => b.add(lk, [0, 200, 0]));
    bolsterStep(b, L, S);
    return true;
  },
};
export default family;
