import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * JAKOBSFORS, read from the round coffee table's manual. Two rails, halved where they cross, each carry a bent leg
 * at both ends: dowels go into the rails and the legs, each leg is pushed onto a rail end and held by a long bolt into
 * a barrel nut. The top is laid upside down on a rug with the shelf on it, the two leg frames are set onto the top
 * (one slot up, one slot down, so they lock together) and the locks in the top are turned to grip the legs. Then the
 * shelf is lifted against the rails and bolted to them with four short bolts.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** A square beam from a to b, as a piece of a part centred at c. */
function beam(a: Vec3, b: Vec3, c: Vec3, w: number): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    shape: "box",
    size: [w, len, w],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}

function table(): CustomParams {
  // IKEA: 80 across, 42 high, 18 free under the shelf
  const DIA = 800, H = 420, tTop = 20;
  const yTop = H - tTop;
  const rTop = 330, rKnee = 320, rFoot = 385, LEG = 44;
  const yRail = 210, hRail = 60, tRail = 25;
  const rEnd = rKnee - LEG / 2; // where a rail end meets the leg
  const yShelf = yRail + hRail / 2, tShelf = 18, SHELF = 570;

  // the four legs stand on the two rails' axes: -x, +x, -z, +z
  const dirs: [string, number, number, string][] = [
    ["L1", -1, 0, "RX"],
    ["L2", 1, 0, "RX"],
    ["L3", 0, -1, "RZ"],
    ["L4", 0, 1, "RZ"],
  ];
  const pt = (ux: number, uz: number, r: number, y: number): Vec3 => [ux * r, y, uz * r];
  const leg = (id: string, ux: number, uz: number): CustomPart => {
    const rc = (rTop + rFoot) / 2;
    const c = pt(ux, uz, rc, yTop / 2);
    const span = rFoot - rKnee + LEG + 20;
    return {
      id,
      name: "Leg",
      size: [ux ? span : LEG, yTop, uz ? span : LEG],
      pos: c,
      material: "wood",
      pieces: [beam(pt(ux, uz, rTop, yTop), pt(ux, uz, rKnee, yRail), c, LEG), beam(pt(ux, uz, rKnee, yRail), pt(ux, uz, rFoot, 0), c, LEG)],
    };
  };

  const parts: CustomPart[] = [
    { id: "RX", name: "Rail", size: [2 * rEnd, hRail, tRail], pos: [0, yRail, 0], material: "wood" },
    { id: "RZ", name: "Rail", size: [tRail, hRail, 2 * rEnd], pos: [0, yRail, 0], material: "wood" },
    ...dirs.map(([id, ux, uz]) => leg(id, ux, uz)),
    { id: "T", name: "Table top", shape: "cyl", size: [DIA, tTop, DIA], pos: [0, yTop + tTop / 2, 0] },
    { id: "S", name: "Shelf", shape: "cyl", size: [SHELF, tShelf, SHELF], pos: [0, yShelf + tShelf / 2, 0] },
  ];

  const along = (rail: string, d: number): Vec3 => (rail === "RX" ? [d, 0, 0] : [0, 0, d]);
  const railDowels = (rail: string) => at("dowel", [-150, 150].map((d) => { const p = along(rail, d); return [p[0], yShelf, p[2]] as Vec3; }), [0, -1, 0], rail, "S");
  const shelfBolts = (rail: string) => at("bolt", [-220, 220].map((d) => { const p = along(rail, d); return [p[0], yRail - hRail / 2, p[2]] as Vec3; }), [0, 1, 0], rail, "S", { len: 70, dia: 6 });

  return {
    parts,
    steps: [
      { title: "Tap the dowels into the rails", detail: "Two in the top edge of each rail, the edge with the slot facing the same way on both.", fix: [railDowels("RX"), railDowels("RZ")], tools: ["hammer"] },
      {
        title: "Tap the dowels into the legs",
        detail: "Two in each leg: one in the inner face at the bend, one in the top end.",
        fix: dirs.flatMap(([id, ux, uz, rail]) => [
          at("dowel", [pt(ux, uz, rEnd, yRail)], [ux, 0, uz], id, rail),
          at("dowel", [pt(ux, uz, rTop, yTop)], [0, -1, 0], id, "T"),
        ]),
        tools: ["hammer"],
        wait: ["L1", "L2", "L3", "L4"],
      },
      { title: "Push a leg onto each rail end", detail: "Both legs on a rail bend outwards the same way. Keep the two leg frames apart for now.", add: ["RX", "L1", "L2", "RZ", "L3", "L4"] },
      {
        title: "Bolt the legs to the rails",
        detail: "Drop a barrel nut into the hole near each rail end, slot facing the bolt, then turn a long bolt through the leg into it.",
        fix: dirs.flatMap(([id, ux, uz, rail]) => [
          at("nut", [rail === "RX" ? [ux * (rEnd - 40), yRail, tRail / 2] : [tRail / 2, yRail, uz * (rEnd - 40)]], rail === "RX" ? [0, 0, -1] : [-1, 0, 0], rail, undefined, { name: "Barrel nut" }),
          at("bolt", [pt(ux, uz, rKnee + LEG / 2, yRail)], [-ux, 0, -uz], id, rail, { len: 100, dia: 6 }),
        ]),
        tools: ["allen"],
      },
      {
        title: "Lay the top upside down with the shelf on it",
        detail: "Put the top face down on a rug and lay the shelf face down in the middle of it.",
        add: ["T"],
        pose: "-y",
        warnings: ["floor"],
        from: { T: [0, 400, 0] },
      },
      {
        title: "Set the leg frames onto the top",
        detail: "First the frame with its rail slot facing up, then the other with its slot down so the rails lock together. The dowels at the leg tops go into the holes in the top.",
      },
      { title: "Turn the locks to hold the legs", detail: "Push each leg in towards the middle and turn the lock next to it in the top until it grips.", tools: ["screwdriver"] },
      { title: "Lift the shelf against the rails", detail: "The dowels in the rails go into the holes in the shelf.", add: ["S"], from: { S: [0, 150, 0] } },
      { title: "Bolt the shelf to the rails", detail: "One short bolt near each end of both rails.", fix: [shelfBolts("RX"), shelfBolts("RZ")], tools: ["allen"] },
      { title: "Turn the table over", detail: "Lift it by the top, not by the legs.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["JAKOBSFORS"],
  recipe(s) {
    if (/coffee/i.test(s.variant) || /jakobsfors-coffee/.test(s.slug ?? "")) return table();
    return null;
  },
};
export default family;
