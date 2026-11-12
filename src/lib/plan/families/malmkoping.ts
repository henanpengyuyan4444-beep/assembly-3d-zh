import type { Family } from "./family";
import type { Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/**
 * MALMKÖPING, from IKEA's manuals (one for the seat sections, one for the armrests). Every seat is its own section:
 * a padded backrest and a wooden seat frame of four rails screwed together. The frames are built flat on the floor and
 * bolted to each other, then the backrests lie on their backs, are bolted side by side, take two studs each and the
 * frames are lowered onto them and nutted. The armrests bolt on at the ends, the legs and felt pads go in while it
 * still lies on its back, and it is stood up. Each pull-out seat is built upside down (two hooks, a front panel on
 * four studs, two legs), turned over and hooked onto its frame; the covers are zipped, the seats pushed home and the
 * back cushions dropped into the top of the backrests.
 */

const SW = 730; // one seat section, wide
const AW = 170; // an armrest
const D = 920;
const Z0 = -D / 2;
const LEG = 40;
const BT = 200; // backrest, thick
const BACK_TOP = 700;
const ZB = Z0 + BT; // front face of the backrests
const FR0 = 190, FR1 = 250; // the seat frame rails, bottom and top
const SEAT = 450;
const ARM = 640;
const FZ0 = 370; // pull-out seat's front panel, from here to the front

const FRAME_SCREW: HwDef = { kind: "screw", len: 70, dia: 6, name: "Frame screw" };
const LONG_BOLT: HwDef = { kind: "bolt", len: 110, dia: 8 };
const BOLT: HwDef = { kind: "bolt", len: 70, dia: 8 };
const ARM_BOLT: HwDef = { kind: "bolt", len: 90, dia: 8 };
const SHORT_BOLT: HwDef = { kind: "bolt", len: 30, dia: 8 };
const STUD: HwDef = { kind: "stud", len: 80, dia: 8 };
const NUT: HwDef = { kind: "nut", len: 6, dia: 8 };
const WASHER: HwDef = { kind: "washer", len: 2, dia: 24 };
const SPRING: HwDef = { kind: "washer", len: 2, dia: 14, name: "Spring washer" };
const HOOK: HwDef = { kind: "hook", len: 55, dia: 40, name: "Seat hook" };
const PAD: HwDef = { ...HW.glide, name: "Felt pad" };

interface Section {
  x: number;
  back: string;
  sides: [string, string];
  cross: [string, string]; // back and front rail
  leg: string; // under the backrest
  seat: string;
  front: string;
  feet: [string, string]; // under the pull-out seat's front
  cushion: string;
}

type StepIn = { title: string; detail?: string; tools?: ToolId[]; people?: 1 | 2; pose?: Pose; warnings?: WarnId[]; kind: StepKind; repeat?: number; scene?: string };

/** Seats in a row, from the product's name: null for the MALMKÖPING sets these manuals don't cover. */
function seatsOf(s: ProductSpec): number {
  const v = `${s.variant} ${s.slug ?? ""}`.toLowerCase();
  if (/chaise|corner|bed/.test(v)) return 0;
  if (/armchair|1-seat/.test(v)) return 1;
  if (/loveseat|2-seat/.test(v)) return 2;
  if (/3-seat/.test(v)) return 3;
  if (/4-seat/.test(v)) return 4;
  return 0;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const n = seatsOf(s);
  if (!n) return false;
  const W = n * SW + 2 * AW;
  const X = (i: number) => -W / 2 + AW + SW * (i + 0.5);
  const joints = Array.from({ length: n - 1 }, (_, i) => -W / 2 + AW + SW * (i + 1));
  const big = n > 1;

  let pose: Pose = "+y";
  const st = (d: StepIn, body: () => void) => {
    const side = !!d.scene && d.scene !== "main";
    if (d.pose && !side) pose = d.pose;
    const w = new Set<WarnId>(d.warnings ?? []);
    if (d.people === 2) w.add("two");
    b.step({ ...d, tools: d.tools ?? [], people: d.people ?? 1, pose: side ? (d.pose ?? "+y") : pose, warnings: [...w].slice(0, 3) }, body);
  };
  const fit = (def: HwDef, list: FitOpts[], gap = 0.08) => b.fits(def, list, gap);

  const tBack = b.part("Backrest", [SW, BACK_TOP - LEG, BT], { material: "soft" });
  const tSide = b.part("Frame side rail", [40, FR1 - FR0, 600], { material: "wood" });
  const tCross = b.part("Frame cross rail", [SW - 80, FR1 - FR0, 40], { material: "wood" });
  const tArm = b.part("Armrest", [AW, ARM - LEG, D], { material: "soft" });
  const tLeg = b.part("Leg", [50, LEG, 50], { shape: "cyl", material: "wood" });
  const tTall = b.part("Centre leg", [60, FR0, 60], { shape: "cyl", material: "wood" });
  const tSeat = b.part("Pull-out seat", [SW - 10, SEAT - FR1, D / 2 - ZB], { material: "soft" });
  const tFront = b.part("Seat front panel", [SW - 10, FR1 - LEG, D / 2 - FZ0], { material: "soft" });
  const cush = b.compound(
    "Back cushion",
    [
      { shape: "box", size: [SW - 20, 1000 - BACK_TOP, 170], pos: [0, (BACK_TOP + 1000) / 2, Z0 + 20 + 85] }, // headrest, on top of the backrest
      { shape: "box", size: [SW - 40, 200, 180], pos: [0, SEAT + 100, ZB + 90] }, // lumbar roll, on the seat
    ],
    { material: "soft" },
  );

  const sideX = (x: number, sx: number) => x + sx * (SW / 2 - 20);
  const zSide = (ZB + FZ0 - 30) / 2;
  const zCB = ZB + 20, zCF = FZ0 - 50;
  const secs: Section[] = Array.from({ length: n }, (_, i) => {
    const x = X(i);
    const fy = (FR0 + FR1) / 2;
    return {
      x,
      back: b.place(tBack, [x, (LEG + BACK_TOP) / 2, Z0 + BT / 2]),
      sides: [b.place(tSide, [sideX(x, -1), fy, zSide]), b.place(tSide, [sideX(x, 1), fy, zSide])],
      cross: [b.place(tCross, [x, fy, zCB]), b.place(tCross, [x, fy, zCF])],
      leg: b.place(tLeg, [x, LEG / 2, Z0 + 100]),
      seat: b.place(tSeat, [x, (FR1 + SEAT) / 2, (ZB + D / 2) / 2]),
      front: b.place(tFront, [x, (LEG + FR1) / 2, (FZ0 + D / 2) / 2]),
      feet: [b.place(tLeg, [x - (SW / 2 - 80), LEG / 2, (FZ0 + D / 2) / 2]), b.place(tLeg, [x + (SW / 2 - 80), LEG / 2, (FZ0 + D / 2) / 2])],
      cushion: b.place(cush.type, [x + cush.mid[0], cush.mid[1], cush.mid[2]]),
    };
  });
  const armX = [-W / 2 + AW / 2, W / 2 - AW / 2];
  const arms = armX.map((x) => b.place(tArm, [x, (LEG + ARM) / 2, 0]));
  const armLegs = armX.flatMap((x) => [Z0 + 80, D / 2 - 80].map((z) => b.place(tLeg, [x, LEG / 2, z])));
  const talls = joints.map((xj) => b.place(tTall, [xj, FR0 / 2, zCF]));

  /* ---------- the fittings, in the finished sofa ---------- */
  const frameScrews = (c: Section): FitOpts[] =>
    [-1, 1].flatMap((sx, k) =>
      [zCB, zCF].flatMap((z) => [FR0 + 16, FR1 - 16].map((y) => ({ on: c.sides[k], at: [c.x + sx * (SW / 2), y, z] as Vec3, dir: [-sx, 0, 0] as Vec3, mate: z === zCB ? c.cross[0] : c.cross[1] }))),
    );
  const frameJoin = joints.map((xj, j) => ({ xj, a: secs[j], c: secs[j + 1] }));
  const frameZ = [ZB + 120, FZ0 - 140];
  const studX = (c: Section) => [c.x - (SW / 2 - 220), c.x + (SW / 2 - 220)];
  const yStud = (FR0 + FR1) / 2;
  const ends: { sx: number; c: Section; arm: string }[] = [
    { sx: -1, c: secs[0], arm: arms[0] },
    { sx: 1, c: secs[n - 1], arm: arms[1] },
  ];
  const hookX = (c: Section) => [c.x - (SW / 2 - 100), c.x + (SW / 2 - 100)];
  const zHook = zCB + 40;
  const frontStudX = (c: Section) => [-(SW / 2 - 70), -(SW / 2 - 230), SW / 2 - 230, SW / 2 - 70].map((dx) => c.x + dx);
  const zFront = (FZ0 + D / 2) / 2;
  const seatFits = (c: Section) => ({
    hooks: hookX(c).map((x) => ({ on: c.seat, at: [x, FR1, zHook] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })),
    bolts: hookX(c).flatMap((x) => [-20, 20].map((dx) => ({ on: c.seat, at: [x + dx, FR1 - 6, zHook] as Vec3, dir: [0, 1, 0] as Vec3 }))),
    studs: frontStudX(c).map((x) => ({ on: c.seat, at: [x, FR1, zFront] as Vec3, dir: [0, 1, 0] as Vec3, travel: 120, spin: 3 })),
    washers: frontStudX(c).map((x) => ({ on: c.front, at: [x, LEG, zFront] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })),
    springs: frontStudX(c).map((x) => ({ on: c.front, at: [x, LEG - 2, zFront] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })),
    nuts: frontStudX(c).map((x) => ({ on: c.front, at: [x, LEG - 5, zFront] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })),
    pads: c.feet.map((f) => ({ on: f, at: [b.partItem(f).final.pos[0], 0, zFront] as Vec3, dir: [0, 1, 0] as Vec3, hole: false as const })),
  });
  const padOn = (k: string): FitOpts => {
    const p = b.partItem(k).final.pos;
    return { on: k, at: [p[0], 0, p[2]], dir: [0, 1, 0], hole: false };
  };

  /* ---------- the seat frames, flat on the floor ---------- */
  const rails = secs.flatMap((c) => [...c.sides, ...c.cross]);
  const fc: Vec3 = [0, (FR0 + FR1) / 2, zSide];
  const rel = (k: string, c0: Vec3): Vec3 => {
    const p = b.partItem(k).final.pos;
    return [p[0] - c0[0], p[1] - c0[1], p[2] - c0[2]];
  };
  st(
    {
      title: big ? "Screw the seat frames together" : "Screw the seat frame together",
      detail: `Four rails make each frame, two screws in each corner${big ? `: ${8 * n} in all` : ""}. Use the holes on the face that has them close to the edge.`,
      tools: ["allen"],
      kind: "screws",
      scene: "frames",
      warnings: ["floor"],
    },
    () => {
      b.stagger(0.12);
      for (const k of rails) b.stage(k, rel(k, fc), [0, 0, 0], [0, 160, 0]);
      b.then(0.15);
      fit(FRAME_SCREW, secs.flatMap(frameScrews), 0.05);
    },
  );
  if (big)
    st(
      {
        title: "Bolt the frames together",
        detail: "Side by side on the floor. Two long bolts through the rails at each join, a washer and a nut on the other side, tightened with the box spanner.",
        tools: ["allen", "wrench"],
        kind: "bolts",
        scene: "frames",
      },
      () => {
        const at = (x: number, z: number): Vec3 => [x, yStud, z];
        fit(LONG_BOLT, frameJoin.flatMap((j) => frameZ.map((z) => ({ on: j.a.sides[1], at: at(j.xj - 40, z), dir: [1, 0, 0] as Vec3, mate: j.c.sides[0] }))), 0.12);
        b.then(0.1);
        fit(WASHER, frameJoin.flatMap((j) => frameZ.map((z) => ({ on: j.c.sides[0], at: at(j.xj + 40, z), dir: [-1, 0, 0] as Vec3, hole: false as const }))));
        fit(NUT, frameJoin.flatMap((j) => frameZ.map((z) => ({ on: j.c.sides[0], at: at(j.xj + 44, z), dir: [-1, 0, 0] as Vec3, hole: false as const }))));
      },
    );

  /* ---------- the backrests, lying on their backs ---------- */
  const backs = secs.map((c) => c.back);
  const studs = () =>
    fit(
      STUD,
      secs.flatMap((c) => studX(c).map((x) => ({ on: c.back, at: [x, yStud, ZB] as Vec3, dir: [0, 0, -1] as Vec3, travel: 120, spin: 3 }))),
      0.12,
    );
  if (big) {
    st(
      {
        title: "Bolt the backrests together",
        detail: "Lay them on their backs, side by side, and push them together. Two bolts at each join, with a washer and a nut tightened with the box spanner.",
        tools: ["allen", "wrench"],
        kind: "bolts",
        pose: "+z",
        people: 2,
        warnings: ["floor"],
      },
      () => {
        b.stagger(0.3);
        backs.forEach((k, i) => b.add(k, [i === 0 ? -300 : 300, 0, 200]));
        b.then(0.15);
        const pts = (xj: number, dx: number) => [180, 520].map((y) => [xj + dx, y, Z0 + 100] as Vec3);
        fit(BOLT, frameJoin.flatMap((j) => pts(j.xj, -30).map((at) => ({ on: j.a.back, at, dir: [1, 0, 0] as Vec3, mate: j.c.back }))), 0.12);
        b.then(0.1);
        fit(WASHER, frameJoin.flatMap((j) => pts(j.xj, 40).map((at) => ({ on: j.c.back, at, dir: [-1, 0, 0] as Vec3, hole: false as const }))));
        fit(NUT, frameJoin.flatMap((j) => pts(j.xj, 44).map((at) => ({ on: j.c.back, at, dir: [-1, 0, 0] as Vec3, hole: false as const }))));
      },
    );
    st({ title: "Screw the studs into the backrests", detail: `Two in each, by hand, into the holes along the bottom edge: ${2 * n} in all.`, kind: "bolts", warnings: ["hand"] }, studs);
  } else
    st(
      { title: "Lay the backrest on its back and screw in two studs", detail: "On a rug, front up. Turn the studs into the two holes near its bottom edge by hand.", kind: "bolts", pose: "+z", warnings: ["floor", "hand"] },
      () => {
        b.add(backs[0], [0, 0, 260]);
        b.then(0.15);
        studs();
      },
    );
  st(
    {
      title: big ? "Lower the seat frames onto the studs" : "Lower the seat frame onto the studs",
      detail: "Upright, with the rail that has the holes at the bottom, so the studs come through it.",
      kind: "join",
      people: big ? 2 : 1,
    },
    () => {
      b.stagger(0);
      for (const k of rails) b.add(k, [0, 0, 420]);
    },
  );
  st(
    {
      title: "Put on the washers and nuts",
      detail: `A washer and a nut on each stud, tightened with the box spanner: ${2 * n} of each.`,
      tools: ["wrench"],
      kind: "bolts",
    },
    () => {
      const pts = secs.flatMap((c) => studX(c).map((x) => ({ c, x })));
      fit(WASHER, pts.map(({ c, x }) => ({ on: c.cross[0], at: [x, yStud, zCB + 20] as Vec3, dir: [0, 0, -1] as Vec3, hole: false as const })));
      fit(NUT, pts.map(({ c, x }) => ({ on: c.cross[0], at: [x, yStud, zCB + 24] as Vec3, dir: [0, 0, -1] as Vec3, hole: false as const })));
    },
  );

  /* ---------- armrests, legs ---------- */
  st(
    {
      title: "Bolt on the armrests",
      detail: "Push one against each end and drive two long bolts from the armrest bag through the frame into it.",
      tools: ["allen"],
      kind: "bolts",
      people: 2,
    },
    () => {
      b.stagger(0.4);
      ends.forEach((e) => b.add(e.arm, [e.sx * 360, 0, 0]));
      b.then(0.15);
      fit(ARM_BOLT, ends.flatMap((e) => frameZ.map((z) => ({ on: e.c.sides[e.sx < 0 ? 0 : 1], at: [e.c.x + e.sx * (SW / 2 - 40), yStud, z] as Vec3, dir: [e.sx, 0, 0] as Vec3, mate: e.arm }))), 0.12);
    },
  );
  st(
    { title: "Fix the armrests at the bottom", detail: "One more bolt for each, from inside the backrest near the floor end.", tools: ["allen"], kind: "bolts" },
    () => fit(BOLT, ends.map((e) => ({ on: e.c.back, at: [e.c.x + e.sx * (SW / 2 - 40), 150, Z0 + 100] as Vec3, dir: [e.sx, 0, 0] as Vec3, mate: e.arm })), 0.2),
  );
  const shortLegs = [armLegs[0], armLegs[1], ...secs.map((c) => c.leg), armLegs[2], armLegs[3]];
  st(
    { title: "Screw in the short legs", detail: `Two under each armrest and one under each backrest: ${shortLegs.length} in all. Clockwise by hand until snug.`, kind: "legs", warnings: ["hand"] },
    () => {
      b.stagger(0.18);
      for (const k of shortLegs) b.add(k, [0, -220, 0], { spin: 2 });
    },
  );
  if (talls.length)
    st(
      { title: talls.length > 1 ? "Screw in the tall centre legs" : "Screw in the tall centre leg", detail: "Under the front of each join between two seat frames. By hand.", kind: "legs", warnings: ["hand"] },
      () => {
        b.stagger(0.3);
        for (const k of talls) b.add(k, [0, -260, 0], { spin: 2 });
      },
    );
  st(
    { title: "Stick a felt pad under each leg", detail: "Peel them off the sheet and press them on firmly.", kind: "general" },
    () => fit(PAD, [...shortLegs, ...talls].map(padOn), 0.05),
  );
  st(
    { title: big ? "Stand the sofa up together" : "Stand the armchair up", detail: "Tip it forward onto its legs. Lift by the frame, never by the legs.", kind: "standup", pose: "+y", people: big ? 2 : 1 },
    () => {},
  );

  /* ---------- the pull-out seat, built upside down ---------- */
  const c0 = secs[0];
  const sf = seatFits(c0);
  const sc: Vec3 = [c0.x, (LEG + SEAT) / 2, (ZB + D / 2) / 2];
  const rep = n > 1 ? n : undefined;
  const sst = (d: Omit<StepIn, "scene" | "repeat">, body: () => void) => st({ ...d, scene: "seat", repeat: rep, pose: d.pose ?? "-y" }, body);
  const word = big ? "each seat" : "the seat";
  sst(
    { title: "Bolt the two hooks onto the seat", detail: `Lay ${word} upside down on a rug, springs up. The hooks go at the back edge, two short bolts each.`, tools: ["allen"], kind: "bolts", warnings: ["floor"] },
    () => {
      b.stage(c0.seat, rel(c0.seat, sc), [0, 0, 0], [0, -200, 0]);
      b.then(0.15);
      fit(HOOK, sf.hooks, 0.2);
      b.then(0.1);
      fit(SHORT_BOLT, sf.bolts, 0.1);
    },
  );
  sst({ title: "Screw four studs into the front edge", detail: "By hand, into the holes along the front of the seat.", kind: "bolts", warnings: ["hand"] }, () => fit(STUD, sf.studs, 0.12));
  sst({ title: "Lower the front panel onto the studs", kind: "join" }, () => b.stage(c0.front, rel(c0.front, sc), [0, 0, 0], [0, -260, 0]));
  sst(
    { title: "Tighten the front panel", detail: "A washer, a spring washer and a nut on each stud, with the box spanner.", tools: ["wrench"], kind: "bolts" },
    () => {
      fit(WASHER, sf.washers);
      fit(SPRING, sf.springs);
      fit(NUT, sf.nuts);
    },
  );
  sst({ title: "Screw two short legs into the front panel", detail: "By hand, until snug.", kind: "legs", warnings: ["hand"] }, () => {
    b.stagger(0.3);
    for (const k of c0.feet) b.stage(k, rel(k, sc), [0, 0, 0], [0, -200, 0]);
  });
  sst({ title: "Stick on the felt pads and turn the seat over", detail: "One under each of the two legs.", kind: "general" }, () => fit(PAD, sf.pads, 0.2));

  /* ---------- seats in, cushions on ---------- */
  st(
    {
      title: big ? "Lay the seats onto the frames" : "Lay the seat onto the frame",
      detail: "Front legs on the floor. Lower the back so the two hooks drop over the back rail of the frame.",
      kind: "join",
      pose: "+y",
      people: big ? 2 : 1,
    },
    () => {
      secs.forEach((c, i) => {
        b.stagger(0);
        for (const k of [c.seat, c.front, ...c.feet]) b.add(k, [0, 260, 360]);
        if (i > 0) {
          const f = seatFits(c);
          for (const [def, list] of [[HOOK, f.hooks], [SHORT_BOLT, f.bolts], [STUD, f.studs], [WASHER, f.washers], [SPRING, f.springs], [NUT, f.nuts], [PAD, f.pads]] as [HwDef, FitOpts[]][]) for (const o of list) b.preset(def, o);
        }
        b.wait(0.25);
      });
    },
  );
  st({ title: "Zip the seat covers to the backrests", detail: "Close the zip along the back of each seat, from one end to the other.", kind: "cushions" }, () => {});
  st({ title: big ? "Push the seats home" : "Push the seat home", detail: "Lift the front a little and push it back until the two catches underneath click.", kind: "join" }, () => {});
  st(
    {
      title: "Drop in the back cushions",
      detail: "The two prongs on each go down into the slots in the top of the backrest. Leave at least 10 cm to the wall so the headrests can tilt.",
      kind: "cushions",
    },
    () => {
      b.stagger(0.3);
      for (const c of secs) b.add(c.cushion, [0, 300, 0]);
    },
  );
  return true;
}

const family: Family = { names: ["MALMKÖPING"], build };
export default family;
