import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * EMMISLÖV, read from the pouf's manual. No tools and no fittings: the welded steel frame comes in one piece with
 * its feet already on, the upholstered seat is lowered into the top ring and pressed down on both sides until it
 * sits firmly.
 */

const RING_SEGS = 28;

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, d: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...v);
  const n = v.map((x) => x / L);
  return { shape: "cyl", size: [d, L, d], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(n[2], n[1]), 0, -Math.asin(n[0])] };
}

/** A flat steel ring of radius r at height y, as short straight tubes. */
function ring(r: number, y: number, d: number, c: Vec3): PartPiece[] {
  const pt = (i: number): Vec3 => [r * Math.cos((2 * Math.PI * i) / RING_SEGS), y, r * Math.sin((2 * Math.PI * i) / RING_SEGS)];
  return Array.from({ length: RING_SEGS }, (_, i) => tube(pt(i), pt(i + 1), d, c));
}

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10;
  const R = W / 2;
  const d = 10;
  const yRing = H * 0.6; // the top ring, round the waist of the seat
  const rTop = R - 8, rFoot = R - 12;
  const yBot = 14;
  const c: Vec3 = [0, (yRing + d / 2) / 2, 0];
  const legs = [0, 1, 2, 3].map((i) => Math.PI / 4 + (i * Math.PI) / 2);
  const frame: PartPiece[] = [
    ...ring(rTop, yRing, d, c),
    ...ring(rFoot, yBot, d, c),
    ...legs.map((a) => tube([rFoot * Math.cos(a), yBot, rFoot * Math.sin(a)], [rTop * Math.cos(a), yRing, rTop * Math.sin(a)], d, c)),
    // the feet, already pressed onto the bottom ring
    ...legs.map((a): PartPiece => ({ shape: "box", size: [22, yBot + 6, 22], pos: [rFoot * Math.cos(a) - c[0], (yBot + 6) / 2 - c[1], rFoot * Math.sin(a) - c[2]] })),
  ];
  // the seat: a deep round cushion, its lower half narrower so it drops into the ring
  const yLow = H * 0.4;
  const cy = (H + yLow) / 2;
  const seat: PartPiece[] = [
    { shape: "cyl", size: [2 * R, H - yRing - 30, 2 * R], pos: [0, (H + yRing + 30) / 2 - cy, 0], material: "soft" },
    { shape: "cyl", size: [2 * R - 30, yRing + 30 - yLow, 2 * R - 30], pos: [0, (yRing + 30 + yLow) / 2 - cy, 0], material: "soft" },
  ];
  const parts: CustomPart[] = [
    { id: "FR", name: "Frame", size: [2 * rTop + d, yRing + d / 2, 2 * rTop + d], pos: c, material: "metal", pieces: frame },
    { id: "SE", name: "Seat", size: [2 * R, H - yLow, 2 * R], pos: [0, cy, 0], material: "soft", pieces: seat },
  ];
  const steps: CustomStep[] = [
    { title: "Stand the frame on the floor", detail: "Its feet are already on. Check all four sit flat.", add: ["FR"] },
    { title: "Lower the seat into the frame", detail: "The narrow part goes down through the top ring.", add: ["SE"], from: { SE: [0, 360, 0] } },
    { title: "Press the seat down", detail: "Push down on both sides at once until it sits evenly in the ring all the way round." },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["EMMISLÖV", "EMMISLOV"],
  recipe(s) {
    if (!/pouf|pouffe/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
