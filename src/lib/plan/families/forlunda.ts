import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * FÖRLUNDA pouffe with storage, read from its manual. With the round body lying on its side, each of the four flat
 * wooden legs is held against the outside and bolted from inside with two Allen bolts. Upside down, a felt pad goes
 * under each leg; stood up, the padded lid is laid on top.
 * IKEA: 44 cm across, 41 cm high.
 */

function pouffe(s: ProductSpec): CustomParams {
  const H = Math.round(s.size.h * 10) || 410, Dia = Math.round(s.size.w * 10) || 440;
  const legT = 20, legW = 60, legL = 300;
  const R = Dia / 2 - legT, yB = 110, lidT = 50, yL = H - lidT; // body radius, its underside, top of the body
  const rl = R + legT / 2;

  const parts: CustomPart[] = [
    { id: "BO", name: "Body", shape: "cyl", size: [2 * R, yL - yB, 2 * R], pos: [0, (yL + yB) / 2, 0], material: "soft" },
    { id: "LID", name: "Lid", shape: "cyl", size: [2 * R - 10, lidT, 2 * R - 10], pos: [0, yL + lidT / 2, 0], material: "soft" },
  ];
  const angles = [0, 1, 2, 3].map((k) => Math.PI / 4 + (k * Math.PI) / 2);
  angles.forEach((a, k) =>
    parts.push({
      id: `L${k}`,
      name: "Leg",
      size: [legW, legL, legT],
      pos: [rl * Math.cos(a), legL / 2, rl * Math.sin(a)],
      rot: [0, Math.PI / 2 - a, 0],
      material: "wood",
      pieces: [
        // a flat board with rounded ends
        { shape: "box", size: [legW, legL - legW, legT], pos: [0, 0, 0] },
        { shape: "cyl", size: [legW, legT, legW], pos: [0, (legL - legW) / 2, 0], rot: [Math.PI / 2, 0, 0] },
        { shape: "cyl", size: [legW, legT, legW], pos: [0, -(legL - legW) / 2, 0], rot: [Math.PI / 2, 0, 0] },
      ],
    }),
  );
  const legIds = angles.map((_, k) => `L${k}`);
  const bolts: CustomFix[] = angles.map((a, k) => ({
    kind: "bolt",
    count: 2,
    len: 30,
    dia: 6,
    at: [yB + 50, legL - 50].map((y): Vec3 => [(R - 15) * Math.cos(a), y, (R - 15) * Math.sin(a)]),
    dir: [Math.cos(a), 0, Math.sin(a)],
    on: "BO",
    mate: `L${k}`,
  }));

  return {
    parts,
    steps: [
      {
        title: "Bolt the legs to the body",
        detail: "Lay the body on its side on a rug. Hold a leg against the outside, rounded end down, and put two bolts in from inside. Roll it a quarter turn for each leg.",
        add: ["BO", ...legIds],
        fix: bolts,
        pose: "+x",
        tools: ["allen"],
        warnings: ["floor"],
      },
      {
        title: "Stick a felt pad under each leg",
        detail: "Turn it upside down and press a pad onto the end of every leg.",
        fix: [{ kind: "glide", name: "Felt pad", count: 4, len: 3, dia: 40, at: angles.map((a): Vec3 => [rl * Math.cos(a), 0, rl * Math.sin(a)]), dir: [0, 1, 0], to: legIds }],
        pose: "-y",
      },
      { title: "Turn it over and put on the lid", detail: "Stand it on its legs and lay the lid on top; it lifts off for the storage inside.", add: ["LID"], pose: "+y", from: { LID: [0, 250, 0] } },
    ],
  };
}

const family: Family = {
  names: ["FÖRLUNDA", "FORLUNDA"],
  recipe(s) {
    if (/^forlunda-pouffe/.test(s.slug ?? "")) return pouffe(s);
    return null;
  },
};
export default family;
