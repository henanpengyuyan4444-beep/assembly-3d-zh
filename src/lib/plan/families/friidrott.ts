import type { ProductSpec, Vec3 } from "../../types";
import type { FitOpts, HwDef, PlanBuilder } from "../builder";
import type { Family } from "./family";
import { drawerParts, drawerSteps, drawersIn, slotsOf, stepper, type Unit } from "./alex";

/**
 * FRIIDROTT, read from the drawer unit's manual. The sides lie flat and get four runner rails each, two screws a rail.
 * The back takes four dowels, the sides are pushed onto it and long Allen screws go through them into its edges.
 * Dowels in the top ends of the sides, the top laid on and screwed down with four long screws; then upside down, the
 * same for the bottom, and the four castors screwed on (two screws each) before it is stood up. The four drawers are
 * built like ALEX's (cam bolts in the front, a dowel in each side, cam locks, the bottom slid down the grooves, the
 * back held by plastic dowels hammered through the sides) and slid onto the rails, with two stops each.
 */

const T = 15; // matches the ALEX drawers it shares
const DOWEL: HwDef = { kind: "dowel", len: 30, dia: 8 };
const LONG: HwDef = { kind: "screw", len: 50, dia: 6, name: "Long Allen screw" };
const RAIL_SCREW: HwDef = { kind: "screw", len: 12, dia: 4, name: "Rail screw" };
const CASTOR: HwDef = { kind: "castor", len: 60, dia: 50 };
const CASTOR_SCREW: HwDef = { kind: "screw", len: 14, dia: 4 };

function build(b: PlanBuilder, s: ProductSpec) {
  if (!/drawer-unit/.test(s.slug ?? "")) return false;
  // IKEA: 35 wide, 40 deep, 56 high, four drawers
  const W = Math.round(s.size.w * 10) || 350, D = Math.round(s.size.d * 10) || 400, H = Math.round(s.size.h * 10) || 560;
  const y0 = 60, Hc = H - y0;
  const g: Unit = { W, D, Hc, y0, slots: ["shallow", "shallow", "shallow", "shallow"], pitch: { shallow: (Hc - 2 * T) / 4, deep: 0 } };
  const slots = slotsOf(g);
  const xi = W / 2 - T;
  const yTop = y0 + Hc - T, yBot = y0 + T;
  const hs = yTop - yBot;
  const st = stepper(b);

  const sideT = b.part("Side panel", [T, hs, D]);
  const sides = [-1, 1].map((sg) => b.place(sideT, [sg * (W / 2 - T / 2), (yTop + yBot) / 2, 0]));
  const back = b.place(b.part("Back panel", [2 * xi, hs, T]), [0, (yTop + yBot) / 2, -D / 2 + T / 2]);
  const tb = b.part("Top and bottom panel", [W, T, D]);
  const top = b.place(tb, [0, yTop + T / 2, 0]);
  const bottom = b.place(tb, [0, y0 + T / 2, 0]);
  const runLen = D - T - T - 30;
  const railT = b.part("Runner rail", [12, 16, runLen], { material: "metal" });
  const rz = D / 2 - T - 10 - runLen / 2;
  const rails = [-1, 1].map((sg) => slots.map((sl) => b.place(railT, [sg * (xi - 6), sl.yb + 12, rz])));
  const ds = drawerParts(b, slots, true);

  const sideKey = (sg: number) => sides[sg < 0 ? 0 : 1];
  const zEnds = [-D / 4, D / 4];
  const xEnd = (sg: number) => sg * (W / 2 - T / 2);

  // the sides lie flat, inside up, side by side; rails sit on them
  const flat = (sg: number): { pos: Vec3; rot: Vec3 } => ({ pos: [sg * (D / 2 + 40), T / 2, 0], rot: [0, 0, sg < 0 ? Math.PI / 2 : -Math.PI / 2] });
  st({ title: "Screw the runner rails onto the sides", detail: "Lay both sides on a rug, inside up. Four rails on each, two screws a rail, the open end towards the front.", tools: ["screwdriver"], kind: "runners", scene: "flat", warnings: ["floor"] }, () => {
    b.stagger(0.15);
    for (const sg of [-1, 1]) {
      const f = flat(sg);
      b.stage(sideKey(sg), f.pos, f.rot, [0, 160, 0]);
    }
    b.then(0.15);
    for (const sg of [-1, 1]) {
      const f = flat(sg);
      const sp = b.partItem(sideKey(sg)).final.pos;
      for (const r of rails[sg < 0 ? 0 : 1]) {
        const rp = b.partItem(r).final.pos;
        const dx = rp[0] - sp[0], dy = rp[1] - sp[1];
        // turned a quarter about z: the side's inside face now faces up
        const rel: Vec3 = sg < 0 ? [-dy, dx, rp[2]] : [dy, -dx, rp[2]];
        b.stage(r, [f.pos[0] + rel[0], f.pos[1] + rel[1], rel[2]], f.rot, [0, 120, 0]);
      }
    }
    b.then(0.15);
    b.fits(RAIL_SCREW, [-1, 1].flatMap((sg) => rails[sg < 0 ? 0 : 1].flatMap((r) => [rz - runLen / 2 + 30, rz + runLen / 2 - 30].map((z): FitOpts => ({ on: r, at: [sg * (xi - 12), b.partItem(r).final.pos[1], z], dir: [sg, 0, 0] })))), 0.03);
  });
  st({ title: "Tap four dowels into the back", detail: "Two in each long edge.", tools: ["hammer"], kind: "dowels" }, () => {
    b.add(back, [0, 200, 0]);
    b.then(0.15);
    b.fits(DOWEL, [-1, 1].flatMap((sg) => [yBot + 120, yTop - 120].map((y): FitOpts => ({ on: back, at: [sg * xi, y, -D / 2 + T / 2], dir: [sg, 0, 0], mate: sideKey(sg) }))));
  });
  st({ title: "Push the sides onto the back", detail: "Rails facing in, onto the dowels in the back's edges.", kind: "join" }, () => {
    b.stagger(0.25);
    for (const sg of [-1, 1]) {
      b.add(sideKey(sg), [sg * 260, 0, 0]);
      for (const r of rails[sg < 0 ? 0 : 1]) b.add(r, [sg * 260, 0, 0]);
    }
  });
  st({ title: "Screw the sides to the back", detail: "Two long screws through each side into the back's edge, with the Allen key.", tools: ["allen"], kind: "bolts" }, () =>
    b.fits(LONG, [-1, 1].flatMap((sg) => [yBot + 60, yTop - 60].map((y): FitOpts => ({ on: sideKey(sg), at: [sg * (W / 2), y, -D / 2 + T / 2], dir: [-sg, 0, 0], mate: back })))),
  );
  const endDowels = (end: "top" | "bottom") =>
    [-1, 1].flatMap((sg) => zEnds.map((z): FitOpts => ({ on: sideKey(sg), at: [xEnd(sg), end === "top" ? yTop : yBot, z], dir: end === "top" ? [0, -1, 0] : [0, 1, 0], mate: end === "top" ? top : bottom })));
  const endScrews = (end: "top" | "bottom") =>
    [-1, 1].flatMap((sg) => [-D / 2 + 50, D / 2 - 50].map((z): FitOpts => (end === "top" ? { on: top, at: [xEnd(sg), y0 + Hc, z], dir: [0, -1, 0], mate: sideKey(sg) } : { on: bottom, at: [xEnd(sg), y0, z], dir: [0, 1, 0], mate: sideKey(sg) })));
  st({ title: "Tap dowels into the top ends of the sides", detail: "Two in each.", tools: ["hammer"], kind: "dowels" }, () => b.fits(DOWEL, endDowels("top")));
  st({ title: "Screw the top on", detail: "Line its front edge up with the sides, then four long screws down into them.", tools: ["allen"], kind: "bolts" }, () => {
    b.add(top, [0, 260, 0]);
    b.then(0.15);
    b.fits(LONG, endScrews("top"));
  });
  st({ title: "Turn it over and tap in the bottom dowels", detail: "Stand it on its top on a rug. Two dowels in each side.", tools: ["hammer"], kind: "dowels", pose: "-y", warnings: ["floor"] }, () => b.fits(DOWEL, endDowels("bottom")));
  st({ title: "Screw the bottom on", detail: "Front edges flush, four long screws.", tools: ["allen"], kind: "bolts" }, () => {
    b.add(bottom, [0, -260, 0]);
    b.then(0.15);
    b.fits(LONG, endScrews("bottom"));
  });
  const cx = W / 2 - 45, cz = D / 2 - 55;
  st({ title: "Screw the castors on", detail: "One in each corner, two screws through each plate.", tools: ["screwdriver"], kind: "legs" }, () => {
    const pts = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * cx, y0, sz * cz]));
    b.fits(CASTOR, pts.map((at): FitOpts => ({ on: bottom, at, dir: [0, 1, 0], hole: false })), 0.2);
    b.then(0.1);
    b.fits(CASTOR_SCREW, pts.flatMap((p) => [-1, 1].map((e): FitOpts => ({ on: bottom, at: [p[0], y0, p[2] + e * 18], dir: [0, 1, 0] }))), 0.04);
  });
  st({ title: "Stand it on its castors", detail: "Tip it over carefully.", pose: "+y", kind: "standup" }, () => {});
  drawerSteps(b, st, ds, "shallow", { boltsFirst: true, oneKind: true });
  drawersIn(b, st, ds, ["shallow"]);
  return true;
}

const family: Family = { names: ["FRIIDROTT"], build };
export default family;
