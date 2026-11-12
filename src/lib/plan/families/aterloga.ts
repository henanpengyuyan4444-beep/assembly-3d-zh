import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * ÅTERLÖGA, read from the storage pouf's manual. The upholstered body comes in one piece: it is turned upside down,
 * a dowel is pushed into each of the five holes round its bottom, a wooden foot goes on each dowel and is screwed
 * on with an Allen screw, and a felt pad is stuck under every foot. Turned the right way up, the loose lid is laid on.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function pouf(s: ProductSpec): CustomParams {
  // IKEA: 48 across, 43 high
  const R = (Math.round(s.size.w * 10) || 480) / 2, H = Math.round(s.size.h * 10) || 430;
  const foot = 25, lid = 65, rf = R - 70;
  const yBody = H - lid + 5; // top of the body, under the lid's rim
  const angles = Array.from({ length: 5 }, (_, i) => (i * 2 * Math.PI) / 5);
  const spot = (a: number, r: number, y: number): Vec3 => [Math.round(r * Math.sin(a)), y, Math.round(r * Math.cos(a))];
  const bodyC = (foot + yBody) / 2;
  const parts: CustomPart[] = [
    {
      id: "A",
      name: "Pouf body",
      shape: "cyl",
      size: [2 * R, yBody - foot, 2 * R],
      pos: [0, bodyC, 0],
      material: "soft",
      pieces: [
        { shape: "cyl", size: [2 * R - 60, 60, 2 * R - 60], pos: [0, foot + 30 - bodyC, 0] },
        { shape: "cyl", size: [2 * R, yBody - foot - 60, 2 * R], pos: [0, (foot + 60 + yBody) / 2 - bodyC, 0] },
      ],
    },
    { id: "L", name: "Lid", shape: "cyl", size: [2 * R - 10, lid, 2 * R - 10], pos: [0, H - lid / 2, 0], material: "soft" },
    ...angles.map((a, i): CustomPart => ({ id: `F${i}`, name: "Foot", size: [60, foot, 60], pos: spot(a, rf, foot / 2), rot: [0, a, 0], material: "wood" })),
  ];
  const feet = angles.map((_, i) => `F${i}`);
  return {
    parts,
    steps: [
      {
        title: "Push a dowel into each hole underneath",
        detail: "Turn the body upside down on a rug, without the lid. There are five holes round the bottom: one dowel in each, pushed in by hand.",
        add: ["A"],
        fix: [at("dowel", angles.map((a) => spot(a, rf + 15, foot)), [0, 1, 0], "A")],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw a foot onto each dowel",
        detail: "Fit the foot over the dowel so its other hole lines up, then turn the screw in with the Allen key until the foot sits tight.",
        add: feet,
        fix: [at("screw", angles.map((a) => spot(a, rf - 12, 0)), [0, 1, 0], undefined, "A", { len: 40, dia: 6 })],
        tools: ["allen"],
      },
      {
        title: "Stick a felt pad under every foot",
        detail: "Peel them off the sheet and press each one down in the middle of a foot. There are spares on the sheets.",
        fix: [at("glide", angles.map((a) => spot(a, rf, 0)), [0, 1, 0], undefined, undefined, { name: "Felt pad", len: 3, dia: 40 })],
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
  names: ["ÅTERLÖGA", "ATERLOGA"],
  recipe(s) {
    if (/pouf|pouffe/i.test(s.variant) || /aterloga-pouf/.test(s.slug ?? "")) return pouf(s);
    return null;
  },
};
export default family;
