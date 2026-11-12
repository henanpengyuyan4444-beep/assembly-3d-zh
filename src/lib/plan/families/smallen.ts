import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, Vec3 } from "../../types";

/*
 * SMÄLLEN swivel chair, read from IKEA's manual. Upside down on a rug, the four legs push into the hub and each is
 * held by two screws with washers. The base is turned over, the screw column stands in it and the seat (seat and
 * back in one) is pressed onto the column. Sitting on it and spinning it round locks it with a click; spinning
 * it later sets the height.
 * IKEA's sizes: 65 x 65 cm, 85 high at most, seat 40 to 52 high, 40 wide and 39 deep. Drawn at its highest.
 */

const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function chair(): CustomParams {
  const R = 325, LY0 = 20, LY1 = 55, HUB = 90; // legs, their feet on the floor
  const SY = 520, PY = 470; // top of the seat, underside of its plate
  const angles = [0, 1, 2, 3].map((i) => Math.PI / 4 + (i * Math.PI) / 2);
  const legs = angles.map((a, i): CustomPart => ({
    id: `L${i + 1}`,
    name: "Leg",
    material: "metal",
    size: [45, LY1 - LY0, R - HUB / 2],
    pos: [(Math.sin(a) * (R + HUB / 2)) / 2, (LY0 + LY1) / 2, (Math.cos(a) * (R + HUB / 2)) / 2],
    rot: [0, a, 0],
  }));
  const sc: Vec3 = [0, (PY + 850) / 2, -20];
  const seat: CustomPart = {
    id: "S",
    name: "Seat with back",
    size: [440, 850 - PY, 430],
    pos: sc,
    material: "board",
    pieces: [
      { shape: "box", size: [120, 20, 120], pos: [0, PY + 10 - sc[1], 20 - sc[2]], material: "metal" },
      { shape: "box", size: [400, SY - PY - 20, 390], pos: [0, (PY + 20 + SY) / 2 - sc[1], 0 - sc[2]] },
      ...[-1, 1].map((g) => ({ shape: "cyl" as const, size: [20, 300, 20] as Vec3, pos: [g * 160, 620 - sc[1], -210 - sc[2]] as Vec3, rot: [-0.12, 0, 0] as Vec3, material: "metal" as const })),
      { shape: "box", size: [420, 230, 25], pos: [0, 735 - sc[1], -228 - sc[2]], rot: [-0.12, 0, 0] },
    ],
  };
  const screws: Vec3[] = angles.flatMap((a) => [70, 105].map((r): Vec3 => [Math.sin(a) * r, LY0, Math.cos(a) * r]));
  return {
    parts: [{ id: "H", name: "Hub", shape: "cyl", material: "metal", size: [HUB, 60, HUB], pos: [0, 50, 0] }, ...legs, { id: "C", name: "Screw column", shape: "cyl", material: "metal", size: [45, PY - 80, 45], pos: [0, (PY + 80) / 2, 0] }, seat],
    steps: [
      {
        title: "Push the legs into the hub",
        detail: "Hub upside down on a rug. Slide each leg into its socket until the holes line up.",
        add: ["H", ...legs.map((l) => l.id)],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw each leg to the hub",
        detail: "Two screws with washers in each leg, then turn the base over onto its feet.",
        fix: [fix("washer", screws, [0, 1, 0], { on: "H" }), fix("screw", screws, [0, 1, 0], { on: "H", len: 16, dia: 6 })],
        tools: ["allen"],
      },
      { title: "Stand the column in the base", detail: "Narrow end up, pushed into the hub.", add: ["C"], pose: "+y", from: { C: [0, 300, 0] } },
      { title: "Press the seat onto the column", detail: "Set the hole under the seat over the top of the column and push it down.", add: ["S"], from: { S: [0, 300, 0] } },
      { title: "Sit down and spin the seat", detail: "Turn it round until it clicks and locks. Spin it up or down later to set the height." },
    ],
  };
}

const family: Family = {
  names: ["SMÄLLEN", "SMALLEN"],
  recipe(s) {
    if (/swivel chair/i.test(`${s.variant} ${s.slug ?? ""}`.replace(/-/g, " "))) return chair();
    return null;
  },
};
export default family;
