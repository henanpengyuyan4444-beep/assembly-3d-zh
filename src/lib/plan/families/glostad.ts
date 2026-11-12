import type { Family } from "./family";
import type { PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";

/**
 * GLOSTAD, read from IKEA's 2-seat and 3-seat sofa manuals and the footstool's (the ottoman, and the chaise longue
 * version is the 3-seat with the footstool hooked onto it).
 *
 * The sofa goes together with eight studs and eight nuts. Each thin armrest comes with its two legs on; four studs
 * are screwed into its inside face. The seat (its cushions packed away inside) is stood on one end on an armrest
 * and nutted on, then the back frame (the 3-seat's comes bare and gets its cover pulled on), then the other armrest
 * is lowered on top. The 3-seat adds two brackets at the back. Upright, the seat cushions go into the seat cover,
 * the back cushions are laid on and strapped under. The footstool is built upside down: four legs screwed in by
 * hand and, to hook it to a sofa, two brackets on one end.
 */

type StepOpts = { title: string; detail?: string; tools?: ToolId[]; pose?: Pose; scene?: string; kind?: StepKind; warnings?: WarnId[]; people?: 1 | 2 };
const step = (b: PlanBuilder, o: StepOpts, body: () => void = () => {}) => b.step({ kind: "general", ...o, warnings: o.warnings ?? (o.people === 2 ? ["two"] : []) }, body);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const STUD: HwDef = { kind: "stud", len: 60, dia: 8 };
const WASHER: HwDef = { kind: "washer", len: 2, dia: 18 };
const NUT: HwDef = { kind: "nut", len: 7, dia: 13 };
const BACK_BOLT: HwDef = { kind: "bolt", len: 25, dia: 8, name: "Hex bolt" };
const BACK_BRACKET: HwDef = { kind: "clip", len: 60, dia: 40, name: "Back bracket" };
const LINK: HwDef = { kind: "clip", len: 60, dia: 40, name: "Linking bracket" };
const LINK_BOLT: HwDef = { kind: "bolt", len: 16, dia: 6 };

const AW = 35; // armrest
const D = 780;
const LEGH = 240;
const SEAT0 = 230, SEAT1 = 350, SEATTOP = 410;
const ZB = -D / 2 + 20; // back frame

/* ---------------------------------------------------------------- footstool */

function stool(b: PlanBuilder, at: [number, number], scene: string, linking: boolean, alone: boolean) {
  const SW = 580, SL = 680, y0 = 240;
  const [cx, cz] = at;
  const body = b.place(b.part("Footstool", [SW, SEATTOP - y0, SL], { material: "soft" }), [cx, (y0 + SEATTOP) / 2, cz]);
  const legT = b.part("Leg", [28, y0 + 10, 28], { shape: "cyl", material: "metal" });
  const lx = SW / 2 - 55, lz = SL / 2 - 55;
  const legs = [-1, 1].flatMap((gx) => [-1, 1].map((gz) => b.place(legT, [cx + gx * lx, (y0 + 10) / 2, cz + gz * lz])));
  const back = cz - SL / 2;
  step(b, { title: "Screw the legs into the footstool", detail: "Turn it upside down on a rug. Screw each leg in by hand until it stops; don't use a tool.", pose: "-y", scene, kind: "legs", warnings: ["floor"] }, () => {
    b.add(body, [0, 200, 0]);
    b.then(0.15);
    b.stagger(0.2);
    for (const k of legs) b.add(k, [0, -220, 0], { spin: 3 });
  });
  if (linking)
    step(b, { title: alone ? "Screw on the linking brackets, if it goes with a sofa" : "Screw the linking brackets onto one end", detail: alone ? "Two brackets on one short end hook it onto a GLOSTAD sofa. Leave them off if it stands on its own." : "Two brackets on the end that meets the sofa, one bolt each with the Allen key.", pose: "-y", scene, tools: ["allen"], kind: "bolts" }, () => {
      const pts = [-150, 150].map((dx): Vec3 => [cx + dx, SEATTOP - 20, back]);
      b.fits(LINK, pts.map((p): FitOpts => ({ on: body, at: p, dir: [0, 0, 1], hole: false })), 0.2);
      b.then(0.1);
      b.fits(LINK_BOLT, pts.map((p): FitOpts => ({ on: body, at: [p[0], p[1], p[2] - 4], dir: [0, 0, 1] })), 0.2);
    });
  return { body, legs };
}

/* ---------------------------------------------------------------- sofa */

function sofa(b: PlanBuilder, s: ProductSpec) {
  const three = (s.sofa?.seats ?? 3) >= 3;
  const n = three ? 3 : 2;
  const W = three ? 1710 : 1210;
  const SW = W - 2 * AW;
  const ax = W / 2 - AW / 2;

  // the armrest: a thin padded panel with its two legs fixed under it, splayed a little
  const armPieces: PartPiece[] = [
    { shape: "box", size: [AW, 570 - SEAT0 + 10, D - 20], pos: [0, (570 + SEAT0 - 10) / 2 - 285, 0], material: "soft" },
    ...[-1, 1].map((g): PartPiece => ({ shape: "cyl", size: [28, LEGH + 20, 28], pos: [0, (LEGH + 20) / 2 - 285, g * (D / 2 - 50)], rot: [-g * 0.07, 0, 0], material: "metal" })),
  ];
  const armT = b.part("Armrest with legs", [AW, 570, D], { material: "soft" });
  b.parts[b.parts.length - 1].pieces = armPieces;
  const arms = [-1, 1].map((g) => b.place(armT, [g * ax, 285, 0]));
  const seatZ0 = ZB + 20, seatZ1 = D / 2;
  const seat = b.place(b.part("Seat", [SW, SEAT1 - SEAT0, seatZ1 - seatZ0], { material: "soft" }), [0, (SEAT0 + SEAT1) / 2, (seatZ0 + seatZ1) / 2]);
  const backF = b.place(b.part(three ? "Back frame" : "Back", [SW, 420, 40], { material: three ? "metal" : "soft" }), [0, 470, ZB]);
  const backC = three ? b.place(b.part("Back cover", [SW + 6, 426, 46], { material: "soft" }), [0, 470, ZB]) : "";
  const cw = SW / n;
  const cushT = b.part("Seat cushion", [cw - 6, SEATTOP - SEAT1, seatZ1 - seatZ0 - 80], { material: "soft" });
  const cush = range(n).map((i) => b.place(cushT, [-SW / 2 + cw / 2 + i * cw, (SEAT1 + SEATTOP) / 2, (seatZ0 + seatZ1) / 2 + 40]));
  const backCT = b.part("Back cushion", [cw - 12, 300, 160], { material: "soft" });
  const backs = range(n).map((i) => b.place(backCT, [-SW / 2 + cw / 2 + i * cw, SEATTOP + 150, ZB + 20 + 80]));

  const seatPts = (g: number) => [-100, 220].map((z): Vec3 => [g * (W / 2 - AW), 290, z]);
  const backPts = (g: number) => [300, 540].map((y): Vec3 => [g * (W / 2 - AW), y, ZB]);
  const nuts = (pts: Vec3[], g: number, on: string, inset: number): [FitOpts[], FitOpts[]] => [
    pts.map((p): FitOpts => ({ on, at: [p[0] - g * inset, p[1], p[2]], dir: [g, 0, 0], hole: false })),
    pts.map((p): FitOpts => ({ on, at: [p[0] - g * (inset + 3), p[1], p[2]], dir: [g, 0, 0], hole: false })),
  ];
  const nutUp = (pts: Vec3[], g: number, on: string, inset: number) => {
    const [w, nn] = nuts(pts, g, on, inset);
    b.fits(WASHER, w, 0.12);
    b.then(0.05);
    b.fits(NUT, nn, 0.12);
  };

  step(b, { title: "Unzip the seat and take out the back frame", detail: three ? "Open the zip at the back of the seat and slide out the frame packed inside. Keep the seat cushions in their bags for now." : "Open the zip at the back of the seat and lift out the back packed inside it.", kind: "general" }, () => b.add(seat, [0, 200, 0]));
  step(b, { title: "Screw four studs into each armrest", detail: "Lay both armrests inside face up. Screw each stud in by hand, pointed end out, until its collar meets the fabric.", scene: "arms", kind: "bolts", warnings: ["floor"] }, () => {
    arms.forEach((k, i) => b.stage(k, [(i - 0.5) * 900, AW / 2, 0], [0, 0, (i === 0 ? -1 : 1) * Math.PI / 2], [0, 200, 0]));
    b.then(0.15);
    b.fits(STUD, arms.flatMap((k, i) => [...seatPts(i === 0 ? -1 : 1), ...backPts(i === 0 ? -1 : 1)].map((p): FitOpts => ({ on: k, at: p, dir: [i === 0 ? -1 : 1, 0, 0], hole: false }))), 0.08);
  });
  step(b, { title: "Stand the seat on the left armrest", detail: "Stand the seat on its end over the armrest lying on the floor, studs through the holes. A washer and a nut on each, tightened with the spanner.", pose: "+x", tools: ["wrench"], kind: "bolts", people: 2 }, () => {
    b.add(arms[0], [-300, 0, 0]);
    b.then(0.1);
    nutUp(seatPts(-1), -1, seat, 30);
  });
  if (three)
    step(b, { title: "Pull the cover onto the back frame", detail: "Work it on from one end like a sock, so the seams sit along the edges.", scene: "back", kind: "general" }, () => {
      b.stage(backF, [0, 20, 0], [Math.PI / 2, 0, 0], [0, 200, 0]);
      b.then(0.15);
      b.stage(backC, [0, 20, 0], [Math.PI / 2, 0, 0], [600, 0, 0]);
    });
  step(b, { title: "Bolt the back to the armrest", detail: "Behind the seat, onto the two upper studs. A washer and a nut on each.", pose: "+x", tools: ["wrench"], kind: "bolts" }, () => {
    b.add(backF, [0, 0, -300]);
    if (backC) b.add(backC, [0, 0, -300]);
    b.then(0.1);
    nutUp(backPts(-1), -1, backF, 25);
  });
  step(b, { title: "Lower the other armrest on top", detail: "All four studs through their holes, then a washer and a nut on each.", pose: "+x", tools: ["wrench"], kind: "bolts", people: 2 }, () => {
    b.add(arms[1], [300, 0, 0]);
    b.then(0.1);
    nutUp(seatPts(1), 1, seat, 30);
    b.then(0.05);
    nutUp(backPts(1), 1, backF, 25);
  });
  if (three)
    step(b, { title: "Fix the two brackets at the back", detail: "Each one hooks the back frame to the seat; one bolt each.", pose: "+x", tools: ["wrench"], kind: "bolts" }, () => {
      const pts = [-SW / 4, SW / 4].map((x): Vec3 => [x, SEAT0 + 40, ZB + 20]);
      b.fits(BACK_BRACKET, pts.map((p): FitOpts => ({ on: seat, at: p, dir: [0, 0, 1], hole: false })), 0.2);
      b.then(0.1);
      b.fits(BACK_BOLT, pts.map((p): FitOpts => ({ on: seat, at: [p[0], p[1] + 60, ZB - 20], dir: [0, 0, 1], mate: backF })), 0.2);
    });
  step(b, { title: "Stand the sofa on its legs", detail: "Lift it over together rather than rolling it on one armrest.", pose: "+y", kind: "standup", people: 2 });
  step(b, { title: "Fill the seat cover with the cushions", detail: "Unpack the cushions and let them swell back into shape (it can take up to 72 hours). Push one into each pocket of the seat cover and close the zips.", kind: "cushions" }, () => {
    b.stagger(0.3);
    for (const k of cush) b.add(k, [0, 0, 500]);
  });
  step(b, { title: "Lay on the back cushions", detail: "Along the top of the back, one over each seat.", kind: "cushions" }, () => {
    b.stagger(0.3);
    for (const k of backs) b.add(k, [0, 300, 0]);
  });
  step(b, { title: "Fasten the back cushions underneath", detail: "Pull each cushion's strap down behind the back and fasten it under the seat, then plump the cushions up.", kind: "cushions" });
  return { W };
}

/* ---------------------------------------------------------------- family */

const family: Family = {
  names: ["GLOSTAD"],
  build(b, s) {
    if (s.archetype !== "sofa") return false;
    if (s.sofa?.pouffe) {
      stool(b, [0, 0], "main", true, true);
      step(b, { title: "Stand it on its legs", detail: "Check every leg is screwed fully in before you sit on it.", pose: "+y", kind: "standup" });
      return true;
    }
    if (s.sofa?.corner) return false;
    const { W } = sofa(b, s);
    if (s.sofa?.chaise) {
      const g = s.sofa.chaise === "left" ? -1 : 1;
      const at: [number, number] = [g * (W / 2 - AW - 290), D / 2 + 340];
      const st = stool(b, at, "stool", true, false);
      step(b, { title: "Hook the footstool onto the sofa", detail: "Stand it in front of the seat at one end and lower its brackets over the front edge of the seat frame. Swap ends whenever you like.", kind: "join" }, () => {
        b.add(st.body, [0, 200, 200]);
        for (const k of st.legs) b.add(k, [0, 200, 200]);
      });
    }
    return true;
  },
};
export default family;
