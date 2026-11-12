import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * ODGER, read from the dining chair's manual. No tools and no fittings: the leg frame comes in one piece, the shell's
 * front hooks over the front of the frame and its back is pressed down onto it. Upside down on a rug, two locking
 * levers (marked I and O) go into their holes under the seat and are turned until each one clicks.
 */

const LEG = 34, RAIL = 26;

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: CustomPart["material"]): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

/** A square leg from a (on the floor) to b, leaning both ways. */
function leg(a: Vec3, b: Vec3): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "box", size: [LEG, len, LEG], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))] };
}

function chair(s: ProductSpec): CustomParams {
  // IKEA: 45 wide, 51 deep, 81 high, seat 43 high and 41 deep
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const seatTop = 430, shellT = 22, frameTop = seatTop - shellT;
  const xt = 150, zt0 = -110, zt1 = 150; // tops of the legs
  const xf = W / 2 - LEG / 2 - 4, zF = D / 2 - LEG / 2 - 4, zB = -D / 2 + LEG / 2 + 4; // feet
  const yR = frameTop - RAIL / 2;
  const frameAbs: PartPiece[] = [
    leg([-xf, 0, zF], [-xt, frameTop, zt1]),
    leg([xf, 0, zF], [xt, frameTop, zt1]),
    leg([-xf, 0, zB], [-xt, frameTop, zt0]),
    leg([xf, 0, zB], [xt, frameTop, zt0]),
    { shape: "box", size: [2 * xt, RAIL, RAIL], pos: [0, yR, zt1] },
    { shape: "box", size: [2 * xt, RAIL, RAIL], pos: [0, yR, zt0] },
    { shape: "box", size: [RAIL, RAIL, zt1 - zt0], pos: [-xt, yR, (zt0 + zt1) / 2] },
    { shape: "box", size: [RAIL, RAIL, zt1 - zt0], pos: [xt, yR, (zt0 + zt1) / 2] },
  ];
  // the shell: a seat, a rounded bend at the back and the back rising and leaning back
  const sz0 = -150, sz1 = D / 2 - 30;
  const bendZ = sz0 - 30, lean = 70;
  const backLen = Math.hypot(H - seatTop - 30, lean), ang = Math.atan2(lean, H - seatTop - 30);
  const shellAbs: PartPiece[] = [
    { shape: "box", size: [W - 10, shellT, sz1 - sz0], pos: [0, frameTop + shellT / 2, (sz0 + sz1) / 2] },
    { shape: "box", size: [W - 30, 80, shellT], pos: [0, frameTop + 38, sz0 - 18], rot: [-0.62, 0, 0] },
    { shape: "box", size: [W - 40, backLen, shellT], pos: [0, (seatTop + 30 + H) / 2, bendZ - lean / 2], rot: [-ang, 0, 0] },
  ];
  const parts: CustomPart[] = [
    part("FRAME", "Leg frame", frameAbs, [-W / 2, 0, -D / 2], [W / 2, frameTop, D / 2], "board"),
    part("SHELL", "Seat shell", shellAbs, [-W / 2 + 5, frameTop, bendZ - lean - 25], [W / 2 - 5, H, sz1], "board"),
    { id: "LEV_I", label: "I", name: "Locking lever", size: [22, 24, 80], pos: [-70, frameTop - 12, -40], material: "board" },
    { id: "LEV_O", label: "O", name: "Locking lever", size: [22, 24, 80], pos: [70, frameTop - 12, -40], material: "board" },
  ];
  return {
    parts,
    steps: [
      {
        title: "Hook the front of the shell onto the frame",
        detail: "Stand the leg frame on its feet. Tip the shell forward and hook the teeth under its front edge over the frame's front rail.",
        add: ["FRAME", "SHELL"],
        from: { SHELL: [0, 260, 120] },
      },
      { title: "Press the back of the shell down", detail: "Push down at the back of the seat until it rests flat on the frame all round." },
      {
        title: "Push in the two locking levers",
        detail: "Lay the chair upside down on a rug. Match the letters I and O to the marks under the seat, and push each lever into its hole as far as it goes.",
        add: ["LEV_I", "LEV_O"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Turn the first lever until it clicks", detail: "Swing it round flat against the seat. The click means the shell is locked to the frame." },
      { title: "Turn the second lever until it clicks", detail: "The same way on the other side, then stand the chair up." },
    ],
  };
}

const family: Family = {
  names: ["ODGER"],
  recipe: (s) => (/chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair(s) : null),
};
export default family;
