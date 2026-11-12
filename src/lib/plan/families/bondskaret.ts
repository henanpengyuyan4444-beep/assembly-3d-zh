import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * BONDSKÄRET, read from the coat stand's manual. Everything threads onto two rods: a short one in the bottom tube
 * carries a sleeve and the three feet (built upside down, then bolted and capped), the second tube screws on, a long
 * rod goes into its top, and the short tube, four big hooks, a spacer, four small hooks and a top collar slide down
 * it in turn before the top bolt and cap. The hooks are turned to spread them last.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, ...o });
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];
const TUBE = 40, COLLAR = 40;

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 175 high, 60 across the feet
  const H = s.size.h * 10 || 1750;
  const reach = Math.max(s.size.w * 10, 600) / 2 - 15;
  const y0 = 70; // underside of the bottom collar, the cap below it
  const footH = 40, sleeveH = 40;
  const t1 = y0 + 3 * footH + sleeveH; // bottom of the first tube
  const bigH = 40, smallH = 35, capH = 10;
  const top = H - capH;
  const yTopCollar = top - COLLAR;
  const ySmall = yTopCollar - 4 * smallH;
  const ySpacer = ySmall - COLLAR;
  const yBig = ySpacer - 4 * bigH;
  const run = yBig - t1; // two long tubes and a short one, about 2 : 2 : 1
  const long = Math.round((run * 2) / 5), short = run - 2 * long;
  const t2 = t1 + long, t3 = t2 + long;

  const tube = (id: string, name: string, y: number, h: number): CustomPart => ({ id, name, shape: "cyl", size: [TUBE, h, TUBE], pos: [0, y + h / 2, 0], material: "metal" });
  const collar = (id: string, name: string, y: number, h: number): CustomPart => ({ id, name, shape: "cyl", size: [COLLAR, h, COLLAR], pos: [0, y + h / 2, 0], material: "metal" });
  // a foot: its collar on the rod, an arm out and a leg down to the floor, turned to its own angle
  const foot = (k: number): CustomPart => {
    const y = y0 + k * footH, armY = y + footH / 2;
    return {
      id: `F${k}`,
      name: "Foot",
      size: [2 * reach, armY + 12, 26],
      pos: [0, (armY + 12) / 2, 0],
      rot: [0, (k * 2 * Math.PI) / 3 + Math.PI / 2, 0],
      material: "metal",
      pieces: [
        { shape: "cyl", size: [COLLAR, footH, COLLAR], pos: [0, armY - (armY + 12) / 2, 0] },
        { shape: "box", size: [reach - 20, 24, 24], pos: [(reach + 20) / 2, armY - (armY + 12) / 2, 0] },
        { shape: "box", size: [24, armY + 12, 24], pos: [reach - 12, 0, 0] },
      ],
    };
  };
  // a hook: a collar, an arm out and its end bent up
  const hook = (id: string, name: string, y: number, h: number, out: number, rise: number, ang: number): CustomPart => {
    const mid = y + h / 2;
    return {
      id,
      name,
      size: [2 * out, h + rise, 22],
      pos: [0, mid, 0],
      rot: [0, ang, 0],
      material: "metal",
      pieces: [
        { shape: "cyl", size: [COLLAR - 4, h, COLLAR - 4], pos: [0, 0, 0] },
        { shape: "box", size: [out - 15, 20, 20], pos: [(out + 15) / 2, -h / 2 + 12, 0] },
        { shape: "box", size: [20, rise, 20], pos: [out - 10, -h / 2 + 2 + rise / 2, 0] },
      ],
    };
  };
  const q = Math.PI / 2;
  const parts: CustomPart[] = [
    tube("A", "Tube", t1, long),
    collar("P", "Sleeve", y0 + 3 * footH, sleeveH),
    foot(0),
    foot(1),
    foot(2),
    tube("B", "Tube", t2, long),
    tube("C", "Short tube", t3, short),
    ...[0, 1, 2, 3].map((i) => hook(`H${i}`, "Big hook", yBig + i * bigH, bigH, 210, 130, i * q)),
    collar("S", "Spacer", ySpacer, COLLAR),
    ...[0, 1, 2, 3].map((i) => hook(`K${i}`, "Small hook", ySmall + i * smallH, smallH, 120, 100, i * q + q / 2)),
    collar("T", "Top collar", yTopCollar, COLLAR),
  ];
  const endBolt = (y: number, dir: Vec3, on: string): CustomFix[] => [
    fx("bolt", [[0, y, 0]], { dir, on, len: 16, dia: 8 }),
    fx("washer", [[0, y, 0], [0, y, 0]], { dir, on, dia: 18 }),
  ];

  return {
    parts,
    steps: [
      {
        title: "Screw the short rod into a long tube",
        detail: "Into the end without a thread on the outside. Turn it in by hand until it stops.",
        add: ["A"],
        fix: [fx("stud", [[0, t1, 0]], { name: "Threaded rod", dir: UP, on: "A", len: 200, dia: 8 })],
        pose: "-y",
      },
      { title: "Slide the sleeve onto the rod", detail: "Push it down until it sits against the tube.", add: ["P"] },
      {
        title: "Slide the three feet onto the rod",
        detail: "Each foot has a different length of leg: the one with the shortest goes on first, next to the sleeve.",
        add: ["F2", "F1", "F0"],
      },
      {
        title: "Bolt the feet on and tap the cap in",
        detail: "Bolt, spring washer and washer onto the rod's end with the Allen key. Then tap the cap in with a hammer and stand it up.",
        fix: [...endBolt(y0, UP, "F0"), fx("cap", [[0, y0, 0]], { dir: UP, on: "F0", len: 8, dia: 38 })],
        tools: ["allen", "hammer"],
      },
      {
        title: "Screw the second long tube on",
        detail: "Turn it onto the thread at the top of the first one until it's tight and straight.",
        add: ["B"],
        pose: "+y",
      },
      {
        title: "Screw the long rod into the top",
        detail: "Turn it in by hand until it stops.",
        fix: [fx("stud", [[0, t3, 0]], { name: "Threaded rod", dir: DOWN, on: "B", len: H - t3, dia: 8 })],
      },
      { title: "Slide the short tube down the rod", add: ["C"] },
      {
        title: "Slide the four big hooks on",
        detail: "One at a time, each collar sitting on the one below. Point the hooks in four different directions.",
        add: ["H0", "H1", "H2", "H3"],
      },
      { title: "Slide the spacer on", detail: "The plain one, without a notch.", add: ["S"] },
      { title: "Slide the four small hooks on", detail: "Point them between the big hooks below.", add: ["K0", "K1", "K2", "K3"] },
      { title: "Slide the top collar on", detail: "The one with a notch, notch up.", add: ["T"] },
      {
        title: "Bolt the top and tap the cap in",
        detail: "Bolt, spring washer and washer onto the rod's end with the Allen key, then tap the cap in.",
        fix: [...endBolt(top, DOWN, "T"), fx("cap", [[0, H, 0]], { dir: DOWN, on: "T", len: 8, dia: 38 })],
        tools: ["allen", "hammer"],
      },
      { title: "Turn the hooks to spread them", detail: "Twist each one round the pole until they are evenly spaced, so the stand hangs balanced." },
    ],
  };
}

const family: Family = { names: ["BONDSKÄRET"], recipe };
export default family;
