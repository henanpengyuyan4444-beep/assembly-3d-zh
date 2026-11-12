import type { Family } from "./family";
import type { CustomParams, PartPiece, ProductSpec } from "../../types";

/**
 * KJUGE, read from the pouffe's manual. No tools and no fittings: the fabric body is pulled open into a hexagon,
 * the stiff bottom board is laid in and pressed flat, and the padded lid is set on top.
 */

/** A flat hexagon (corners left and right) as three crossed boxes. */
const hexPlate = (R: number, t: number, y = 0): PartPiece[] =>
  [0, 1, 2].map((i) => ({ shape: "box", size: [R, t, R * Math.sqrt(3)], pos: [0, y, 0], rot: [0, (i * Math.PI) / 3, 0] }));

/** Six fabric walls round a hexagon of corner radius R. */
const hexWalls = (R: number, h: number, t: number): PartPiece[] => {
  const a = (R * Math.sqrt(3)) / 2 - t / 2;
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const th = Math.PI / 2 + (i * Math.PI) / 3;
    return { shape: "box", size: [R, h, t], pos: [a * Math.cos(th), 0, a * Math.sin(th)], rot: [0, -th + Math.PI / 2, 0] };
  });
};

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 38 across the corners, 33 high
  const R = (s.size.w * 10 || 380) / 2;
  const H = 330;
  const lidT = 55, bodyH = H - lidT + 10;
  const d = R * Math.sqrt(3);
  return {
    parts: [
      { id: "B", name: "Pouffe body", size: [2 * R, bodyH, d], pos: [0, bodyH / 2, 0], material: "soft", pieces: hexWalls(R, bodyH, 12) },
      { id: "P", name: "Bottom board", size: [2 * R - 30, 8, d - 26], pos: [0, 10, 0], material: "fiber", pieces: hexPlate(R - 15, 8) },
      { id: "L", name: "Padded lid", size: [2 * R + 6, lidT, d + 6], pos: [0, H - lidT / 2, 0], material: "soft", pieces: hexPlate(R + 3, lidT) },
    ],
    steps: [
      { title: "Pull the pouffe body open", detail: "Hold two opposite corners and pull until all six sides stand straight.", add: ["B"] },
      { title: "Lay the bottom board inside", detail: "Lower it in flat, tab up, and press it down all round until it sits on the bottom.", add: ["P"], from: { P: [0, 420, 0] } },
      { title: "Put the lid on", detail: "Turn it so its corners line up with the body's corners, then press it down.", add: ["L"], from: { L: [0, 300, 0] } },
    ],
  };
}

const family: Family = { names: ["KJUGE"], recipe };
export default family;
