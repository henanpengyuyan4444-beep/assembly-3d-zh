import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BOLLPOJKE, read from the desk's manual. The shelf under the top gets its back rail on dowels, then is turned over
 * and hung between the two X-shaped side frames on cam pins and cam locks, with a screw into each end of the rail.
 * That frame is lowered upside down onto the top (cam pins, dowels, cam locks), long screws go up through the side
 * rails and the back rail into the top, and a steel brace on each side runs from the legs' crossing to the shelf.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, ...o });
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 90 x 55, 75 high, 65 cm free under the shelf
  const W = s.size.w * 10 || 900, D = s.size.d * 10 || 550, H = s.size.h * 10 || 750;
  const tt = 25, yTop = H - tt;
  const fw = 45, fx0 = W / 2 - 55; // side frame: width and centre
  const inner = fx0 - fw / 2, outer = fx0 + fw / 2;
  const railH = 70, railY = yTop - railH / 2;
  const legTop = D / 2 - 60, legFoot = D / 2 - 20;
  const legLen = Math.hypot(legTop + legFoot, yTop);
  const legAng = Math.atan2(legTop + legFoot, yTop);
  const crossY = (yTop * legFoot) / (legTop + legFoot);
  const frameH = yTop, frameMid = frameH / 2;
  const sd = D - 80, st = 16, sy = 650; // shelf: depth, thickness, underside
  const backZ = -sd / 2 + 8, backH = yTop - sy - st;
  const sw = 2 * inner;

  const framePieces: PartPiece[] = [
    { shape: "box", size: [fw, railH, 2 * legTop + 30], pos: [0, railY - frameMid, 0] },
    // two legs crossing, each from the top rail's end to the opposite foot
    { shape: "box", size: [fw, legLen, fw], pos: [0, 0, (legFoot - legTop) / 2], rot: [-legAng, 0, 0] },
    { shape: "box", size: [fw, legLen, fw], pos: [0, 0, -(legFoot - legTop) / 2], rot: [legAng, 0, 0] },
  ];
  const frame = (id: string, sx: number): CustomPart => ({
    id,
    name: "Side frame",
    size: [fw, frameH, 2 * legFoot + fw],
    pos: [sx * fx0, frameMid, 0],
    pieces: framePieces,
    material: "wood",
  });
  // brace: from the legs' crossing up and back to the shelf's underside
  const b0: Vec3 = [0, crossY, 0], b1: Vec3 = [0, sy, -sd / 2 + 70];
  const bLen = Math.hypot(b1[1] - b0[1], b1[2] - b0[2]);
  const bAng = Math.atan2(b1[2] - b0[2], b1[1] - b0[1]);
  const bx = inner - 8;
  const brace = (id: string, sx: number): CustomPart => ({
    id,
    name: "Brace",
    size: [10, b1[1] - b0[1], Math.abs(b1[2] - b0[2])],
    pos: [sx * bx, (b0[1] + b1[1]) / 2, (b0[2] + b1[2]) / 2],
    pieces: [{ shape: "box", size: [10, bLen, 18], pos: [0, 0, 0], rot: [bAng, 0, 0] }],
    material: "metal",
  });

  const parts: CustomPart[] = [
    { id: "S", name: "Shelf", size: [sw, st, sd], pos: [0, sy + st / 2, 0], material: "board" },
    { id: "R", name: "Back rail", size: [sw, backH, 16], pos: [0, sy + st + backH / 2, backZ], material: "board" },
    frame("L", -1),
    frame("F", 1),
    { id: "T", name: "Desk top", size: [W, tt, D], pos: [0, yTop + tt / 2, 0], material: "wood" },
    brace("X", -1),
    brace("Y", 1),
  ];
  const sides = [-1, 1];
  const both = (f: (sx: number) => Vec3[]) => sides.flatMap(f);
  const shelfZ = [-sd / 2 + 60, sd / 2 - 60];
  const camZ = [-90, 90];
  const railZ = [-legTop + 40, legTop - 40];

  return {
    parts,
    steps: [
      {
        title: "Tap two dowels into the back rail",
        detail: "Lay it on a rug and tap them into the holes along its bottom edge.",
        fix: [fx("dowel", [-1, 1].map((sx): Vec3 => [sx * sw * 0.3, sy + st, backZ]), { dir: DOWN, on: "R", mate: "S" })],
        wait: ["R"],
        tools: ["hammer"],
        warnings: ["floor"],
      },
      {
        title: "Push the back rail onto the shelf",
        detail: "The notch in the rail is for cables and goes in the middle. Press it down until it sits flat.",
        add: ["S", "R"],
      },
      {
        title: "Tap dowels into the shelf and rail ends",
        detail: "Two in each end of the shelf and one in each end of the rail. Then turn it over.",
        fix: [
          ...sides.map((sx) => fx("dowel", shelfZ.map((z): Vec3 => [sx * inner, sy + st / 2, z]), { dir: [sx, 0, 0], on: "S" })),
          ...sides.map((sx) => fx("dowel", [[sx * inner, sy + st + 15, backZ]], { dir: [sx, 0, 0], on: "R" })),
        ],
        tools: ["hammer"],
      },
      {
        title: "Screw cam pins into both side frames",
        detail: "Two in the inside face of each top rail. Screw them in until they stop.",
        fix: sides.map((sx) => fx("camScrew", camZ.map((z): Vec3 => [sx * inner, sy + st / 2, z]), { dir: [sx, 0, 0], on: sx < 0 ? "L" : "F", mate: "S" })),
        wait: ["L", "F"],
        tools: ["screwdriver"],
        pose: "-y",
      },
      {
        title: "Fit the side frames onto the shelf",
        detail: "Push a frame onto each end, legs pointing up. Put the cam locks in, arrow towards the pin, and turn them clockwise.",
        add: ["L", "F"],
        fix: [fx("cam", both((sx) => camZ.map((z): Vec3 => [sx * (inner - 32), sy, z])), { dir: UP, on: "S", dia: 15 })],
        tools: ["screwdriver"],
      },
      {
        title: "Screw the frames to the back rail",
        detail: "One long screw through each frame into the end of the rail, with the Allen key.",
        fix: sides.map((sx) => fx("screw", [[sx * outer, yTop - 20, backZ]], { dir: [-sx, 0, 0], on: sx < 0 ? "L" : "F", mate: "R", len: 50, dia: 7 })),
        tools: ["allen"],
      },
      {
        title: "Screw cam pins into the desk top",
        detail: "Lay the top face down on a rug and screw four pins into the holes near its ends.",
        fix: [fx("camScrew", both((sx) => railZ.map((z): Vec3 => [sx * fx0, yTop, z])), { dir: UP, on: "T" })],
        wait: ["T"],
        tools: ["screwdriver"],
        warnings: ["floor"],
      },
      {
        title: "Tap a dowel into each side frame",
        detail: "Into the hole in the middle of the top rail's edge.",
        fix: [fx("dowel", sides.map((sx): Vec3 => [sx * fx0, yTop, 0]), { dir: DOWN })],
        tools: ["hammer"],
      },
      {
        title: "Lower the frame onto the desk top",
        detail: "Let the pins and dowels find their holes. Put the cam locks into the top rails and turn them clockwise.",
        add: ["T"],
        fix: sides.map((sx) => fx("cam", railZ.map((z): Vec3 => [sx * inner, yTop - 25, z]), { dir: [sx, 0, 0], on: sx < 0 ? "L" : "F", dia: 15 })),
        tools: ["screwdriver"],
      },
      {
        title: "Screw the frame to the top",
        detail: "Two long screws up through each top rail and two through the shelf and back rail, with the Allen key.",
        fix: [
          fx("screw", both((sx) => [-legTop + 70, legTop - 70].map((z): Vec3 => [sx * fx0, yTop - railH, z])), { dir: UP, mate: "T", len: 90, dia: 6 }),
          fx("screw", [-1, 1].map((sx): Vec3 => [sx * sw * 0.2, sy, backZ]), { dir: UP, on: "S", mate: "T", len: 90, dia: 6 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Bolt a brace to each pair of legs",
        detail: "Push the barrel nut into the legs' crossing from outside and bolt the brace's flat end to it from inside. Not tight yet.",
        add: ["X", "Y"],
        fix: sides.flatMap((sx) => [
          fx("nut", [[sx * outer, crossY, 0]], { dir: [-sx, 0, 0], on: sx < 0 ? "L" : "F", name: "Barrel nut", len: 12, dia: 10 }),
          fx("bolt", [[sx * (bx - 5), crossY, 0]], { dir: [sx, 0, 0], on: sx < 0 ? "X" : "Y", mate: sx < 0 ? "L" : "F", len: 40, dia: 6 }),
        ]),
        tools: ["allen"],
      },
      {
        title: "Screw the braces to the shelf",
        detail: "Two short screws through each brace's plate into the underside of the shelf.",
        fix: [fx("screw", both((sx) => [-12, 12].map((dz): Vec3 => [sx * bx, sy, b1[2] + dz])), { dir: UP, on: "S", len: 12, dia: 4 })],
        tools: ["screwdriver"],
      },
      {
        title: "Tighten the brace bolts",
        detail: "Hold the barrel nut with one Allen key and turn the bolt with the other until the brace sits flat against the leg.",
        tools: ["allen"],
      },
      {
        title: "Press a glide onto each foot, then turn the desk over",
        detail: "Push them into the holes in the leg ends. Lift the desk by the top when you turn it.",
        fix: [fx("glide", both((sx) => [-legFoot, legFoot].map((z): Vec3 => [sx * fx0, 0, z])), { dir: UP, len: 4, dia: 24 })],
      },
      { title: "Stand the desk up", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["BOLLPOJKE"], recipe };
export default family;
