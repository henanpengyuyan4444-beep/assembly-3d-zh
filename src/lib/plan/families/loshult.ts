import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LOSHULT, read from the trolley's manual. Solid pine, built lying on its side: dowels go into both ends of the six
 * tier rails, the rails stand in one side ladder (two legs and three cross rails) lying on a rug, the three shelf
 * bottoms slide down into their grooves, and the other ladder goes on top with six screws. Turned over, six more
 * screws go into the first ladder, then two plain castors and two braking ones are screwed into the legs with a
 * washer each, using the spanner.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const leg = 38, rail = 18, rh = 100, castor = 90;
  const xl = W / 2 - leg / 2, zl = D / 2 - leg / 2;
  const tiers = [castor + 10, Math.round((castor + H) / 2 - rh / 2), H - rh]; // bottom edge of each tier's rails
  const lh = H - castor;
  const ladder = (sx: number): CustomPart => {
    const pieces: PartPiece[] = [
      ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [leg, lh, leg], pos: [0, 0, sz * zl] })),
      ...tiers.map((y): PartPiece => ({ shape: "box", size: [rail, rh, D - 2 * leg], pos: [sx * (leg / 2 - rail / 2), y + rh / 2 - (castor + lh / 2), 0] })),
    ];
    return { id: sx < 0 ? "LL" : "LR", name: "Side ladder", size: [leg, lh, D], pos: [sx * xl, castor + lh / 2, 0], material: "wood", pieces };
  };
  const inner = W - 2 * leg;
  const parts: CustomPart[] = [ladder(-1), ladder(1)];
  const boards: string[] = [];
  tiers.forEach((y, i) =>
    [-1, 1].forEach((sz) => {
      const id = `R${i + 1}${sz < 0 ? "b" : "f"}`;
      boards.push(id);
      parts.push({ id, name: "Tier rail", size: [inner, rh, rail], pos: [0, y + rh / 2, sz * zl], material: "wood" });
    }),
  );
  const shelves = tiers.map((y, i) => {
    const id = `S${i + 1}`;
    parts.push({ id, name: "Shelf bottom", size: [inner, 12, D - 2 * leg], pos: [0, y + 16, 0], material: "wood" });
    return id;
  });
  const railOf = (id: string) => parts.find((p) => p.id === id)!;
  // one end of every rail, then the other (a step takes ten fittings groups at most)
  const dowels = (sx: number) =>
    boards.map((id) => {
      const p = railOf(id);
      return fx("dowel", [p.pos[1] - 25, p.pos[1] + 25].map((y): Vec3 => [sx * (inner / 2), y, p.pos[2]]), [sx, 0, 0], id, { mate: sx < 0 ? "LL" : "LR" });
    });
  const screws = (sx: number) => boards.map((id) => fx("bolt", [[sx * (W / 2), railOf(id).pos[1], railOf(id).pos[2]]], [-sx, 0, 0], sx < 0 ? "LL" : "LR", { name: "Allen screw", len: 70, dia: 6, mate: id }));
  const legEnds = (sx: number): Vec3[] => [-1, 1].map((sz): Vec3 => [sx * xl, castor, sz * zl]);
  const castorFix = (sx: number, name: string) => [
    fx("washer", legEnds(sx), [0, 1, 0], sx < 0 ? "LL" : "LR", { len: 2, dia: 18 }),
    fx("castor", legEnds(sx), [0, 1, 0], sx < 0 ? "LL" : "LR", { name, len: castor, dia: 75 }),
  ];
  const fromUp: Vec3 = [320, 0, 0]; // the unit lies on its left side, so up is to the right
  const steps: CustomStep[] = [
    {
      title: "Push dowels into one end of each rail",
      detail: "Two in the end of each of the six rails, pressed in by hand on a rug.",
      wait: boards,
      fix: dowels(-1),
      pose: "+x",
      warnings: ["floor"],
      from: Object.fromEntries(boards.map((id) => [id, fromUp])),
    },
    { title: "Push dowels into the other ends", detail: "Two more in each rail, so every rail has four.", fix: dowels(1) },
    {
      title: "Stand the rails in a side ladder",
      detail: "Lay one ladder flat on the rug and push the six rails into its holes, grooves facing in.",
      add: ["LL", ...boards],
      from: Object.fromEntries(boards.map((id) => [id, fromUp])),
    },
    {
      title: "Slide in the shelf bottoms",
      detail: "Down into the grooves of each pair of rails, with the grain running from end to end.",
      add: shelves,
      from: Object.fromEntries(shelves.map((id) => [id, fromUp])),
    },
    {
      title: "Screw on the other ladder",
      detail: "Lay it on top so every dowel finds its hole, then six screws through the legs with the Allen key.",
      add: ["LR"],
      fix: screws(1),
      tools: ["allen"],
      from: { LR: fromUp },
    },
    { title: "Turn it over and screw the first ladder", detail: "Six more screws, the same way.", fix: screws(-1), tools: ["allen"], pose: "-x" },
    {
      title: "Screw in the two plain castors",
      detail: "Into the ends of two legs, each with a washer, tightened with the spanner.",
      fix: castorFix(-1, "Castor"),
      tools: ["wrench"],
    },
    {
      title: "Screw in the two braking castors",
      detail: "Into the other two legs, the same way.",
      fix: castorFix(1, "Braking castor"),
      tools: ["wrench"],
    },
    { title: "Stand it on its castors", detail: "Press the brakes down to park it, lift them to roll it.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["LOSHULT"],
  recipe(s) {
    if (!/trolley/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
