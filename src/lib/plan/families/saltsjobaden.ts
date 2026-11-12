import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, Pose, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * SALTSJÖBADEN, from IKEA's manuals. Every sofa section is built lying on its back: four threaded studs go into the
 * bottom rail of the backrest, the seat frame stands on them and is held by washers and wing nuts; each armrest gets
 * four studs in its inner side and is pushed onto the end, three wing nuts from inside, then the legs (a big washer,
 * a cover cap and a felt pad each) go into the armrests. Stood up and turned round, the last wing nut of each armrest
 * goes on from behind, then the cover and the cushions. The chaise longue is a frame on two legs clamped to the front
 * of the seat; the corner sofa is two one-armed sections hung on a corner unit (two back panels bolted to a base, four
 * legs, four U hooks and two pins). The sofa-bed is two armrests joined by three rods, a bed base locked onto their stop
 * blocks and a backrest hung on two hooks; the rocking armchair only gets its backrest bar.
 */

/* ---------- geometry helpers: mm, x left to right, y up, z back to front ---------- */

type B6 = [number, number, number, number, number, number]; // x0, x1, y0, y1, z0, z1
// a module's own frame placed in the product: straight, or turned so its x runs along z (the wing of a corner sofa)
interface Xf {
  ox: number;
  oz: number;
  swap: boolean;
}
const STRAIGHT: Xf = { ox: 0, oz: 0, swap: false };
const tp = (t: Xf, v: Vec3): Vec3 => (t.swap ? [t.ox + v[2], v[1], t.oz + v[0]] : [t.ox + v[0], v[1], t.oz + v[2]]);
const td = (t: Xf, v: Vec3): Vec3 => (t.swap ? [v[2], v[1], v[0]] : v);

function piece(t: Xf, b: B6, shape: "box" | "cyl" = "box"): PartPiece {
  const lo = tp(t, [b[0], b[2], b[4]]), hi = tp(t, [b[1], b[3], b[5]]);
  return { shape, size: [0, 1, 2].map((k) => Math.abs(hi[k] - lo[k])) as Vec3, pos: [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3 };
}
function box(id: string, name: string, t: Xf, b: B6, material: PartMaterial, shape?: "box" | "cyl"): CustomPart {
  const p = piece(t, b);
  return { id, name, size: p.size, pos: p.pos, material, ...(shape ? { shape } : {}) };
}
/** One part drawn as several boxes, given where they sit in the product. */
function compound(id: string, name: string, abs: PartPiece[], material: PartMaterial): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...abs.map((p) => p.pos[k] - p.size[k] / 2)));
  const hi = [0, 1, 2].map((k) => Math.max(...abs.map((p) => p.pos[k] + p.size[k] / 2)));
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  const size = [0, 1, 2].map((k) => hi[k] - lo[k]) as Vec3;
  return { id, name, size, pos, material, pieces: abs.map((p) => ({ ...p, pos: [p.pos[0] - pos[0], p.pos[1] - pos[1], p.pos[2] - pos[2]] as Vec3 })) };
}
const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const spread = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)));

/* ---------- the fittings ---------- */

const STUD = { kind: "legScrew", len: 80, dia: 8, name: "Threaded stud" } as const; // wood thread one end, machine thread the other
const WASH = { kind: "washer", len: 2, dia: 20 } as const;
const WING = { kind: "nut", len: 14, dia: 30, name: "Wing nut" } as const;
const LEGW = { kind: "washer", len: 3, dia: 40, name: "Leg washer" } as const;
const CAP = { kind: "cap", len: 10, dia: 30, name: "Cover cap" } as const;
const PAD = { kind: "glide", len: 4, dia: 30, name: "Felt pad" } as const;

/* ---------- a sofa section: backrest, seat frame, armrests with legs, cushions ---------- */

const Z0 = -440, ZF = 440; // 88 cm deep
const LEG = 170, AH = 640, AW = 130;
const BY0 = 200, BT = 160, BZ = Z0 + BT, BACK = 700; // backrest frame
const SY1 = 330, RAIL = 30; // seat frame top, rail thickness
const SEAT = 460, CZ = -110, TOP = 900; // cushions

interface Section {
  t: Xf;
  p: string;
  a: number;
  b: number;
  ends: (-1 | 1)[]; // the ends with an armrest
  back: string;
  seat: string;
  arms: string[];
  legs: string[];
  seats: string[];
  backs: string[];
  parts: CustomPart[];
  // fittings, in the product's frame
  backStuds: Vec3[];
  backNuts: Vec3[];
  armStuds: { e: -1 | 1; at: Vec3; mate: string; nut: Vec3 }[];
  legPts: { e: -1 | 1; arm: string; leg: string; x: number; z: number }[];
}

function section(t: Xf, p: string, a: number, b: number, ends: (-1 | 1)[], nSeat: number, seatName: string): Section {
  const parts: CustomPart[] = [];
  const back = `${p}B`, seat = `${p}S`;
  const W = (v: Vec3) => tp(t, v);
  // the backrest frame, open at the back so the nuts inside can be reached
  parts.push(
    compound(back, "Backrest frame", [
      piece(t, [a, b, BY0, BACK, BZ - 20, BZ]),
      piece(t, [a, b, BACK - 30, BACK, Z0, BZ]),
      piece(t, [a, b, BY0, BY0 + 40, Z0, BZ]),
      piece(t, [a, a + RAIL, BY0, BACK, Z0, BZ]),
      piece(t, [b - RAIL, b, BY0, BACK, Z0, BZ]),
    ], "soft"),
  );
  // the seat frame: rails round a sprung deck, open underneath
  const springs = spread(a + 140, b - 140, Math.max(3, Math.round((b - a) / 230)));
  parts.push(
    compound(seat, seatName, [
      piece(t, [a, b, BY0, SY1, BZ, BZ + RAIL]),
      piece(t, [a, b, BY0, SY1, ZF - RAIL, ZF]),
      piece(t, [a, a + RAIL, BY0, SY1, BZ, ZF]),
      piece(t, [b - RAIL, b, BY0, SY1, BZ, ZF]),
      ...springs.map((x) => piece(t, [x - 25, x + 25, SY1 - 12, SY1, BZ + RAIL, ZF - RAIL])),
    ], "soft"),
  );
  const arms: string[] = [], legs: string[] = [];
  const armStuds: Section["armStuds"] = [], legPts: Section["legPts"] = [];
  for (const e of ends) {
    const xj = e < 0 ? a : b;
    const arm = `${p}A${e < 0 ? "L" : "R"}`;
    arms.push(arm);
    parts.push(box(arm, "Armrest", t, e < 0 ? [a - AW, a, LEG, AH, Z0, ZF] : [b, b + AW, LEG, AH, Z0, ZF], "soft"));
    // two into the seat frame's side, two into the backrest's; the top one at the back is reached from behind
    for (const [y, z, mate] of [[265, ZF - 80, seat], [265, BZ + 70, seat], [420, Z0 + 80, back], [620, Z0 + 80, back]] as [number, number, string][])
      armStuds.push({ e, at: W([xj, y, z]), mate, nut: W([xj - e * RAIL, y, z]) });
    for (const z of [Z0 + 60, ZF - 60]) {
      const leg = `${p}L${e < 0 ? "L" : "R"}${z < 0 ? "B" : "F"}`;
      legs.push(leg);
      const x = xj + e * (AW / 2);
      parts.push(box(leg, "Leg", t, [x - 22, x + 22, 0, LEG, z - 22, z + 22], "wood"));
      legPts.push({ e, arm, leg, x, z });
    }
  }
  const nb = b - a < 1000 ? 2 : 4;
  const backStuds = spread(a + 160, b - 160, nb).map((x) => W([x, BY0 + 20, BZ]));
  const backNuts = spread(a + 160, b - 160, nb).map((x) => W([x, BY0 + 20, BZ + RAIL]));
  const seats: string[] = [], backs: string[] = [];
  const cw = (b - a) / nSeat;
  for (let i = 0; i < nSeat; i++) {
    const x0 = a + cw * i;
    seats.push(`${p}C${i}`);
    backs.push(`${p}K${i}`);
    parts.push(box(`${p}C${i}`, "Seat cushion", t, [x0 + 3, x0 + cw - 3, SY1, SEAT, CZ, ZF], "soft"));
    parts.push(box(`${p}K${i}`, "Back cushion", t, [x0 + 4, x0 + cw - 4, SY1, TOP, BZ, CZ], "soft"));
  }
  return { t, p, a, b, ends, back, seat, arms, legs, seats, backs, parts, backStuds, backNuts, armStuds, legPts };
}

/** The steps of one section's manual, lying on its back (`pose` is the side of the product its front faces). */
function sectionSteps(s: Section, pose: Pose, o: { what: string; legsLater?: boolean } = { what: "sofa" }): CustomStep[] {
  const t = s.t;
  const dirBack = td(t, [0, 0, -1]);
  const one = s.ends.length === 1;
  const armDir = (e: -1 | 1) => td(t, [e, 0, 0]);
  const reach = s.armStuds.filter((_, i) => i % 4 !== 3);
  const last = s.armStuds.filter((_, i) => i % 4 === 3);
  const studsOf = (list: Section["armStuds"]) => list.map((q) => fx(STUD.kind, [q.at], armDir(q.e), { ...STUD, on: s.arms[s.ends.indexOf(q.e)], mate: q.mate }));
  const nutsOf = (list: Section["armStuds"]): CustomFix[] => {
    // one fix per part the nuts sit on, washers first
    const out: CustomFix[] = [];
    for (const mate of [s.seat, s.back]) {
      for (const e of s.ends) {
        const pts = list.filter((q) => q.mate === mate && q.e === e);
        if (!pts.length) continue;
        out.push(fx(WASH.kind, pts.map((q) => q.nut), armDir(-e as -1 | 1), { ...WASH, on: mate }));
        out.push(fx(WING.kind, pts.map((q) => q.nut), armDir(-e as -1 | 1), { ...WING, on: mate }));
      }
    }
    return out;
  };
  const steps: CustomStep[] = [
    {
      title: `Screw ${s.backStuds.length === 2 ? "two" : "four"} studs into the backrest`,
      detail: "Lay the backrest on its back on a rug. Turn each stud into a hole along its bottom rail by hand, pointed end first.",
      fix: [fx(STUD.kind, s.backStuds, td(t, [0, 0, -1]), { ...STUD, on: s.back, mate: s.seat })],
      pose,
      kind: "bolts",
      warnings: ["floor", "hand"],
      tools: [],
    },
    { title: "Stand the seat frame on the studs", detail: "Its back rail goes over the studs, sprung side towards the backrest's springs.", add: [s.seat], tools: [] },
    {
      title: "Fasten the seat frame with washers and wing nuts",
      detail: "Use the small washers here, the big ones are for the legs. Tighten the wing nuts by hand.",
      fix: [fx(WASH.kind, s.backNuts, dirBack, { ...WASH, on: s.seat }), fx(WING.kind, s.backNuts, dirBack, { ...WING, on: s.seat })],
      kind: "bolts",
      warnings: ["hand"],
      tools: [],
    },
    {
      title: one ? "Screw four studs into the armrest and push it on" : "Screw four studs into each armrest and push them on",
      detail: one ? "Into the holes in its inner side, by hand. Slide it onto the end so the studs go through the frame." : "Into the holes in their inner sides, by hand. Slide them onto the ends so the studs go through the frame.",
      add: s.arms,
      fix: studsOf(s.armStuds),
      kind: "join",
      tools: [],
    },
    {
      title: one ? "Fasten the armrest from inside" : "Fasten the armrests from inside",
      detail: "A small washer and a wing nut on each of the three studs you can reach. The top one at the back goes on later.",
      fix: nutsOf(reach),
      kind: "bolts",
      warnings: ["hand"],
      tools: [],
    },
  ];
  if (!o.legsLater) steps.push(...legSteps(s.legPts, t, one ? "the armrest" : "the armrests"));
  steps.push(
    { title: "Stand it up together and turn it round", detail: "Lift it by the frame, not by the legs, and turn it so you face the back.", pose: "+y", people: 2, kind: "standup", tools: [] },
    {
      title: one ? "Fit the last wing nut on the armrest" : "Fit the last wing nut on each armrest",
      detail: "On the top stud at the back, with a small washer, tightened by hand.",
      fix: nutsOf(last),
      kind: "bolts",
      warnings: ["hand"],
      tools: [],
    },
    {
      title: `Pull the cover over the ${o.what}`,
      detail: "Two of you, from the back over the armrests and down the front. Then fasten its strips under the frame all round.",
      people: 2,
      kind: "general",
      tools: [],
    },
  );
  return steps;
}

/** The leg manual: a big washer and a leg into each corner, a cover cap beside it and a felt pad underneath. */
function legSteps(pts: Section["legPts"], t: Xf, where: string, on?: string): CustomStep[] {
  const up: Vec3 = [0, 1, 0];
  return [
    {
      title: `Screw the legs into ${where}`,
      detail: "Put a big washer on each leg's bolt and turn the leg in by hand until it is tight.",
      add: pts.map((q) => q.leg),
      fix: pts.map((q) => fx(LEGW.kind, [tp(t, [q.x, LEG, q.z])], up, { ...LEGW, on: on ?? q.arm })),
      kind: "legs",
      warnings: ["hand"],
      tools: [],
    },
    {
      title: "Push in a cover cap beside each leg",
      detail: "Into the two holes next to the leg, standing upright along it.",
      fix: pts.map((q) => fx(CAP.kind, [tp(t, [q.x - q.e * (AW / 2), LEG + 22, q.z])], td(t, [q.e, 0, 0]), { ...CAP, on: on ?? q.arm })),
      kind: "general",
      tools: [],
    },
    { title: "Stick a felt pad under each leg", fix: [fx(PAD.kind, pts.map((q) => tp(t, [q.x, 0, q.z])), up, { ...PAD })], kind: "legs", tools: [] },
  ];
}

const cushionSteps = (seats: string[], backs: string[], n: string): CustomStep[] => [
  { title: "Zip the covers onto the cushions", detail: `${n}. Push each cushion into its cover corners first, then close the zip.`, kind: "general", tools: [] },
  {
    title: seats.length === 1 ? "Lay in the seat cushion, then stand the back cushion behind it" : "Lay in the seat cushions, then stand the back cushions behind them",
    detail: "The back cushions lean on the backrest with their zips at the bottom.",
    add: [...seats, ...backs],
    kind: "cushions",
    from: Object.fromEntries([...seats.map((k) => [k, [0, 320, 0] as Vec3]), ...backs.map((k) => [k, [0, 260, 300] as Vec3])]),
    tools: [],
  },
];

/* ---------- the products ---------- */

function sofa(W: number, n: number, name: string): CustomParams {
  const a = -W / 2 + AW, b = W / 2 - AW;
  const s = section(STRAIGHT, "", a, b, [-1, 1], n, name);
  return { parts: s.parts, steps: [...sectionSteps(s, "+z", { what: n === 1 ? "armchair" : "sofa" }), ...cushionSteps(s.seats, s.backs, n === 1 ? "One seat and one back cushion" : `${n === 2 ? "Two" : "Three"} seat and ${n === 2 ? "two" : "three"} back cushions`)] };
}

/** The 3-seat sofa with a chaise frame clamped in front of its left seat (it fits either end). */
function chaise(W: number): CustomParams {
  const a = -W / 2 + AW, b = W / 2 - AW;
  const s = section(STRAIGHT, "", a, b, [-1, 1], 3, "Seat frame");
  const CWd = 700, CL = 1320 - 880;
  const c0 = a, c1 = a + CWd, cz1 = ZF + CL;
  const ch = compound("CH", "Chaise frame", [
    piece(STRAIGHT, [c0, c1, LEG, SY1, ZF, ZF + RAIL]),
    piece(STRAIGHT, [c0, c1, LEG, SY1, cz1 - RAIL, cz1]),
    piece(STRAIGHT, [c0, c0 + RAIL, LEG, SY1, ZF, cz1]),
    piece(STRAIGHT, [c1 - RAIL, c1, LEG, SY1, ZF, cz1]),
    ...spread(c0 + 140, c1 - 140, 3).map((x) => piece(STRAIGHT, [x - 25, x + 25, SY1 - 12, SY1, ZF + RAIL, cz1 - RAIL])),
  ], "soft");
  const chLegs = [c0 + 50, c1 - 50].map((x, i) => ({ e: (i ? 1 : -1) as -1 | 1, arm: "CH", leg: `CHL${i}`, x: x - (i ? 1 : -1) * 0, z: cz1 - 50 }));
  const legParts = chLegs.map((q) => box(q.leg, "Leg", STRAIGHT, [q.x - 22, q.x + 22, 0, LEG, q.z - 22, q.z + 22], "wood"));
  // the seat cushions: two ordinary ones and the long chaise cushion where the left one would be
  const parts = s.parts.filter((p) => !s.seats.includes(p.id));
  const rest = (b - c1) / 2;
  const seats = ["CC", "C1", "C2"];
  parts.push(box("CC", "Chaise cushion", STRAIGHT, [c0 + 3, c1 - 3, SY1, SEAT, CZ, cz1], "soft"));
  for (let i = 0; i < 2; i++) parts.push(box(`C${i + 1}`, "Seat cushion", STRAIGHT, [c1 + rest * i + 3, c1 + rest * (i + 1) - 3, SY1, SEAT, CZ, ZF], "soft"));
  parts.push(ch, ...legParts);
  const clampAt = spread(c0 + 180, c1 - 180, 2).map((x): Vec3 => [x, 260, ZF]);
  const legCaps = chLegs.map((q) => ({ ...q, x: q.x + q.e * 28 })); // the chaise's caps sit on its side rails
  const steps: CustomStep[] = [
    ...sectionSteps(s, "+z", { what: "sofa" }),
    {
      title: "Screw two legs into the chaise frame",
      detail: "Turn it upside down. A big washer on each leg's bolt, into the corners at the far end, by hand.",
      add: ["CH", ...chLegs.map((q) => q.leg)],
      fix: chLegs.map((q) => fx(LEGW.kind, [[q.x, LEG, q.z]], [0, 1, 0], { ...LEGW, on: "CH" })),
      kind: "legs",
      warnings: ["hand"],
      tools: [],
    },
    {
      title: "Fit the cover caps and felt pads on the chaise legs",
      fix: [
        ...legCaps.map((q) => fx(CAP.kind, [[q.x, LEG - 30, q.z - 28]], [0, 0, 1], { ...CAP, on: "CH" })),
        fx(PAD.kind, chLegs.map((q): Vec3 => [q.x, 0, q.z]), [0, 1, 0], { ...PAD }),
      ],
      kind: "legs",
      tools: [],
    },
    {
      title: "Zip the chaise frame into its cover",
      detail: "Lay the chaise cushion's base cover out, set the frame in upside down with its legs through the holes, then close it round the frame.",
      kind: "general",
      tools: [],
    },
    {
      title: "Clamp the chaise to the front of the seat",
      detail: "Lay the sofa on its back together. Hold the chaise against the seat frame's front rail, hook the two clamps over both rails and tighten their screws by hand.",
      fix: [fx("clamp", clampAt, [0, 0, -1], { len: 120, dia: 40, name: "Clamp", on: "CH", mate: s.seat })],
      pose: "+z",
      people: 2,
      kind: "join",
      warnings: ["two", "hand"],
      tools: [],
    },
    { title: "Stand it up together", detail: "Lift it by the sofa frame, not by the chaise.", pose: "+y", people: 2, kind: "standup", tools: [] },
    ...cushionSteps(seats, s.backs, "Two seat cushions, the chaise cushion and three back cushions"),
  ];
  return { parts, steps };
}

/** Two one-armed sections hung on a corner unit at the back left: one along the back, one coming forward. */
function corner(): CustomParams {
  const K = 880, E = 1300; // corner unit and half the outside length
  const k1 = -E + K; // where the corner unit ends and a section starts
  const back = section({ ox: 0, oz: -E + 440, swap: false }, "b", k1, E - AW, [1], 2, "Seat frame");
  const wing = section({ ox: -E + 440, oz: 0, swap: true }, "w", k1, E - AW, [1], 2, "Seat frame");
  const S = STRAIGHT;
  const base = box("KB", "Corner base", S, [-E, k1, LEG, SY1, -E, k1], "soft");
  const panel = (id: string, alongX: boolean) =>
    compound(id, "Corner back panel", alongX
      ? [piece(S, [-E, k1, SY1, BACK, -E + BT - 20, -E + BT]), piece(S, [-E, k1, BACK - 30, BACK, -E, -E + BT]), piece(S, [-E, k1, SY1, SY1 + 40, -E, -E + BT]), piece(S, [k1 - RAIL, k1, SY1, BACK, -E, -E + BT])]
      : [piece(S, [-E + BT - 20, -E + BT, SY1, BACK, -E + BT, k1]), piece(S, [-E, -E + BT, BACK - 30, BACK, -E + BT, k1]), piece(S, [-E, -E + BT, SY1, SY1 + 40, -E + BT, k1]), piece(S, [-E, -E + BT, SY1, BACK, k1 - RAIL, k1])], "soft");
  const pa = panel("KA", true), pb = panel("KP", false);
  const kLegs = [[-E + 60, -E + 60], [k1 - 60, -E + 60], [k1 - 60, k1 - 60], [-E + 60, k1 - 60]].map(([x, z], i) => ({ e: (x < -E + K / 2 ? -1 : 1) as -1 | 1, arm: "KB", leg: `KL${i}`, x, z }));
  const legParts = kLegs.map((q) => box(q.leg, "Leg", S, [q.x - 22, q.x + 22, 0, LEG, q.z - 22, q.z + 22], "wood"));
  const inner = -E + BT, cz = -E + 440 + CZ; // the corner's seat starts where the sections' seat cushions do
  const cushions = [
    box("KC", "Corner seat cushion", S, [cz + 3, k1 - 3, SY1, SEAT, cz + 3, k1 - 3], "soft"),
    box("KK0", "Corner back cushion", S, [inner + 4, k1 - 4, SY1, TOP, inner, cz], "soft"),
    box("KK1", "Corner back cushion", S, [inner, cz, SY1, TOP, cz + 4, k1 - 4], "soft"),
  ];
  const parts = [...back.parts, ...wing.parts, base, pa, pb, ...legParts, ...cushions];
  const BOLT = { kind: "bolt", len: 60, dia: 8 } as const;
  const down: Vec3 = [0, -1, 0];
  const boltsA = spread(-E + 250, k1 - 200, 2).map((x): Vec3 => [x, SY1, -E + BT / 2]);
  const boltsB = spread(-E + BT + 150, k1 - 200, 2).map((z): Vec3 => [-E + BT / 2, SY1, z]);
  const boltsAB = [450, 600].map((y): Vec3 => [-E + BT / 2, y, -E + BT]);
  const hooks: [Vec3][] = [
    ...spread(-E + BT + 120, k1 - 140, 2).map((z): [Vec3] => [[k1, 250, z]]),
    ...spread(-E + BT + 120, k1 - 140, 2).map((x): [Vec3] => [[x, 250, k1]]),
  ];
  const HOOK = { kind: "hook", len: 60, dia: 40, name: "U hook" } as const;
  const CSK = { kind: "bolt", len: 16, dia: 6, name: "Countersunk bolt" } as const;
  const PIN = { kind: "stud", len: 60, dia: 12, name: "Pin" } as const;
  const steps: CustomStep[] = [
    ...sectionSteps(back, "+z", { what: "section" }),
    ...sectionSteps(wing, "+x", { what: "section" }),
    {
      title: "Bolt the first back panel onto the corner base",
      detail: "Stand it on the back edge of the base. A washer on each bolt, down through its bottom rail, tightened with the Allen key.",
      add: ["KB", "KA"],
      fix: [fx(WASH.kind, boltsA, down, { ...WASH, on: "KA" }), fx(BOLT.kind, boltsA, down, { ...BOLT, on: "KA", mate: "KB" })],
      pose: "+y",
      kind: "bolts",
      tools: ["allen"],
    },
    {
      title: "Bolt on the second back panel",
      detail: "Along the other back edge, the same way.",
      add: ["KP"],
      fix: [fx(WASH.kind, boltsB, down, { ...WASH, on: "KP" }), fx(BOLT.kind, boltsB, down, { ...BOLT, on: "KP", mate: "KB" })],
      kind: "bolts",
      tools: ["allen"],
    },
    {
      title: "Bolt the two back panels together",
      detail: "Two bolts with washers through the first panel into the end of the second.",
      fix: [fx(WASH.kind, boltsAB, [0, 0, 1], { ...WASH, on: "KA" }), fx(BOLT.kind, boltsAB, [0, 0, 1], { ...BOLT, on: "KA", mate: "KP" })],
      kind: "bolts",
      tools: ["allen"],
    },
    {
      title: "Turn the corner upside down and screw in its legs",
      detail: "On a rug. A big washer on each leg's bolt, one leg into each corner of the base, by hand.",
      add: kLegs.map((q) => q.leg),
      fix: kLegs.map((q) => fx(LEGW.kind, [[q.x, LEG, q.z]], [0, 1, 0], { ...LEGW, on: "KB" })),
      pose: "-y",
      kind: "legs",
      warnings: ["floor", "hand"],
      tools: [],
    },
    {
      title: "Fit the cover caps and felt pads on its legs",
      fix: [
        ...kLegs.map((q) => fx(CAP.kind, [[q.x, LEG, q.z + (q.z < -E + K / 2 ? 30 : -30)]], [0, 1, 0], { ...CAP, on: "KB" })),
        fx(PAD.kind, kLegs.map((q): Vec3 => [q.x, 0, q.z]), [0, 1, 0], { ...PAD }),
      ],
      kind: "legs",
      tools: [],
    },
    {
      title: "Turn it over and screw on the four U hooks",
      detail: "Two on each open side of the base, a countersunk bolt through each with the Allen key. The sections hang on these.",
      fix: [
        fx(HOOK.kind, hooks.slice(0, 2).map((h) => h[0]), [-1, 0, 0], { ...HOOK, on: "KB" }),
        fx(HOOK.kind, hooks.slice(2).map((h) => h[0]), [0, 0, -1], { ...HOOK, on: "KB" }),
        fx(CSK.kind, hooks.slice(0, 2).map((h) => h[0]), [-1, 0, 0], { ...CSK, on: "KB" }),
        fx(CSK.kind, hooks.slice(2).map((h) => h[0]), [0, 0, -1], { ...CSK, on: "KB" }),
      ],
      pose: "+y",
      kind: "screws",
      tools: ["allen"],
    },
    { title: "Pull the cover over the corner", detail: "Over the back panels first, then down the sides, and fasten its strips under the base.", kind: "general", tools: [] },
    {
      title: "Push in the pins and hang the sections on the corner",
      detail: "A pin into the hole at the top of each back panel's open end. Lift each section together so its pin hole meets the pin, then lower it so the slots under its seat drop onto the hooks.",
      fix: [fx(PIN.kind, [[k1, BACK - 60, -E + BT / 2]], [-1, 0, 0], { ...PIN, on: "KA", mate: back.back }), fx(PIN.kind, [[-E + BT / 2, BACK - 60, k1]], [0, 0, -1], { ...PIN, on: "KP", mate: wing.back })],
      people: 2,
      kind: "join",
      warnings: ["two"],
      tools: [],
    },
    ...cushionSteps([...back.seats, "KC", ...wing.seats], [...back.backs, "KK0", "KK1", ...wing.backs], "Five seat cushions and six back cushions"),
  ];
  return { parts, steps };
}

/** The sofa-bed: armrests joined by three rods, the bed base between them, then the backrest hung on hooks. */
function sofaBed(): CustomParams {
  const W = 1850, D = 1050, AWb = 120, L = 70, z0 = -D / 2, z1 = D / 2;
  const a = -W / 2 + AWb, b = W / 2 - AWb; // inner faces of the armrests
  const S = STRAIGHT;
  const parts: CustomPart[] = [];
  const arm = (e: -1 | 1) => (e < 0 ? "AL" : "AR");
  const inner = (e: -1 | 1) => (e < 0 ? a : b);
  for (const e of [-1, 1] as const) {
    parts.push(box(arm(e), "Armrest", S, e < 0 ? [a - AWb, a, L, AH, z0, z1] : [b, b + AWb, L, AH, z0, z1], "soft"));
    const xi = inner(e);
    parts.push(box(`T${arm(e)}`, "Stop block", S, e < 0 ? [xi, xi + 40, 250, SY1, -70, 70] : [xi - 40, xi, 250, SY1, -70, 70], "wood"));
    for (const z of [z0 + 60, z1 - 60]) {
      const x = xi - e * (AWb / 2);
      parts.push(box(`L${arm(e)}${z < 0 ? "B" : "F"}`, "Leg", S, [x - 30, x + 30, 0, L, z - 30, z + 30], "wood"));
    }
  }
  const rodZ = [-330, 0, 330], rodY = 150;
  rodZ.forEach((z, i) => parts.push({ id: `R${i}`, name: "Rod", size: [b - a, 16, 16], pos: [0, rodY, z], shape: "cyl", material: "metal" }));
  parts.push(box("FB", "Base fabric", S, [a + 20, b - 20, rodY - 10, rodY - 6, -360, 360], "soft"));
  const bx = b - 40, bz0 = -345;
  parts.push(compound("BB", "Bed base", [
    piece(S, [-bx, bx, 90, SY1, z1 - 40, z1]),
    piece(S, [-bx, bx, 160, SY1, bz0, bz0 + 40]),
    piece(S, [-bx, -bx + 40, 160, SY1, bz0, z1]),
    piece(S, [bx - 40, bx, 160, SY1, bz0, z1]),
    ...spread(-bx + 200, bx - 200, 4).map((x) => piece(S, [x - 30, x + 30, SY1 - 20, SY1, bz0 + 40, z1 - 40])),
  ], "soft"));
  parts.push(box("M0", "Mattress section", S, [-bx, 0, SY1, SEAT, bz0, z1], "soft"), box("M1", "Mattress section", S, [0, bx, SY1, SEAT, bz0, z1], "soft"));
  parts.push(box("BK", "Backrest", S, [a, b, SY1, 860, z0, bz0], "soft"));
  parts.push(box("K0", "Back cushion", S, [a + 4, 0, SEAT, 1000, bz0, bz0 + 190], "soft"), box("K1", "Back cushion", S, [0, b - 4, SEAT, 1000, bz0, bz0 + 190], "soft"));

  const ends = [-1, 1] as const;
  const legPts = ends.flatMap((e) => [z0 + 60, z1 - 60].map((z) => ({ e, x: inner(e) - e * (AWb / 2), z, leg: `L${arm(e)}${z < 0 ? "B" : "F"}` })));
  const rodBolts = (e: -1 | 1) => rodZ.flatMap((z) => [[rodY, z], [rodY + 40, z - 30], [rodY + 40, z + 30]].map(([y, zz]): Vec3 => [inner(e), y, zz]));
  const blockBolts = (e: -1 | 1) => [-40, 40].map((z): Vec3 => [inner(e) - e * 40, 290, z]);
  const BOLTL = { kind: "bolt", len: 100, dia: 8 } as const;
  const BOLTS = { kind: "bolt", len: 16, dia: 8 } as const;
  const GUIDE = { kind: "clip", len: 30, dia: 24, name: "Guide" } as const;
  const OVAL = { kind: "glide", len: 3, dia: 40, name: "Felt pad" } as const;
  const steps: CustomStep[] = [
    {
      title: "Bolt a stop block to each armrest",
      detail: "Lay the armrests down with their inner sides up. Two long bolts through each block, tightened with the Allen key in its handle.",
      add: ["AL", "AR", "TAL", "TAR"],
      fix: ends.map((e) => fx(BOLTL.kind, blockBolts(e), [e, 0, 0], { ...BOLTL, on: `T${arm(e)}` })),
      kind: "bolts",
      warnings: ["floor"],
      tools: ["allen"],
    },
    {
      title: "Screw two legs into each armrest",
      detail: "A big washer on each leg's bolt, turned in by hand.",
      add: legPts.map((q) => q.leg),
      fix: legPts.map((q) => fx(LEGW.kind, [[q.x, L, q.z]], [0, 1, 0], { ...LEGW, on: arm(q.e) })),
      kind: "legs",
      warnings: ["hand"],
      tools: [],
    },
    { title: "Push in a cover cap beside each leg", fix: legPts.map((q) => fx(CAP.kind, [[inner(q.e), L + 22, q.z]], [q.e, 0, 0], { ...CAP, on: arm(q.e) })), kind: "general", tools: [] },
    { title: "Stick a felt pad under each leg", fix: [fx(PAD.kind, legPts.map((q): Vec3 => [q.x, 0, q.z]), [0, 1, 0], { ...PAD })], kind: "legs", tools: [] },
    { title: "Stick a felt pad on each stop block", detail: "On top, at its end, so the bed base slides on it quietly.", fix: ends.map((e) => fx(OVAL.kind, [[inner(e) + e * -20, SY1, 50]], [0, -1, 0], { ...OVAL, on: `T${arm(e)}` })), kind: "general", tools: [] },
    { title: "Pull the covers over the armrests", detail: "Fasten their strips under each armrest.", kind: "general", tools: [] },
    {
      title: "Bolt the three rods to one armrest",
      detail: "Cut the ties holding the rods together first. One of you holds the armrest up while the other turns three bolts through each rod's end plate.",
      add: ["R0", "R1", "R2"],
      fix: [fx(BOLTS.kind, rodBolts(-1), [-1, 0, 0], { ...BOLTS, on: "AL" })],
      people: 2,
      kind: "bolts",
      warnings: ["two"],
      tools: ["allen"],
    },
    { title: "Thread the base fabric onto the rods", detail: "Slide its pockets along the rods, smooth side up.", add: ["FB"], kind: "general", tools: [] },
    {
      title: "Bolt the rods to the other armrest",
      detail: "Hold it up against the free rod ends, then three bolts through each end plate.",
      fix: [fx(BOLTS.kind, rodBolts(1), [1, 0, 0], { ...BOLTS, on: "AR" })],
      people: 2,
      kind: "bolts",
      warnings: ["two"],
      tools: ["allen"],
    },
    {
      title: "Lift the bed base in between the armrests",
      detail: "Stick two felt pads on its wheel housings and three on its folding frame first. It rests on the stop blocks.",
      add: ["BB"],
      fix: [fx(OVAL.kind, [[-bx + 20, 120, z1], [bx - 20, 120, z1]], [0, 0, -1], { ...OVAL, on: "BB" }), fx(OVAL.kind, spread(-bx + 200, bx - 200, 3).map((x): Vec3 => [x, SY1, 100]), [0, -1, 0], { ...OVAL, len: 4, dia: 60, on: "BB" })],
      people: 2,
      kind: "join",
      warnings: ["two"],
      tools: [],
    },
    { title: "Click a guide onto each stop block", detail: "Push it along until it clicks, over the edge of the bed base.", fix: [fx(GUIDE.kind, ends.map((e): Vec3 => [inner(e) + e * -20, SY1, -40]), [0, -1, 0], { ...GUIDE, on: "BB" })], kind: "general", tools: [] },
    {
      title: "Lay the mattress sections on the bed base",
      detail: "Zip their covers on first. Lay them with the loops at the front, then fasten the cover strips under the base and fold the bed in.",
      add: ["M0", "M1"],
      kind: "cushions",
      tools: [],
    },
    {
      title: "Screw two hooks under the backrest and hang it",
      detail: "Pull its cover on, then a countersunk bolt through each hook at its bottom ends. Lift it in together so the hooks drop into the slots in the armrests.",
      add: ["BK"],
      fix: [fx("hook", [[a + 60, SY1, (z0 + bz0) / 2], [b - 60, SY1, (z0 + bz0) / 2]], [0, 1, 0], { len: 60, dia: 30, name: "Hook", on: "BK" }), fx("bolt", [[a + 60, SY1, (z0 + bz0) / 2], [b - 60, SY1, (z0 + bz0) / 2]], [0, 1, 0], { len: 30, dia: 6, name: "Countersunk bolt", on: "BK" })],
      people: 2,
      kind: "join",
      warnings: ["two"],
      tools: ["allen"],
    },
    { title: "Click in the last two guides", detail: "Fold the bed out, push a guide up onto each arm of the mechanism at the back until it clicks, and fold it back in.", fix: [fx(GUIDE.kind, ends.map((e): Vec3 => [inner(e) + e * -60, SY1 - 20, bz0]), [0, 0, 1], { ...GUIDE, on: "BB" })], kind: "general", tools: [] },
    { title: "Zip the covers onto the back cushions and stand them on the seat", add: ["K0", "K1"], from: { K0: [0, 260, 300], K1: [0, 260, 300] }, kind: "cushions", tools: [] },
  ];
  return { parts, steps };
}

/** The rocking and swivel armchair comes as one frame on its base: only the backrest bar goes on. */
function swivel(): CustomParams {
  const S = STRAIGHT;
  const W = 780, z0 = -400, z1 = 400, ab = 130, base = 150, sy = 330, arm = 650, bt = 140;
  const x = W / 2, xi = x - ab;
  const frame = compound("F", "Armchair frame", [
    { shape: "cyl", size: [640, 30, 640], pos: [0, 15, 0] },
    piece(S, [-200, 200, 30, base, -200, 200]),
    piece(S, [-x, x, base, sy, z0 + bt, z1]),
    piece(S, [-x, -xi, base, arm, z0, z1]),
    piece(S, [xi, x, base, arm, z0, z1]),
    piece(S, [-xi, xi, base, 600, z0, z0 + 20]),
    piece(S, [-xi, xi, 560, 600, z0, z0 + bt]),
    piece(S, [-xi, xi, base, base + 40, z0, z0 + bt]),
  ], "soft");
  const bar = box("BR", "Backrest bar", S, [-xi, xi, 600, 760, z0, z0 + bt], "soft");
  const seat = box("C", "Seat cushion", S, [-xi + 3, xi - 3, sy, 470, z0 + bt + 150, z1], "soft");
  const backC = box("K", "Back cushion", S, [-xi + 4, xi - 4, sy, 980, z0 + bt, z0 + bt + 150], "soft");
  const studs = [-150, 150].map((xx): Vec3 => [xx, 600, z0 + bt / 2]);
  const nuts = [-150, 150].map((xx): Vec3 => [xx, 560, z0 + bt / 2]);
  const steps: CustomStep[] = [
    { title: "Unpack the chair frame", detail: "Leave the two cable ties under it in place for now: they hold the rocking mechanism still while you work.", add: ["F"], kind: "general", tools: [] },
    { title: "Screw two studs into the backrest bar", detail: "Into the holes along its bottom edge, by hand.", fix: [fx(STUD.kind, studs, [0, 1, 0], { ...STUD, len: 70, on: "BR", mate: "F" })], kind: "bolts", warnings: ["hand"], tools: [] },
    {
      title: "Fasten the bar on top of the back",
      detail: "Lower it so the studs go through the back's top rail, its rounded side to the front. A washer and a wing nut on each from below.",
      fix: [fx(WASH.kind, nuts, [0, 1, 0], { ...WASH, on: "F" }), fx(WING.kind, nuts, [0, 1, 0], { ...WING, on: "F" })],
      kind: "bolts",
      warnings: ["hand"],
      tools: [],
    },
    { title: "Pull the cover over the frame", detail: "Down over the back and the armrests, then fasten its strips under the seat all round.", kind: "general", tools: [] },
    ...cushionSteps(["C"], ["K"], "One seat and one back cushion"),
    { title: "Cut the two cable ties under the chair", detail: "Only now, with the chair standing on the floor. Then it can rock and turn.", kind: "general", tools: ["knife"] },
  ];
  return { parts: [frame, bar, seat, backC], steps };
}

function recipe(s: ProductSpec): CustomParams | null {
  const v = s.variant.toLowerCase();
  if (/rocking|swivel/.test(v)) return swivel();
  if (/sofa-bed|sofa bed/.test(v)) return sofaBed();
  if (/corner/.test(v)) return corner();
  if (/chaise/.test(v)) return chaise(2330);
  if (/^armchair/.test(v)) return sofa(930, 1, "Seat frame");
  if (/^3-seat sofa/.test(v)) return sofa(2330, 3, "Seat frame");
  if (/^2-seat sofa/.test(v)) return sofa(1640, 2, "Seat frame");
  return null;
}

/** The recipe, with each step's tools exactly as the manual shows them (wing nuts are turned by hand). */
function build(b: PlanBuilder, s: ProductSpec): boolean {
  const r = recipe(s);
  if (!r) return false;
  const start = b.steps.length;
  buildCustom(b, { ...s, custom: r });
  r.steps.forEach((st, i) => {
    const bs = b.steps[start + i];
    if (bs && st.tools && bs.title === st.title) bs.tools = [...st.tools];
  });
  return true;
}

const family: Family = { names: ["SALTSJÖBADEN"], build, recipe };
export default family;
