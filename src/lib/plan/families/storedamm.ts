import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * STOREDAMM, read from its manuals. The shelf units are two leaning side frames (a front and a back post joined by a
 * rail) with slatted shelves that get shorter towards the top. Two of the tall unit's five shelves (one of the low
 * unit's three) carry four dowels in the ends of their rails; the others are screwed through the posts. One side frame
 * lies on a rug, the screwed shelves go on top shelf first, then the dowelled ones, and the other side goes over them
 * with its screws. Stood up, every screw is tightened again, the feet in the posts are levelled, and an angle bracket
 * under a shelf holds it to the wall. The bench is built upside down: two dowelled rails, the leg frames bolted down
 * into the seat, and each rail held by a bolt into a barrel nut at each end.
 */

type Kind = CustomFix["kind"];
const fx = (kind: Kind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const r = (n: number) => Math.round(n);

const P = 40; // posts and legs, square
const SCREW = { len: 70, dia: 6 };
const DOWEL = { len: 30, dia: 8 };

function shelving(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const tall = H > 1000;
  const lean = 115 / 1410; // how far a post leans in per mm of height
  const a = Math.atan(lean);
  const n = tall ? 5 : 3;
  const yBot = 110, yTop = H - (tall ? 90 : 80);
  const ys = Array.from({ length: n }, (_, i) => r(yBot + ((yTop - yBot) * i) / (n - 1))); // top of each shelf
  const outer = (y: number) => W / 2 - lean * y; // x of a post's outer face at height y
  const zP = D / 2 - P / 2;

  // a side frame: front and back posts leaning in, joined by a rail near the floor
  const side = (id: string, sx: number): CustomPart => {
    const xm = sx * (outer(H / 2) - P / 2);
    const yr = 100;
    const xr = sx * (outer(yr) - P / 2);
    const post = (z: number): PartPiece => ({ shape: "box", size: [P, r(H / Math.cos(a)), P], pos: [0, 0, z], rot: [0, 0, sx * a] });
    return {
      id,
      name: "Side frame",
      size: [r(lean * H + P), H, D],
      pos: [r(xm), H / 2, 0],
      material: "wood",
      pieces: [post(-zP), post(zP), { shape: "box", size: [P - 10, 50, D - 2 * P], pos: [r(xr - xm), yr - H / 2, 0] }],
    };
  };
  const shelf = (i: number): CustomPart => {
    const y = ys[i];
    const L = r(2 * (outer(y - 15) - P));
    const slats = Math.max(4, Math.floor(L / 62));
    const pitch = (L - 40) / slats;
    const pieces: PartPiece[] = [-zP, zP].map((z) => ({ shape: "box", size: [L, 30, P], pos: [0, 0, z] }) as PartPiece);
    for (let k = 0; k < slats; k++) pieces.push({ shape: "box", size: [r(pitch - 14), 16, D - 2 * P], pos: [r(-L / 2 + 20 + pitch * (k + 0.5)), 7, 0] });
    return { id: `S${i}`, name: "Shelf", size: [L, 30, D], pos: [0, y - 15, 0], material: "wood", pieces };
  };
  const shelves = ys.map((_, i) => shelf(i));
  const dowelled = tall ? [3, 1] : [1];
  const screwed = tall ? [4, 2, 0] : [2, 0];
  const ends = (i: number, sx: number): Vec3[] => [-zP, zP].map((z) => [r(sx * (outer(ys[i] - 15) - P)), ys[i] - 15, z]);
  const screws = (i: number, sx: number, on: string) => fx("screw", ends(i, sx).map((p) => [r(sx * outer(ys[i] - 15)), p[1], p[2]] as Vec3), [-sx, 0, 0], { ...SCREW, on, mate: `S${i}` });
  const dowels = (i: number): CustomFix[] => [-1, 1].map((sx) => fx("dowel", ends(i, sx), [sx, 0, 0], { ...DOWEL, on: `S${i}`, mate: sx < 0 ? "L" : "R" }));

  const steps: CustomStep[] = [];
  const label = (i: number) => (i === n - 1 ? "the top shelf" : i === 0 ? "the bottom shelf" : "the middle shelf");
  screwed.forEach((i, k) =>
    steps.push({
      title: k === 0 ? "Screw the top shelf to a side frame" : `Screw on ${label(i)}`,
      detail: k === 0 ? "Lay one side frame on a rug, holes up. Stand the shortest shelf on it at the narrow end and fix it with two screws through the posts." : "Two screws through the posts. Keep the slats flush with the posts' edges.",
      add: k === 0 ? ["L", `S${i}`] : [`S${i}`],
      fix: [screws(i, -1, "L")],
      tools: ["allen"],
      pose: k === 0 ? "+x" : undefined,
      warnings: k === 0 ? ["floor"] : undefined,
    }),
  );
  // the low unit's manual puts its dowelled shelf in between the two screwed ones
  steps.splice(tall ? steps.length : 1, 0, {
    title: dowelled.length > 1 ? "Tap dowels into the other two shelves and push them in" : "Tap dowels into the middle shelf and push it in",
    detail: "Four dowels into the ends of each one's rails, then into the holes in the posts. Press until the rails sit tight against them.",
    add: dowelled.map((i) => `S${i}`),
    fix: dowelled.flatMap((i) => dowels(i)),
    tools: ["hammer"],
  });
  steps.push({
    title: "Lay the other side frame on top and screw it on",
    detail: "Line up every dowel with its hole first, then two screws for each screwed shelf.",
    add: ["R"],
    fix: screwed.map((i) => screws(i, 1, "R")),
    tools: ["allen"],
    from: { R: [600, 0, 0] },
  });
  steps.push({
    title: "Stand it up and tighten every screw",
    detail: `Turn it onto its feet, then go round all ${screwed.length * 4} screws once more with the Allen key.`,
    tools: ["allen"],
    pose: "+y",
    check: "square",
  });
  steps.push({ title: "Level the feet", detail: "Turn the feet in the bottom of the posts until it stands without rocking." });
  const bi = tall ? 1 : n - 1;
  const bAt: Vec3 = [0, ys[bi] - 30, -zP];
  const wallAt: Vec3 = [0, ys[bi] + 40, -D / 2 - 2];
  steps.push({
    title: "Screw the wall bracket under a shelf",
    detail: "Under the back rail, a washer under the screw. The slotted leg stands up against the wall.",
    fix: [
      fx("angle", [[bAt[0], bAt[1] + 20, -D / 2 + 2]], [0, 0, 1], { name: "Wall bracket", len: 60, dia: 24, on: `S${bi}` }),
      fx("washer", [bAt], [0, 1, 0], { len: 1.5, dia: 16 }),
      fx("screw", [bAt], [0, 1, 0], { len: 16, dia: 4, on: `S${bi}` }),
    ],
    tools: ["screwdriver"],
  });
  steps.push({
    title: "Screw it to the wall",
    detail: "Through the slot in the bracket, with the second washer. Wall screws and plugs aren't included: pick ones made for your wall.",
    fix: [
      fx("plug", [[0, wallAt[1], -D / 2 - 40]], [0, 0, -1], { len: 35, dia: 8 }),
      fx("washer", [[0, wallAt[1], -D / 2 + 1]], [0, 0, -1], { len: 1.5, dia: 16 }),
      fx("screw", [wallAt], [0, 0, -1], { len: 50, dia: 5 }),
    ],
    tools: ["drill", "screwdriver", "pencil"],
    wall: true,
    warnings: ["wall", "tip"],
  });
  return { parts: [side("L", -1), side("R", 1), ...shelves], steps };
}

function bench(s: ProductSpec): CustomParams {
  const L = s.size.w * 10, H = s.size.h * 10, Wd = s.size.d * 10;
  const T = 30, yS = H - T; // the seat's underside
  const xTop = L / 2 - 70 - P / 2, xBot = L / 2 - 30 - P / 2;
  const a = Math.atan((xBot - xTop) / yS);
  const legX = (y: number) => xBot - ((xBot - xTop) * y) / yS;
  const zL = Wd / 2 - 30 - P / 2;
  const yHi = yS - 20, yLo = 140;

  const seatPieces: PartPiece[] = [-1, 1].map((sz) => ({ shape: "box", size: [L, T, 45], pos: [0, 0, sz * (Wd / 2 - 22)] }) as PartPiece);
  const slats = 11, pitch = L / slats;
  for (let k = 0; k < slats; k++) seatPieces.push({ shape: "box", size: [r(pitch - 16), 20, Wd - 90], pos: [r(-L / 2 + pitch * (k + 0.5)), 5, 0] });
  const seat: CustomPart = { id: "A", name: "Seat", size: [L, T, Wd], pos: [0, H - T / 2, 0], material: "wood", pieces: seatPieces };

  const frame = (id: string, sx: number): CustomPart => {
    const xm = sx * legX(yS / 2);
    const leg = (z: number): PartPiece => ({ shape: "box", size: [P, r(yS / Math.cos(a)), P], pos: [0, 0, z], rot: [0, 0, -sx * a] });
    const bar = (y: number): PartPiece => ({ shape: "box", size: [P - 6, 40, 2 * zL - P], pos: [r(sx * legX(y) - xm), r(y - yS / 2), 0] });
    return { id, name: "Leg frame", size: [r(xBot - xTop + P), yS, Wd - 60], pos: [r(xm), r(yS / 2), 0], material: "wood", pieces: [leg(-zL), leg(zL), bar(yHi), bar(yLo)] };
  };
  const inner = (y: number) => r(legX(y) - P / 2 + 3);
  const apron: CustomPart = { id: "C", name: "Seat rail", size: [2 * inner(yHi), 50, 30], pos: [0, yS - 25, 0], material: "wood" };
  const stretcher: CustomPart = { id: "D", name: "Lower rail", size: [2 * inner(yLo), 40, 30], pos: [0, yLo, 0], material: "wood" };

  const seatBolts = (sx: number): Vec3[] => [-1, 1].map((sz) => [r(sx * legX(yHi)), yHi - 20, r(sz * (zL - 60))]);
  const railBolt = (sx: number, y: number): Vec3 => [r(sx * (legX(y) + P / 2)), y, 0];
  const barrel = (sx: number, rail: CustomPart): Vec3 => [r(sx * (rail.size[0] / 2 - 25)), rail.pos[1] - rail.size[1] / 2, 0];
  const BOLT = { len: 70, dia: 6 };
  const BARREL = { name: "Barrel nut", len: 14, dia: 10 };
  const railDowels = (rail: CustomPart): CustomFix[] => [-1, 1].map((sx) => fx("dowel", [[r((sx * rail.size[0]) / 2), rail.pos[1] + 8, 0]], [sx, 0, 0], { ...DOWEL, on: rail.id, mate: sx < 0 ? "L" : "R" }));

  const steps: CustomStep[] = [
    { title: "Tap a dowel into each end of the seat rail", detail: "The longer rail with the holes on one face. Tap them in until they stop.", fix: railDowels(apron), tools: ["hammer"] },
    { title: "Tap a dowel into each end of the lower rail", detail: "The same way, into the shorter rail.", fix: railDowels(stretcher), tools: ["hammer"] },
    {
      title: "Bolt a leg frame onto the upside-down seat",
      detail: "Lay the seat face down on a rug and stand a leg frame on one end. Two bolts down through its top bar.",
      add: ["A", "L"],
      fix: [fx("bolt", seatBolts(-1), [0, 1, 0], { ...BOLT, on: "L", mate: "A" })],
      tools: ["allen"],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Push the seat rail into the leg frame", detail: "Along the middle of the seat, its dowel into the hole in the top bar.", add: ["C"] },
    {
      title: "Lock the seat rail with a bolt",
      detail: "Drop a barrel nut into the hole near the rail's end, slot facing the bolt, then turn the bolt through the leg frame into it.",
      fix: [fx("nut", [barrel(-1, apron)], [0, 1, 0], { ...BARREL, on: "C" }), fx("bolt", [railBolt(-1, yHi)], [1, 0, 0], { ...BOLT, on: "L", mate: "C" })],
      tools: ["allen", "flathead"],
    },
    { title: "Push the lower rail into the leg frame", detail: "Its dowel into the hole in the lower bar.", add: ["D"] },
    {
      title: "Lock the lower rail with a bolt",
      detail: "A barrel nut in the rail, then a bolt through the leg frame into it.",
      fix: [fx("nut", [barrel(-1, stretcher)], [0, 1, 0], { ...BARREL, on: "D" }), fx("bolt", [railBolt(-1, yLo)], [1, 0, 0], { ...BOLT, on: "L", mate: "D" })],
      tools: ["allen", "flathead"],
    },
    { title: "Push on the other leg frame", detail: "Over both rails' dowels, until it sits on the seat.", add: ["R"], from: { R: [300, 0, 0] } },
    { title: "Bolt it down into the seat", detail: "Two bolts through its top bar, as on the first end.", fix: [fx("bolt", seatBolts(1), [0, 1, 0], { ...BOLT, on: "R", mate: "A" })], tools: ["allen"] },
    {
      title: "Lock both rails at this end",
      detail: "A barrel nut in each rail, then a bolt through the leg frame into each one.",
      fix: [
        fx("nut", [barrel(1, apron), barrel(1, stretcher)], [0, 1, 0], { ...BARREL }),
        fx("bolt", [railBolt(1, yHi), railBolt(1, yLo)], [-1, 0, 0], { ...BOLT, on: "R" }),
      ],
      tools: ["allen", "flathead"],
    },
    { title: "Tighten all eight bolts and turn it over", detail: "Go round every bolt once more, then stand the bench on its legs.", tools: ["allen"], pose: "+y", check: "square" },
  ];
  return { parts: [seat, frame("L", -1), frame("R", 1), apron, stretcher], steps };
}

const family: Family = {
  names: ["STOREDAMM"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/bench/.test(slug)) return bench(s);
    if (/shelf-unit|shelving-unit/.test(slug)) return shelving(s);
    return null;
  },
};
export default family;
