import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * DOMSTEN, read from the stool's manual. The seat lies upside down, the two U-shaped steel leg frames are laid on
 * it and six sleeve bolts go down through the holes in the tubes into the seat, tightened with the Allen key.
 */

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, d: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...v);
  const n = v.map((x) => x / L);
  return { shape: "cyl", size: [d, L, d], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(n[2], n[1]), 0, -Math.asin(n[0])] };
}

function recipe(s: ProductSpec): CustomParams {
  const H = s.size.h * 10;
  const SD = 340; // IKEA's seat diameter
  const T = 28;
  const yS = H - T;
  const d = 22;
  const yR = yS - d / 2; // the frame's top tube, under the seat
  const top = 112, foot = 142; // leg centres from the middle, under the seat and on the floor
  const parts: CustomPart[] = [{ id: "SE", name: "Seat", size: [SD, T, SD], pos: [0, H - T / 2, 0], material: "wood", pieces: [{ shape: "cyl", size: [SD, T, SD], pos: [0, 0, 0] }] }];
  for (const [i, sx] of [-1, 1].entries()) {
    const c: Vec3 = [(sx * (top + foot)) / 2, (yR + d / 2) / 2, 0];
    const pieces: PartPiece[] = [
      tube([sx * top, yR, -top], [sx * top, yR, top], d, c),
      tube([sx * foot, 0, -foot], [sx * top, yR, -top], d, c),
      tube([sx * foot, 0, foot], [sx * top, yR, top], d, c),
    ];
    parts.push({ id: `F${i}`, name: "Leg frame", size: [foot - top + d, yR + d / 2, 2 * foot + d], pos: c, material: "metal", pieces });
  }
  const bolts = (i: number) => {
    const sx = i ? 1 : -1;
    return { kind: "bolt" as const, count: 3, at: [-75, 0, 75].map((z): Vec3 => [sx * top, yR - d / 2, z]), dir: [0, 1, 0] as Vec3, on: `F${i}`, mate: "SE", len: 40, dia: 6, name: "Sleeve bolt" };
  };
  const steps: CustomStep[] = [
    { title: "Lay the seat upside down", detail: "On a rug or the flattened box, so the pine doesn't get scratched.", add: ["SE"], pose: "-y", warnings: ["floor"] },
    { title: "Lay the two leg frames on the seat", detail: "Each one's top tube lies flat on the seat, its holes over the holes in the seat.", add: ["F0", "F1"], from: { F0: [0, -260, 0], F1: [0, -260, 0] } },
    {
      title: "Bolt the frames to the seat",
      detail: "Six sleeve bolts, three in each frame, down through the tube into the seat. Tighten them with the Allen key.",
      fix: [bolts(0), bolts(1)],
      tools: ["allen"],
    },
    { title: "Turn it over", detail: "Stand it on its feet. It's for sitting on, not for standing on.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["DOMSTEN"],
  recipe(s) {
    if (!/stool/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
