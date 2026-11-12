import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * SNIGLAR children's furniture in beech, read from IKEA's manuals.
 *
 * Cot (UK) and crib (US): two barred sides are bolted to one end frame with barrel nuts in the side rails. The base
 * gets an L-shaped support under each corner block, the cot is turned onto that end, the base drops in with its
 * supports in the end's holes (upper holes for a newborn), and the other end goes on top with four more bolts.
 * The crib's supports are flat arms held by a bolt and a sleeve nut, and two screws lock its front side.
 * Bed: the side rails peg into the headboard and footboard and are bolted with barrel nuts; the guard rail gets its
 * post, is bolted to the headboard and the side rail, the spare holes are plugged, two tension wires cross under the
 * base, four slat stops are screwed on and the slatted base is laid in.
 * Changing table: two trays are built standing on edge (dowels, the white bottom slid into the grooves), then laid
 * side by side with the legs across them, two at a time: small dowels, a bolt and a barrel nut at every joint.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const spread = (a: number, c: number, n: number) => range(n).map((i) => (n === 1 ? (a + c) / 2 : a + ((c - a) * i) / (n - 1)));

/** A piece of a part in finished-product mm, before it is made relative to the part. */
interface Bit {
  piece: PartPiece;
  lo: Vec3;
  hi: Vec3;
}
const bx = (lo: Vec3, hi: Vec3, material?: PartMaterial): Bit => ({
  piece: { shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], ...(material ? { material } : {}) },
  lo,
  hi,
});
/** A round bar from a to b (they differ along one axis). */
const bar = (a: Vec3, b: Vec3, dia: number, material?: PartMaterial): Bit => {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const rot: Vec3 | undefined = Math.abs(d[0]) > 0.1 ? [0, 0, Math.PI / 2] : Math.abs(d[2]) > 0.1 ? [Math.PI / 2, 0, 0] : undefined;
  const lo = [0, 1, 2].map((k) => Math.min(a[k], b[k]) - (Math.abs(d[k]) > 0.1 ? 0 : dia / 2)) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(a[k], b[k]) + (Math.abs(d[k]) > 0.1 ? 0 : dia / 2)) as Vec3;
  return { piece: { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], ...(rot ? { rot } : {}), ...(material ? { material } : {}) }, lo, hi };
};
/** One part made of several pieces, its box worked out from them. */
function assemble(id: string, name: string, bits: Bit[], material: PartMaterial, extra?: boolean): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...bits.map((b) => b.lo[k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...bits.map((b) => b.hi[k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  return {
    id,
    name,
    size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
    pos,
    material,
    ...(extra ? { extra } : {}),
    pieces: bits.map((b) => ({ ...b.piece, pos: [b.piece.pos[0] - pos[0], b.piece.pos[1] - pos[1], b.piece.pos[2] - pos[2]] as Vec3 })),
  };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

/* ---------- cot and crib ---------- */

function cot(crib: boolean): CustomParams {
  // IKEA's sizes: the cot is 124 x 66 x 80 cm for a 60 x 120 mattress, the crib 137 x 74 x 84 for 70 x 132
  const L = crib ? 1370 : 1240, W = crib ? 740 : 660, H = crib ? 840 : 800;
  const ml = crib ? 1320 : 1200, mw = crib ? 700 : 600;
  const P = 42, RT = 26, RH = 44, BAR = 22;
  const px = L / 2 - P / 2, pz = W / 2 - P / 2;
  const sideLen = L - 2 * P;
  const topY = H - RH / 2, botY = crib ? 230 : 200; // rail centres, sides and ends alike
  const barLo = botY + RH / 2, barHi = topY - RH / 2;

  const end = (g: number): CustomPart => {
    const x = g * px;
    const inner = W - 2 * P;
    return assemble(`E${g < 0 ? 0 : 1}`, "End frame", [
      bx([x - P / 2, 0, -W / 2], [x + P / 2, H, -W / 2 + P]),
      bx([x - P / 2, 0, W / 2 - P], [x + P / 2, H, W / 2]),
      bx([x - RT / 2, topY - RH / 2, -inner / 2], [x + RT / 2, topY + RH / 2, inner / 2]),
      bx([x - RT / 2, botY - RH / 2, -inner / 2], [x + RT / 2, botY + RH / 2, inner / 2]),
      ...spread(-inner / 2 + 50, inner / 2 - 50, Math.round(inner / 80)).map((z) => bar([x, barLo, z], [x, barHi, z], BAR)),
    ], "wood");
  };
  const side = (g: number): CustomPart => {
    const z = g * pz;
    return assemble(`S${g < 0 ? 0 : 1}`, "Side", [
      bx([-sideLen / 2, topY - RH / 2, z - RT / 2], [sideLen / 2, topY + RH / 2, z + RT / 2]),
      bx([-sideLen / 2, botY - RH / 2, z - RT / 2], [sideLen / 2, botY + RH / 2, z + RT / 2]),
      ...spread(-sideLen / 2 + 45, sideLen / 2 - 45, Math.round(sideLen / 80)).map((x) => bar([x, barLo, z], [x, barHi, z], BAR)),
    ], "wood");
  };

  // the base at its upper height, for a newborn
  const bB = crib ? 360 : 330, bT = bB + 40;
  const xh = sideLen / 2 - 6, zh = pz - RT / 2 - 6;
  const block = 50;
  const base = assemble("B", "Cot base", [
    bx([-xh, bB, -zh], [xh, bT, -zh + 22]),
    bx([-xh, bB, zh - 22], [xh, bT, zh]),
    bx([-xh, bB, -zh + 22], [-xh + 22, bT, zh - 22]),
    bx([xh - 22, bB, -zh + 22], [xh, bT, zh - 22]),
    ...[-1, 1].flatMap((gx) => [-1, 1].map((gz) => bx([gx > 0 ? xh - block : -xh, bB - 10, gz > 0 ? zh - block : -zh], [gx > 0 ? xh : -xh + block, bT - 10, gz > 0 ? zh : -zh + block]))),
    ...spread(-xh + 90, xh - 90, crib ? 10 : 9).map((x) => bx([x - 30, bT - 14, -zh + 22], [x + 30, bT, zh - 22])),
  ], "wood");
  const parts: CustomPart[] = [end(-1), side(-1), side(1), end(1), base, { id: "M", name: "Mattress", size: [ml, 100, mw], pos: [0, bT + 50, 0], material: "soft", extra: true }];

  const BOLT = { len: 100, dia: 6 }, NUT = { name: "Barrel nut", len: 14, dia: 10 };
  const nuts = (g: number): CustomFix[] =>
    [-1, 1].map((gz) => fix("nut", [topY, botY].map((y): Vec3 => [g * (sideLen / 2 - 35), y + RH / 2, gz * pz]), [0, -1, 0], { ...NUT, on: `S${gz < 0 ? 0 : 1}` }));
  const bolts = (g: number): CustomFix =>
    fix("bolt", [-1, 1].flatMap((gz) => [topY, botY].map((y): Vec3 => [g * L / 2, y, gz * pz])), [-g, 0, 0], { ...BOLT, on: `E${g < 0 ? 0 : 1}` });
  const corners = (inset: number, y: number) => [-1, 1].flatMap((gx) => [-1, 1].map((gz): Vec3 => [gx * (xh - inset), y, gz * (zh - inset)]));
  const supports = [-1, 1].map((gx) =>
    fix("pin", [-1, 1].map((gz): Vec3 => [gx * xh, bB, gz * (zh - block / 2)]), [gx, 0, 0], { name: "Base support", len: crib ? 70 : 60, dia: crib ? 12 : 8, on: "B", mate: `E${gx < 0 ? 0 : 1}` }),
  );
  const baseBolts = fix("bolt", corners(block / 2, bT), [0, -1, 0], { len: crib ? 30 : 20, dia: 6, on: "B" });

  const steps: CustomStep[] = [
    {
      title: "Bolt both sides to one end frame",
      detail: "Push a barrel nut into the top of each rail end, slot toward the bolt hole, then turn a long bolt through the end's post into it. Leave them a little loose.",
      add: ["E0", "S0", "S1"],
      fix: [...nuts(-1), bolts(-1)],
      tools: ["allen", "flathead"],
      people: crib ? 2 : 1,
      warnings: crib ? ["two", "floor"] : ["floor"],
    },
    {
      title: "Fit the supports under the base",
      detail: crib
        ? "Corner blocks facing out. A bolt goes down through each block into the support arm and a sleeve nut from below; tighten them with both keys."
        : "Corner blocks facing out. Screw each support up into its block, then lock it with a short bolt from the top.",
      fix: crib ? [baseBolts, ...supports, fix("nut", corners(block / 2, bB - 10), [0, 1, 0], { name: "Sleeve nut", len: 16, dia: 10, on: "B" })] : [...supports, baseBolts],
      tools: ["allen"],
      from: { B: [0, 600, 0] },
      kind: "bolts",
    },
    {
      title: "Turn it onto the end and slide the base in",
      detail: "Two supports go into the holes in the end frame: the upper holes for a newborn, the lower ones once your baby can sit up.",
      pose: "+x",
      kind: "flip",
    },
  ];
  if (crib) {
    steps.push({ title: "Lower the other end frame on", detail: "Guide it onto the rail ends so the last two supports drop into its holes.", add: ["E1"], from: { E1: [300, 0, 0] } });
    steps.push({ title: "Bolt the other end frame on", detail: "Barrel nuts into the rail ends again, then four long bolts. Now tighten all eight.", fix: [...nuts(1), bolts(1)], tools: ["allen", "flathead"] });
    steps.push({
      title: "Stand it up and lock the front side",
      detail: "A sleeve goes into each lower hole from the inside and a screw from the outside. Take them out only to remove this side later.",
      pose: "+y",
      fix: [-1, 1].flatMap((g) => [
        fix("nut", [[g * (L / 2 - P), botY - 34, pz]], [g, 0, 0], { name: "Sleeve", len: 18, dia: 8, on: `E${g < 0 ? 0 : 1}` }),
        fix("screw", [[g * L / 2, botY - 34, pz]], [-g, 0, 0], { len: 16, dia: 4, on: `E${g < 0 ? 0 : 1}` }),
      ]),
      tools: ["screwdriver", "allen"],
    });
  } else {
    steps.push({
      title: "Bolt the other end frame on",
      detail: "Lower it so the last two supports find their holes, push in the barrel nuts and turn in four long bolts. Now tighten all eight.",
      add: ["E1"],
      fix: [...nuts(1), bolts(1)],
      tools: ["allen", "flathead"],
      from: { E1: [300, 0, 0] },
    });
    steps.push({ title: "Stand the cot up", detail: "Lift it by the end frames, not the sides.", pose: "+y" });
  }
  steps.push({ title: "Lay the mattress in", detail: "It should fit snugly, with no gap wider than two fingers at the sides.", add: ["M"] });
  return { parts, steps };
}

/* ---------- bed with guard rail ---------- */

function bed(): CustomParams {
  // IKEA's sizes: 165 x 77 cm for a 70 x 160 mattress, headboard 57 cm, footboard 36, 22 cm free under the frame
  const L = 1650, W = 770, HH = 570, FH = 360, ml = 1600, mw = 700;
  const P = 42, T = 22;
  const r0 = 220, r1 = 340; // side rails, bottom and top
  const zH = -L / 2 + P / 2, zF = L / 2 - P / 2;
  const xR = W / 2 - T / 2;
  const railLen = L - 2 * P;
  const endOf = (id: string, name: string, h: number, z: number): CustomPart => {
    // rails and panel sit flush with the outer face of the posts, so the mattress fits between them
    const zp = z + Math.sign(z) * (P / 2 - 13);
    const zl = zp - 13, zr = zp + 13;
    return assemble(id, name, [
      bx([-W / 2, 0, z - P / 2], [-W / 2 + P, h - 30, z + P / 2]),
      bx([W / 2 - P, 0, z - P / 2], [W / 2, h - 30, z + P / 2]),
      bx([-W / 2 - 5, h - 30, z - 32], [W / 2 + 5, h, z + 32]),
      bx([-W / 2 + P, r0, zl], [W / 2 - P, h === HH ? r1 : 300, zr]),
      bx([-W / 2 + P, h === HH ? r1 : 300, zp - 7], [W / 2 - P, h - 30, zp + 7], "board"),
    ], "wood");
  };
  const rail = (g: number): CustomPart =>
    assemble(`R${g < 0 ? 0 : 1}`, "Side rail", [
      bx([g * xR - T / 2, r0, -railLen / 2], [g * xR + T / 2, r1, railLen / 2]),
      // the ledge the slats lie on
      bx(g < 0 ? [-W / 2 + T, 262, -railLen / 2] : [W / 2 - T - 20, 262, -railLen / 2], g < 0 ? [-W / 2 + T + 20, 285, railLen / 2] : [W / 2 - T, 285, railLen / 2]),
    ], "wood");
  const grLen = 820, g0z = -L / 2 + P, g1z = g0z + grLen;
  const gy0 = 440, gy1 = 530;
  const postZ = g1z - 50;
  const nS = 17, baseLen = railLen - 20;
  const wa = xR, wb = railLen / 2 - 100, wl = Math.hypot(2 * wa, 2 * wb), wt = Math.atan2(wb, wa);
  const wire = (t: number): Bit => ({ piece: { shape: "box", size: [wl, 3, 3], pos: [0, r0 - 2, 0], rot: [0, t, 0] }, lo: [-wa, r0 - 4, -wb], hi: [wa, r0, wb] });
  const parts: CustomPart[] = [
    endOf("E", "Headboard", HH, zH),
    endOf("G", "Footboard", FH, zF),
    rail(-1),
    rail(1),
    { id: "GR", name: "Guard rail", size: [T, gy1 - gy0, grLen], pos: [xR, (gy0 + gy1) / 2, (g0z + g1z) / 2], material: "wood" },
    { id: "GP", name: "Guard rail post", size: [30, gy0 - r1, 30], pos: [xR, (gy0 + r1) / 2, postZ], shape: "cyl", material: "wood" },
    assemble("X", "Tension wire", [wire(wt), wire(-wt)], "metal"),
    assemble("S", "Slatted bed base", [
      ...spread(-baseLen / 2 + 70, baseLen / 2 - 70, nS).map((z) => bx([-(W / 2 - T - 8), 285, z - 30], [W / 2 - T - 8, 294, z + 30])),
      bx([-(W / 2 - T - 60), 281, -baseLen / 2], [-(W / 2 - T - 90), 285, baseLen / 2], "fiber"),
      bx([W / 2 - T - 90, 281, -baseLen / 2], [W / 2 - T - 60, 285, baseLen / 2], "fiber"),
    ], "wood"),
    { id: "M", name: "Mattress", size: [mw, 100, ml], pos: [0, 294 + 50, 0], material: "soft", extra: true },
  ];

  const LONG = { len: 100, dia: 6 }, NUT = { name: "Barrel nut", len: 14, dia: 10 };
  const BOLT = { name: "Connector bolt", len: 15, dia: 6 }, SLEEVE = { name: "Sleeve nut", len: 20, dia: 10 };
  const sides = [-1, 1];
  const ry = (r0 + r1) / 2;
  const steps: CustomStep[] = [
    {
      title: "Push the side rails into both ends",
      detail: "Two of you. The pegs on the rail ends go into the holes in the posts, the ledges facing in.",
      add: ["E", "R0", "R1", "G"],
      people: 2,
      warnings: ["two", "floor"],
      from: { G: [0, 0, 300] },
    },
    {
      title: "Bolt the side rails to both ends",
      detail: "A barrel nut into each rail end, slot toward the bolt, then a long bolt through each post. Tighten them once all four are in.",
      fix: [
        ...sides.map((g) => fix("nut", [-1, 1].map((e): Vec3 => [g * xR, r1, e * (railLen / 2 - 40)]), [0, -1, 0], { ...NUT, on: `R${g < 0 ? 0 : 1}` })),
        fix("bolt", sides.map((g): Vec3 => [g * xR, ry, -L / 2]), [0, 0, 1], { ...LONG, on: "E" }),
        fix("bolt", sides.map((g): Vec3 => [g * xR, ry, L / 2]), [0, 0, -1], { ...LONG, on: "G" }),
      ],
      tools: ["allen", "flathead"],
    },
    {
      title: "Fit the post to the guard rail",
      detail: "The post goes into the hole under the far end, its holes facing the ends. A sleeve nut from below and a bolt from the top hold it.",
      add: ["GR", "GP"],
      fix: [fix("bolt", [[xR, gy1, postZ]], [0, -1, 0], { ...BOLT, on: "GR", mate: "GP" }), fix("nut", [[xR, r1 + 10, postZ]], [0, 1, 0], { ...SLEEVE, on: "GP" })],
      tools: ["allen"],
      from: { GR: [0, 400, 0], GP: [0, 400, 0] },
    },
    {
      title: "Bolt the guard rail to the headboard",
      detail: "Set the post in the hole in the side rail. Drop the long barrel nut into the guard rail's end and turn a long bolt through the headboard post into it.",
      fix: [fix("nut", [[xR, gy1, g0z + 30]], [0, -1, 0], { name: "Long barrel nut", len: 60, dia: 10, on: "GR" }), fix("bolt", [[xR, (gy0 + gy1) / 2, -L / 2]], [0, 0, 1], { ...LONG, on: "E", mate: "GR" })],
      tools: ["allen", "flathead"],
    },
    {
      title: "Bolt the post to the side rail",
      detail: "Sleeve nut in from the inside, bolt from the outside, through the rail and the foot of the post.",
      fix: [fix("bolt", [[W / 2, r1 - 30, postZ]], [-1, 0, 0], { ...BOLT, on: "R1", mate: "GP" }), fix("nut", [[W / 2 - T, r1 - 30, postZ]], [1, 0, 0], { ...SLEEVE, on: "R1" })],
      tools: ["allen"],
    },
    {
      title: "Plug the spare hole in the headboard",
      detail: "A sleeve nut and a bolt fill the hole a guard rail would use on that side.",
      fix: [fix("bolt", [[-xR, (gy0 + gy1) / 2, -L / 2]], [0, 0, 1], { ...BOLT, on: "E" }), fix("nut", [[-xR, (gy0 + gy1) / 2, -L / 2 + P]], [0, 0, -1], { ...SLEEVE, on: "E" })],
      tools: ["allen"],
    },
    {
      title: "Lock the fitting in the side rail",
      detail: "Drop the slotted fitting into the hole in the top of the rail, then a sleeve nut and a bolt through it from both sides.",
      fix: [
        fix("clip", [[xR, r1, g0z + 90]], [0, -1, 0], { name: "Slotted fitting", len: 30, dia: 12, on: "R1" }),
        fix("bolt", [[W / 2, ry, g0z + 90]], [-1, 0, 0], { ...BOLT, on: "R1" }),
        fix("nut", [[W / 2 - T, ry, g0z + 90]], [1, 0, 0], { ...SLEEVE, on: "R1" }),
      ],
      tools: ["allen"],
    },
    {
      title: "Screw the tension wires under the frame",
      detail: "They cross from corner to corner under the side rails. One screw holds each end; pull them taut so the frame stays square.",
      add: ["X"],
      fix: [fix("screw", sides.flatMap((g) => [-1, 1].map((e): Vec3 => [g * wa, r0 - 4, e * wb])), [0, 1, 0], { len: 16, dia: 4 })],
      tools: ["screwdriver"],
      check: "square",
      from: { X: [0, -200, 0] },
    },
    {
      title: "Screw on the four slat stops",
      detail: "One at each end of both ledges, screwed up from below.",
      fix: [
        fix("clip", sides.flatMap((g) => [-1, 1].map((e): Vec3 => [g * (W / 2 - T - 10), 285, e * (railLen / 2 - 12)])), [0, -1, 0], { name: "Slat stop", len: 22, dia: 20 }),
        fix("screw", sides.flatMap((g) => [-1, 1].map((e): Vec3 => [g * (W / 2 - T - 10), 262, e * (railLen / 2 - 12)])), [0, 1, 0], { len: 30, dia: 4 }),
      ],
      tools: ["screwdriver"],
    },
    { title: "Lay the slatted base in", detail: "Unroll it on the ledges between the stops, the straps facing down.", add: ["S"], from: { S: [0, 300, 0] }, kind: "slats" },
    { title: "Lay the mattress on", add: ["M"] },
  ];
  return { parts, steps };
}

/* ---------- changing table ---------- */

function changing(): CustomParams {
  // 72 cm wide, 53 deep, 87 high; legs bolted through to the tray ends
  const W = 720, D = 530, H = 870, LG = 42, BT = 18, RH = 70;
  const xe = W / 2 - LG / 2; // tray ends, in line with the legs
  const ze = D / 2 - LG; // where the legs start
  const xr = xe - BT / 2; // long boards end at the ends' inner faces
  const zr = ze - BT / 2;
  const trays = [
    { k: 0, y1: H, y0: H - RH }, // top
    { k: 1, y1: 330, y0: 330 - RH },
  ];
  const parts: CustomPart[] = [];
  for (const t of trays) {
    const yc = (t.y0 + t.y1) / 2;
    parts.push({ id: `B${t.k}`, name: "Long board", size: [2 * xr, RH, BT], pos: [0, yc, -zr], material: "wood" });
    parts.push({ id: `F${t.k}`, name: "Long board", size: [2 * xr, RH, BT], pos: [0, yc, zr], material: "wood" });
    for (const g of [-1, 1]) parts.push({ id: `N${t.k}${g < 0 ? 0 : 1}`, name: "Short board", size: [BT, RH, 2 * ze], pos: [g * xe, yc, 0], material: "wood" });
    parts.push({ id: `P${t.k}`, name: "Tray bottom", size: [2 * xr + 10, 6, 2 * (zr - BT / 2) + 10], pos: [0, t.y0 + 14, 0], material: "fiber" });
  }
  const legs = [-1, 1].flatMap((gz) => [-1, 1].map((gx) => ({ id: `L${gz < 0 ? "b" : "f"}${gx < 0 ? 0 : 1}`, gx, gz })));
  for (const l of legs) parts.push({ id: l.id, name: "Leg", size: [LG, H, LG], pos: [l.gx * xe, H / 2, l.gz * (D / 2 - LG / 2)], material: "wood" });

  const ids = (p: string) => trays.map((t) => `${p}${t.k}`);
  const yc = (t: (typeof trays)[number]) => (t.y0 + t.y1) / 2;
  const BIG = { len: 30, dia: 8 }, SMALL = { len: 25, dia: 6 };
  // dowels in both ends of a long board, going into the short boards
  const boardDowels = (id: string, z: number): CustomFix[] => {
    const t = trays[Number(id.slice(1))];
    return [-1, 1].map((g) => fix("dowel", [-12, 12].map((dy): Vec3 => [g * xr, yc(t) + dy, z]), [g, 0, 0], { ...BIG, on: id }));
  };
  const legJoints = (gz: number) => legs.filter((l) => l.gz === gz).flatMap((l) => trays.map((t) => ({ l, t })));
  const legDowels = (gz: number): CustomFix[] =>
    legJoints(gz).map(({ l, t }) => fix("dowel", [-18, 18].map((dy): Vec3 => [l.gx * xe, yc(t) + dy, gz * ze]), [0, 0, -gz], { ...SMALL, on: `N${t.k}${l.gx < 0 ? 0 : 1}`, mate: l.id }));
  const legBolts = (gz: number): CustomFix[] => [
    fix("bolt", legJoints(gz).map(({ l, t }): Vec3 => [l.gx * xe, yc(t), gz * (D / 2)]), [0, 0, -gz], { len: 70, dia: 6 }),
    ...legJoints(gz).map(({ l, t }) => fix("nut", [[l.gx * (xe - BT / 2), yc(t), gz * (ze - 35)]], [l.gx, 0, 0], { name: "Barrel nut", len: 14, dia: 10, on: `N${t.k}${l.gx < 0 ? 0 : 1}` })),
  ];
  const steps: CustomStep[] = [
    {
      title: "Tap the dowels into the long boards",
      detail: "On a rug, two big dowels in each end. Build both trays the same way.",
      fix: trays.flatMap((t) => boardDowels(`B${t.k}`, -zr)),
      tools: ["hammer"],
      pose: "+z",
      warnings: ["floor"],
      repeat: 2,
    },
    {
      title: "Push the short boards onto the dowels",
      detail: "Stand them up on the ends of the long board, grooves facing in, and check the big dowels in their tops.",
      add: trays.flatMap((t) => [`N${t.k}0`, `N${t.k}1`]),
      repeat: 2,
    },
    { title: "Slide the tray bottom into the grooves", detail: "White side up in the finished tray. Push it all the way down.", add: ids("P"), from: Object.fromEntries(ids("P").map((id) => [id, [0, 0, 500] as Vec3])), repeat: 2 },
    {
      title: "Press the other long board on",
      detail: "Big dowels into its ends first, then press it onto the short boards so the bottom sits in its groove.",
      add: ids("F"),
      fix: trays.flatMap((t) => boardDowels(`F${t.k}`, zr)),
      tools: ["hammer"],
      repeat: 2,
    },
    {
      title: "Lay two legs across the trays",
      detail: "Stand both trays on edge side by side. Small dowels into the short boards, then the legs onto them.",
      add: legs.filter((l) => l.gz > 0).map((l) => l.id),
      fix: legDowels(1),
      tools: ["hammer"],
    },
    { title: "Bolt the legs to the trays", detail: "A barrel nut into each short board, slot toward the bolt, then a bolt through the leg.", fix: legBolts(1), tools: ["allen", "flathead"] },
    { title: "Turn it over", detail: "Onto the legs you just fitted, on the rug.", pose: "-z" },
    { title: "Lay the other two legs on", detail: "Small dowels into the short boards first.", add: legs.filter((l) => l.gz < 0).map((l) => l.id), fix: legDowels(-1), tools: ["hammer"] },
    { title: "Bolt the other two legs on", detail: "Barrel nuts and bolts as before. Tighten all eight.", fix: legBolts(-1), tools: ["allen", "flathead"] },
    { title: "Stand it up", detail: "Check it stands steady on all four legs.", pose: "+y" },
  ];
  return { parts, steps };
}

function recipe(s: ProductSpec): CustomParams | null {
  const slug = s.slug ?? "";
  if (/sniglar-cot-/.test(slug)) return cot(false);
  if (/sniglar-crib-/.test(slug)) return cot(true);
  if (/sniglar-bed-frame/.test(slug)) return bed();
  if (/sniglar-changing-table/.test(slug)) return changing();
  return null;
}

const family: Family = {
  names: ["SNIGLAR"],
  recipe,
};
export default family;
