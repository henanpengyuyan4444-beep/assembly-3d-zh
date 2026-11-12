import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * GAMLEHULT, read from the footstool's manual. The woven rattan body comes in one piece with a tunnel through it for
 * storage. It is turned upside down on a rug and two bent steel leg frames are bolted to the plates underneath, three
 * Allen bolts each, turned in loosely first and tightened once both frames sit right. Felt pads go on the four feet,
 * then it is turned over.
 */

const TUBE = 20;

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 62 across, 36 high, 14 free under it
  const Dm = Math.round(s.size.w * 10) || 620;
  const H = 360, free = 140;
  const bodyH = H - free;
  const c: Vec3 = [0, free + bodyH / 2, 0];
  const r = Dm / 2;
  const tunnelW = 380, tunnelH = 110;
  const bot = 50, top = bodyH - bot - tunnelH;
  // top and bottom discs, with the woven walls either side of the tunnel drawn as short straight runs round the rim
  const pieces: PartPiece[] = [
    { shape: "cyl", size: [Dm - 40, bot, Dm - 40], pos: [0, -bodyH / 2 + bot / 2, 0] },
    { shape: "cyl", size: [Dm, top, Dm], pos: [0, bodyH / 2 - top / 2, 0] },
  ];
  const wallY = -bodyH / 2 + bot + tunnelH / 2;
  const a0 = Math.acos(tunnelW / 2 / r);
  for (const sx of [-1, 1]) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = -a0 + ((i + 0.5) * 2 * a0) / n; // angle from the x axis
      const seg = 2 * r * Math.sin(a0 / n) + 6;
      const rr = r - 45;
      pieces.push({ shape: "box", size: [80, tunnelH, seg], pos: [sx * rr * Math.cos(a), wallY, rr * Math.sin(a)], rot: [0, -sx * a, 0] });
    }
  }
  const body: CustomPart = { id: "B", name: "Rattan footstool", size: [Dm, bodyH, Dm], pos: c, pieces, material: "wood" };

  // a leg frame: a tube along the depth under the body, bent down into a foot at each end
  const xf = 200, zf = 230, yRun = free - TUBE / 2;
  const frame = (id: string, sx: number): CustomPart => {
    const fc: Vec3 = [sx * xf, free / 2, 0];
    const fp: PartPiece[] = [
      { shape: "cyl", size: [TUBE, 2 * zf, TUBE], pos: [0, yRun - fc[1], 0], rot: [Math.PI / 2, 0, 0] },
      ...[-1, 1].map((sz): PartPiece => ({ shape: "cyl", size: [TUBE, free, TUBE], pos: [0, 0, sz * zf] })),
      ...[-180, 0, 180].map((z): PartPiece => ({ shape: "box", size: [40, 4, 40], pos: [0, free - 2 - fc[1], z] })),
    ];
    return { id, name: "Leg frame", size: [TUBE + 20, free, 2 * zf + TUBE], pos: fc, pieces: fp, material: "metal" };
  };
  const parts: CustomPart[] = [body, frame("L1", -1), frame("L2", 1)];
  const bolts = (id: string, sx: number): CustomFix => ({
    kind: "bolt",
    count: 3,
    len: 16,
    dia: 6,
    at: [-180, 0, 180].map((z): Vec3 => [sx * xf, free - 4, z]),
    dir: [0, 1, 0],
    on: id,
    mate: "B",
  });
  return {
    parts,
    steps: [
      {
        title: "Bolt the first leg frame on",
        detail: "Lay the footstool upside down on a rug. Set a frame on the three plates and turn the bolts in loosely, so the frame can still move.",
        add: ["B", "L1"],
        fix: [bolts("L1", -1)],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Bolt the second leg frame on",
        detail: "The same way on the other side, loosely for now.",
        add: ["L2"],
        fix: [bolts("L2", 1)],
      },
      {
        title: "Tighten all six bolts",
        detail: "Line both frames up so all four feet stand level, then tighten every bolt until its head sits flat on the plate.",
        tools: ["allen"],
      },
      {
        title: "Press a felt pad onto each foot, then turn it over",
        detail: "Peel the pads off the sheet and press one onto the end of each foot.",
        fix: [{ kind: "glide", count: 4, len: 3, dia: 22, name: "Felt pad", at: [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xf, 0, sz * zf])), dir: [0, 1, 0] }],
      },
      { title: "Stand it on its legs", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["GAMLEHULT"],
  recipe(s) {
    return /footstool/i.test(`${s.slug ?? ""} ${s.variant}`) ? recipe(s) : null;
  },
};
export default family;
