import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * RISHOLMEN, read from the wing chair's manual. Four woven pieces bolted together on a rug: the back goes onto
 * the seat with two long bolts and big washers, then the chair lies on its side for each wing-and-arm side,
 * which takes three bolts down into the seat and two up from inside the back. Stood up, the bolts that come
 * fitted in the back and under the seat are tightened. No cushions come with it.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const BOLT = { len: 40, dia: 6 };
const WASHER = { len: 2, dia: 18 };

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 68 wide, 67 deep, 80 high, seat 50 x 50 at 37 high
  const W = s.size.w * 10 || 680, D = s.size.d * 10 || 670, H = s.size.h * 10 || 800;
  const seatY = 370, sw = 500, xs = sw / 2; // seat top and width
  const sideT = (W - sw) / 2;
  const zb = -D / 2 + 45, zf = D / 2 - 30; // back's front face, front legs
  const seat0 = 200;

  const side = (id: string, sx: number): CustomPart => {
    const cx = sx * (xs + sideT / 2);
    const legD = 50;
    const p = (size: Vec3, pos: Vec3, shape: PartPiece["shape"] = "box"): PartPiece => ({ shape, size, pos: [pos[0], pos[1] - H / 2, pos[2]] });
    return {
      id,
      name: "Side with wing",
      size: [sideT, H, D],
      pos: [cx, H / 2, 0],
      material: "wood",
      pieces: [
        p([legD, 600, legD], [0, 300, zf], "cyl"),
        p([legD, H, legD], [0, H / 2, -D / 2 + legD / 2], "cyl"),
        p([sideT, 70, D - legD], [0, 595, 0]), // the arm
        p([30, H - 600, 400], [0, (600 + H) / 2, -D / 2 + 225]), // the wing, flaring forward from the back
        p([30, seatY - seat0 + 40, D - 2 * legD], [-sx * 10, (seat0 + seatY + 40) / 2, 0]),
      ],
    };
  };
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [sw, seatY - seat0, zf - zb], pos: [0, (seat0 + seatY) / 2, (zb + zf) / 2], material: "wood" },
    { id: "B", name: "Back", size: [sw, H - seat0, 45], pos: [0, (seat0 + H) / 2, -D / 2 + 22.5], material: "wood" },
    side("R", 1),
    side("L", -1),
  ];
  const seatBolts = (sx: number, id: string) => [
    at("bolt", [-150, 50, 250].map((z) => [sx * (W / 2), (seat0 + seatY) / 2, z] as Vec3), [-sx, 0, 0], id, "S", BOLT),
    at("washer", [-150, 50, 250].map((z) => [sx * (W / 2 + 2), (seat0 + seatY) / 2, z] as Vec3), [-sx, 0, 0], id, undefined, WASHER),
  ];
  const backBolts = (sx: number, id: string) => [
    at("bolt", [450, 650].map((y) => [sx * xs, y, -D / 2 + 22.5] as Vec3), [sx, 0, 0], "B", id, BOLT),
    at("washer", [450, 650].map((y) => [sx * (xs - 2), y, -D / 2 + 22.5] as Vec3), [sx, 0, 0], "B", undefined, WASHER),
  ];
  return {
    parts,
    steps: [
      {
        title: "Bolt the back onto the seat",
        detail: "Lay both on a rug. Use the two long bolts with the big flat washers, and tighten until the heads sit flat on the weave.",
        add: ["S", "B"],
        fix: [
          at("bolt", [-150, 150].map((x) => [x, (seat0 + seatY) / 2, -D / 2] as Vec3), [0, 0, 1], "B", "S", { len: 70, dia: 8 }),
          at("washer", [-150, 150].map((x) => [x, (seat0 + seatY) / 2, -D / 2 - 2] as Vec3), [0, 0, 1], "B", undefined, { len: 2, dia: 24 }),
        ],
        tools: ["allen"],
        warnings: ["floor"],
      },
      {
        title: "Lay a side on and bolt it to the seat",
        detail: "Lay the chair on its side, then the side piece on top. Three bolts with washers go down through it. Don't tighten so hard the washer cups.",
        add: ["R"],
        fix: seatBolts(1, "R"),
        tools: ["allen"],
        pose: "+x",
      },
      { title: "Bolt the back to the side", detail: "Two bolts with washers, from inside the back into the side.", fix: backBolts(1, "R"), tools: ["allen"] },
      { title: "Turn it over and bolt on the other side", detail: "Three bolts down through it into the seat, the same way.", add: ["L"], fix: seatBolts(-1, "L"), tools: ["allen"], pose: "-x" },
      { title: "Bolt the back to the second side", detail: "Two bolts from inside the back.", fix: backBolts(-1, "L"), tools: ["allen"] },
      { title: "Stand it up and tighten the back's bolts", detail: "Tip the chair forward. The eight bolts already in the back go tight until their heads sit flat.", tools: ["allen"], pose: "+y" },
      { title: "Tighten the bolts under the seat", detail: "Turn the chair round. One bolt under each side of the seat, until it sits flat.", tools: ["allen"] },
    ],
  };
}

const family: Family = { names: ["RISHOLMEN"], recipe };
export default family;
