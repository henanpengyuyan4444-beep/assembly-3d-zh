import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * RIGGA, read from the clothes rack's manual. The base is two arched end frames on castors and four shelf tubes:
 * two tubes are bolted to one end frame, the rack is stood on that end on a rug, the other two tubes drop into its
 * slots and the second end frame goes on top and is bolted down. Laid back on its castors, the four bolts are
 * tightened, the two telescopic uprights are pushed into the end frames and bolted, and the top rail is bolted on
 * with a plastic washer under each end. The push buttons then set the height.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SIDES = [-1, 1] as const;

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 111 wide, 51 deep, 126 to 175 high (drawn at full height)
  const W = s.size.w * 10 || 1110, D = s.size.d * 10 || 510, H = Math.max(s.size.h * 10 || 1750, 1260);
  const tube = 25, rail = 30, post = 28;
  const xe = W / 2 - 60; // end frames and uprights
  const cy = 230; // shelf tubes and the end frames' cross bar
  const ze = D / 2 - 30; // end frame legs
  const castor = 55;
  const frame: PartPiece[] = [
    { shape: "cyl", size: [tube, 2 * ze, tube], pos: [0, (cy - castor) / 2, 0], rot: [Math.PI / 2, 0, 0] },
    ...SIDES.map((sz): PartPiece => ({ shape: "cyl", size: [tube, cy - castor, tube], pos: [0, 0, sz * ze] })),
    ...SIDES.map((sz): PartPiece => ({ shape: "cyl", size: [castor - 5, 22, castor - 5], pos: [0, -(cy - castor) / 2 - castor / 2, sz * ze], rot: [0, 0, Math.PI / 2], material: "metal" })),
  ];
  const endFrame = (id: string, sx: number): CustomPart => ({
    id,
    name: "End frame with castors",
    size: [tube, cy + tube / 2, 2 * ze + tube],
    pos: [sx * xe, (cy + tube / 2) / 2, 0],
    pieces: frame.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] + (cy - castor) / 2 + castor - (cy + tube / 2) / 2, p.pos[2]] as Vec3 })),
    material: "metal",
  });
  const zs = [-1.5, -0.5, 0.5, 1.5].map((k) => k * ((2 * ze - 40) / 3));
  const tubeLen = 2 * xe - tube;
  const shelf = (id: string, z: number): CustomPart => ({ id, name: "Shelf tube", shape: "cyl", size: [tubeLen, 20, 20], pos: [0, cy, z], material: "metal" });
  const postY0 = cy + tube / 2, postY1 = H - rail;
  const parts: CustomPart[] = [
    endFrame("E1", -1),
    shelf("S1", zs[0]),
    shelf("S4", zs[3]),
    shelf("S2", zs[1]),
    shelf("S3", zs[2]),
    endFrame("E2", 1),
    ...SIDES.map((sx, i): CustomPart => ({ id: `U${i + 1}`, name: "Telescopic upright", shape: "cyl", size: [post, postY1 - postY0, post], pos: [sx * xe, (postY0 + postY1) / 2, 0], material: "metal" })),
    { id: "T", name: "Top rail", shape: "cyl", size: [W, rail, rail], pos: [0, H - rail / 2, 0], material: "metal" },
  ];
  const sleeve = { len: 40, dia: 6, name: "Sleeve bolt" };
  const endBolts = (sx: number, on: string) => at("bolt", [zs[0], zs[3]].map((z) => [sx * (xe + tube / 2), cy, z] as Vec3), [-sx, 0, 0], on, undefined, sleeve);

  return {
    parts,
    steps: [
      {
        title: "Bolt two shelf tubes to an end frame",
        detail: "Use the front and back tubes. The bolts go in from the outside of the frame, by hand for now.",
        add: ["E1", "S1", "S4"],
        fix: [endBolts(-1, "E1")],
        tools: ["allen"],
        warnings: ["floor"],
      },
      {
        title: "Stand it on its end and drop in the middle tubes",
        detail: "Turn it up so the end frame lies on a rug. The two middle tubes go into the slots in the frame.",
        add: ["S2", "S3"],
        pose: "+x",
      },
      { title: "Put the other end frame on top", detail: "All four tubes go into its holes and slots.", add: ["E2"] },
      { title: "Bolt the top end frame on", detail: "Two bolts down into the front and back tubes, by hand for now.", fix: [endBolts(1, "E2")], tools: ["allen"] },
      {
        title: "Lay it on its castors and tighten the bolts",
        detail: "All four bolts, until their heads sit flush in the frame.",
        pose: "+y",
        tools: ["allen"],
      },
      { title: "Push the uprights into the end frames", detail: "The rows of holes face the same way. Each one goes down into the socket in the middle of its frame.", add: ["U1", "U2"] },
      {
        title: "Bolt the uprights in",
        detail: "A sleeve nut goes in from one side and the round-headed bolt from the other. Tighten them with the Allen key.",
        fix: [
          ...SIDES.map((sx, i) => at("bolt", [[sx * xe, postY0 + 30, -post / 2]], [0, 0, 1], `U${i + 1}`, `E${i + 1}`, { len: 16, dia: 6 })),
          at("nut", SIDES.map((sx) => [sx * xe, postY0 + 30, post / 2] as Vec3), [0, 0, -1], undefined, undefined, { name: "Sleeve nut", len: 25, dia: 10 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Bolt the top rail onto the uprights",
        detail: "Put a plastic washer on top of each upright first, then a long bolt down through the rail into each.",
        add: ["T"],
        fix: [
          at("washer", SIDES.map((sx) => [sx * xe, postY1, 0] as Vec3), [0, -1, 0], undefined, undefined, { name: "Plastic washer", len: 6, dia: 28 }),
          at("bolt", SIDES.map((sx) => [sx * xe, H, 0] as Vec3), [0, -1, 0], "T", undefined, sleeve),
        ],
        tools: ["allen"],
      },
      { title: "Set the height", detail: "Press the button on each upright and slide it up or down until it clicks into the next hole. Set both the same." },
    ],
  };
}

const family: Family = { names: ["RIGGA"], recipe };
export default family;
