import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/**
 * LÅNESPELARE, read from the monitor stand's manual. The perforated steel top lies upside down on a rug and the two
 * long U-shaped leg frames are set into it, legs up, one along the front rim and one along the back. Each frame is
 * tipped down into its clips, four Allen bolts go through the rim into the frames, and with the stand on its legs
 * the top is pressed down and the bolts are tightened.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, D = s.size.d * 10;
  const H = 140; // IKEA's height
  const rim = 20, tube = 16;
  const xPost = W / 2 - 55, xBolt = W / 2 - 110;
  const zBar = D / 2 - 2 - tube / 2;
  const yBar = H - rim + tube / 2;
  const legH = yBar + tube / 2;
  const leg = (id: string, sz: number): CustomPart => ({
    id,
    name: "Leg frame",
    size: [2 * xPost + tube, legH, tube],
    pos: [0, legH / 2, sz * zBar],
    material: "metal",
    pieces: [
      ...[-1, 1].map((sx) => ({ shape: "cyl" as const, size: [tube, yBar, tube] as Vec3, pos: [sx * xPost, yBar / 2 - legH / 2, 0] as Vec3 })),
      { shape: "cyl", size: [tube, 2 * xPost + tube, tube], pos: [0, yBar - legH / 2, 0], rot: [0, 0, Math.PI / 2] },
    ],
  });
  const parts: CustomPart[] = [
    {
      id: "TOP",
      name: "Top",
      size: [W, rim, D],
      pos: [0, H - rim / 2, 0],
      material: "metal",
      pieces: [
        { shape: "box", size: [W, 2, D], pos: [0, rim / 2 - 1, 0] },
        ...[-1, 1].map((sz) => ({ shape: "box" as const, size: [W, rim, 2] as Vec3, pos: [0, 0, sz * (D / 2 - 1)] as Vec3 })),
        ...[-1, 1].map((sx) => ({ shape: "box" as const, size: [2, rim, D] as Vec3, pos: [sx * (W / 2 - 1), 0, 0] as Vec3 })),
      ],
    },
    leg("LF", 1),
    leg("LB", -1),
  ];
  const bolts = [-1, 1].map((sz) => fx("bolt", [-xBolt, xBolt].map((x): Vec3 => [x, yBar, sz * (D / 2)]), [0, 0, -sz], "TOP", { name: "Allen bolt", len: 16, dia: 6, mate: sz > 0 ? "LF" : "LB" }));
  const steps: CustomStep[] = [
    {
      title: "Set the leg frames into the top",
      detail: "Lay the top upside down on a rug and stand both frames in it, legs up, so the holes in the tubes face the holes in the rim.",
      add: ["TOP", "LF", "LB"],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Tip each frame into its clips", detail: "Push the tube against the rim and press it down until it snaps under both clips.", repeat: 2 },
    { title: "Turn in the bolts", detail: "One through the rim at each end of each frame. Leave them a little loose for now.", fix: bolts, tools: ["allen"], warnings: ["loose"] },
    {
      title: "Turn it over and tighten the bolts",
      detail: "Stand it on its legs, press the top down firmly, then tighten all four bolts until their heads sit flush.",
      pose: "+y",
      tools: ["allen"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["LÅNESPELARE", "LANESPELARE"],
  recipe(s) {
    if (!/monitor stand/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
