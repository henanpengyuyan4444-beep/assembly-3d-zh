import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * FÄRGSÄTTARE wall shelf, read from its manual. No assembly as such: the paper template is taped level to the wall
 * and the four holes marked through it, the two wire side units are screwed up through their round screw plates
 * (two each; wall screws and plugs aren't in the box), and the three metal shelves hook onto the side units' rungs,
 * four hooks each, pressed down until they sit.
 * IKEA: 60 x 16.2 x 74 cm.
 */

const WIRE = 8;

/** A round wire from a to b, as a piece of a part centred at c. */
function wire(a: Vec3, b: Vec3, c: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [WIRE, L, WIRE],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, -Math.asin(d[0] / L)],
  };
}

function shelf(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 600, H = Math.round(s.size.h * 10) || 740, D = Math.round(s.size.d * 10) || 162;
  const zw = -D / 2; // the wall
  const sd = D - 22; // the side unit's loop, in front of its screw plates
  const zc = zw + 22 + sd / 2, R = sd / 2;
  const levels = [150, 370, 596]; // shelves, from the photo
  const rungs = [150, 268, 370, 485, 596];

  const side = (sx: number): CustomPart => {
    const x = sx * (W / 2 - WIRE / 2), c: Vec3 = [x, H / 2, zc];
    const pieces: PartPiece[] = [
      wire([x, R, zc - R], [x, H - R, zc - R], c),
      wire([x, R, zc + R], [x, H - R, zc + R], c),
      ...rungs.map((y) => wire([x, y, zc - R], [x, y, zc + R], c)),
    ];
    // the round ends of the loop, as short straight wires
    const n = 6;
    for (const [yc, up] of [[H - R, 1], [R, -1]] as const)
      for (let i = 0; i < n; i++) {
        const a0 = (Math.PI * i) / n, a1 = (Math.PI * (i + 1)) / n;
        pieces.push(wire([x, yc + up * R * Math.sin(a0), zc - R * Math.cos(a0)], [x, yc + up * R * Math.sin(a1), zc - R * Math.cos(a1)], c));
      }
    // the half-round screw plates at the back, near the top and bottom
    for (const y of [H - 130, 130])
      pieces.push({ shape: "halfcyl", size: [70, 3, 35], pos: [-sx * 17, y - H / 2, zw + 2 - zc], rot: [0, (-sx * Math.PI) / 2, Math.PI / 2] });
    return { id: sx < 0 ? "SL" : "SR", name: "Side unit", size: [WIRE + 45, H, D], pos: c, material: "metal", pieces };
  };

  const sw = W - 2 * WIRE - 4, depth = sd - 6;
  const parts: CustomPart[] = [side(-1), side(1)];
  levels.forEach((y, i) =>
    parts.push({
      id: `P${i}`,
      name: "Shelf",
      size: [sw, 20, depth],
      pos: [0, y + WIRE / 2 + 10, zc],
      material: "metal",
      pieces: [
        { shape: "box", size: [sw, 2, depth], pos: [0, -9, 0] },
        { shape: "box", size: [sw, 20, 2], pos: [0, 0, depth / 2 - 1] },
        { shape: "box", size: [sw, 12, 2], pos: [0, -4, -depth / 2 + 1] },
      ],
    }),
  );

  const screwAt: Vec3[] = [-1, 1].flatMap((sx) => [H - 130, 130].map((y): Vec3 => [sx * (W / 2 - 20), y, zw + 4]));
  return {
    parts,
    steps: [
      {
        title: "Tape the template to the wall and mark the holes",
        detail: "Tape it up where the shelf will hang and get it level. Mark the four holes through it, then take it down and drill.",
        tools: ["level", "pencil", "drill"],
        warnings: ["wall"],
      },
      {
        title: "Screw the two side units to the wall",
        detail: "Two screws through the round plates of each, the plates against the wall. Wall screws and plugs aren't included: pick ones made for your wall, and stop when the head sits on the plate.",
        add: ["SL", "SR"],
        fix: [
          { kind: "plug", count: 4, len: 35, dia: 8, at: screwAt.map((p): Vec3 => [p[0], p[1], zw - 40]), dir: [0, 0, -1] },
          { kind: "screw", count: 4, len: 50, dia: 5, at: screwAt, dir: [0, 0, -1] },
        ],
        tools: ["drill", "screwdriver"],
        wall: true,
        warnings: ["wall"],
      },
      {
        title: "Hook the shelves onto the rungs",
        detail: "Each shelf has two hooks at each end. Hold it tilted, hook it over the matching rungs on both sides and press it down until all four hooks sit.",
        add: ["P2", "P1", "P0"],
        from: { P0: [0, 120, 150], P1: [0, 120, 150], P2: [0, 120, 150] },
      },
    ],
  };
}

const family: Family = {
  names: ["FÄRGSÄTTARE", "FARGSATTARE"],
  recipe(s) {
    if (/^fargsattare-wall-shelf/.test(s.slug ?? "")) return shelf(s);
    return null;
  },
};
export default family;
