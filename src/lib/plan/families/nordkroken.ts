import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec } from "../../types";

/**
 * NORDKROKEN, read from the rocking and swivel armchair's manual. No tools and no fittings: the frame comes in one
 * piece on its rocking swivel base, held still by two ties. The cover is pulled down over the back and arms and its
 * edges are fastened under the frame with hook and loop strips, front, back and sides. The seat cushion is zipped into
 * its cover and laid in, the skirt is fastened underneath, the back cushion is zipped into its cover and dropped in.
 * Only then are the two ties on the base cut off.
 * IKEA: 72 wide, 85 deep, 83 high, seat at 44.
 */

function recipe(s: ProductSpec): CustomParams {
  const W = 720, D = 850, H = Math.round(s.size.h * 10) || 830;
  const SH = 440, seatT = 150, yDeck = SH - seatT;
  const yBase = 110, armW = 130, armH = 620, backT = 190;
  const cy = H / 2;
  const frame: PartPiece[] = [
    { shape: "cyl", size: [560, yBase, 560], pos: [0, yBase / 2 - cy, 0], material: "metal" }, // hidden by the skirt
    // the skirt hangs down to the floor round the base
    { shape: "box", size: [W, yDeck - 25, D], pos: [0, (25 + yDeck) / 2 - cy, 0] },
    { shape: "box", size: [armW, armH - yDeck, D - 40], pos: [-W / 2 + armW / 2, (yDeck + armH) / 2 - cy, 20] },
    { shape: "box", size: [armW, armH - yDeck, D - 40], pos: [W / 2 - armW / 2, (yDeck + armH) / 2 - cy, 20] },
    { shape: "box", size: [W, H - yDeck, backT], pos: [0, (yDeck + H) / 2 - cy, -D / 2 + backT / 2] },
  ];
  const inW = W - 2 * armW;
  const parts: CustomPart[] = [
    { id: "FR", name: "Frame", size: [W, H, D], pos: [0, cy, 0], material: "soft", pieces: frame },
    { id: "SC", name: "Seat cushion", size: [inW, seatT, D - backT - 20], pos: [0, yDeck + seatT / 2, backT / 2 + 10], material: "soft" },
    { id: "BC", name: "Back cushion", size: [inW - 40, 400, 150], pos: [0, SH + 210, -D / 2 + backT + 75], rot: [-0.12, 0, 0], material: "soft" },
  ];
  const steps: CustomStep[] = [
    {
      title: "Stand the frame where it will go",
      detail: "Leave the two ties on the base for now: they stop it rocking and turning while you fit the cover.",
      add: ["FR"],
      warnings: ["loose"],
    },
    { title: "Pull the cover over the frame", detail: "Seams at the back corners. Work it down over the back first, then over both arms." },
    { title: "Fasten the cover under the front of the arms", detail: "Pull each flap tight round the frame and press its strip onto the one underneath." },
    { title: "Fasten the cover at the back", detail: "Pull the back flap down and press it onto the strips under the back edge." },
    { title: "Fasten the sides underneath", detail: "Kneel beside it and press the side flaps on, working from front to back." },
    { title: "Zip the seat cushion into its cover", detail: "Fold the cushion, push it in and let it open out, then close the zip.", wait: ["SC"] },
    { title: "Lay the seat cushion in", detail: "Zip at the back, pushed right into the corners.", add: ["SC"], from: { SC: [0, 300, 200] } },
    { title: "Fasten the skirt under the seat", detail: "Pull the front flap down and round, and press its strip on under the frame." },
    { title: "Zip the back cushion into its cover", detail: "Push the corners of the cushion right into the corners of the cover.", wait: ["BC"] },
    { title: "Drop the back cushion in", detail: "Standing up, against the back.", add: ["BC"], from: { BC: [0, 400, 0] } },
    {
      title: "Cut off the two ties",
      detail: "Tilt the chair back a little and cut the ties on the base, then throw them away. Don't cut them before the cover is on.",
      tools: ["knife"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["NORDKROKEN"],
  recipe(s) {
    if (!/armchair/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
