import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * MUSKAN (white bathroom range), read from its three manuals.
 * Bench: dowels in the ends of the seat's and the lower shelf's cleats (three each end under the seat, two under
 * the shelf), then lying on its back the two ready-made side frames go on with four long Allen screws each.
 * Storage stool: lying on its side, the front and back louvre panels stand on one side frame on dowels and are
 * screwed on, then it's turned over onto the other side frame the same way. Stood up, the slatted bottom drops in,
 * four bumpers are tapped into the lid's underside and the lid goes on.
 * Shelving unit: each side ladder is built flat (cam bolts in both posts, two cam rungs and three dowelled rungs,
 * cam locks, two feet). Lying on its back, two shelves go into one ladder on thick dowels, three more on thin dowels
 * and long screws, then the other ladder goes on with six more screws. Stood up, one strap holds the top shelf
 * to the wall.
 */

const pt = (x: number, y: number, z: number): Vec3 => [x, y, z];
const spread = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)));
const ALLEN_SCREW = { kind: "screw" as const, name: "Allen screw", len: 70, dia: 6 };
const W_SCREW = { kind: "screw" as const, len: 50, dia: 5 };

/** A slatted shelf: slats running front to back on two (or three) cleats along its width, about its middle. */
function slatted(w: number, d: number, st: number, ch: number, cleatZ: number[], n: number): PartPiece[] {
  const sw = (w - (n - 1) * 12) / n;
  const h = st + ch;
  return [
    ...spread(-w / 2 + sw / 2, w / 2 - sw / 2, n).map((x): PartPiece => ({ shape: "box", size: [sw, st, d], pos: [x, h / 2 - st / 2, 0] })),
    ...cleatZ.map((z): PartPiece => ({ shape: "box", size: [w, ch, 24], pos: [0, -h / 2 + ch / 2, z] })),
  ];
}

/* ---------------------------------------------------------------- bench */

function bench(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 580, D = Math.round(s.size.d * 10) || 380, H = Math.round(s.size.h * 10) || 500;
  const L = 40, ST = 18, CH = 40;
  const fx = W / 2 - L / 2, lz = D / 2 - L / 2, iw = W - 2 * L;
  const seatY = H - (ST + CH) / 2, cleatY = H - ST - CH / 2;
  const lowTop = 170, lowY = lowTop - (ST + CH) / 2, lowCleat = lowTop - ST - CH / 2;
  const frame: PartPiece[] = [
    ...[-1, 1].map((g): PartPiece => ({ shape: "box", size: [L, H, L], pos: [0, 0, g * lz] })),
    { shape: "box", size: [L, CH, 2 * lz - L], pos: [0, cleatY - H / 2, 0] },
    { shape: "box", size: [L, CH, 2 * lz - L], pos: [0, lowCleat - 20 - H / 2, 0] },
  ];
  const parts: CustomPart[] = [
    { id: "S", name: "Seat", size: [iw, ST + CH, D], pos: [0, seatY, 0], material: "wood", pieces: slatted(iw, D, ST, CH, [-lz, 0, lz], 13) },
    { id: "B", name: "Lower shelf", size: [iw, ST + CH, D], pos: [0, lowY, 0], material: "wood", pieces: slatted(iw, D, ST, CH, [-lz, lz], 13) },
    ...[-1, 1].map((g, i): CustomPart => ({ id: `F${i}`, name: "Side frame", size: [L, H, D], pos: [g * fx, H / 2, 0], material: "wood", pieces: frame })),
  ];
  const ends = (id: string, y: number, zs: number[]): CustomFix[] =>
    [-1, 1].map((g): CustomFix => ({ kind: "dowel", count: zs.length, len: 30, dia: 8, on: id, at: zs.map((z) => pt(g * (iw / 2), y, z)), dir: [g, 0, 0] }));
  const screws = (g: number): CustomFix => ({ ...ALLEN_SCREW, count: 4, on: g < 0 ? "F0" : "F1", at: [cleatY, lowCleat].flatMap((y) => [-lz, lz].map((z) => pt(g * (W / 2), y, z))), dir: [-g, 0, 0] });
  const steps: CustomStep[] = [
    {
      title: "Tap the dowels into the seat and the lower shelf",
      detail: "Three in each end of the seat's cleats, two in each end of the shelf's. Tap them halfway in.",
      add: ["S", "B"],
      fix: [...ends("S", cleatY, [-lz, 0, lz]), ...ends("B", lowCleat, [-lz, lz])],
      tools: ["hammer"],
    },
    {
      title: "Screw the side frames on",
      detail: "Lay both shelves on their backs on a rug and press a frame onto each end, then four long screws through each frame. Slot the Allen key into its handle for more grip.",
      add: ["F0", "F1"],
      fix: [screws(-1), screws(1)],
      tools: ["allen"],
      pose: "+z",
      warnings: ["floor"],
    },
    { title: "Stand the bench up", detail: "Check every screw is tight.", pose: "+y" },
  ];
  return { parts, steps };
}

/* ---------------------------------------------------------------- storage stool */

function storageStool(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 370, H = Math.round(s.size.h * 10) || 500;
  const D = W, L = 35, LT = 30; // legs, lid
  const legH = H - LT;
  const lx = W / 2 - L / 2, lz = D / 2 - L / 2;
  const y0 = 140, y1 = legH; // louvres from here up
  const louvres = spread(y0 + 20, y1 - 20, 7);
  const frame: PartPiece[] = [
    ...[-1, 1].map((g): PartPiece => ({ shape: "box", size: [L, legH, L], pos: [0, 0, g * lz] })),
    ...louvres.map((y): PartPiece => ({ shape: "box", size: [15, 32, 2 * lz - L], pos: [0, y - legH / 2, 0], rot: [0, 0, 0.25] })),
  ];
  const iw = W - 2 * L; // between the side frames
  const pz = D / 2 - 10; // front and back panels
  const ph = y1 - y0;
  const panel: PartPiece[] = [
    ...[-1, 1].map((g): PartPiece => ({ shape: "box", size: [35, ph, 20], pos: [g * (iw / 2 - 17.5), 0, 0] })),
    ...louvres.map((y): PartPiece => ({ shape: "box", size: [iw - 70, 32, 12], pos: [0, y - (y0 + y1) / 2, 0], rot: [-0.25, 0, 0] })),
  ];
  const lidPieces: PartPiece[] = [
    ...[-1, 1].map((g): PartPiece => ({ shape: "box", size: [W, LT, 40], pos: [0, 0, g * (D / 2 - 20)] })),
    ...spread(-W / 2 + 30, W / 2 - 30, 6).map((x): PartPiece => ({ shape: "box", size: [45, 18, D - 80], pos: [x, LT / 2 - 9, 0] })),
  ];
  const parts: CustomPart[] = [
    { id: "L", name: "Side frame", size: [L, legH, D], pos: [-lx, legH / 2, 0], material: "wood", pieces: frame },
    { id: "PF", name: "Louvre panel", size: [iw, ph, 20], pos: [0, (y0 + y1) / 2, pz], material: "wood", pieces: panel },
    { id: "PB", name: "Louvre panel", size: [iw, ph, 20], pos: [0, (y0 + y1) / 2, -pz], material: "wood", pieces: panel },
    { id: "R", name: "Side frame", size: [L, legH, D], pos: [lx, legH / 2, 0], material: "wood", pieces: frame },
    { id: "B", name: "Slatted bottom", size: [iw, 30, D - 40], pos: [0, y0 + 15, 0], material: "wood", pieces: slatted(iw, D - 40, 15, 15, [-(D / 2 - 40), D / 2 - 40], 7) },
    { id: "T", name: "Lid", size: [W, LT, D], pos: [0, H - LT / 2, 0], material: "wood", pieces: lidPieces },
  ];
  const ys = [y0 + 40, y1 - 40];
  const dowels = (g: number): CustomFix => ({ kind: "dowel", count: 4, len: 30, dia: 8, at: [-pz, pz].flatMap((z) => ys.map((y) => pt(g * (iw / 2), y, z))), dir: [g, 0, 0], mate: g < 0 ? "L" : "R" });
  const screws = (g: number): CustomFix => ({ kind: "screw", count: 4, len: 50, dia: 4, at: [-pz, pz].flatMap((z) => ys.map((y) => pt(g * (iw / 2 - 35), y + 40 * (y < 300 ? 1 : -1), z))), dir: [g, 0, 0], mate: g < 0 ? "L" : "R" });
  const steps: CustomStep[] = [
    {
      title: "Stand the two louvre panels on a side frame",
      detail: "Lay one side frame flat on a rug. Tap four dowels into it and press both panels onto them.",
      add: ["L", "PF", "PB"],
      fix: [dowels(-1)],
      tools: ["hammer"],
      pose: "+x",
      warnings: ["floor"],
    },
    { title: "Screw the panels to the frame", detail: "Four screws down through the panels' end pieces into the frame.", fix: [screws(-1)], tools: ["screwdriver"] },
    {
      title: "Turn it over onto the other side frame",
      detail: "Tap four dowels into the second frame, then lower the panels onto them.",
      add: ["R"],
      fix: [dowels(1)],
      tools: ["hammer"],
      pose: "-x",
    },
    { title: "Screw this side on", detail: "Four more screws, the same way.", fix: [screws(1)], tools: ["screwdriver"] },
    { title: "Stand it up and drop the bottom in", detail: "The slatted bottom rests on the cleats inside, near the floor of the box.", add: ["B"], pose: "+y", from: { B: [0, 450, 0] } },
    {
      title: "Tap the bumpers into the lid",
      detail: "Lay the lid upside down. One in each corner hole, tapped in over a block of wood.",
      add: ["T"],
      fix: [{ kind: "glide", name: "Lid bumper", count: 4, len: 15, dia: 12, on: "T", at: [-1, 1].flatMap((gx) => [-1, 1].map((gz) => pt(gx * (W / 2 - 60), H - LT, gz * (D / 2 - 20)))), dir: [0, 1, 0] }],
      tools: ["hammer"],
      from: { T: [0, 300, 0] },
    },
    { title: "Lay the lid on", detail: "The bumpers sit inside the top of the box, finger grips at the front and back.", kind: "general" },
  ];
  return { parts, steps };
}

/* ---------------------------------------------------------------- shelving unit */

function shelving(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 370, D = Math.round(s.size.d * 10) || 370, H = Math.round(s.size.h * 10) || 1400;
  const P = 34, ST = 18, CH = 40;
  const px = W / 2 - P / 2, pz = D / 2 - P / 2;
  const iw = W - 2 * P, id = D - 2 * P;
  const tops = spread(170, H, 5);
  const cy = (i: number) => tops[i] - ST - CH / 2; // cleats and rungs
  const camRungs = [1, 3], plainRungs = [0, 2, 4];
  const parts: CustomPart[] = [];
  const side = (L: "l" | "r", g: number) => {
    for (const z of [-1, 1]) parts.push({ id: `${L}P${z < 0 ? "b" : "f"}`, name: "Post", size: [P, H, P], pos: [g * px, H / 2, z * pz], material: "wood" });
    tops.forEach((_, i) => parts.push({ id: `${L}R${i}`, name: "Rung", size: [22, CH, id], pos: [g * px, cy(i), 0], material: "wood" }));
  };
  side("l", -1);
  tops.forEach((t, i) => parts.push({ id: `S${i}`, name: "Shelf", size: [iw, ST + CH, D], pos: [0, t - (ST + CH) / 2, 0], material: "wood", pieces: slatted(iw, D, ST, CH, [-pz, pz], 7) }));
  side("r", 1);

  const posts = (L: string) => [`${L}Pb`, `${L}Pf`];
  const camBolts = (L: string, g: number): CustomFix[] =>
    [-1, 1].map((z, k): CustomFix => ({ kind: "camScrew", count: 2, len: 34, on: posts(L)[k], at: camRungs.map((i) => pt(g * px, cy(i) + 8, z * (id / 2))), dir: [0, 0, z] }));
  // one entry per way in (the joints at the back posts and at the front posts), so a whole ladder fits in one step
  const rungDowels = (g: number, rungs: number[], dy: (i: number) => number[]): CustomFix[] =>
    [-1, 1].map((z): CustomFix => ({ kind: "dowel", count: 1, len: 30, dia: 8, at: rungs.flatMap((i) => dy(i).map((d) => pt(g * px, cy(i) + d, z * (id / 2)))), dir: [0, 0, z] }));
  const camDy = () => [-10], plainDy = () => [-12, 12];
  const allDy = (i: number) => (camRungs.includes(i) ? camDy() : plainDy());
  const cams = (L: string, g: number): CustomFix[] =>
    camRungs.map((i): CustomFix => ({ kind: "cam", count: 2, dia: 15, on: `${L}R${i}`, at: [-1, 1].map((z) => pt(g * (px - 11), cy(i) + 8, z * (id / 2 - 25))), dir: [-g, 0, 0] }));
  const feet = (L: string, g: number): CustomFix => ({ kind: "foot", name: "Adjustable foot", count: 2, len: 20, dia: 30, at: [-1, 1].map((z) => pt(g * px, 0, z * pz)), dir: [0, 1, 0] });
  const shelfDowels = (ids: number[], g: number, mate: string | undefined, thick: boolean): CustomFix[] =>
    ids.map((i): CustomFix => ({ kind: "dowel", ...(thick ? { name: "Thick dowel" } : {}), count: 2, len: thick ? 40 : 30, dia: thick ? 10 : 8, on: `S${i}`, at: [-1, 1].map((z) => pt(g * (iw / 2), cy(i), z * pz)), dir: [g, 0, 0], mate }));
  const longScrews = (g: number): CustomFix => ({ kind: "screw", name: "Long screw", count: 6, len: 90, dia: 6, at: [-1, 1].flatMap((z) => plainRungs.map((i) => pt(g * (W / 2), cy(i) + 12, z * pz))), dir: [-g, 0, 0] });
  const sideIds = (L: string) => [...posts(L), ...tops.map((_, i) => `${L}R${i}`)];

  const wz = -D / 2 - 6;
  const sy = cy(4);
  const steps: CustomStep[] = [
    {
      title: "Screw the cam bolts into the posts",
      detail: "Build both side ladders the same way. Lay two posts on a rug and screw two cam bolts into each, at the holes for the second and fourth rungs.",
      add: posts("l"),
      fix: camBolts("l", -1),
      tools: ["screwdriver"],
      pose: "+x",
      repeat: 2,
      warnings: ["floor"],
    },
    { title: "Push in the two rungs with cam holes", detail: "One thin dowel in each end, then onto the cam bolts between the posts.", add: camRungs.map((i) => `lR${i}`), fix: rungDowels(-1, camRungs, camDy), tools: ["hammer"], repeat: 2 },
    { title: "Push in the other three rungs", detail: "Two thin dowels in each end. Use the thin dowels here, not the thick ones.", add: plainRungs.map((i) => `lR${i}`), fix: rungDowels(-1, plainRungs, plainDy), tools: ["hammer"], repeat: 2 },
    { title: "Turn the cam locks", detail: "Four of them, in the two cam rungs. Arrow towards the bolt, then turn clockwise until tight.", fix: cams("l", -1), tools: ["screwdriver"], repeat: 2 },
    { title: "Screw a foot into each post", detail: "Into the bottom end, by hand. You can level the unit with them later.", fix: [feet("l", -1)], repeat: 2, kind: "legs" },
    {
      title: "Tap thick dowels into two shelves",
      detail: "Two in each end of the shelves that go second and fourth from the bottom. Thick dowels here.",
      add: camRungs.map((i) => `S${i}`),
      fix: shelfDowels(camRungs, -1, undefined, true).concat(shelfDowels(camRungs, 1, undefined, true)),
      tools: ["hammer"],
      pose: "+z",
    },
    { title: "Push them into one side ladder", detail: "Stand the ladder on its long edge and push the two shelves in at the cam rungs, slats facing the same way.", kind: "join", warnings: ["floor"] },
    {
      title: "Add the other three shelves",
      detail: "Two thin dowels in each end, then push them in at the top, middle and bottom.",
      add: plainRungs.map((i) => `S${i}`),
      fix: shelfDowels(plainRungs, -1, undefined, false).concat(shelfDowels(plainRungs, 1, undefined, false)),
      tools: ["hammer"],
    },
    { title: "Screw this side to the shelves", detail: "Six long screws through the posts into the top, middle and bottom shelves, with the Allen key.", fix: [longScrews(-1)], tools: ["allen"] },
    {
      title: "Fit the other ladder and screw it on",
      detail: "Built like the first. Press it onto the shelf dowels, then six more long screws.",
      add: sideIds("r"),
      fix: [...camBolts("r", 1), ...rungDowels(1, [0, 1, 2, 3, 4], allDy), ...cams("r", 1), feet("r", 1), longScrews(1)],
      tools: ["allen"],
    },
    { title: "Stand it against the wall and mark it", detail: "Mark the wall just under the top shelf's back cleat, in the middle.", pose: "+y", tools: ["pencil"], warnings: ["tip"] },
    {
      title: "Screw the strap to the wall",
      detail: "Wall screws and plugs aren't included: pick ones made for your wall.",
      fix: [
        { kind: "plug", count: 1, at: [pt(0, sy - 30, wz - 20)], dir: [0, 0, -1] },
        { ...W_SCREW, count: 1, at: [pt(0, sy - 30, wz - 16)], dir: [0, 0, -1] },
        { kind: "strap", count: 1, at: [pt(0, sy, wz)], dir: [0, 0, 1] },
      ],
      tools: ["drill", "screwdriver"],
      wall: true,
      warnings: ["wall", "tip"],
    },
    { title: "Screw the strap to the top shelf", detail: "One screw with its washer through the strap into the back cleat.", fix: [{ kind: "screw", count: 1, len: 16, dia: 4, on: "S4", at: [pt(0, sy, -pz - 12)], dir: [0, 0, 1] }], tools: ["screwdriver"], wall: true },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["MUSKAN"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/^muskan-bench/.test(slug)) return bench(s);
    if (/^muskan-storage-stool/.test(slug)) return storageStool(s);
    if (/^muskan-shelving-unit/.test(slug)) return shelving(s);
    return null;
  },
};
export default family;
