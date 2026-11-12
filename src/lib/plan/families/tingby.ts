import type { Family } from "./family";
import type { CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * TINGBY, read from the side table's manual. No loose fittings for the frame: each square leg has two pegs at each
 * end. The legs are pushed into the shelf's keyhole holes and turned until they lock, the top is pressed down onto
 * their upper pegs, then the table goes upside down and four castors are screwed into the shelf and tightened with
 * the spanner that comes in the box.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 50 x 50, 45 high
  const W = s.size.w * 10 || 500, D = s.size.d * 10 || 500, H = s.size.h * 10 || 450;
  const cast = 60, t = 30, leg = 45;
  const yShelf = cast + t / 2, yTop = H - t / 2;
  const legH = H - cast - 2 * t;
  const lx = W / 2 - leg / 2 - 6, lz = D / 2 - leg / 2 - 6;
  const corners: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const legs: CustomPart[] = corners.map(([sx, sz], i) => ({
    id: `L${i + 1}`,
    name: "Leg",
    size: [leg, legH, leg],
    pos: [sx * lx, cast + t + legH / 2, sz * lz],
    material: "board",
  }));
  const castorAt: Vec3[] = corners.map(([sx, sz]) => [sx * (W / 2 - 45), cast, sz * (D / 2 - 45)]);
  return {
    parts: [
      { id: "S", name: "Shelf", size: [W, t, D], pos: [0, yShelf, 0], material: "board" },
      ...legs,
      { id: "T", name: "Table top", size: [W, t, D], pos: [0, yTop, 0], material: "board" },
    ],
    steps: [
      {
        title: "Twist the legs into the shelf",
        detail: "Push each leg's pegs straight down into the holes at a corner, then turn the leg until its flat sides line up with the shelf's edges and it locks.",
        add: ["S", ...legs.map((l) => l.id)],
      },
      {
        title: "Press the top onto the legs",
        detail: "Line its holes up over the pegs on top of the legs and press it down firmly all round.",
        add: ["T"],
        from: { T: [0, 250, 0] },
      },
      {
        title: "Screw the castors into the shelf",
        detail: "Turn the table upside down on a rug. Screw each castor in by hand, then tighten it with the spanner.",
        fix: [{ kind: "castor", count: 4, at: castorAt, dir: [0, 1, 0], on: "S" }],
        tools: ["wrench"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Turn the table over", detail: "Stand it on its castors and check that it rolls freely.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["TINGBY"], recipe };
export default family;
