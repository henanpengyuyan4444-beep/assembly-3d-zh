import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/**
 * LEDAMOT, read from the cabinet's manual. Five bays behind the front: one door, a double bay with two doors, an open
 * wood-look niche with its own ceiling, and one more door. The top lies upside down for the four push opener plates,
 * then stands on its front edge and everything clicks onto it on pre-fitted clips: the first divider, the niche
 * (its two walls take screw-on connectors and are joined by the niche ceiling first), both sides, and the bottom.
 * Lying on its front, six bolts go through the bottom into the dividers, the four backs slide in and are riveted,
 * the wall brackets go on the top, and five legs are screwed onto studs with levelling bolts in their ends. Two people
 * stand it up; it is pushed to the wall, levelled with the spanner and screwed to the wall through the brackets.
 * Then the shelf pins and four shelves, the push openers, and the four doors on two hinges each.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string | undefined, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 150.2 x 74.8 x 42.2 cm, 12.9 cm free under it
  const W = Math.abs(s.size.w - 150) < 2 ? 1502 : s.size.w * 10;
  const H = Math.abs(s.size.h - 75) < 2 ? 748 : s.size.h * 10;
  const D = Math.abs(s.size.d - 42) < 2 ? 422 : s.size.d * 10;
  const T = 18, legH = 129, back = 3, doorT = 18;
  const yB = legH, yT = H - T; // bottom of the carcass, underside of the top
  const z0 = -D / 2 + back, z1 = D / 2 - doorT; // carcass, back to front
  const zc = (z0 + z1) / 2, dc = z1 - z0;
  const bay = W / 5;
  const bx = (k: number) => -W / 2 + k * bay; // bay boundaries
  const xs = W / 2 - T / 2;
  const colH = yT - (yB + T);
  const yCol = (yB + T + yT) / 2;
  const parts: CustomPart[] = [
    { id: "TOP", name: "Top", size: [W, T, D], pos: [0, H - T / 2, 0] },
    { id: "BOT", name: "Bottom", size: [W - 2 * T, T, dc], pos: [0, yB + T / 2, zc] },
    { id: "SL", name: "Side", size: [T, yT - yB, dc], pos: [-xs, (yB + yT) / 2, zc] },
    { id: "SR", name: "Side", size: [T, yT - yB, dc], pos: [xs, (yB + yT) / 2, zc] },
    { id: "DV", name: "Divider", size: [T, colH, dc], pos: [bx(1), yCol, zc] },
    { id: "NW1", name: "Niche wall", size: [T, colH, dc], pos: [bx(3), yCol, zc], material: "wood" },
    { id: "NW2", name: "Niche wall", size: [T, colH, dc], pos: [bx(4), yCol, zc], material: "wood" },
    { id: "NC", name: "Niche ceiling", size: [bay - T, T, dc], pos: [(bx(3) + bx(4)) / 2, yT - T / 2, zc], material: "wood" },
  ];
  // backs, one per bay (the double bay has one wide one)
  const spans: [number, number][] = [
    [-W / 2, bx(1)],
    [bx(1), bx(3)],
    [bx(3), bx(4)],
    [bx(4), W / 2],
  ];
  spans.forEach(([a, b], i) => parts.push({ id: `BK${i + 1}`, name: "Back panel", size: [b - a - 2, yT - yB - 4, back], pos: [(a + b) / 2, (yB + yT) / 2, -D / 2 + back / 2], material: "fiber" }));
  // the inside faces of each bay, for its shelf and pins
  const walls: [number, number, string, string][] = [
    [-W / 2 + T, bx(1) - T / 2, "SL", "DV"],
    [bx(1) + T / 2, bx(3) - T / 2, "DV", "NW1"],
    [bx(3) + T / 2, bx(4) - T / 2, "NW1", "NW2"],
    [bx(4) + T / 2, W / 2 - T, "NW2", "SR"],
  ];
  const yShelf = 440;
  walls.forEach(([a, b], i) => parts.push({ id: `SH${i + 1}`, name: "Shelf", size: [b - a - 2, T, dc - 30], pos: [(a + b) / 2, yShelf + T / 2, zc - 5], material: i === 2 ? "wood" : "board" }));
  const xl = W / 2 - 80, zf = z1 - 60, zbk = z0 + 60;
  const legPts: Vec3[] = [[-xl, 0, zf], [xl, 0, zf], [-xl, 0, zbk], [xl, 0, zbk], [0, 0, zbk]];
  const foot = 12;
  legPts.forEach((p, i) => parts.push({ id: `L${i + 1}`, name: "Leg", size: [40, legH - foot, 40], pos: [p[0], foot + (legH - foot) / 2, p[2]], shape: "cyl", material: "wood" }));
  // doors in bays 1, 2, 3 and 5; the hinge side of each
  const doorBays = [1, 2, 3, 5];
  const hingeLeft = [true, true, false, false];
  const dh = H - T - yB - 4;
  doorBays.forEach((k, i) => parts.push({ id: `D${i + 1}`, name: "Door", size: [bay - 3, dh, doorT], pos: [bx(k) - bay / 2, yB + 2 + dh / 2, D / 2 - doorT / 2] }));
  // a push opener under the top at each door's free edge
  const freeX = doorBays.map((k, i) => (hingeLeft[i] ? bx(k) - 40 : bx(k - 1) + 40));
  const plates = freeX.map((x): Vec3 => [x, yT, z1 - 30]);
  const hinges = (i: number) => {
    const x = hingeLeft[i] ? bx(doorBays[i] - 1) + 40 : bx(doorBays[i]) - 40;
    return fx("hinge", [yB + 90, yT - 90].map((y): Vec3 => [x, y, z1]), [0, 0, -1], `D${i + 1}`);
  };
  const bolts: Vec3[] = [bx(1), bx(3), bx(4)].flatMap((x) => [z0 + 70, z1 - 70].map((z): Vec3 => [x, yB, z]));
  const rivets: Vec3[] = [
    ...[-xs, xs].flatMap((x) => [yB + 160, yT - 160].map((y): Vec3 => [x, y, -D / 2])),
    ...[bx(1), bx(3), bx(4)].flatMap((x) => [
      [x - 5, yB + 160, -D / 2] as Vec3,
      [x + 5, yT - 160, -D / 2] as Vec3,
    ]),
  ];
  const yBr = H - T / 2, xBr = W / 2 - 60;
  const brackets: Vec3[] = [-xBr, xBr].map((x): Vec3 => [x, yBr, -D / 2]);
  const wallPt = (dz: number): Vec3[] => brackets.map((p): Vec3 => [p[0], p[1] - 22, p[2] - dz]);
  const pins = walls.flatMap(([a, b, l, r]) =>
    [fx("pin", [z0 + 40, z1 - 50].map((z): Vec3 => [a, yShelf, z]), [-1, 0, 0], l), fx("pin", [z0 + 40, z1 - 50].map((z): Vec3 => [b, yShelf, z]), [1, 0, 0], r)],
  );
  const connectors = (id: string, x: number, sx: number) => fx("connector", [z0 + 70, z1 - 70].map((z): Vec3 => [x, yT - T / 2, z]), [-sx, 0, 0], id, { name: "Connector", len: 14, dia: 18 });
  const connScrews = (id: string, x: number, sx: number) => fx("screw", [z0 + 70, z1 - 70].map((z): Vec3 => [x, yT - T / 2 - 30, z]), [-sx, 0, 0], id, { len: 12, dia: 4 });
  const down: Vec3 = [0, 0, -320]; // lying on its front, parts come down from above (the back)
  const steps: CustomStep[] = [
    {
      title: "Screw the opener plates under the top",
      detail: "Lay the top upside down on a rug. Four plates along the front edge, two short screws in each.",
      add: ["TOP"],
      fix: [fx("plate", plates, [0, 1, 0], "TOP", { name: "Push opener plate", len: 6, dia: 40 }), fx("screw", plates.flatMap((p): Vec3[] => [[p[0] - 26, p[1], p[2]], [p[0] + 26, p[1], p[2]]]), [0, 1, 0], "TOP", { len: 12, dia: 3.5 })],
      tools: ["screwdriver"],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Click the first divider onto the top",
      detail: "Stand the top on its front edge. Slide the divider onto the two clips, then press it down until it locks.",
      add: ["DV"],
      pose: "-z",
      from: { DV: down },
    },
    {
      title: "Screw the connectors onto the niche walls",
      detail: "Two on each wall, at the end with the holes, the wood-look faces turned towards each other.",
      wait: ["NW1", "NW2"],
      fix: [connectors("NW1", bx(3) + T / 2, 1), connectors("NW2", bx(4) - T / 2, -1), connScrews("NW1", bx(3) + T / 2, 1), connScrews("NW2", bx(4) - T / 2, -1)],
      tools: ["screwdriver"],
      from: { NW1: down, NW2: down },
    },
    {
      title: "Push the niche ceiling onto the connectors",
      detail: "Between the two walls, until all four connectors click into its holes.",
      wait: ["NC"],
      from: { NC: down },
    },
    {
      title: "Click the niche onto the top",
      detail: "Lower it onto the clips between the first divider and the end, then press it home.",
      add: ["NW1", "NW2", "NC"],
      from: { NW1: down, NW2: down, NC: down },
    },
    { title: "Click both sides onto the top", detail: "Two clips at each end. Press each side down until it locks.", add: ["SL", "SR"], from: { SL: down, SR: down } },
    {
      title: "Click the bottom onto the sides",
      detail: "Push it onto the clips at both ends, then press it down so it locks.",
      add: ["BOT"],
      from: { BOT: [0, -320, 0] },
    },
    {
      title: "Bolt the bottom to the dividers",
      detail: "Two bolts through the bottom into each divider and niche wall.",
      fix: [fx("bolt", bolts, [0, 1, 0], "BOT", { name: "Allen bolt", len: 50, dia: 7 })],
      tools: ["allen"],
    },
    {
      title: "Slide in the back panels",
      detail: "One into each bay, white side in, along the grooves until they reach the top.",
      add: ["BK1", "BK2", "BK3", "BK4"],
      from: { BK1: [0, -420, 0], BK2: [0, -420, 0], BK3: [0, -420, 0], BK4: [0, -420, 0] },
    },
    {
      title: "Rivet the back panels on",
      detail: "Push a sleeve into each hole, then press a pin into each sleeve until it spreads.",
      fix: [fx("clip", rivets, [0, 0, 1], undefined, { name: "Rivet sleeve", len: 12, dia: 8 }), fx("cap", rivets, [0, 0, 1], undefined, { name: "Rivet pin", len: 4, dia: 10 })],
    },
    {
      title: "Fit the wall brackets",
      detail: "Into the holes at the back of the top, one at each end.",
      fix: [fx("bracket", brackets, [0, 0, 1], "TOP", { name: "Wall bracket", len: 40, dia: 30 })],
      wall: false,
    },
    {
      title: "Screw the leg studs into the bottom",
      detail: "Five: one near each corner and one at the back in the middle. By hand until they stop.",
      fix: [fx("legScrew", legPts.map((p): Vec3 => [p[0], yB, p[2]]), [0, 1, 0], "BOT", { name: "Leg stud", len: 30, dia: 8 })],
    },
    { title: "Screw on the legs", detail: "Turn each one onto its stud by hand until it sits tight.", add: ["L1", "L2", "L3", "L4", "L5"] },
    {
      title: "Screw a levelling bolt into each leg",
      detail: "Into the hole in the end, only a few turns for now.",
      fix: legPts.map((p, i) => fx("foot", [[p[0], 0, p[2]]], [0, 1, 0], `L${i + 1}`, { name: "Levelling bolt", len: foot, dia: 24 })),
    },
    {
      title: "Stand it up together",
      detail: "Lift it by the cabinet, never by the legs, which can snap off.",
      pose: "+y",
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Screw a spacer onto each bracket",
      detail: "Only if there is a skirting board: the spacers keep the cabinet straight against the wall.",
      fix: [fx("knob", brackets.map((p): Vec3 => [p[0], p[1], p[2] - 4]), [0, 0, 1], "TOP", { name: "Wall spacer", len: 25, dia: 30 })],
      wall: false,
    },
    {
      title: "Push it to the wall and level it",
      detail: "Turn the levelling bolts with the spanner until the top is level and the cabinet stands steady.",
      tools: ["wrench", "level"],
    },
    { title: "Mark the holes on the wall", detail: "Through the two brackets.", tools: ["pencil"], warnings: ["wall"] },
    {
      title: "Drill the holes and push in the plugs",
      detail: "Move the cabinet away first. The plugs suit a solid wall: for any other wall, ask in a hardware shop.",
      fix: [fx("plug", wallPt(40), [0, 0, -1], undefined, { included: true })],
      tools: ["drill"],
      warnings: ["wall"],
    },
    {
      title: "Screw it to the wall",
      detail: "Push it back, screw through each bracket with a washer, then press a cover cap over each.",
      fix: [
        fx("washer", wallPt(-2), [0, 0, -1], undefined, { len: 2, dia: 16 }),
        fx("screw", wallPt(-2), [0, 0, -1], undefined, { len: 50, dia: 5, included: true }),
        fx("cap", wallPt(-8), [0, 0, -1], undefined, { name: "Cover cap", len: 6, dia: 36 }),
      ],
      tools: ["screwdriver"],
      wall: true,
      warnings: ["wall", "tip"],
    },
    { title: "Push in the shelf pins", detail: "Four in each bay, at the same height on both sides.", fix: pins },
    { title: "Lay the shelves on the pins", detail: "One in each bay, the wood-look one in the niche.", add: ["SH1", "SH2", "SH3", "SH4"], from: { SH1: [0, 0, 380], SH2: [0, 0, 380], SH3: [0, 0, 380], SH4: [0, 0, 380] } },
    {
      title: "Click the push openers onto the plates",
      detail: "Slide each one in until it clicks. Pull it out a little if it sits too deep.",
      fix: [fx("connector", plates.map((p): Vec3 => [p[0], p[1], p[2] - 40]), [0, 1, 0], "TOP", { name: "Push opener", len: 70, dia: 20 })],
    },
    {
      title: "Screw the hinges onto the doors",
      detail: "Lay the doors face down on a rug. Two hinges on each, on the side it opens from, screws turned in tight.",
      wait: ["D1", "D2", "D3", "D4"],
      fix: [0, 1, 2, 3].map(hinges),
      tools: ["screwdriver"],
      from: { D1: [0, 0, 380], D2: [0, 0, 380], D3: [0, 0, 380], D4: [0, 0, 380] },
      warnings: ["floor"],
    },
    {
      title: "Hang the doors",
      detail: "Hook each hinge onto its plate inside the cabinet and press until it clicks. Turn the hinge screws to even up the gaps.",
      add: ["D1", "D2", "D3", "D4"],
      tools: ["screwdriver"],
      from: { D1: [0, 0, 300], D2: [0, 0, 300], D3: [0, 0, 300], D4: [0, 0, 300] },
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["LEDAMOT"],
  recipe(s) {
    if (!/cabinet/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
