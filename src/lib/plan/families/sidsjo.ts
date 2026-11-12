import type { Family } from "./family";
import type { CustomParams, ProductSpec, Vec3 } from "../../types";

/**
 * SIDSJÖ, read from the storage pouffe's manual. It comes upholstered with the lid already hinged on. Upside down,
 * five feet screw in by hand (four round the edge and one in the middle). Stood up with the lid open, two gas
 * stays click onto the ball studs on the lid and the body, and the fabric storage bag drops inside.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 70 across, 46 high
  const Dm = s.size.w * 10 || 700, H = s.size.h * 10 || 460;
  const foot = 15, lidH = 130, top = H - lidH;
  const r = Dm / 2 - 70;
  const feet: Vec3[] = [...[0, 1, 2, 3].map((i): Vec3 => [r * Math.cos((i * Math.PI) / 2 + Math.PI / 4), 0, r * Math.sin((i * Math.PI) / 2 + Math.PI / 4)]), [0, 0, 0]];
  return {
    parts: [
      { id: "B", name: "Body with hinged lid", shape: "cyl", size: [Dm - 10, top - foot, Dm - 10], pos: [0, (foot + top) / 2, 0], material: "soft" },
      { id: "L", name: "Lid", shape: "cyl", size: [Dm, lidH, Dm], pos: [0, top + lidH / 2, 0], material: "soft" },
      { id: "G", name: "Storage bag", shape: "cyl", size: [Dm - 80, top - foot - 40, Dm - 80], pos: [0, (foot + top) / 2 + 15, 0], material: "soft" },
    ],
    steps: [
      {
        title: "Screw the feet in",
        detail: "Lay the pouffe upside down on a rug, lid closed. Five feet: four round the edge and one in the middle, turned in by hand.",
        add: ["B", "L"],
        fix: [{ kind: "foot", count: 5, len: 15, dia: 40, at: feet.map((p) => [p[0], foot, p[2]] as Vec3), dir: [0, 1, 0], on: "B" }],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Click in the two gas stays",
        detail: "Stand it up and open the lid. Press each stay's ends onto the ball studs on the lid and in the body until they click.",
        fix: [{ kind: "gasLift", count: 2, at: [[-40, top - 160, -Dm / 2 + 60], [40, top - 160, -Dm / 2 + 60]], dir: [0, -1, 0], on: "B", mate: "L" }],
        pose: "+y",
      },
      { title: "Drop the storage bag in", detail: "Push it down to the bottom and fold its top edge over the rim, then close the lid.", add: ["G"], from: { G: [0, 500, 0] } },
    ],
  };
}

const family: Family = { names: ["SIDSJÖ", "SIDSJO"], recipe };
export default family;
