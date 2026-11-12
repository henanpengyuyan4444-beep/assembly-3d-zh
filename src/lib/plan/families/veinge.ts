import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * VEINGE, read from the easy chair's manual. It's an armless lounge chair: an oval seat shell and an oval back shell
 * on two bent steel tubes. Each tube runs from a back foot up behind the back shell, down under the seat and out to
 * a front foot. With the back shell face down on a table, each tube takes two bolts with washers, by hand; a glide
 * goes into each foot and the chair is stood up. The seat shell drops onto the tubes and takes three bolts a side,
 * then all ten are tightened. The seat cushion presses onto the seat shell and the back cushion onto the back.
 */

const TUBE = 22;

/** A round tube from a to b. */
function tube(a: Vec3, b: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const h = Math.hypot(d[0], d[2]);
  const [ux, uz] = h > 1e-6 ? [d[0] / h, d[2] / h] : [1, 0];
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [0, Math.atan2(-uz, ux), -Math.acos(d[1] / len)] };
}

/** A bent tube through these points, as one part. */
function bent(id: string, pts: Vec3[]): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])) - TUBE / 2);
  const hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])) + TUBE / 2);
  lo[1] = Math.max(0, lo[1]);
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const rel = (p: Vec3): Vec3 => [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const pieces = pts.slice(1).map((p, i) => tube(rel(pts[i]), rel(p)));
  return { id, name: "Leg tube", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material: "metal" };
}

/** An oval (a stadium) w wide and d deep, t thick, lying flat: a box with a half disc on each end. */
function ovalFlat(w: number, d: number, t: number): PartPiece[] {
  const x = w / 2 - d / 2;
  return [{ shape: "box", size: [2 * x, t, d], pos: [0, 0, 0] }, ...[-1, 1].map((s): PartPiece => ({ shape: "halfcyl", size: [d, t, d / 2], pos: [s * (x + d / 4), 0, 0], rot: [0, (s * Math.PI) / 2, 0] }))];
}

/** An oval w wide and h high, t thick, standing up facing the front. */
function ovalUp(w: number, h: number, t: number): PartPiece[] {
  const x = w / 2 - h / 2;
  return [{ shape: "box", size: [2 * x, h, t], pos: [0, 0, 0] }, ...[-1, 1].map((s): PartPiece => ({ shape: "halfcyl", size: [h, t, h / 2], pos: [s * (x + h / 4), 0, 0], rot: [Math.PI / 2, (s * Math.PI) / 2, 0] }))];
}

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, ...o });

function chair(): CustomParams {
  // IKEA: 76 wide, 92 deep, 79 high; seat 73 x 49 at 41 high
  const H = 790, yS = 410;
  const SW = 730, SD = 540, zS = 80; // the seat oval
  const shellY0 = 290, shellT = 40, cushT = yS - shellY0 - shellT;
  const BW = 540, BH = 400, zB = -232, backT = 26, backCush = 70; // the back oval, its top at H
  const yB = H - BH / 2;
  const yT = shellY0 - TUBE / 2; // the tubes' run under the seat
  const zTube = zB - backT / 2 - TUBE / 2; // behind the back shell
  const parts: CustomPart[] = [];
  const sides = [-1, 1];
  sides.forEach((sx, i) =>
    parts.push(
      bent(`T${i}`, [
        [sx * 345, 0, -470],
        [sx * 215, 560, zTube],
        [sx * 215, 430, zTube + 6],
        [sx * 215, yT, -170],
        [sx * 215, yT, 220],
        [sx * 330, 0, 440],
      ]),
    ),
  );
  parts.push({ id: "SS", name: "Seat shell", size: [SW, shellT, SD], pos: [0, shellY0 + shellT / 2, zS], pieces: ovalFlat(SW, SD, shellT), material: "board" });
  parts.push({ id: "BS", name: "Back shell", size: [BW, BH, backT], pos: [0, yB, zB], pieces: ovalUp(BW, BH, backT), material: "board" });
  parts.push({ id: "SC", name: "Seat cushion", size: [SW - 10, cushT, SD - 10], pos: [0, shellY0 + shellT + cushT / 2, zS], pieces: ovalFlat(SW - 10, SD - 10, cushT), material: "soft" });
  parts.push({ id: "BC", name: "Back cushion", size: [BW - 10, BH - 10, backCush], pos: [0, yB, zB + backT / 2 + backCush / 2], pieces: ovalUp(BW - 10, BH - 10, backCush), material: "soft" });

  const washer = { len: 2, dia: 18 }, bolt = { len: 20, dia: 6 };
  // two through the back shell into each tube, from the front of the shell
  const backPts = (sx: number): Vec3[] => [[sx * 215, 545, zB + backT / 2], [sx * 215, 455, zB + backT / 2]];
  const backFix = (i: number): CustomFix[] => [at("washer", backPts(sides[i]), [0, 0, -1], "BS", washer), at("bolt", backPts(sides[i]), [0, 0, -1], "BS", { ...bolt, mate: `T${i}` })];
  // three down through the seat shell into each tube
  const seatPts = (sx: number): Vec3[] => [-110, 30, 170].map((z) => [sx * 215, shellY0 + shellT, z] as Vec3);
  const seatFix = (i: number): CustomFix[] => [at("washer", seatPts(sides[i]), [0, -1, 0], "SS", washer), at("bolt", seatPts(sides[i]), [0, -1, 0], "SS", { ...bolt, mate: `T${i}` })];
  const feet: Vec3[] = [[-345, 0, -470], [345, 0, -470], [330, 0, 440], [-330, 0, 440]];
  return {
    parts,
    steps: [
      {
        title: "Bolt the first leg tube to the back shell",
        detail: "Lay the back shell face down on a table. A washer on each bolt; turn them in by hand only, leaving a small gap under the head.",
        add: ["BS", "T0"],
        fix: backFix(0),
        pose: "-z",
        warnings: ["loose"],
      },
      { title: "Bolt on the second leg tube", detail: "The same on the other side, by hand, with its feet splayed out the same way.", add: ["T1"], fix: backFix(1) },
      {
        title: "Press a glide into each foot",
        detail: "Push the four glides into the tube ends until they sit flat, then stand the chair on its feet.",
        fix: feet.map((p, k) => at("glide", [p], [0, 1, 0], k % 3 === 0 ? "T0" : "T1", { name: "Glide", len: 8, dia: 26 })),
        pose: "+y",
      },
      { title: "Lay the seat shell on the tubes", detail: "Line its holes up with the holes in the tubes.", add: ["SS"] },
      { title: "Bolt the seat shell to the left tube", detail: "Three bolts with washers, by hand, leaving a small gap for now.", fix: seatFix(0) },
      { title: "Bolt the seat shell to the right tube", detail: "Three more on the other side, also by hand.", fix: seatFix(1) },
      {
        title: "Tighten all ten bolts",
        detail: "Four in the back shell, six in the seat shell. Tighten each with the Allen key until the washer is pressed flat.",
        tools: ["allen"],
      },
      { title: "Press the seat cushion onto the seat shell", detail: "Line it up all round, then press it down firmly so it grips.", add: ["SC"] },
      { title: "Fit the back cushion", detail: "Hook it over the top edge of the back shell, then press it on from the top down.", add: ["BC"], from: { BC: [0, 0, 300] } },
    ],
  };
}

const family: Family = {
  names: ["VEINGE"],
  recipe: (s) => (/easy chair|armchair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair() : null),
};
export default family;
