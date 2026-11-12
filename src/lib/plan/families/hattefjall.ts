import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * HATTEFJÄLL office chair with armrests, read from its manual. Five castors press into the base on a rug, the base is
 * turned over and the gas lift stood in it. The backrest's bar slides into the back of the seat's mechanism and is
 * held by three bolts, then the seat is pressed onto the gas lift. Each armrest is screwed to the side of the seat
 * with two screws, and a cover clicks up over the foot of each arm. Allen key in the box.
 * IKEA's sizes: 68 x 68 cm, up to 114 high, seat 50 x 40 and 46 to 56 cm high.
 */

/** One part drawn as boxes given in finished-product mm. */
function boxes(id: string, name: string, list: [Vec3, Vec3, PartMaterial?][], material: PartMaterial): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...list.map((b) => b[0][k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...list.map((b) => b[1][k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  const pieces: PartPiece[] = list.map(([a, b, m]) => ({
    shape: "box",
    size: [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    pos: [(a[0] + b[0]) / 2 - pos[0], (a[1] + b[1]) / 2 - pos[1], (a[2] + b[2]) / 2 - pos[2]],
    ...(m ? { material: m } : {}),
  }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos, material, pieces };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function chair(): CustomParams {
  const R = 315, AY0 = 70, AY1 = 105; // legs reach out to the castors
  const SY = 470, MY = 370; // top of the seat, underside of the mechanism
  const angles = [0, 1, 2, 3, 4].map((i) => (i * 2 * Math.PI) / 5);
  const base: CustomPart = {
    id: "A",
    name: "Star base",
    material: "board",
    size: [2 * R, AY1 - AY0 + 30, 2 * R],
    pos: [0, (AY0 + AY1 + 30) / 2, 0],
    pieces: [
      { shape: "cyl", size: [70, 65, 70], pos: [0, 0, 0] },
      ...angles.map((a): PartPiece => ({ shape: "box", size: [45, AY1 - AY0, R - 30], pos: [Math.sin(a) * (R + 30) / 2, -15, Math.cos(a) * (R + 30) / 2], rot: [0, a, 0] })),
    ],
  };
  const parts: CustomPart[] = [
    base,
    { id: "G", name: "Gas lift", shape: "cyl", material: "metal", size: [50, MY - 120, 50], pos: [0, (MY + 120) / 2, 0] },
    // the seat with its side wings and the mechanism under it, lever to the right
    boxes("S", "Seat", [
      [[-250, MY + 40, -200], [250, SY - 20, 200], "soft"],
      [[-200, SY - 20, -170], [200, SY, 190], "soft"],
      [[-250, SY - 20, -200], [-200, SY + 30, 120], "soft"],
      [[200, SY - 20, -200], [250, SY + 30, 120], "soft"],
      [[-90, MY, -120], [90, MY + 40, 110], "metal"],
      [[90, MY + 5, 20], [230, MY + 20, 40], "metal"],
    ], "soft"),
    // the backrest and its bar, which slides in under the back of the seat
    boxes("B", "Backrest", [
      [[-35, MY + 5, -290], [35, MY + 35, -120], "board"],
      [[-35, MY + 5, -300], [35, 600, -270], "board"],
      [[-230, 520, -330], [230, 1100, -270], "soft"],
    ], "soft"),
  ];
  // the back's rounded top
  const back = parts[parts.length - 1];
  const bc = back.pos;
  back.pieces = [
    ...back.pieces!.slice(0, 2),
    { shape: "box", size: [460, 330, 60], pos: [0, 705 - bc[1], -300 - bc[2]] },
    { shape: "halfcyl", size: [460, 60, 230], pos: [0, 985 - bc[1], -300 - bc[2]], rot: [-Math.PI / 2, 0, 0] },
  ];
  for (const [i, g] of [[0, -1], [1, 1]] as const) {
    const xs = (a: number, b: number): [number, number] => [Math.min(g * a, g * b), Math.max(g * a, g * b)];
    const [x0, x1] = xs(250, 275), [p0, p1] = xs(240, 262), [q0, q1] = xs(215, 290);
    parts.push(
      boxes(`R${i}`, "Armrest", [
        [[x0, SY - 60, -180], [x1, SY + 20, -60]],
        [[p0, SY + 20, -140], [p1, 680, -100]],
        [[q0, 680, -170], [q1, 705, 80]],
      ], "board"),
    );
  }

  const ends = angles.map((a): Vec3 => [Math.sin(a) * (R - 20), AY0, Math.cos(a) * (R - 20)]);
  return {
    parts,
    steps: [
      {
        title: "Press a castor into each leg",
        detail: "Lay the base upside down on a rug. Push each castor straight in until it snaps home, don't knock it in at an angle.",
        add: ["A"],
        fix: [fix("castor", ends, [0, 1, 0], { len: 60, dia: 50, on: "A" })],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Stand the base up and drop in the gas lift",
        detail: "Turn the base over onto its castors. The narrow end of the gas lift points up; it just sits in the hole.",
        add: ["G"],
        from: { G: [0, 300, 0] },
        pose: "+y",
      },
      {
        title: "Bolt the backrest to the seat",
        detail: "Lay the seat on a soft surface and slide the backrest's bar into the bracket under its back. Three bolts, tightened with the Allen key.",
        fix: [fix("bolt", [[-20, MY + 5, -150], [20, MY + 5, -150], [0, MY + 5, -200]], [0, 1, 0], { len: 16, dia: 8, on: "B", mate: "S" })],
        wait: ["S", "B"],
        tools: ["allen"],
      },
      {
        title: "Press the seat onto the gas lift",
        detail: "Set the mechanism over the top of the gas lift and push down. Sitting on it locks it for good.",
        add: ["S", "B"],
        from: { S: [0, 400, 0], B: [0, 400, 0] },
      },
      {
        title: "Screw the armrests to the seat",
        detail: "Two screws through the foot of each arm into the side of the seat. The arm sits flat against the seat, not twisted.",
        add: ["R0", "R1"],
        from: { R0: [-300, 0, 0], R1: [300, 0, 0] },
        fix: [0, 1].map((i) => {
          const g = i ? 1 : -1;
          return fix("screw", [-150, -90].map((z): Vec3 => [g * 275, SY - 25, z]), [-g, 0, 0], { len: 30, dia: 6, on: `R${i}`, mate: "S" });
        }),
        tools: ["allen"],
      },
      {
        title: "Click the covers onto the arms",
        detail: "Slide each cover up over the foot of the arm until it clicks, hiding the screws.",
        fix: [0, 1].map((i) => fix("clip", [[(i ? 1 : -1) * 268, SY - 60, -120]], [0, 1, 0], { len: 50, dia: 40, on: `R${i}`, name: "Arm cover" })),
      },
    ],
  };
}

const family: Family = {
  names: ["HATTEFJÄLL", "HATTEFJALL"],
  recipe(s: ProductSpec) {
    if (!/office chair/i.test(`${s.variant} ${s.slug ?? ""}`.replace(/-/g, " "))) return null;
    return chair();
  },
};
export default family;
