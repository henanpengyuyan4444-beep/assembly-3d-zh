import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartItem, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * TRONES, read from the shoe cabinet's manual. The moulded cabinet comes in one piece, so the manual is all about
 * hanging it: the door lifts off its hinge pins, the cabinet is held against the wall to mark the two top holes, two
 * screws go in (heads left out), the cabinet hangs on them while the two lower holes are marked, those screws go in,
 * it hangs back on all four and they are tightened through the back. Last the door clicks back on. Wall plugs and
 * screws aren't in the box.
 */

function fx(kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix {
  return { kind, count: at.length, at, dir, ...o };
}

function cabinet(s: ProductSpec): CustomParams {
  // IKEA: 52 wide, 18 deep, 39 high
  const W = Math.round(s.size.w * 10) || 520, H = Math.round(s.size.h * 10) || 390, D = Math.round(s.size.d * 10) || 180;
  const t = 8, base = 20, c: Vec3 = [0, H / 2, -10];
  const body: CustomPart = {
    id: "BODY",
    name: "Cabinet",
    size: [W, H, D - 20],
    pos: c,
    pieces: [
      ...[-1, 1].map((sx) => ({ shape: "box" as const, size: [t, H, D - 20] as Vec3, pos: [sx * (W / 2 - t / 2), 0, 0] as Vec3 })),
      { shape: "box", size: [W - 2 * t, t, D - 20], pos: [0, H / 2 - 25, 0] }, // the recessed top tray
      { shape: "box", size: [W - 2 * t, 18, 20], pos: [0, H / 2 - 9, -(D - 20) / 2 + 10] },
      { shape: "box", size: [W - 2 * t, base, D - 30], pos: [0, -H / 2 + base / 2, 0] },
      { shape: "box", size: [W - 2 * t, H - 30, 4], pos: [0, -5, -(D - 20) / 2 + 2] },
    ],
    material: "board",
  };
  const door: CustomPart = { id: "DOOR", name: "Door", size: [W - 10, H - base - 40, 12], pos: [0, base + (H - base - 40) / 2 + 4, c[2] + (D - 20) / 2 + 6], material: "board" };
  const zb = -D / 2; // the wall
  const top: Vec3[] = [-1, 1].map((sx): Vec3 => [sx * (W / 2 - 60), H - 50, zb]);
  const low: Vec3[] = [-1, 1].map((sx): Vec3 => [sx * (W / 2 - 60), 60, zb]);
  const fixing = (pts: Vec3[]) => [fx("plug", pts.map((p): Vec3 => [p[0], p[1], p[2] - 2]), [0, 0, -1]), fx("screw", pts.map((p): Vec3 => [p[0], p[1], p[2] + 6]), [0, 0, -1], { len: 50, dia: 5, name: "Wall screw" })];
  return {
    parts: [body, door],
    steps: [
      { title: "Lift the door off", detail: "Tip it open, then ease the hinge pins out of their slots at the bottom and lift it away.", add: ["BODY", "DOOR"], warnings: ["hand"], tools: [] },
      { title: "Mark the top holes on the wall", detail: "Hold the cabinet where you want it, level, and mark through the two top holes in the back.", wall: true, tools: ["pencil", "level"] },
      { title: "Drill and screw in the top two screws", detail: "Leave the heads standing out a few millimetres so the cabinet can hang on them.", fix: fixing(top), wall: true, tools: ["drill", "screwdriver", "level"] },
      { title: "Hang it and mark the lower holes", detail: "Hook the cabinet over the two screws and mark through the two lower holes.", wall: true, tools: ["pencil"] },
      { title: "Drill and screw in the lower two screws", detail: "Take the cabinet down, check the marks are level and fit the two lower screws the same way.", fix: fixing(low), wall: true, tools: ["drill", "screwdriver", "level"] },
      { title: "Hang it and tighten all four screws", detail: "Hook it on again and tighten the four screws through the back, not so hard that the plastic bends.", wall: true, tools: ["screwdriver"] },
      { title: "Click the door back on", detail: "Push the hinge pins into their slots and close it.", wall: true, tools: [] },
    ],
  };
}

const recipe = (s: ProductSpec) => (/trones-shoe-cabinet/.test(s.slug ?? "") ? cabinet(s) : null);

/** The door is set aside on the floor while the cabinet goes on the wall, then clicked back on. */
function build(b: PlanBuilder, s: ProductSpec): boolean {
  const r = recipe(s);
  if (!r) return false;
  const start = b.steps.length;
  buildCustom(b, { ...s, custom: r });
  r.steps.forEach((st, i) => {
    const bs = b.steps[start + i];
    if (bs && st.tools && bs.title === st.title) bs.tools = [...st.tools];
  });
  const door = r.parts[1];
  const it = b.items.find((x): x is PartItem => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - door.pos[k]) < 0.5));
  const st = it?.states.find((x) => x.step === start);
  if (it && st) {
    it.states.push(
      { ...st, step: start + 1, pos: [door.pos[0], 6, door.pos[2] + 380], rot: [-Math.PI / 2, 0, 0], from: undefined },
      { ...st, step: start + r.steps.length - 1, pos: door.pos, rot: [0, 0, 0], from: [0, 0, 300] },
    );
    it.states.sort((a, c) => a.step - c.step);
  }
  return true;
}

const family: Family = { names: ["TRONES"], recipe, build };
export default family;
