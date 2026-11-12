import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GROERYD utility cart, read from its manual. It is built upside down: the top frame (its upper shelf, rail and the
 * two handle ends) lies on the floor, the four short posts are pushed into it and bolted (four bolts), then the four
 * long posts (eight bolts). The bottom frame goes on the other end and is bolted to all eight (twelve bolts). Still
 * upside down, the four castors are screwed in with the spanner, the two with brakes at one end. Stood up, the two
 * glass shelves slide in from the end and drop into their frames. IKEA: 72 x 37 x 80 cm.
 */

const TUBE = 18;
type Fx = Omit<CustomFix, "count" | "at"> & { at: Vec3[] };
const fx = (f: Fx): CustomFix => ({ ...f, count: f.at.length });
const BOLT = { kind: "bolt", len: 10, dia: 6 } as const;

/** A rectangle of tubes in the x-z plane at height y, as pieces of a part centred at c. */
function rect(x: number, z: number, y: number, c: Vec3): PartPiece[] {
  return [
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [2 * x + TUBE, TUBE, TUBE], pos: [0, y - c[1], sz * z] })),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [TUBE, TUBE, 2 * z - TUBE], pos: [sx * x, y - c[1], 0] })),
  ];
}

function cart(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 720, H = Math.round(s.size.h * 10) || 800, D = Math.round(s.size.d * 10) || 370;
  const x = W / 2 - TUBE / 2, z = D / 2 - TUBE / 2, xi = x - 30;
  const CASTOR = 70;
  const yLo = 205, yLoRail = 355, yUp = 650, yUpRail = 735, yHandle = H - TUBE / 2;
  const tc: Vec3 = [0, (yUp + yHandle) / 2, 0];
  const top: PartPiece[] = [
    ...rect(x, z, yUp, tc),
    ...rect(x, z, yUpRail, tc),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): PartPiece => ({ shape: "box", size: [TUBE, yHandle - yUp, TUBE], pos: [sx * x, 0, sz * z] }))),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [TUBE, TUBE, 2 * z - TUBE], pos: [sx * x, yHandle - tc[1], 0] })),
  ];
  const bc: Vec3 = [0, (yLo + yLoRail) / 2, 0];
  const bottom: PartPiece[] = [...rect(x, z, yLo, bc), ...rect(x, z, yLoRail, bc)];
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz] as const));
  const parts: CustomPart[] = [
    { id: "T", name: "Top frame", size: [W, yHandle - yUp + TUBE, D], pos: tc, pieces: top, material: "metal" },
    ...corners.map(([sx, sz], i): CustomPart => ({ id: `P${i}`, name: "Short post", size: [TUBE, yUp - yLo - TUBE, TUBE], pos: [sx * xi, (yUp + yLo) / 2, sz * z], material: "metal" })),
    ...corners.map(([sx, sz], i): CustomPart => ({ id: `L${i}`, name: "Long post", size: [TUBE, yUp - TUBE / 2 - CASTOR, TUBE], pos: [sx * x, (yUp - TUBE / 2 + CASTOR) / 2, sz * z], material: "metal" })),
    { id: "B", name: "Bottom frame", size: [W, yLoRail - yLo + TUBE, D], pos: bc, pieces: bottom, material: "metal" },
    { id: "G0", name: "Glass shelf", size: [2 * x - TUBE, 5, 2 * z - TUBE], pos: [0, yLo + TUBE / 2 + 3, 0], material: "glass" },
    { id: "G1", name: "Glass shelf", size: [2 * x - TUBE, 5, 2 * z - TUBE], pos: [0, yUp + TUBE / 2 + 3, 0], material: "glass" },
  ];
  // bolts go in from the outside of a frame's long rail into the post behind it
  const bolts = (pts: [number, number, number][]): CustomFix => fx({ ...BOLT, at: pts.map(([px, y, sz]): Vec3 => [px, y, sz * (z + TUBE / 2)])});
  const at = (px: number, sz: number, ys: number[]) => ys.map((y): [number, number, number] => [px, y, sz]);
  const inner = (y: number) => corners.flatMap(([sx, sz]) => at(sx * xi, sz, [y]));
  const outer = (ys: number[]) => corners.flatMap(([sx, sz]) => at(sx * x, sz, ys));
  const inward = (f: CustomFix): CustomFix[] =>
    [-1, 1].map((sz) => ({ ...f, at: f.at!.filter((p) => Math.sign(p[2]) === sz), count: f.at!.filter((p) => Math.sign(p[2]) === sz).length, dir: [0, 0, -sz] as Vec3 }));
  return {
    parts,
    steps: [
      {
        title: "Push the short posts into the top frame",
        detail: "It is built upside down: lay the top frame on a rug, handle ends down, and push a short post onto each inner stub.",
        add: ["T", "P0", "P1", "P2", "P3"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Bolt the short posts", detail: "One bolt through the frame into each post.", fix: inward(bolts(inner(yUp - 6))), tools: ["allen"] },
      { title: "Push in the long posts", detail: "One at each corner, the stubs for the bottom frame facing in.", add: ["L0", "L1", "L2", "L3"] },
      { title: "Bolt the long posts", detail: "Two bolts in each.", fix: inward(bolts(outer([yUp - 6, yUpRail]))), tools: ["allen"] },
      { title: "Put the bottom frame on", detail: "Onto the ends of all eight posts.", add: ["B"] },
      {
        title: "Bolt the bottom frame",
        detail: "Two bolts into each long post and one into each short post.",
        fix: inward(bolts([...outer([yLo, yLoRail]), ...inner(yLo + 6)])),
        tools: ["allen"],
        check: "square",
      },
      {
        title: "Screw in the castors",
        detail: "Into the ends of the long posts, tight with the spanner. The two with brakes go at the same end.",
        fix: [
          fx({ kind: "castor", name: "Castor with brake", at: [-1, 1].map((sz): Vec3 => [-x, CASTOR, sz * z]), dir: [0, 1, 0] }),
          fx({ kind: "castor", at: [-1, 1].map((sz): Vec3 => [x, CASTOR, sz * z]), dir: [0, 1, 0] }),
        ],
        tools: ["wrench"],
      },
      { title: "Turn the cart over", detail: "Stand it on its castors and put the brakes on.", pose: "+y" },
      { title: "Slide the lower glass shelf in", detail: "From one end, tilted, under the rail.", add: ["G0"], from: { G0: [W, 60, 0] } },
      { title: "Lower it into the frame", detail: "Let it drop flat so it rests on the frame all round." },
      { title: "Slide in the upper glass shelf", detail: "The same way, from the end, then let it down into the top frame.", add: ["G1"], from: { G1: [W, 60, 0] } },
    ],
  };
}

const family: Family = {
  names: ["GROERYD"],
  recipe(s) {
    if (/utility-cart/.test(s.slug ?? "")) return cart(s);
    return null;
  },
};
export default family;
