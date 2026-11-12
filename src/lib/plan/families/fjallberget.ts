import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * FJÄLLBERGET conference chair, read from its manual. Four Allen screws in all: the tilt mechanism is screwed under
 * the upside-down seat, the gas column is pushed into the four-star base, and the seat is pressed down onto the
 * column. The lever under the seat sets the height.
 * IKEA: 67 x 67 cm, 86 cm high at most, seat 42 x 40 cm at 43 to 56 cm.
 */

function chair(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 670, H = Math.round(s.size.h * 10) || 860;
  const R = W / 2, hubY = 110, colTop = 380; // star base reach, hub height, top of the column
  const mechY = colTop, mechT = 30, seatY = mechY + mechT; // underside of the seat
  const hub = 60;

  const legs: PartPiece[] = [{ shape: "cyl", size: [hub, 90, hub], pos: [0, hubY - 45 - hubY / 2, 0] }];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, r = R - 30;
    const ex = Math.cos(a) * r, ez = Math.sin(a) * r;
    const L = Math.hypot(r, hubY - 25), tilt = Math.atan2(hubY - 25, r);
    // each arm runs down and out from the hub to a glide
    legs.push({ shape: "box", size: [L, 24, 50], pos: [ex / 2, (hubY + 25) / 2 - hubY / 2 - 20, ez / 2], rot: [0, -a, -tilt] });
    legs.push({ shape: "cyl", size: [40, 14, 40], pos: [ex, 7 - hubY / 2, ez] });
  }
  const c: Vec3 = [0, (seatY + H) / 2, 0];
  // the seat pad, then the bent veneer back: panels round a half circle, tall at the back and low at the arms, with a
  // window low in the middle of the back, and the arms running a little forward at each side
  const shell: PartPiece[] = [{ shape: "cyl", size: [440, 45, 420], pos: [0, seatY + 22 - c[1], 20], material: "soft" }];
  const Rb = 245, armTop = seatY + 230, low = seatY + 30, n = 7;
  const panel = (y0: number, y1: number, x: number, z: number, w: number, phi: number): PartPiece => ({ shape: "box", size: [w, y1 - y0, 14], pos: [x, (y0 + y1) / 2 - c[1], z], rot: [0, phi, 0] });
  for (let i = 0; i < n; i++) {
    const th = (Math.PI * (i + 0.5)) / n, w = 2 * Rb * Math.sin(Math.PI / n / 2) + 4;
    const x = Rb * Math.cos(th), z = -Rb * Math.sin(th) + 30, top = Math.sin(th) > 0.75 ? H : Math.sin(th) > 0.5 ? (H + armTop) / 2 + 40 : armTop;
    if (Math.sin(th) > 0.75) shell.push(panel(low, low + 50, x, z, w, th - Math.PI / 2), panel(seatY + 170, top, x, z, w, th - Math.PI / 2));
    else shell.push(panel(low, top, x, z, w, th - Math.PI / 2));
  }
  for (const sx of [-1, 1]) shell.push({ shape: "box", size: [14, armTop - low - 30, 130], pos: [sx * Rb, (low + armTop - 30) / 2 - c[1], 30 + 65], rot: [0, 0, 0] });
  const parts: CustomPart[] = [
    { id: "SE", name: "Seat shell", size: [500, H - seatY, 500], pos: c, material: "wood", pieces: shell },
    {
      id: "ME",
      name: "Tilt mechanism",
      size: [220, mechT, 200],
      pos: [0, mechY + mechT / 2, 0],
      material: "metal",
      pieces: [
        { shape: "box", size: [200, 6, 180], pos: [0, mechT / 2 - 3, 0] },
        { shape: "cyl", size: [60, mechT, 60], pos: [0, 0, 0] },
        { shape: "box", size: [160, 8, 12], pos: [150, 0, 40], rot: [0, -0.3, 0] },
      ],
    },
    { id: "BA", name: "Star base", size: [W, hubY, W], pos: [0, hubY / 2, 0], material: "metal", pieces: legs },
    { id: "CO", name: "Gas column", shape: "cyl", size: [50, colTop - hubY + 60, 50], pos: [0, (colTop + hubY - 60) / 2, 0], material: "metal" },
  ];
  const screwAt: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * 80, mechY + mechT - 6, sz * 70]));

  return {
    parts,
    steps: [
      {
        title: "Screw the mechanism under the seat",
        detail: "Lay the seat upside down on a rug. The lever points to the right-hand side of the seat; four screws, tight with the Allen key.",
        wait: ["SE", "ME"],
        fix: [{ kind: "bolt", name: "Screw", count: 4, len: 12, dia: 6, at: screwAt, dir: [0, 1, 0], on: "ME", mate: "SE" }],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Push the gas column into the base",
        detail: "Stand the base on its feet and push the narrow end of the column into the hole in the middle until it stops.",
        add: ["BA", "CO"],
        pose: "+y",
      },
      {
        title: "Press the seat down onto the column",
        detail: "Turn the seat over and lower it so the column goes into the socket under the mechanism, then sit on it once to press it home. The lever lifts and lowers the seat.",
        add: ["SE", "ME"],
        from: { SE: [0, 400, 0], ME: [0, 400, 0] },
        warnings: ["hand"],
      },
    ],
  };
}

const family: Family = {
  names: ["FJÄLLBERGET", "FJALLBERGET"],
  recipe(s) {
    if (/^fjallberget-conference-chair/.test(s.slug ?? "")) return chair(s);
    return null;
  },
};
export default family;
