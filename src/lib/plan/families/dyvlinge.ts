import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * DYVLINGE, read from the swivel easy chair's manual. No tools and no screws: a bushing is pressed into the hub of
 * the five-star base, the swivel post is pushed into the socket under the seat, and the seat is lowered onto the
 * base. The back frame folds up until it clicks, the back cushion is pulled down over it, its two flaps are fastened
 * with hook and loop, and with the chair upside down the seat cover's strip is fastened under the seat.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const SH = 430; // IKEA's seat height
  const R = 320; // base, centre to the end of a leg
  const yHub = 75;
  const angles = [0, 1, 2, 3, 4].map((i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
  const legRise = Math.atan2(yHub - 30, R - 40);
  const base: PartPiece[] = [
    { shape: "cyl", size: [70, 70, 70], pos: [0, 0, 0] },
    ...angles.flatMap((a): PartPiece[] => [
      { shape: "box", size: [R - 30, 20, 34], pos: [((R + 30) / 2) * Math.cos(a), (30 + yHub) / 2 - 10 - yHub, ((R + 30) / 2) * Math.sin(a)], rot: [0, -a, -legRise] },
      { shape: "box", size: [60, 12, 30], pos: [(R - 20) * Math.cos(a), 6 - yHub, (R - 20) * Math.sin(a)], rot: [0, -a, 0] },
    ]),
  ];
  const yPost0 = yHub - 25, yPost1 = 230;
  const zSeat = 55;
  const seat: PartPiece[] = [
    { shape: "box", size: [W - 140, 90, D * 0.6], pos: [0, -65, 0] },
    { shape: "box", size: [W, 130, D * 0.78], pos: [0, 45, 0] },
  ];
  const ySeat = (yPost1 + SH) / 2 - 10;
  const tilt = -0.2;
  const backH = H - SH + 140, backT = 140;
  const yBack = SH - 140 + backH / 2 - 10;
  const zBack = -D / 2 + backT / 2 + 30;
  const parts: CustomPart[] = [
    { id: "BA", name: "Base", size: [2 * R, yHub + 35, 2 * R], pos: [0, yHub, 0], material: "metal", pieces: base },
    { id: "PO", name: "Swivel post", size: [40, yPost1 - yPost0, 40], pos: [0, (yPost0 + yPost1) / 2, 0], material: "metal", shape: "cyl" },
    { id: "SE", name: "Seat", size: [W, 220, D * 0.78], pos: [0, ySeat, zSeat], material: "soft", pieces: seat },
    { id: "BF", name: "Back frame", size: [W - 120, backH - 60, 16], pos: [0, yBack, zBack], rot: [tilt, 0, 0], material: "metal" },
    { id: "BC", name: "Back cushion", size: [W - 20, backH, backT], pos: [0, yBack + 5, zBack + 5], rot: [tilt, 0, 0], material: "soft" },
  ];
  const steps: CustomStep[] = [
    { title: "Press the bushing into the base", detail: "Into the hub in the middle, until it sits flush.", add: ["BA"], fix: [fx("cap", [[0, yHub + 35, 0]], [0, -1, 0], "BA", { name: "Bushing", dia: 56 })] },
    {
      title: "Push the swivel post into the seat",
      detail: "Lay the seat upside down on a rug and push the post's narrow end firmly into the socket in the middle.",
      wait: ["SE", "PO"],
      warnings: ["floor"],
    },
    { title: "Lower the seat onto the base", detail: "Turn it the right way up and drop the post straight into the bushing.", add: ["SE", "PO"], from: { SE: [0, 350, 0], PO: [0, 350, 0] } },
    { title: "Fold the back frame up", detail: "Lift it at the back of the seat until both sides click into place.", add: ["BF"], from: { BF: [0, -220, 260] } },
    { title: "Pull the back cushion over the frame", detail: "From the top, all the way down so it sits snugly behind the seat.", add: ["BC"], from: { BC: [0, 420, 0] } },
    { title: "Fasten the back cushion's flaps", detail: "Two flaps at the bottom of the back, pressed onto the hook and loop strips round the frame." },
    {
      title: "Fasten the seat cover underneath",
      detail: "With the chair upside down on a rug, pull the cover's edge round and press its strip onto the one under the seat. Then turn it back over.",
      pose: "-y",
      warnings: ["floor"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["DYVLINGE"],
  recipe(s) {
    if (!/swivel/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
