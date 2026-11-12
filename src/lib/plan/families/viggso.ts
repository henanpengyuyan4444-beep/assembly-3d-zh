import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * VIGGSÖ, read from the folding lounge chair's manual. The steel frame comes folded in one piece: unfold it, push
 * the top of the backrest onto the two uprights and fix it with two screws. The fabric cover pulls down over the
 * backrest from the top; with the chair folded its seat end goes over the front of the seat, then the chair is
 * opened out and the cover's two clips at the back of the seat snap onto the frame.
 */

const TUBE = 20;

/** A round tube from a to b. */
function tube(a: Vec3, b: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const h = Math.hypot(d[0], d[2]);
  const [ux, uz] = h > 1e-6 ? [d[0] / h, d[2] / h] : [1, 0];
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [0, Math.atan2(-uz, ux), -Math.acos(d[1] / len)] };
}

/** One part drawn from tubes and boxes placed in the finished product (mm): its box is their extent. */
function part(id: string, name: string, runs: [Vec3, Vec3][], boxes: PartPiece[], material: CustomPart["material"], dia = TUBE): CustomPart {
  const pts: Vec3[] = runs.flat();
  for (const bx of boxes) for (const s of [-1, 1]) pts.push([bx.pos[0] + (s * bx.size[0]) / 2, bx.pos[1] + (s * bx.size[1]) / 2, bx.pos[2] + (s * bx.size[2]) / 2]);
  const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])) - TUBE / 2);
  const hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])) + TUBE / 2);
  lo[1] = Math.max(0, lo[1]);
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const rel = (p: Vec3): Vec3 => [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const pieces: PartPiece[] = [...runs.map(([a, b]) => tube(rel(a), rel(b), dia)), ...boxes.map((bx) => ({ ...bx, pos: rel(bx.pos) }))];
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, ...o });

function chair(): CustomParams {
  // IKEA: 58 wide, 80 deep, 93 high; seat 51 x 39 at 35 high
  const H = 930, yS = 330;
  const xF = 275, xB = 250; // the front U and the back uprights, from the middle
  const zSF = 250, zSB = -140; // the seat frame's front bar and back bar
  const zBack = (y: number) => -150 - ((y - yS) * 250) / (H - 20 - yS); // the backrest leans back 25 cm over its height
  const yJoin = 640; // where the top of the backrest meets the uprights

  const frame = part(
    "F",
    "Folding frame",
    [
      // the front U: a bar on the floor and two legs up to the back of the seat
      [[-xF, TUBE / 2, 330], [xF, TUBE / 2, 330]],
      ...[-1, 1].map((s): [Vec3, Vec3] => [[s * xF, TUBE / 2, 330], [s * xF, yS, -90]]),
      // the seat frame
      ...[-1, 1].map((s): [Vec3, Vec3] => [[s * (xB + TUBE), yS, zSF], [s * (xB + TUBE), yS, zSB]]),
      [[-(xB + TUBE), yS, zSF], [xB + TUBE, yS, zSF]],
      [[-(xB + TUBE), yS, zSB], [xB + TUBE, yS, zSB]],
      // the back legs, running on up as the uprights
      ...[-1, 1].map((s): [Vec3, Vec3] => [[s * xB, TUBE / 2, -400], [s * xB, yS, zBack(yS)]]),
      ...[-1, 1].map((s): [Vec3, Vec3] => [[s * xB, yS, zBack(yS)], [s * xB, yJoin + 60, zBack(yJoin + 60)]]),
    ],
    [],
    "metal",
  );
  const top = part(
    "T",
    "Top of the backrest",
    [...[-1, 1].map((s): [Vec3, Vec3] => [[s * xB, yJoin, zBack(yJoin)], [s * xB, H - TUBE / 2, zBack(H - TUBE / 2)]]), [[-xB, H - TUBE / 2, zBack(H - TUBE / 2)], [xB, H - TUBE / 2, zBack(H - TUBE / 2)]]],
    [],
    "metal",
    TUBE + 4, // it slides over the uprights
  );
  // the cover: a sling over the seat and a sleeve over the backrest
  const lean = Math.atan2(250, H - 20 - yS);
  const backLen = (H - yS) / Math.cos(lean);
  const cover = part(
    "C",
    "Cover",
    [],
    [
      { shape: "box", size: [2 * xB + 40, 8, zSF - zSB + 20], pos: [0, yS + TUBE / 2 + 4, (zSF + zSB) / 2], material: "soft" },
      { shape: "box", size: [2 * xB + 30, backLen, 14], pos: [0, (yS + H) / 2 + 10, zBack((yS + H) / 2)], rot: [-lean, 0, 0], material: "soft" },
    ],
    "soft",
  );

  const screwPts = [-1, 1].map((s) => [s * (xB + TUBE / 2 + 2), yJoin + 40, zBack(yJoin + 40)] as Vec3);
  return {
    parts: [frame, top, cover],
    steps: [
      { title: "Unfold the frame", detail: "Open it out until the seat frame lies level and the legs stand firmly on the floor.", add: ["F"] },
      {
        title: "Push the top of the backrest onto the uprights",
        detail: "The bar goes at the top. Push both ends down over the uprights as far as they go, so the holes line up.",
        add: ["T"],
        from: { T: [0, 300, 0] },
      },
      {
        title: "Fix it with two screws",
        detail: "One through each side, into the upright.",
        fix: [-1, 1].map((s, i) => at("screw", [screwPts[i]], [-s, 0, 0], "T", { len: 12, dia: 4, mate: "F" })),
        tools: ["screwdriver"],
      },
      {
        title: "Pull the cover down over the backrest",
        detail: "Start at the top and pull it down evenly on both sides until it sits snug.",
        add: ["C"],
        from: { C: [0, 400, 0] },
      },
      {
        title: "Pull the seat end over the front of the seat",
        detail: "Fold the chair up first, so the cover reaches. Pull the pocket at its end down over the front bar.",
      },
      {
        title: "Open the chair and clip the cover on",
        detail: "Unfold it, smooth the cover and snap its two clips onto the bar at the back of the seat.",
        fix: [at("clip", [[-xB + 40, yS + TUBE / 2, zSB], [xB - 40, yS + TUBE / 2, zSB]], [0, -1, 0], "C", { name: "Cover clip", len: 20, dia: 24, mate: "F" })],
      },
    ],
  };
}

const family: Family = {
  names: ["VIGGSÖ", "VIGGSO"],
  recipe: (s) => (/lounge|chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair() : null),
};
export default family;
