import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * NORDMANSSKÄR, read from the chair's manual. The upholstered shell lies face down on a table. The legs come as two
 * welded frames, each a front leg and the opposite back leg joined by a bar across the underside. The first frame
 * goes on with two long bolts started by hand, the second crosses it and takes one short bolt where the bars meet,
 * then two long bolts of its own. Last, all five are tightened with the Allen key.
 * IKEA: 44 wide, 58 deep, 85 high, seat at 46.
 */

/** Euler angles (x then z) that turn a part's y axis onto d. */
function along(d: Vec3): Vec3 {
  const n = Math.hypot(...d);
  const [x, y, z] = [d[0] / n, d[1] / n, d[2] / n];
  return [Math.atan2(z, y), 0, Math.atan2(-x, Math.hypot(y, z))];
}

/** A round rod from a to b, as a piece of a part centred at c. */
function rod(a: Vec3, b: Vec3, d: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return { shape: "cyl", size: [d, Math.hypot(...v), d], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: along(v) };
}

function recipe(s: ProductSpec): CustomParams {
  const W = 440, D = 580, H = Math.round(s.size.h * 10) || 850;
  const SH = 460, seatT = 40;
  const yU = SH - seatT; // underside of the seat
  const yBar = yU - 12;
  const xt = 150, zf = 150, zb = -150; // leg tops under the seat
  const xf = W / 2 - 15, zF = D / 2 - 40, zB = -D / 2 + 60; // feet
  const legD = 26;
  // the shell: a seat dished at the back, rising into a back that leans back a little
  const zS = 40, seatD = 440;
  const backH = H - SH + 60, tilt = 0.16;
  const zBk = zS - seatD / 2 - 10 - Math.sin(tilt) * (backH / 2);
  const cy = (yU + H) / 2;
  const shell: PartPiece[] = [
    { shape: "box", size: [430, seatT, seatD], pos: [0, yU + seatT / 2 - cy, zS] },
    { shape: "box", size: [420, backH, 34], pos: [0, SH - 60 + backH / 2 - cy, zBk], rot: [-tilt, 0, 0] },
    { shape: "box", size: [400, 90, 80], pos: [0, SH - 5 - cy, zS - seatD / 2 + 20] },
  ];
  const frame = (sx: number): CustomPart => {
    const tf: Vec3 = [sx * xt, yBar, zf], tb: Vec3 = [-sx * xt, yBar, zb];
    const ff: Vec3 = [sx * xf, 0, zF], fb: Vec3 = [-sx * xf, 0, zB];
    const c: Vec3 = [0, yBar / 2, (zF + zB) / 2];
    return {
      id: sx < 0 ? "F1" : "F2",
      name: "Leg frame",
      size: [2 * xf + legD, yBar + 12, zF - zB + legD],
      pos: c,
      material: "metal",
      pieces: [rod(tf, ff, legD, c), rod(tb, fb, legD, c), rod(tf, tb, 18, c)],
    };
  };
  const parts: CustomPart[] = [
    { id: "SE", name: "Seat shell", size: [430, H - yU, D - 40], pos: [0, cy, 0], material: "soft", pieces: shell },
    frame(-1),
    frame(1),
  ];
  const long = (on: string, sx: number) => ({ kind: "bolt" as const, count: 2, len: 40, dia: 6, at: [[sx * xt, yU - 6, zf], [-sx * xt, yU - 6, zb]] as Vec3[], dir: [0, 1, 0] as Vec3, on, mate: "SE" });
  const steps: CustomStep[] = [
    {
      title: "Bolt the first leg frame to the seat",
      detail: "Lay the seat face down on a table covered with a cloth. Turn the two long bolts in by hand only.",
      add: ["SE", "F1"],
      fix: [long("F1", -1)],
      pose: "-y",
      warnings: ["hand"],
    },
    {
      title: "Lay the second frame across it",
      detail: "Its bar crosses the first one in the middle. Join them with the short bolt, by hand.",
      add: ["F2"],
      fix: [{ kind: "bolt", count: 1, len: 16, dia: 6, at: [[0, yBar - 9, (zf + zb) / 2]], dir: [0, 1, 0], on: "F2", mate: "F1" }],
    },
    { title: "Bolt the second frame to the seat", detail: "Two long bolts, by hand again so everything can still line up.", fix: [long("F2", 1)] },
    { title: "Tighten all the bolts", detail: "All five, firmly with the Allen key. Tighten them again after a couple of weeks.", tools: ["allen"] },
    { title: "Turn the chair over", detail: "Stand it on its feet and check it doesn't rock.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["NORDMANSSKÄR", "NORDMANSSKAR"],
  recipe(s) {
    if (!/chair/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
