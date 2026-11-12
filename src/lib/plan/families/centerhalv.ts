import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * CENTERHALV, read from the office chair's manual. No tools and no loose screws: the castors click into the upturned
 * base, the gas lift drops into it and the seat (its mechanism already fitted) goes on top. The backrest's thumb screw
 * comes out, the backrest's bar is pushed onto the seat's bracket with the chair on its side until it clicks, and the
 * thumb screw goes back in from below. The armrests, marked L and R, push down into the backrest's sockets.
 */

const arms = [0, 1, 2, 3, 4].map((k) => (k * 2 * Math.PI) / 5 + Math.PI / 2);

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 69 wide, 66 deep, seat 46 to 56 high, 130 at the most; drawn with the seat right down
  const W = s.size.w * 10 || 690;
  const R = 320, hubY = 70, hubH = 60;
  const seatTop = 470, mechY = 350; // underside of the mechanism, top of the gas lift
  const backTop = seatTop + 740;
  const ax = W / 2 - 70; // armrests
  const base: PartPiece[] = [
    { shape: "cyl", size: [90, hubH, 90], pos: [0, 0, 0] },
    ...arms.map((a): PartPiece => ({ shape: "box", size: [R - 40, 36, 50], pos: [(Math.cos(a) * (R + 40)) / 2, -6, (-Math.sin(a) * (R + 40)) / 2], rot: [0, a, 0] })),
    ...arms.map((a): PartPiece => ({ shape: "cyl", size: [40, 30, 40], pos: [Math.cos(a) * (R - 10), -hubH / 2 + 5, -Math.sin(a) * (R - 10)] })),
  ];
  const sMid = (mechY + seatTop) / 2;
  const seat: PartPiece[] = [
    { shape: "box", size: [260, 50, 260], pos: [0, mechY + 25 - sMid, 0] },
    { shape: "box", size: [510, 70, 480], pos: [0, seatTop - 35 - sMid, 30] },
    { shape: "box", size: [110, 14, 30], pos: [190, mechY + 20 - sMid, 60] },
    { shape: "box", size: [80, 40, 130], pos: [0, mechY + 25 - sMid, -190] },
  ];
  const kLo = mechY, kMid = (kLo + backTop) / 2;
  const back: PartPiece[] = [
    // the bar from under the seat, up behind it
    { shape: "box", size: [70, 40, 90], pos: [0, kLo + 25 - kMid, -230] },
    { shape: "box", size: [70, 300, 40], pos: [0, kLo + 150 - kMid, -255] },
    { shape: "box", size: [2 * ax, 40, 40], pos: [0, kLo + 60 - kMid, -270] },
    // the armrest sockets on each side
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [40, 150, 50], pos: [sx * ax, kLo + 75 - kMid, -250] })),
    // the mesh frame
    { shape: "box", size: [500, backTop - seatTop - 120, 40], pos: [0, (seatTop + 120 + backTop) / 2 - kMid, -275], rot: [-0.1, 0, 0] },
  ];
  const sockTop = kLo + 150;
  const armPart = (id: string, sx: number): CustomPart => {
    const lo = sockTop - 40, hi = seatTop + 240;
    const m = (lo + hi) / 2;
    return {
      id,
      name: sx < 0 ? "Left armrest" : "Right armrest",
      size: [80, hi - lo, 280],
      pos: [sx * ax, m, -120],
      material: "metal",
      pieces: [
        { shape: "box", size: [36, hi - lo - 30, 40], pos: [0, -15, -130] },
        { shape: "box", size: [80, 30, 260], pos: [0, (hi - lo) / 2 - 15, 0], material: "soft" },
      ],
    };
  };
  const parts: CustomPart[] = [
    { id: "A", name: "Star base", size: [2 * R, hubH, 2 * R], pos: [0, hubY + hubH / 2 - 10, 0], pieces: base, material: "metal" },
    { id: "G", name: "Gas lift", shape: "cyl", size: [50, mechY - hubY - hubH + 30, 50], pos: [0, (mechY + hubY + hubH - 30) / 2, 0], material: "metal" },
    { id: "S", name: "Seat", size: [510, seatTop - mechY, 480], pos: [0, sMid, 0], pieces: seat, material: "soft" },
    { id: "K", name: "Backrest", size: [2 * ax + 40, backTop - kLo, 120], pos: [0, kMid, -290], pieces: back, material: "metal" },
    armPart("L", -1),
    armPart("R", 1),
  ];
  const castors: Vec3[] = arms.map((a): Vec3 => [Math.cos(a) * (R - 10), hubY - 15, -Math.sin(a) * (R - 10)]);
  return {
    parts,
    steps: [
      {
        title: "Click the castors into the base",
        detail: "Turn the base upside down and press each castor's pin into the end of a leg until it clicks.",
        add: ["A"],
        fix: [{ kind: "castor", count: 5, at: castors, dir: [0, 1, 0], on: "A", len: 55, dia: 50 }],
        pose: "-y",
      },
      { title: "Stand the base up and put the gas lift in", detail: "The narrow end goes up. Drop it into the hole in the middle.", add: ["G"], pose: "+y" },
      { title: "Lower the seat onto the gas lift", detail: "Line the socket under the seat up with the gas lift and press down.", add: ["S"] },
      {
        title: "Take the thumb screw out of the backrest",
        detail: "Lay the backrest face down on a rug and unscrew the knob at the end of its bar by hand. Keep it for later.",
        wait: ["K"],
        warnings: ["floor"],
      },
      {
        title: "Push the backrest onto the seat",
        detail: "Lay the chair on its side on the rug. Slide the bar onto the bracket at the back of the seat until it clicks.",
        add: ["K"],
        pose: "+x",
      },
      {
        title: "Screw the thumb screw back in",
        detail: "Stand the chair up and turn it in from below, through the bracket, by hand until it sits flat.",
        fix: [{ kind: "stud", name: "Thumb screw", count: 1, at: [[0, mechY + 5, -270]], dir: [0, 1, 0], on: "S", mate: "K", len: 25, dia: 8 }],
        pose: "+y",
      },
      {
        title: "Push the armrests in",
        detail: "They are marked L and R. Push each one down into its socket on the backrest until it clicks.",
        add: ["L", "R"],
      },
    ],
  };
}

const family: Family = { names: ["CENTERHALV"], recipe };
export default family;
