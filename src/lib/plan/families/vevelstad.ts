import type { PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";
import { rotate } from "../math";
import type { Family } from "./family";

/*
 * VEVELSTAD, read from IKEA's two bed frame manuals (single/twin and double) and the TOLKNING headboard's.
 *
 * An open frame of white steel: four round tube legs and four flat rails, no boards at the ends. The head and foot
 * rails are laid on a rug and a leg bolted to each end of them. One end is stood up and the side rails (ledge facing
 * in) are bolted to its legs, two bolts a leg, then two people lift the other end onto them. Two curved stiffening
 * bars are screwed inside the rails at a corner, caps are tapped into the legs, slat holders clip into the end
 * rails and anti-slip strips go along the ledges before the slatted base is rolled out (sold separately).
 * The double adds a centre beam on two legs, screwed to the middle of both end rails, and holders for two bases.
 * Each TOLKNING rattan headboard has two legs screwed into its bottom edge and just stands behind the bed.
 */

type StepOpts = {
  title: string;
  detail?: string;
  tools?: ToolId[];
  pose?: Pose;
  scene?: string;
  kind?: StepKind;
  warnings?: WarnId[];
  people?: 1 | 2;
  repeat?: number;
  check?: "square";
};
const step = (b: PlanBuilder, o: StepOpts, body: () => void = () => {}) =>
  b.step({ kind: "general", ...o, warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const sg = (i: number) => (i === 0 ? -1 : 1);
const pts = (on: string, list: Vec3[], dir: Vec3, mate?: string, o: Partial<FitOpts> = {}): FitOpts[] => list.map((at) => ({ on, at, dir, mate, ...o }));

/** Show parts in another scene as they sit in the product, turned by `rot` about `pivot` and moved to `at`. */
function lay(b: PlanBuilder, keys: string[], pivot: Vec3, at: Vec3, rot: Vec3, from: Vec3 = [0, 160, 0]) {
  for (const k of keys) {
    const it = b.partItem(k);
    const p = rotate([it.final.pos[0] - pivot[0], it.final.pos[1] - pivot[1], it.final.pos[2] - pivot[2]], rot);
    b.stage(k, [p[0] + at[0], p[1] + at[1], p[2] + at[2]], rot, from);
  }
}

const FRAME_BOLT: HwDef = { kind: "bolt", len: 30, dia: 6, name: "Frame bolt" };
const BAR_BOLT: HwDef = { kind: "bolt", len: 12, dia: 6, name: "Countersunk bolt" };
const BEAM_BOLT: HwDef = { kind: "bolt", len: 16, dia: 6 };
const BEAM_LEG_BOLT: HwDef = { kind: "bolt", len: 60, dia: 8 };
const DISC: HwDef = { kind: "washer", len: 6, dia: 50, name: "Leg disc" };
const LEG_CAP: HwDef = { kind: "cap", len: 10, dia: 32, name: "Leg cap" };
const HOLDER: HwDef = { kind: "clip", len: 25, dia: 30, name: "Slat holder" };
const MID_HOLDER: HwDef = { kind: "clip", len: 30, dia: 50, name: "Centre slat holder" };

const LEG = 32; // tube legs
const H = 270; // top of the rails
const RH = 70; // rail height (20 cm free under the bed)
const RY = H - RH / 2;
const LEDGE = 250; // top of the slat ledges
const WEB = 3, LIP = 25;

/** How many TOLKNING headboards come with it, and how they stand: all at the head (double) or one there and the rest along the wall side. */
const headboardsOf = (s: ProductSpec) => {
  const m = /with (\d) headboards?/i.exec(s.variant) ?? /-(\d)-headboards?-/.exec(s.slug ?? "");
  return m ? Number(m[1]) : 0;
};

function buildBed(b: PlanBuilder, s: ProductSpec) {
  const mw = (s.bed?.mattressW ?? s.size.w - 16) * 10;
  const ml = (s.bed?.mattressL ?? s.size.d - 9) * 10;
  const wide = mw >= 1200; // the double manual: a centre beam on two legs and two slatted bases
  const W = mw + (mw > 940 && !wide ? 50 : 60);
  const L = ml + (wide ? 70 : 60);
  const nh = headboardsOf(s);
  const xl = W / 2 - LEG / 2, zl = L / 2 - LEG / 2; // leg centres
  const zH = -zl, zF = zl;
  const people = 2 as const;

  /* ---------- parts where they sit in the bed ---------- */
  const legT = b.part("Leg", [LEG, H, LEG], { shape: "cyl", material: "metal" });
  const legs = [zH, zF].map((z) => [0, 1].map((i) => b.place(legT, [sg(i) * xl, H / 2, z])));
  // the end rails: an upright web on the outside and a lip along the top that takes the slat holders
  const endLen = W - 2 * LEG;
  const endPieces = (g: number): PartPiece[] => [
    { shape: "box", size: [endLen, RH, WEB], pos: [0, 0, g * (LIP / 2 - WEB / 2)], material: "metal" },
    { shape: "box", size: [endLen, WEB, LIP], pos: [0, RH / 2 - WEB / 2, 0], material: "metal" },
  ];
  const endRail = (g: number) => {
    const { type, mid } = b.compound("End rail", endPieces(g), { material: "metal" });
    return b.place(type, [mid[0], RY + mid[1], g * (L / 2 - LIP / 2) + mid[2]]);
  };
  const ends = [endRail(-1), endRail(1)];
  // the side rails: the web on the outside and the slat ledge along the inside
  const sideLen = L - 2 * LEG;
  const sidePieces = (g: number): PartPiece[] => [
    { shape: "box", size: [WEB, RH, sideLen], pos: [g * (LIP / 2 - WEB / 2), 0, 0], material: "metal" },
    { shape: "box", size: [LIP, WEB, sideLen], pos: [0, LEDGE - RY - WEB / 2, 0], material: "metal" },
  ];
  const sideRail = (g: number) => {
    const { type, mid } = b.compound("Side rail", sidePieces(g), { material: "metal" });
    return b.place(type, [g * (W / 2 - LIP / 2) + mid[0], RY + mid[1], mid[2]]);
  };
  const sides = [sideRail(-1), sideRail(1)];
  // two curved bars screwed flat inside the rails at the right foot corner, under the ledge
  const BAR = 300;
  const barS = b.place(b.part("Stiffening bar", [6, 30, BAR], { material: "metal" }), [W / 2 - WEB - 3, 220, zF - LEG - 40 - BAR / 2]);
  const barE = b.place(b.part("Stiffening bar", [BAR, 30, 6], { material: "metal" }), [W / 2 - LEG - 40 - BAR / 2, 220, L / 2 - WEB - 3]);
  // the double's centre beam, its top level with the ledges, on two legs
  const beamH = 40;
  const beam = wide ? b.place(b.part("Centre beam", [40, beamH, L - 2 * WEB], { material: "metal" }), [0, LEDGE - beamH / 2, 0]) : "";
  const beamLegT = wide ? b.part("Centre leg", [25, LEDGE - beamH, 25], { shape: "cyl", material: "metal" }) : "";
  const beamZ = [-L / 6, L / 6];
  const beamLegs = wide ? beamZ.map((z) => b.place(beamLegT, [0, (LEDGE - beamH) / 2, z])) : [];
  // self-adhesive anti-slip strips, three along each ledge (and the beam)
  const stripT = b.part("Anti-slip strip", [20, 2, Math.round(sideLen / 3 - 20)], { material: "soft" });
  const stripZ = [-1, 0, 1].map((k) => (k * sideLen) / 3);
  const stripX = [-(W / 2 - WEB - (LIP - WEB) / 2), W / 2 - WEB - (LIP - WEB) / 2, ...(wide ? [0] : [])];
  const strips = stripX.flatMap((x) => stripZ.map((z) => b.place(stripT, [x, LEDGE + 1, z])));

  // the slatted base (LURÖY rolls, sold separately): one, or two side by side on the double
  const inner = W - 2 * LIP;
  const roll = (x0: number, w: number) => {
    const n = 17;
    const len = sideLen - 20;
    const pieces: PartPiece[] = range(n).map((i) => ({ shape: "box", size: [w, 8, 64], pos: [0, 0, -len / 2 + 32 + (i * (len - 64)) / (n - 1)], material: "wood" }));
    pieces.push({ shape: "box", size: [30, 3, len], pos: [-w / 2 + 60, -5, 0], material: "fiber" }, { shape: "box", size: [30, 3, len], pos: [w / 2 - 60, -5, 0], material: "fiber" });
    const { type, mid } = b.compound("Slatted base", pieces, { material: "wood", extra: true });
    return b.place(type, [x0 + mid[0], LEDGE + 2 + 4 + mid[1], mid[2]]);
  };
  const bases = wide ? [0, 1].map((i) => roll(sg(i) * (inner / 4 + 5), inner / 2 + 2 * LIP - 30)) : [roll(0, W - 20)];
  const mattress = b.place(b.part("Mattress", [mw, 180, ml], { material: "soft", extra: true }), [0, LEDGE + 10 + 90, 0]);

  // TOLKNING headboards: a rattan panel in a cane frame on two legs, free-standing behind the bed
  const HBW = 1160, HBH = 980, HBT = 50, HB0 = 260; // panel bottom above the floor
  const panelPieces: PartPiece[] = [
    // the woven lattice, drawn as an open grid of thin canes
    ...range(9).map((i): PartPiece => ({ shape: "box", size: [6, HBH - HB0 - 60, 6], pos: [-(HBW - 60) / 2 + ((i + 1) * (HBW - 60)) / 10, 0, 0], material: "wood" })),
    ...range(5).map((i): PartPiece => ({ shape: "box", size: [HBW - 60, 6, 6], pos: [0, -(HBH - HB0 - 60) / 2 + ((i + 1) * (HBH - HB0 - 60)) / 6, 0], material: "wood" })),
    ...[-1, 1].map((g): PartPiece => ({ shape: "cyl", size: [30, HBH - HB0, 30], pos: [g * (HBW / 2 - 15), 0, 0], material: "wood" })),
    ...[-1, 1].map((g): PartPiece => ({ shape: "cyl", size: [30, HBW - 60, 30], pos: [0, g * ((HBH - HB0) / 2 - 15), 0], rot: [0, 0, Math.PI / 2], material: "wood" })),
    ...[-1, 1].map((g): PartPiece => ({ shape: "box", size: [HBW - 120, 12, HBT], pos: [0, g * ((HBH - HB0) / 2 - 15), 0], material: "wood" })),
  ];
  const hbT = nh ? b.compound("Rattan headboard", panelPieces, { material: "wood" }).type : "";
  const hbLegT = nh ? b.part("Headboard leg", [20, HB0 + 40, 20], { shape: "cyl", material: "wood" }) : "";
  const hbMid = (HB0 + HBH) / 2;
  // where each one stands: [x, z, turned to stand along the side]
  const spots: [number, number, boolean][] = range(nh).map((i) => {
    if (wide) return [(i - (nh - 1) / 2) * (HBW + 5), -L / 2 - HBT / 2 - 10, false];
    if (i === 0) return [0, -L / 2 - HBT / 2 - 10, false];
    const n = nh - 1;
    return [-W / 2 - HBT / 2 - 10, -L / 2 + 30 + HBW / 2 + (i - 1) * (HBW + 5) + (n > 1 ? -HBW / 2 + 60 : 0), true];
  });
  const hbs = spots.map(([x, z, side]) => {
    const panel = b.place(hbT, [x, hbMid, z], side ? [0, Math.PI / 2, 0] : [0, 0, 0]);
    const off = HBW / 2 - 180;
    const lg = [-1, 1].map((g) => b.place(hbLegT, [x + (side ? 0 : g * off), (HB0 + 40) / 2, z + (side ? g * off : 0)]));
    return { panel, legs: lg, x, z, side };
  });

  /* ---------- steps ---------- */
  const flat: Vec3 = [Math.PI / 2, 0, 0]; // an end frame on the rug, legs pointing along the floor
  const cH: Vec3 = [0, RY, zH], cF: Vec3 = [0, RY, zF];
  const headAt: Vec3 = [0, RH / 2, -420], footAt: Vec3 = [0, RH / 2, 80];
  const endBolt = (g: number, i: number, z: number): FitOpts => ({ on: legs[g][i], at: [sg(i) * W / 2, RY, z], dir: [-sg(i), 0, 0], mate: ends[g] });

  step(b, { title: "Bolt a leg to one end of each end rail", detail: "Lay both short rails on a rug. One frame bolt through each leg into the rail, finger tight for now. Mind the cut edges of the steel.", tools: ["allen"], scene: "ends", kind: "bolts", warnings: ["floor", "hand"] }, () => {
    lay(b, [ends[0], legs[0][0]], cH, headAt, flat);
    lay(b, [ends[1], legs[1][0]], cF, footAt, flat);
    b.then(0.15);
    b.fits(FRAME_BOLT, [endBolt(0, 0, zH), endBolt(1, 0, zF)], 0.15);
  });
  step(b, { title: "Bolt the second leg on each", detail: "The same at the other end of both rails, so each one stands on two legs.", tools: ["allen"], scene: "ends", kind: "bolts" }, () => {
    lay(b, [legs[0][1]], cH, headAt, flat);
    lay(b, [legs[1][1]], cF, footAt, flat);
    b.then(0.15);
    b.fits(FRAME_BOLT, [endBolt(0, 1, zH), endBolt(1, 1, zF)], 0.15);
  });
  const sideBolts = (g: number, i: number) => pts(legs[g][i], [215, 255].map((y): Vec3 => [sg(i) * xl, y, sg(g) * L / 2]), [0, 0, -sg(g)], sides[i]);
  step(b, { title: "Stand the head end up and bolt on a side rail", detail: "The ledge faces in, toward the slats. Two frame bolts through the leg into the end of the rail.", tools: ["allen"], kind: "bolts" }, () => {
    b.stagger(0.1);
    for (const k of [ends[0], ...legs[0]]) b.add(k, [0, 0, -200]);
    b.then(0.15);
    b.add(sides[0], [-200, 0, 250]);
    b.then(0.1);
    b.fits(FRAME_BOLT, sideBolts(0, 0), 0.15);
  });
  step(b, { title: "Bolt on the other side rail", detail: "Ledge facing in again, two bolts through the other leg.", tools: ["allen"], kind: "bolts" }, () => {
    b.add(sides[1], [200, 0, 250]);
    b.then(0.1);
    b.fits(FRAME_BOLT, sideBolts(0, 1), 0.15);
  });
  step(b, { title: "Lift the foot end onto the side rails", detail: "One of you at each leg. Line the rails up with the holes, then put in the last four bolts and tighten every bolt in the frame.", tools: ["allen"], people, kind: "bolts" }, () => {
    b.stagger(0.05);
    for (const k of [ends[1], ...legs[1]]) b.add(k, [0, 0, 300]);
    b.then(0.15);
    b.fits(FRAME_BOLT, [...sideBolts(1, 0), ...sideBolts(1, 1)], 0.1);
  });
  if (wide) {
    step(b, { title: "Bolt the two legs under the centre beam", detail: "Turn the beam upside down. A disc and a long bolt through the beam into the top of each leg.", tools: ["allen"], kind: "bolts" }, () => {
      b.add(beam, [0, 300, 0]);
      b.then(0.1);
      for (const k of beamLegs) b.add(k, [0, -200, 0]);
      b.then(0.1);
      b.fits(DISC, beamZ.map((z) => ({ on: beam, at: [0, LEDGE, z] as Vec3, dir: [0, -1, 0] as Vec3, hole: false as const })), 0.15);
      b.then(0.05);
      b.fits(BEAM_LEG_BOLT, beamZ.map((z) => ({ on: beam, at: [0, LEDGE + 6, z] as Vec3, dir: [0, -1, 0] as Vec3, mate: beamLegs[z < 0 ? 0 : 1] })), 0.15);
    });
    step(b, { title: "Screw the beam to the end rails", detail: "Down the middle of the frame, two bolts through each end rail into the beam.", tools: ["allen"], kind: "bolts" }, () =>
      b.fits(BEAM_BOLT, [-1, 1].flatMap((g) => pts(ends[g < 0 ? 0 : 1], [-10, 10].map((x): Vec3 => [x, LEDGE - beamH / 2, g * L / 2]), [0, 0, -g], beam)), 0.1),
    );
    step(b, { title: "Tighten the corner bolts again", detail: "The beam pulls the frame a little. Go round all four corners once more with the Allen key.", tools: ["allen"], check: "square", kind: "bolts" });
  }
  step(b, { title: "Screw the two stiffening bars inside the frame", detail: "At one foot corner: one bar flat against the side rail, one against the foot rail, under the ledge. Two countersunk bolts each.", tools: ["allen"], kind: "bolts" }, () => {
    b.stagger(0.25);
    b.add(barS, [-160, 0, 0]);
    b.add(barE, [0, 0, -160]);
    b.then(0.15);
    b.fits(BAR_BOLT, [
      ...pts(barS, [-1, 1].map((g): Vec3 => [W / 2 - WEB - 6, 220, zF - LEG - 40 - BAR / 2 + g * (BAR / 2 - 20)]), [1, 0, 0], sides[1]),
      ...pts(barE, [-1, 1].map((g): Vec3 => [W / 2 - LEG - 40 - BAR / 2 + g * (BAR / 2 - 20), 220, L / 2 - WEB - 6]), [0, 0, 1], ends[1]),
    ], 0.12);
  });
  step(b, { title: "Tap a cap into the top of each leg", detail: "Use a hammer with a cloth over the cap, until it sits flush.", tools: ["hammer"], kind: "general" }, () =>
    b.fits(LEG_CAP, legs.flat().map((k) => {
      const p = b.partItem(k).final.pos;
      return { on: k, at: [p[0], H, p[2]] as Vec3, dir: [0, -1, 0] as Vec3, hole: false as const };
    }), 0.12),
  );
  const holderX = wide ? [-1, 1].map((g) => g * (W / 2 - LEG - 90)) : [-1, 1].map((g) => g * (W / 2 - LEG - 110));
  step(b, { title: "Clip the slat holders into the end rails", detail: "Two in each end rail: push each one into its slot and slide it toward the corner until it locks.", kind: "general" }, () =>
    b.fits(HOLDER, [0, 1].flatMap((g) => pts(ends[g], holderX.map((x): Vec3 => [x, H, sg(g) * (L / 2 - LIP / 2)]), [0, -1, 0], undefined, { hole: false })), 0.1),
  );
  if (wide)
    step(b, { title: "Clip the centre holders onto the beam ends", detail: "One at each end of the centre beam. They hold the inner edges of both slatted bases.", kind: "general" }, () =>
      b.fits(MID_HOLDER, [-1, 1].map((g) => ({ on: beam, at: [0, LEDGE, g * (L / 2 - WEB - 30)] as Vec3, dir: [0, -1, 0] as Vec3, hole: false as const })), 0.15),
    );
  step(b, { title: wide ? "Stick the anti-slip strips on the ledges and the beam" : "Stick the anti-slip strips on the ledges", detail: "Peel off the backing and press three strips along each ledge. Trim the last one with scissors where it meets a holder.", tools: ["knife"], kind: "general" }, () => {
    b.stagger(0.08);
    for (const k of strips) b.add(k, [0, 120, 0]);
  });
  step(b, { title: wide ? "Roll out the slatted bases" : "Roll out the slatted base", detail: wide ? "Sold separately. Unroll them side by side on the ledges and the beam, ends tucked under the holders." : "Sold separately. Unroll it along the ledges from the head end and tuck both ends under the holders.", people: wide ? people : 1, kind: "slats" }, () => {
    b.stagger(0.3);
    for (const k of bases) b.add(k, [0, 260, -400]);
  });
  step(b, { title: "Lay your mattress on", detail: "Check the frame bolts again after a week or two of use.", people, kind: "cushions" }, () => b.add(mattress, [0, 350, 0]));

  if (hbs.length) {
    const many = hbs.length > 1;
    step(b, { title: many ? "Screw the legs into each headboard" : "Screw the legs into the headboard", detail: "Lay the panel face up on a rug and turn both legs into the bottom edge by hand until they stop.", scene: "hb", people, kind: "legs", repeat: many ? hbs.length : undefined, warnings: ["two", "floor"] }, () => {
      const up: Vec3 = [-Math.PI / 2, 0, 0];
      b.stagger(0.2);
      hbs.forEach((h, i) => {
        const at: Vec3 = [(i - (hbs.length - 1) / 2) * (HBW + 150), HBT / 2, 0];
        b.stage(h.panel, at, up, [0, 200, 0]);
      });
      b.then(0.15);
      hbs.forEach((h, i) => {
        const at: Vec3 = [(i - (hbs.length - 1) / 2) * (HBW + 150), HBT / 2, 0];
        h.legs.forEach((k, g) => {
          const p = rotate([sg(g) * (HBW / 2 - 180), (HB0 + 40) / 2 - hbMid, 0], up);
          b.stage(k, [at[0] + p[0], at[1] + p[1], at[2] + p[2]], up, [0, 0, 260]);
        });
      });
    });
    step(b, { title: many ? "Stand the headboards behind the bed" : "Stand the headboard behind the bed", detail: wide ? "Side by side against the wall at the head end. They stand on their own legs, so nothing is screwed to the wall." : many ? "One at the head end, the rest along the wall side. They stand on their own legs; nothing is screwed to the wall." : "Against the wall at the head end. It stands on its own legs and the bumper on the back keeps the wall clean.", people, kind: "join" }, () => {
      b.stagger(0.25);
      for (const h of hbs) {
        const away: Vec3 = h.side ? [-300, 0, 0] : [0, 0, -300];
        b.add(h.panel, away);
        for (const k of h.legs) b.add(k, away);
      }
    });
  }
  return true;
}

const family: Family = {
  names: ["VEVELSTAD"],
  build(b, s) {
    if (s.archetype !== "bed") return false;
    return buildBed(b, s);
  },
};
export default family;
