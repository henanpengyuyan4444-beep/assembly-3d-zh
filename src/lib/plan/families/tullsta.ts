import type { Family } from "./family";
import type { CustomParams, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TULLSTA, read from the armchair's manual. The padded tub frame lies upside down on a rug and the four tapered
 * legs are screwed in by hand, each through a washer. Stood up, the loose cover is pulled down over the back and
 * the arms, tucked in round the seat and closed at the back. The seat cushion and the small back cushion get their
 * covers and go in. No tools.
 */

/** The tub's plan: a straight front half and a round back, as one box and a half disc (curve at the back). */
const tub = (W: number, zc: number, zf: number, h: number, y: number): PartPiece[] => [
  { shape: "box", size: [W, h, zf - zc], pos: [0, y, (zf + zc) / 2] },
  { shape: "halfcyl", size: [W, h, W / 2], pos: [0, y, zc - W / 4], rot: [0, Math.PI, 0] },
];

/** The arms and the round back wall, from the front edge round the back to the other front edge. */
const walls = (W: number, t: number, zc: number, zf: number, yArm: number, yBack: number, y0: number, ox: number): PartPiece[] => {
  const r = W / 2 - t / 2;
  const out: PartPiece[] = [];
  for (const sx of [-1, 1]) {
    const h = yArm - y0;
    out.push({ shape: "box", size: [t, h, zf - zc], pos: [sx * r, y0 + h / 2 - ox, (zf + zc) / 2] });
  }
  const n = 9, h = yBack - y0;
  const len = 2 * (r + t / 2) * Math.sin(Math.PI / (2 * n)) + 6;
  for (let i = 0; i < n; i++) {
    const th = Math.PI + (Math.PI * (i + 0.5)) / n;
    out.push({ shape: "box", size: [len, h, t], pos: [r * Math.cos(th), y0 + h / 2 - ox, zc + r * Math.sin(th)], rot: [0, Math.PI / 2 - th, 0] });
  }
  return out;
};

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 79 wide, 70 deep, 77 high, seat 45 high
  const W = 790, D = 700, H = 770;
  const zf = D / 2, zc = zf - (D - W / 2); // where the round back starts
  const legH = 100, deck = 330, yArm = 640, t = 110;
  const bodyY = (legH + H) / 2;
  const rel = (pp: PartPiece[]): PartPiece[] => pp.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] - bodyY, p.pos[2]] as Vec3 }));
  const body = rel([...tub(W, zc, zf, deck - legH, (legH + deck) / 2), ...walls(W, t, zc, zf, yArm, H, deck, 0)]);
  // the cover sits a little proud of the frame and its skirt hangs down to just above the floor
  const g = 8, skirt = 30;
  const coverY = (skirt + H + g) / 2;
  const cover = [...tub(W + 2 * g, zc, zf + g, deck - skirt, (skirt + deck) / 2), ...walls(W + 2 * g, t, zc, zf + g, yArm + g, H + g, deck, 0)].map((p) => ({
    ...p,
    pos: [p.pos[0], p.pos[1] - coverY, p.pos[2]] as Vec3,
  }));
  const ci = W - 2 * t - 10; // seat cushion, between the arms
  const cushT = 120;
  const legX = W / 2 - 90, legZ = [zf - 80, zc - 160];
  const legs = legZ.flatMap((z, zi) => [-1, 1].map((sx, xi) => ({ id: `L${zi}${xi}`, name: "Leg", size: [40, legH, 40] as Vec3, pos: [sx * legX, legH / 2, z] as Vec3, shape: "cyl" as const, material: "wood" as const })));
  return {
    parts: [
      { id: "F", name: "Armchair frame", size: [W, H - legH, D], pos: [0, bodyY, 0], material: "soft", pieces: body },
      ...legs,
      { id: "C", name: "Cover", size: [W + 2 * g, H + g - skirt, D + g], pos: [0, coverY, g / 2], material: "soft", pieces: cover },
      {
        id: "S",
        name: "Seat cushion",
        size: [ci, cushT, zf - zc + ci / 2],
        pos: [0, deck + cushT / 2, (zf + zc - ci / 2) / 2],
        material: "soft",
        pieces: tub(ci, zc, zf, cushT, 0).map((p) => ({ ...p, pos: [p.pos[0], 0, p.pos[2] - (zf + zc - ci / 2) / 2] as Vec3 })),
      },
      { id: "B", name: "Back cushion", size: [400, 260, 110], pos: [0, deck + cushT + 135, zc - ci / 2 + 90], rot: [-0.18, 0, 0], material: "soft" },
    ],
    steps: [
      {
        title: "Lay the frame upside down",
        detail: "Put it on a rug or the flattened box so the frame doesn't get scuffed.",
        add: ["F"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw in the legs",
        detail: "Slip a washer onto each leg's bolt and turn it in by hand until it sits tight.",
        add: legs.map((l) => l.id),
        fix: legs.map((l) => ({ kind: "washer" as const, count: 1, at: [[l.pos[0], legH, l.pos[2]] as Vec3], dir: [0, 1, 0] as Vec3, on: l.id, mate: "F", dia: 30 })),
      },
      { title: "Stand the armchair up", detail: "Turn it over onto its legs.", pose: "+y" },
      { title: "Pull the cover over the back", detail: "Inside out at the top first, then pull it down over the back of the frame.", add: ["C"], from: { C: [0, 500, 0] } },
      { title: "Pull it down over the arms", detail: "Work it down on both sides until the seams line up with the frame's edges." },
      { title: "Tuck the cover in round the seat", detail: "Push the loose fabric well down into the gaps between the seat and the arms." },
      { title: "Smooth the seat part flat", detail: "Press it down over the seat deck so it lies without folds." },
      { title: "Close the cover at the back", detail: "Pull the opening together behind the back and close it from the bottom up." },
      {
        title: "Put the seat cushion in",
        detail: "Ease the cover onto the cushion corner by corner, close it, then lay the cushion in with the zip at the back.",
        add: ["S"],
        from: { S: [0, 300, 400] },
      },
      { title: "Add the back cushion", detail: "Cover it the same way and stand it against the back.", add: ["B"], from: { B: [0, 200, 400] } },
    ],
  };
}

const family: Family = {
  names: ["TULLSTA"],
  recipe(s) {
    if (!/armchair/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
