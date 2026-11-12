import type { Family } from "./family";
import type { ProductSpec, Pose, StepKind, ToolId, Vec3, WarnId } from "../../types";
import { HW, type FitOpts, type HwDef, type PlanBuilder } from "../builder";

/**
 * SLATORP, from IKEA's manuals. Everything is built with the sofa lying on its back on the floor: four short studs
 * go into the front of the backrest, the seat is lowered onto them and clamped from underneath, the armrests get
 * three long studs each and are pushed onto the ends, then nuts with washers go on from inside and the legs screw
 * into the armrests. Two people turn it upright and the cushions go on. A sofa with a chaise longue is a sofa
 * section with one armrest and a chaise longue built the same way beside it: its seat is lowered on by two people,
 * it gets the other armrest, two hooks and two peg bolts on its open side and five legs, and the sofa section's
 * connecting pin drops into it once both stand up. The chaise sits on the right, as in IKEA's photo.
 */

const D = 950, Z0 = -475;
const LEG = 120;
const BD = 200; // backrest frame, front to back
const ZB = Z0 + BD; // front face of the backrest
const SEAT = 400; // top of the seat
const BACK = 680; // top of the backrest frame
const ARM = 630;
const H = 750; // with the back cushions
const CW = 840, CL = 1640; // chaise longue: width, and depth from the back
const SW = 700; // one seat

const SSTUD: HwDef = { kind: "stud", len: 70, dia: 8 };
const LSTUD: HwDef = { kind: "stud", len: 140, dia: 8 };
const CLAMP: HwDef = { ...HW.clamp };
const WASHER: HwDef = { kind: "washer", len: 2, dia: 20 };
const NUT: HwDef = { kind: "nut", len: 7, dia: 8 };
const LEGW: HwDef = { kind: "washer", len: 3, dia: 50 };
const PAD: HwDef = { kind: "glide", len: 4, dia: 34 };
const HOOK: HwDef = { kind: "hook", len: 55, dia: 40 };
const HSCREW: HwDef = { kind: "screw", len: 12, dia: 6 };
const PEG: HwDef = { kind: "bolt", len: 16, dia: 8, name: "Peg bolt" };
const PEGW: HwDef = { kind: "washer", len: 3, dia: 24 };
const PIN: HwDef = { kind: "stud", len: 150, dia: 10, name: "Connecting pin" };
const WING: HwDef = { kind: "nut", len: 14, dia: 30, name: "Wing nut" };

/** Seats in the sofa section, and whether a chaise longue is joined to it. */
function layout(s: ProductSpec): { seats: number; chaise: boolean } | null {
  const v = s.variant.toLowerCase();
  if (/bed|cover/.test(v)) return null;
  if (/^2-seat sofa$/.test(v)) return { seats: 2, chaise: false };
  if (/^3-seat sofa$/.test(v)) return { seats: 3, chaise: false };
  // the chaise longue is sold with a 2-seat sofa (3-seat with chaise) or a 3-seat sofa (4-seat with chaise)
  if (/^3-seat sofa with chaise/.test(v)) return { seats: 2, chaise: true };
  if (/^4-seat sofa with chaise/.test(v)) return { seats: 3, chaise: true };
  return null;
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const lay = layout(s);
  if (!lay) return false;
  const secW = lay.seats * SW;
  const seatW = secW + (lay.chaise ? CW : 0);
  // the armrests take up what's left of IKEA's width: 18 cm on the sofas, 16 cm with a chaise
  const AW = Math.min(200, Math.max(140, (s.size.w * 10 - seatW) / 2));
  const W = seatW + 2 * AW;
  const zc = lay.chaise ? (Z0 + Z0 + CL) / 2 : 0; // centre the whole thing front to back
  const P = (v: Vec3): Vec3 => [v[0], v[1], v[2] - zc];
  const x0 = -W / 2;
  const xs0 = x0 + AW, xs1 = xs0 + secW; // the sofa section's seat
  const xc1 = xs1 + CW; // the chaise's outer end

  const soft = (name: string, size: Vec3) => b.part(name, size, { material: "soft" });
  const types = new Map<string, string>();
  const typeOf = (name: string, size: Vec3, material: "soft" | "wood" = "soft") => {
    const k = `${name}|${size.map(Math.round).join("x")}`;
    if (!types.has(k)) types.set(k, material === "wood" ? b.part(name, size, { shape: "cyl", material }) : soft(name, size));
    return types.get(k)!;
  };
  const put = (name: string, x0_: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    b.place(typeOf(name, [x1 - x0_, y1 - y0, z1 - z0]), P([(x0_ + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]));

  // the sofa section
  const back = put("Backrest", xs0, xs1, LEG, BACK, Z0, ZB);
  const seat = put("Seat", xs0, xs1, LEG, SEAT, ZB, -Z0);
  const armL = put("Armrest", x0, xs0, LEG, ARM, Z0, -Z0);
  // the chaise, or the other armrest
  const cBack = lay.chaise ? put("Chaise backrest", xs1, xc1, LEG, BACK, Z0, ZB) : "";
  const cSeat = lay.chaise ? put("Chaise seat", xs1, xc1, LEG, SEAT, ZB, Z0 + CL) : "";
  const armR = put("Armrest", W / 2 - AW, W / 2, LEG, ARM, Z0, -Z0);
  const legT = typeOf("Leg", [45, LEG, 45], "wood");
  const leg = (x: number, z: number) => ({ key: b.place(legT, P([x, LEG / 2, z])), x, z });
  const zl = -Z0 - 70;
  const legsL = [-zl, zl].map((z) => leg(x0 + AW / 2, z));
  const legsR = [-zl, zl].map((z) => leg(W / 2 - AW / 2, z));
  const legsC = lay.chaise ? [leg(xc1 - 70, Z0 + CL - 70), leg(xs1 + 70, Z0 + CL - 70), leg(xs1 + 70, -zl)] : [];

  // cushions: one back cushion and one scatter cushion per seat, the chaise has its own
  const bays: [number, number][] = [];
  for (let i = 0; i < lay.seats; i++) bays.push([xs0 + i * SW, xs0 + (i + 1) * SW]);
  if (lay.chaise) bays.push([xs1, xc1]);
  const backs = bays.map(([a, c]) => put("Back cushion", a + 6, c - 6, SEAT, H, ZB, ZB + 190));
  const throwT = soft("Scatter cushion", [440, 440, 120]);
  const throws = bays.map(([a, c]) => b.place(throwT, P([(a + c) / 2, SEAT + 230, ZB + 190 + 70]), [-0.28, 0, 0]));

  // a step, with the defaults the house voice uses
  const step = (o: { title: string; detail?: string; pose?: Pose; kind?: StepKind; tools?: ToolId[]; people?: 1 | 2; warnings?: WarnId[] }, body: () => void = () => {}) =>
    b.step({ kind: "general", pose: "+z", ...o, warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
  const at = (v: Vec3, dir: Vec3, on: string, o: Partial<FitOpts> = {}): FitOpts => ({ at: P(v), dir, on, ...o });
  const fit = (def: HwDef, list: FitOpts[], gap = 0.1) => b.fits(def, list, gap);
  const off = (key: string, d: Vec3) => {
    const f = b.partItem(key).final;
    return [f.pos[0] + d[0], f.pos[1] + d[1], f.pos[2] + d[2]] as Vec3;
  };
  // where the chaise is built, beside the sofa section, until the two are joined
  const CHX = 650;
  const stageC = (key: string, from?: Vec3) => b.stage(key, off(key, [CHX, 0, 0]), [0, 0, 0], from);
  const showC = (key: string, from?: Vec3) => (lay.chaise ? stageC(key, from) : b.add(key, from));

  // the backrest and seat of a section, with its studs and clamps
  const studXs = (a: number, c: number, n: number) => Array.from({ length: n }, (_, i) => a + ((c - a) * (i + 0.5)) / n);
  const studY = LEG + 150;
  const sectionSteps = (o: { backK: string; seatK: string; xs: number[]; chaise: boolean }) => {
    const { backK, seatK, xs } = o;
    const n = xs.length;
    step({ title: o.chaise ? "Screw two short studs into the chaise backrest" : `Screw ${n === 4 ? "four" : "the"} short studs into the backrest`, detail: "Lay it on its back on a rug and turn the studs into the holes along its front, by hand. Use the short studs, not the long ones.", kind: "bolts", warnings: ["floor", "hand"] }, () => {
      if (o.chaise) stageC(backK, [0, 0, 300]);
      else b.add(backK, [0, 0, 300]);
      b.then(0.15);
      fit(SSTUD, xs.map((x) => ({ ...at([x, studY, ZB + 40], [0, 0, -1], backK), mate: seatK, travel: 140, spin: 3 })));
    });
    step({ title: o.chaise ? "Lower the chaise seat onto the studs together" : "Lower the seat onto the studs", detail: "Stand it on its back edge, underside towards you, and guide each stud into its hole.", kind: "join", people: o.chaise ? 2 : 1 }, () => {
      if (o.chaise) stageC(seatK, [0, 0, 500]);
      else b.add(seatK, [0, 0, 500]);
    });
    step({ title: o.chaise ? "Clamp the chaise seat on" : "Clamp the seat to the backrest", detail: "From underneath, slide a clamp over the end of each stud and turn it until it grips.", kind: "bolts", warnings: ["hand"] }, () => {
      fit(CLAMP, xs.map((x) => ({ ...at([x, LEG + 30, ZB + 60], [0, 1, 0], seatK), hole: false as const, travel: 90 })));
    });
  };

  // three long studs into the inner face of an armrest: two into the seat, one into the backrest
  const armStuds = (armK: string, sx: number, xFace: number, mates: [string, string]) =>
    ([[260, ZB + 120, mates[1]], [260, -Z0 - 160, mates[1]], [BACK - 200, Z0 + BD / 2, mates[0]]] as [number, number, string][]).map(([y, z, mate]) => ({
      ...at([xFace, y, z], [sx, 0, 0], armK),
      mate,
      travel: 160,
      spin: 3,
    }));
  const nuts = (pts: { x: number; y: number; z: number; sx: number; on: string }[]) => {
    fit(WASHER, pts.map((p) => ({ ...at([p.x, p.y, p.z], [p.sx, 0, 0], p.on), hole: false as const })), 0.06);
    b.then(0.1);
    fit(NUT, pts.map((p) => ({ ...at([p.x, p.y, p.z], [p.sx, 0, 0], p.on), hole: false as const })), 0.06);
  };
  const armPts = (sx: number, xFace: number, mates: [string, string]) =>
    ([[260, ZB + 120, mates[1]], [260, -Z0 - 160, mates[1]], [BACK - 200, Z0 + BD / 2, mates[0]]] as [number, number, string][]).map(([y, z, on]) => ({ x: xFace - sx * 40, y, z, sx, on }));
  // the armrests lie on their outer side while the studs go in
  const stageArm = (key: string, sx: number, dx: number) => {
    const f = b.partItem(key).final;
    b.stage(key, [f.pos[0] + dx, f.pos[1], P([0, 0, Z0 + AW / 2])[2]], [0, (sx * Math.PI) / 2, 0], [0, 0, 300]);
  };
  const legsStep = (title: string, list: { key: string; x: number; z: number }[], hosts: string[], chaise: boolean) => {
    step({ title, detail: "A washer goes on each leg's bolt first. Turn the legs in clockwise by hand, then stick a felt pad under each one.", kind: "legs", warnings: ["hand"] }, () => {
      fit(LEGW, list.map((l, i) => ({ ...at([l.x, LEG, l.z], [0, 1, 0], hosts[i]), hole: false as const })), 0.08);
      b.then(0.1);
      b.stagger(0.2);
      for (const l of list) {
        if (chaise) stageC(l.key, [0, -240, 0]);
        else b.add(l.key, [0, -240, 0], { spin: 2 });
      }
      b.then(0.1);
      fit(PAD, list.map((l) => ({ ...at([l.x, 0, l.z], [0, 1, 0], l.key), hole: false as const })), 0.08);
    });
  };

  /* ---------- the sofa section ---------- */
  sectionSteps({ backK: back, seatK: seat, xs: studXs(xs0, xs1, 4), chaise: false });
  const xFL = xs0, xFR = W / 2 - AW;
  step({ title: "Screw the long studs into the armrests", detail: "Lay each armrest on its outer side. Three studs into the holes in its inner face, by hand; check which armrest goes on which end by its holes.", kind: "bolts", warnings: ["floor", "hand"] }, () => {
    b.stagger(0.25);
    stageArm(armL, -1, -500);
    stageArm(armR, 1, lay.chaise ? CHX + 500 : 500);
    b.then(0.15);
    fit(LSTUD, armStuds(armL, -1, xFL, [back, seat]));
    fit(LSTUD, armStuds(armR, 1, xFR, lay.chaise ? [cBack, cSeat] : [back, seat]));
  });
  if (!lay.chaise) {
    step({ title: "Push the armrests onto the ends together", detail: "One of you at each end. Guide the studs through the holes in the frame and push until the armrest sits tight.", kind: "join", people: 2 }, () => {
      b.stagger(0.3);
      b.add(armL);
      b.add(armR);
    });
    step({ title: "Tighten the nuts from inside", detail: "Reach in under the seat: a washer and a nut on each stud, tightened with the box spanner.", kind: "bolts", tools: ["wrench"] }, () => {
      nuts([...armPts(-1, xFL, [back, seat]), ...armPts(1, xFR, [back, seat])]);
    });
    legsStep("Screw the legs into the armrests", [...legsL, ...legsR], [armL, armL, armR, armR], false);
  } else {
    step({ title: "Push the armrest onto the free end", detail: "The end away from where the chaise goes. Guide the studs through the frame and push it tight.", kind: "join" }, () => b.add(armL));
    step({ title: "Tighten the nuts from inside", detail: "Under the seat: a washer and a nut on each stud, tightened with the box spanner.", kind: "bolts", tools: ["wrench"] }, () => nuts(armPts(-1, xFL, [back, seat])));
    legsStep("Screw two legs into the armrest", legsL, [armL, armL], false);

    /* ---------- the chaise longue ---------- */
    sectionSteps({ backK: cBack, seatK: cSeat, xs: studXs(xs1, xc1, 2), chaise: true });
    step({ title: "Push the other armrest onto the chaise", detail: "On its outer side, studs through the frame, until it sits tight.", kind: "join" }, () => stageC(armR));
    step({ title: "Tighten its nuts from inside", detail: "A washer and a nut on each stud, with the box spanner.", kind: "bolts", tools: ["wrench"] }, () => nuts(armPts(1, xFR, [cBack, cSeat])));
    // the open side of the chaise, which meets the sofa section
    const hookPts: [number, number, string][] = [
      [LEG + 120, Z0 + BD / 2, cBack],
      [LEG + 120, ZB + 260, cSeat],
    ];
    step({ title: "Screw the hooks and peg bolts onto the open side", detail: "Two hooks with a screw each, and two peg bolts with a washer, with the Allen key. Use the thick washers here.", kind: "screws", tools: ["allen"] }, () => {
      fit(HOOK, hookPts.map(([y, z, on]) => ({ ...at([xs1, y, z], [1, 0, 0], on), hole: false as const })), 0.15);
      b.then(0.1);
      fit(HSCREW, hookPts.map(([y, z, on]) => ({ ...at([xs1, y, z], [1, 0, 0], on) })), 0.1);
      b.then(0.1);
      const pegs = hookPts.map(([y, z, on]) => ({ ...at([xs1, y + 120, z], [1, 0, 0], on) }));
      fit(PEGW, pegs.map((p) => ({ ...p, hole: false as const })), 0.1);
      fit(PEG, pegs, 0.1);
    });
    legsStep("Screw five legs into the chaise", [...legsR, ...legsC], [armR, armR, cSeat, cSeat, cBack], true);
    step({ title: "Push the connecting pin into the sofa section", detail: "Into the hole low down in the end without an armrest, with a thin washer on it.", kind: "bolts" }, () => {
      const p = at([xs1, LEG + 140, Z0 + BD / 2], [-1, 0, 0], back);
      fit(WASHER, [{ ...p, hole: false }]);
      b.then(0.1);
      fit(PIN, [{ ...p, travel: 180 }]);
    });
    step({ title: "Stand both up and hook them together", detail: "Turn each one upright together. Lift the sofa section so its pin drops into the slot in the chaise and the hooks catch, then put the thin washer and the wing nut on the pin from inside the chaise. Check the seats line up at the front.", pose: "+y", kind: "join", people: 2 }, () => {
      b.stagger(0.12);
      for (const k of [cBack, cSeat, armR, ...legsR.map((l) => l.key), ...legsC.map((l) => l.key)]) b.add(k);
      b.then(0.15);
      const p = at([xs1 + 40, LEG + 140, Z0 + BD / 2], [-1, 0, 0], cBack, { hole: false });
      fit(WASHER, [p]);
      fit(WING, [p]);
    });
  }
  if (!lay.chaise) step({ title: "Turn it upright together", detail: "Lift it by the frame, never by the legs.", pose: "+y", kind: "standup", people: 2 });
  step({ title: "Put the cushions on", detail: "Back cushions against the backrest, then a scatter cushion in front of each. The back cushions can be turned over to wear evenly.", pose: "+y", kind: "cushions" }, () => {
    b.stagger(0.2);
    for (const k of backs) b.add(k, [0, 300, 0]);
    b.then(0.1);
    for (const k of throws) b.add(k, [0, 260, 0]);
  });
  return true;
}

const family: Family = {
  names: ["SLATORP"],
  build,
};
export default family;
