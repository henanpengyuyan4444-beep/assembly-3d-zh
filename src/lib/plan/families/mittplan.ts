import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * MITTPLAN, read from the desk's manual. Each side is one welded steel frame: an upright post at the back, a leg
 * leaning up from the front foot, an arm across the top for the shelf. One frame lies on a rug, four rails are bolted
 * into it, then the top rail; the other frame goes on top with five bolts and two people stand it up. The desk top
 * takes three bolts up through the back rail and three screws through the front rail, the top shelf five bolts
 * through the arms and the top rail, then all 21 are tightened. The hook clips onto a side, the cord bag hangs on a rail.
 * IKEA: 80 wide, 60 deep, desk top at 75, 97 high at the shelf.
 */

/** Euler angles (x then z) that turn a part's y axis onto d. */
function along(d: Vec3): Vec3 {
  const n = Math.hypot(...d);
  const [x, y, z] = [d[0] / n, d[1] / n, d[2] / n];
  return [Math.atan2(z, y), 0, Math.atan2(-x, Math.hypot(y, z))];
}

/** A square steel tube from a to b, as a piece of a part centred at c. */
function bar(a: Vec3, b: Vec3, t: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return { shape: "box", size: [t, Math.hypot(...v), t], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: along(v) };
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const W = 800, D = 600, H = 970;
  const T = 30, TT = 18; // tube, board
  const yDesk = 750, yArm = H - TT - T / 2;
  const zP = -D / 2 + T / 2, zFoot = D / 2 - T / 2, zTopLeg = -40; // back post, front foot, top of the leaning leg
  const zLeg = (y: number) => zFoot + ((zTopLeg - zFoot) * y) / yArm;
  const yR = yDesk - TT - T / 2; // rails under the desk top
  const xF = W / 2 - T / 2;
  const frame = (sx: number): CustomPart => {
    const c: Vec3 = [sx * xF, (yArm + T / 2) / 2, 0];
    const x = sx * xF;
    return {
      id: sx < 0 ? "F1" : "F2",
      name: "Side frame",
      size: [T, yArm + T / 2, D],
      pos: c,
      material: "metal",
      pieces: [
        bar([x, 0, zP], [x, yArm + T / 2, zP], T, c),
        bar([x, 0, zFoot], [x, yArm, zTopLeg], T, c),
        bar([x, yArm, zP], [x, yArm, zTopLeg + T], T, c),
        bar([x, yR, zP], [x, yR, zLeg(yR)], T, c),
      ],
    };
  };
  const rail = (id: string, y: number, z: number): CustomPart => ({ id, name: "Rail", size: [W - 2 * T, T, T], pos: [0, y, z], material: "metal" });
  const yBag = 540, yLow = 170;
  const zShelf = -D / 2 + 140;
  const parts: CustomPart[] = [
    frame(-1),
    rail("R1", yR, zP),
    rail("R2", yR, zLeg(yR) - T),
    rail("R3", yBag, zP),
    rail("R4", yLow, zP),
    rail("R5", yArm, zShelf),
    frame(1),
    { id: "DT", name: "Desk top", size: [W, TT, D], pos: [0, yDesk - TT / 2, 0], material: "board" },
    { id: "TS", name: "Top shelf", size: [W, TT, 280], pos: [0, H - TT / 2, zShelf], material: "board" },
    {
      id: "BG",
      name: "Cord bag",
      size: [440, 150, 70],
      pos: [80, yBag - 60, zP + 5],
      material: "soft",
      pieces: [{ shape: "cyl", size: [70, 440, 70], pos: [0, -15, 0], rot: [0, 0, Math.PI / 2] }, { shape: "box", size: [440, 60, 6], pos: [0, 45, -T / 2 - 3] }],
    },
  ];
  const railBolts = (sx: number, ids: string[]): CustomFix[] =>
    ids.map((id) => {
      const p = parts.find((q) => q.id === id)!.pos;
      return fx("bolt", [[sx * (W / 2), p[1], p[2]]], [-sx, 0, 0], sx < 0 ? "F1" : "F2", { mate: id, len: 60, dia: 6 });
    });
  const along3 = (y: number, z: number): Vec3[] => [-250, 0, 250].map((x): Vec3 => [x, y, z]);
  const steps: CustomStep[] = [
    {
      title: "Bolt four rails to a side frame",
      detail: "Lay the frame flat on a rug. Press the little pins into the rail ends that have them, then one bolt into each rail, turned in by hand.",
      add: ["F1", "R1", "R2", "R3", "R4"],
      fix: railBolts(-1, ["R1", "R2", "R3", "R4"]),
      pose: "+x",
      warnings: ["floor"],
    },
    { title: "Bolt on the top rail", detail: "It goes into the end of the top arm, holes facing the shelf.", add: ["R5"], fix: railBolts(-1, ["R5"]) },
    {
      title: "Bolt the other side frame on",
      detail: "Lower it onto all five rails and bolt each one, still by hand. Then stand the desk up together.",
      add: ["F2"],
      fix: railBolts(1, ["R1", "R2", "R3", "R4", "R5"]),
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Bolt the desk top on from below",
      detail: "Lay it on the frame, flush at the back. Three bolts up through the back rail.",
      add: ["DT"],
      fix: [fx("bolt", along3(yR - T / 2, zP), [0, 1, 0], "R1", { mate: "DT", len: 60, dia: 6 })],
      pose: "+y",
    },
    {
      title: "Screw the front rail to the desk top",
      detail: "Three screws up through the front rail, turned with the Allen key.",
      fix: [fx("screw", along3(yR - T / 2, zLeg(yR) - T), [0, 1, 0], "R2", { mate: "DT", len: 20, dia: 4 })],
      tools: ["allen"],
    },
    {
      title: "Bolt the top shelf on",
      detail: "Two bolts up through each top arm and one through the top rail.",
      add: ["TS"],
      fix: [
        ...[-1, 1].map((sx) => fx("bolt", [zP + 60, zShelf + 80].map((z): Vec3 => [sx * xF, yArm - T / 2, z]), [0, 1, 0], sx < 0 ? "F1" : "F2", { mate: "TS", len: 60, dia: 6 })),
        fx("bolt", [[0, yArm - T / 2, zShelf]], [0, 1, 0], "R5", { mate: "TS", len: 60, dia: 6 }),
      ],
    },
    { title: "Tighten everything", detail: "Go round all 18 bolts and 3 screws with the Allen key and tighten them firmly.", tools: ["allen"], check: "square" },
    {
      title: "Hang the hook and the cord bag",
      detail: "Push the hook down over the right frame. Loop the bag's flap over the back rail so it hangs behind the desk.",
      add: ["BG"],
      fix: [{ kind: "hook", count: 1, at: [[W / 2, yBag - 10, zP]], dir: [0, -1, 0], on: "F2" }],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["MITTPLAN"],
  recipe(s) {
    if (!/desk/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
