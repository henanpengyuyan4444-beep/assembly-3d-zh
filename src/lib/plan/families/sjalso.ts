import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, Vec3 } from "../../types";

/*
 * SJÄLSÖ armchair, read from IKEA's manual. Two ready-made pine side frames are joined by a front and a back rail
 * (a dowel, a barrel nut and a long bolt at each end). The one-piece fabric sling takes a bar in its front hem and
 * one in its back hem, each bolted between the side frames (a long bolt one side, a short one the other). Then a
 * post slides up into each side pocket of the back: one bolt up through the back rail into its foot and one
 * through the side frame into a cap nut.
 * IKEA's sizes: 64 wide, 63 deep, 72 high, armrests 52, seat 41 high, 54 x 51, 22 free under it.
 */

/** One part drawn as boxes given in finished-product mm. */
function boxes(id: string, name: string, list: [Vec3, Vec3][], material: PartMaterial): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...list.map((b) => b[0][k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...list.map((b) => b[1][k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  const pieces: PartPiece[] = list.map(([a, b]) => ({
    shape: "box",
    size: [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    pos: [(a[0] + b[0]) / 2 - pos[0], (a[1] + b[1]) / 2 - pos[1], (a[2] + b[2]) / 2 - pos[2]],
  }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos, material, pieces };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function armchair(): CustomParams {
  const XI = 277, XO = 320; // inner and outer face of a side frame
  const FZ: [number, number] = [245, 290], BZ: [number, number] = [-270, -225]; // front and back legs
  const ARM = 470, TOP = 520;
  const side = (id: string, g: number): CustomPart => {
    const x0 = Math.min(g * XI, g * XO), x1 = Math.max(g * XI, g * XO);
    const a0 = Math.min(g * XI, g * 330), a1 = Math.max(g * XI, g * 330); // the arm overhangs outwards a little
    return boxes(id, "Side frame", [
      [[x0, 0, FZ[0]], [x1, ARM, FZ[1]]],
      [[x0, 0, BZ[0]], [x1, ARM, BZ[1]]],
      [[x0, 40, BZ[1]], [x1, 100, FZ[0]]],
      [[a0, ARM, -300], [a1, TOP, 305]],
    ], "wood");
  };
  // the sling: the seat runs from the front bar down to the back bar, the back leans back between the posts
  const fy = 395, fz = 267, by = 280, bz = -247;
  const seatLen = Math.hypot(fy - by, fz - bz), seatTilt = -Math.atan2(fy - by, fz - bz);
  const LEAN = -0.12, PY0 = 380, PY1 = 720, pz = -257;
  const pc: Vec3 = [0, (PY0 + PY1) / 2, pz - ((PY1 - PY0) / 2) * Math.sin(-LEAN)];
  const postZ = (y: number) => pz - (y - PY0) * Math.tan(-LEAN);
  const slingC: Vec3 = [0, (by + PY1) / 2, (fz + bz) / 2];
  const sling: CustomPart = {
    id: "S",
    name: "Seat and back sling",
    size: [540, PY1 - by, fz - pz + 20],
    pos: slingC,
    material: "soft",
    pieces: [
      { shape: "box", size: [540, 8, seatLen], pos: [0, (fy + by) / 2 + 12 - slingC[1], (fz + bz) / 2 - slingC[2]], rot: [seatTilt, 0, 0] },
      { shape: "box", size: [500, PY1 - PY0 + 40, 8], pos: [0, pc[1] - 20 - slingC[1], pc[2] + 22 - slingC[2]], rot: [LEAN, 0, 0] },
    ],
  };
  const parts: CustomPart[] = [
    side("L", -1),
    { id: "F", name: "Front rail", size: [2 * XI, 100, 25], pos: [0, 270, 258], material: "wood" },
    { id: "B", name: "Back rail", size: [2 * XI, 60, 25], pos: [0, 350, pz], material: "wood" },
    side("R", 1),
    sling,
    { id: "FB", name: "Seat bar", size: [2 * XI, 25, 25], pos: [0, fy, fz], material: "wood" },
    { id: "BB", name: "Seat bar", size: [2 * XI, 25, 25], pos: [0, by, bz], material: "wood" },
    ...[1, -1].map((g, i): CustomPart => ({ id: `P${i + 1}`, name: "Back post", size: [40, PY1 - PY0, 36], pos: [g * 256, pc[1], pc[2]], rot: [LEAN, 0, 0], material: "wood" })),
  ];
  const ends = (y: number, z: number, g: number): Vec3 => [g * XI, y, z];
  const railEnds = (dir: number) =>
    [-1, 1].flatMap((g) => [
      fix("dowel", [ends(250, 258, g)], [g * dir, 0, 0], { on: "F", mate: g < 0 ? "L" : "R" }),
      fix("dowel", [ends(340, pz, g)], [g * dir, 0, 0], { on: "B", mate: g < 0 ? "L" : "R" }),
    ]);
  const through = (y: number, z: number, g: number, on: string, mate: string, o: Partial<CustomFix>) =>
    fix("bolt", [[g * XO, y, z]], [-g, 0, 0], { on, mate, ...o });
  const LONG = { len: 70, dia: 6 }, SHORT = { len: 40, dia: 6 };
  const postBolt = (g: number, id: string) => fix("bolt", [[g * 256, 320, postZ(380)]], [0, 1, 0], { on: "B", mate: id, ...LONG });
  const sideBolt = (g: number, id: string): CustomFix[] => [
    through(440, postZ(440), g, g < 0 ? "L" : "R", id, LONG),
    fix("nut", [[g * 236, 440, postZ(440)]], [g, 0, 0], { on: id, name: "Cap nut" }),
  ];
  return {
    parts,
    steps: [
      {
        title: "Tap the dowels into the rails",
        detail: "One dowel into each end of the front and back rails.",
        fix: railEnds(1),
        wait: ["F", "B"],
        tools: ["hammer"],
      },
      {
        title: "Join the side frames with the rails",
        detail: "Push a barrel nut into each rail end, slot turned to the bolt, then turn a long bolt through each leg into it. The wide rail goes at the front.",
        add: ["L", "F", "B", "R"],
        fix: [
          ...[-1, 1].flatMap((g) => [
            fix("nut", [[g * (XI - 30), 270, 245]], [0, 0, 1], { on: "F", name: "Barrel nut" }),
            fix("nut", [[g * (XI - 30), 350, pz + 12]], [0, 0, -1], { on: "B", name: "Barrel nut" }),
          ]),
          ...[-1, 1].flatMap((g) => [
            through(270, 267, g, g < 0 ? "L" : "R", "F", { len: 90, dia: 6 }),
            through(350, pz, g, g < 0 ? "L" : "R", "B", { len: 90, dia: 6 }),
          ]),
        ],
        tools: ["allen"],
        warnings: ["floor"],
      },
      {
        title: "Slide a bar into the seat's front hem",
        detail: "The holes in the bar's ends must show through the openings in the hem. Lay the sling in the frame.",
        add: ["S", "FB"],
        from: { S: [0, 400, 300], FB: [0, 400, 300] },
      },
      {
        title: "Bolt one end of the front bar",
        detail: "A long bolt through the front leg into the bar.",
        fix: [through(fy, fz, -1, "L", "FB", LONG)],
        tools: ["allen"],
      },
      {
        title: "Bolt the other end of the front bar",
        detail: "A short bolt this side.",
        fix: [through(fy, fz, 1, "R", "FB", SHORT)],
        tools: ["allen"],
      },
      {
        title: "Slide the second bar into the back hem",
        detail: "Pull the seat taut towards the back and line the bar up with the holes in the back legs.",
        add: ["BB"],
        from: { BB: [0, 300, 0] },
      },
      { title: "Bolt one end of the back bar", detail: "A long bolt through the back leg.", fix: [through(by, bz, -1, "L", "BB", LONG)], tools: ["allen"] },
      { title: "Bolt the other end of the back bar", detail: "A short bolt this side.", fix: [through(by, bz, 1, "R", "BB", SHORT)], tools: ["allen"] },
      {
        title: "Slide a post into the back's side pocket",
        detail: "Push it right up into the pocket, the hole in its foot facing down, and stand it on the back rail.",
        add: ["P1"],
        from: { P1: [0, -250, 120] },
      },
      { title: "Bolt the post's foot from below", detail: "A long bolt up through the back rail into the post.", fix: [postBolt(1, "P1")], tools: ["allen"] },
      {
        title: "Bolt the post to the side frame",
        detail: "A long bolt through the frame into the post, and a cap nut on the inside. Tighten both keys against each other.",
        fix: sideBolt(1, "P1"),
        tools: ["allen"],
      },
      { title: "Slide the other post into its pocket", detail: "The same on the other side.", add: ["P2"], from: { P2: [0, -250, 120] } },
      { title: "Bolt its foot from below", detail: "A long bolt up through the back rail.", fix: [postBolt(-1, "P2")], tools: ["allen"] },
      { title: "Bolt it to the side frame", detail: "The last long bolt and cap nut. Check every bolt is tight.", fix: sideBolt(-1, "P2"), tools: ["allen"] },
    ],
  };
}

const family: Family = {
  names: ["SJÄLSÖ", "SJALSO"],
  recipe(s) {
    if (/armchair/i.test(`${s.variant} ${s.slug ?? ""}`)) return armchair();
    return null;
  },
};
export default family;
