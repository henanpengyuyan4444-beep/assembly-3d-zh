import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TORSJÖ, read from the coffee and side table's shared manual. Everything is built upside down on a rug: four
 * upper legs screw into the steel ring by hand and are tightened with the Allen key, the cross is laid on them,
 * four lower legs screw through its ends into the upper legs, then the adjustable feet and their felt pads go on.
 * Turned the right way up, four clear pads go on the ring's ledge, the glass is laid in and the feet level it.
 */

function recipe(s: ProductSpec): CustomParams | null {
  const side = /side/i.test(`${s.slug ?? ""} ${s.variant}`);
  // IKEA: 88 across and 45 high, or 45 across and 55 high; the cross 12 cm off the floor on both
  const R = (side ? 450 : 880) / 2, H = side ? 550 : 450;
  const band = side ? 50 : 60;
  const yRing = H - band;
  const yX = 120, foot = 25;
  const r = R - (side ? 22 : 30); // legs, just inside the ring
  const dia = 16;
  const angs = [0, 90, 180, 270].map((a) => (a * Math.PI) / 180);
  const at = (a: number, y: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];

  // the ring: a thin band drawn as short straight pieces, with a ledge inside for the glass
  const n = 36;
  const ring: PartPiece[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const seg = ((2 * Math.PI * R) / n) * 1.03;
    ring.push({ shape: "box", size: [seg, band, 4], pos: [Math.cos(a) * (R - 2), 0, Math.sin(a) * (R - 2)], rot: [0, -a + Math.PI / 2, 0] });
    ring.push({ shape: "box", size: [seg * 0.9, 4, 14], pos: [Math.cos(a) * (R - 11), -band / 2 + 18, Math.sin(a) * (R - 11)], rot: [0, -a + Math.PI / 2, 0] });
  }
  const yGlass = yRing + 20 + 3; // on the ledge
  const parts: CustomPart[] = [
    { id: "RING", name: "Ring", size: [2 * R, band, 2 * R], pos: [0, yRing + band / 2, 0], pieces: ring, material: "metal" },
    ...angs.map((a, i): CustomPart => ({ id: `U${i}`, name: "Upper leg", shape: "cyl", size: [dia, yRing - yX - 11, dia], pos: at(a, (yRing + yX + 11) / 2), material: "metal" })),
  ];
  // the cross: two bars between opposite legs, a ball at the middle and at each end
  const cross: PartPiece[] = [
    { shape: "cyl", size: [10, 2 * r, 10], pos: [0, 0, 0], rot: [0, 0, Math.PI / 2] },
    { shape: "cyl", size: [10, 2 * r, 10], pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] },
    { shape: "cyl", size: [22, 18, 22], pos: [0, 0, 0] },
    ...angs.map((a): PartPiece => ({ shape: "cyl", size: [22, 22, 22], pos: [Math.cos(a) * r, 0, Math.sin(a) * r] })),
  ];
  parts.push({ id: "X", name: "Cross", size: [2 * r + 22, 22, 2 * r + 22], pos: [0, yX, 0], pieces: cross, material: "metal" });
  parts.push(...angs.map((a, i): CustomPart => ({ id: `L${i}`, name: "Lower leg", shape: "cyl", size: [dia, yX - 11 - foot, dia], pos: at(a, (yX - 11 + foot) / 2), material: "metal" })));
  parts.push({ id: "G", name: "Glass top", shape: "cyl", size: [2 * R - 16, 6, 2 * R - 16], pos: [0, yGlass, 0], material: "glass" });

  const ids = (p: string) => angs.map((_, i) => `${p}${i}`);
  const steps: CustomStep[] = [
    {
      title: "Screw the upper legs into the ring",
      detail: "Ring upside down on a rug. Use the plain legs, not the ones with a thread sticking out: turn each in by hand, then tighten with the Allen key in its end.",
      add: ["RING", ...ids("U")],
      tools: ["allen"],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Lay the cross on the legs", detail: "Each ball at the end of the cross sits on top of a leg.", add: ["X"] },
    {
      title: "Screw the lower legs through the cross",
      detail: "Push each thread through a ball into the leg below, then tighten with the Allen key.",
      add: ids("L"),
      tools: ["allen"],
    },
    {
      title: "Screw in the feet",
      detail: "One into the end of each lower leg, by hand.",
      fix: [{ kind: "foot", count: 4, len: foot, dia: 24, at: angs.map((a) => at(a, foot)), dir: [0, 1, 0], on: "L0" }],
    },
    {
      title: "Stick the felt pads under the feet",
      detail: "Peel them off the sheet and press one onto each foot.",
      fix: [{ kind: "glide", count: 4, len: 3, dia: 20, at: angs.map((a) => at(a, 0)), dir: [0, 1, 0] }],
    },
    {
      title: "Turn it over and stick the clear pads on the ledge",
      detail: "Four pads spread evenly round the ledge inside the ring.",
      pose: "+y",
      fix: [{ kind: "glide", name: "Clear pad", count: 4, len: 3, dia: 12, at: angs.map((a): Vec3 => [Math.cos(a) * (R - 11), yGlass - 3, Math.sin(a) * (R - 11)]), dir: [0, -1, 0], on: "RING" }],
    },
    { title: "Lay the glass in the ring", detail: "Hold it by the edges and lower it flat onto the pads.", add: ["G"], from: { G: [0, 300, 0] }, warnings: ["hand"] },
    { title: "Level the table with the feet", detail: "Turn the feet in or out until the table stands steady and the glass is level.", tools: ["level"] },
  ];
  return { parts, steps };
}

const family: Family = { names: ["TORSJÖ", "TORSJO"], recipe };
export default family;
