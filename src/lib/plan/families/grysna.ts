import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * GRYSNA upholstered bed frame, read from IKEA's manuals (the frame's and the Vissle cover's).
 * The two side rails get dowels in their ends on a rug, the foot rail is bolted between them (a barrel nut and a
 * bolt at each corner, then a screw), and the headboard is bolted to their other ends the same way with long bolts
 * and two screws. The frame goes onto its side for the legs: a bracket pair in each corner, the leg's stud through
 * it and a nut, a foot under every leg. Standing again, the headboard top gets two studs and three dowels, is
 * lowered on and held with a clamp plate and nut on each stud from behind. Four slat stops are screwed on, the
 * support bar slots in across the middle, the guard rail gets its two brackets and is bolted to the side rail, and
 * the slatted base (sold on its own) is rolled out under the stops. The cover then wraps the frame, is pulled over
 * the headboard by two people, and the guard rail gets its own.
 * IKEA's sizes: 96 x 208 cm for 90 x 200, 103 x 198 for the US twin; headboard 110, frame top 40, 20 cm under it.
 */

interface Bit {
  piece: PartPiece;
  lo: Vec3;
  hi: Vec3;
}
const bx = (lo: Vec3, hi: Vec3): Bit => ({
  piece: { shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] },
  lo,
  hi,
});
function assemble(id: string, name: string, bits: Bit[], material: PartMaterial, extra?: boolean): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...bits.map((b) => b.lo[k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...bits.map((b) => b.hi[k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  return {
    id,
    name,
    size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
    pos,
    material,
    ...(extra ? { extra } : {}),
    pieces: bits.map((b) => ({ ...b.piece, pos: [b.piece.pos[0] - pos[0], b.piece.pos[1] - pos[1], b.piece.pos[2] - pos[2]] as Vec3 })),
  };
}
const box = (id: string, name: string, lo: Vec3, hi: Vec3, material: PartMaterial = "board"): CustomPart => ({
  id,
  name,
  size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
  pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
  material,
});
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function bed(s: ProductSpec): CustomParams {
  const twin = /twin/i.test(`${s.variant} ${s.slug ?? ""}`);
  const m = s.variant.match(/(\d+)\s*[x×]\s*(\d+)/);
  const mw = twin ? 970 : m ? +m[1] * 10 : 900, ml = twin ? 1910 : m ? +m[2] * 10 : 2000;
  const W = twin ? 1030 : mw + 60, L = twin ? 1980 : ml + 80;
  const Y0 = 200, Y1 = 400, HH = 1100, T = 30, HT = 60; // rails 20 to 40 cm up, headboard 110 high and 6 thick
  const zH = -L / 2 + HT, zF = L / 2; // inside face of the headboard, the foot end
  const xr = W / 2 - T / 2;
  const ledge = 335; // top of the ledges the slats lie on

  // a box between distances a and b from the middle, on side g
  const sideBox = (g: number, a: number, b: number, y0: number, y1: number, z0: number, z1: number) =>
    bx([Math.min(g * a, g * b), y0, z0], [Math.max(g * a, g * b), y1, z1]);
  const rail = (id: string, g: number) =>
    assemble(id, "Side rail", [sideBox(g, W / 2 - T, W / 2, Y0, Y1, zH, zF - T), sideBox(g, W / 2 - T - 22, W / 2 - T, ledge - 40, ledge, zH + 20, zF - T - 20)], "board");
  const parts: CustomPart[] = [
    rail("R0", -1),
    rail("R1", 1),
    box("F", "Foot rail", [-W / 2 + T, Y0, zF - T], [W / 2 - T, Y1, zF]),
    box("H", "Headboard", [-W / 2, Y0, -L / 2], [W / 2, HH - 200, zH]),
    assemble("HT", "Headboard top", [bx([-W / 2, HH - 200, -L / 2], [W / 2, HH - 60, zH]), bx([-W / 2 + 25, HH - 60, -L / 2], [W / 2 - 25, HH - 25, zH]), bx([-W / 2 + 60, HH - 25, -L / 2], [W / 2 - 60, HH, zH])], "soft"),
  ];
  const lx = W / 2 - 70, lz = [zH + 70, zF - 70];
  const legs = [-1, 1].flatMap((g) => lz.map((z): Vec3 => [g * lx, 0, z]));
  legs.forEach((p, i) => parts.push({ id: `L${i}`, name: "Leg", shape: "cyl", material: "wood", size: [50, Y0, 50], pos: [p[0], Y0 / 2, p[2]] }));
  parts.push(box("C", "Support bar", [-W / 2 + T + 22, ledge - 20, -15], [W / 2 - T - 22, ledge, 15], "metal"));
  // the guard rail stands on the left-hand rail by the headboard
  const gz0 = zH, gz1 = zH + 900;
  parts.push(assemble("G", "Guard rail", [bx([-W / 2, Y1, gz0], [-W / 2 + 70, Y1 + 230, gz1 - 80]), bx([-W / 2, Y1, gz1 - 80], [-W / 2 + 70, Y1 + 200, gz1 - 30]), bx([-W / 2, Y1, gz1 - 30], [-W / 2 + 70, Y1 + 150, gz1])], "soft"));
  const sw = W - 2 * T - 10;
  const slats: Bit[] = [];
  for (let z = zH + 40; z < zF - T - 30; z += 75) slats.push(bx([-sw / 2, ledge, z - 25], [sw / 2, ledge + 10, z + 25]));
  parts.push(assemble("S", "Slatted base", slats, "wood", true));
  // the Vissle cover: a sleeve round the frame and one over the headboard
  const c = 4;
  parts.push(assemble("CF", "Frame cover", [
    bx([-W / 2 - c, Y0 - c, zH], [-W / 2, Y1 + c, zF + c]),
    bx([W / 2, Y0 - c, zH], [W / 2 + c, Y1 + c, zF + c]),
    bx([-W / 2, Y0 - c, zF], [W / 2, Y1 + c, zF + c]),
    bx([-W / 2, Y1, zH], [-W / 2 + T, Y1 + c, zF]),
    bx([W / 2 - T, Y1, zH], [W / 2, Y1 + c, zF]),
    bx([-W / 2 + T, Y1, zF - T], [W / 2 - T, Y1 + c, zF]),
  ], "soft"));
  parts.push(assemble("CH", "Headboard cover", [
    bx([-W / 2 - c, Y0, -L / 2 - c], [-W / 2, HH - 60, zH + c]),
    bx([W / 2, Y0, -L / 2 - c], [W / 2 + c, HH - 60, zH + c]),
    bx([-W / 2, Y0, -L / 2 - c], [W / 2, HH - 60, -L / 2]),
    bx([-W / 2, Y1, zH], [W / 2, HH - 60, zH + c]),
    bx([-W / 2 + 60, HH, -L / 2 - c], [W / 2 - 60, HH + c, zH + c]),
  ], "soft"));

  const both = (f: (g: number) => Vec3[]) => [-1, 1].flatMap((g) => f(g));
  const ys = [Y0 + 60, Y1 - 60];
  const steps: CustomStep[] = [
    {
      title: "Tap the dowels into the side rails",
      detail: "Lay both rails on a rug. Two dowels go into each end.",
      add: ["R0", "R1"],
      fix: [fix("dowel", both((g) => ys.flatMap((y): Vec3[] => [[g * xr, y, zF - T], [g * xr, y, zH]])), [0, 0, 1])],
      tools: ["hammer"],
      warnings: ["floor"],
    },
    {
      title: "Bolt the foot rail between the side rails",
      detail: "Push a barrel nut into the foot rail at each end, slot facing the hole, and turn a bolt through the side rail into it.",
      add: ["F"],
      fix: [
        fix("nut", both((g) => [[g * (W / 2 - T - 40), Y1, zF - T / 2]]), [0, -1, 0], { name: "Barrel nut", len: 14, dia: 10, on: "F" }),
        ...[-1, 1].map((g) => fix("bolt", [[g * W / 2, (Y0 + Y1) / 2, zF - T / 2]], [-g, 0, 0], { len: 70, dia: 6 })),
      ],
      tools: ["allen", "flathead"],
    },
    {
      title: "Screw the foot corners together",
      detail: "Use the shorter of the two long screws here, one in each corner.",
      fix: [fix("screw", both((g) => [[g * (W / 2 - T / 2), (Y0 + Y1) / 2 - 60, zF]]), [0, 0, -1], { len: 50, dia: 6, on: "F" })],
      tools: ["allen"],
    },
    {
      title: "Bolt the headboard to the side rails",
      detail: "Barrel nuts into the side rails, then a long bolt with its washer through the headboard into each one.",
      add: ["H"],
      people: 2,
      fix: [
        fix("nut", both((g) => [[g * xr, Y1, zH + 50]]), [0, -1, 0], { name: "Barrel nut", len: 14, dia: 10 }),
        fix("bolt", both((g) => [[g * xr, (Y0 + Y1) / 2, -L / 2]]), [0, 0, 1], { len: 110, dia: 6, on: "H" }),
      ],
      tools: ["allen", "flathead"],
    },
    {
      title: "Screw the headboard to the rails",
      detail: "One long screw below each bolt.",
      fix: [fix("screw", both((g) => [[g * xr, Y0 + 50, -L / 2]]), [0, 0, 1], { len: 70, dia: 6, on: "H" })],
      tools: ["allen"],
    },
    { title: "Turn the frame onto its side", detail: "Two people, on a rug, so the fabric doesn't scuff.", pose: "+x", people: 2, warnings: ["two", "floor"] },
    {
      title: "Fit the leg brackets and the legs",
      detail: "Press a foot onto each leg first. Each corner gets a bracket pair; push the leg's stud through and tighten the nut with the spanner.",
      add: legs.map((_, i) => `L${i}`),
      fix: [
        fix("connector", legs.map((p): Vec3 => [p[0], Y0, p[2]]), [0, -1, 0], { name: "Leg bracket", len: 10, dia: 90 }),
        fix("nut", legs.map((p): Vec3 => [p[0], Y0 + 12, p[2]]), [0, -1, 0], { len: 8, dia: 10 }),
        fix("glide", legs, [0, 1, 0], { name: "Foot", len: 6, dia: 40 }),
      ],
      tools: ["wrench"],
    },
    { title: "Stand the bed up", detail: "Lift it onto its legs together.", pose: "+y", people: 2 },
    {
      title: "Fit the headboard top",
      detail: "Screw the two studs into its bottom with the spanner until they stop, tap in three dowels, then lower it onto the headboard.",
      add: ["HT"],
      fix: [
        fix("stud", both((g) => [[g * (W / 2 - 150), HH - 200, -L / 2 + HT / 2]]), [0, -1, 0], { len: 60, dia: 8, on: "HT" }),
        fix("dowel", [-1, 0, 1].map((t): Vec3 => [t * (W / 2 - 80), HH - 200, -L / 2 + HT / 2]), [0, -1, 0], { on: "HT" }),
      ],
      tools: ["wrench"],
      from: { HT: [0, 300, 0] },
    },
    {
      title: "Fasten the top from behind",
      detail: "Slide a clamp plate over each stud end at the back and tighten a nut onto it.",
      fix: [
        fix("clamp", both((g) => [[g * (W / 2 - 150), HH - 260, -L / 2]]), [0, 0, 1], { name: "Clamp plate", len: 4, dia: 30, on: "H" }),
        fix("nut", both((g) => [[g * (W / 2 - 150), HH - 260, -L / 2]]), [0, 0, 1], { len: 8, dia: 8, on: "H" }),
      ],
      tools: ["wrench"],
    },
    {
      title: "Screw on the four slat stops",
      detail: "Two at the head end and two at the foot, on top of the ledges.",
      fix: [
        fix("clip", both((g) => [[g * (W / 2 - T - 11), ledge, zH + 30], [g * (W / 2 - T - 11), ledge, zF - T - 30]]), [0, -1, 0], { name: "Slat stop", len: 20, dia: 25 }),
        fix("screw", both((g) => [[g * (W / 2 - T - 11), ledge + 20, zH + 30], [g * (W / 2 - T - 11), ledge + 20, zF - T - 30]]), [0, -1, 0], { len: 30, dia: 5 }),
      ],
      tools: ["screwdriver"],
    },
    { title: "Slot in the support bar", detail: "It goes across the middle, into the notches in both ledges.", add: ["C"], from: { C: [400, 0, 0] } },
    {
      title: "Bolt the brackets to the guard rail and set it on",
      detail: "One bolt fixes each bracket to the guard rail. Stand it on the left rail against the headboard.",
      add: ["G"],
      fix: [
        fix("angle", [[-W / 2 + T + 5, Y1 - 40, gz0 + 200], [-W / 2 + T + 5, Y1 - 40, gz1 - 200]], [1, 0, 0], { name: "Guard rail bracket", len: 120, dia: 40, on: "R0" }),
        fix("bolt", [[-W / 2 + 35, Y1 + 40, gz0 + 200], [-W / 2 + 35, Y1 + 40, gz1 - 200]], [1, 0, 0], { len: 20, dia: 6, on: "G" }),
      ],
      tools: ["allen"],
      from: { G: [0, 300, 0] },
    },
    {
      title: "Bolt the guard rail to the side rail",
      detail: "Two bolts through each bracket into the rail.",
      fix: [fix("bolt", [gz0 + 200, gz1 - 200].flatMap((z): Vec3[] => [[-W / 2 + T, Y1 - 60, z - 20], [-W / 2 + T, Y1 - 60, z + 20]]), [-1, 0, 0], { len: 20, dia: 6, on: "R0" })],
      tools: ["allen"],
    },
    {
      title: "Roll out the slatted base",
      detail: "Sold on its own. Tuck the end slats under the four stops.",
      add: ["S"],
      from: { S: [0, 300, 0] },
    },
    {
      title: "Wrap the cover round the frame",
      detail: "Start at the headboard, fold it over the rails and press the hook-and-loop strips together under the frame.",
      add: ["CF"],
      from: { CF: [0, 200, 0] },
    },
    {
      title: "Pull the cover over the headboard",
      detail: "One person on each side, easing it down evenly, then tuck the bottom edge in.",
      add: ["CH"],
      people: 2,
      from: { CH: [0, 300, 0] },
    },
    {
      title: "Cover the guard rail",
      detail: "Unbolt it from its brackets, pull its cover on, close the strip underneath and bolt it back on.",
      tools: ["allen"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["GRYSNA"],
  recipe(s) {
    if (s.archetype !== "bed" && !/bed frame/i.test(s.variant)) return null;
    return bed(s);
  },
};
export default family;
