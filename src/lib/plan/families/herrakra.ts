import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * HERRÅKRA, read from the armchair's manual. Four upholstered pieces: the seat, the back and two sides. Two threaded
 * studs are screwed by hand into the back and into each side. With the chair on its back, the back's studs go through
 * the seat frame and take a washer and nut each (box spanner). Upside down, the four splayed legs are bolted on, three
 * bolts a leg. Standing, each side hooks into the slot in the back, slides down so its studs pass into the seat, and
 * is fixed with two nuts. Last, upside down again, the cover is closed underneath.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** A round leg from a to b, as a piece of a part centred at c. */
function bar(a: Vec3, b: Vec3, c: Vec3, dia: number): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [dia, len, dia],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}

function armchair(): CustomParams {
  // IKEA: 71 wide, 66 deep, 73 high, sides 71 high, seat 44 high and 49 wide, 19 free under it
  const W = 710, D = 660, H = 730, yUnder = 190, ySeat = 440;
  const sw = 490, tBack = 120, tSide = 110;
  const zBack1 = -D / 2 + tBack, zSeat1 = D / 2 - 20;
  const yLow = yUnder + 70; // height of the studs and nuts
  const xs = W / 2 - tSide / 2 - 5;

  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [sw, ySeat - yUnder, zSeat1 - zBack1], pos: [0, (ySeat + yUnder) / 2, (zSeat1 + zBack1) / 2], material: "soft" },
    { id: "K", name: "Back", size: [sw, H - yUnder, tBack], pos: [0, (H + yUnder) / 2, -D / 2 + tBack / 2], material: "soft" },
  ];
  // the legs splay out from a plate under each corner of the seat
  const legs: [string, number, number][] = [
    ["LB1", -1, -1],
    ["LB2", 1, -1],
    ["LF1", -1, 1],
    ["LF2", 1, 1],
  ];
  const plate = (sx: number, sz: number): Vec3 => [sx * 185, yUnder, sz * (sz < 0 ? 200 : 220)];
  for (const [id, sx, sz] of legs) {
    const top = plate(sx, sz), foot: Vec3 = [sx * 300, 0, sz * 300];
    const c: Vec3 = [(top[0] + foot[0]) / 2, yUnder / 2, (top[2] + foot[2]) / 2];
    parts.push({
      id,
      name: sz < 0 ? "Back leg" : "Front leg",
      size: [Math.abs(foot[0] - top[0]) + 70, yUnder, Math.abs(foot[2] - top[2]) + 70],
      pos: c,
      material: "wood",
      pieces: [
        { shape: "box", size: [70, 4, 70], pos: [top[0] - c[0], yUnder - 2 - c[1], top[2] - c[2]], material: "metal" },
        bar([top[0], yUnder - 4, top[2]], foot, c, 35),
      ],
    });
  }
  for (const [id, sx] of [["A1", -1], ["A2", 1]] as const) {
    parts.push({ id, name: "Side", size: [tSide, 710 - yUnder, D - 60], pos: [sx * xs, (710 + yUnder) / 2, -30], rot: [0, 0, -sx * 0.06], material: "soft" });
  }

  const backStuds: Vec3[] = [-1, 1].map((sx) => [sx * 150, yLow, zBack1] as Vec3);
  const sideStuds = (sx: number): Vec3[] => [-120, 160].map((z) => [sx * sw / 2, yLow, z] as Vec3);
  const nutsOn = (pts: Vec3[], dir: Vec3, on: string): CustomFix[] => {
    const inner = pts.map((p) => [p[0] - dir[0] * 40, p[1], p[2] - dir[2] * 40] as Vec3);
    return [at("washer", inner, dir, "S", on), at("nut", inner, dir, "S", on, { dia: 8 })];
  };
  const legBolts = (ids: string[]): CustomFix[] =>
    legs
      .filter(([id]) => ids.includes(id))
      .map(([id, sx, sz]) => {
        const p = plate(sx, sz);
        return at("bolt", [[-22, -22], [22, -22], [0, 24]].map(([dx, dz]) => [p[0] + dx, yUnder - 4, p[2] + dz] as Vec3), [0, 1, 0], id, "S", { len: 20, dia: 6 });
      });

  return {
    parts,
    steps: [
      {
        title: "Screw the studs into the back and sides",
        detail: "Lay the three pieces on a rug. Two studs in each, turned in by hand until they stop.",
        fix: [
          at("stud", backStuds, [0, 0, -1], "K", "S", { len: 60, dia: 8 }),
          ...[-1, 1].map((sx) => at("stud", sideStuds(sx), [sx, 0, 0], sx < 0 ? "A1" : "A2", "S", { len: 60, dia: 8 })),
        ],
        wait: ["K", "A1", "A2"],
        warnings: ["floor"],
      },
      {
        title: "Bolt the back to the seat",
        detail: "With the back lying on the rug, stand the seat on it so the studs pass through its frame. A washer and nut on each, tightened with the box spanner.",
        add: ["K", "S"],
        fix: nutsOn(backStuds, [0, 0, -1], "K"),
        tools: ["wrench"],
        pose: "+z",
      },
      {
        title: "Bolt on the back legs",
        detail: "Turn the chair upside down. Check each leg's plate matches the drawing, then three bolts through it.",
        add: ["LB1", "LB2"],
        fix: legBolts(["LB1", "LB2"]),
        tools: ["allen"],
        pose: "-y",
      },
      { title: "Bolt on the front legs", detail: "The same way, three bolts a leg.", add: ["LF1", "LF2"], fix: legBolts(["LF1", "LF2"]), tools: ["allen"] },
      {
        title: "Hook on the left side",
        detail: "Stand the chair up. Hook the top of the side into the slot in the back, then slide it down so its studs go into the seat.",
        add: ["A1"],
        pose: "+y",
        from: { A1: [-200, 300, 0] },
      },
      { title: "Fix the side with two nuts", detail: "A washer and nut on each stud, from under the seat, tightened with the box spanner.", fix: nutsOn(sideStuds(-1), [-1, 0, 0], "A1"), tools: ["wrench"] },
      { title: "Hook on the right side", detail: "The same on the other side: into the slot, then down onto the seat.", add: ["A2"], from: { A2: [200, 300, 0] } },
      { title: "Fix it with two nuts", detail: "A washer and nut on each stud, tightened with the box spanner.", fix: nutsOn(sideStuds(1), [1, 0, 0], "A2"), tools: ["wrench"] },
      { title: "Close the cover underneath", detail: "Turn the chair upside down and fasten the cover's opening under the seat all the way along.", pose: "-y" },
      { title: "Stand the chair up", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["HERRÅKRA", "HERRAKRA"],
  recipe(s) {
    if (/armchair/i.test(s.variant) || /herrakra-armchair/.test(s.slug ?? "")) return armchair();
    return null;
  },
};
export default family;
