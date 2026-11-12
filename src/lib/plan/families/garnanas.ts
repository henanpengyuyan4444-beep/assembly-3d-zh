import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * GARNANÄS, read from the coffee table's manual. A box on four castors: two sides, a bottom, a shelf with an open
 * slot above it at the front, a low front panel under the shelf and a back panel above it, all on wooden dowels and
 * held with long Allen screws through the sides. It is built lying on its left side, the top goes on with cam bolts
 * and cam locks, then, upside down, four corner brackets are screwed under the bottom, the castor bolts are turned
 * into them with a spanner and the castors pushed on before it is turned over.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 65 x 65, 40 high
  const W = Math.round(s.size.w * 10) || 650, D = Math.round(s.size.d * 10) || 650, H = Math.round(s.size.h * 10) || 400;
  const t = 18, y0 = 55; // castors under the box
  const xi = W / 2 - t;
  const yTop = H - t; // underside of the top
  const yBot = y0 + t; // upper face of the bottom
  const shelfY = H - t - 115; // underside of the shelf
  const parts: CustomPart[] = [
    { id: "L", name: "Side panel", size: [t, yTop - y0, D], pos: [-W / 2 + t / 2, (y0 + yTop) / 2, 0] },
    { id: "R", name: "Side panel", size: [t, yTop - y0, D], pos: [W / 2 - t / 2, (y0 + yTop) / 2, 0] },
    { id: "F", name: "Front panel", size: [2 * xi, shelfY - yBot, t], pos: [0, (yBot + shelfY) / 2, D / 2 - t / 2] },
    { id: "S", name: "Shelf", size: [2 * xi, t, D], pos: [0, shelfY + t / 2, 0] },
    { id: "K", name: "Back panel", size: [2 * xi, yTop - shelfY - t, t], pos: [0, (shelfY + t + yTop) / 2, -D / 2 + t / 2] },
    { id: "B", name: "Bottom panel", size: [2 * xi, t, D], pos: [0, y0 + t / 2, 0] },
    { id: "T", name: "Top panel", size: [W, t, D], pos: [0, H - t / 2, 0] },
  ];
  const cx = W / 2 - 60, cz = D / 2 - 60;
  for (const [i, [sx, sz]] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).entries())
    parts.push({ id: `C${i + 1}`, name: "Castor", shape: "cyl", size: [45, y0, 45], pos: [sx * cx, y0 / 2, sz * cz], material: "metal" });

  // dowels in the ends of a panel, going into the sides; one end of each into the left side, the other into the right
  const ends = (on: string, y: number[], z: number, mate?: (sx: number) => string): CustomFix[] =>
    [-1, 1].map((sx) => ({ kind: "dowel", count: y.length, at: y.map((yy): Vec3 => [sx * xi, yy, z]), dir: [sx, 0, 0], on, mate: mate?.(sx) ?? (sx < 0 ? "L" : "R") }));
  const yF = [yBot + 40, shelfY - 40], yK = [shelfY + t + 25, yTop - 25];
  const mF = (yBot + shelfY) / 2, mK = (shelfY + t + yTop) / 2;
  const zF = D / 2 - t / 2, zK = -D / 2 + t / 2;
  const longScrew = (sx: number, y: number[], z: number, mate: string): CustomFix => ({
    kind: "screw",
    count: y.length,
    len: 50,
    dia: 7,
    name: "Long Allen screw",
    at: y.map((yy): Vec3 => [sx * (W / 2), yy, z]),
    dir: [-sx, 0, 0],
    on: sx < 0 ? "L" : "R",
    mate,
  });
  const zs = (n: number) => Array.from({ length: n }, (_, i) => -D / 2 + 70 + (i * (D - 140)) / (n - 1));
  const camPts = [-1, 1].flatMap((sx) => [-D / 2 + 60, D / 2 - 60].map((z): Vec3 => [sx * (W / 2 - t / 2), yTop, z]));
  const bracketPts = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * cx, y0, sz * cz]));
  return {
    parts,
    steps: [
      {
        title: "Tap dowels into the front and back panels",
        detail: "Two in each end of both panels.",
        fix: [...ends("F", yF, zF), ...ends("K", yK, zK)],
        wait: ["F", "K"],
        tools: ["hammer"],
      },
      {
        title: "Join the front panel to the left side",
        detail: "Lay the side on a rug, inside up. Push the panel onto its dowel and turn one long screw in through the side.",
        add: ["L", "F"],
        fix: [longScrew(-1, [mF], zF, "F")],
        tools: ["allen"],
        pose: "+x",
        warnings: ["floor"],
      },
      {
        title: "Tap ten dowels into the shelf",
        detail: "Five along each end.",
        fix: ends("S", [shelfY + t / 2], 0).map((f) => ({ ...f, count: 5, at: zs(5).map((z): Vec3 => [f.at![0][0], shelfY + t / 2, z]) })),
        wait: ["S"],
        tools: ["hammer"],
      },
      { title: "Push the shelf onto the side", detail: "Its dowels go into the row of holes just above the front panel.", add: ["S"] },
      {
        title: "Fit the back panel",
        detail: "On its dowel above the shelf, at the back edge. One long screw through the side holds it.",
        add: ["K"],
        fix: [longScrew(-1, [mK], zK, "K")],
        tools: ["allen"],
      },
      {
        title: "Tap dowels into the bottom panel",
        detail: "Four along each end.",
        fix: ends("B", [y0 + t / 2], 0).map((f) => ({ ...f, count: 4, at: zs(4).map((z): Vec3 => [f.at![0][0], y0 + t / 2, z]) })),
        wait: ["B"],
        tools: ["hammer"],
      },
      { title: "Push the bottom panel onto the side", detail: "Along the lower edge, its dowels in the holes.", add: ["B"] },
      {
        title: "Lay the other side on and screw it",
        detail: "Lower it onto all the dowels at once, then two long screws into the front and back panels.",
        add: ["R"],
        fix: [longScrew(1, [mF], zF, "F"), longScrew(1, [mK], zK, "K")],
        tools: ["allen"],
      },
      {
        title: "Screw the cam bolts into the top",
        detail: "Four, one near each corner of its underside, by hand until they stop.",
        fix: [{ kind: "camScrew", count: 4, at: camPts, dir: [0, -1, 0], on: "T", mate: "L" }],
        wait: ["T"],
        tools: ["screwdriver"],
      },
      {
        title: "Fit the top and lock it",
        detail: "Stand the box up and set the top on, bolts into the holes in the sides. Turn the four cam locks clockwise until tight.",
        add: ["T"],
        fix: [-1, 1].map((sx): CustomFix => ({ kind: "cam", count: 2, dia: 15, at: camPts.filter((p) => Math.sign(p[0]) === sx).map((p): Vec3 => [sx * xi, yTop - 25, p[2]]), dir: [-sx, 0, 0], on: sx < 0 ? "L" : "R" })),
        tools: ["screwdriver"],
        pose: "+y",
      },
      {
        title: "Screw a corner bracket under each corner",
        detail: "Turn the table upside down on a rug. Four screws through each bracket into the bottom.",
        fix: [
          { kind: "plate", count: 4, len: 12, dia: 70, name: "Corner bracket", at: bracketPts, dir: [0, 1, 0], on: "B" },
          { kind: "screw", count: 16, len: 16, dia: 4, at: bracketPts.flatMap((p) => [-1, 1].flatMap((a) => [-1, 1].map((b): Vec3 => [p[0] + a * 22, y0, p[2] + b * 22]))), dir: [0, 1, 0], on: "B" },
        ],
        tools: ["screwdriver"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Turn the castor bolts into the brackets",
        detail: "Tighten each one with a spanner on its nut.",
        fix: [{ kind: "stud", count: 4, len: 30, dia: 10, name: "Castor bolt", at: bracketPts, dir: [0, 1, 0], on: "B" }],
        tools: ["wrench"],
      },
      {
        title: "Push the castors on and turn it over",
        detail: "Press each castor onto its bolt until it clicks, then tip the table back onto its castors.",
        add: ["C1", "C2", "C3", "C4"],
      },
      { title: "Stand it on its castors", detail: "Don't sit or stand on it.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["GARNANÄS", "GARNANAS"],
  recipe(s) {
    return /coffee-table|coffee table/i.test(`${s.slug ?? ""} ${s.variant}`) ? recipe(s) : null;
  },
};
export default family;
