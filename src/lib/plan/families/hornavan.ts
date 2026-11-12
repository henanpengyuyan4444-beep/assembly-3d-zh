import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * HORNAVAN, read from the trolley's one-page manual. Two bent tube side frames (a loop with three bars across it),
 * three wire mesh baskets and four castors; no tools and no screws. Each basket's rim is hooked over the bars of both
 * side frames and pressed down until it clicks, from the bottom up, then a castor is pushed into the foot of each leg.
 */

const TUBE = 19, BAR = 6;
const rodZ = (len: number, dia: number, p: Vec3): PartPiece => ({ shape: "cyl", size: [dia, len, dia], pos: p, rot: [Math.PI / 2, 0, 0] });

function trolley(): CustomParams {
  // IKEA: 48 wide, 26 deep, 77 high
  const W = 480, D = 260, H = 770;
  const yFoot = 45; // castor height
  const xs = W / 2 - TUBE / 2, zp = D / 2 - TUBE / 2;
  const levels = [210, 460, 720]; // basket rims, bottom to top
  const bh = 110;

  const side = (id: string, sx: number): CustomPart => {
    const yc = (yFoot + H) / 2;
    const post = (sz: number): PartPiece => ({ shape: "cyl", size: [TUBE, H - TUBE / 2 - yFoot, TUBE], pos: [0, (yFoot + H - TUBE / 2) / 2 - yc, sz * zp] });
    return {
      id,
      name: "Side frame",
      size: [TUBE, H - yFoot, D],
      pos: [sx * xs, yc, 0],
      material: "metal",
      pieces: [
        post(-1),
        post(1),
        rodZ(2 * zp, TUBE, [0, H - TUBE / 2 - yc, 0]),
        ...levels.map((y) => rodZ(2 * zp - TUBE, BAR, [-sx * 6, y - 15 - yc, 0])),
      ],
    };
  };

  const bw = 2 * (xs - TUBE / 2), bd = D - 30, t = 3;
  const basket = (id: string, y: number): CustomPart => ({
    id,
    name: "Mesh basket",
    size: [bw, bh, bd],
    pos: [0, y - bh / 2, 0],
    material: "metal",
    pieces: [
      { shape: "box", size: [bw - 30, t, bd], pos: [0, -bh / 2 + t / 2, 0] },
      ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [bw - 30, bh, t], pos: [0, 0, sz * (bd / 2 - t / 2)] })),
      ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [t, bh, bd], pos: [sx * (bw / 2 - 15), 0, 0] })),
      // the rim's hooks that rest on the side frames' bars
      ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [15, 8, bd - 40], pos: [sx * (bw / 2 - 7.5), bh / 2 - 4, 0] })),
    ],
  });

  const parts: CustomPart[] = [side("L", -1), side("R", 1), ...levels.map((y, i) => basket(`B${i + 1}`, y))];
  const feet: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * xs, yFoot, sz * zp] as Vec3));

  return {
    parts,
    steps: [
      {
        title: "Hook the bottom basket between the side frames",
        detail: "Hold the two side frames upright and hook the basket's rim over their lowest bars. Press it down until it clicks.",
        add: ["L", "R", "B1"],
        from: { B1: [0, 300, 0] },
      },
      {
        title: "Hook in the middle basket",
        detail: "Over the middle bars, the same way. Press down on both ends until it clicks.",
        add: ["B2"],
        from: { B2: [0, 300, 0] },
      },
      {
        title: "Hook in the top basket",
        detail: "Over the top bars. Check all three baskets sit level.",
        add: ["B3"],
        from: { B3: [0, 300, 0] },
      },
      {
        title: "Push a castor into each leg",
        detail: "Lift one corner at a time and push the castor's peg up into the tube until it stops.",
        fix: (["L", "R"] as const).map((on) => {
          const pts = feet.filter((p) => (p[0] < 0) === (on === "L"));
          return { kind: "castor" as const, count: pts.length, at: pts, dir: [0, 1, 0] as Vec3, on, len: yFoot, dia: 40 };
        }),
      },
    ],
  };
}

const family: Family = {
  names: ["HORNAVAN"],
  recipe(s) {
    if (/trolley/i.test(s.variant) || /hornavan-trolley/.test(s.slug ?? "")) return trolley();
    return null;
  },
};
export default family;
