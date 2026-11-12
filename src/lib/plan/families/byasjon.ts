import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BYASJÖN, read from the wash-basin cabinet's manual. The box clicks together with no tools: wall brackets and hinge
 * plates go on the sides first, then, lying on its front, the notched top and bottom click into the sides, the back
 * slides in and is pinned with four expansion plugs, and its notch gets an edge strip. Adjustable feet go into the
 * two steel ladder frames, which are bolted to the sides (tightened with the cabinet upside down). Stood against the
 * wall and levelled, it is fixed to the wall, the shelf goes in on screw-in supports, then the doors and door stops.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, ...o });
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];
const T = 16, TUBE = 20;

/** A board with a notch cut into its back edge (the top, bottom and shelf), as three pieces. */
function notched(w: number, d: number, n: number, nd: number): PartPiece[] {
  const sw = (w - n) / 2;
  return [
    { shape: "box", size: [sw, T, d], pos: [-(n / 2 + sw / 2), 0, 0] },
    { shape: "box", size: [sw, T, d], pos: [n / 2 + sw / 2, 0, 0] },
    { shape: "box", size: [n, T, d - nd], pos: [0, 0, nd / 2] },
  ];
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 66 wide, 36.5 deep, 59 high
  const W = s.size.w * 10 || 660, H = s.size.h * 10 || 590, D = s.size.d * 10 || 365;
  const Wb = W - 2 * TUBE, xo = Wb / 2, xi = xo - T; // box: width, outside and inside of the sides
  const y0 = 150; // underside of the box, the room under it
  const Hb = H - y0;
  const zB = -D / 2, zF = D / 2 - T - 1;
  const Dc = zF - zB, w = 2 * xi;
  const notch = 170, notchD = 110, backNotch = 260;
  const pd = Dc - T, pz = zB + T + pd / 2; // top and bottom, in front of the back
  const shelfY = y0 + Hb * 0.5, shelfD = pd - 30;
  const fx0 = W / 2 - TUBE / 2; // ladder frames
  const legF = zF - 20, legB0 = zB + 10, legB1 = zB + 70;
  const rungs = [y0 + 25, H - 25];
  const mid = H / 2;
  const rod = (a: Vec3, b: Vec3): PartPiece => {
    const len = Math.hypot(b[1] - a[1], b[2] - a[2]);
    return { shape: "cyl", size: [TUBE, len, TUBE], pos: [0, (a[1] + b[1]) / 2 - mid, (a[2] + b[2]) / 2], rot: [Math.atan2(b[2] - a[2], b[1] - a[1]), 0, 0] };
  };
  const backAt = (y: number) => legB0 + ((legB1 - legB0) * y) / H;
  const ladder: PartPiece[] = [
    rod([0, 0, legF], [0, H, legF]),
    rod([0, 0, legB0], [0, H, legB1]),
    ...rungs.map((y): PartPiece => ({ shape: "box", size: [TUBE, TUBE, legF - backAt(y)], pos: [0, y - mid, (legF + backAt(y)) / 2] })),
  ];
  const hb = Hb - 2 * T, sw = (w - notch) / 2;
  const back: PartPiece[] = [
    { shape: "box", size: [sw, hb, T], pos: [-(notch / 2 + sw / 2), 0, 0] },
    { shape: "box", size: [sw, hb, T], pos: [notch / 2 + sw / 2, 0, 0] },
    { shape: "box", size: [notch, hb - backNotch, T], pos: [0, -backNotch / 2, 0] },
  ];
  const parts: CustomPart[] = [
    { id: "SL", name: "Side", size: [T, Hb, Dc], pos: [-xo + T / 2, y0 + Hb / 2, (zB + zF) / 2], material: "board" },
    { id: "SR", name: "Side", size: [T, Hb, Dc], pos: [xo - T / 2, y0 + Hb / 2, (zB + zF) / 2], material: "board" },
    { id: "BT", name: "Top and bottom", size: [w, T, pd], pos: [0, y0 + T / 2, pz], pieces: notched(w, pd, notch, notchD), material: "board" },
    { id: "TP", name: "Top and bottom", size: [w, T, pd], pos: [0, H - T / 2, pz], pieces: notched(w, pd, notch, notchD), material: "board" },
    { id: "BK", name: "Back", size: [w, hb, T], pos: [0, y0 + Hb / 2, zB + T / 2], pieces: back, material: "board" },
    { id: "FL", name: "Leg frame", size: [TUBE, H, legF - legB0 + TUBE], pos: [-fx0, mid, 0], pieces: ladder, material: "metal" },
    { id: "FR", name: "Leg frame", size: [TUBE, H, legF - legB0 + TUBE], pos: [fx0, mid, 0], pieces: ladder, material: "metal" },
    { id: "SH", name: "Shelf", size: [w - 4, T, shelfD], pos: [0, shelfY, zB + T + 5 + shelfD / 2], pieces: notched(w - 4, shelfD, notch, notchD), material: "board" },
    { id: "DL", name: "Door", size: [Wb / 2 - 2, Hb - 4, T], pos: [-Wb / 4, y0 + Hb / 2, zF + T / 2], material: "board" },
    { id: "DR", name: "Door", size: [Wb / 2 - 2, Hb - 4, T], pos: [Wb / 4, y0 + Hb / 2, zF + T / 2], material: "board" },
  ];
  const sides = [-1, 1];
  const sideId = (sx: number) => (sx < 0 ? "SL" : "SR");
  const hingeY = [y0 + 80, H - 80];
  const bracketAt = (sx: number): Vec3 => [sx * xi, H - 60, zB + T + 30];
  const wallAt = (sx: number): Vec3 => [sx * (xi - 50), H - 60, zB];
  const plugs: Vec3[] = sides.flatMap((sx) => [y0 + T + 10, H - T - 10].map((y): Vec3 => [sx * (sw / 2 + notch / 2), y, zB]));
  const feet: Vec3[] = sides.flatMap((sx) => [legF, legB0].map((z): Vec3 => [sx * fx0, 0, z]));
  const bolts = (sx: number): Vec3[] => rungs.flatMap((y) => [-70, 80].map((z): Vec3 => [sx * (fx0 + TUBE / 2), y, z]));

  return {
    parts,
    steps: [
      {
        title: "Screw a wall bracket inside each side",
        detail: "Lay both sides on a rug, inside up. The bracket goes near the top at the back, one screw with a washer.",
        fix: sides.flatMap((sx) => [
          fx("bracket", [bracketAt(sx)], { dir: [sx, 0, 0], on: sideId(sx), len: 60, dia: 40 }),
          fx("washer", [bracketAt(sx)], { dir: [sx, 0, 0], on: sideId(sx), len: 1.5, dia: 16 }),
          fx("screw", [bracketAt(sx)], { dir: [sx, 0, 0], on: sideId(sx), len: 13, dia: 4 }),
        ]),
        wait: ["SL", "SR"],
        tools: ["screwdriver"],
        warnings: ["floor"],
        wall: false,
      },
      {
        title: "Screw the hinge plates onto the sides",
        detail: "Two on each side, near the front edge. Two screws each.",
        fix: sides.flatMap((sx) => [
          fx("plate", hingeY.map((y): Vec3 => [sx * xi, y, zF - 37]), { name: "Mounting plate", dir: [sx, 0, 0], on: sideId(sx), len: 10, dia: 40 }),
          fx("screw", hingeY.flatMap((y) => [-16, 16].map((e): Vec3 => [sx * xi, y + e, zF - 37])), { dir: [sx, 0, 0], on: sideId(sx), len: 14, dia: 4 }),
        ]),
        tools: ["screwdriver"],
      },
      {
        title: "Click the bottom into one side",
        detail: "Lay the side on its front edge. Push the panel's connectors into the side's holes and press until they click.",
        add: ["SL", "BT"],
        pose: "-z",
      },
      { title: "Click the other side on", detail: "Notch towards the back, as on the first side.", add: ["SR"] },
      { title: "Click the top in", detail: "The same panel as the bottom, notch towards the back.", add: ["TP"] },
      { title: "Slide the back in", detail: "Into the grooves in the sides, from the top. Then press it down until it clicks.", add: ["BK"] },
      {
        title: "Pin the back with expansion plugs",
        detail: "Push a sleeve into each corner hole, then press its pin in until it sits flush.",
        fix: [fx("clip", plugs, { name: "Expansion sleeve", dir: [0, 0, 1], on: "BK", len: 20, dia: 8 }), fx("pin", plugs, { name: "Expansion pin", dir: [0, 0, 1], on: "BK", len: 20, dia: 4 })],
      },
      {
        title: "Press the edge strip round the notch",
        detail: "Start at one end and press it along the cut edge of the back, all the way round.",
        fix: [fx("clip", [[0, y0 + Hb - backNotch, zB + T / 2]], { name: "Edge strip", dir: [0, 1, 0], on: "BK", len: 60, dia: 16 })],
      },
      {
        title: "Screw the feet into the leg frames",
        detail: "One adjustable foot in the end of each leg. Turn them all the way in for now.",
        fix: sides.map((sx) => fx("foot", feet.filter((f) => Math.sign(f[0]) === sx), { dir: UP, on: sx < 0 ? "FL" : "FR", len: 30, dia: 30 })),
        wait: ["FL", "FR"],
      },
      {
        title: "Bolt the leg frames to the sides",
        detail: "Stand the box up. Four bolts through the rungs of each frame into the side, only loosely.",
        add: ["FL", "FR"],
        fix: sides.map((sx) => fx("bolt", bolts(sx), { dir: [-sx, 0, 0], on: sx < 0 ? "FL" : "FR", mate: sideId(sx), len: 35, dia: 6 })),
        tools: ["allen"],
        pose: "+y",
      },
      { title: "Turn it upside down and tighten the bolts", detail: "All eight, with the Allen key, until the heads sit flat on the rungs.", tools: ["allen"], pose: "-y" },
      {
        title: "Stand it against the wall and level it",
        detail: "Turn the feet in or out until the top is level both ways.",
        tools: ["level"],
        pose: "+y",
      },
      {
        title: "Fix the brackets to the wall",
        detail: "Mark through the brackets, then plug and screw them to the wall with the second washers. Wall screws aren't included: pick ones made for your wall.",
        fix: [
          fx("plug", sides.map(wallAt), { dir: [0, 0, -1] }),
          fx("washer", sides.map((sx): Vec3 => [wallAt(sx)[0], wallAt(sx)[1], zB + 2]), { dir: [0, 0, -1], len: 1.5, dia: 16 }),
          fx("screw", sides.map((sx): Vec3 => [wallAt(sx)[0], wallAt(sx)[1], zB + 3]), { dir: [0, 0, -1], len: 50, dia: 5 }),
        ],
        tools: ["drill", "screwdriver", "pencil"],
        wall: true,
        warnings: ["wall", "tip"],
      },
      {
        title: "Screw in the shelf supports",
        detail: "Two in each side, all at the same height.",
        fix: sides.map((sx) => fx("pin", [-90, 90].map((z): Vec3 => [sx * xi, shelfY - T / 2 - 6, zB + T + 5 + shelfD / 2 + z]), { name: "Shelf support", dir: [sx, 0, 0], on: sideId(sx), len: 14, dia: 8 })),
        tools: ["screwdriver"],
      },
      {
        title: "Press the edge strip round the shelf's notch",
        detail: "The same way as on the back.",
        fix: [fx("clip", [[0, shelfY, zB + T + 5 + notchD]], { name: "Edge strip", dir: [0, 0, -1], on: "SH", len: 60, dia: 16 })],
        wait: ["SH"],
      },
      { title: "Lay the shelf on the supports", detail: "Notch towards the back.", add: ["SH"] },
      {
        title: "Screw the hinges onto the doors",
        detail: "Lay the doors face down. Cup in its hole, two screws each.",
        fix: sides.flatMap((sx) => {
          const hx = sx * (xi - 22);
          return [
            fx("hinge", hingeY.map((y): Vec3 => [hx, y, zF]), { dir: [0, 0, 1], on: sx < 0 ? "DL" : "DR", len: 50, dia: 35 }),
            fx("screw", hingeY.flatMap((y) => [-22, 22].map((e): Vec3 => [hx - sx * 24, y + e, zF])), { dir: [0, 0, 1], on: sx < 0 ? "DL" : "DR", len: 12, dia: 4 }),
          ];
        }),
        wait: ["DL", "DR"],
        tools: ["screwdriver"],
        warnings: ["face"],
      },
      {
        title: "Hang the doors",
        detail: "Hook each hinge onto its plate at the front and press until it clicks. Turn the hinge screws until the gaps are even.",
        add: ["DL", "DR"],
        tools: ["screwdriver"],
      },
      {
        title: "Press in the door stops",
        detail: "Two, into the holes along the front of the bottom, where the doors meet.",
        fix: [fx("clip", [-40, 40].map((x): Vec3 => [x, y0 + T, zF - 15]), { name: "Door stop", dir: DOWN, on: "BT", len: 12, dia: 24 })],
      },
    ],
  };
}

const family: Family = { names: ["BYASJÖN"], recipe };
export default family;
