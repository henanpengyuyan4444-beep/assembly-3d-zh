import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec } from "../../types";

/**
 * BURVIK, read from the side table's manual. No fittings and no tools: with the tray upside down, two legs screw
 * straight into its underside by their threaded tips. Then, with the tray on its side, the handle's two ends push down
 * through it and the other two legs screw onto them, which holds the handle in.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 38 across, 45 high, 78 to the top of the handle
  const Dm = s.size.w * 10 || 380, H = s.size.h * 10 || 450;
  const top = 780, rim = 45, ty = H - rim;
  const lr = Dm / 2 - 45, leg = 16;
  const hx = lr; // the handle's ends go through the tray where two legs meet it
  const bend = 640, peak = top - 10, inner = 55;
  const slant = Math.hypot(hx - inner, peak - bend), ang = Math.atan2(hx - inner, peak - bend);
  const hMid = (ty + top) / 2;
  const handle: PartPiece[] = [
    ...[-1, 1].map((sx): PartPiece => ({ shape: "cyl", size: [leg, bend - ty, leg], pos: [sx * hx, (ty + bend) / 2 - hMid, 0] })),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "cyl", size: [leg, slant, leg], pos: [(sx * (hx + inner)) / 2, (bend + peak) / 2 - hMid, 0], rot: [0, 0, sx * ang] })),
    { shape: "cyl", size: [leg, 2 * inner, leg], pos: [0, peak - hMid, 0], rot: [0, 0, Math.PI / 2] },
  ];
  const legPart = (id: string, x: number, z: number): CustomPart => ({ id, name: "Leg", shape: "cyl", size: [leg, ty, leg], pos: [x, ty / 2, z], material: "metal" });
  const parts: CustomPart[] = [
    { id: "T", name: "Tray", shape: "cyl", size: [Dm, rim, Dm], pos: [0, ty + rim / 2, 0], material: "wood" },
    legPart("L1", 0, -lr),
    legPart("L2", 0, lr),
    { id: "U", name: "Handle", size: [2 * hx + leg, top - ty, leg], pos: [0, hMid, 0], pieces: handle, material: "metal" },
    legPart("L3", -hx, 0),
    legPart("L4", hx, 0),
  ];
  return {
    parts,
    steps: [
      {
        title: "Screw two legs into the tray",
        detail: "Lay the tray upside down on a rug. Screw the legs with a threaded tip into the two holes away from the handle's holes, by hand.",
        add: ["T", "L1", "L2"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Fit the handle and the last two legs",
        detail: "Lay the tray on its side. Push the handle's ends through the tray from the top, then screw a leg onto each end until it's tight.",
        add: ["U", "L3", "L4"],
        pose: "+x",
      },
      { title: "Stand the table up", detail: "It rests on all four legs and lifts by the handle.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["BURVIK"], recipe };
export default family;
