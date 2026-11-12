import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LOTE, read from the 3-drawer chest's manual. A steel frame: the top is screwed to one side frame (its tube runs up
 * into a carrying handle), the two bottom rods go in, then the other side frame, two screws at each joint. Each drawer
 * is a plastic sheet: the sides and ends fold up and every corner is screwed through a nut, the front folds up, two
 * corner profiles are bolted onto its edges, and a hanger bar is screwed across the back with a spacer and nut at each
 * screw. The drawers hang on their bars in the frame's runners, and an X brace is screwed across the back.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const t = 20, xf = W / 2 - t / 2, zf = D / 2 - t / 2;
  const yTop = H - 75, topT = 18; // the top board, under the handles
  // drawers from the top down: two shallow ones and a deep one
  const rims = [yTop - 6, yTop - 6 - 140, yTop - 6 - 285];
  const hts = [134, 140, 205];
  const dw = W - 2 * t - 30, dd = D - 40, dz = -10;
  const side = (sx: number): CustomPart => {
    const pieces: PartPiece[] = [
      ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [t, H - t, t], pos: [0, (H - t) / 2, sz * zf] })),
      { shape: "box", size: [t, t, D], pos: [0, H - t / 2, 0] },
      ...rims.map((y): PartPiece => ({ shape: "box", size: [10, 5, D - 2 * t], pos: [-sx * (t / 2 + 5), y - 2.5, 0] })),
    ];
    return { id: sx < 0 ? "SFL" : "SFR", name: "Side frame", size: [t, H, D], pos: [sx * xf, H / 2, 0], material: "metal", pieces: pieces.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] - H / 2, p.pos[2]] as Vec3 })) };
  };
  const inner = W - 2 * t;
  const braceL = Math.hypot(inner, yTop - 60), ang = Math.atan2(yTop - 60, inner);
  const parts: CustomPart[] = [
    side(-1),
    side(1),
    {
      id: "TOP",
      name: "Top",
      size: [inner, topT + 12, D - 2 * t],
      pos: [0, yTop + topT / 2 - 6, 0],
      material: "board",
      pieces: [
        { shape: "box", size: [inner, topT, D - 2 * t], pos: [0, 6, 0] },
        { shape: "box", size: [inner, 12, 16], pos: [0, -9, D / 2 - t - 8], material: "metal" },
        { shape: "box", size: [inner, 12, 16], pos: [0, -9, -D / 2 + t + 8], material: "metal" },
      ],
    },
    ...[-1, 1].map((sz): CustomPart => ({ id: sz < 0 ? "RB" : "RF", name: "Bottom rod", size: [inner, 12, 12], pos: [0, 30, sz * zf], shape: "cyl", material: "metal" })),
    { id: "XB1", name: "Brace", size: [braceL, 14, 3], pos: [0, (yTop + 60) / 2, -D / 2 - 2], rot: [0, 0, ang], material: "metal" },
    { id: "XB2", name: "Brace", size: [braceL, 14, 3], pos: [0, (yTop + 60) / 2, -D / 2 - 5], rot: [0, 0, -ang], material: "metal" },
  ];
  const drawers = rims.map((rim, i) => {
    const n = i + 1, h = hts[i], y0 = rim - h, ym = y0 + h / 2;
    const zFront = dz + dd / 2, zBack = dz - dd / 2;
    parts.push(
      { id: `DB${n}`, name: "Drawer", size: [dw, h, dd], pos: [0, ym, dz], material: "fiber" },
      ...[-1, 1].map((sx): CustomPart => ({ id: `P${n}${sx < 0 ? "L" : "R"}`, name: "Corner profile", size: [22, h, 10], pos: [sx * (dw / 2 - 8), ym, zFront + 5], material: "fiber" })),
      {
        id: `H${n}`,
        name: "Drawer hanger",
        size: [inner - 12, 40, 12],
        pos: [0, rim - 20, zBack - 6],
        material: "metal",
        pieces: [
          { shape: "cyl", size: [10, inner - 12, 10], pos: [0, 15, 0], rot: [0, 0, Math.PI / 2] },
          ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [40, 40, 4], pos: [sx * (dw / 2 - 50), 0, 4] })),
        ],
      },
    );
    const corners = (sx: number, x: number): Vec3[] => [zFront - 15, zBack + 15].map((z): Vec3 => [sx * x, ym, z]);
    const front: Vec3[] = [-1, 1].flatMap((sx) => [y0 + 25, rim - 25].map((y): Vec3 => [sx * (dw / 2 - 8), y, zFront + 10]));
    const back: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((k): Vec3 => [sx * (dw / 2 - 50) + k * 12, rim - 20, zBack]));
    return { n, id: `DB${n}`, corners, front, back };
  });
  const sideScrews = (sx: number, y: number, len: number) => fx("screw", [-1, 1].map((sz): Vec3 => [sx * (W / 2), y, sz * (zf - 25)]), [-sx, 0, 0], sx < 0 ? "SFL" : "SFR", { len, dia: 6 });
  const away: Vec3 = [0, 0, 460];
  const ids = (f: (d: (typeof drawers)[number]) => string[]) => drawers.flatMap(f);
  const boxes = ids((d) => [d.id]), profiles = ids((d) => [`P${d.n}L`, `P${d.n}R`]), hangers = ids((d) => [`H${d.n}`]);
  const off = (list: string[]) => Object.fromEntries(list.map((id) => [id, away]));
  const steps: CustomStep[] = [
    { title: "Screw the top to one side frame", detail: "Two short screws through the side frame into the top's rails.", add: ["SFL", "TOP"], fix: [sideScrews(-1, yTop - 9, 20)], tools: ["screwdriver"] },
    { title: "Fit the bottom rods", detail: "Push them into the bottom of the side frame and fix each with a long screw.", add: ["RB", "RF"], fix: [{ ...sideScrews(-1, 30, 40), at: [-1, 1].map((sz): Vec3 => [-W / 2, 30, sz * zf]) }], tools: ["screwdriver"] },
    { title: "Screw on the other side frame", detail: "Over the top and the rod ends, then two short screws into the top.", add: ["SFR"], fix: [sideScrews(1, yTop - 9, 20)], tools: ["screwdriver"], from: { SFR: [300, 0, 0] } },
    { title: "Screw the bottom rods to it", detail: "One long screw into each rod.", fix: [{ ...sideScrews(1, 30, 40), at: [-1, 1].map((sz): Vec3 => [W / 2, 30, sz * zf]) }], tools: ["screwdriver"] },
    { title: "Fold up the sides of each drawer", detail: "Lay the sheet flat, fold the long sides up, then the ends, with the tabs on the outside.", wait: boxes, from: off(boxes) },
    {
      title: "Push a nut into each corner",
      detail: "From the inside, into the four corner holes of every drawer.",
      fix: drawers.flatMap((d) => [-1, 1].map((sx) => fx("washer", d.corners(sx, dw / 2 - 2), [sx, 0, 0], d.id, { name: "Nut", len: 5, dia: 12 }))),
    },
    {
      title: "Screw the corners together",
      detail: "One screw from the outside into each nut. Hold the nut while you turn.",
      fix: drawers.flatMap((d) => [-1, 1].map((sx) => fx("screw", d.corners(sx, dw / 2), [-sx, 0, 0], d.id, { len: 12, dia: 5 }))),
      tools: ["screwdriver"],
    },
    { title: "Fold up the fronts", detail: "Fold the front of each drawer up so it stands against the sides." },
    { title: "Push the corner profiles on", detail: "Down over the front edges, one each side, the holes lined up.", wait: profiles, from: off(profiles) },
    {
      title: "Bolt the profiles on",
      detail: "Four short bolts in each drawer front, a nut inside on each one.",
      fix: drawers.flatMap((d) => [fx("screw", d.front, [0, 0, -1], d.id, { name: "Bolt", len: 10, dia: 5 }), fx("washer", d.front.map((p): Vec3 => [p[0], p[1], p[2] - 18]), [0, 0, 1], d.id, { name: "Nut", len: 5, dia: 12 })]),
      tools: ["screwdriver"],
    },
    {
      title: "Screw a hanger across each drawer's back",
      detail: "Four screws through the back wall, with a spacer and a nut on each.",
      wait: hangers,
      from: off(hangers),
      fix: drawers.flatMap((d) => [
        fx("screw", d.back.map((p): Vec3 => [p[0], p[1], p[2] + 4]), [0, 0, -1], d.id, { len: 12, dia: 5 }),
        fx("spacer", d.back.map((p): Vec3 => [p[0], p[1], p[2] - 4]), [0, 0, 1], d.id, { name: "Spacer", len: 6, dia: 14 }),
        fx("washer", d.back.map((p): Vec3 => [p[0], p[1], p[2] - 10]), [0, 0, 1], d.id, { name: "Nut", len: 5, dia: 12 }),
      ]),
      tools: ["screwdriver"],
    },
    {
      title: "Hang the drawers in the frame",
      detail: "Rest each hanger's ends on the runners and push the drawer in. The deep one goes at the bottom.",
      add: [...boxes, ...profiles, ...hangers],
      from: off([...boxes, ...profiles, ...hangers]),
    },
    {
      title: "Screw the brace across the back",
      detail: "The two bars cross in an X, one screw at each end into the back uprights.",
      add: ["XB1", "XB2"],
      fix: [-1, 1].map((sx) => fx("screw", [[sx * xf, yTop - 10, -D / 2 - 6], [sx * xf, 60, -D / 2 - 6]], [0, 0, 1], sx < 0 ? "SFL" : "SFR", { len: 10, dia: 5 })),
      tools: ["screwdriver"],
      from: { XB1: [0, 0, -260], XB2: [0, 0, -260] },
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["LOTE"],
  recipe(s) {
    if (!/drawer/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
