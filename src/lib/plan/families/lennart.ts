import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LENNART, read from the drawer unit's manual. A steel frame: two welded side frames (uprights, a bottom rail and
 * three runners) are joined by two bottom crossbars, four screws, and the mesh top goes on with four more. Lying on
 * its front, the X brace is screwed across the back uprights and two castors are pushed into them. Each of the three
 * mesh drawers is a tray whose sides fold up, with a front and a back slid onto the edges and fastened with
 * push rivets, eight to a drawer, then the drawers slide onto the runners.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string | undefined, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });
const SCREW = { len: 10, dia: 6 };

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const t = 20; // square tube
  const topT = 15, yTop = H - topT;
  const xf = W / 2 - t / 2, zf = D / 2 - t / 2;
  const castorH = 45;
  const tops = [516, 362, 206].map((y) => (y * H) / 560); // drawer rims, from the top drawer down
  const dh = (127 * H) / 560;
  const side = (sx: number): CustomPart => {
    const pieces: PartPiece[] = [
      { shape: "box", size: [t, yTop, t], pos: [0, yTop / 2, zf] },
      { shape: "box", size: [t, yTop - castorH, t], pos: [0, (yTop + castorH) / 2, -zf] },
      { shape: "box", size: [t, t, D - 2 * t], pos: [0, castorH + t / 2, 0] },
      ...tops.map((y): PartPiece => ({ shape: "box", size: [16, 6, D - 2 * t], pos: [-sx * (t / 2 + 2), y - 3, 0] })),
    ];
    return { id: sx < 0 ? "SFL" : "SFR", name: "Side frame", size: [t, yTop, D], pos: [sx * xf, yTop / 2, 0], material: "metal", pieces: pieces.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] - yTop / 2, p.pos[2]] as Vec3 })) };
  };
  const inner = W - 2 * t;
  const braceA: Vec3 = [-xf, yTop - 30, -D / 2], braceB: Vec3 = [xf, castorH + 50, -D / 2];
  const bl = Math.hypot(braceB[0] - braceA[0], braceB[1] - braceA[1]);
  const ang = Math.atan2(braceB[1] - braceA[1], braceB[0] - braceA[0]);
  const yBrace = (braceA[1] + braceB[1]) / 2;
  const parts: CustomPart[] = [
    side(-1),
    side(1),
    { id: "CBF", name: "Crossbar", size: [inner, t, t], pos: [0, t / 2, zf], material: "metal" },
    { id: "CBB", name: "Crossbar", size: [inner, t, t], pos: [0, castorH + t / 2, -zf], material: "metal" },
    { id: "TOP", name: "Mesh top", size: [W, topT, D], pos: [0, yTop + topT / 2, 0], material: "metal" },
    { id: "XB1", name: "Brace", size: [bl, 16, 3], pos: [0, yBrace, -D / 2 - 2], rot: [0, 0, ang], material: "metal" },
    { id: "XB2", name: "Brace", size: [bl, 16, 3], pos: [0, yBrace, -D / 2 - 5], rot: [0, 0, -ang], material: "metal" },
  ];
  // drawers: a tray with its sides folded up, and a front and a back
  const dw = inner - 10, dd = D - 2 * t - 10;
  const drawers = tops.map((top, i) => {
    const y0 = top - dh;
    const n = i + 1;
    parts.push(
      {
        id: `T${n}`,
        name: "Drawer tray",
        size: [dw, dh, dd],
        pos: [0, y0 + dh / 2, 0],
        material: "metal",
        pieces: [
          { shape: "box", size: [dw, 3, dd], pos: [0, -dh / 2 + 1.5, 0] },
          ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [3, dh, dd], pos: [sx * (dw / 2 - 1.5), 0, 0] })),
        ],
      },
      { id: `F${n}`, name: "Drawer front", size: [inner - 2, dh, 12], pos: [0, y0 + dh / 2, dd / 2 - 6], material: "metal" },
      { id: `B${n}`, name: "Drawer back", size: [inner - 2, dh, 12], pos: [0, y0 + dh / 2, -dd / 2 + 6], material: "metal" },
    );
    const sidePts: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (dw / 2), y0 + dh / 2, sz * (dd / 2 - 6)]));
    const botPts: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (dw / 2 - 40), y0 + 3, sz * (dd / 2 - 6)]));
    return { n, sidePts, botPts, ids: [`T${n}`, `F${n}`, `B${n}`] };
  });
  const rivets = (kind: "clip" | "cap", name: string, len: number, dia: number) =>
    drawers.flatMap((d) => [
      ...[-1, 1].map((sx) => fx(kind, d.sidePts.filter((p) => Math.sign(p[0]) === sx), [-sx, 0, 0], `T${d.n}`, { name, len, dia })),
      fx(kind, d.botPts, [0, -1, 0], `T${d.n}`, { name, len, dia }),
    ]);
  const ends = (y: number, z: number) => [-1, 1].map((sx) => fx("screw", [[sx * (W / 2), y, z]], [-sx, 0, 0], sx < 0 ? "SFL" : "SFR", SCREW));
  const away: Vec3 = [0, 0, 420];
  const fromAll = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, away]));
  const trays = drawers.map((d) => `T${d.n}`), fb = drawers.flatMap((d) => [`F${d.n}`, `B${d.n}`]);
  const steps: CustomStep[] = [
    {
      title: "Set the crossbars between the side frames",
      detail: "Runners facing in. One crossbar goes at the bottom of the front uprights, the other at the back, holes to the outside.",
      add: ["SFL", "SFR", "CBF", "CBB"],
    },
    { title: "Screw the crossbars on", detail: "One screw through each upright into the end of a crossbar.", fix: [...ends(t / 2, zf), ...ends(castorH + t / 2, -zf)], tools: ["screwdriver"] },
    { title: "Lay the mesh top on", detail: "Folded edges down, over the tops of all four uprights.", add: ["TOP"], from: { TOP: [0, 260, 0] } },
    { title: "Screw the top on", detail: "One screw at each corner, through the folded edge into the upright.", fix: [...ends(yTop - 8, zf), ...ends(yTop - 8, -zf)], tools: ["screwdriver"] },
    {
      title: "Screw the brace across the back",
      detail: "Lay the frame on its front on a rug. The two bars cross in an X, one screw at each end into the back uprights.",
      add: ["XB1", "XB2"],
      fix: [fx("screw", [braceA, braceB, [braceB[0] * -1, braceB[1], braceB[2]], [braceA[0] * -1, braceA[1], braceA[2]]].map((p): Vec3 => [p[0], p[1], p[2] - 6]), [0, 0, 1], undefined, SCREW)],
      tools: ["screwdriver"],
      pose: "-z",
      warnings: ["floor"],
      from: { XB1: [0, 0, -260], XB2: [0, 0, -260] },
    },
    {
      title: "Push the castors into the back uprights",
      detail: "Into the open ends at the bottom, until they click. Only the back uprights take castors.",
      fix: [-1, 1].map((sx) => fx("castor", [[sx * xf, castorH, -zf]], [0, 1, 0], sx < 0 ? "SFL" : "SFR", { len: castorH, dia: 40 })),
    },
    { title: "Stand it up", detail: "On its front feet and the two castors.", pose: "+y" },
    {
      title: "Fold up the sides of each drawer tray",
      detail: "Press the tray flat and fold one side up along the line, then the other. The folds point the same way on all three.",
      wait: trays,
      from: fromAll(trays),
    },
    {
      title: "Slide the front and back onto each tray",
      detail: "Their grooves run down over the edges of the folded sides.",
      wait: fb,
      from: fromAll(fb),
    },
    {
      title: "Push in the rivet sleeves",
      detail: "Eight on each drawer: four through the sides into the front and back, four down through the bottom.",
      fix: rivets("clip", "Rivet sleeve", 10, 8),
    },
    { title: "Press a pin into each sleeve", detail: "Push until it clicks, so the sleeve spreads and holds.", fix: rivets("cap", "Rivet pin", 4, 10) },
    {
      title: "Slide the drawers onto the runners",
      detail: "The lips of the front and back rest on the runners. Push each drawer in until it stops.",
      add: [...trays, ...fb],
      from: fromAll([...trays, ...fb]),
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["LENNART"],
  recipe(s) {
    if (!/drawer unit/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
