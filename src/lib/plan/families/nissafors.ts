import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/*
 * NISSAFORS trolley (steel), read from its two manuals: the 50.5x30x83 (four castors) and the slim 50.5x19x67
 * (two castors, plain feet at the other end). Each of the three trays (two shallow ones and the deep bottom box)
 * is put together from a mesh bottom and four rims: the end rims first, each held by a push rivet, then the side
 * rims with two rivets each. The trolley is built lying on one end: the trays stand on an end frame and are bolted
 * to it (eight bolts), it is turned over onto the other end frame (eight more), every bolt is tightened, and the
 * castors click into the tubes with it upside down.
 * IKEA's sizes: 50.5 x 30 x 83 and 50.5 x 19 x 67 cm.
 */

const T = 20; // frame tubes
const SH = 3; // sheet

const BOLT = { kind: "bolt" as const, len: 12, dia: 6 };
const RIVET = { kind: "clip" as const, name: "Push rivet", len: 10, dia: 10 };
const RIVET_PIN = { kind: "cap" as const, name: "Rivet pin", len: 8, dia: 8 };

function recipe(s: ProductSpec) {
  const slug = s.slug ?? "";
  if (!/^nissafors-trolley/.test(slug)) return null;
  const slim = /19-x-67/.test(slug);
  const L = 505, D = slim ? 190 : 300, H = slim ? 670 : 830;
  const CY = 75; // castors
  const xf = L / 2 - T / 2, zf = D / 2 - T / 2;
  const Lt = L - 2 * T; // trays fit between the end frames
  const parts: CustomPart[] = [];

  // the trays: [bottom of the tray, rim height]
  const trays: { id: string; y: number; h: number; deep: boolean }[] = slim
    ? [
        { id: "A", y: H - 160, h: 40, deep: false },
        { id: "B", y: H * 0.5, h: 40, deep: false },
        { id: "C", y: CY + 40, h: 170, deep: true },
      ]
    : [
        { id: "A", y: H - 190, h: 40, deep: false },
        { id: "B", y: H * 0.47, h: 40, deep: false },
        { id: "C", y: CY + 40, h: 190, deep: true },
      ];
  for (const t of trays) {
    parts.push({ id: `${t.id}M`, name: "Mesh bottom", size: [Lt - 2 * SH, SH, D - 2 * SH], pos: [0, t.y + SH / 2, 0], material: "metal" });
    for (const ex of [-1, 1]) parts.push({ id: `${t.id}E${ex}`, name: t.deep ? "Box end" : "End rim", size: [SH, t.h, D], pos: [ex * (Lt / 2 - SH / 2), t.y + t.h / 2, 0], material: "metal" });
    for (const ez of [-1, 1]) parts.push({ id: `${t.id}S${ez}`, name: t.deep ? "Box side" : "Side rim", size: [Lt - 2 * SH, t.h, SH], pos: [0, t.y + t.h / 2, ez * (D / 2 - SH / 2)], material: "metal" });
  }

  // the end frames: two uprights, a handle bar on top and a bar at the bottom
  const frame = (ex: number, feet: boolean): CustomPart => {
    const y0 = feet ? 0 : CY;
    const hU = H - y0;
    return {
      id: `F${ex}`,
      name: feet ? "End frame with feet" : "End frame",
      size: [T, hU, D],
      pos: [ex * xf, y0 + hU / 2, 0],
      material: "metal",
      pieces: [
        ...[-1, 1].map((ez) => ({ shape: "box" as const, size: [T, hU, T] as Vec3, pos: [0, 0, ez * zf] as Vec3 })),
        { shape: "box", size: [T, T, D - 2 * T], pos: [0, hU / 2 - T / 2, 0] },
        { shape: "box", size: [T, T, D - 2 * T], pos: [0, CY + 40 - y0 - hU / 2 + T / 2, 0] },
      ],
    };
  };
  parts.push(frame(-1, slim), frame(1, false));

  const frameBolts = (ex: number): CustomFix => {
    const at = trays.flatMap((t) => (t.deep ? [t.y + 40, t.y + t.h - 40] : [t.y + t.h / 2]).flatMap((y) => [-1, 1].map((ez): Vec3 => [ex * (L / 2), y, ez * zf])));
    return { ...BOLT, count: at.length, at, dir: [-ex, 0, 0], on: `F${ex}` };
  };
  const rivets = (pts: Vec3[]): CustomFix[] => [
    { ...RIVET, count: pts.length, at: pts, dir: [0, 1, 0] },
    { ...RIVET_PIN, count: pts.length, at: pts, dir: [0, 1, 0] },
  ];
  const castorPts = (slim ? [1] : [-1, 1]).flatMap((ex) => [-1, 1].map((ez): Vec3 => [ex * xf, CY, ez * zf]));

  const steps: CustomStep[] = [
    {
      title: "Push the end rims onto the mesh bottoms",
      detail: "Do the same for all three trays: two shallow ones and the deep box. The rims' flanges go under the mesh.",
      add: trays.flatMap((t) => [`${t.id}M`, `${t.id}E-1`, `${t.id}E1`]),
    },
    { title: "Click in a rivet at each end", detail: "Push the sleeve up through the mesh and the rim, then press the pin in until it clicks.", fix: rivets(trays.flatMap((t) => [-1, 1].map((ex): Vec3 => [ex * (Lt / 2 - 15), t.y, 0]))) },
    { title: "Slide on the side rims", detail: "Their ends tuck inside the end rims.", add: trays.flatMap((t) => [`${t.id}S-1`, `${t.id}S1`]) },
    { title: "Click in four more rivets", detail: "Two along each side of every tray.", fix: rivets(trays.flatMap((t) => [-1, 1].flatMap((ez) => [-1, 1].map((d): Vec3 => [d * (Lt / 4), t.y, ez * (D / 2 - 15)])))) },
    {
      title: "Bolt the trays to an end frame",
      detail: "Lay the frame on a rug and stand the trays on their ends on it, the deep box at the bottom end. Eight bolts, loose for now.",
      add: ["F-1"],
      fix: [frameBolts(-1)],
      tools: ["allen"],
      pose: "+x",
      warnings: ["floor"],
    },
    {
      title: "Turn it over and bolt on the other end frame",
      detail: slim ? "This one has the castor sockets. Eight bolts again." : "Eight bolts again.",
      add: ["F1"],
      fix: [frameBolts(1)],
      tools: ["allen"],
      pose: "-x",
    },
    { title: "Tighten all sixteen bolts", detail: "Until the heads sit flat on the frames.", tools: ["allen"] },
    {
      title: slim ? "Click in the two castors" : "Click in the castors",
      detail: slim ? "Turn the trolley upside down and push them into the tubes at the end without feet, until they click." : "Turn the trolley upside down and push one into each tube until it clicks.",
      fix: [{ kind: "castor", count: castorPts.length, at: castorPts, dir: [0, 1, 0] }],
      pose: "-y",
    },
    { title: "Stand it up", detail: "Check the castors turn freely.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["NISSAFORS"],
  recipe,
};
export default family;
