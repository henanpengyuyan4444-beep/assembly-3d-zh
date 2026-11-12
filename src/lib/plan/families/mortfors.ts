import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * MÖRTFORS, read from the pouffe's manual. The round seat is laid upside down, each of the four legs has a bent
 * plate at its top that is bolted to the underside with two Allen bolts (eight in all), then it is turned over.
 * IKEA: seat 41 across, 44 high, 47 x 47 over the splayed legs.
 */

/** Euler angles (x then z) that turn a part's y axis onto d. */
function along(d: Vec3): Vec3 {
  const n = Math.hypot(...d);
  const [x, y, z] = [d[0] / n, d[1] / n, d[2] / n];
  return [Math.atan2(z, y), 0, Math.atan2(-x, Math.hypot(y, z))];
}

function recipe(s: ProductSpec): CustomParams {
  const H = Math.round(s.size.h * 10) || 440;
  const R = 205; // seat, 41 across
  const seatT = 150;
  const yU = H - seatT; // underside of the seat
  const legD = 34;
  const rFoot = 235 - legD / 2, rTop = 150;
  const dirs: Vec3[] = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  const parts: CustomPart[] = [{ id: "SE", name: "Seat", shape: "cyl", size: [2 * R, seatT, 2 * R], pos: [0, yU + seatT / 2, 0], material: "soft" }];
  const bolts: Vec3[] = [];
  dirs.forEach((u, i) => {
    const top: Vec3 = [u[0] * rTop, yU - 6, u[2] * rTop];
    const foot: Vec3 = [u[0] * rFoot, 0, u[2] * rFoot];
    const c: Vec3 = [(top[0] + foot[0]) / 2, yU / 2, (top[2] + foot[2]) / 2];
    const L = Math.hypot(top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]);
    const pieces: PartPiece[] = [
      { shape: "cyl", size: [legD, L, legD], pos: [0, -3, 0], rot: along([top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]]) },
      // the bent plate, flat under the seat and reaching in towards the middle
      { shape: "box", size: u[0] ? [80, 4, 34] : [34, 4, 80], pos: [top[0] - u[0] * 30 - c[0], yU - 2 - c[1], top[2] - u[2] * 30 - c[2]] },
    ];
    parts.push({ id: `L${i + 1}`, name: "Leg", size: [Math.abs(foot[0] - top[0]) + 60, yU, Math.abs(foot[2] - top[2]) + 60], pos: c, material: "wood", pieces });
    for (const r of [rTop - 50, rTop - 10]) bolts.push([u[0] * r, yU - 4, u[2] * r]);
  });
  const legs = parts.slice(1).map((p) => p.id);
  const steps: CustomStep[] = [
    { title: "Lay the seat upside down", detail: "On a rug or the flattened box, so the fabric stays clean.", add: ["SE"], pose: "-y", warnings: ["floor"] },
    {
      title: "Bolt on the four legs",
      detail: "Line each leg's plate up with its two holes, the leg leaning outwards. Two bolts in each plate, tightened with the Allen key.",
      add: legs,
      fix: legs.map((id, i) => ({ kind: "bolt" as const, count: 2, len: 16, dia: 6, at: bolts.slice(2 * i, 2 * i + 2), dir: [0, 1, 0] as Vec3, on: id, mate: "SE" })),
      tools: ["allen"],
    },
    { title: "Turn it over", detail: "Stand it on its legs and check it doesn't rock.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["MÖRTFORS", "MORTFORS"],
  recipe(s) {
    if (!/pouf/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
