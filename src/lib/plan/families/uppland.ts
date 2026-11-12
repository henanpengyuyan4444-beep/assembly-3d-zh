import type { Family } from "./family";
import { sofaBuilder } from "./ektorp";

/**
 * UPPLAND, from IKEA's manuals: the frames are drawn exactly as EKTORP's (the same steps, fittings and counts), so
 * this is EKTORP's builder with UPPLAND's sizes. The ottoman is the storage box bolted together upside down, with a
 * plain lid instead of the footstool's padded one and no loose bottom panel.
 */
const family: Family = {
  names: ["UPPLAND"],
  build: sofaBuilder({
    D: 920, H: 920, A: 250, OV: 30, ARMH: 680, SEAT: 470, CUSH: 180, BACK: 760, LEG: 170, BTH: 170, BC: 210,
    W2: 1320, CD: 720, chair: 1100,
    stool: { w: 800, h: 470, d: 600, leg: 120, padded: false, name: "ottoman" },
  }),
};
export default family;
