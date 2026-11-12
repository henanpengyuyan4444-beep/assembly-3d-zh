import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * JÄRRESTAD, read from the storage pouf's manual. The upholstered body comes in one piece: it is turned upside down
 * and five plastic feet are screwed by hand into the holes round its bottom. Turned the right way up, the loose lid
 * is laid on top.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function pouf(s: ProductSpec): CustomParams {
  // IKEA: 46 across, 42 high
  const R = (Math.round(s.size.w * 10) || 460) / 2, H = Math.round(s.size.h * 10) || 420;
  const foot = 15, lid = 55, rf = R - 60;
  const yBody = H - lid; // top of the body, where the lid sits
  const bodyC = (foot + yBody) / 2;
  const spot = (a: number, r: number, y: number): Vec3 => [Math.round(r * Math.sin(a)), y, Math.round(r * Math.cos(a))];
  const angles = Array.from({ length: 5 }, (_, i) => (i * 2 * Math.PI) / 5);
  const parts: CustomPart[] = [
    {
      id: "A",
      name: "Pouf body",
      shape: "cyl",
      size: [2 * R, yBody - foot, 2 * R],
      pos: [0, bodyC, 0],
      material: "soft",
      pieces: [
        // rounded in towards the floor
        { shape: "cyl", size: [2 * R - 50, 50, 2 * R - 50], pos: [0, foot + 25 - bodyC, 0] },
        { shape: "cyl", size: [2 * R, yBody - foot - 50, 2 * R], pos: [0, (foot + 50 + yBody) / 2 - bodyC, 0] },
        // the fabric pull tab on the side
        { shape: "box", size: [40, 60, 8], pos: [R - 10, yBody - 70 - bodyC, 0], rot: [0, Math.PI / 2, 0] },
      ],
    },
    { id: "L", name: "Lid", shape: "cyl", size: [2 * R - 30, lid, 2 * R - 30], pos: [0, H - lid / 2, 0], material: "soft" },
  ];
  return {
    parts,
    steps: [
      {
        title: "Turn the pouf upside down",
        detail: "Lift the lid off and lay the body upside down on a rug, so the fabric stays clean.",
        add: ["A"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw in the five feet",
        detail: "One in each hole round the bottom, turned clockwise by hand until it stops.",
        fix: [at("foot", angles.map((a) => spot(a, rf, 0)), [0, 1, 0], undefined, "A", { len: foot, dia: 35 })],
      },
      {
        title: "Turn it over and lay the lid on",
        detail: "Stand the pouf on its feet. The lid just sits on top, so lift it off to use the storage inside.",
        add: ["L"],
        pose: "+y",
        from: { L: [0, 250, 0] },
      },
    ],
  };
}

const family: Family = {
  names: ["JÄRRESTAD", "JARRESTAD"],
  recipe(s) {
    if (/pouf|pouffe/i.test(s.variant) || /jarrestad-pouf/.test(s.slug ?? "")) return pouf(s);
    return null;
  },
};
export default family;
