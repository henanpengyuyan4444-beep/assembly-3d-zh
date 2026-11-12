import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece } from "../../types";

/**
 * UTTER, read from the children's stool's manual. It's one plastic seat and four plastic legs: the top of each leg
 * is threaded, and with the seat upside down it screws by hand into a socket in each corner. No tools, no fittings.
 */

function stool(): CustomParams {
  // IKEA: seat 28 x 28, seat height 27
  const W = 280, H = 270, T = 32; // T: the seat's depth with its rim
  const LEG = 30, IN = 112; // leg diameter, leg centre from the middle
  const seatPieces: PartPiece[] = [
    { shape: "box", size: [W, 8, W], pos: [0, T / 2 - 4, 0] },
    ...[-1, 1].map((s): PartPiece => ({ shape: "box", size: [W, T - 8, 6], pos: [0, -4, s * (W / 2 - 3)] })),
    ...[-1, 1].map((s): PartPiece => ({ shape: "box", size: [6, T - 8, W - 12], pos: [s * (W / 2 - 3), -4, 0] })),
    // the round socket in each corner the leg screws into
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): PartPiece => ({ shape: "cyl", size: [LEG + 10, T - 8, LEG + 10], pos: [sx * IN, -4, sz * IN] }))),
  ];
  const parts: CustomPart[] = [{ id: "S", name: "Seat", size: [W, T, W], pos: [0, H - T / 2, 0], pieces: seatPieces, material: "board" }];
  const legH = H - 8; // up inside the socket to the underside of the top
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      parts.push({ id: `L${parts.length}`, name: "Leg", size: [LEG, legH, LEG], pos: [sx * IN, legH / 2, sz * IN], shape: "cyl", material: "board" });
    }),
  );
  const legs = parts.slice(1).map((p) => p.id);
  return {
    parts,
    steps: [
      {
        title: "Screw a leg into each corner",
        detail: "Lay the seat upside down on a rug. Turn each leg clockwise by hand until it stops; no tools needed.",
        add: ["S", ...legs],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Turn the stool over", detail: "Stand it on its legs and check it doesn't rock. Give any loose leg another turn.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["UTTER"],
  recipe: (s) => (/stool/i.test(`${s.variant} ${s.slug ?? ""}`) ? stool() : null),
};
export default family;
