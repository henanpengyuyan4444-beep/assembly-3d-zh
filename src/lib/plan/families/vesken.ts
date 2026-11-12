import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * VESKEN, read from the shelf unit's and the trolley's manuals. No tools: feet (or castors, each clicked into its
 * holder first) click under the corners of the bottom tray, four posts click into its corners, the next tray is
 * pressed down onto them, and so on up; caps close the top. The shelf unit is then hooked to the wall: two clips
 * screwed to the wall 24 cm apart, and two wire hooks from the clips over the back of the top tray.
 */

const POST = 26; // posts and the trays' corner sleeves, square
const TRAY = 50; // tray height

function tray(id: string, W: number, D: number, y: number): CustomPart {
  const iw = W - 2 * POST, id_ = D - 2 * POST, c = TRAY / 2;
  const pieces: PartPiece[] = [
    { shape: "box", size: [iw, 4, id_ + 8], pos: [0, -c + 12, 0] },
    { shape: "box", size: [iw, TRAY - 6, 4], pos: [0, 3, -D / 2 + POST / 2] },
    { shape: "box", size: [iw, TRAY - 6, 4], pos: [0, 3, D / 2 - POST / 2] },
    { shape: "box", size: [4, TRAY - 6, id_], pos: [-W / 2 + POST / 2, 3, 0] },
    { shape: "box", size: [4, TRAY - 6, id_], pos: [W / 2 - POST / 2, 3, 0] },
    // the rim round the top edge and the corner sleeves the posts click into
    { shape: "box", size: [iw, 6, POST], pos: [0, c - 3, -D / 2 + POST / 2] },
    { shape: "box", size: [iw, 6, POST], pos: [0, c - 3, D / 2 - POST / 2] },
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): PartPiece => ({ shape: "box", size: [POST, TRAY, POST], pos: [sx * (W / 2 - POST / 2), 0, sz * (D / 2 - POST / 2)] }))),
  ];
  return { id, name: "Tray", size: [W, TRAY, D], pos: [0, y + c, 0], pieces, material: "board" };
}

function recipe(s: ProductSpec): CustomParams | null {
  const t = `${s.slug ?? ""} ${s.variant}`.toLowerCase();
  const trolley = /trolley/.test(t);
  if (!trolley && !/shelf/.test(t)) return null;
  // IKEA: the shelf unit 36.7 x 23.3, 100.6 high, 30 cm between trays; the trolley 54 x 18, 71 high
  const W = trolley ? 540 : 367, D = trolley ? 180 : 233, H = trolley ? 710 : 1006;
  const cap = 6;
  const base = trolley ? 70 : 50; // castors or feet under the bottom tray
  const n = trolley ? 3 : 4;
  const pitch = (H - cap - TRAY - base) / (n - 1);
  const ys = Array.from({ length: n }, (_, i) => base + i * pitch);
  const corners: [number, number][] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): [number, number] => [sx * (W / 2 - POST / 2), sz * (D / 2 - POST / 2)]));

  const parts: CustomPart[] = [];
  ys.forEach((y, i) => parts.push(tray(`T${i}`, W, D, y)));
  const postIds: string[][] = [];
  for (let i = 0; i < n - 1; i++) {
    const y0 = ys[i] + TRAY, y1 = ys[i + 1];
    postIds.push(corners.map((_, k) => `P${i}_${k}`));
    corners.forEach(([x, z], k) => parts.push({ id: `P${i}_${k}`, name: "Post", size: [POST - 4, y1 - y0, POST - 4], pos: [x, (y0 + y1) / 2, z], material: "board" }));
  }
  if (!trolley) corners.forEach(([x, z], k) => parts.push({ id: `F${k}`, name: "Foot", size: [POST - 2, base, POST - 2], pos: [x, base / 2, z], material: "board" }));

  const yTop = ys[n - 1] + TRAY;
  const caps: CustomFix = { kind: "cap", count: 4, len: cap, dia: POST - 4, at: corners.map(([x, z]): Vec3 => [x, yTop, z]), dir: [0, -1, 0], on: `T${n - 1}` };
  const steps: CustomStep[] = [];
  if (trolley) {
    steps.push({
      title: "Click the castors under the bottom tray",
      detail: "First push each castor's pin up into its holder until it clicks. Then match the L and R marks on the holders with the ones under the tray's corners.",
      add: ["T0"],
      fix: [{ kind: "castor", count: 4, len: base, dia: 50, at: corners.map(([x, z]): Vec3 => [x, base, z]), dir: [0, 1, 0], on: "T0" }],
    });
  } else {
    steps.push({ title: "Click the feet under the bottom tray", detail: "One under each corner, pushed up until it clicks.", add: ["T0", ...corners.map((_, k) => `F${k}`)] });
  }
  for (let i = 0; i < n - 1; i++) {
    steps.push({ title: "Click four posts into the tray's corners", detail: "Push each one straight down until it clicks.", add: postIds[i] });
    steps.push({ title: i === n - 2 ? "Press the top tray onto the posts" : "Press the next tray onto the posts", detail: "Line up all four corners, then press down evenly until it sits.", add: [`T${i + 1}`] });
  }
  steps.push({ title: "Press the caps onto the top corners", detail: "One into each corner of the top tray.", fix: [caps] });
  if (!trolley) {
    const yc = yTop - 20, zw = -D / 2;
    const xs = [-120, 120];
    steps.push({ title: "Stand it against the wall", detail: "Where it will stay, with the back of the top tray touching the wall.", warnings: ["tip"] });
    steps.push({
      title: "Mark and drill for the wall clips",
      detail: "Two clips, 24 cm apart and level, just under the top tray's back edge. Wall screws and plugs aren't included: pick ones made for your wall.",
      fix: [{ kind: "plug", count: 2, at: xs.map((x): Vec3 => [x, yc, zw - 40]), dir: [0, 0, -1] }],
      tools: ["pencil", "level", "drill"],
      wall: true,
      warnings: ["wall"],
    });
    steps.push({
      title: "Screw the clips to the wall",
      detail: "One screw through each clip, not too tight yet.",
      fix: [
        { kind: "bracket", name: "Wall clip", count: 2, len: 20, dia: 30, at: xs.map((x): Vec3 => [x, yc, zw - 2]), dir: [0, 0, -1] },
        { kind: "screw", count: 2, len: 50, dia: 5, at: xs.map((x): Vec3 => [x, yc, zw + 6]), dir: [0, 0, -1] },
      ],
      tools: ["screwdriver"],
      wall: true,
    });
    steps.push({
      title: "Hook the wires over the top tray",
      detail: "One end into each clip, the other over the back rim of the top tray.",
      fix: [{ kind: "hook", name: "Wire hook", count: 2, len: 40, dia: 4, at: xs.map((x): Vec3 => [x, yTop, zw + POST / 2]), dir: [0, -1, 0], on: `T${n - 1}` }],
      wall: true,
      warnings: ["wall", "tip"],
    });
  }
  return { parts, steps };
}

const family: Family = { names: ["VESKEN"], recipe };
export default family;
